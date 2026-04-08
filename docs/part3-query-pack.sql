-- Ashtakoota Part 3 query pack
-- These are the core SQL queries used by the live Insights / Query Lab section.

-- 1. Join query
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
LIMIT 8;

-- 2. Division query
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
ORDER BY u.Username;

-- 3. Aggregation query
SELECT COUNT(*) AS TotalReadings,
       ROUND(AVG(TotalScore), 2) AS AverageCompatibilityScore,
       MIN(TotalScore) AS LowestScore,
       MAX(TotalScore) AS HighestScore
FROM COMPATIBILITY_EVAL;

-- 4. Aggregation with GROUP BY
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
ORDER BY AverageScore DESC, ReadingCount DESC, GanaPair ASC;

-- 5. Delete-with-cascade demo target lookup
-- Bind current user id twice.
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
LIMIT 1;

-- 6. Update-operation demo target lookup
-- Bind current user id once.
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
WHERE u.UserID = ?;

-- 7. Delete operation used in the app demo
DELETE FROM MATCH_RECORD
WHERE MatchID = ?;

-- 8. Update operations used in the app demo
UPDATE NOTIFICATIONS
SET IsRead = 1
WHERE UserID = ?;

UPDATE USER
SET RelationshipIntent = ?, LookingFor = ?
WHERE UserID = ?;
