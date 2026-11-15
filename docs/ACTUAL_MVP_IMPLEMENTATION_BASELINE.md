# Actual MVP Implementation Baseline

**Historical snapshot:** 2026-11-15, before Phase 3–8 implementation. The runtime details below are superseded and must not be used as current status. See [BACKEND_IMPLEMENTATION_STATUS.md](../BACKEND_IMPLEMENTATION_STATUS.md), [FRONTEND_IMPLEMENTATION_STATUS.md](../FRONTEND_IMPLEMENTATION_STATUS.md), and the [current handoff](ACTUAL_MVP_HANDOFF.md).

## Stack and Structure

- Backend: Python 3.10–3.12, FastAPI 0.115.12, Pydantic 2.11.3, SQLAlchemy 2.0.40, Alembic 1.15.2, Uvicorn 0.34.0. `backend/pyproject.toml` pins these dependencies; no auth package is present.
- Database: SQLAlchemy defaults to a SQLite file at `backend/data/astroorbitx.db`; SQLite foreign keys are enabled. Sessions close without implicit commit; writes use explicit transactions.
- Frontend: React 18, TypeScript 5.6, React Router 6, Vite 6.4.5, Vitest 5.1.0, ESLint 9.39.5.
- Backend organization: `app/api/`, `core/`, `db/`, `models/`, `repositories/`, `schemas/`, and `services/`; migrations use Alembic.
- Frontend organization: `src/pages/`, `components/`, `data/`, `lib/`, `types/`; `src/data/http.ts` is the shared transport.

## Current Runtime

Operational routes:

| Method/path | Behavior |
|---|---|
| `GET /api/v1/health` | Liveness. |
| `GET /api/v1/ready` | Database readiness. |

Legacy product routes, registered only outside `ASTROORBITX_APP_ENVIRONMENT=production`:

| Method/path | Current behavior |
|---|---|
| `GET /api/v1/profiles` | Unauthenticated synthetic profile list. |
| `GET /api/v1/profiles/{profile_id}` | Unauthenticated synthetic profile read. |
| `POST /api/v1/profiles/{profile_id}/observations` | Synthetic heart rate (`bpm`), paired blood pressure (`mmHg`), or body temperature (`°C`). |
| `GET /api/v1/profiles/{profile_id}/observations` | Paginated synthetic vital observations. |
| `POST /api/v1/profiles/{profile_id}/sleep-records` | Synthetic integer-minute sleep record. |
| `GET /api/v1/profiles/{profile_id}/sleep-records` | Paginated synthetic sleep records. |

There is no authentication or authorization implementation. `backend/app/api/router.py` includes health routes; `backend/app/main.py` separately includes the synthetic `product_router` outside production. `LoginPage.tsx` is an unavailable state. There are no user/session models or auth dependencies.

Models and persistence:

- `Profile` in `backend/app/models/profiles.py`: UUID, display name, `is_synthetic=true`, creation time; no owner.
- `VitalObservation`: profile FK, client idempotency UUID, metric-specific float value or systolic/diastolic pair, fixed unit, `measured_at`, source, quality, synthetic flag, `created_at`.
- `SleepRecord`: profile FK, client idempotency UUID, integer `duration_minutes`, `reporting_date`, nap flag, source, quality, synthetic flag, `created_at`.
- `backend/app/schemas/profiles.py` uses strict Pydantic schemas and UTC-normalizes instants; it rejects extra fields and hard-codes synthetic response types and the legacy category/unit set.
- `backend/app/services/records.py` and `backend/app/repositories/records.py` implement transactional create/retry and per-profile lists. Migration `0002_synthetic_local_records` adds the tables, indexes, constraints, and no data. Current Alembic head is `0002_synthetic_local_records`.

Frontend surfaces:

- `CrewPage.tsx`, `CrewProfilePage.tsx`, `AddDataPage.tsx` connect to the legacy synthetic profile/record API through `profilesApi.ts`.
- `LoginPage.tsx` has no login. `OverviewPage.tsx` is presentation-only because `liveOverviewApi` is `null`.
- `TrendsPage.tsx`, `TrendChart.tsx`, and `HeartRateChart.tsx` are presentation components; `liveTrendsApi` is `null`. `historyApi.ts` is a page dependency shape, not a live history endpoint.
- Existing forms preserve empty/error states, validate responses, use idempotency keys, and show success only after backend confirmation. They are explicitly synthetic and must not collect real measurements.

## Decisions and Defaults

The actual-measurement product direction is documented in the current API contract. The 2026-11-15 contract/blocker updates select local implementation defaults: first-party email/password with standard-library `scrypt`; database-backed opaque sessions; one profile per account; user-only record access; cookie/CSRF protections; the `/api/v1/auth/*` and `/api/v1/me/*` target routes; decimal-string values; explicit units; original timestamp/offset/timezone plus normalized UTC; manual source; optional private notes; SQLite for single-host local use; and preservation of old rows as demo data.

These are defaults selected to proceed under the user's direction, not evidence of a separate team vote or external security/legal review. The earlier OIDC-first decision proposal is marked superseded. No auth, new measurement schema, or actual-data API is currently implemented.

Remaining release-only gates: public account verification/recovery and abuse controls; retention/deletion, backup expiry, privacy notice and incident ownership; and TLS/encryption/key/host configuration for remote or multi-instance deployment. Actual data must remain disabled until code-level authentication, authorization, demo isolation, and security tests pass.

## Existing Tests and Checks

Documented commands:

| Area | Command |
|---|---|
| Backend | From `backend/`: `uv run pytest`; migration checks: `uv run alembic upgrade head`, `uv run alembic heads`, `uv run alembic history`. |
| Frontend | From `frontend/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. |

Commands actually run for this baseline:

| Command | Result |
|---|---|
| `backend/.venv/bin/pytest -q` | **Passed: 77 tests**, one Starlette/AnyIO `BlockingPortal` deprecation warning. |
| `backend/.venv/bin/alembic heads && backend/.venv/bin/alembic history` | **Passed**; `0002_synthetic_local_records` is the single head, following `0001_initial_baseline`. |
| `npm run lint && npm run typecheck && npm test && npm run build` from `frontend/` | **Not run**; the command stopped at `npm: command not found`. `node`, `npm`, and `corepack` are unavailable on `PATH`; the previously documented temporary Node runtime was absent. No frontend result is claimed. |

Existing backend security tests in `test_api.py` and `test_profiles_api.py` cover sanitized errors, log-field allowlisting, access-log disablement, and rejection/redaction of private extra fields. They do not test authentication, CSRF, session lifecycle, or cross-user isolation. Frontend status documents report earlier successful checks, but they are historical and were not rerun here.

## Code to Reuse

- `Base`, `build_engine`, `build_session_factory`, `get_session`, and `UTCDateTime` in `backend/app/db/` for ORM metadata, SQLite foreign keys, explicit transactions, and time handling.
- Existing SQLAlchemy `Profile`/record relationships, repositories, record services, strict schemas, idempotency handling, and RFC 9457 handlers as migration/validation patterns; remove synthetic-only constraints only in a new migration and preserve old records as demo.
- `RequestContextMiddleware`, `StructuredLogFormatter`, and current privacy tests for request IDs, allowlisted logging, sanitized errors, and regression coverage.
- Frontend `http.ts`, `profilesApi.ts`, profile mapping/types, form submission/error handling, profile/history screens, and chart components after authenticated actual-data adapters are implemented.

## Implementation Blockers and First Task

The implementation defaults no longer block local coding. The genuine safety gate is code, not another planning decision: the existing routes are unauthenticated and synthetic-only. **First task:** implement the selected user/session/profile-owner foundation and prove unauthenticated denial plus cross-user access denial. Keep actual measurement routes disabled until that foundation and its tests pass. Then migrate the record schemas, add owner-scoped routes, and connect the existing UI. No production real-data release before the stated privacy/deployment gates are met.