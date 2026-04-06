const db = require('../config/db');

function adminEmails() {
  return new Set(
    String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

module.exports = async function requireAdmin(req, res, next) {
  try {
    const [[user]] = await db.query(
      'SELECT Email FROM USER WHERE UserID = ?',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!adminEmails().has(String(user.Email || '').toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.isAdmin = true;
    return next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
