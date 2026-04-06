// routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { getBirthChart } = require('../utils/astrology');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Avatar upload config ─────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

function makeToken(user) {
  return jwt.sign(
    { userId: user.UserID, username: user.Username, email: user.Email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, email, password, dateOfBirth, timeOfBirth, birthLocation, latitude, longitude, bio } = req.body;

    // Basic validation
    if (!username || !email || !password || !dateOfBirth || !timeOfBirth || !birthLocation) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Check uniqueness
    const [existing] = await db.query(
      'SELECT UserID FROM USER WHERE Username = ? OR Email = ?', [username, email]
    );
    if (existing.length) return res.status(409).json({ error: 'Username or email already taken' });

    // Normalise timeOfBirth to HH:MM:SS (MySQL TIME needs seconds)
    const timeParts = (timeOfBirth || '12:00').split(':');
    const normalisedTime = `${(timeParts[0]||'12').padStart(2,'0')}:${(timeParts[1]||'00').padStart(2,'0')}:${(timeParts[2]||'00').padStart(2,'0')}`;

    // Derive Moon Rashi + Nakshatra from birth details
    const lat = parseFloat(latitude) || 19.076;  // default: Mumbai
    const lng = parseFloat(longitude) || 72.877;
    const chart = await getBirthChart(dateOfBirth, normalisedTime, lat, lng);

    if (!chart.rashiName || !chart.nakshatraName) {
      return res.status(500).json({ error: 'Failed to calculate birth chart — check date/time/location fields' });
    }

    // Look up RashiID and NakshatraID (case-insensitive for safety)
    const [[rashi]]     = await db.query('SELECT RashiID FROM RASHI WHERE LOWER(RashiName) = LOWER(?)',         [chart.rashiName]);
    const [[nakshatra]] = await db.query('SELECT NakshatraID FROM NAKSHATRA WHERE LOWER(NakshatraName) = LOWER(?)', [chart.nakshatraName]);

    if (!rashi) {
      return res.status(500).json({ error: `Unknown Rashi "${chart.rashiName}" — is the DB seeded? Run schema.sql first.` });
    }
    if (!nakshatra) {
      return res.status(500).json({ error: `Unknown Nakshatra "${chart.nakshatraName}" — is the DB seeded? Run schema.sql first.` });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatarURL = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const [result] = await db.query(
      `INSERT INTO USER (Username, Email, PasswordHash, DateOfBirth, TimeOfBirth,
        BirthLocation, Latitude, Longitude, RashiID, NakshatraID, AvatarURL, Bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, dateOfBirth, normalisedTime,
       birthLocation, lat, lng, rashi.RashiID, nakshatra.NakshatraID, avatarURL, bio || null]
    );

    const [[user]] = await db.query(
      `SELECT u.*, r.RashiName, n.NakshatraName, n.Gana, n.Nadi, n.Yoni,
              r.Varna, r.VashyaGroup, p.PlanetName AS RashiRuler
       FROM USER u
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       JOIN PLANET p ON r.PlanetID = p.PlanetID
       WHERE u.UserID = ?`, [result.insertId]
    );

    return res.status(201).json({
      token: makeToken(user),
      user: sanitizeUser(user),
      chart: { ...chart, rashiName: user.RashiName, nakshatraName: user.NakshatraName },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [[user]] = await db.query(
      `SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
              n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler,
              r.RashiID AS RashiIndex
       FROM USER u
       JOIN RASHI r ON u.RashiID = r.RashiID
       JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
       JOIN PLANET p ON r.PlanetID = p.PlanetID
       WHERE u.Email = ?`, [email]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({ token: makeToken(user), user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
const requireAuth = require('../middleware/auth');
router.get('/me', requireAuth, async (req, res) => {
  const [[user]] = await db.query(
    `SELECT u.*, r.RashiName, r.Varna, r.VashyaGroup, n.NakshatraName, n.Index1to27,
            n.Gana, n.Nadi, n.Yoni, p.PlanetName AS RashiRuler
     FROM USER u
     JOIN RASHI r ON u.RashiID = r.RashiID
     JOIN NAKSHATRA n ON u.NakshatraID = n.NakshatraID
     JOIN PLANET p ON r.PlanetID = p.PlanetID
     WHERE u.UserID = ?`, [req.user.userId]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: sanitizeUser(user) });
});

function sanitizeUser(u) {
  return {
    id:            u.UserID,
    username:      u.Username,
    email:         u.Email,
    dateOfBirth:   u.DateOfBirth,
    timeOfBirth:   u.TimeOfBirth,
    birthLocation: u.BirthLocation,
    rashi:         u.RashiName,
    nakshatra:     u.NakshatraName,
    gana:          u.Gana,
    nadi:          u.Nadi,
    yoni:          u.Yoni,
    varna:         u.Varna,
    vashyaGroup:   u.VashyaGroup,
    rashiRuler:    u.RashiRuler,
    nakshatraIndex: u.Index1to27,
    rashiIndex:    u.RashiID - 1,  // 0-indexed for Koota engine
    avatarURL:     u.AvatarURL,
    bio:           u.Bio,
    createdAt:     u.CreatedAt,
  };
}

module.exports = router;
module.exports.sanitizeUser = sanitizeUser;
