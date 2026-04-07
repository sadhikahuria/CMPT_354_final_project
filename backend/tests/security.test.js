const assert = require('assert');
const {
  ageFromDate,
  parseCoords,
  validateBirthLocation,
  validateEmail,
  validateUsername,
} = require('../utils/security');

function isoDateYearsAgo(years) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function run() {
  assert.strictEqual(validateEmail('person@example.com'), true, 'valid email should pass');
  assert.strictEqual(validateEmail('personexample.com'), false, 'email without @ should fail');

  assert.strictEqual(validateUsername('user.name_42'), true, 'safe username should pass');
  assert.strictEqual(validateUsername('x'), false, 'too-short username should fail');
  assert.strictEqual(validateUsername('bad<>name'), false, 'unsafe username should fail');

  assert.strictEqual(validateBirthLocation('Vancouver, Canada'), true, 'normal location should pass');
  assert.strictEqual(validateBirthLocation(''), false, 'blank location should fail');

  assert.deepStrictEqual(parseCoords('49.2827', '-123.1207'), { latitude: 49.2827, longitude: -123.1207 }, 'valid coords should parse');
  assert.strictEqual(parseCoords('91', '0'), null, 'latitude above 90 should fail');
  assert.strictEqual(parseCoords('0', '-181'), null, 'longitude below -180 should fail');
  assert.strictEqual(parseCoords('abc', '1'), null, 'non-numeric coords should fail');

  assert.strictEqual(ageFromDate(isoDateYearsAgo(20)) >= 20, true, '20-year-old boundary should pass');
  assert.strictEqual(ageFromDate(isoDateYearsAgo(19)) >= 20, false, '19-year-old boundary should fail');
  assert.strictEqual(ageFromDate('not-a-date'), null, 'invalid dates should return null');

  console.log('security.test.js passed');
}

run();
