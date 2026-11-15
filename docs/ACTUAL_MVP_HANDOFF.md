# AstroOrbitX Actual-MVP Handoff

**Reviewed:** 2026-11-15. This handoff records the implemented local MVP, not production readiness, clinical validation, or NASA endorsement.

## Implemented

- First-party account registration/sign-in with `scrypt` password hashing, normalized email, opaque DB-backed sessions, 12-hour expiry, logout revocation, per-account/address login throttling, and cookie/CSRF/Origin protections. Registration is disabled in production configuration.
- One self-owned profile per account with view/edit.
- Create and owner-scope read/correction for heart rate, paired blood pressure, body temperature, blood glucose, and sleep duration. Values and units are explicit; submitted RFC 3339 offsets and optional IANA timezone are retained. Blood pressure is atomic. No measurement delete route exists.
- Category/date filters, paged history, a persisted-record dashboard, and UTC daily descriptive trends. Trend series remain split by unit and blood-pressure component; empty days have null aggregates and are not interpolated.
- Legacy `/api/v1/profiles/...` routes remain synthetic-only in development and cannot list or access actual accounts/records. No synthetic measurements are seeded into real accounts.
- RFC 9457 sanitized errors, request IDs, allowlisted logs, and owner-only permissions on newly created SQLite database files.

## Architecture

The backend uses FastAPI, Pydantic, SQLAlchemy, and Alembic. Authentication and self-service routes are in `backend/app/api/auth.py`; measurement/trend routes and service logic are in `backend/app/api/measurements.py` and `backend/app/services/measurements.py`. Existing vital and sleep tables store records, and migration `0003_actual_mvp_persistence` adds user/session ownership and actual-data fields. The frontend is React/TypeScript/Vite; `src/data/http.ts` sends cookies and CSRF headers, while `authApi.ts` and `measurementsApi.ts` validate API responses. The active routes use personal profile, entry, dashboard, history, and trends pages.

## Setup

Prerequisites: Python 3.10–3.12, `uv`, Node.js 20+ and npm. From the repository root:

```sh
cd backend
cp .env.example .env
uv sync --locked
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

In a second terminal:

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev -- --host 127.0.0.1
```

The frontend example sets `VITE_API_BASE_URL=http://127.0.0.1:8000`. Keep the frontend/backend hostnames consistent. Backend variables are `ASTROORBITX_APP_ENVIRONMENT`, `ASTROORBITX_DATABASE_URL`, `ASTROORBITX_CORS_ORIGINS`, and `ASTROORBITX_LOG_LEVEL`. Do not put secret values in shared docs or commit local env files.

The default database is SQLite under `backend/data/`; migrations are explicit and do not run at startup. New DB files use mode `0600`. Host-level disk encryption and encrypted backups are not provisioned by this application.

## Local Demo

1. Start the backend and frontend using the commands above.
2. Open the Vite URL and create a local account with a normalized email, display name, and password of at least 12 characters.
3. Use Profile to edit the display name.
4. Record each category with its required explicit unit and measured-at local time. Blood pressure requires both values. The saved message appears only after server confirmation.
5. Refresh, then inspect the dashboard, filtered History, and Trends. Empty states reflect server responses; no demo readings are added to the account.
6. Sign out and sign back in to verify session restoration and persisted records.

For isolated synthetic legacy testing only, the development CLI can provision a synthetic profile; those routes are separate from `/api/v1/me/...` and cannot expose actual-user records.

## Verification Results

| Check | Result |
|---|---|
| Backend full suite: `cd backend && .venv/bin/pytest -q` | **94 passed**, 1 existing Starlette/AnyIO `BlockingPortal` deprecation warning. |
| Clean SQLite migration upgrade and downgrade | **Passed** in `tests/test_migrations.py::test_initial_migration_upgrade_and_downgrade`. |
| Auth, login/session rotation, CSRF, profile correction, cross-user access, legacy-route isolation, five-category payloads, filters, corrections, trends, timestamps and units | **Passed** in `tests/test_auth_api.py` (17 tests total, included in the full suite). |
| Frontend editor diagnostics | No errors reported for `frontend/src`. |
| Frontend lint, typecheck, unit tests, production build | **Not run**: `node`, `npm`, and `corepack` are not available in this environment. Installed `node_modules` does not provide an executable runtime. |
| Browser end-to-end/accessibility flow | **Not run**: unavailable without Node/browser tooling. Backend API tests cover registration through persistence and cross-user denial; they do not substitute for browser E2E. |

The backend warning is a dependency deprecation, not a failing test. No production-readiness claim is made.

## Privacy and Safeguards

- Passwords, session tokens, CSRF tokens, measurement values, private notes, and request bodies must not be logged. Logging tests verify the allowlisted formatter; do not enable SQL echo or body logging.
- Actual-user queries are derived from the session and constrained by owner. Unknown and foreign-owned measurement IDs return the same sanitized `404`. Legacy synthetic queries filter `is_synthetic=true`.
- Submitted values, units, and timestamp representations are preserved; the application does not silently convert units or infer missing values.
- The UI reports recorded data only. It makes no diagnosis, risk prediction, treatment recommendation, or normal/abnormal classification.
- Synthetic data is confined to tests or explicitly provisioned legacy demo profiles. Never seed synthetic readings into actual accounts or use shared demo credentials.

## Known Gaps and Release Gates

- No account recovery, email verification, account deletion, retention schedule, backup expiry, privacy notice, or incident-response process.
- Public registration is disabled in production configuration, but local registration and deployment controls have not received formal abuse/security review.
- No formal security audit, legal/privacy review, clinical validation, or remote deployment hardening. SQLite is for a single-host local setup; remote/multi-instance use requires approved PostgreSQL, TLS, encryption/key management, backup, trusted proxy, and CORS configuration.
- Frontend tests/build and browser E2E remain unverified in this environment. Install Node/npm and run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before demo handoff.
- Do not collect public or production real-health data until these gaps are resolved. AstroOrbitX is not NASA-endorsed and is not a medical device.