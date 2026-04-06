const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const requireAdmin = require('../middleware/admin');
const { rateLimit } = require('../middleware/rateLimit');
const { normalizePlainText } = require('../utils/security');

async function adminUserId(userId) {
  return userId;
}

async function logReportAction(reportId, adminId, actionType, note) {
  await db.query(
    `INSERT INTO USER_REPORT_ACTION (ReportID, AdminUserID, ActionType, Note)
     VALUES (?, ?, ?, ?)`,
    [reportId, adminId, actionType, note || null]
  );
}

router.get('/blocked', auth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT ub.BlockedUserID AS userId, u.Username AS username, u.AvatarURL AS avatarURL, ub.CreatedAt
     FROM USER_BLOCK ub
     JOIN USER u ON u.UserID = ub.BlockedUserID
     WHERE ub.BlockerUserID = ?
     ORDER BY ub.CreatedAt DESC`,
    [req.user.userId]
  );
  return res.json({ blocked: rows });
});

router.post('/block/:userId', auth, requireVerified, rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  scope: 'block',
  message: 'Too many block actions. Please slow down.',
}), async (req, res) => {
  const targetId = Number.parseInt(req.params.userId, 10);
  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: 'Invalid user id' });
  if (targetId === req.user.userId) return res.status(400).json({ error: 'Cannot block yourself' });

  const reason = normalizePlainText(req.body?.reason || '', 200);
  await db.query(
    `INSERT INTO USER_BLOCK (BlockerUserID, BlockedUserID, Reason)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Reason = VALUES(Reason), CreatedAt = CURRENT_TIMESTAMP`,
    [req.user.userId, targetId, reason || null]
  );

  await db.query('DELETE FROM LIKES WHERE (UserA = ? AND UserB = ?) OR (UserA = ? AND UserB = ?)', [
    req.user.userId, targetId, targetId, req.user.userId,
  ]);

  return res.json({ blocked: true });
});

router.delete('/block/:userId', auth, requireVerified, async (req, res) => {
  const targetId = Number.parseInt(req.params.userId, 10);
  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: 'Invalid user id' });

  await db.query(
    'DELETE FROM USER_BLOCK WHERE BlockerUserID = ? AND BlockedUserID = ?',
    [req.user.userId, targetId]
  );
  return res.json({ blocked: false });
});

router.post('/report', auth, requireVerified, rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  scope: 'report',
  message: 'Too many reports submitted. Please try later.',
}), async (req, res) => {
  const reportedUserId = Number.parseInt(req.body?.reportedUserId, 10);
  const category = normalizePlainText(req.body?.category || '', 40);
  const details = normalizePlainText(req.body?.details || '', 500);

  if (!Number.isInteger(reportedUserId) || reportedUserId <= 0) {
    return res.status(400).json({ error: 'Invalid reported user id' });
  }
  if (reportedUserId === req.user.userId) return res.status(400).json({ error: 'Cannot report yourself' });
  if (!category) return res.status(400).json({ error: 'Report category required' });

  await db.query(
    `INSERT INTO USER_REPORT (ReporterUserID, ReportedUserID, Category, Details)
     VALUES (?, ?, ?, ?)`,
    [req.user.userId, reportedUserId, category, details || null]
  );

  return res.status(201).json({ reported: true });
});

router.get('/admin/reports', auth, requireAdmin, async (req, res) => {
  const status = normalizePlainText(req.query.status || 'open', 20).toLowerCase();
  const where = ['open', 'reviewed', 'resolved'].includes(status) ? 'WHERE ur.Status = ?' : '';
  const params = where ? [status] : [];
  const [rows] = await db.query(
    `SELECT ur.*,
            reporter.Username AS ReporterUsername,
            reporter.Email AS ReporterEmail,
            reported.Username AS ReportedUsername,
            reported.Email AS ReportedEmail,
            reported.AvatarURL AS ReportedAvatarURL
     FROM USER_REPORT ur
     JOIN USER reporter ON reporter.UserID = ur.ReporterUserID
     JOIN USER reported ON reported.UserID = ur.ReportedUserID
     ${where}
     ORDER BY CASE ur.Status WHEN 'open' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END, ur.CreatedAt DESC
     LIMIT 200`,
    params
  );
  if (!rows.length) return res.json({ reports: rows });
  const [actions] = await db.query(
    `SELECT ura.*, admin.Username AS AdminUsername
     FROM USER_REPORT_ACTION ura
     JOIN USER admin ON admin.UserID = ura.AdminUserID
     WHERE ura.ReportID IN (?)
     ORDER BY ura.CreatedAt DESC`,
    [rows.map(row => row.ReportID)]
  );
  const actionMap = new Map();
  actions.forEach(action => {
    if (!actionMap.has(action.ReportID)) actionMap.set(action.ReportID, []);
    actionMap.get(action.ReportID).push(action);
  });
  return res.json({
    reports: rows.map(row => ({
      ...row,
      actions: actionMap.get(row.ReportID) || [],
    })),
  });
});

router.patch('/admin/reports/:reportId', auth, requireAdmin, async (req, res) => {
  const reportId = Number.parseInt(req.params.reportId, 10);
  const status = normalizePlainText(req.body?.status || '', 20).toLowerCase();
  const action = normalizePlainText(req.body?.action || '', 20).toLowerCase();
  const note = normalizePlainText(req.body?.note || '', 500);
  if (!Number.isInteger(reportId) || reportId <= 0) return res.status(400).json({ error: 'Invalid report id' });
  if (!['reviewed', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid moderation status' });

  const [[report]] = await db.query(
    'SELECT * FROM USER_REPORT WHERE ReportID = ?',
    [reportId]
  );
  if (!report) return res.status(404).json({ error: 'Report not found' });

  await db.query(
    'UPDATE USER_REPORT SET Status = ? WHERE ReportID = ?',
    [status, reportId]
  );
  const adminId = await adminUserId(req.user.userId);

  if (action === 'block-reported-user') {
    await db.query(
      `INSERT INTO USER_BLOCK (BlockerUserID, BlockedUserID, Reason)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE Reason = VALUES(Reason), CreatedAt = CURRENT_TIMESTAMP`,
      [report.ReporterUserID, report.ReportedUserID, 'Admin-assisted block after report']
    );
  }
  await logReportAction(
    reportId,
    adminId,
    action || `status:${status}`,
    note || null
  );

  return res.json({ updated: true, status, action: action || null });
});

module.exports = router;
