const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { getCompatibilityRuleStatus } = require('../utils/compatRules');

const JOIN_QUERY_SQL = `
SELECT ce.EvalID,
       u1.Username AS UserOne,
       u2.Username AS UserTwo,
       r1.RashiName AS UserOneRashi,
       r2.RashiName AS UserTwoRashi,
       n1.Gana AS UserOneGana,
       n2.Gana AS UserTwoGana,
       ce.TotalScore,
       ce.MatchQualityLabel
FROM COMPATIBILITY_EVAL ce
JOIN USER u1 ON u1.UserID = ce.EvalUser1ID
JOIN USER u2 ON u2.UserID = ce.EvalUser2ID
JOIN RASHI r1 ON r1.RashiID = u1.RashiID
JOIN RASHI r2 ON r2.RashiID = u2.RashiID
JOIN NAKSHATRA n1 ON n1.NakshatraID = u1.NakshatraID
JOIN NAKSHATRA n2 ON n2.NakshatraID = u2.NakshatraID
ORDER BY ce.TotalScore DESC, ce.EvaluatedAtTimestamp DESC
LIMIT 8
`;

const DIVISION_QUERY_SQL = `
SELECT u.UserID,
       u.Username
FROM USER u
WHERE NOT EXISTS (
  SELECT required.Gana
  FROM (
    SELECT 'Deva' AS Gana
    UNION ALL SELECT 'Manushya'
    UNION ALL SELECT 'Rakshasa'
  ) required
  WHERE NOT EXISTS (
    SELECT 1
    FROM COMPATIBILITY_EVAL ce
    JOIN USER partner
      ON partner.UserID = CASE
        WHEN ce.EvalUser1ID = u.UserID THEN ce.EvalUser2ID
        ELSE ce.EvalUser1ID
      END
    JOIN NAKSHATRA partner_n ON partner_n.NakshatraID = partner.NakshatraID
    WHERE (ce.EvalUser1ID = u.UserID OR ce.EvalUser2ID = u.UserID)
      AND partner_n.Gana = required.Gana
  )
)
ORDER BY u.Username
`;

const AGGREGATION_QUERY_SQL = `
SELECT COUNT(*) AS TotalReadings,
       ROUND(AVG(TotalScore), 2) AS AverageCompatibilityScore,
       MIN(TotalScore) AS LowestScore,
       MAX(TotalScore) AS HighestScore
FROM COMPATIBILITY_EVAL
`;

const GROUP_BY_QUERY_SQL = `
SELECT CONCAT(
         LEAST(n1.Gana, n2.Gana),
         ' <-> ',
         GREATEST(n1.Gana, n2.Gana)
       ) AS GanaPair,
       COUNT(*) AS ReadingCount,
       ROUND(AVG(ce.TotalScore), 2) AS AverageScore
FROM COMPATIBILITY_EVAL ce
JOIN USER u1 ON u1.UserID = ce.EvalUser1ID
JOIN USER u2 ON u2.UserID = ce.EvalUser2ID
JOIN NAKSHATRA n1 ON n1.NakshatraID = u1.NakshatraID
JOIN NAKSHATRA n2 ON n2.NakshatraID = u2.NakshatraID
GROUP BY GanaPair
ORDER BY AverageScore DESC, ReadingCount DESC, GanaPair ASC
`;

const DELETE_CASCADE_SQL = `
SELECT mr.MatchID,
       ce.EvalID,
       u1.Username AS UserOne,
       u2.Username AS UserTwo,
       COALESCE(msg.MessageCount, 0) AS MessageCount,
       COALESCE(notif.NotificationCount, 0) AS NotificationCount
FROM MATCH_RECORD mr
JOIN INVOLVES inv ON inv.MatchID = mr.MatchID
JOIN USER u1 ON u1.UserID = inv.UserA
JOIN USER u2 ON u2.UserID = inv.UserB
LEFT JOIN COMPATIBILITY_EVAL ce
  ON ce.EvalUserLowID = inv.UserLowID
 AND ce.EvalUserHighID = inv.UserHighID
LEFT JOIN (
  SELECT MatchID, COUNT(*) AS MessageCount
  FROM MESSAGES
  GROUP BY MatchID
) msg ON msg.MatchID = mr.MatchID
LEFT JOIN (
  SELECT JSON_UNQUOTE(JSON_EXTRACT(Payload, '$.matchId')) AS MatchIDText,
         COUNT(*) AS NotificationCount
  FROM NOTIFICATIONS
  WHERE Type IN ('match', 'message')
  GROUP BY JSON_UNQUOTE(JSON_EXTRACT(Payload, '$.matchId'))
) notif ON notif.MatchIDText = CAST(mr.MatchID AS CHAR)
WHERE (inv.UserA = ? OR inv.UserB = ?)
ORDER BY MessageCount DESC, mr.MatchID ASC
LIMIT 1
`;

const UPDATE_DEMO_SQL = `
SELECT u.UserID,
       u.Username,
       u.RelationshipIntent,
       u.LookingFor,
       (
         SELECT COUNT(*)
         FROM NOTIFICATIONS n
         WHERE n.UserID = u.UserID
           AND n.IsRead = 0
       ) AS UnreadNotificationCount
FROM USER u
WHERE u.UserID = ?
`;

router.get('/overview', auth, async (req, res) => {
  try {
    const ruleStatus = getCompatibilityRuleStatus();
    const [[aggregateRow]] = await db.query(AGGREGATION_QUERY_SQL);
    const [divisionRows] = await db.query(DIVISION_QUERY_SQL);
    const [[topPair]] = await db.query(
      `SELECT ce.TotalScore, u1.Username AS UserOne, u2.Username AS UserTwo
       FROM COMPATIBILITY_EVAL ce
       JOIN USER u1 ON u1.UserID = ce.EvalUser1ID
       JOIN USER u2 ON u2.UserID = ce.EvalUser2ID
       ORDER BY ce.TotalScore DESC, ce.EvaluatedAtTimestamp DESC
       LIMIT 1`
    );

    return res.json({
      overview: {
        totalReadings: Number(aggregateRow?.TotalReadings || 0),
        averageCompatibilityScore: Number(aggregateRow?.AverageCompatibilityScore || 0),
        lowestScore: Number(aggregateRow?.LowestScore || 0),
        highestScore: Number(aggregateRow?.HighestScore || 0),
        divisionQualifiedUsers: divisionRows.length,
        strongestPair: topPair || null,
        ruleSource: ruleStatus.source,
        ruleLoadedAt: ruleStatus.loadedAt,
        ruleError: ruleStatus.error,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/query-lab', auth, async (req, res) => {
  try {
    const [
      [joinRows],
      [divisionRows],
      [[aggregationRow]],
      [groupRows],
      [[deleteCascadeRow]],
      [[updateRow]],
    ] = await Promise.all([
      db.query(JOIN_QUERY_SQL),
      db.query(DIVISION_QUERY_SQL),
      db.query(AGGREGATION_QUERY_SQL),
      db.query(GROUP_BY_QUERY_SQL),
      db.query(DELETE_CASCADE_SQL, [req.user.userId, req.user.userId]),
      db.query(UPDATE_DEMO_SQL, [req.user.userId]),
    ]);

    return res.json({
      queryLab: {
        joinQuery: {
          title: 'Join Query',
          sql: JOIN_QUERY_SQL.trim(),
          rows: joinRows,
        },
        divisionQuery: {
          title: 'Division Query',
          sql: DIVISION_QUERY_SQL.trim(),
          rows: divisionRows,
        },
        aggregationQuery: {
          title: 'Aggregation Query',
          sql: AGGREGATION_QUERY_SQL.trim(),
          rows: aggregationRow ? [aggregationRow] : [],
        },
        groupByAggregation: {
          title: 'Aggregation With Group By',
          sql: GROUP_BY_QUERY_SQL.trim(),
          rows: groupRows,
        },
        deleteCascadeDemo: {
          title: 'Delete With Cascade Demo',
          sql: `${DELETE_CASCADE_SQL.trim()}\n-- bound params: [currentUserId, currentUserId]`,
          target: deleteCascadeRow || null,
          notes: deleteCascadeRow ? [
            'Use the app unmatch flow on the selected match.',
            'Deleting MATCH_RECORD should cascade into INVOLVES and MESSAGES.',
            'Compatibility rows remain for history unless explicitly deleted separately.',
          ] : ['Seed demo data is required to surface a cascade target.'],
        },
        updateOperationDemo: {
          title: 'Update Operation Demo',
          sql: `${UPDATE_DEMO_SQL.trim()}\n-- bound params: [currentUserId]`,
          target: updateRow || null,
          notes: updateRow ? [
            'Use Mark all read in notifications to demonstrate an UPDATE on NOTIFICATIONS.',
            'Use Save changes in My Profile to demonstrate an UPDATE on USER.',
          ] : ['Seed demo data is required to surface an update target.'],
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
