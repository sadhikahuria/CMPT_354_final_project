const db = require('../config/db');

async function isBlockedEitherWay(userA, userB) {
  const [[row]] = await db.query(
    `SELECT 1
     FROM USER_BLOCK
     WHERE (BlockerUserID = ? AND BlockedUserID = ?)
        OR (BlockerUserID = ? AND BlockedUserID = ?)
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return !!row;
}

async function visibleUserFilterSql(currentUserId, alias = 'u') {
  return {
    clause: `NOT EXISTS (
      SELECT 1
      FROM USER_BLOCK ub
      WHERE (ub.BlockerUserID = ? AND ub.BlockedUserID = ${alias}.UserID)
         OR (ub.BlockedUserID = ? AND ub.BlockerUserID = ${alias}.UserID)
    )`,
    params: [currentUserId, currentUserId],
  };
}

module.exports = {
  isBlockedEitherWay,
  visibleUserFilterSql,
};
