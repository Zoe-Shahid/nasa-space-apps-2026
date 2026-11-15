# Actual-Measurement MVP Gap Plan

**Historical audit date:** 2026-11-15. **This snapshot predates Phase 3–8 implementation and is superseded.** Its gap statuses below are not current implementation facts. See [BACKEND_IMPLEMENTATION_STATUS.md](../BACKEND_IMPLEMENTATION_STATUS.md), [FRONTEND_IMPLEMENTATION_STATUS.md](../FRONTEND_IMPLEMENTATION_STATUS.md), and the [current handoff](ACTUAL_MVP_HANDOFF.md).

## Gap List

| Requirement | Status | Existing implementation and gap |
|---|---|---|
| Registration and authentication | **MISSING** | No identity/session models, authentication dependencies, or auth routes exist in `backend/app/api/` or `backend/app/core/`; [`LoginPage.tsx`](../frontend/src/pages/LoginPage.tsx) is an unavailable state. The contract now selects first-party email/password, scrypt, and database-backed sessions as implementation defaults. |
| Secure profile ownership | **MISSING** | [`Profile`](../backend/app/models/profiles.py), `GET /api/v1/profiles`, and `GET /api/v1/profiles/{profile_id}` are synthetic workspace resources with no user owner or authorization. The contract now selects one profile per account and server-derived owner scope; the model and checks remain unimplemented. |
| Manual entry of all required measurements | **PARTIAL** | [`AddDataPage.tsx`](../frontend/src/pages/AddDataPage.tsx) and [`profilesApi.ts`](../frontend/src/data/profilesApi.ts) submit synthetic heart rate, paired blood pressure, °C temperature, and sleep duration through `POST /api/v1/profiles/{profile_id}/observations` and `POST /api/v1/profiles/{profile_id}/sleep-records`. Glucose and actual-user ownership are absent. |
| Units, timestamps, provenance, notes, and record metadata | **PARTIAL** | [`VitalObservation`](../backend/app/models/profiles.py), [`SleepRecord`](../backend/app/models/profiles.py), and [`profiles.py`](../backend/app/schemas/profiles.py) preserve selected values, units, UTC measurement instant for vital readings, source/quality, and `created_at`. Gaps: °F, glucose units, sleep hours, retained submitted offset/timezone, optional note, `updated_at`, correction semantics, and actual ownership. Sleep currently uses `reporting_date`, not a measurement timestamp. |
| Persistent database storage | **PARTIAL** | [`Profile`](../backend/app/models/profiles.py), [`VitalObservation`](../backend/app/models/profiles.py), [`SleepRecord`](../backend/app/models/profiles.py), and migration [`0002_synthetic_local_records.py`](../backend/migrations/versions/0002_synthetic_local_records.py) persist data with explicit transactions in [`services/records.py`](../backend/app/services/records.py). Constraints require synthetic rows; there is no user foreign key or glucose model. Startup is empty. |
| Private, user-specific measurement history | **PARTIAL** | `GET /api/v1/profiles/{profile_id}/observations` and `GET /api/v1/profiles/{profile_id}/sleep-records` provide paginated synthetic lists shown by [`CrewProfilePage.tsx`](../frontend/src/pages/CrewProfilePage.tsx). No authenticated owner scope or cross-user authorization exists. The contract now defines `GET /api/v1/me/measurements`; it is not implemented. |
| Dashboard of saved measurements | **PARTIAL** | [`OverviewPage.tsx`](../frontend/src/pages/OverviewPage.tsx) and its reading/chart components provide a presentation surface, but [`overviewApi.ts`](../frontend/src/data/overviewApi.ts) exports `liveOverviewApi = null`; no saved actual measurements load. |
| Historical trend charts | **PARTIAL** | [`TrendsPage.tsx`](../frontend/src/pages/TrendsPage.tsx), [`TrendChart.tsx`](../frontend/src/components/trends/TrendChart.tsx), and [`HeartRateChart.tsx`](../frontend/src/components/overview/HeartRateChart.tsx) are UI components. [`trendsApi.ts`](../frontend/src/data/trendsApi.ts) exports `liveTrendsApi = null`; there is no trend route, aggregation service, or live chart data. The contract now defines inclusive UTC day ranges (maximum 31 days), per-unit daily aggregates, null gaps, and no interpolation; implementation is absent. |
| Descriptive summaries | **MISSING** | The UI has presentation types/components for backend summaries, but there is no summary/trend API or backend aggregation implementation. The contract selects daily count/min/max/mean, null aggregates on empty days, and no interpolation; implementation is absent. |
| Missing, stale, invalid, and insufficient data distinguished | **PARTIAL** | Schemas store `valid`, `suspect`, and `invalid` quality labels; no stale-data policy or live aggregation consumes them. No health status should be inferred. |
| Sensitive-data handling and no medical claims | **PARTIAL** | [`core/logging.py`](../backend/app/core/logging.py) uses allowlisted request logging, and validation errors are sanitized. Current fields lack private notes, but authentication and owner authorization are absent. Backend record routes apply no clinical thresholds; actual-data privacy is not yet established. |
| No fabricated readings; isolated demo data | **PARTIAL** | The database starts empty and [`app/cli.py`](../backend/app/cli.py) explicitly provisions synthetic profiles only; UI warns that current data is synthetic. The new contract permits isolated demos, but no account-level demo isolation exists. |
| Verification coverage | **PARTIAL** | Backend tests: `backend/tests/test_profiles_api.py`, `test_persistence.py`, `test_migrations.py`, `test_api.py`. Frontend tests: `frontend/src/data/profilesApi.test.ts`, `frontend/src/pages/AddDataPage.test.ts`, `frontend/src/data/liveApis.test.ts`, and `frontend/src/pages/connectedScreens.integration.test.ts`. No authentication, cross-owner denial, actual-data, glucose, alternate-unit, owner-history, live trend, or summary tests exist. |

## Historical Contract Decisions (Superseded)

The former synthetic-only addendum is superseded. The defaults in the current [API contract](../API_CONTRACT.md) resolve the local implementation questions. The following list is a historical snapshot of questions that were open before those defaults were selected; it is not an active blocker list.

- Identity/session mechanism, account registration and recovery policy, account-to-profile ownership, and 401/403/404 disclosure behavior.
- Exact wire schemas, numeric precision, original timestamp/timezone representation, sleep-duration representation, allowed source/method values, optional-note limits, and update/correction/retention semantics.
- Whether a normalized comparison value may accompany the original submitted value/unit; silent conversion or loss is prohibited.
- Owner-scoped history/dashboard routes or composition, pagination, trend date boundaries, aggregation/rounding, quality/staleness handling, and empty/insufficient-data representation.
- Production deployment, TLS, encryption/key management, backups, audit/retention, and privacy controls before real-data release.

The target routes and schemas are defined in [`API_CONTRACT.md`](../API_CONTRACT.md) but are not implemented. Existing synthetic endpoints are repository facts only and must not be used for actual data.

## Readiness Check (2026-11-15)

Local implementation can proceed under the documented defaults. Do not enable actual-data reads or writes until authentication, owner authorization, migrations, demo isolation, and security tests are complete. The first implementation task is the user/session/profile-owner foundation with cross-user denial tests. The target auth and `/api/v1/me/...` routes and schemas are defined in `API_CONTRACT.md` §§2–5 but are not yet implemented. The following descriptions of paths/schemas as TBD and the old “approve and record” checklist are historical audit text, not active approval gates.

The independent log-redaction safeguard is already implemented in [`logging.py`](../backend/app/core/logging.py), and private extra fields are rejected without being echoed or logged. Focused existing tests were run:

```sh
cd backend
.venv/bin/pytest -q tests/test_api.py::test_structured_log_formatter_omits_unapproved_record_fields tests/test_profiles_api.py::test_private_extra_fields_are_not_echoed_or_logged
```

Result: **2 passed**, with one existing Starlette/AnyIO `BlockingPortal` deprecation warning. No application code was changed in this task.

### Measurement schema implementation status

**Status: NOT IMPLEMENTED.** The current contract selects defaults for the previously open schema choices; no model or migration was added in this documentation update. The observations below describe implementation gaps, not approval blockers:

The statements below that call fields or policies “unapproved” are preserved from the initial audit date. Their implementation defaults are now selected in `API_CONTRACT.md`; remaining runtime work is not blocked by those earlier unknowns.

- `Profile` has no owner; the user/account model and account-to-profile cardinality are unapproved. The migration cannot add a trustworthy owner FK before that decision.
- `UTCDateTime` normalizes to UTC and loses the submitted offset. The contract requires preserving timezone information, but the original-offset/named-timezone storage representation is not approved.
- `SleepRecord` stores integer `duration_minutes` and `reporting_date`, not an explicit hours/minutes unit plus a measured-at timestamp. The required duration and timestamp semantics are unresolved.
- Existing numeric fields use `Float`; exact decimal precision/storage is unapproved. Source/method values, optional-note limits, and correction/update history are also unresolved.
- Current models and migration enforce `is_synthetic=true`. The account/profile/record rule that separates actual users from demo data must be approved before changing those constraints or migrating existing rows.
## Historical Contract Decisions (Superseded)
Implement the selected schema defaults in `API_CONTRACT.md`; preserve old rows as demo data and do not seed measurements into actual accounts.

### Measurement API implementation status
### Measurement API implementation status

**Current contract status:** `API_CONTRACT.md` §§2–5 now define the target auth and `/api/v1/me/...` routes and schemas. They are not yet implemented. The old blocker description, approval checklist, and proposed/TBD statements below record the initial audit state only and are superseded for local implementation.
The actual-data API is also not specified sufficiently to implement without invention. `API_CONTRACT.md` §5 lists registration, profile, measurement, dashboard, and trend operations as required but paths and wire schemas as proposed/TBD. §7 leaves the identity/session, ownership, measurement schema, history filters, date boundaries, and error/access policy unresolved. The current blocker register confirms these choices are awaiting approval.

Before implementing the requested create/list/filter/detail API, approve and record:

- The authentication mechanism and how a validated principal is supplied to FastAPI; the current repository has no authentication to reuse.
- Canonical methods/paths and request/response fields for create, owner-scoped collection, and single-record reads. No paths are inferred here.
- Category and date filter names, timestamp/date interpretation and range boundaries, pagination/sort behavior, and whether inaccessible IDs return `403` or indistinguishable `404`.
- Owner-to-profile mapping and server-side authorization rule for every operation.
- Exact per-category value/unit representation, numeric precision, measured-at/timezone preservation, sleep duration semantics, optional source/method and note policy, and server timestamp fields.
- Synthetic/demo isolation and migration treatment for existing rows before relaxing the `is_synthetic=true` constraints.

After those approvals, implement authentication and owner enforcement before exposing measurement writes; then add the approved measurement schemas, migration, routes, and cross-user tests. Do not mount the current synthetic routes under an assumed auth scheme or call them actual-data APIs.

## Current Implementation Plan

1. Implement user/session/profile ownership with first-party `scrypt` authentication, secure cookie/CSRF handling, and unauthenticated/cross-user denial tests.
2. Add the user/profile/session migration and actual measurement schemas for all five categories, preserving existing records as demo data.
3. Implement authenticated create/list/filter/detail/correction routes from `API_CONTRACT.md` and test value/unit/timezone validation, ownership, idempotency, and sanitized errors.
4. Connect owner-scoped history and dashboard reads to the existing frontend components.
5. Implement daily descriptive trends/summaries and connect the charts; preserve gaps and avoid clinical inference.
6. Run migration, backend/frontend, security, and end-to-end gates before enabling actual data. Production release gates remain in `API_CONTRACT_BLOCKERS_AND_DECISIONS.md`.

### Historical plan before defaults were selected

1. **Resolve contract decisions.** Approve identity/session, ownership, measurement timestamp/unit/value schema, mutation/privacy policy, and trend aggregation details in the existing contract and blocker register.
2. **Add identity and owner enforcement.** Extend the current FastAPI/Pydantic/SQLAlchemy/Alembic stack with account/profile ownership, authentication dependencies, server-derived owner scope, and cross-user denial tests.
3. **Migrate actual measurement persistence.** Extend record schemas/models/repositories for all five categories and required units/metadata; preserve submitted values/units/timezone and add update/correction semantics only as approved.
4. **Implement private reads and derived views.** Add owner-scoped history, dashboard composition, descriptive trend/summary services, and tests for quality, missing data, UTC boundaries, and privacy.
5. **Connect and verify the frontend.** Wire existing forms/pages/charts through validated API adapters; run migrations, backend/frontend tests, and save-to-history/trend authorization checks. Keep demos isolated and do not claim medical interpretation.

## Stack and Checks

The existing stack is FastAPI 0.115.12, Pydantic 2.11.3, SQLAlchemy 2.0.40, Alembic 1.15.2, React 18, TypeScript 5.6, and Vite 6.4.5. Existing routes are rooted at `/api/v1`; backend conventions use Pydantic strict schemas, SQLAlchemy repositories/services, explicit transactions, and Alembic migrations. Frontend API calls use the shared HTTP adapter and typed response parsing.

No tests or builds were run for this documentation-only audit. Existing implementation-status documents report prior test/build results for the synthetic prototype; those historical results do not verify actual-MVP authentication, authorization, privacy, measurement categories, trends, or summaries.