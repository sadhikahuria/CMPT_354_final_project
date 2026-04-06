// routes/matches.js — GET /api/matches/list
// Separated from social.js to avoid Express router conflicts when mounted at two prefixes
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/list', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mr.MatchID, mr.MatchCreatedAt,
              inv.UserA, inv.UserB,
              ce.EvalID, ce.TotalScore, ce.MatchQualityLabel, ce.EvaluatedAtTimestamp,
              u.UserID AS OtherID, u.Username AS OtherUsername,
              u.AvatarURL AS OtherAvatar,
              r.RashiName AS OtherRashi, n.NakshatraName AS OtherNakshatra
       FROM INVOLVES inv
       JOIN MATCH_RECORD mr ON inv.MatchID = mr.MatchID
       JOIN COMPATIBILITY_EVAL ce ON (
         (ce.EvalUser1ID = inv.UserA AND ce.EvalUser2ID = inv.UserB)
         OR (ce.EvalUser1ID = inv.UserB AND ce.EvalUser2ID = inv.UserA)
       )
       JOIN USER u ON u.UserID = CASE WHEN inv.UserA = ? THEN inv.UserB ELSE inv.UserA END
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       WHERE inv.UserA = ? OR inv.UserB = ?
       ORDER BY mr.MatchCreatedAt DESC`,
      [req.user.userId, req.user.userId, req.user.userId]
    );
    return res.json({ matches: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
