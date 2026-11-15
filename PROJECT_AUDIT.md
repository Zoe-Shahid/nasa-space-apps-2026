# AstroOrbitX Project Audit

> **SUPERSEDED as product-scope guidance (2026-11-15):** this is a dated audit of an earlier implementation and synthetic-only scope. The [current API contract](./API_CONTRACT.md) defines the actual-measurement target. Source-level implementation findings remain historical context, not a reason to block that target.

**Audit date:** 2026-11-14  
**Scope:** Source, tests, configuration, migrations, environment examples, and project documentation in the repository. Generated dependencies, virtual environments, build output, and caches were excluded.

**Contract follow-up:** [`API_CONTRACT.md`](./API_CONTRACT.md) consolidates the existing requirements and proposals into one classified contract baseline. It is authoritative as a requirements/decision register, not as evidence of implemented routes; every unresolved path/schema/rule remains explicitly blocked pending approval.
**Contract review:** [`API_CONTRACT_REVIEW.md`](./API_CONTRACT_REVIEW.md) compares that register with the actual frontend types/adapters, backend proposals, research notes and available design assets, and records mismatches and implementation-ready requirements.

## Executive summary

AstroOrbitX currently has a navigable React research prototype and a FastAPI/SQLAlchemy/Alembic foundation. The backend has versioned health/readiness routes, request/error handling, development OpenAPI, and a schema-only canonical-domain registry. It does **not** have connected authentication, product-data routes, domain-record persistence, or an assessment engine. The frontend no longer contains active demo mode or product fixtures; product-data pages report that their APIs are unavailable rather than showing simulated data.

No application code was changed for this audit. Contract proposals and handoffs are useful records of unresolved work, but are not an approved contract. The approved Screens-2 PDF and a backend OpenAPI specification were not found in the repository.

## 1. Feature status

| Feature | Status | Source evidence and finding |
|---|---|---|
| Operational API foundation | Implemented | [`main.py`](./backend/app/main.py), [`router.py`](./backend/app/api/router.py), and [`health.py`](./backend/app/api/health.py) register `/api/v1` liveness/readiness routes with lifespan-managed database access. This is not a product-data API. |
| Navigation and screen shell | Partial | [`App.tsx`](./frontend/src/App.tsx), [`routes.ts`](./frontend/src/lib/routes.ts), and [`AppShell.tsx`](./frontend/src/components/shell/AppShell.tsx) define the screens and navigation. This is presentation, not evidence that the underlying feature is connected. |
| Authentication and roles | Missing | [`LoginPage.tsx`](./frontend/src/pages/LoginPage.tsx) explicitly reports sign-in unavailable. There is no backend auth route, identity/session model, or authorization dependency. |
| Astronaut selection | Missing | [`CrewPage.tsx`](./frontend/src/pages/CrewPage.tsx) uses a `null` adapter from [`crewApi.ts`](./frontend/src/data/crewApi.ts) and shows backend unavailability. No live crew endpoint exists. |
| Crew profile | Missing | [`CrewProfilePage.tsx`](./frontend/src/pages/CrewProfilePage.tsx) and [`useProfile.ts`](./frontend/src/lib/useProfile.ts) have no connected profile endpoint. |
| Intake | Missing | [`AddDataPage.tsx`](./frontend/src/pages/AddDataPage.tsx) shows an unavailable state; no record forms are mounted or values submitted. Proposed form helpers are not an endpoint or approved schema. |
| Persistence and history | Missing | [`historyApi.ts`](./frontend/src/data/historyApi.ts) retains an unimplemented page dependency shape with a `null` live adapter. No product record is submitted or read; the disconnected entry adapter and form were removed. |
| Overview and assessment | Missing | [`OverviewPage.tsx`](./frontend/src/pages/OverviewPage.tsx), [`AssessmentPage.tsx`](./frontend/src/pages/AssessmentPage.tsx), [`overviewApi.ts`](./frontend/src/data/overviewApi.ts), and [`assessmentApi.ts`](./frontend/src/data/assessmentApi.ts) have no connected product endpoint. No backend evaluator or assessment snapshot exists. |
| Baselines | Missing | Frontend presentation/types do not implement baseline activation or persistence. Backend has no baseline models, routes, or services. |
| Trends | Missing | [`TrendsPage.tsx`](./frontend/src/pages/TrendsPage.tsx) and [`trendsApi.ts`](./frontend/src/data/trendsApi.ts) have no connected aggregation endpoint. |
| Alerts and support lifecycle | Missing | No backend alert/support routes, models, state transitions, or persistence. Research copy is not a notification or responder integration. |
| Exercise records/plans | Missing | No intake or backend domain implementation. References in history/content are not a connected exercise-record feature. |
| Radiation records | Missing | No intake or backend domain implementation. No dose stream, interval validation, or stored radiation record exists. |
| Cross-domain timeline/convergence | Missing | No timeline route, service, model, or connected UI data source exists. |
| Guidance and product limitations | Partial | [`GuidancePage.tsx`](./frontend/src/pages/GuidancePage.tsx) and [`guidance.ts`](./frontend/src/content/guidance.ts) present research and explicit limitations. Content does not implement monitoring rules or constitute an approved clinical/mission protocol. |
| Database/migration foundation | Partial | [`session.py`](./backend/app/db/session.py), [`base.py`](./backend/app/db/base.py), [`domain.py`](./backend/app/models/domain.py), and [`0001_initial_baseline.py`](./backend/migrations/versions/0001_initial_baseline.py) establish lifecycle and a constrained canonical-domain registry. No user, astronaut, observation, or demo rows are created; product record schemas remain blocked. |
| Demo product data | Removed from active frontend | Runtime demo state and product fixtures were removed. [`illustrative.ts`](./frontend/src/fixtures/illustrative.ts) remains used only by the development design-system page and is explicitly layout-only. |

## 2. Frontend routes, forms, and real endpoint connectivity

The route tree in [`App.tsx`](./frontend/src/App.tsx) and [`routes.ts`](./frontend/src/lib/routes.ts) declares:

`/`, `/login`, `/overview`, `/crew`, `/crew/:profileId`, `/add-data`, `/history`, `/assessment`, `/trends`, `/guidance`, `/about`, a development-only `/design-system`, and a wildcard not-found route.

Only operational health/readiness adapters in [`healthApi.ts`](./frontend/src/data/healthApi.ts) call real endpoints through the shared [`http.ts`](./frontend/src/data/http.ts) transport. Product page dependency adapters in [`crewApi.ts`](./frontend/src/data/crewApi.ts), [`overviewApi.ts`](./frontend/src/data/overviewApi.ts), [`assessmentApi.ts`](./frontend/src/data/assessmentApi.ts), [`trendsApi.ts`](./frontend/src/data/trendsApi.ts), and [`historyApi.ts`](./frontend/src/data/historyApi.ts) are `null`; no page calls a product-data endpoint.

| User journey step | Current behavior |
|---|---|
| Landing and sign-in | Landing is public and conceptual. Sign-in explicitly reports unavailable; route access is not protected. |
| Astronaut selection | No connected endpoint; the page reports backend unavailability. |
| Data entry | No input forms or saves are available; record entry reports backend unavailability. |
| Persistence and assessment | No backend write/read or assessment evaluation. No product records or results are fabricated. |
| Dashboard, trends, history | No real query endpoint is connected; product pages report unavailable rather than showing fixtures. |

## 3. Backend routes, models, schemas, and services

- [`main.py`](./backend/app/main.py) creates the FastAPI application/lifespan; generated OpenAPI and docs are available outside production.
- [`router.py`](./backend/app/api/router.py) registers the versioned `/api/v1` router. [`health.py`](./backend/app/api/health.py) exposes `GET /api/v1/health` and database-checking `GET /api/v1/ready`; these are operational probes, not product endpoints.
- [`models/domain.py`](./backend/app/models/domain.py) registers a constrained canonical domain key table; it has no seed rows. Product ORM models, schemas, repositories, and domain services remain absent. The other model/schema/repository/service package shells do not imply product functionality.
- [`middleware.py`](./backend/app/core/middleware.py) implements request IDs and sanitized RFC 9457 error responses; [`logging.py`](./backend/app/core/logging.py) logs only allowlisted request metadata. There is still no authentication or authorization dependency.
- [`health.ts`](./frontend/src/types/health.ts) mirrors the operational OpenAPI. Other frontend types in [`frontend/src/types/`](./frontend/src/types/) are legacy page/view models and do not describe product wire schemas.

## 4. Database and migration state

[`config.py`](./backend/app/core/config.py) validates environment, database URL, log level, and explicit CORS origins; the defaults allow the actual Vite development origins and use an absolute SQLite path under `backend/data/`. [`session.py`](./backend/app/db/session.py) creates/closes app-lifespan sessions and does not commit implicitly; transaction ownership is explicit at the caller. SQLite foreign-key enforcement is enabled.

[`env.py`](./backend/migrations/env.py) imports model metadata before Alembic configuration. Revision [`0001_initial_baseline.py`](./backend/migrations/versions/0001_initial_baseline.py) creates the empty `domain_catalog` table, constrained to the six canonical identifiers. It does not create users, astronauts, observations, or seed rows. No migration is automatically applied during application startup.

## 5. Demo, mock, fixture, and default activation

- The active frontend has no demo-mode state, demo login action, synthetic reviewer identity, or product-data fixtures.
- Product API adapters in [`src/data/`](./frontend/src/data/) are `null`; product-data pages show backend-unavailable states and do not call an endpoint.
- Failed requests remain errors; the generic [`http.ts`](./frontend/src/data/http.ts) transport throws on missing configuration, network failure, non-success HTTP status, and unreadable JSON rather than returning fixture data.
- [`illustrative.ts`](./frontend/src/fixtures/illustrative.ts) is retained only for the development design-system showcase. It is not imported by product pages or adapters and is labelled as illustrative layout content.
- The landing orbit displays the six conceptual domains without a person, observations, status, or assessment result.

## 6. Authentication, authorization, privacy, and validation gaps

- **Authentication/authorization:** no backend auth route, user/session/role model, protected route, or policy check exists. Sign-in is explicitly unavailable; frontend page states do not provide authorization.
- **Privacy:** [`historyModel.ts`](./frontend/src/lib/historyModel.ts) hides values and context for psychological check-in list rows, and requests detail access only through frontend flow. This is presentation behavior, not authorization. Support-request categories do not use the same list-hiding flag. No backend response filtering or audit trail exists to prevent private notes from entering shared timelines, logs, analytics, or generic notifications.
- **Validation:** no product intake form or request schema is active. The shared [`http.ts`](./frontend/src/data/http.ts) transport returns untrusted JSON as `unknown`, and the health adapter validates its response shape; product runtime schemas do not exist because product routes are blocked.
- **Transport:** the shared client handles operational JSON responses, request IDs, RFC 9457 errors, network errors, timeout and caller cancellation. Authentication/session, CSRF, and product-error behavior remain unimplemented because no product operation is approved.
- **Medical/product boundaries:** guidance correctly notes limits on what ordinary wearables, symptoms, and exercise logs can establish. Those notices do not replace backend safeguards or rule validation.

## 7. Contract gaps and conflicting assumptions

There is no approved AX1/OpenAPI source in the repository. [`backend-contract-notes.md`](./frontend/docs/backend-contract-notes.md) and the documents under [`backend/docs/`](./backend/docs/backend-developer-2-handoff.md) record proposals/gaps, not approval. The older [`repository-audit.md`](./frontend/docs/repository-audit.md) and [`testing-and-review.md`](./frontend/docs/testing-and-review.md) describe frontend screens/tests; their claims should not be read as evidence of connected backend behavior.

Specific unresolved or inconsistent assumptions:

1. **Canonical domains:** product requirements use `sleep_fatigue`, `psychological`, and `musculoskeletal`; [`domains.ts`](./frontend/src/lib/domains.ts) maps these to legacy UI keys such as `sleep`, `wellbeing`, and `bone_muscle`. No wire enum is approved.
2. **Status and coverage:** frontend types declare status values and `complete | partial | missing`, but no backend enum or approved coverage semantics exist. Severity and coverage cannot be verified end to end.
3. **Trend metric identifiers:** [`trends.ts`](./frontend/src/types/trends.ts) uses UI keys including `temperature` and `sleep`; the requested contract names `body_temperature` and `sleep_duration`. Range helper/UI behavior does not define the server’s time-boundary contract.
4. **Intake/provenance:** existing vital forms have client fields for source, quality, entry method, context, and timestamp, but no approved schema resolves device/stream identity, freshness, suspect-state handling, or provenance requirements.
5. **Rules:** references to rule IDs occur in proposals and research, but there is no approved executable rules source with exact definitions, values, freshness windows, or status behavior. No thresholds should be inferred from those documents.
6. **Alerts/support:** no canonical alert/support states, acknowledgement/resolution transitions, or external-notification semantics are defined by an implemented API.
7. **Radiation/exercise/timeline:** the proposals themselves identify unresolved field semantics and privacy/contract questions. No record types, units, interval constraints, permissions, or event payloads are authoritative.
8. **Baseline semantics:** no model/route defines reviewer access, pre-mission eligibility, comparability, activation/versioning, or assessment snapshot references.
9. **Product API contract:** the foundation now standardizes `/api/v1`, request IDs, RFC 9457 errors, and development/test OpenAPI. Product route paths, product status mappings, authentication, and domain schemas remain blocked.
10. **Approved visual source:** the requested Screens-2 PDF was not found, so visual conformance to it cannot be independently checked from this repository.

## 8. Tests present versus critical tests missing

**Backend tests present:** [`test_settings.py`](./backend/tests/test_settings.py), [`test_database.py`](./backend/tests/test_database.py), [`test_migrations.py`](./backend/tests/test_migrations.py), and [`test_api.py`](./backend/tests/test_api.py). They cover configuration, session close/explicit commit and rollback, migration from an empty database with no registry rows, startup, health/readiness, CORS, generated OpenAPI, request/error correlation, and log-field allowlisting. They do not cover product endpoints, authentication, authorization, or domain-record behavior.

**Frontend unit tests present:** [`guidance.test.ts`](./frontend/src/content/guidance.test.ts), [`status.test.ts`](./frontend/src/types/status.test.ts), [`errors.test.ts`](./frontend/src/data/errors.test.ts), [`liveApis.test.ts`](./frontend/src/data/liveApis.test.ts), [`BackendNotConnected.test.ts`](./frontend/src/components/BackendNotConnected.test.ts), [`LoginPage.test.ts`](./frontend/src/pages/LoginPage.test.ts), [`historyModel.test.ts`](./frontend/src/lib/historyModel.test.ts), [`overviewDomainCards.test.ts`](./frontend/src/lib/overviewDomainCards.test.ts), [`domains.test.ts`](./frontend/src/lib/domains.test.ts), and [`addDataDomains.test.ts`](./frontend/src/lib/addDataDomains.test.ts). These tests use isolated inputs and do not seed product records.

**Browser QA scripts present:** [`routes-crawl.py`](./frontend/docs/qa/routes-crawl.py) covers public routes and navigation, and [`axe-audit.py`](./frontend/docs/qa/axe-audit.py) covers public/backend-unavailable page states without sample records. They were not run in this audit.

**Critical missing coverage:** authenticated/unauthenticated route behavior; real API/OpenAPI contract conformance; runtime request/response validation; database models and migration round-trips for domain data; authorization/privacy isolation; intake persistence/idempotency; baseline comparability/versioning; trend UTC boundaries/aggregation/stale and suspect exclusion; all six assessment domains and rule cases; alert/support lifecycle; radiation interval and unit validation; exercise reuse; timeline privacy/convergence; and frontend/backend integration from save through history/assessment.

### Checks actually run

| Check | Result |
|---|---|
| Original audit: `/tmp/astroorbitx-uv-bootstrap/bin/uv run --locked pytest` | Passed: 7 tests at that time; superseded by the foundation follow-up below. |
| Original audit: `uv sync --locked` | Passed at that time; dependencies were not changed during the foundation follow-up. |
| Original audit: `alembic heads` and `alembic history` | Passed at that time with an empty baseline; superseded by a real canonical-domain registry migration. |
| Original audit: `python -m compileall -q app migrations tests` | Passed at that time. |
| Follow-up: `cd backend && .venv/bin/pytest -q` | Passed: 24 tests; one deprecation warning from the pinned Starlette/httpx test-client stack. |
| Follow-up: `cd backend && .venv/bin/python -m compileall -q app migrations tests` | Passed after the foundation implementation. |
| Follow-up: temporary empty SQLite `alembic upgrade head` followed by `alembic check` | Passed; initial schema created, no seed rows, and no metadata drift. |
| Follow-up: `cd backend && .venv/bin/alembic heads && .venv/bin/alembic history` | Passed; `0001_initial_baseline` is the sole head. |
| Follow-up: installed runtime package-version comparison with `backend/pyproject.toml` pins | Passed; all six runtime dependencies matched pinned versions. |
| Follow-up: local Markdown links and contract JSON example | Passed; 156 local links resolved and one JSON example parsed. |
| Frontend `npm test` | Passed: 11 test files, 39 tests. Run using temporary Node.js 22.16.0 under `/tmp` because Node/npm were not installed on the default `PATH`. |
| Frontend `npm run typecheck` | Passed using the temporary Node.js 22.16.0 runtime. |
| Frontend `npm run lint` | Passed using the temporary Node.js 22.16.0 runtime. |
| Frontend `npm run build` | Passed: 118 modules transformed; production bundle generated using temporary Node.js 22.16.0. |

No frontend lint/typecheck/build result is claimed. The backend tests cover only the foundation and do not provide backend/frontend product integration coverage.

## 9. Dependency-ordered implementation plan

1. **Approve product AX1/OpenAPI contracts.** Resolve product route names, request/response schemas, access roles, privacy classification, time ranges, and support/alert lifecycle. Foundation `/api/v1`, operational endpoints, request IDs, RFC 9457 errors, and dev/test OpenAPI are already standardized; do not infer product behavior from them.
2. **Implement identity and access control.** Add authenticated identity/session handling, reviewer/crew permissions, protected routes/API dependencies, and privacy-focused authorization tests.
3. **Implement shared domain persistence.** Agree on canonical models and metadata; add repositories, explicit transaction boundaries, migrations, and isolated persistence/integrity tests without runtime seed data.
4. **Implement intake and record queries.** Validate fields, units, provenance, source/device, quality, UTC timestamps, stale/suspect rules, and idempotency on the server; connect intake and history adapters.
5. **Implement only approved baseline, trend, and assessment services.** Do not implement thresholds or status rules until their scientific/product definitions are approved; then snapshot required evidence and ruleset versions and test status/coverage and data-quality cases.
6. **Implement exercise, radiation, alerts, support, and timeline.** Do this only after AX1 confirms record fields, permissions, enums, deduplication, interval semantics, privacy, and external-notification wording; add persistence and lifecycle tests.
7. **Add contract-backed frontend adapters.** Add runtime schema validation, auth/authorization UX, real loading/error/empty states, and ensure the user journey reflects persisted server state.
8. **Run end-to-end verification.** Test generated OpenAPI parity, clean migration startup, save-to-history/assessment flows, privacy boundaries, and browser/accessibility routes; document clean-start commands and only claim checks actually run.

## 10. Audit conclusion

The reliable current deliverable is a research-oriented frontend prototype plus a tested backend foundation. The application is not yet a full-stack product: no product-data API, domain-record implementation, or assessment engine exists. Demo product data has been removed from the active frontend. Contract agreement is the gating dependency before implementing domain behavior.
