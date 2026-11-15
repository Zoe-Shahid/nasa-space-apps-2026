# AstroOrbitX backend

FastAPI API for the local authenticated measurement MVP. The routes and wire behavior follow [`API_CONTRACT.md`](../API_CONTRACT.md). This is not a clinical system, NASA-endorsed product, or production-ready service.

## Setup

Requirements: Python 3.10–3.12 and `uv`.

From `backend/`:

```sh
cp .env.example .env
uv sync --locked
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Environment variables: `ASTROORBITX_APP_ENVIRONMENT`, `ASTROORBITX_DATABASE_URL`, `ASTROORBITX_CORS_ORIGINS`, and `ASTROORBITX_LOG_LEVEL`. The default database is SQLite at `backend/data/astroorbitx.db`; new database files are owner-only. Keep `.env` private. Do not enable SQL echo.

Use the browser to register a local account. Passwords require at least 12 characters. Sessions are opaque, stored by token hash, expire after 12 hours, and use an `HttpOnly`, `SameSite=Lax` cookie; mutations require a session-bound CSRF token and approved `Origin`. Login is rate-limited. Account recovery and email verification are not implemented. Registration returns `404` in production configuration.

## API

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
- `GET /api/v1/me`, `GET/PATCH /api/v1/me/profile`
- `POST/GET /api/v1/me/measurements`, `GET/PATCH /api/v1/me/measurements/{measurement_id}`
- `GET /api/v1/me/trends`
- `GET /api/v1/health`, `GET /api/v1/ready`

Private routes derive the profile from the session and query by owner. Missing and foreign-owned measurement IDs share a sanitized `404`. The `/api/v1/profiles/...` routes are legacy synthetic-only development routes; their repositories exclude real profiles and records. They are disabled in production.

Measurements support heart rate, paired blood pressure, body temperature, blood glucose, and sleep duration. Submitted decimal strings, units, RFC 3339 timestamp offsets, and optional IANA timezone are preserved. Corrections use `PATCH`; no delete endpoint exists. Trends group by UTC day, preserve separate units, and return null aggregates for empty days.

## Migrations and checks

```sh
uv run alembic upgrade head
uv run alembic downgrade base
uv run pytest -q
```

The migration test upgrades a clean SQLite database through head and rolls it back. Request logs contain allowlisted operational metadata only; credentials, tokens, notes, request bodies, and measurement values are not logged.

## Limits

Registration is intended for local use only. Before any remote/public deployment, resolve recovery and abuse operations, account erasure, retention, backup expiry, privacy notice, incident ownership, TLS, encrypted storage/backups, key management, and formal security/legal review. Do not enter shared/demo synthetic records into actual accounts.
