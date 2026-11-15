# Contract Migration Report

**Date:** 2026-11-15  
**Scope:** Documentation and contract changes only. No application code, tests, dependencies, migrations, or runtime behavior were changed.

## Outcome

[`API_CONTRACT.md`](../API_CONTRACT.md) is now the sole authoritative target contract for the actual-measurement MVP. It requires authenticated user accounts, owner-scoped profiles and actual measurements, persistent private history, a saved-measurement dashboard, historical trends, and descriptive summaries. Exact API paths/schemas that are not implemented remain explicitly proposed/TBD; no existing route is represented as an actual-data endpoint.

The current application remains the unauthenticated synthetic-only prototype. It is not safe for actual health data. This warning is retained as an implementation fact, not as the product's intended scope. Do not enter real health information until the required security and data controls have been implemented and verified.

## Documents Inspected

The repository-wide Markdown inventory/search covered all 31 Markdown documents, including:

- Root contract, blockers, audit, baseline, README, and backend/frontend implementation-status documents.
- All files under `docs/`, including the local-MVP decisions, human-review list, feature matrix, OpenAPI checklist, API reference, end-to-end report, privacy review, and prior actual-MVP gap plan.
- `backend/README.md` and all seven `backend/docs/` proposals/handoffs.
- `frontend/README.md` and all three frontend contract/audit/testing documents.
- `yasha research.md` and `zoeya-research.md`.

The search also covered Python and frontend source/test comments and current route/schema implementation, including `backend/app/main.py`, API routes, models, schemas, record services, migration `0002_synthetic_local_records`, and frontend profile/history/trend adapters and pages.

## Documents Updated

Current authority and onboarding:

- [`API_CONTRACT.md`](../API_CONTRACT.md)
- [`API_CONTRACT_BLOCKERS_AND_DECISIONS.md`](../API_CONTRACT_BLOCKERS_AND_DECISIONS.md)
- [`README.md`](../README.md)
- [`backend/README.md`](../backend/README.md)
- [`frontend/README.md`](../frontend/README.md)

Current-code status and dated audit context:

- [`BACKEND_IMPLEMENTATION_STATUS.md`](../BACKEND_IMPLEMENTATION_STATUS.md)
- [`FRONTEND_IMPLEMENTATION_STATUS.md`](../FRONTEND_IMPLEMENTATION_STATUS.md)
- [`PROJECT_AUDIT.md`](../PROJECT_AUDIT.md)
- [`WORK_BASELINE.md`](../WORK_BASELINE.md)
- [`docs/ACTUAL_MVP_GAP_PLAN.md`](ACTUAL_MVP_GAP_PLAN.md)

Explicitly superseded or historical contract, decision, test, privacy, proposal, and research material:

- [`API_CONTRACT_IMPLEMENTATION_ADDENDUM.md`](../API_CONTRACT_IMPLEMENTATION_ADDENDUM.md)
- [`API_CONTRACT_REVIEW.md`](../API_CONTRACT_REVIEW.md)
- [`docs/ASTROORBITX_LOCAL_MVP_DECISIONS.md`](ASTROORBITX_LOCAL_MVP_DECISIONS.md)
- [`docs/HUMAN_REVIEW_REQUIRED.md`](HUMAN_REVIEW_REQUIRED.md)
- [`docs/LOCAL_MVP_FEATURE_MATRIX.md`](LOCAL_MVP_FEATURE_MATRIX.md)
- [`docs/OPENAPI_IMPLEMENTATION_CHECKLIST.md`](OPENAPI_IMPLEMENTATION_CHECKLIST.md)
- [`docs/IMPLEMENTATION_API_REFERENCE.md`](IMPLEMENTATION_API_REFERENCE.md)
- [`docs/END_TO_END_TEST_REPORT.md`](END_TO_END_TEST_REPORT.md)
- [`docs/PRIVACY_AND_LOCAL_DEMO_REVIEW.md`](PRIVACY_AND_LOCAL_DEMO_REVIEW.md)
- [`backend/docs/assessment-engine-contract-proposal.md`](../backend/docs/assessment-engine-contract-proposal.md)
- [`backend/docs/backend-developer-2-handoff.md`](../backend/docs/backend-developer-2-handoff.md)
- [`backend/docs/backend-developer-2-rules-proposal.md`](../backend/docs/backend-developer-2-rules-proposal.md)
- [`backend/docs/baseline-trend-contract-proposal.md`](../backend/docs/baseline-trend-contract-proposal.md)
- [`backend/docs/data-intake-contract-proposal.md`](../backend/docs/data-intake-contract-proposal.md)
- [`backend/docs/exercise-radiation-alert-contract-gaps.md`](../backend/docs/exercise-radiation-alert-contract-gaps.md)
- [`backend/docs/timeline-integration-contract-gaps.md`](../backend/docs/timeline-integration-contract-gaps.md)
- [`frontend/docs/backend-contract-notes.md`](../frontend/docs/backend-contract-notes.md)
- [`frontend/docs/repository-audit.md`](../frontend/docs/repository-audit.md)
- [`frontend/docs/testing-and-review.md`](../frontend/docs/testing-and-review.md)
- [`yasha research.md`](../yasha%20research.md)
- [`zoeya-research.md`](../zoeya-research.md)

No useful document was deleted or moved. Former contracts and reports are marked `SUPERSEDED` or `HISTORICAL` in place and link to the current contract. No documents were newly archived to a separate directory.

## Restrictions Replaced

- Replaced the synthetic-only product definition with a requirement for actual measurements entered by authorized users.
- Replaced “no authentication/accounts/roles” and “no real data” as product scope with required registration/authentication, server-side ownership, and private access controls.
- Replaced out-of-scope history, dashboard, trends, and summaries with required owner-scoped history, saved-measurement dashboard, historical charts, and descriptive summaries.
- Established required categories and units: heart rate (`bpm`), paired blood pressure (`mmHg`), temperature (`°C` or `°F`), glucose (`mg/dL` or `mmol/L`), and sleep duration (hours/minutes).
- Required each record to preserve owner, category, submitted value(s), explicit unit, measurement timestamp/timezone, optional source/method and note, plus creation/update timestamps.
- Required sensitive-data log redaction, demo/real data isolation, and no fabricated readings, clinical thresholds, diagnoses, predictions, or treatment advice.
- Preserved useful technical conventions: FastAPI/Pydantic/SQLAlchemy/Alembic and React/TypeScript/Vite, `/api/v1`, explicit transactions, RFC 9457 errors, request IDs, strict validation, UTC normalization, and allowlisted logging where compatible with preserving submitted timezone/value data.

## Superseded Documents

The former local addendum, local-MVP decision record, feature matrix, human-review list, API review/reference, synthetic OpenAPI checklist, prior audits, local end-to-end/privacy reports, and backend/frontend proposal notes remain available for historical implementation details. Each now points to [`API_CONTRACT.md`](../API_CONTRACT.md) and states that its synthetic-only exclusions are not active product policy. Existing route examples in them describe the legacy code only.

## Remaining Decisions

The active blocker register identifies decisions that still need product, API, security, or privacy approval:

- Identity provider or credential model, registration verification/reset, password storage/hash policy, session/token lifecycle and transport, CSRF if cookie-based, and abuse controls.
- Account-to-profile ownership, profile creation/reassignment/deletion behavior, and unauthorized-resource disclosure policy.
- Exact wire schemas, types/precision, timestamp/timezone storage, sleep-duration representation, allowed source/method values, optional-note limits, and mutation/correction semantics.
- Whether to retain an additional normalized value alongside the original value/unit; the original submission must never be silently converted or discarded.
- History/dashboard paths or composition, filters, pagination, sorting, note visibility, trends date boundaries, aggregation/rounding, data-quality handling, and empty/insufficient-data representation.
- Retention, deletion/export, audit, TLS, encryption/key management, backups, incident response, and production privacy notice.
- Explicit demo-account/data isolation and 401/403/404, rate-limit, and idempotent-retry policies.

These are implementation decisions, not blockers to whether the MVP supports real measurements, authentication, private history, trends, or summaries.

## Unresolved Implementation Contradictions

Because this task is documentation-only, the legacy source-level synthetic restrictions remain in place and are intentionally not edited:

- `backend/app/models/profiles.py` and `backend/migrations/versions/0002_synthetic_local_records.py` enforce `is_synthetic=true`; current schemas in `backend/app/schemas/profiles.py` only accept the legacy metric/unit subset.
- `backend/app/main.py` registers product routes only outside production; no authentication, identity, or owner-authorization code exists.
- `backend/app/cli.py`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/AddDataPage.tsx`, `frontend/src/pages/CrewPage.tsx`, `frontend/src/pages/CrewProfilePage.tsx`, and `frontend/src/components/shell/PrototypeNotice.tsx` still implement or describe the synthetic-only flow.
- `frontend/src/data/historyApi.ts` and `frontend/src/data/trendsApi.ts` still state that corresponding routes do not exist; current history/trend presentation is not connected to actual-data APIs.
- Existing tests assert current prototype wording and synthetic constraints. They remain valid tests of current code, not acceptance tests for the actual-MVP direction.

These are unresolved implementation gaps, not contradictory contract authority. The current runtime must not be used for real health data until the application is implemented against the new contract and security tests verify owner isolation and privacy controls.

## Verification

- Repeated repository-wide searches over Markdown and source comments after the edits. Remaining synthetic-only restrictions in documents are inside clearly superseded/historical material or are explicit warnings about current runtime behavior. Remaining source/test matches correspond to the unchanged legacy implementation described above.
- Editor diagnostics reported no errors for the edited Markdown files that were checked.
- No application tests, builds, or migrations were run; this change is documentation-only.
- `git diff --check` was unavailable because this workspace is not a Git repository (the command returned exit code 129).