// routes/social.js — Likes, Matches, Compatibility Requests
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const { calculateAshtakoota } = require('../utils/koota');
const mailer = require('../utils/mailer');
const { rateLimit } = require('../middleware/rateLimit');
const { isBlockedEitherWay } = require('../utils/safety');

// Helper: load full user data for Koota engine
async function loadUserForKoota(userId) {
  const [[u]] = await db.query(
    `SELECT u.UserID, u.Email, u.Username,
            r.RashiName, r.Varna, r.VashyaGroup, r.RashiID,
            n.NakshatraName, n.Index1to27, n.Gana, n.Nadi, n.Yoni,
            p.PlanetName AS RashiRuler
     FROM USER u
     JOIN RASHI r ON u.RashiID = r.RashiID
     JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
     JOIN PLANET p ON r.PlanetID = p.PlanetID
     WHERE u.UserID = ?`, [userId]
  );
  if (!u) throw new Error('User not found: ' + userId);
  return {
    userId:        u.UserID,
    email:         u.Email,
    username:      u.Username,
    varna:         u.Varna,
    vashyaGroup:   u.VashyaGroup,
    nakshatraIndex: u.Index1to27,
    yoni:          u.Yoni,
    rashiRuler:    u.RashiRuler,
    gana:          u.Gana,
    nadi:          u.Nadi,
    rashiIndex:    u.RashiID - 1,
  };
}

// Helper: create notification
async function notify(userId, type, payload) {
  await db.query(
    'INSERT INTO NOTIFICATIONS (UserID, Type, Payload) VALUES (?, ?, ?)',
    [userId, type, JSON.stringify(payload)]
  );
}

// ── POST /api/likes/:targetId ─────────────────────────────────────────────
router.post('/:targetId', auth, requireVerified, rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  scope: 'like',
  message: 'Too many likes. Please slow down.',
}), async (req, res) => {
  try {
    const myId     = req.user.userId;
    const targetId = parseInt(req.params.targetId);
    if (myId === targetId) return res.status(400).json({ error: 'Cannot like yourself' });
    if (await isBlockedEitherWay(myId, targetId)) {
      return res.status(403).json({ error: 'This profile is unavailable' });
    }

    // Insert or ignore (already liked)
    const [insertResult] = await db.query(
      'INSERT IGNORE INTO LIKES (UserA, UserB) VALUES (?, ?)', [myId, targetId]
    );

    if (insertResult.affectedRows === 1) {
      await notify(targetId, 'like', { fromUserId: myId, fromUsername: req.user.username });

      try {
        const [[target]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [targetId]);
        if (target) {
          mailer.sendLikeNotification(target.Email, target.Username, req.user.username).catch(() => {});
        }
      } catch {}
    }

    // Check for mutual like → create match + run Koota
    const [[mutual]] = await db.query(
      'SELECT 1 FROM LIKES WHERE UserA = ? AND UserB = ?', [targetId, myId]
    );

    let matchData = null;
    if (mutual) {
      // Check if match already exists
      const [[existingInvolve]] = await db.query(
        `SELECT i.MatchID FROM INVOLVES i
         WHERE (i.UserA = ? AND i.UserB = ?) OR (i.UserA = ? AND i.UserB = ?)`,
        [myId, targetId, targetId, myId]
      );

      if (!existingInvolve) {
        // Create match record
        const [matchResult] = await db.query('INSERT INTO MATCH_RECORD (MatchCreatedAt) VALUES (NOW())');
        const matchId = matchResult.insertId;
        await db.query('INSERT INTO INVOLVES (MatchID, UserA, UserB) VALUES (?, ?, ?)',
          [matchId, myId, targetId]);

        // Run Ashtakoota
        const [user1Id, user2Id] = myId < targetId ? [myId, targetId] : [targetId, myId];
        const user1 = await loadUserForKoota(user1Id);
        const user2 = await loadUserForKoota(user2Id);
        const { kootas, totalScore, matchQualityLabel } = calculateAshtakoota(user1, user2);

        const [evalResult] = await db.query(
          `INSERT INTO COMPATIBILITY_EVAL (TotalScore, MatchQualityLabel, EvalUser1ID, EvalUser2ID)
           VALUES (?, ?, ?, ?)`,
          [totalScore, matchQualityLabel, user1Id, user2Id]
        );
        const evalId = evalResult.insertId;

        // Insert all 8 Koota scores
        const kootaRows = Object.entries(kootas).map(([type, k]) =>
          [evalId, type, k.max, k.score, k.explanation]
        );
        await db.query(
          'INSERT INTO KOOTA_SCORE (EvalID, KootaType, MaxScore, ScoreValue, ExplanationText) VALUES ?',
          [kootaRows]
        );

        // Notifications for both
        await notify(myId,     'match', { matchId, evalId, withUserId: targetId, score: totalScore, label: matchQualityLabel });
        await notify(targetId, 'match', { matchId, evalId, withUserId: myId,     score: totalScore, label: matchQualityLabel });

        // Emails
        try {
          const [[u1]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [myId]);
          const [[u2]] = await db.query('SELECT Email, Username FROM USER WHERE UserID = ?', [targetId]);
          if (u1 && u2) {
            mailer.sendMatchNotification(u1.Email, u1.Username, u2.Username, totalScore).catch(() => {});
            mailer.sendMatchNotification(u2.Email, u2.Username, u1.Username, totalScore).catch(() => {});
          }
        } catch {}

        matchData = { matchId, evalId, totalScore, matchQualityLabel };
      }
    }

    return res.json({ liked: true, duplicate: insertResult.affectedRows === 0, match: matchData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/likes/:targetId — unlike ─────────────────────────────────
router.delete('/:targetId', auth, requireVerified, async (req, res) => {
  await db.query('DELETE FROM LIKES WHERE UserA = ? AND UserB = ?',
    [req.user.userId, req.params.targetId]);
  return res.json({ unliked: true });
});

// ── GET /api/likes/matches/list — moved to routes/matches.js ─────────────
// (kept here as comment so social.js stays focused on like/unlike actions)

module.exports = router;
