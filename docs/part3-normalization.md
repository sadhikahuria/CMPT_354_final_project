# Part 3 Normalization Notes

## Goal
Part 3 tightens the current Ashtakoota app so the database, not hardcoded JavaScript constants, is the authoritative source for compatibility rules and query demonstrations.

## Functional dependencies
- `PLANET`: `PlanetID -> PlanetName`
- `RASHI`: `RashiID -> RashiName, Varna, VashyaGroup, PlanetID`
- `NAKSHATRA`: `NakshatraID -> NakshatraName, Index1to27, Gana, Nadi, Yoni`
- `USER`: `UserID -> Username, Email, PasswordHash, DateOfBirth, TimeOfBirth, BirthLocation, Latitude, Longitude, RashiID, NakshatraID, AvatarURL, Bio, GenderIdentity, LookingFor, RelationshipIntent, ProfilePrompt, AcceptedSafetyAt, EmailVerifiedAt, EmailVerifyTokenHash, EmailVerifyExpiresAt, PasswordResetTokenHash, PasswordResetExpiresAt, CreatedAt`
- `MATCH_RECORD`: `MatchID -> MatchCreatedAt`
- `INVOLVES`: `MatchID -> UserA, UserB, UserLowID, UserHighID`
- `COMPAT_REQUEST`: `RequestID -> FromUserID, ToUserID, Status, CreatedAt, ExpiresAt, RespondedAt`
- `COMPATIBILITY_EVAL`: `EvalID -> TotalScore, MatchQualityLabel, EvaluatedAtTimestamp, EvalUser1ID, EvalUser2ID, EvalUserLowID, EvalUserHighID, RequestID`
- `KOOTA_SCORE`: `(EvalID, KootaType) -> MaxScore, ScoreValue, ExplanationText`
- `MESSAGES`: `MessageID -> MatchID, SenderID, Body, SentAt, ReadAt`
- `NOTIFICATIONS`: `NotifID -> UserID, Type, Payload, IsRead, CreatedAt`
- Rule tables:
  - `VARNA_RANK`: `Varna -> RankValue`
  - `VASHYA_SCORE`: `(SubjectGroup, ObjectGroup) -> ScoreValue`
  - `YONI_SCORE`: `(SubjectYoni, ObjectYoni) -> ScoreValue`
  - `PLANET_RELATION`: `(FromPlanetID, ToPlanetID) -> RelationType`
  - `GRAHA_MAITRI_SCORE`: `(FromPlanetID, ToPlanetID) -> ScoreValue`
  - `GANA_SCORE`: `(SubjectGana, ObjectGana) -> ScoreValue`
  - `BHAKOOT_SCORE`: `ForwardCount -> ScoreValue, ReasonText`
  - `NADI_SCORE`: `(SubjectNadi, ObjectNadi) -> ScoreValue`
  - `TARA_SCORE`: `(SubjectAuspicious, ObjectAuspicious) -> ScoreValue, ReasonText`
  - `MATCH_QUALITY_LABEL`: `Label -> MinScore, MaxScore, Description`

## 3NF / BCNF reasoning
- Each rule table isolates one scoring relation and stores facts about one key only. This removes transitive dependence on application logic.
- `RASHI` and `NAKSHATRA` keep derived astrological classification values in lookup tables instead of repeating them on every user row.
- `KOOTA_SCORE` is separated from `COMPATIBILITY_EVAL`, so each evaluation can have exactly one row per koota type.
- Pair normalization is enforced with generated low/high user columns in `INVOLVES` and `COMPATIBILITY_EVAL`, preventing symmetric duplicates such as `(1,2)` and `(2,1)`.
- No non-key attribute depends on part of a composite key in the rule or junction tables, so the design satisfies 3NF. The lookup tables are also in BCNF because their determinants are candidate keys.

## PK / FK summary
- Primary keys:
  - `PLANET(PlanetID)`
  - `RASHI(RashiID)`
  - `NAKSHATRA(NakshatraID)`
  - `MATCH_QUALITY_LABEL(Label)`
  - `VARNA_RANK(Varna)`
  - `VASHYA_SCORE(SubjectGroup, ObjectGroup)`
  - `YONI_SCORE(SubjectYoni, ObjectYoni)`
  - `PLANET_RELATION(FromPlanetID, ToPlanetID)`
  - `GRAHA_MAITRI_SCORE(FromPlanetID, ToPlanetID)`
  - `GANA_SCORE(SubjectGana, ObjectGana)`
  - `BHAKOOT_SCORE(ForwardCount)`
  - `NADI_SCORE(SubjectNadi, ObjectNadi)`
  - `TARA_SCORE(SubjectAuspicious, ObjectAuspicious)`
  - `USER(UserID)`
  - `USER_PHOTO(PhotoID)`
  - `USER_BLOCK(BlockerUserID, BlockedUserID)`
  - `USER_REPORT(ReportID)`
  - `USER_REPORT_ACTION(ActionID)`
  - `MATCH_RECORD(MatchID)`
  - `LIKES(UserA, UserB)`
  - `INVOLVES(MatchID)`
  - `COMPAT_REQUEST(RequestID)`
  - `COMPATIBILITY_EVAL(EvalID)`
  - `KOOTA_SCORE(EvalID, KootaType)`
  - `MESSAGES(MessageID)`
  - `NOTIFICATIONS(NotifID)`
- Key foreign keys:
  - `RASHI.PlanetID -> PLANET.PlanetID`
  - `USER.RashiID -> RASHI.RashiID`
  - `USER.NakshatraID -> NAKSHATRA.NakshatraID`
  - `USER_PHOTO.UserID -> USER.UserID`
  - `USER_BLOCK.* -> USER.UserID`
  - `USER_REPORT.* -> USER.UserID`
  - `USER_REPORT_ACTION.ReportID -> USER_REPORT.ReportID`
  - `MATCH_RECORD` referenced by `INVOLVES` and `MESSAGES`
  - `COMPATIBILITY_EVAL.EvalUser1ID / EvalUser2ID -> USER.UserID`
  - `COMPATIBILITY_EVAL.RequestID -> COMPAT_REQUEST.RequestID`
  - `COMPATIBILITY_EVAL.MatchQualityLabel -> MATCH_QUALITY_LABEL.Label`
  - `KOOTA_SCORE.EvalID -> COMPATIBILITY_EVAL.EvalID`
  - `NOTIFICATIONS.UserID -> USER.UserID`

## What changed from Part 2
- Compatibility thresholds and score matrices moved from JavaScript constants into relational rule tables.
- The schema now includes canonical user-pair enforcement for matches and evaluations.
- The app now exposes a live query lab for join, division, aggregation, grouped aggregation, delete-cascade, and update demonstrations.
- `backend/config/submission_setup.sql` now creates both the schema and a demo dataset that guarantees non-empty outputs for the required Part 3 query categories.
