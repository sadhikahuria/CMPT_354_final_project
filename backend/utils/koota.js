const { getCompatibilityRules } = require('./compatRules');

const KOOTA_MAX = {
  Varna: 1,
  Vashya: 2,
  Tara: 3,
  Yoni: 4,
  GrahaMaitri: 5,
  Gana: 6,
  Bhakoot: 7,
  Nadi: 8,
};

const AUSPICIOUS_TARA_REMAINDERS = new Set([0, 2, 4, 6, 8]);

function explainPair(leftLabel, rightLabel, leftValue, rightValue, score, max, suffix = '') {
  const extra = suffix ? ` ${suffix}` : '';
  return `${leftLabel} ${leftValue} vs ${rightLabel} ${rightValue}: ${score}/${max}.${extra}`;
}

function calcVarna(user1, user2, rules) {
  const rank1 = Number(rules.varnaRank.get(user1.varna) || 0);
  const rank2 = Number(rules.varnaRank.get(user2.varna) || 0);
  const score = rank1 >= rank2 ? 1 : 0;
  const explanation = score === 1
    ? `Varna rank ${user1.varna} (${rank1}) is greater than or equal to ${user2.varna} (${rank2}), so the pair receives 1/1.`
    : `Varna rank ${user1.varna} (${rank1}) is lower than ${user2.varna} (${rank2}), so the pair receives 0/1.`;
  return { score, max: KOOTA_MAX.Varna, explanation };
}

function calcVashya(user1, user2, rules) {
  const score = Number(rules.vashyaScore.get(`${user1.vashyaGroup}|${user2.vashyaGroup}`) || 0);
  return {
    score,
    max: KOOTA_MAX.Vashya,
    explanation: explainPair('Vashya', 'Vashya', user1.vashyaGroup, user2.vashyaGroup, score, KOOTA_MAX.Vashya),
  };
}

function calcTara(user1, user2, rules) {
  const forwardCount = ((user2.nakshatraIndex - user1.nakshatraIndex + 27) % 27) + 1;
  const reverseCount = ((user1.nakshatraIndex - user2.nakshatraIndex + 27) % 27) + 1;
  const forwardRemainder = forwardCount % 9;
  const reverseRemainder = reverseCount % 9;
  const forwardAuspicious = Number(AUSPICIOUS_TARA_REMAINDERS.has(forwardRemainder));
  const reverseAuspicious = Number(AUSPICIOUS_TARA_REMAINDERS.has(reverseRemainder));
  const taraRule = rules.taraScore.get(`${forwardAuspicious}|${reverseAuspicious}`) || { score: 0, reason: 'No tara rule found.' };
  return {
    score: Number(taraRule.score || 0),
    max: KOOTA_MAX.Tara,
    explanation: `User 1 remainder ${forwardRemainder} (${forwardAuspicious ? 'auspicious' : 'inauspicious'}) and User 2 remainder ${reverseRemainder} (${reverseAuspicious ? 'auspicious' : 'inauspicious'}) -> ${taraRule.score}/${KOOTA_MAX.Tara}. ${taraRule.reason}`,
  };
}

function calcYoni(user1, user2, rules) {
  const score = Number(rules.yoniScore.get(`${user1.yoni}|${user2.yoni}`) || 0);
  return {
    score,
    max: KOOTA_MAX.Yoni,
    explanation: explainPair('Yoni', 'Yoni', user1.yoni, user2.yoni, score, KOOTA_MAX.Yoni),
  };
}

function calcGrahaMaitri(user1, user2, rules) {
  const score = Number(rules.grahaScore.get(`${user1.rashiRuler}|${user2.rashiRuler}`) || 0);
  const relationForward = rules.planetRelation.get(`${user1.rashiRuler}|${user2.rashiRuler}`) || 'unknown';
  const relationReverse = rules.planetRelation.get(`${user2.rashiRuler}|${user1.rashiRuler}`) || 'unknown';
  return {
    score,
    max: KOOTA_MAX.GrahaMaitri,
    explanation: `${user1.rashiRuler} -> ${user2.rashiRuler} is ${relationForward}; ${user2.rashiRuler} -> ${user1.rashiRuler} is ${relationReverse}. Score: ${score}/${KOOTA_MAX.GrahaMaitri}.`,
  };
}

function calcGana(user1, user2, rules) {
  const score = Number(rules.ganaScore.get(`${user1.gana}|${user2.gana}`) || 0);
  return {
    score,
    max: KOOTA_MAX.Gana,
    explanation: explainPair('Gana', 'Gana', user1.gana, user2.gana, score, KOOTA_MAX.Gana),
  };
}

function rashiCount(fromRashiIndex, toRashiIndex) {
  return ((toRashiIndex - fromRashiIndex + 12) % 12) + 1;
}

function calcBhakoot(user1, user2, rules) {
  const forwardCount = rashiCount(user1.rashiIndex, user2.rashiIndex);
  const reverseCount = rashiCount(user2.rashiIndex, user1.rashiIndex);
  const bhakootRule = rules.bhakootScore.get(String(forwardCount)) || { score: 0, reason: 'No bhakoot rule found.' };
  return {
    score: Number(bhakootRule.score || 0),
    max: KOOTA_MAX.Bhakoot,
    explanation: `Forward distance ${forwardCount}, reverse distance ${reverseCount} -> ${bhakootRule.score}/${KOOTA_MAX.Bhakoot}. ${bhakootRule.reason}`,
  };
}

function calcNadi(user1, user2, rules) {
  const score = Number(rules.nadiScore.get(`${user1.nadi}|${user2.nadi}`) || 0);
  const sameNadi = user1.nadi === user2.nadi;
  return {
    score,
    max: KOOTA_MAX.Nadi,
    explanation: sameNadi
      ? `Both users have ${user1.nadi} Nadi, so the pair receives ${score}/${KOOTA_MAX.Nadi}.`
      : `Nadi values ${user1.nadi} and ${user2.nadi} differ, so the pair receives ${score}/${KOOTA_MAX.Nadi}.`,
  };
}

function qualityLabel(totalScore, rules) {
  const match = rules.matchQualityLabels.find(row => totalScore >= row.minScore && totalScore <= row.maxScore);
  return match?.label || 'Poor';
}

function calculateAshtakoota(user1, user2, rules = getCompatibilityRules()) {
  const resolvedRules = rules || getCompatibilityRules();
  const kootas = {
    Varna: calcVarna(user1, user2, resolvedRules),
    Vashya: calcVashya(user1, user2, resolvedRules),
    Tara: calcTara(user1, user2, resolvedRules),
    Yoni: calcYoni(user1, user2, resolvedRules),
    GrahaMaitri: calcGrahaMaitri(user1, user2, resolvedRules),
    Gana: calcGana(user1, user2, resolvedRules),
    Bhakoot: calcBhakoot(user1, user2, resolvedRules),
    Nadi: calcNadi(user1, user2, resolvedRules),
  };
  const totalScore = Object.values(kootas).reduce((sum, koota) => sum + Number(koota.score || 0), 0);
  return {
    kootas,
    totalScore,
    matchQualityLabel: qualityLabel(totalScore, resolvedRules),
  };
}

module.exports = {
  KOOTA_MAX,
  calculateAshtakoota,
  rashiCount,
};
