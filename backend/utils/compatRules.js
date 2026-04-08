const DEFAULT_MATCH_QUALITY_LABELS = [
  { label: 'Excellent', minScore: 33, maxScore: 36, description: 'Outstanding compatibility across most kootas.' },
  { label: 'Good', minScore: 25, maxScore: 32.9, description: 'Strong compatibility with only minor weak areas.' },
  { label: 'Average', minScore: 18, maxScore: 24.9, description: 'Mixed compatibility that needs more human judgement.' },
  { label: 'Poor', minScore: 0, maxScore: 17.9, description: 'Low compatibility score within the Ashtakoota system.' },
];

const DEFAULT_VARNA_RANK = {
  Brahmin: 4,
  Kshatriya: 3,
  Vaishya: 2,
  Shudra: 1,
};

const DEFAULT_VASHYA_SCORE = {
  Chatushpada: { Chatushpada: 2, Dwipada: 1, Jalachara: 0, Vanachara: 0.5, Keeta: 0 },
  Dwipada: { Chatushpada: 1, Dwipada: 2, Jalachara: 0, Vanachara: 1, Keeta: 1 },
  Jalachara: { Chatushpada: 0, Dwipada: 0, Jalachara: 2, Vanachara: 0, Keeta: 1 },
  Vanachara: { Chatushpada: 1, Dwipada: 1, Jalachara: 0, Vanachara: 2, Keeta: 0 },
  Keeta: { Chatushpada: 0, Dwipada: 1, Jalachara: 1, Vanachara: 0, Keeta: 2 },
};

const DEFAULT_YONI_SCORE = {
  Horse: { Horse: 4, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 0, Rat: 1, Cow: 3, Buffalo: 2, Tiger: 0, Deer: 3, Monkey: 2, Mongoose: 2, Lion: 0 },
  Elephant: { Horse: 2, Elephant: 4, Sheep: 3, Serpent: 2, Dog: 2, Cat: 3, Rat: 2, Cow: 3, Buffalo: 3, Tiger: 1, Deer: 3, Monkey: 2, Mongoose: 2, Lion: 0 },
  Sheep: { Horse: 2, Elephant: 3, Sheep: 4, Serpent: 2, Dog: 1, Cat: 2, Rat: 2, Cow: 3, Buffalo: 3, Tiger: 0, Deer: 2, Monkey: 3, Mongoose: 2, Lion: 0 },
  Serpent: { Horse: 0, Elephant: 2, Sheep: 2, Serpent: 4, Dog: 0, Cat: 2, Rat: 0, Cow: 2, Buffalo: 2, Tiger: 2, Deer: 0, Monkey: 1, Mongoose: 0, Lion: 1 },
  Dog: { Horse: 2, Elephant: 2, Sheep: 1, Serpent: 0, Dog: 4, Cat: 0, Rat: 2, Cow: 2, Buffalo: 2, Tiger: 1, Deer: 2, Monkey: 2, Mongoose: 2, Lion: 0 },
  Cat: { Horse: 0, Elephant: 3, Sheep: 2, Serpent: 2, Dog: 0, Cat: 4, Rat: 0, Cow: 2, Buffalo: 2, Tiger: 2, Deer: 2, Monkey: 3, Mongoose: 2, Lion: 1 },
  Rat: { Horse: 1, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 0, Rat: 4, Cow: 2, Buffalo: 2, Tiger: 0, Deer: 2, Monkey: 2, Mongoose: 0, Lion: 1 },
  Cow: { Horse: 3, Elephant: 3, Sheep: 3, Serpent: 2, Dog: 2, Cat: 2, Rat: 2, Cow: 4, Buffalo: 3, Tiger: 0, Deer: 3, Monkey: 2, Mongoose: 3, Lion: 0 },
  Buffalo: { Horse: 2, Elephant: 3, Sheep: 3, Serpent: 2, Dog: 2, Cat: 2, Rat: 2, Cow: 3, Buffalo: 4, Tiger: 0, Deer: 2, Monkey: 2, Mongoose: 2, Lion: 1 },
  Tiger: { Horse: 0, Elephant: 1, Sheep: 0, Serpent: 2, Dog: 1, Cat: 2, Rat: 0, Cow: 0, Buffalo: 0, Tiger: 4, Deer: 0, Monkey: 0, Mongoose: 2, Lion: 2 },
  Deer: { Horse: 3, Elephant: 3, Sheep: 2, Serpent: 0, Dog: 2, Cat: 2, Rat: 2, Cow: 3, Buffalo: 2, Tiger: 0, Deer: 4, Monkey: 2, Mongoose: 2, Lion: 0 },
  Monkey: { Horse: 2, Elephant: 2, Sheep: 3, Serpent: 1, Dog: 2, Cat: 3, Rat: 2, Cow: 2, Buffalo: 2, Tiger: 0, Deer: 2, Monkey: 4, Mongoose: 2, Lion: 1 },
  Mongoose: { Horse: 2, Elephant: 2, Sheep: 2, Serpent: 0, Dog: 2, Cat: 2, Rat: 0, Cow: 3, Buffalo: 2, Tiger: 2, Deer: 2, Monkey: 2, Mongoose: 4, Lion: 1 },
  Lion: { Horse: 0, Elephant: 0, Sheep: 0, Serpent: 1, Dog: 0, Cat: 1, Rat: 1, Cow: 0, Buffalo: 1, Tiger: 2, Deer: 0, Monkey: 1, Mongoose: 1, Lion: 4 },
};

const DEFAULT_PLANET_SCORES = {
  Sun: { Sun: 5, Moon: 4, Mars: 4, Mercury: 2, Jupiter: 4, Venus: 0, Saturn: 0, Rahu: 2, Ketu: 2 },
  Moon: { Sun: 4, Moon: 5, Mars: 2, Mercury: 4, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 2, Ketu: 2 },
  Mars: { Sun: 4, Moon: 2, Mars: 5, Mercury: 0, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 2, Ketu: 4 },
  Mercury: { Sun: 2, Moon: 4, Mars: 0, Mercury: 5, Jupiter: 4, Venus: 4, Saturn: 2, Rahu: 4, Ketu: 0 },
  Jupiter: { Sun: 4, Moon: 4, Mars: 4, Mercury: 2, Jupiter: 5, Venus: 0, Saturn: 0, Rahu: 0, Ketu: 4 },
  Venus: { Sun: 0, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 5, Saturn: 4, Rahu: 4, Ketu: 2 },
  Saturn: { Sun: 0, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 4, Saturn: 5, Rahu: 4, Ketu: 2 },
  Rahu: { Sun: 2, Moon: 2, Mars: 2, Mercury: 4, Jupiter: 0, Venus: 4, Saturn: 4, Rahu: 5, Ketu: 0 },
  Ketu: { Sun: 2, Moon: 2, Mars: 4, Mercury: 0, Jupiter: 4, Venus: 2, Saturn: 2, Rahu: 0, Ketu: 5 },
};

const DEFAULT_GANA_SCORE = {
  Deva: { Deva: 6, Manushya: 5, Rakshasa: 1 },
  Manushya: { Deva: 5, Manushya: 6, Rakshasa: 0 },
  Rakshasa: { Deva: 0, Manushya: 0, Rakshasa: 6 },
};

const DEFAULT_NADI_SCORE = {
  Adi: { Adi: 0, Madhya: 8, Antya: 8 },
  Madhya: { Adi: 8, Madhya: 0, Antya: 8 },
  Antya: { Adi: 8, Madhya: 8, Antya: 0 },
};

const DEFAULT_BHAKOOT_SCORE = {
  1: { score: 7, reason: 'Same-sign pairing is treated as acceptable in this project schema.' },
  2: { score: 7, reason: 'Forward distance 2 is auspicious.' },
  3: { score: 7, reason: 'Forward distance 3 is auspicious.' },
  4: { score: 7, reason: 'Forward distance 4 is auspicious.' },
  5: { score: 0, reason: '5/9 Bhakoot pairing is inauspicious.' },
  6: { score: 0, reason: '6/8 Bhakoot pairing is inauspicious.' },
  7: { score: 7, reason: 'Forward distance 7 is auspicious.' },
  8: { score: 0, reason: '6/8 Bhakoot pairing is inauspicious.' },
  9: { score: 0, reason: '5/9 Bhakoot pairing is inauspicious.' },
  10: { score: 7, reason: 'Forward distance 10 is auspicious.' },
  11: { score: 7, reason: 'Forward distance 11 is auspicious.' },
  12: { score: 7, reason: 'Forward distance 12 is auspicious.' },
};

const DEFAULT_TARA_SCORE = {
  '0|0': { score: 0, reason: 'Neither tara direction is auspicious.' },
  '0|1': { score: 1.5, reason: 'One tara direction is auspicious.' },
  '1|0': { score: 1.5, reason: 'One tara direction is auspicious.' },
  '1|1': { score: 3, reason: 'Both tara directions are auspicious.' },
};

function buildMapFromNestedObject(obj) {
  const map = new Map();
  for (const [left, rights] of Object.entries(obj)) {
    for (const [right, value] of Object.entries(rights)) {
      map.set(`${left}|${right}`, value);
    }
  }
  return map;
}

function planetRelationTypeFromScore(score) {
  if (score >= 5) return 'same';
  if (score >= 4) return 'friend';
  if (score >= 2) return 'neutral';
  return 'enemy';
}

function buildDefaultCompatibilityRules() {
  const planetRelation = new Map();
  const grahaScore = new Map();
  for (const [fromPlanet, row] of Object.entries(DEFAULT_PLANET_SCORES)) {
    for (const [toPlanet, scoreValue] of Object.entries(row)) {
      planetRelation.set(`${fromPlanet}|${toPlanet}`, planetRelationTypeFromScore(scoreValue));
      grahaScore.set(`${fromPlanet}|${toPlanet}`, scoreValue);
    }
  }

  return {
    varnaRank: new Map(Object.entries(DEFAULT_VARNA_RANK)),
    vashyaScore: buildMapFromNestedObject(DEFAULT_VASHYA_SCORE),
    yoniScore: buildMapFromNestedObject(DEFAULT_YONI_SCORE),
    planetRelation,
    grahaScore,
    ganaScore: buildMapFromNestedObject(DEFAULT_GANA_SCORE),
    bhakootScore: new Map(Object.entries(DEFAULT_BHAKOOT_SCORE).map(([distance, value]) => [String(distance), value])),
    nadiScore: buildMapFromNestedObject(DEFAULT_NADI_SCORE),
    taraScore: new Map(Object.entries(DEFAULT_TARA_SCORE)),
    matchQualityLabels: DEFAULT_MATCH_QUALITY_LABELS.map(row => ({ ...row })).sort((a, b) => b.minScore - a.minScore),
  };
}

let cachedRules = buildDefaultCompatibilityRules();
let cachedStatus = {
  source: 'fallback',
  loadedAt: null,
  error: 'Database compatibility rules have not been loaded yet.',
};

async function loadRulesFromDatabase() {
  const db = require('../config/db');
  const [
    [varnaRows],
    [vashyaRows],
    [yoniRows],
    [planetRelationRows],
    [grahaRows],
    [ganaRows],
    [bhakootRows],
    [nadiRows],
    [taraRows],
    [qualityRows],
  ] = await Promise.all([
    db.query('SELECT Varna, RankValue FROM VARNA_RANK ORDER BY RankValue DESC'),
    db.query('SELECT SubjectGroup, ObjectGroup, ScoreValue FROM VASHYA_SCORE'),
    db.query('SELECT SubjectYoni, ObjectYoni, ScoreValue FROM YONI_SCORE'),
    db.query(`SELECT pf.PlanetName AS FromPlanet, pt.PlanetName AS ToPlanet, pr.RelationType
              FROM PLANET_RELATION pr
              JOIN PLANET pf ON pf.PlanetID = pr.FromPlanetID
              JOIN PLANET pt ON pt.PlanetID = pr.ToPlanetID`),
    db.query(`SELECT pf.PlanetName AS FromPlanet, pt.PlanetName AS ToPlanet, gs.ScoreValue
              FROM GRAHA_MAITRI_SCORE gs
              JOIN PLANET pf ON pf.PlanetID = gs.FromPlanetID
              JOIN PLANET pt ON pt.PlanetID = gs.ToPlanetID`),
    db.query('SELECT SubjectGana, ObjectGana, ScoreValue FROM GANA_SCORE'),
    db.query('SELECT ForwardCount, ScoreValue, ReasonText FROM BHAKOOT_SCORE'),
    db.query('SELECT SubjectNadi, ObjectNadi, ScoreValue FROM NADI_SCORE'),
    db.query('SELECT SubjectAuspicious, ObjectAuspicious, ScoreValue, ReasonText FROM TARA_SCORE'),
    db.query('SELECT Label, MinScore, MaxScore, Description FROM MATCH_QUALITY_LABEL ORDER BY MinScore DESC'),
  ]);

  if (!varnaRows.length || !vashyaRows.length || !yoniRows.length || !planetRelationRows.length ||
      !grahaRows.length || !ganaRows.length || !bhakootRows.length || !nadiRows.length ||
      !taraRows.length || !qualityRows.length) {
    throw new Error('One or more Part 3 compatibility rule tables are empty.');
  }

  return {
    varnaRank: new Map(varnaRows.map(row => [row.Varna, Number(row.RankValue)])),
    vashyaScore: new Map(vashyaRows.map(row => [`${row.SubjectGroup}|${row.ObjectGroup}`, Number(row.ScoreValue)])),
    yoniScore: new Map(yoniRows.map(row => [`${row.SubjectYoni}|${row.ObjectYoni}`, Number(row.ScoreValue)])),
    planetRelation: new Map(planetRelationRows.map(row => [`${row.FromPlanet}|${row.ToPlanet}`, row.RelationType])),
    grahaScore: new Map(grahaRows.map(row => [`${row.FromPlanet}|${row.ToPlanet}`, Number(row.ScoreValue)])),
    ganaScore: new Map(ganaRows.map(row => [`${row.SubjectGana}|${row.ObjectGana}`, Number(row.ScoreValue)])),
    bhakootScore: new Map(bhakootRows.map(row => [String(row.ForwardCount), {
      score: Number(row.ScoreValue),
      reason: row.ReasonText,
    }])),
    nadiScore: new Map(nadiRows.map(row => [`${row.SubjectNadi}|${row.ObjectNadi}`, Number(row.ScoreValue)])),
    taraScore: new Map(taraRows.map(row => [`${Number(row.SubjectAuspicious)}|${Number(row.ObjectAuspicious)}`, {
      score: Number(row.ScoreValue),
      reason: row.ReasonText,
    }])),
    matchQualityLabels: qualityRows.map(row => ({
      label: row.Label,
      minScore: Number(row.MinScore),
      maxScore: Number(row.MaxScore),
      description: row.Description,
    })).sort((a, b) => b.minScore - a.minScore),
  };
}

async function warmCompatibilityRules({ force = false } = {}) {
  if (!force && cachedStatus.loadedAt && cachedStatus.source === 'database') {
    return cachedRules;
  }

  try {
    cachedRules = await loadRulesFromDatabase();
    cachedStatus = {
      source: 'database',
      loadedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    cachedRules = buildDefaultCompatibilityRules();
    cachedStatus = {
      source: 'fallback',
      loadedAt: new Date().toISOString(),
      error: error.message,
    };
  }

  return cachedRules;
}

function getCompatibilityRules() {
  return cachedRules;
}

function getCompatibilityRuleStatus() {
  return { ...cachedStatus };
}

module.exports = {
  buildDefaultCompatibilityRules,
  getCompatibilityRules,
  getCompatibilityRuleStatus,
  warmCompatibilityRules,
};
