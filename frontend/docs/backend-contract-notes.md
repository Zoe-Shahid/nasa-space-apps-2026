# Frontend/backend contract notes

> **SUPERSEDED as API authority (2026-11-15):** this document describes frontend integration with the former synthetic-only API. The [root API contract](../../API_CONTRACT.md) is authoritative. Route references below are current-code facts, not the actual-MVP API specification.

At the time this note was written, the [local synthetic prototype addendum](../../API_CONTRACT_IMPLEMENTATION_ADDENDUM.md) described the connected product API below. It has been superseded by the [actual-measurement API contract](../../API_CONTRACT.md); the route table is retained as a current-code snapshot only. The backend runtime OpenAPI is generated from the existing routes and schemas.

## Connected product operations

| Method and path | Frontend surface |
|---|---|
| `GET /api/v1/profiles?limit=20&offset=0` | Profile list at `/crew`; the adapter pages through the exact `{items, limit, offset}` response. |
| `GET /api/v1/profiles/{profile_id}` | Profile detail at `/crew/:profileId`. |
| `GET /api/v1/profiles/{profile_id}/observations` | Profile detail lists vital observations. |
| `POST /api/v1/profiles/{profile_id}/observations` | Add Data submits heart rate, blood pressure, or body-temperature observation. |
| `GET /api/v1/profiles/{profile_id}/sleep-records` | Profile detail lists sleep-duration records. |
| `POST /api/v1/profiles/{profile_id}/sleep-records` | Add Data submits sleep duration. |

`src/types/profiles.ts` declares the snake_case wire request/response types, and `src/data/profilesApi.ts` validates successful payloads and calls the routes through the shared HTTP client. Lists use the contract default limit/offset and return the exact `items`, `limit`, `offset` shape. Vital input timestamps are converted to UTC instants; sleep reporting dates remain UTC calendar dates. `client_record_id` is stable across an unchanged retry. Backend-confirmed persistence is required before the UI displays success.

The supported record fields are fixed by the addendum: metric-specific vital values and exact units (`heart_rate`/`bpm`, `blood_pressure`/`mmHg`, `body_temperature`/`°C`), `measured_at`, source (`manual` or `simulated_device`), and quality (`valid`, `suspect`, or `invalid`); sleep uses positive integer `duration_minutes`, `reporting_date`, `includes_naps`, source, and quality. Forms start with no measurement values. All pages and forms identify this as synthetic/local-only and warn against real personal or health data.

## Shared HTTP and failure behavior

`src/data/http.ts` is the only frontend module that calls `fetch`. It validates `VITE_API_BASE_URL`, appends the contract paths, sends an `X-Request-ID`, omits cookie credentials, maps sanitized RFC 9457 Problem Details/field errors to `ApiError`, and supports abort/timeout. It does not retry, log, or fall back to fixtures. Validation and network failures leave form values available for correction/retry. Duplicate in-flight submits are blocked.

The profile UI reads only approved profile and record data. It does not infer a clinical state, calculate assessments, or create combined history. Login remains unavailable: no account, identity, session, or credentials are created.

## Still unavailable

Authentication, accounts, credentials, roles, profile mutation, check-ins/scales/notes, symptoms/diagnoses, support, exercise, radiation, assessment/rules, baselines, trends, alerts/notifications, and combined history have no connected API. Their UI surfaces must remain explicit unavailable states; no success-shaped placeholders or local/fixture fallbacks are allowed. A body-temperature observation is not a symptom or diagnosis; sleep duration is not sleep quality or fatigue.

The product API is a local synthetic prototype, not production-secure, NASA-endorsed, clinically validated, or medical guidance. Do not enter real personal or health data. The backend disables product routes in production; local development documentation binds to `127.0.0.1`.
