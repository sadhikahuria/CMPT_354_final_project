const assert = require('assert');
const {
  buildDefaultCompatibilityRules,
  getCompatibilityRules,
  getCompatibilityRuleStatus,
} = require('../utils/compatRules');
const { calculateAshtakoota } = require('../utils/koota');

const userA = {
  varna: 'Kshatriya',
  vashyaGroup: 'Vanachara',
  nakshatraIndex: 10,
  yoni: 'Rat',
  rashiRuler: 'Sun',
  gana: 'Rakshasa',
  nadi: 'Antya',
  rashiIndex: 5,
};

const userB = {
  varna: 'Shudra',
  vashyaGroup: 'Dwipada',
  nakshatraIndex: 14,
  yoni: 'Tiger',
  rashiRuler: 'Venus',
  gana: 'Rakshasa',
  nadi: 'Madhya',
  rashiIndex: 7,
};

function run() {
  const rules = buildDefaultCompatibilityRules();
  assert.strictEqual(rules.varnaRank.get('Brahmin'), 4, 'varna ranks should be seeded');
  assert.strictEqual(rules.vashyaScore.get('Dwipada|Dwipada'), 2, 'vashya matrix should be present');
  assert.strictEqual(rules.yoniScore.get('Horse|Cow'), 3, 'yoni matrix should be present');
  assert.strictEqual(rules.planetRelation.get('Sun|Venus'), 'enemy', 'planet relations should be mapped');
  assert.strictEqual(rules.grahaScore.get('Sun|Venus'), 0, 'graha maitri score should be seeded');
  assert.strictEqual(rules.bhakootScore.get('5').score, 0, 'bhakoot rules should be seeded');
  assert.strictEqual(rules.taraScore.get('1|1').score, 3, 'tara rules should be seeded');
  assert.strictEqual(rules.matchQualityLabels[0].label, 'Excellent', 'quality labels should be sorted from strongest to weakest');

  const result = calculateAshtakoota(userA, userB, rules);
  assert.strictEqual(result.totalScore, 24.5, 'injected rule set should produce stable totals');
  assert.strictEqual(result.matchQualityLabel, 'Average', 'quality label should come from the seeded thresholds');

  const cachedRules = getCompatibilityRules();
  const status = getCompatibilityRuleStatus();
  assert.ok(cachedRules && cachedRules.matchQualityLabels.length >= 4, 'cached compatibility rules should always exist');
  assert.ok(['fallback', 'database'].includes(status.source), 'rule status should expose the current source');

  console.log('compatRules.test.js passed');
}

run();
