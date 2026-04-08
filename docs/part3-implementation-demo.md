# Part 3 Implementation Demo Script

## Setup
- Open the app and log in with `arjun_demo@example.com` / `Part3Demo!`.
- Mention that the database was initialized with `backend/config/submission_setup.sql`, which loads both the schema and demo data.
- Open the browser dev tools network tab only if you want to point at `/api/insights/overview` and `/api/insights/query-lab`.

## Suggested 5-minute flow
1. Start in `Insights`.
   - Explain that this section was added for Part 3 and is backed by live SQL, not mocked tables.
   - Point at the `Rule Source` card and say that compatibility rules now come from relational rule tables, with a fallback cache only if the database tables are unavailable.
2. Show the join query card.
   - Say that it joins `COMPATIBILITY_EVAL`, both `USER` aliases, `RASHI`, and `NAKSHATRA`.
   - Point at usernames, rashis, gana values, total score, and quality label in one result row.
3. Show the division query card.
   - Explain the `NOT EXISTS` pattern: the query returns users who have compatibility readings with partners from all three Gana categories.
   - Mention that the seeded data guarantees at least one qualifying user.
4. Show the aggregation card.
   - Explain the overall count, average, minimum, and maximum score over all compatibility readings.
5. Show the grouped aggregation card.
   - Explain the `GROUP BY` over normalized Gana pair categories.
   - Mention that this demonstrates analytics over application data, not only lookup tables.
6. Show the delete-with-cascade card.
   - Explain that the target row is a real match owned by the logged-in user.
   - Click `Open demo match`, then unmatch that pair from the app.
   - Say that deleting `MATCH_RECORD` cascades to `INVOLVES` and `MESSAGES`, which is enforced by foreign keys.
7. Show the update-operation card.
   - Open notifications and use `Mark all read`.
   - Open `My Profile` and save a visible `RelationshipIntent` or `LookingFor` change.
   - Return to `Insights` and refresh to show the updated unread-count/profile state.

## SQL talking points
- Compatibility rules are stored in `VARNA_RANK`, `VASHYA_SCORE`, `YONI_SCORE`, `PLANET_RELATION`, `GRAHA_MAITRI_SCORE`, `GANA_SCORE`, `BHAKOOT_SCORE`, `NADI_SCORE`, `TARA_SCORE`, and `MATCH_QUALITY_LABEL`.
- `COMPATIBILITY_EVAL` and `INVOLVES` use canonical low/high generated columns to prevent duplicate symmetric pairs.
- The query pack used in the demo is included in [part3-query-pack.sql](/Users/shivanshghai/Library/Mobile Documents/com~apple~CloudDocs/CMPT 354/Project/ashtakoota/docs/part3-query-pack.sql).

## Expected visible outputs
- Non-empty overview cards.
- Non-empty results for join, division, aggregation, and grouped aggregation.
- One concrete cascade target for the logged-in user.
- One concrete update target showing unread notifications and current profile intent fields.
