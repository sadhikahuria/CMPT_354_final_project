// routes/users.js
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const { sanitizeUser } = require('./auth');
const { visibleUserFilterSql, isBlockedEitherWay } = require('../utils/safety');
const { normalizeAvatar, normalizePlainText, stripHtml } = require('../utils/security');
const { calculateAshtakoota } = require('../utils/koota');
const allowedIntents = new Set(['marriage', 'long-term', 'serious-dating', 'exploring']);
const allowedLookingFor = new Set(['man', 'woman', 'everyone']);
const RECOMMENDED_MIN_SCORE = 25;

const USER_SELECT = `
  SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
         n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler
  FROM USER u
  JOIN RASHI r ON u.RashiID = r.RashiID
  JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
  JOIN PLANET p ON r.PlanetID = p.PlanetID
`;

function toKootaUser(u) {
  return {
    userId: u.UserID,
    username: u.Username,
    varna: u.Varna,
    vashyaGroup: u.VashyaGroup,
    nakshatraIndex: u.Index1to27,
    yoni: u.Yoni,
    rashiRuler: u.RashiRuler,
    gana: u.Gana,
    nadi: u.Nadi,
    rashiIndex: u.RashiID - 1,
  };
}

function computeCompat(currentUser, otherUser) {
  const [user1, user2] = currentUser.UserID < otherUser.UserID
    ? [toKootaUser(currentUser), toKootaUser(otherUser)]
    : [toKootaUser(otherUser), toKootaUser(currentUser)];
  const { kootas, totalScore, matchQualityLabel } = calculateAshtakoota(user1, user2);
  const topReasons = Object.entries(kootas)
    .map(([type, value]) => ({
      type,
      score: value.score,
      max: value.max,
      explanation: value.explanation,
      ratio: value.max ? value.score / value.max : 0,
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return b.score - a.score;
    })
    .slice(0, 3)
    .map(item => ({
      koota: item.type,
      score: item.score,
      max: item.max,
      explanation: item.explanation,
    }));

  return {
    totalScore,
    label: matchQualityLabel,
    reasons: topReasons,
  };
}

// ── GET /api/users — browse all users (excluding self) ───────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { search, minScore, rashiFilter, ganaFilter, intentFilter } = req.query;
    const visibility = await visibleUserFilterSql(req.user.userId, 'u');
    let query = `${USER_SELECT} WHERE u.UserID != ? AND ${visibility.clause}`;
    const params = [req.user.userId];
    params.push(...visibility.params);

    if (search) {
      query += ' AND (u.Username LIKE ? OR u.BirthLocation LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (rashiFilter) {
      query += ' AND r.RashiName = ?';
      params.push(rashiFilter);
    }
    if (ganaFilter) {
      query += ' AND n.Gana = ?';
      params.push(ganaFilter);
    }
    if (intentFilter) {
      query += ' AND u.RelationshipIntent = ?';
      params.push(intentFilter);
    }
    query += ' ORDER BY u.CreatedAt DESC LIMIT 100';

    const [[currentUser]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [req.user.userId]);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const [users] = await db.query(query, params);

    // Attach like status
    const userIds = users.map(u => u.UserID);
    let likes = [];
    if (userIds.length) {
      [likes] = await db.query(
        'SELECT UserB FROM LIKES WHERE UserA = ? AND UserB IN (?)',
        [req.user.userId, userIds]
      );
    }
    const likedSet = new Set(likes.map(l => l.UserB));

    const result = users.map(u => {
      const compat = computeCompat(currentUser, u);
      return {
        ...sanitizeUser(u, { includePrivate: false }),
        compatEval: compat,
        liked: likedSet.has(u.UserID),
      };
    });

    const floor = Number.isFinite(parseInt(minScore, 10)) ? parseInt(minScore, 10) : RECOMMENDED_MIN_SCORE;
    const filtered = result.filter(u => u.compatEval && u.compatEval.totalScore >= floor);

    return res.json({ users: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/best-matches — top 3 compatible profiles ──────────────
router.get('/best-matches', auth, async (req, res) => {
  try {
    const [[currentUser]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [req.user.userId]);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    const visibility = await visibleUserFilterSql(req.user.userId, 'u');
    const [users] = await db.query(
      `${USER_SELECT} WHERE u.UserID != ? AND ${visibility.clause} ORDER BY u.CreatedAt DESC LIMIT 100`,
      [req.user.userId, ...visibility.params]
    );
    const results = [];
    for (const user of users) {
      if (await isBlockedEitherWay(req.user.userId, user.UserID)) continue;
      const compat = computeCompat(currentUser, user);
      if (compat.totalScore < RECOMMENDED_MIN_SCORE) continue;
      results.push({
        user: sanitizeUser(user, { includePrivate: false }),
        totalScore: compat.totalScore,
        label: compat.label,
        reasons: compat.reasons,
      });
    }

    results.sort((a, b) => b.totalScore - a.totalScore);
    return res.json({ bestMatches: results.slice(0, 3) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:id — single profile ──────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    if (await isBlockedEitherWay(req.user.userId, Number(req.params.id))) {
      return res.status(404).json({ error: 'User not found' });
    }
    const [[user]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [[evalRow]] = await db.query(
      `SELECT * FROM COMPATIBILITY_EVAL
       WHERE (EvalUser1ID = ? AND EvalUser2ID = ?)
          OR (EvalUser1ID = ? AND EvalUser2ID = ?)
       LIMIT 1`,
      [req.user.userId, user.UserID, user.UserID, req.user.userId]
    );
    const [[likeRow]] = await db.query(
      'SELECT 1 FROM LIKES WHERE UserA = ? AND UserB = ?',
      [req.user.userId, user.UserID]
    );
    const [[currentUser]] = await db.query(USER_SELECT + ' WHERE u.UserID = ?', [req.user.userId]);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    const compat = computeCompat(currentUser, user);

    return res.json({
      user: sanitizeUser(user, { includePrivate: false }),
      compatEval: {
        evalId:     evalRow?.EvalID || null,
        totalScore: compat.totalScore,
        label:      compat.label,
        evaluatedAt: evalRow?.EvaluatedAtTimestamp || null,
        reasons:    compat.reasons,
      },
      liked: !!likeRow,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/me — update bio / avatar ────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.patch('/me', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { bio, profilePrompt, relationshipIntent, lookingFor } = req.body;
    const updates = {};
    if (bio !== undefined) updates.Bio = normalizePlainText(stripHtml(bio), 300);
    if (profilePrompt !== undefined) updates.ProfilePrompt = normalizePlainText(stripHtml(profilePrompt), 160);
    if (relationshipIntent !== undefined) {
      const value = normalizePlainText(relationshipIntent, 30).toLowerCase();
      if (!allowedIntents.has(value)) return res.status(400).json({ error: 'Invalid relationship intent' });
      updates.RelationshipIntent = value;
    }
    if (lookingFor !== undefined) {
      const value = normalizePlainText(lookingFor, 30).toLowerCase();
      if (!allowedLookingFor.has(value)) return res.status(400).json({ error: 'Invalid looking-for value' });
      updates.LookingFor = value;
    }
    if (req.file) {
      const normalized = await normalizeAvatar(req.file.path);
      const finalName = `avatar-${Date.now()}${normalized.extension}`;
      const finalPath = require('path').join(uploadDir, finalName);
      fs.renameSync(normalized.outputPath, finalPath);
      fs.unlinkSync(req.file.path);
      updates.AvatarURL = `/uploads/${finalName}`;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(`UPDATE USER SET ${setClauses} WHERE UserID = ?`,
      [...Object.values(updates), req.user.userId]);

    return res.json({ updated: updates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
