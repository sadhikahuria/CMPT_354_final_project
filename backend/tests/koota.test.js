const assert = require('assert');
const { calculateAshtakoota } = require('../utils/koota');

const profileA = {
  varna: 'Kshatriya',
  vashyaGroup: 'Chatushpada',
  nakshatraIndex: 10,
  yoni: 'Rat',
  rashiRuler: 'Sun',
  gana: 'Rakshasa',
  nadi: 'Antya',
  rashiIndex: 4,
};

const profileB = {
  varna: 'Vaishya',
  vashyaGroup: 'Dwipada',
  nakshatraIndex: 12,
  yoni: 'Cow',
  rashiRuler: 'Mercury',
  gana: 'Manushya',
  nadi: 'Madhya',
  rashiIndex: 5,
};

const lowProfile = {
  varna: 'Brahmin',
  vashyaGroup: 'Jalachara',
  nakshatraIndex: 9,
  yoni: 'Cat',
  rashiRuler: 'Moon',
  gana: 'Rakshasa',
  nadi: 'Adi',
  rashiIndex: 3,
};

function run() {
  const result = calculateAshtakoota(profileA, profileB);
  const totalFromParts = Object.values(result.kootas).reduce((sum, k) => sum + k.score, 0);

  assert.strictEqual(result.totalScore, totalFromParts, 'total score should equal sum of koota scores');
  assert.ok(result.totalScore >= 0 && result.totalScore <= 36, 'score must stay within 0-36');
  assert.ok(['Excellent', 'Good', 'Average', 'Poor'].includes(result.matchQualityLabel), 'label must be valid');
  assert.strictEqual(Object.keys(result.kootas).length, 8, 'should always calculate all eight kootas');

  const poorResult = calculateAshtakoota(lowProfile, lowProfile);
  assert.strictEqual(poorResult.kootas.Nadi.score, 0, 'same nadi should always score 0');
  assert.strictEqual(poorResult.totalScore, 25, 'reference pair should keep a stable total for regression safety');
  assert.strictEqual(poorResult.matchQualityLabel, 'Good');

  console.log('koota.test.js passed');
}

run();
