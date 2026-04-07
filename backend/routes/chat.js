// routes/chat.js — REST endpoints for message history
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const { isBlockedEitherWay } = require('../utils/safety');
const { normalizePlainText, stripHtml } = require('../utils/security');
const { rateLimit } = require('../middleware/rateLimit');

// Verify the requesting user is part of the match
async function verifyMatchAccess(matchId, userId) {
  const [[row]] = await db.query(
    'SELECT 1 FROM INVOLVES WHERE MatchID = ? AND (UserA = ? OR UserB = ?)',
    [matchId, userId, userId]
  );
  return !!row;
}

async function matchOtherUser(matchId, userId) {
  const [[row]] = await db.query(
    'SELECT CASE WHEN UserA = ? THEN UserB ELSE UserA END AS otherUserId FROM INVOLVES WHERE MatchID = ? AND (UserA = ? OR UserB = ?)',
    [userId, matchId, userId, userId]
  );
  return row?.otherUserId || null;
}

async function messageCount(matchId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS count FROM MESSAGES WHERE MatchID = ?',
    [matchId]
  );
  return Number(row?.count || 0);
}

function validateMessageBody(body, existingCount) {
  const cleanBody = normalizePlainText(stripHtml(body || ''), 2000).trim();
  if (!cleanBody) return { error: 'Message body required' };
  if (existingCount === 0 && cleanBody.length < 60) {
    return { error: 'Your first message should be a real Love Letter. Write at least 60 characters.' };
  }
  return { body: cleanBody };
}

// ── GET /api/chat/:matchId/messages ──────────────────────────────────────
router.get('/:matchId/messages', auth, async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (!(await verifyMatchAccess(matchId, req.user.userId))) {
      return res.status(403).json({ error: 'Not a participant in this match' });
    }
    const otherUserId = await matchOtherUser(matchId, req.user.userId);
    if (otherUserId && await isBlockedEitherWay(req.user.userId, otherUserId)) {
      return res.status(403).json({ error: 'This conversation is unavailable' });
    }

    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // MessageID cursor for pagination

    let query = 'SELECT * FROM MESSAGES WHERE MatchID = ?';
    const params = [matchId];
    if (before) { query += ' AND MessageID < ?'; params.push(before); }
    query += ' ORDER BY SentAt DESC LIMIT ?';
    params.push(limit);

    const [messages] = await db.query(query, params);
    const totalMessages = await messageCount(matchId);

    // Mark messages from other user as read
    await db.query(
      'UPDATE MESSAGES SET ReadAt = NOW() WHERE MatchID = ? AND SenderID != ? AND ReadAt IS NULL',
      [matchId, req.user.userId]
    );

    return res.json({ messages: messages.reverse(), totalMessages }); // chronological order
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chat/:matchId/messages (fallback for no-WS clients) ─────────
router.post('/:matchId/messages', auth, requireVerified, rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  scope: 'chat-post',
  message: 'Too many messages. Please slow down.',
}), async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (!(await verifyMatchAccess(matchId, req.user.userId))) {
      return res.status(403).json({ error: 'Not a participant in this match' });
    }
    const otherUserId = await matchOtherUser(matchId, req.user.userId);
    if (otherUserId && await isBlockedEitherWay(req.user.userId, otherUserId)) {
      return res.status(403).json({ error: 'This conversation is unavailable' });
    }
    const existingCount = await messageCount(matchId);
    const checked = validateMessageBody(req.body.body, existingCount);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const [result] = await db.query(
      'INSERT INTO MESSAGES (MatchID, SenderID, Body) VALUES (?, ?, ?)',
      [matchId, req.user.userId, checked.body]
    );
    const [[msg]] = await db.query('SELECT * FROM MESSAGES WHERE MessageID = ?', [result.insertId]);
    if (otherUserId) {
      await db.query(
        'INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
        [otherUserId, 'message', JSON.stringify({ fromUserId: req.user.userId, fromUsername: req.user.username, matchId })]
      );
    }
    return res.status(201).json({ message: msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── Socket.io real-time chat handler ─────────────────────────────────────
// Called from server.js: setupChat(io)
const jwt = require('jsonwebtoken');

module.exports.setupChat = function setupChat(io) {
  const chatNs = io.of('/chat');

  chatNs.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || auth.extractToken({ headers: socket.handshake.headers });
    if (!token) return next(new Error('Unauthenticated'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chatNs.on('connection', async (socket) => {
    const userId = socket.user.userId;

    // User joins a match room
    socket.on('join_match', async ({ matchId }) => {
      const ok = await verifyMatchAccess(matchId, userId);
      if (!ok) return socket.emit('error', 'Not a participant');
      socket.join(`match:${matchId}`);
    });

    // Send a message
    socket.on('send_message', async ({ matchId, body }) => {
      const ok = await verifyMatchAccess(matchId, userId);
      if (!ok) return socket.emit('error', 'Not a participant');
      const otherUserId = await matchOtherUser(matchId, userId);
      if (otherUserId && await isBlockedEitherWay(userId, otherUserId)) {
        return socket.emit('error', 'Conversation unavailable');
      }

      try {
        const existingCount = await messageCount(matchId);
        const checked = validateMessageBody(body, existingCount);
        if (checked.error) return socket.emit('error', checked.error);
        const [result] = await db.query(
          'INSERT INTO MESSAGES (MatchID, SenderID, Body) VALUES (?, ?, ?)',
          [matchId, userId, checked.body]
        );
        const [[msg]] = await db.query('SELECT * FROM MESSAGES WHERE MessageID = ?', [result.insertId]);
        if (otherUserId) {
          await db.query(
            'INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
            [otherUserId, 'message', JSON.stringify({ fromUserId: userId, fromUsername: socket.user.username, matchId })]
          );
        }

        // Broadcast to both participants in the room
        chatNs.to(`match:${matchId}`).emit('new_message', {
          ...msg,
          senderUsername: socket.user.username,
        });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('disconnect', () => {});
  });
};
