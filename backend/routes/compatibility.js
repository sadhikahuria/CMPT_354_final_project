// routes/compatibility.js
const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const { generateCertificate } = require('../utils/pdfCert');

// ── Auth middleware that also accepts ?token= query param (for window.open PDF) ──
function authOrQuery(req, res, next) {
  // Prefer header, fall back to ?token= for file downloads
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return auth(req, res, next);
}

// ── GET /api/compatibility/history — score history for current user ────────
// Must come BEFORE /:evalId to avoid Express swallowing it
router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ce.EvalID, ce.TotalScore, ce.MatchQualityLabel, ce.EvaluatedAtTimestamp,
              u.Username AS OtherUsername, r.RashiName AS OtherRashi
       FROM COMPATIBILITY_EVAL ce
       JOIN USER u ON u.UserID = CASE WHEN ce.EvalUser1ID = ? THEN ce.EvalUser2ID ELSE ce.EvalUser1ID END
       JOIN RASHI r ON u.RashiID = r.RashiID
       WHERE ce.EvalUser1ID = ? OR ce.EvalUser2ID = ?
       ORDER BY ce.EvaluatedAtTimestamp DESC`,
      [req.user.userId, req.user.userId, req.user.userId]
    );
    return res.json({ history: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/compatibility/:evalId — full breakdown ───────────────────────
router.get('/:evalId', auth, async (req, res) => {
  try {
    const [[eval_]] = await db.query(
      `SELECT ce.*,
              u1.Username AS User1Username, u1.AvatarURL AS User1Avatar,
              r1.RashiName AS User1Rashi, n1.NakshatraName AS User1Nakshatra,
              n1.Gana AS User1Gana, n1.Nadi AS User1Nadi,
              u2.Username AS User2Username, u2.AvatarURL AS User2Avatar,
              r2.RashiName AS User2Rashi, n2.NakshatraName AS User2Nakshatra,
              n2.Gana AS User2Gana, n2.Nadi AS User2Nadi
       FROM COMPATIBILITY_EVAL ce
       JOIN USER u1 ON ce.EvalUser1ID = u1.UserID
       JOIN USER u2 ON ce.EvalUser2ID = u2.UserID
       JOIN RASHI r1 ON u1.RashiID = r1.RashiID
       JOIN RASHI r2 ON u2.RashiID = r2.RashiID
       JOIN NAKSHATRA n1 ON u1.NakshatraID = n1.NakshatraID
       JOIN NAKSHATRA n2 ON u2.NakshatraID = n2.NakshatraID
       WHERE ce.EvalID = ?
         AND (ce.EvalUser1ID = ? OR ce.EvalUser2ID = ?)`,
      [req.params.evalId, req.user.userId, req.user.userId]
    );
    if (!eval_) return res.status(404).json({ error: 'Evaluation not found' });

    const [kootas] = await db.query(
      'SELECT * FROM KOOTA_SCORE WHERE EvalID = ? ORDER BY FIELD(KootaType, "Varna","Vashya","Tara","Yoni","GrahaMaitri","Gana","Bhakoot","Nadi")',
      [req.params.evalId]
    );

    return res.json({ eval: eval_, kootas });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/compatibility/:evalId/certificate — download PDF ────────────
// Uses authOrQuery so window.open() with ?token= works
router.get('/:evalId/certificate', authOrQuery, async (req, res) => {
  try {
    const [[eval_]] = await db.query(
      `SELECT ce.*, u1.Username, u1.AvatarURL, r1.RashiName, n1.NakshatraName,
              u2.Username AS Username2, u2.AvatarURL AS AvatarURL2,
              r2.RashiName AS RashiName2, n2.NakshatraName AS NakshatraName2
       FROM COMPATIBILITY_EVAL ce
       JOIN USER u1 ON ce.EvalUser1ID = u1.UserID
       JOIN USER u2 ON ce.EvalUser2ID = u2.UserID
       JOIN RASHI r1 ON u1.RashiID = r1.RashiID
       JOIN RASHI r2 ON u2.RashiID = r2.RashiID
       JOIN NAKSHATRA n1 ON u1.NakshatraID = n1.NakshatraID
       JOIN NAKSHATRA n2 ON u2.NakshatraID = n2.NakshatraID
       WHERE ce.EvalID = ?
         AND (ce.EvalUser1ID = ? OR ce.EvalUser2ID = ?)`,
      [req.params.evalId, req.user.userId, req.user.userId]
    );
    if (!eval_) return res.status(404).json({ error: 'Evaluation not found' });

    const [kootas] = await db.query(
      'SELECT * FROM KOOTA_SCORE WHERE EvalID = ?', [req.params.evalId]
    );

    const user1 = {
      Username: eval_.Username, AvatarURL: eval_.AvatarURL,
      RashiName: eval_.RashiName, NakshatraName: eval_.NakshatraName,
    };
    const user2 = {
      Username: eval_.Username2, AvatarURL: eval_.AvatarURL2,
      RashiName: eval_.RashiName2, NakshatraName: eval_.NakshatraName2,
    };

    const pdfBuffer = await generateCertificate(eval_, user1, user2, kootas);

    const filename = `ashtakoota-${user1.Username}-${user2.Username}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
