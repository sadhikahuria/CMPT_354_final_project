// server.js — Ashtakoota Backend Entry Point
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const db         = require('./config/db');

const app    = express();
const server = http.createServer(app);
app.set('trust proxy', 1);
const io     = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5500',
    ],
    methods: ['GET','POST'],
    credentials: true,
  },
});

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${frontendUrl} https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.socket.io ${process.env.FRONTEND_URL || ''}`.trim(),
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "script-src 'self' 'unsafe-inline' https://cdn.socket.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

async function ensureSafetyTables() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS USER_BLOCK (
      BlockerUserID INT NOT NULL,
      BlockedUserID INT NOT NULL,
      Reason VARCHAR(200),
      CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (BlockerUserID, BlockedUserID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS USER_REPORT (
      ReportID BIGINT NOT NULL AUTO_INCREMENT,
      ReporterUserID INT NOT NULL,
      ReportedUserID INT NOT NULL,
      Category VARCHAR(40) NOT NULL,
      Details VARCHAR(500),
      Status ENUM('open','reviewed','resolved') NOT NULL DEFAULT 'open',
      CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ReportID),
      KEY idx_report_target (ReportedUserID, Status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS USER_REPORT_ACTION (
      ActionID BIGINT NOT NULL AUTO_INCREMENT,
      ReportID BIGINT NOT NULL,
      AdminUserID INT NOT NULL,
      ActionType VARCHAR(40) NOT NULL,
      Note VARCHAR(500),
      CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ActionID),
      KEY idx_report_action_report (ReportID, CreatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

async function ensureUserColumns() {
  const columns = [
    ['GenderIdentity', 'VARCHAR(30)'],
    ['LookingFor', 'VARCHAR(30)'],
    ['RelationshipIntent', 'VARCHAR(30)'],
    ['ProfilePrompt', 'VARCHAR(160)'],
    ['AcceptedSafetyAt', 'DATETIME'],
    ['EmailVerifiedAt', 'DATETIME'],
    ['EmailVerifyTokenHash', 'VARCHAR(128)'],
    ['EmailVerifyExpiresAt', 'DATETIME'],
    ['PasswordResetTokenHash', 'VARCHAR(128)'],
    ['PasswordResetExpiresAt', 'DATETIME'],
  ];

  for (const [columnName, definition] of columns) {
    const [rows] = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'USER'
         AND column_name = ?
       LIMIT 1`,
      [columnName]
    );

    if (!rows.length) {
      await db.query(`ALTER TABLE USER ADD COLUMN ${columnName} ${definition}`);
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve avatars statically
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/likes',           require('./routes/social'));
app.use('/api/matches',         require('./routes/matches'));  // same router, handles both
app.use('/api/compat-requests', require('./routes/compatRequests'));
app.use('/api/compatibility',   require('./routes/compatibility'));
app.use('/api/chat',            require('./routes/chat'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/safety',          require('./routes/safety'));

// ── Socket.io Chat ────────────────────────────────────────────────────────
const { setupChat } = require('./routes/chat');
setupChat(io);

// ── Global error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
Promise.all([ensureSafetyTables(), ensureUserColumns()])
  .catch(err => {
    console.error('Failed to ensure safety tables:', err.message);
    process.exit(1);
  })
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✦ Ashtakoota server running on port ${PORT}`);
    });
  });
