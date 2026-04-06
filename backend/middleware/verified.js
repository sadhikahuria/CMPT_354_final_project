const db = require('../config/db');

module.exports = async function requireVerified(req, res, next) {
  try {
    const [[user]] = await db.query(
      'SELECT EmailVerifiedAt FROM USER WHERE UserID = ?',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.EmailVerifiedAt) {
      return res.status(403).json({ error: 'Verify your email before using this feature' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
