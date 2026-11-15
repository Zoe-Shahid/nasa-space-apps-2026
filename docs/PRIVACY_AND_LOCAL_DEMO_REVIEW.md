# Privacy and Local Demo Review

> **HISTORICAL / SUPERSEDED SCOPE (2026-11-15):** this review assesses the former unauthenticated synthetic demo, not the actual-measurement MVP. Its findings describe current/then-current code and must not be interpreted as approval to collect real health data. See [API_CONTRACT.md](../API_CONTRACT.md) and the [current blocker register](../API_CONTRACT_BLOCKERS_AND_DECISIONS.md).

**Review date:** 2026-11-15  
**Scope:** implementation compared with [ASTROORBITX_LOCAL_MVP_DECISIONS.md](./ASTROORBITX_LOCAL_MVP_DECISIONS.md). This is a local-demo review, not a production security assessment or a claim of regulatory compliance.

## Summary

Most of the requested boundaries are implemented: the documented server command binds loopback, production omits product routes and OpenAPI, login is unavailable, product responses mark records synthetic on the server, startup does not seed data, errors/logs are sanitized, CORS is explicit without credentials, and the runtime product surface is limited to the approved six operations.

One material limitation remains: **the service cannot technically verify that user-entered measurements are synthetic.** The approved create schemas accept arbitrary positive manual readings and the explicit provisioning command accepts a caller-supplied display name. The API server marks accepted rows `is_synthetic: true` regardless. Existing warnings prohibit real data, but warnings and labels cannot detect or prevent a caller from entering real-person measurements or names. Do not use this service with real personal or health data. Resolving this limitation requires an approved synthetic-data source or a contract change; no unapproved fields, clinical bounds, or guessed values were added.

## Findings and fixes

| Area | Finding | Action / status |
|---|---|---|
| Login | The landing header used a “Sign in” action even though there is no authentication. The destination explained that login was unavailable, but the action label could imply a working login. | Changed the header and unauthorized-error link to “Authentication unavailable”; the page now explicitly says there is no sign-in, account, session, or protected-data workflow and tells users not to enter credentials. Added regression coverage. |
| Assessment wording | Legacy guidance described “student-prototype parameters,” and a legacy domain component described a “Normal” rule interpretation, despite assessment and numerical rules being out of scope. | Replaced those claims with explicit statements that assessment and numerical rules are not implemented or calculated. Added a rendered-page regression test. |
| Synthetic-input guarantee | `manual` observation/sleep requests accept values supplied by the caller, while the provisioning command accepts a free-form display name. The API does not have evidence that these values are synthetic. | **Unresolved residual risk.** The existing API contract has no safe way to prove a value is synthetic. A runtime restriction would require a separately approved data source or contract change. |

## Control-by-control audit

- **Local binding:** `backend/README.md` starts Uvicorn with `--host 127.0.0.1`; Uvicorn's default host is also `127.0.0.1` (covered by a regression test). The ASGI application itself cannot prevent an operator from overriding the server bind address. Never use a public bind.
- **Authentication and login:** no backend auth/account/session routes or tables are present. Product routes are not registered in production. The UI provides only an authentication-unavailable explanation, not a credential form or demo identity.
- **Personal health data:** request schemas reject extra identity/private-note fields and do not accept `is_synthetic`; server models/services set it to `true`. However, see the unresolved synthetic-input limitation above: the implementation cannot distinguish real from synthetic measurements or names.
- **Synthetic status and seeding:** profile provisioning is an explicit CLI command, disabled in production, and creates only one profile. Startup does not seed data or apply migrations. Empty-database behavior is tested.
- **Private fields, logs, and projections:** no check-in, psychological-note, symptom narrative, or support fields exist in the included models/schemas or projections. Validation errors do not echo submitted values; structured logs use an allowlist and omit request bodies, values, exception text, and arbitrary log-record fields. Tests cover private extra-field rejection and log redaction.
- **OpenAPI and excluded operations:** test-environment runtime OpenAPI contains only health, readiness, and the six approved profile/observation/sleep operations. Assessment, trends, support, alerts, radiation, auth, and other excluded operations are not registered. Production has no OpenAPI/docs and returns 404 for the six product operations.
- **Errors and request IDs:** errors use sanitized RFC 9457 Problem Details; response `X-Request-ID` matches the body `request_id`. Valid UUID request IDs are preserved and invalid IDs are replaced. Regression tests cover validation and unhandled errors without echoing private values.
- **CORS:** origins are explicit HTTP(S) origins; wildcard/path/invalid origins are rejected. Default development origins are loopback-only, production defaults to no origins, and `allow_credentials` is false. An operator can configure another explicit origin, so deployment configuration still matters.
- **Support and external delivery:** there is no support endpoint, queue, acknowledgement, dispatch, or delivery claim. UI content explicitly says support delivery is not connected.
- **NASA and clinical claims:** the persistent notice says the prototype is not NASA-endorsed and is not a diagnosis or treatment system. Guidance references are presented as research sources, not endorsement. No clinical thresholds or executable assessment rules are implemented; inaccurate legacy rule wording was removed.

## Residual risks and operating limits

1. Synthetic status is a server-controlled label, not a provenance check. Manual values and profile display names cannot be proven synthetic from the current payloads. Treat the application and database as unsuitable for real personal or health data.
2. Loopback-only operation is a server-launch/configuration requirement, not a network sandbox. A custom ASGI server or bind override can expose the service.
3. This review does not establish production security, privacy-policy adequacy, NASA approval, clinical validity, or regulatory compliance.

## Exact validation commands and results

Commands were run from the workspace root unless the command changes directory.

| Command | Result |
|---|---|
| `backend/.venv/bin/python -m pytest backend/tests -q` | **77 passed**, 1 existing Starlette/AnyIO deprecation warning. Covers production route disablement, exact runtime OpenAPI paths, error sanitization, request IDs, logging redaction, CORS, empty startup state, synthetic response labeling, and private-field rejection. |
| `cd frontend && PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm test -- --run` | **68 passed** across 16 test files. |
| `cd frontend && PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run typecheck` | Passed. |
| `cd frontend && PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run lint` | Passed. |
| `cd frontend && PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run build` | Passed; Vite transformed 121 modules. |

The `uv` executable was not available on `PATH` in this review environment; backend tests were run using the existing `backend/.venv`.
