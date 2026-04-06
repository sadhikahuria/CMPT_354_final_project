const buckets = new Map();

function keyFor(req, scope) {
  return [
    scope,
    req.user?.userId || 'anon',
    req.ip || req.headers['x-forwarded-for'] || 'ip-unknown',
  ].join(':');
}

function rateLimit({ windowMs, max, scope, message }) {
  return (req, res, next) => {
    const key = keyFor(req, scope);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      return res.status(429).json({ error: message || 'Too many requests' });
    }

    bucket.count += 1;
    return next();
  };
}

module.exports = { rateLimit };
