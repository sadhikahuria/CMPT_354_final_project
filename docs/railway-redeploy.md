# Railway Redeploy Notes

## Final destination
Target repo: `sadhikahuria/CMPT_354_final_project`

## Redeploy steps
1. Push the finished codebase to the final GitHub repository.
2. In Railway, point the backend service at the backend directory from the final repo.
3. Recreate or verify these backend variables:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `PORT`
   - `FRONTEND_URL`
   - Optional mail and Prokerala variables if you want those features active in the demo.
4. Run [submission_setup.sql](/Users/shivanshghai/Library/Mobile Documents/com~apple~CloudDocs/CMPT 354/Project/ashtakoota/backend/config/submission_setup.sql) against the Railway MySQL instance from the `backend/config` directory.
5. Point the frontend deployment at the frontend directory from the final repo.
6. Verify:
   - login works for a seeded demo account
   - `Insights` loads successfully
   - at least one query card in the lab returns seeded rows
   - match deletion and notification/profile updates are reflected after refresh
