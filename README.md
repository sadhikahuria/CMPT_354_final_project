# CMPT_354_final_project

## Team Setup

Use a local `.env` file with standard database settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ashtakoota_db
APP_SECRET_KEY=change-this-for-your-team
```

The app still accepts the older combined `DB_HOST` style as a fallback, but the standard format above is what the group should use going forward.

## Run And Verify

PowerShell scripts:

```powershell
./scripts/setup.ps1
./scripts/run.ps1
./scripts/verify.ps1
```

Make targets:

```powershell
make setup
make run
make verify
```

`setup` creates `.venv` and installs the Python dependencies from `requirements.txt`.

`verify` runs the integration tests against the configured MySQL database.

## Current API Slice

Current registration endpoint:

```text
POST /auth/register
```

Current login endpoint:

```text
POST /auth/login
```

Current session endpoints:

```text
GET /auth/me
POST /auth/logout
```

Current discovery endpoint:

```text
GET /users/discover
```

Current browser UI:

```text
GET /
GET /ui/
```

Optional discovery query params:

```text
min_age
max_age
```

Temporary Phase 2 request body:

```json
{
  "username": "new_user",
  "email": "new_user@example.com",
  "password": "securepass123",
  "date_of_birth": "2000-01-02",
  "time_of_birth": "08:30:00",
  "birth_location": "Surrey, BC",
  "rashi_id": 1,
  "nakshatra_id": 1
}
```

For this step, `rashi_id` and `nakshatra_id` are accepted directly so we can build and test the auth flow first. We will replace that with birth-data derivation in a later step.

Current login request body:

```json
{
  "email": "new_user@example.com",
  "password": "securepass123"
}
```

For this step, login only verifies credentials and returns a user summary. Session or token management will be added later.

This step now uses Flask's signed cookie session. Set `APP_SECRET_KEY` in `.env` so the whole team can run the same auth flow reliably on their own machines.

`GET /users/discover` requires login and returns other users only. It excludes the signed-in user, derives each returned user's age from `DateOfBirth`, and currently supports `min_age` / `max_age` filtering.

`GET /` now redirects to the first visual page. `GET /ui/` also works directly. The page includes a small register form, login/logout controls, and a discovery panel wired to the API endpoints above.

If you want the old JSON-style app summary while developing, use `GET /api`.
