function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizeUsername(username = '') {
  return String(username).trim().replace(/\s+/g, ' ');
}

function normalizePlainText(value = '', maxLen = 300) {
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, maxLen);
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, '');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
  return /^[A-Za-z0-9._ -]{2,30}$/.test(username);
}

function validateBirthLocation(location) {
  return location.length >= 2 && location.length <= 150;
}

function parseCoords(lat, lng) {
  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function cityRegion(location = '') {
  const parts = String(location).split(',').map(part => part.trim()).filter(Boolean);
  return parts.slice(0, 2).join(', ') || location;
}

function ageFromDate(dateValue) {
  if (!dateValue) return null;
  const dob = new Date(dateValue);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

async function normalizeAvatar(filePath) {
  const sharp = require('sharp');
  const image = sharp(filePath, { failOn: 'warning' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error('Invalid image');
  await image
    .rotate()
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(`${filePath}.normalized`);
  return { outputPath: `${filePath}.normalized`, extension: '.jpg' };
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

module.exports = {
  ageFromDate,
  authCookieOptions,
  cityRegion,
  normalizeAvatar,
  normalizeEmail,
  normalizePlainText,
  normalizeUsername,
  parseCoords,
  stripHtml,
  validateBirthLocation,
  validateEmail,
  validateUsername,
};
