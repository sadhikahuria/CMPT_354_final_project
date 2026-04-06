const express = require('express');
const path = require('path');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const apiBaseUrl = process.env.FRONTEND_API_URL || process.env.API_URL || 'http://localhost:4000';
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${apiBaseUrl} https://nominatim.openstreetmap.org https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.socket.io`,
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "script-src 'self' 'unsafe-inline' https://cdn.socket.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date() });
});

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.__ASHTAKOOTA_CONFIG__ = ${JSON.stringify({ API_BASE_URL: apiBaseUrl })};`);
});

app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Ashtakoota frontend listening on port ${port}`);
});
