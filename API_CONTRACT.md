# AstroOrbitX API Contract

**Status:** authoritative requirements and API behavior contract for the actual-measurement MVP.  
**Direction approved:** 2026-11-15. **Implementation status:** the local authenticated APIs and frontend workflows are implemented; current evidence and limitations are tracked in [backend status](./BACKEND_IMPLEMENTATION_STATUS.md), [frontend status](./FRONTEND_IMPLEMENTATION_STATUS.md), and the [handoff](./docs/ACTUAL_MVP_HANDOFF.md).  
**Contract identifier:** AX1. This revision supersedes all previous synthetic-only/local-MVP contract decisions.  

## 1. Product Scope and Safety

AstroOrbitX is to support authorized users entering and reviewing their own actual health measurements. This is a health-data management MVP, not a clinically validated medical device, diagnostic tool, treatment system, or NASA-approved product. It must not invent clinical thresholds, diagnose, predict disease, prescribe treatment, or imply NASA approval. Descriptive summaries report recorded values and changes only.

**MVP implementation defaults selected 2026-11-15:** first-party email/password accounts using Python's standard-library `hashlib.scrypt`; database-backed opaque sessions in secure cookies; one personal profile per user; a single `user` role with no staff access to health records; SQLite for a single-host MVP and tests; and the paths and schemas specified in §5. These are implemented locally using the existing stack. They are not a separate external security review.

The local implementation now provides authentication, owner-scoped actual-data persistence, privacy-safe logging, and verification tests. It has not had a browser end-to-end run or formal security/privacy review in this environment. Do not expose it publicly or treat it as production-ready. Keep actual-data use limited to an isolated local setup until deployment, retention, recovery, backup, and review gates are resolved.

Synthetic records remain permitted only in clearly labelled testing/demo accounts or isolated test environments. Synthetic and real records must be distinguishable and must never be silently mixed in one user's actual-record views, summaries, or trends.

## 2. Required MVP Capabilities

The API and application are required to support:

1. User registration and authentication, with an approved credential/session lifecycle.
2. Secure user profiles associated with the authenticated owner.
3. Manual creation of actual measurements, with server-side validation.
4. Persistent database storage and private, owner-scoped measurement history.
5. A dashboard displaying the signed-in user's saved measurements.
6. Historical trend charts and basic descriptive summaries derived from that user's recorded measurements.

The initial authentication and operation defaults are:

- Register with a normalized email and password. Store a versioned salted `scrypt` password hash only; do not require external identity/email infrastructure for the first single-host MVP. Require at least 12 password characters and cap input at 256 characters. Password recovery and email verification are not in the initial API; the service is not an open public registration service until an abuse/recovery policy is added.
- Store opaque, randomly generated session tokens server-side by token hash. Set a 12-hour session cookie named `astroorbitx_session`; use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` outside loopback development. Rotate on login and revoke on logout/expiry. Require a session-bound CSRF token and validate the request `Origin` for state-changing cookie-authenticated requests.
- Each account owns exactly one profile. The only application role is `user`; there is no reviewer, support, or administrator access to health records in this MVP. Operations staff do not receive record-reading routes.
- Authenticated “me” routes derive the user and profile from the session. A supplied measurement ID is only a selector and never grants ownership.

Every private operation requires authentication. The server derives ownership from the authenticated principal, never from a browser-supplied owner ID alone. Every read and mutation must enforce owner scope and prevent cross-user access. Synthetic/demo access, if enabled, must use an explicitly isolated and visibly labelled account/data scope.

## 3. Measurement Data Requirements

Supported categories and accepted units are requirements:

| Category | Values | Units |
|---|---|---|
| Heart rate | One numeric value | `bpm` |
| Blood pressure | Systolic and diastolic as one reading | `mmHg` |
| Body temperature | One numeric value | `°C` or `°F` |
| Blood glucose | One numeric value | `mg/dL` or `mmol/L` |
| Sleep duration | A duration | Hours and/or minutes, explicitly represented |

Each persisted measurement must retain its owning user, category, submitted value(s), explicit unit, measurement timestamp and timezone, source/method when available, optional note, and server-generated creation and update timestamps. Preserve the submitted value, unit, and timestamp representation; do not silently convert units, round away submitted precision, or discard timezone information. Blood pressure is an atomic pair. An optional source/method or note must remain absent/null when not supplied rather than be fabricated.

Request and response schemas must reject malformed values, invalid unit/category pairings, missing blood-pressure components, and unknown fields where strict schemas are used. Exact numeric precision/ranges must not be used to imply clinical thresholds. Do not introduce any clinical cutoffs.

Wire and storage defaults: values use decimal-string JSON fields to preserve entered decimal digits; server validation parses finite `Decimal` values without clinical ranges. All measurement values and durations must be greater than zero; this is a basic data-shape check, not a health threshold. `measured_at` is an RFC 3339 timestamp with an explicit UTC offset; optional `time_zone` is an IANA zone name. Preserve the submitted timestamp string, offset, and optional zone, and also store a normalized UTC instant for ordering. Sleep `value` is the entered duration and `unit` is `h` or `min`; `measured_at` is when the user records the duration, not an inferred sleep interval.

Manual entry sets server-controlled `source` to `manual`. No device/import source is accepted in the initial MVP. `note` is optional, plain text, and limited to 2,000 characters; it is private record content and is never included in logs. `created_at` is server-generated and immutable; `updated_at` is server-generated on correction. Category is immutable after creation. Corrections use `PATCH`; no measurement delete endpoint is included in the initial API.

## 4. Authentication, Authorization, and Privacy

- `POST /api/v1/auth/register` and `POST /api/v1/auth/login` establish a session; `POST /api/v1/auth/logout` revokes it; `GET /api/v1/me` returns the authenticated user and profile. Password hashes use versioned `scrypt`; passwords, session tokens, and CSRF tokens are never logged or returned.
- All private routes require a live session. Store a unique `profiles.user_id` foreign key. Derive owner scope from the session; ignore/reject request-supplied owner IDs and set server-managed IDs/timestamps.
- Apply authorization at the API/service and repository query boundary. A user can only create, list, read, and correct measurements attached to their own profile. An unknown or another user's measurement ID returns the same sanitized `404` Problem Details response.
- Cookie-authenticated state-changing requests require a valid session-bound `X-CSRF-Token` and same-origin `Origin`; production cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`. CORS credentials are limited to explicit development origins; production uses same-origin hosting by default.
- Protect credentials and health data in transit and at rest using deployment-appropriate security controls. Keep secrets out of URLs and client-visible errors.
- Never log passwords, tokens, measurement values, private notes, or request bodies containing health data. Log only allowlisted operational metadata and sanitized errors.
- Preserve existing rows as demo/synthetic. `is_synthetic` is server-controlled and derived from the profile mode; demo profiles are not attached to real users and actual-user queries explicitly exclude synthetic rows. No synthetic readings are seeded into real accounts.
- Use SQLite for the documented single-host MVP and local tests, with restricted file permissions and encrypted host storage/backups. A multi-instance deployment requires PostgreSQL on the existing SQLAlchemy/Alembic stack and deployment review; it is not an application framework change.
- Initial account deletion and backup retention require an operational policy before public deployment. This does not block local schema/API implementation. No record delete endpoint is exposed; users can correct their own records.

The application must clearly distinguish missing, stale, invalid, and insufficient data. These states must not be represented as zero or as a normal/healthy conclusion. Staleness and data-quality rules require approval; until then, report recorded data descriptively without health-status inference.

## 5. API Inventory and Implementation Truth

The following paths are present in the current repository. Product paths currently implement the old synthetic-only prototype and are **not** authorized for real data as-is:

| Current operation | Current behavior |
|---|---|
| `GET /api/v1/health` | Operational liveness. |
| `GET /api/v1/ready` | Operational database readiness. |
| `GET /api/v1/profiles` | Unauthenticated synthetic profile list. |
| `GET /api/v1/profiles/{profile_id}` | Unauthenticated synthetic profile read. |
| `POST /api/v1/profiles/{profile_id}/observations` | Synthetic-only heart rate, blood pressure, or °C body-temperature record. |
| `GET /api/v1/profiles/{profile_id}/observations` | Synthetic-only paginated vital-observation list. |
| `POST /api/v1/profiles/{profile_id}/sleep-records` | Synthetic-only sleep duration in integer minutes. |
| `GET /api/v1/profiles/{profile_id}/sleep-records` | Synthetic-only paginated sleep-record list. |

The following target routes and schemas are implemented in the local runtime; generated OpenAPI is the source of current wire behavior. Account registration is available in development/test and returns `404` in production configuration.

| Required operation | Contract status |
|---|---|
| `POST /api/v1/auth/register` | JSON `{email, password, display_name}`; creates a user, one profile, and session. Returns `201` with `{user, profile}` and sets the session/CSRF cookies. Email is normalized lowercase; duplicate email is a generic `409`. |
| `POST /api/v1/auth/login` | JSON `{email, password}`; success `200` with `{user, profile}` and rotated cookies. Invalid credentials return generic `401`. Login attempts are rate-limited by account and client address. |
| `POST /api/v1/auth/logout` | Authenticated, CSRF-protected; revokes the session and returns `204`. |
| `GET /api/v1/me` and `GET/PATCH /api/v1/me/profile` | Authenticated self profile. Profile fields are `id`, `email`, `display_name`, `created_at`, `updated_at`; profile ownership is immutable. |
| `POST /api/v1/me/measurements` | Authenticated manual create. Request fields: `client_record_id` UUID, `category`, `value` or paired `systolic`/`diastolic` decimal strings, `unit`, RFC 3339 `measured_at`, optional `time_zone`, optional `note`. Server sets owner, `source=manual`, `is_synthetic=false`, IDs, and timestamps. Returns `201`; identical idempotent retry returns `200`, changed payload with the same key returns `409`. |
| `GET /api/v1/me/measurements` | Authenticated owner-only collection. Optional `category`, `from` inclusive and `to` exclusive RFC 3339 instants; `limit` default 50/max 100 and `offset` default 0. Ordered by measured UTC instant descending then ID descending. Response `{items, limit, offset}`. |
| `GET /api/v1/me/measurements/{measurement_id}` | Authenticated owner-only read; missing and non-owned IDs both return sanitized `404`. |
| `PATCH /api/v1/me/measurements/{measurement_id}` | Authenticated, CSRF-protected owner correction. Category cannot change; value fields remain atomic by category; `updated_at` changes. No delete route. |
| `GET /api/v1/me/trends` | Authenticated owner-only daily descriptive series; query `category`, `from`, `to` UTC calendar dates inclusive, maximum 31 days. Returns one series per unit to avoid implicit conversion; blood-pressure systolic/diastolic are separate series. Each day has count, min, max, and mean; empty days have count 0 and null aggregates; no interpolation. |

Dashboard data is composed by the frontend from `/api/v1/me`, measurements, and trends; no separate dashboard endpoint is needed. The route list above is the target contract only. Existing `/api/v1/profiles/...` routes remain unauthenticated synthetic-only legacy routes and must not be repurposed for actual data.

Measurement list items contain `id`, `category`, category-specific decimal-string value fields, `unit`, original `measured_at`, optional `time_zone`, `source`, optional `note`, `is_synthetic`, `created_at`, and `updated_at`. The blood-pressure response includes both values and no scalar `value`. `PATCH` returns the same record shape. Trend response includes inclusive `from`/`to` dates, category/unit-labelled series, and daily aggregates as decimal strings or null.

Common errors use RFC 9457 Problem Details with `request_id`, `X-Request-ID`, sanitized detail, and validation `errors` that never echo inputs. Statuses include `401` missing/invalid session; `404` missing or non-owned record; `409` duplicate idempotency key with changed payload; `422` malformed fields, units, timestamps, or filters; and `429` login rate limit. Legacy `/api/v1/profiles/...` routes remain unauthenticated but repository queries expose synthetic profiles only; they cannot read or write actual-user data.

## 6. Preserved Technical Conventions

Retain the existing stack and useful foundation decisions unless a security review requires a change:

- FastAPI and `/api/v1`, Pydantic strict request/response validation, SQLAlchemy persistence, Alembic migrations, and the existing React/TypeScript/Vite frontend.
- Explicit transaction ownership; the database session dependency must not commit writes implicitly.
- RFC 9457 `application/problem+json` errors, request correlation via `X-Request-ID`, sanitized validation messages, and no echoed submitted values.
- Timezone-aware instants; UTC normalization is useful for comparisons and ordering, but must not replace retention of the user's submitted offset/timezone and value representation.
- Allowlisted structured logging with health values, credentials, tokens, and private notes excluded.
- Existing source/unit/value-shape validation where compatible; remove synthetic-only constraints when implementing actual user-owned records. Do not convert validation into clinical interpretation.

## 7. Remaining Release Gates

The API paths, core schemas, auth model, ownership model, and collection/trend behavior above are implementation defaults selected under the actual-MVP direction. They are not claims of implemented behavior. Keep only the following deployment/policy gates open:

| Decision | Required resolution |
|---|---|
| Public deployment and account recovery | Before internet exposure, choose email verification/recovery delivery and abuse controls. The initial local MVP has no email/reset service and should not be exposed as an open public registration service. |
| Retention, deletion, and backups | Approve user account deletion, retention schedule, backup expiry, incident response, and privacy notice before production collection. These do not block local implementation. |
| Hosted deployment | If operating multiple instances or remote users, approve PostgreSQL hosting, TLS termination, encrypted volumes/backups, key management, and trusted proxy/CORS settings. |
| Audit/legal review | Confirm applicable privacy notice, jurisdictional obligations, and security audit requirements before public release. |

These release gates do not block local implementation. The local service is not production-ready until they are resolved and a formal security/privacy review is completed.

---

## SUPERSEDED: Historical AX1 and Local Synthetic Contract

Everything below this heading is retained for traceability only. It records the previous synthetic-only prototype contract and proposals and is **not active authority**. If it conflicts with §§1–7 above, §§1–7 and the current [API_CONTRACT_BLOCKERS_AND_DECISIONS.md](./API_CONTRACT_BLOCKERS_AND_DECISIONS.md) take precedence. Historical route/schema examples do not authorize actual health-data access.

**Historical status:** superseded on 2026-11-15 by the actual-measurement MVP direction.

> The following material contains old decisions and references, including the formerly approved synthetic addendum. Do not use it to block the actual-MVP requirements above.

> **Local MVP decision record:** See [docs/ASTROORBITX_LOCAL_MVP_DECISIONS.md](./docs/ASTROORBITX_LOCAL_MVP_DECISIONS.md) for the complete route schemas and decision rationale, [docs/LOCAL_MVP_FEATURE_MATRIX.md](./docs/LOCAL_MVP_FEATURE_MATRIX.md) for capability availability, and [docs/OPENAPI_IMPLEMENTATION_CHECKLIST.md](./docs/OPENAPI_IMPLEMENTATION_CHECKLIST.md) for route acceptance criteria.
>
> **Human review:** [docs/HUMAN_REVIEW_REQUIRED.md](./docs/HUMAN_REVIEW_REQUIRED.md) lists exact decisions and safe defaults required before restoring excluded capabilities. These reviews do not block the `RESOLVED_FOR_LOCAL_MVP` operations.

### D-01–D-23 local MVP status map

| Decision | Status | Decision | Status |
|---|---|---|---|
| D-01 | RESOLVED_FOR_LOCAL_MVP | D-13 | OUT_OF_SCOPE_FOR_LOCAL_MVP |
| D-02 | RESOLVED_FOR_LOCAL_MVP | D-14 | RESOLVED_FOR_LOCAL_MVP |
| D-03 | RESOLVED_FOR_LOCAL_MVP | D-15 | OUT_OF_SCOPE_FOR_LOCAL_MVP |
| D-04 | RESOLVED_FOR_LOCAL_MVP | D-16 | OUT_OF_SCOPE_FOR_LOCAL_MVP |
| D-05 | RESOLVED_FOR_LOCAL_MVP | D-17 | OUT_OF_SCOPE_FOR_LOCAL_MVP |
| D-06 | RESOLVED_FOR_LOCAL_MVP | D-18 | OUT_OF_SCOPE_FOR_LOCAL_MVP |
| D-07 | OUT_OF_SCOPE_FOR_LOCAL_MVP | D-19 | RESOLVED_FOR_LOCAL_MVP |
| D-08 | OUT_OF_SCOPE_FOR_LOCAL_MVP | D-20 | RESOLVED_FOR_LOCAL_MVP |
| D-09 | OUT_OF_SCOPE_FOR_LOCAL_MVP | D-21 | RESOLVED_FOR_LOCAL_MVP |
| D-10 | OUT_OF_SCOPE_FOR_LOCAL_MVP | D-22 | RESOLVED_FOR_LOCAL_MVP |
| D-11 | OUT_OF_SCOPE_FOR_LOCAL_MVP | D-23 | RESOLVED_FOR_LOCAL_MVP |
| D-12 | OUT_OF_SCOPE_FOR_LOCAL_MVP |  |  |

These are scope/contract decisions for the local synthetic MVP, not assertions of separate team, API-owner, scientific, clinical, NASA, or production-security approval. No decision is `STILL_BLOCKED` for the declared MVP; excluded capabilities remain unavailable.

This file consolidates the requirements and proposals in [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md), [`frontend/docs/backend-contract-notes.md`](./frontend/docs/backend-contract-notes.md), and the backend documents listed in [Source register](#1-source-register). Proposals remain unapproved except where §16 and the linked addendum explicitly resolve or exclude them. The addendum records user approval for a prototype scope; it does not assert independent team or scientific review.

## 1. Source register

| Source | Status / use in this contract |
|---|---|
| [`API_CONTRACT_IMPLEMENTATION_ADDENDUM.md`](./API_CONTRACT_IMPLEMENTATION_ADDENDUM.md) | User-approved local synthetic prototype scope and exact wire contract for the currently supported product operations; supersedes conflicting blocked/proposed AX1 language only within that scope. |
| [`docs/IMPLEMENTATION_API_REFERENCE.md`](./docs/IMPLEMENTATION_API_REFERENCE.md) | Runtime-to-contract comparison for the six operations; its open questions are closed for this scope by the linked local MVP decision record, without implying implementation or broader approval. |
| [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md) | Historical foundation inventory from before addendum approval; its product-operation blockers are superseded only for the addendum-defined local synthetic scope. |
| [`frontend/docs/backend-contract-notes.md`](./frontend/docs/backend-contract-notes.md) | Current frontend integration status for the supported local synthetic operations and explicit unsupported-operation list. |
| [`frontend/docs/repository-audit.md`](./frontend/docs/repository-audit.md) | Earlier route/design decision log. Its `GET /astronauts`, `/astronauts/:id/...`, and flat-route/query notes conflict with other assumptions and are not an approved API contract. |
| [`frontend/docs/testing-and-review.md`](./frontend/docs/testing-and-review.md) | Frontend behavior/privacy claims and latest local test results; browser/accessibility checks are separately noted as not run. |
| [`backend/docs/backend-developer-2-handoff.md`](./backend/docs/backend-developer-2-handoff.md) | Existing DB/session convention and unapproved intake/sync proposal summary. |
| [`backend/docs/data-intake-contract-proposal.md`](./backend/docs/data-intake-contract-proposal.md) | Proposed intake fields, semantics, idempotency, privacy, and delayed-sync states. Not approved. |
| [`backend/docs/backend-developer-2-rules-proposal.md`](./backend/docs/backend-developer-2-rules-proposal.md) | Product vocabulary, metadata concepts, DEMO1 constraints, and service proposal. Not an approved ruleset. |
| [`backend/docs/assessment-engine-contract-proposal.md`](./backend/docs/assessment-engine-contract-proposal.md) | Requested assessment shape and rule-definition blockers. Not approved OpenAPI or rule configuration. |
| [`backend/docs/baseline-trend-contract-proposal.md`](./backend/docs/baseline-trend-contract-proposal.md) | Baseline/trend requirements and candidate semantics. Not an approved endpoint/schema. |
| [`backend/docs/exercise-radiation-alert-contract-gaps.md`](./backend/docs/exercise-radiation-alert-contract-gaps.md) | Exercise, radiation, and alert blockers; no implemented wire fields or states. |
| [`backend/docs/timeline-integration-contract-gaps.md`](./backend/docs/timeline-integration-contract-gaps.md) | Timeline/privacy/integration blockers; no route spelling or wire fields proposed. |
| [`frontend/src/types/`](./frontend/src/types/) and [`frontend/src/data/`](./frontend/src/data/) | `health.ts`/`healthApi.ts` mirror operational routes; `profiles.ts`/`profilesApi.ts` implement the addendum-defined profile and synthetic record wire contract. Other product-oriented models/interfaces remain presentation-only. |
| [`zoeya-research.md`](./zoeya-research.md) and [`yasha research.md`](<./yasha research.md>) | Research and proposed product context only. They are not API/ruleset approval and provide no authorized numerical thresholds, freshness windows, or executable protocol. |
| User product requirements captured in the audit/history | Confirmed product-level semantics are marked **CONFIRMED** below; no absent route, rule, scale, threshold, or role has been inferred. |

## 2. Classification and authority

- **CONFIRMED BY EXISTING REQUIREMENT**: explicitly required product behavior or fixed vocabulary. It is not necessarily implemented.
- **PROPOSED BUT NOT APPROVED**: a source document or frontend type suggests the item, but AX1 has not approved it.
- **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE**: a transport/serialization convention selected here to avoid incompatible implementations; it does not decide clinical, scientific, privacy-policy, or product behavior.
- **BLOCKED: REQUIRES PRODUCT/SCIENTIFIC OWNER APPROVAL**: cannot be completed without a policy, scientific value, permission decision, or API-owner choice. No implementation may guess it.

Where an item has both a confirmed semantic and a proposed spelling, those are called out separately. This document does not silently promote a frontend/proposal name to an approved wire field.

## 3. Technical protocol conventions

This section preserves the pre-addendum foundation and product proposals. For the declared local synthetic MVP, the approved addendum and linked local decision record supersede any conflicting `BLOCKED` or `PROPOSED` labels here for the six included product operations only. Outside that scope, the historical blocked/proposed classifications remain in force.

| Concern | Standard |
|---|---|
| API base path/version | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE (approved for the foundation)**: register API routers under `/api/v1`. Product route paths and breaking-change policy remain **BLOCKED**. AX1 remains a contract label, not a wire version. |
| Route style | **BLOCKED**: plural nouns, nesting, and action route conventions are candidates, not approved paths. |
| Wire format | UTF-8 JSON is a safe format candidate; **BLOCKED**: `snake_case` is not established by existing wire schemas. React interfaces use camelCase but are explicitly proposals. Canonical domain identifiers are confirmed; metric aliases still require an agreed mapping. |
| Success envelope | **BLOCKED**: no existing envelope or response wrapper is defined. Do not wrap response payloads until the API owner selects one. |
| Error envelope | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE (approved for the foundation)**: errors use `application/problem+json` per RFC 9457 with `type`, `title`, `status`, `detail`, and `request_id`. Validation errors additionally have `errors: [{field, code, message}]`; `field` is dot-separated FastAPI location, and messages never echo submitted values. This does not select product-specific status-code mappings. |
| Request correlation | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE (approved for the foundation)**: accept `X-Request-ID` only when it parses as a UUID (normalize its representation), otherwise generate a UUID; return it on success and error responses and in structured request logs. |
| CORS | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE (approved for the foundation)**: development/test defaults are the Vite origins `http://localhost:5173` and `http://127.0.0.1:5173`; production defaults to no cross-origin allowlist. Origins are environment-configurable, explicit HTTP(S) origins only, and credentials are disabled. |
| OpenAPI publication | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE (approved for the foundation)**: generate OpenAPI from actual FastAPI routes and schemas; expose docs/OpenAPI outside production and disable them in production. Product API publication policy beyond this foundation remains **BLOCKED**. |
| Authentication transport | **BLOCKED**: bearer-header, cookie, identity provider and credential routes are not selected in source. Never place secrets in URLs. |
| Session/token handling | **BLOCKED**: in-memory token storage, reload behavior, refresh, expiration, and mutation retry policies are not specified. |
| CSRF | **BLOCKED / conditional**: select CSRF protections if cookie-based authentication is chosen. Do not infer the authentication mechanism from this note. |
| IDs | UUID for the proposed `client_record_id` is in the intake proposal. **BLOCKED**: server resource ID type/version is not specified. Keep idempotency identifier separate from resource ID if the owner approves idempotency. |
| Idempotency | **PROPOSED BUT NOT APPROVED**: intake proposal names body field `client_record_id` (UUID), says same canonical payload returns original record and changed payload conflicts, and proposes HTTP 409. Do not replace it with an `Idempotency-Key` header without API-owner approval. Scope, retention, payload canonicalization, and affected create routes are **BLOCKED**. |
| Validation | Atomic validation before writes and no partial persistence are requirements. **BLOCKED**: status codes, error path format, stable codes, and exact envelope are unapproved. No measurement bounds/scales are implied. |
| Pagination | **PROPOSED BUT NOT APPROVED**: frontend history types request `limit`/`offset`, `total`, newest-first. **BLOCKED**: defaults, maximum, tie-break order, applicability to all lists, and route query names. |
| UTC instants | **CONFIRMED BY EXISTING REQUIREMENT**: client timestamps include a timezone and normalize to UTC; output/display uses UTC. RFC 3339 is a safe serialization candidate; exact syntax/precision and accepted offset forms remain **BLOCKED**. |
| UTC dates | **CONFIRMED BY EXISTING REQUIREMENT** for daily trends: UTC calendar dates, daily grouping, inclusive date range semantics. `YYYY-MM-DD` is the current frontend representation. |
| Filtering | **CONFIRMED BY EXISTING REQUIREMENT**: trend `from`/`to` are inclusive UTC dates; at most 31 dates. **PROPOSED BUT NOT APPROVED**: history `from` inclusive and `to` exclusive UTC instants. Do not apply trend boundaries to history or vice versa. |
| Transactions | **CONFIRMED BY EXISTING BACKEND CONVENTION**: `get_session()` closes without implicit commit; writes use explicit transaction scopes. |
| Logging | **CONFIRMED BY EXISTING REQUIREMENT**: private notes must not enter logs or generic notifications. Exact audit/log fields and retention remain **BLOCKED**. |

## 4. Canonical vocabulary and data-quality rules

| Item | Classification | Contract rule |
|---|---|---|
| Canonical domains | **CONFIRMED BY EXISTING REQUIREMENT** | Exactly `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, `radiation`. Frontend aliases `sleep`, `wellbeing`, and `bone_muscle` are not valid wire identifiers. |
| Assessment status | **CONFIRMED BY EXISTING REQUIREMENT** | `normal`, `attention`, `urgent`, `insufficient_data`. Do not map unknown statuses to `normal`. |
| Coverage | **CONFIRMED BY EXISTING REQUIREMENT** | Coverage is an independent dimension and must not be derived from or merged into severity/status. |
| Coverage enum | **BLOCKED: REQUIRES PRODUCT/SCIENTIFIC OWNER APPROVAL** | The frontend and proposal suggest `complete`, `partial`, `missing`; wording and exact approved enum are unresolved. Do not treat this suggestion as settled. |
| `normal` semantics | **CONFIRMED BY EXISTING REQUIREMENT** | No configured demonstration condition triggered with sufficient current, valid inputs; never a medical determination, clearance, or claim of health/safety. |
| Missing/quality semantics | **CONFIRMED BY EXISTING REQUIREMENT** | Missing, stale, suspect, or incomplete data must not silently become zero or `normal`; missing chart values are null/gaps, never interpolated. Exact freshness policy is blocked. |
| Numeric urgent | **CONFIRMED BY EXISTING REQUIREMENT** | No numerical rule produces `urgent`. Urgent is reserved for an explicitly defined immediate-help/support event under an approved contract. |
| Demo/synthetic scope | **CONFIRMED BY EXISTING REQUIREMENT** | All demo records are fictional and visibly labelled synthetic/demo. AstroOrbitX is not a medical device, diagnostic/treatment tool, radiation-protection system, or NASA-endorsed product. |
| Wire naming | **BLOCKED: REQUIRES API OWNER APPROVAL** | The six canonical domain identifiers are fixed; metric wire spelling and legacy alias rejection need an explicit schema before implementation. |
| Data quality enum | **PROPOSED BUT NOT APPROVED** | Intake proposal uses `valid`, `suspect`. The required exclusion semantics are confirmed, but the enum, additional flags, and assignment authority are not. |
| Provenance concepts | **CONFIRMED BY EXISTING REQUIREMENT** | Records and evidence must expose provenance/quality where supported by AX1. Exact field names and allowed values are unapproved. |
| Evidence references | **CONFIRMED BY EXISTING REQUIREMENT** | Assessment reasons and permitted timeline markers reference evidence IDs. Evidence resource ID type, linkage, and visibility rules are **BLOCKED**. |

## 5. Authentication, roles, and astronaut-scope authorization

For the local synthetic MVP, authentication and role-based authorization are explicitly absent as described in §16 and the linked decision record. The following table preserves the broader AX1 requirements and proposals for any future shared or non-synthetic deployment; it does not add authentication endpoints or capabilities to the MVP.

| Operation/capability | Required role/scope | Classification / rule |
|---|---|---|
| Authenticate and obtain access token | Unspecified | **BLOCKED**: identity provider, sign-in/token path, credential lifecycle, and identity fields are absent. No auth endpoint is defined here. |
| List profiles | Reviewer assigned to the profile(s) | **PROPOSED BUT NOT APPROVED** from `CrewApi`; assignment must be enforced server-side. Exact list scope/filter blocked. |
| Read a profile and its shared data | Reviewer assigned to that astronaut | **PROPOSED BUT NOT APPROVED**; 403-versus-404 policy and profile disclosure are unresolved. |
| Create/activate a baseline | Reviewer-only | **CONFIRMED BY EXISTING REQUIREMENT**. Reviewer identity and scope enforcement mechanism remain blocked. |
| Create synthetic exercise plan | Reviewer | **CONFIRMED BY EXISTING REQUIREMENT**; whether the reviewer must be assigned to that profile is blocked. |
| Submit exercise completion log | Crew member for own profile | **CONFIRMED BY EXISTING REQUIREMENT** at capability level; crew identity/session model is blocked. |
| Create/read ordinary observations, check-ins, symptoms | Unspecified | **BLOCKED**: no confirmed role mapping or profile-scope policy. |
| Read private psychological/check-in/support detail | Explicitly authorized caller only | **CONFIRMED BY EXISTING REQUIREMENT**: private notes/details are excluded from general lists, crew-wide views, generic notifications, analytics and logs. Which roles can obtain detail is blocked. |
| Acknowledge/resolve alerts or support requests | Unspecified | **BLOCKED**: actor permissions and transitions are not defined. |
| Access another astronaut's resource | Deny unless explicit assignment/permission | **CONFIRMED BY EXISTING REQUIREMENT** in effect: enforce authorization and do not trust a client-selected astronaut ID to grant access. Exact assignment policy is blocked. |

For a future authenticated deployment, no endpoint may trust a browser-supplied `astronaut_id` as authorization; the server must derive or validate scope from the authenticated principal. The local MVP has no authenticated principal or authorization grant, and `profile_id` is only a synthetic resource selector.

## 6. Shared field dictionary

The table records common and proposed fields. “Source” names the requirement/proposal that introduced the concept. **TBD** means blocked, not an invitation to guess. Privacy labels: `public` = non-sensitive metadata; `crew-private` = astronaut-associated health/context; `restricted` = private psychological/support/free text; `internal` = server-only.

| Field | Type / requiredness | Unit / timestamp meaning | Privacy | Validation / domain | Source and classification |
|---|---|---|---|---|---|
| `id` | Type/requiredness **BLOCKED** | N/A | crew-private for health records | Server-assigned identity is expected for persisted records; exact format/stability policy is not specified | Frontend proposed types use string IDs; server ID format is not confirmed. |
| `astronaut_id` | Type, spelling, and path/query placement **BLOCKED** | N/A | crew-private | Must be within caller's authorized scope; exact authorization policy blocked | Existing frontend types call this `astronautId`; no approved wire field exists. |
| `is_synthetic` | Boolean; required on demo records | N/A | public metadata | Demo records are true; assignment must be server controlled | Synthetic/demo requirement (**CONFIRMED**); proposed intake spelling (**PROPOSED BUT NOT APPROVED**). |
| `domain_id` | String, primary key, maximum 32 characters; one of the six canonical IDs | N/A | public metadata | Database `domain_catalog` table constrains values to the canonical set and intentionally contains no rows; this is a lookup schema only, not a profile/assessment/record schema | **TECHNICAL DECISION YOU CAN SAFELY STANDARDIZE**, approved for the backend foundation; canonical IDs are **CONFIRMED**. |
| `client_record_id` | UUID string; proposed request field | N/A | internal | Proposed stable retry identifier; distinct from server `id` | [`data-intake-contract-proposal.md`](./backend/docs/data-intake-contract-proposal.md) (**PROPOSED BUT NOT APPROVED**); prior frontend request model was removed, endpoint applicability is blocked. |
| `Idempotency-Key` | Header candidate; not adopted | N/A | internal | Do not require/send unless API owner selects it over proposed body `client_record_id` | **BLOCKED**: source intake proposal uses `client_record_id`; header alternative is unapproved. |
| `created_at` | RFC3339 UTC string; response required on persisted records | Server creation instant | crew-private | Server generated, immutable | Intake proposal (**PROPOSED BUT NOT APPROVED**); UTC representation standardized. |
| `created_by` | UUID/string; response/internal | Actor identity, not event time | restricted | Server derived; never client-authoritative | Intake proposal (**PROPOSED BUT NOT APPROVED**). |
| `recorded_at` / `measured_at` | RFC3339 offset input, UTC output; required where applicable | Observation/report record time, exact semantics per resource | crew-private | Timezone mandatory; ordering/future bounds blocked | Frontend history/entry proposals (**PROPOSED BUT NOT APPROVED**); UTC format standardized. |
| `observed_at` | RFC3339 UTC; proposed | Time the event/measurement occurred, distinct from entry time | crew-private | Exact distinction from `recorded_at` is blocked | Timeline/record requirements; exact wire field **BLOCKED**. |
| `reporting_date` | `YYYY-MM-DD`; conditional | UTC calendar date associated with daily value | crew-private | No local timezone conversion; exact sleep assignment rule blocked | `MeasurementWire` proposal (**PROPOSED BUT NOT APPROVED**). |
| `source_label` | String; proposed conditional | N/A | crew-private | Vocabulary, max length, trusted source validation TBD | Intake proposal (**PROPOSED BUT NOT APPROVED**). |
| `device_id` | String/UUID; proposed conditional | Device identity | crew-private | Identity registry and stream relationship TBD | `VitalEntryRequest` / radiation proposal (**PROPOSED BUT NOT APPROVED**). |
| `stream_id` | String/UUID; proposed radiation-specific | Selected device stream identity | crew-private | One profile-selected stream requirement is confirmed; schema and selection rules blocked | Radiation gap document (**PROPOSED BUT NOT APPROVED** field; **CONFIRMED** capability constraint). |
| `acquisition_type` | Enum string; proposed | N/A | crew-private | Proposal values: `measured`, `self_reported`, `modeled`; allowed combos blocked | Intake proposal (**PROPOSED BUT NOT APPROVED**). |
| `acquisition` | String; frontend proposal alias | N/A | crew-private | Do not accept as synonym until schema migration approved | [`data-intake-contract-proposal.md`](./backend/docs/data-intake-contract-proposal.md) (**PROPOSED BUT NOT APPROVED**); prior UI spelling is not retained as a live schema. |
| `entry_method` | Enum string; proposed | N/A | crew-private | Proposal values: `manual`, `import`; import means manual transcription of fictional external data, not a device integration | Intake proposal (**PROPOSED BUT NOT APPROVED**). |
| `quality` | Enum string; proposed | N/A | crew-private | Proposal values `valid`, `suspect`; quality rules/assignment authority blocked. Suspect exclusion from calculations is confirmed. | Intake/rules proposals (**PROPOSED BUT NOT APPROVED** values; exclusion semantics **CONFIRMED**). |
| `context` | String/enum; proposed | Measurement/activity context | crew-private | Candidate values include `resting`, `exercise`, `recovery`, `oral`; metric compatibility and controlled vocabulary blocked | [`data-intake-contract-proposal.md`](./backend/docs/data-intake-contract-proposal.md) (**PROPOSED BUT NOT APPROVED**); former UI model is not a live schema. |
| `unit` | String; proposed | Value's unit; not the measured quantity | crew-private | Exact metric-specific accepted units below; conversions not implicit | Frontend type/proposals (**PROPOSED BUT NOT APPROVED** field name); quantity-unit separation standardized. |
| `evidence_ids` | Array; element type **BLOCKED** | N/A | crew-private; psychological evidence restricted | References only eligible, authorized evidence; must not expose private text | Assessment/timeline requirements (**CONFIRMED** concept); ID type is not specified. |
| `private_note` | String; optional only in authorized detail if approved | N/A | restricted | Never in list DTO, shared timeline, generic notification, analytics, or logs | Intake/privacy requirements (**CONFIRMED** semantic); field itself is a proposal. Detail access policy blocked. |

## 7. Resource/metric field dictionary

Exact field names below are **PROPOSED BUT NOT APPROVED** unless identified otherwise. A metric's measurement quantity and unit are separate: changing the unit does not rename or convert the quantity.

| Resource / field | Type / requiredness | Unit and time meaning | Privacy | Validation / domain | Source / classification |
|---|---|---|---|---|---|
| Heart rate: metric `heart_rate`; value field unresolved | Numeric observation; numeric bounds/requiredness are **BLOCKED** | `bpm`; event timestamp meaning is **BLOCKED** between proposed `measured_at` / `recorded_at` | crew-private | Frontend form checks positive numeric formatting and explicitly says this is not a medical threshold. API range/precision, context, source/device comparability are blocked; proposed form value key is `value`. | Metric/unit **CONFIRMED**; exact field and API validation **BLOCKED**. |
| Blood pressure: metric `blood_pressure`; value fields unresolved | Paired systolic/diastolic candidate; requiredness/bounds **BLOCKED** | `mmHg`; same observation is required, timestamp field/meaning blocked | crew-private | Frontend positive-number checks are formatting only, not server bounds. Exact wire fields, precision, posture/context and API validation blocked. | Metric/unit/pair semantics **CONFIRMED**; exact fields/API validation **BLOCKED**. |
| Body temperature metric `body_temperature`; UI calls it `temperature` | Numeric observation; numeric bounds/requiredness **BLOCKED** | `°C`; event timestamp meaning is **BLOCKED** between proposed `measured_at` / `recorded_at` | crew-private | UI context is `oral`; research/intake says oral only where contract specifies, not a confirmed API constraint. The Add Data screen nests the form under Immune, but assessment-domain mapping is not defined. Frontend positive-number check is format-only. Do not infer bounds or domain placement. | Trend metric identifier/unit **CONFIRMED**; observation field/schema, UI metric-key mapping and assessment-domain mapping **BLOCKED**. |
| Sleep duration: `sleep_duration` | Finite number; required if sleep-duration observation supported | `h`; associated with a UTC `reporting_date`; exact sleep interval semantics blocked | crew-private | Trend metric is confirmed; missing is null/absent, never defaulted to zero. Range and nap handling blocked. | User requirement **CONFIRMED** metric; exact record schema **BLOCKED**. |
| Sleep quality / fatigue | Subjective scalar/string unknown | Scale and reporting interval unknown | restricted/crew-private | Must remain distinct from sleep duration; no derived values. | Intake requirement **CONFIRMED** distinction; field/schema/scales **BLOCKED**. |
| Check-in ratings (`mood`, `stress`, other) | Scale unknown; optionality unknown | Check-in timestamp semantics unknown | restricted | No scale, labels, score, threshold, or requiredness may be invented. | Intake/rules proposals (**PROPOSED BUT NOT APPROVED** concepts); scales **BLOCKED**. |
| Check-in `private_note` | Text; optional only if approved | N/A | restricted | Separate from list-summary DTO; detail only after explicit authorization | Intake requirement **CONFIRMED** privacy; field name/schema **PROPOSED**. |
| Symptom code/description | Code/string; conditional | N/A | restricted | Vocabulary, free text, severity scale, onset/recorded timestamps unknown. Report only; cannot establish infection/immune status. | Intake proposal (**PROPOSED BUT NOT APPROVED** fields); non-diagnostic limit **CONFIRMED**. |
| Exercise plan fields | No approved schema | Scheduled period/time semantics unknown | crew-private | Reviewer-created synthetic plan is required; exact plan content and lifecycle blocked. | Exercise requirement **CONFIRMED** capability; fields **BLOCKED**. |
| Exercise log fields | No approved schema | Completion timestamp/date semantics unknown | crew-private | Crew completion log; one log reused across cardiovascular, musculoskeletal and wellbeing views. Not bone density, muscle mass, strength or fitness measurement. | Exercise requirement **CONFIRMED** semantics; fields **BLOCKED**. |
| Radiation quantity `personal_dose_equivalent_hp10` | Numeric quantity candidate; requiredness unknown | Candidate unit `mSv`; interval-specific | crew-private | Exact quantity, spelling, sole unit, precision/range and semantics require radiation owner approval. Do not label effective dose/absorbed dose or convert quantities. | Radiation prompt is conditional and source gap explicitly says unconfirmed: **PROPOSED BUT NOT APPROVED**, **BLOCKED**. |
| Radiation `interval_start`, `interval_end` | RFC3339 UTC candidates | Start inclusive/end exclusive is not yet approved | crew-private | Must represent interval record if approved; order, overlap and adjacency policy require approval. | Radiation requirement **CONFIRMED** interval concept; field names/boundaries **PROPOSED/BLOCKED**. |
| Radiation external ID / provenance / quality / `review_requested` | String/enum/boolean candidates | N/A | crew-private | Exact values and whether client-supplied are blocked. No inference from wearable, heart rate, or solar illustration. | Radiation prompt conditionally requests them; **PROPOSED BUT NOT APPROVED**. |

### Complete frontend proposal-field inventory

The following inventory prevents the existing UI interfaces from being mistaken for approved wire schemas. Every property below is **PROPOSED BUT NOT APPROVED** unless a separate row in §§4–7 marks its underlying product semantic confirmed. Optionality below describes the TypeScript proposal only; it is not API requiredness. Any field not fully characterized in §§6–7 has unknown wire type/requiredness/unit/time meaning/privacy/validation and is **BLOCKED** pending schema approval.

| Existing proposed type | All property names in source | Contract disposition |
|---|---|---|
| `CrewProfileSummary` | `id`, `displayName`, `isSynthetic`, `missionStart`, `missionDay`, `missionPhaseLabel` | Profile summary candidate; exact spelling, requiredness, privacy and nullable rules unapproved. |
| `CrewProfileDetail` | `createdAt`, `reviewer`, `baselines`, `radiationStream`, `recentMeasurements`, `latestAssessment` | Profile-detail candidates; nested shapes and role visibility blocked. |
| Nested profile summaries | `label`, `version`, `active`, `configured`, `label` | Proposed baseline and radiation-stream display fields; all nested requiredness, privacy, and meanings blocked. |
| `MeasurementWire` | `id`, `kind`, `recordedAt`, `reportingDate`, `value`, `systolic`, `diastolic`, `totalHours`, `unit`, `context`, `quality` | Record projection candidates; metric-specific shape/units/quality authority blocked. |
| `ProfileAssessment` | `evaluatedAt`, `overallStatus`, `overallCoverage`, `domains` | UI-only summary candidate; not an alternate assessment schema. |
| `VitalEntryRequest` | `clientRecordId`, `astronautId`, `metric`, `value`, `systolic`, `diastolic`, `unit`, `context`, `measuredAt`, `sourceLabel`, `deviceId`, `quality`, `acquisition`, `entryMethod` | Intake candidates detailed in §8.2; camelCase is not wire spelling. |
| `VitalEntryResult` | `recordId` | Proposed create response; server ID shape and envelope remain subject to §3. |
| `AssessmentDetail` | `astronaut`, `evaluatedAt`, `contractVersion`, `rulesVersion`, `overallStatus`, `overallCoverage`, `unresolved`, `domains` | Assessment shape conflicts with required AX1/DEMO1 envelope in §9; required response schema there takes precedence as a confirmed requirement, but integration schema remains blocked. |
| `DomainDetail` | `domain`, `status`, `coverage`, `reason`, `ruleIds`, `observed`, `comparison`, `missingInputs`, `latestRecordAt`, `nextReviewStep`, `ruleResults` | Proposed display shape; required detailed `reasons[]`, evidence IDs, missing fields, latest time, limitations and six canonical keys must follow §9, not this alias shape. |
| `AssessmentRefreshResult` | `assessment`, `message` | Proposed operation response only; message behavior is not approved. |
| `OverviewResponse` | `astronaut`, `assessment`, `latestReadings`, `restingHeartRateTrend`, `recentRecords` | No endpoint established; overview composition decision blocked. |
| `OverviewAstronaut` | `id`, `displayName`, `missionDay` | Profile display proposal. |
| `AssessmentSummary` | `evaluatedAt`, `overallStatus`, `overallCoverage`, `domains`, `unresolvedConcerns` | Proposed compact assessment projection; status/count computation remains server-owned if approved. |
| `DomainAssessment` | `domain`, `status`, `coverage`, `explanation`, `ruleIds`, `latestRecordAt`, `nextReviewStep` | Proposed compact domain projection; conflicts with the detailed assessment contract. |
| `UnresolvedConcern` | `domain`, `ruleId`, `status`, `summary` | Proposed derived display item; source of counts/deduplication not approved. |
| `LatestReadings` / `ScalarReading` / `BloodPressureReading` / `SleepReading` | `heartRate`, `bloodPressure`, `temperature`, `sleepTotal`, `value`, `unit`, `recordedAt`, `systolic`, `diastolic`, `reportingDate`, `totalHours`, `includesNaps` | Overview projection candidates; wire metric names and `includesNaps` semantics blocked. |
| `RecentRecordWire` | `id`, `kind`, `recordedAt`, `value`, `systolic`, `diastolic`, `totalHours`, `unit` | Shared overview summary candidate; must omit private values/notes. |
| `TrendsRequest` | `astronautId`, `metric`, `from`, `to` | Candidate query fields; UTC calendar date semantics in §3; path and metric schema blocked. |
| `TrendSeries` | `key`, `label`, `unit`, `meanLabel`, `decimals` | Presentation metadata candidates; unit/precision are server-supplied only after owner approves metric definitions. |
| `TrendStat` / `TrendDay` | `mean`, `min`, `max`, `date`, `recordCount`, `values` | User requirement confirms daily grouping, zero count and null aggregates on empty days, no interpolation; field names/count scope/schema remain unapproved. |
| `TrendSummaryItem` / `TrendsResponse` | `label`, `value`, `unit`, `metric`, `from`, `to`, `maxRangeDays`, `title`, `caption`, `series`, `baseline`, `days`, `summary` | Candidate response; 31-day limit is confirmed. Other presentation strings, baseline statistic and excluded/suspect count schemas are blocked or specified in §8.9. |
| `HistoryRequest` | `astronautId`, `category`, `metric`, `from`, `to`, `limit`, `offset` | Candidate filters; history instants are proposed from-inclusive/to-exclusive. Pagination defaults in §3 are technical decisions. |
| `HistoryRowWire` | `id`, `recordedAt`, `metric`, `metricLabel`, `value`, `systolic`, `diastolic`, `unit`, `display`, `context`, `acquisition`, `entryMethod`, `source`, `quality` | List DTO candidate; exact fields blocked. Private data is excluded by confirmed requirement. |
| `HistoryPageResponse` / `DetailField` / `RecordDetail` | `items`, `total`, `limit`, `offset`, `label`, `value`, `categoryLabel`, `fields`, `privateFields`, `access` | Candidate page/detail. `access` values `granted`, `denied`, `none` are proposed only; role access is blocked. |
| Frontend `ApiError` / `ErrorKind` | `message`, `requestId`, `status`, `kind`, `fieldErrors`; `network`, `unauthorized`, `forbidden`, `not_found`, `validation`, `server`, `unknown` | Client presentation/classification only. The server error envelope in §3 is the standardized contract; these property names/kinds are not server fields. |
| `QaHistoryOverride` / `QaTrendOverride` | `rows`, `details`, `days`, `summary`, `baseline`, `caption` | Development-only test injection, not API resources or fields. |
| Older repository audit schema names | `reasons[]`, `rule_results[]`, `Alert`, `Baseline`, `RadiationSummary`, `Ruleset`, error `code`, `evidence_ids` lookup | `evidence_ids` and detailed reasons are confirmed assessment semantics; other named shapes are unresolved proposed schemas. No evidence-ID lookup route exists. |

## 8. Endpoint and operation registry

The [approved addendum](./API_CONTRACT_IMPLEMENTATION_ADDENDUM.md) defines the only product routes in scope. Earlier candidate paths and schemas in this section remain historical proposals unless specifically replaced by §16. `TBD — BLOCKED` is not a deployable endpoint.

### Implemented foundation endpoints

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Liveness | `GET /api/v1/health` | Confirms the process can respond; no authentication or database dependency. | None. | `{status: "ok"}`. | No persistence; request ID is returned in `X-Request-ID`. |
| Readiness | `GET /api/v1/ready` | Checks database connectivity with `SELECT 1`; does not inspect domain records. | None. | `{status: "ready", database: "available"}`. | `503` Problem Details on database failure; request ID is returned. |

These are operational endpoints, not profile, health-data, or product operations. Their FastAPI schemas are the source for development/test OpenAPI.

### Route proposals found in source (not adopted)

| Proposal | Source | Classification | Resolution |
|---|---|---|---|
| `GET /astronauts` | [`frontend/docs/repository-audit.md`](./frontend/docs/repository-audit.md) | **PROPOSED BUT NOT APPROVED** | No backend route exists. Search behavior and assigned-only scope are unresolved. |
| `/astronauts/:id/...` | Same earlier repository audit | **PROPOSED BUT NOT APPROVED** | Route shape conflicts with flat UI routes and the frontend's `?astronaut=` assumption; no API owner selected it. |
| `?astronaut=` for profile selection | [`frontend/docs/backend-contract-notes.md`](./frontend/docs/backend-contract-notes.md), `overviewApi`/`types/overview.ts` | **PROPOSED BUT NOT APPROVED** | A frontend selection/query convention is not an endpoint path or approved API parameter. |
| `/api/v1` prefix and resource naming convention | This contract §3 | `/api/v1` prefix adopted for the foundation; product route naming remains **BLOCKED** | The prefix does not select product resource paths or imply product routes exist. |
| Flat UI routes such as `/crew/:profileId` | [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md), `frontend/src/App.tsx` | **PROPOSED BUT NOT APPROVED** (UI route only) | Keep the distinction between browser routes and server API paths. |

Other source-level contract discrepancies remain explicit: the frontend research/audit raised UTC-versus-local input and historical `measured_at` policy questions; the entry form currently accepts historical timestamps while an older reference is described as locking that field. Neither is resolved here. UTC-aware wire instants are standardized, but whether clients may submit historical/future instants and what bounds apply are **BLOCKED**.

For blocked product operations, response envelopes and status-code mappings remain subject to §3 and §11. The foundation uses the RFC 9457 error format adopted in §3; it does not define product authorization or persistence behavior.

### 8.0 Authentication

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Authenticate / issue access credential | `POST` candidate; **path BLOCKED** | Establish an authenticated session for a reviewer or crew member. Identity provider and credential flow do not exist. | No approved schema. | No approved token/session response schema. | 400/401/422 candidates only; no persistence policy approved. Test credential lifecycle, expiry, logout, role claims and re-auth behavior after approval. |

### 8.1 Profiles

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| List assigned profiles | `GET` candidate; **path BLOCKED** | List profiles for authenticated reviewer. Reviewer assignment is proposed, not approved. | Query filters not established; no body. | Candidate summary: `id`, `display_name`, `is_synthetic`, `mission_start`, `mission_day`, `mission_phase_label`. Every field is proposed. | 401/403; no persistence. Test assignment filtering, synthetic-only response, ordering/pagination only after policy approval. |
| Read profile | `GET` candidate; **path BLOCKED** | Read one authorized astronaut profile. Reviewer/assignment rule proposed. | Candidate path `profile_id`; no body. | Candidate detail: profile summary, optional baseline summaries, radiation-stream configuration, recent shared measurements, latest assessment. Must not contain private notes. | 401/403/404; no persistence. Test scope, 403/404 policy, private-field exclusion. |

### 8.2 Observation intake

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create vital observation | `POST` candidate; **path BLOCKED** | Create heart-rate, paired blood-pressure, or body-temperature observation. Role/profile access blocked. | Candidate fields from `VitalEntryRequest`: `client_record_id`, `astronaut_id`, `metric`, `value` or `systolic` + `diastolic`, `unit`, `context`, `measured_at`, `source_label`, `device_id`, `quality`, `acquisition`, `entry_method`. All are proposals; per-metric requiredness/allowed values unresolved. | Candidate `{record_id}`; server ID and metadata rules not approved. | 401/403/404/409/422. Persist atomically only after all validation. Tests: units, pairs, timezone, quality/provenance, idempotent replay/conflict, scope, rollback, record remains saved if later assessment refresh fails. |
| Create sleep observation | **BLOCKED**: no method/path/schema | Sleep duration is a requested trend metric; sleep entry is not implemented and exact record semantics are absent. | No approved request. | No approved response. | Do not create until units/date semantics, roles and validation are approved. |

### 8.3 Check-ins and symptoms

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create daily check-in | `POST` candidate; **path BLOCKED** | Store approved subjective check-in. Role and whether crew-self-entry is allowed are blocked. | No approved schema. Mood/stress concepts and private note appear only in proposals. | No approved schema. | 401/403/404/409/422; transaction semantics per §3. Test scale validation, privacy, idempotency, list omission only after fields are approved. |
| List check-ins | `GET` candidate; **path BLOCKED** | History read; scope and list projection blocked. | Candidate history filters (§8.10). | General DTO must omit private notes. | Test no private data in list/logs/analytics; exact access policy blocked. |
| Read check-in detail | `GET` candidate; **path BLOCKED** | Explicit detail access only for authorized callers. | Resource ID; no body. | Candidate `fields` plus private access metadata, based on `RecordDetail`; not approved. | 401/403/404; private fields never included without authorization. |
| Create reported symptom | `POST` candidate; **path BLOCKED** | Record a reported symptom; must not diagnose infection or immune function. Role and schema blocked. | Proposed code/description, severity, onset and recorded times are not approved fields. | No approved schema. | 401/403/404/409/422. Test validation, privacy, timeline redaction and no diagnostic inference after approval. |

### 8.4 Support requests and delayed synchronization

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create support request | `POST` candidate; **path BLOCKED** | Distinct private support resource; never an implicit check-in field. Role/schema blocked. | No approved body. | No approved response. | 401/403/404/409/422. Private content must not leak to shared views/logs. |
| Queue / simulate transmit / acknowledge | **BLOCKED**: no approved method/path | Only if offline/simulation behavior is approved. No claim of external delivery. | Proposal states `saved_on_device -> queued -> transmitted -> acknowledged`; these states and actions are not approved. | No approved schema. | Persistence must not advance state on failure; duplicate queue submissions must not duplicate. Test each transition and retry only after owner approves states. |
| Read support request/detail | `GET` candidate; **path BLOCKED** | Authorized owner/reviewer lifecycle view; permissions blocked. | Resource ID. | No approved schema; must not imply external acknowledgement absent explicit acknowledged state. | 401/403/404; privacy tests blocked on role matrix. |

### 8.5 Exercise

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create synthetic exercise plan | `POST` candidate; **path BLOCKED** | Reviewer-created synthetic plan. Profile scope blocked. | No approved fields/schema. | No approved response. | 401/403/404/409/422; persist one plan. Test reviewer restriction and synthetic marker after approval. |
| Create exercise completion log | `POST` candidate; **path BLOCKED** | Crew completion log; one record reusable by cardiovascular, musculoskeletal and wellbeing views. | No approved fields/schema. | No approved response. | 401/403/404/409/422; one persisted log, no per-domain duplicates. Test idempotency and prohibit bone/muscle measurement claims. |
| Read/list exercise records | `GET` candidate; **path BLOCKED** | History/context view. | Candidate history filters. | No approved schema. | Test scope, provenance, no duplicate record projection; exact list/detail contract blocked. |

### 8.6 Radiation

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create radiation interval | `POST` candidate; **path BLOCKED** | Record a synthetic interval for one profile-selected device stream. Role blocked. | Conditional candidates: quantity `personal_dose_equivalent_hp10`, unit `mSv`, interval start/end, device/stream identity, external record ID, provenance, quality, `review_requested`. All exact wire names/semantics blocked. | No approved response. | 401/403/404/409/422; reject prohibited cumulative snapshots/rates only after input schema defines them; overlap policy blocked. Tests required: interval validity, stream overlap, unit/quantity preservation, provenance/quality, idempotency. |
| List/read radiation intervals | `GET` candidate; **path BLOCKED** | History/authorized review. | Candidate history filters. | No approved schema. | Test stream/profile scope, exact quantity/unit preservation, synthetic-only filtering if required. |

### 8.7 Assessment and overview

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Get assessment snapshot | `GET` candidate; **path BLOCKED** | Read assessment for authorized astronaut; role blocked. | Astronaut/profile ID candidate; query selection convention blocked. | Required envelope in §9, if/when implemented. | 401/403/404; read-only. Test six domains, status/coverage independence, evidence privacy, baseline version and reproducibility. |
| Evaluate/refresh assessment | `POST` candidate action; **path BLOCKED** | Evaluate only approved rules; role and automatic-vs-explicit trigger blocked. | No approved request body. | Candidate assessment snapshot plus optional message from UI proposal; message not approved. | 401/403/404/422/500. Persist immutable snapshot if persistence approved; failed evaluation must not corrupt prior snapshot. Test deterministic clock/rules/evidence snapshot. |
| Load overview | **BLOCKED**: no endpoint/schema | UI `OverviewApi` is a proposed aggregation; may instead compose profile + assessment + recent records. | No approved request. | No approved response. | Do not add a duplicate overview route until API owner decides whether it is a projection or composition. |

### 8.8 Baselines

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Activate baseline | `POST` candidate action; **path BLOCKED** | Reviewer-only activation for heart rate, blood pressure, body temperature. | Candidate astronaut + metric; no approved body/path. Eligibility: at least three valid pre-mission observations on three distinct UTC dates; comparable context, acquisition type, source, device; exclude suspect/stale/incompatible. These semantics are confirmed requirements; exact comparability/freshness blocked. | Candidate baseline ID/version/statistic/units/activation metadata; statistic and schema blocked. | 401/403/404/409/422. Persist a versioned activation; assessment snapshot retains version. Tests for minimum count, distinct UTC dates, comparability, exclusion, version retention. |
| Read baseline(s) | `GET` candidate; **path BLOCKED** | Read active or versioned baseline within authorized profile scope. | Metric/version filters unspecified. | No approved schema. | Read-only; access and history/retention blocked. |

### 8.9 Trends

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Get daily trend | `GET` candidate; **path BLOCKED** | Daily UTC aggregation for `heart_rate`, `blood_pressure`, `body_temperature`, `sleep_duration`; authorized profile required. | Candidate `astronaut_id`, `metric`, inclusive UTC date `from`/`to`. Maximum 31 days is a confirmed requirement. Range boundary convention standardized in §3 subject to owner approval. | Ordered one-entry-per-date daily values; count, min, max, mean; empty day count 0 and null aggregates; excluded/suspect counts; optional approved baseline/version. Exact count scope and schema blocked. | 401/403/404/422. Read-only. Test UTC edges, 31/32 days, aggregation, suspect/stale exclusion, null empty days, no interpolation. |

### 8.10 History and record details

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| List history | `GET` candidate; **path BLOCKED** | Paginated history for an authorized astronaut. Candidate categories: `vitals`, `sleep`, `checkins`, `support_requests`, `symptoms`, `exercise`, `radiation`. Category names are proposals. | Proposed `astronaut_id`, `category`, optional `metric`, `from` inclusive UTC instant, `to` exclusive UTC instant, `limit`, `offset`. | Candidate `{items,total,limit,offset}`. List DTO excludes private notes and free-text psychological/support data. | 401/403/404/422. Read-only. Test sort, filters, pagination, sensitive-field omission, stable ties after approval. |
| Read record detail | `GET` candidate; **path BLOCKED** | Explicit per-record detail read. | Astronaut/profile scope + `record_id` candidate. | Proposed `fields` and `private_fields.access` (`granted`, `denied`, `none`) are not approved wire values. | 401/403/404; never return restricted fields to unauthorized caller. Test role matrix and no leakage. |

### 8.11 Alerts

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Create/update alert | Internal service behavior; **route/path BLOCKED** | Only from approved Attention/Urgent conditions. Deduplicate by astronaut/rule/scope; update evidence and `last_seen`. | No approved schema; rule versions and allowed creation conditions blocked. | Required metadata concept: rule version, triggering evidence, reason, next step, limitation. Field names blocked. | Persistence effects confirmed as desired requirements, but lifecycle/storage blocked. Test deduplication/evidence update and no external notification. |
| List/read alerts | `GET` candidate; **path BLOCKED** | Authorized alert view. | Profile scope/filter/pagination blocked. | No approved schema. | 401/403/404; no private-note leakage. |
| Acknowledge alert | Explicit lifecycle action; method/path **BLOCKED** | Role blocked. Acknowledged is distinct from resolved; acknowledgement does not clear/resolve. | No approved request (actor/reason requirements unknown). | No approved response/state enum. | Persist acknowledgement without resolution. Test independent state after enum approval. |
| Resolve alert | Explicit lifecycle action; method/path **BLOCKED** | Role/criteria blocked. | No approved request. | No approved response/state enum. | Persist resolution separately; reopen/dismiss behavior blocked. |

### 8.12 Cross-domain timeline

| Operation | Method / path | Purpose and authorization | Params / request | Response | Errors / persistence / tests |
|---|---|---|---|---|---|
| Read timeline | `GET` candidate; **path BLOCKED** | Chronological synthetic event markers for sleep, fatigue, stress, exercise, symptoms, radiation only where permitted. Profile scope and roles blocked. | Time range, paging, and filtering are not approved. | Candidate events include timestamp(s), domain labels, provenance/quality, evidence references where allowed. Shared output must never include private psychological/symptom notes. | 401/403/404/422. Query projection vs persisted timeline blocked. Test ordering, UTC range, synthetic-only events, privacy boundary. |
| Generate convergence marker | Internal projection; **route/path BLOCKED** | Marker indicates temporal co-occurrence of multiple domains, never causation. | No approved configured window, domain eligibility, grouping, or boundary. | Non-causal wording required; event set/reference schema blocked. | Do not calculate until owner approves window/configuration. Test edges, duplicate suppression and no causal language after approval. |

## 9. Assessment response contract requirements

The following response semantics are **CONFIRMED BY EXISTING REQUIREMENT** for a future approved assessment contract. Assessment remains out of scope for the local MVP, and no endpoint may serve the illustrative excerpt below as a successful assessment response. Exact transport path, JSON schema nullability, snapshot ID, persistence lifetime, and error mapping remain **BLOCKED**.

Assessment envelope (wire spelling is given by the user requirement):

```json
{
  "evaluated_at": "RFC3339 UTC instant",
  "contract_version": "AX1",
  "ruleset_version": "DEMO1",
  "mode": "demo_only",
  "is_synthetic": true,
  "domains": [
    {
      "domain": "cardiovascular",
      "status": "insufficient_data",
      "coverage": "BLOCKED: approved enum required",
      "reasons": [
        {
          "rule_id": "BLOCKED: approved rule required",
          "message": "Placeholder only; no rule is approved.",
          "observed": null,
          "comparison": null,
          "next_step": "BLOCKED: owner-approved wording required",
          "limitation": "AstroOrbitX demo output is not a medical determination."
        }
      ],
      "evidence_ids": [],
      "missing_fields": [],
      "latest_at": null
    }
  ]
}
```

This is a shape excerpt, not an approved schema example to serve as an actual assessment; it shows one domain only for illustration. Each of the six canonical domains must be returned. Each reason must provide `rule_id`, plain-language message, observed condition/value, configured comparison, `next_step`, and limitation text. The response must explain what the assessment cannot conclude. Snapshot determinism requires retaining the evidence IDs, baseline identifier/version where used, evaluation time, and exact ruleset version. Whether baseline identity/version is top-level or domain-level, and its wire property name, are **BLOCKED**.

| Assessment rule item | Classification | Contract treatment |
|---|---|---|
| Rule IDs `CV1`, `CV2`, `IM1`, `SL1`, `PS1`, `SP1`, `SP2`, `MS1`, `MS2`, `IM2`, `RA1` | **PROPOSED BUT NOT APPROVED** as an executable ruleset | IDs are named in requirements/proposals, but no exact complete approved definitions found. Block every rule until its inputs, units, eligibility, freshness, window, comparison/boundaries, status, message, next step, and limitation are approved. |
| Numerical thresholds / psychological scores / freshness windows / baseline algorithms / radiation rules | **BLOCKED** | None may be invented. No ordinary wearable inference for bone density, immune/infection function, or personal radiation dose. |
| `urgent` from an explicit immediate-help request | **CONFIRMED** semantic; event schema **BLOCKED** | No numerical rule may produce urgent. Do not infer request lifecycle, notification, or responder contact. |
| `baseline_version` snapshot reference | **CONFIRMED** | Exact property shape and baseline identifier are blocked; preserve the precise active version used. |

## 10. Resource lifecycle states

| Resource | Confirmed state semantics | Proposed/unapproved values | Contract decision |
|---|---|---|---|
| Support request | A support request is distinct; never claim it reached Earth/responder absent explicit acknowledged state. | `saved_on_device`, `queued`, `transmitted`, `acknowledged` and transition graph from intake proposal. | State names, operations, actor, timestamps, retry semantics and persistence are **BLOCKED**. “Transmitted” in a simulation must not imply real delivery. |
| Alert | Acknowledged is distinct from resolved; acknowledgement does not clear an alert. | Enum/field names and transitions are absent. | **BLOCKED**: define exact states/events, dedupe/reopen behavior, actors and audit fields. |
| Baseline | Activated versions exist; assessments retain the version used. | Version numbering and active/inactive states not specified. | Versioning behavior is a confirmed requirement; identifier, replacement/deactivation/query semantics blocked. |
| Observation/history record | Create and read are proposed; no update/delete requirement is approved. | No lifecycle enum. | Do not add update/delete or invent status fields. |
| Exercise plan/log and radiation record | Create/read capabilities requested; no lifecycle enum supplied. | Any draft/review/complete state not defined. | **BLOCKED**: do not infer lifecycle beyond confirmed operation semantics. |

## 11. Validation and response behavior

1. The foundation uses the RFC 9457 error body in §3 for framework and operational errors, including sanitized `422` validation errors and readiness `503`. Product-specific status mappings, including `401`, `403`, `404`, `409`, and inaccessible-resource disclosure behavior, remain **BLOCKED**.
2. Never coerce absent/null readings to zero, unknown enum values to `normal`, or invalid provenance/quality to valid.
3. Keep status and coverage independent. Unknown status/coverage must render as unknown/error, not a favorable state.
4. Validate before writes and commit atomically. If a separate post-save assessment refresh fails, the saved record remains saved and the API/client reports refresh failure separately.
5. Foundation validation errors use the §3 `errors` extension with dot-separated field locations, stable Pydantic error type codes, and generic messages. Submitted values are never echoed. Product-specific validation codes remain **BLOCKED** until schemas are approved.
6. Do not echo private submitted text in error bodies. Validation errors may identify field paths, not expose submitted values.
7. Unsupported features return no success-shaped placeholder. Until implemented, frontend keeps the explicit not-connected state; there is no mock fallback after live failure.

## 12. Implementation traceability

**Historical pre-addendum snapshot:** the module paths, adapter descriptions, and implementation-status entries below record the earlier blocked state. They are not a current route inventory and do not negate the six local synthetic product operations defined in §16 and the linked decision record. Use [BACKEND_IMPLEMENTATION_STATUS.md](./BACKEND_IMPLEMENTATION_STATUS.md), [FRONTEND_IMPLEMENTATION_STATUS.md](./FRONTEND_IMPLEMENTATION_STATUS.md), and the current addendum for implementation status.

| Contract item | Source requirement | Backend module (target, not present) | Frontend adapter (present; live null) | Required tests (present status) |
|---|---|---|---|---|
| Auth, profile scope, roles | `backend-contract-notes.md`; audit auth gaps; reviewer-only baseline requirement | `app/api/dependencies.py`, `app/core/security.py`, identity models/routes — all absent | No auth API; [`crewApi.ts`](./frontend/src/data/crewApi.ts) only simulates assignment errors | Missing: auth, role, cross-profile authorization tests. |
| Profile list/detail | `CrewApi` proposal and [`types/crew.ts`](./frontend/src/types/crew.ts) | `app/api/profiles.py`, profile schema/repository — absent | [`crewApi.ts`](./frontend/src/data/crewApi.ts) | Missing: schema parity, filtering, 403/404 and privacy tests. |
| Observation intake | [`data-intake-contract-proposal.md`](./backend/docs/data-intake-contract-proposal.md); former frontend request proposal removed | `app/api/observations.py`, observation schema/service/repository/model — absent | No adapter; the disconnected entry adapter was removed | Missing backend validation/idempotency/persistence tests. |
| Check-ins/private details | Intake proposal and privacy requirement | `app/api/check_ins.py`, schemas/services/models — absent | [`historyApi.ts`](./frontend/src/data/historyApi.ts) proposed only | Missing: private-field omission/access-control/logging tests. |
| Symptoms | Intake proposal; immune limits | `app/api/symptoms.py`, schema/service/model — absent | No live symptom adapter/form | Missing: privacy, validation, no-diagnosis tests. |
| Support request/sync | [`backend-developer-2-handoff.md`](./backend/docs/backend-developer-2-handoff.md), intake proposal | `app/api/support_requests.py`, lifecycle service/model — absent | No live support adapter/form | Missing: transition, retry, duplicate, no-delivery-claim tests. |
| Exercise plans/logs | [`exercise-radiation-alert-contract-gaps.md`](./backend/docs/exercise-radiation-alert-contract-gaps.md) | `app/api/exercise.py`, plan/log models and service — absent | History UI only; no live exercise adapter | Missing: role, one-log reuse, idempotency, limitation tests. |
| Radiation intervals | Radiation contract gaps and explicit conditional quantity/unit requirement | `app/api/radiation.py`, interval model/service — absent | History UI only; no live radiation adapter | Missing: interval overlap, units, provenance, quality tests. |
| Assessment / DEMO1 | [`assessment-engine-contract-proposal.md`](./backend/docs/assessment-engine-contract-proposal.md), [`backend-developer-2-rules-proposal.md`](./backend/docs/backend-developer-2-rules-proposal.md) | `app/services/assessment.py`, `rules.py`, schemas/snapshot model — absent | [`assessmentApi.ts`](./frontend/src/data/assessmentApi.ts), [`overviewApi.ts`](./frontend/src/data/overviewApi.ts) | Missing: every rule, six domains, status/coverage, privacy, snapshot reproducibility. |
| Baseline | [`baseline-trend-contract-proposal.md`](./backend/docs/baseline-trend-contract-proposal.md) | `app/services/baselines.py`, baseline model/repository — absent | Profile display proposal only; no baseline adapter | Missing: three dates/count, comparability, exclusion, version retention. |
| Trends | Baseline/trend proposal; [`types/trends.ts`](./frontend/src/types/trends.ts) | `app/services/trends.py`, aggregation repository — absent | [`trendsApi.ts`](./frontend/src/data/trendsApi.ts) | Missing backend: boundaries, max range, aggregation, null days, exclusions, count scope. |
| History/detail | `backend-contract-notes.md`; [`types/history.ts`](./frontend/src/types/history.ts) | `app/api/history.py`, query service/repository — absent | [`historyApi.ts`](./frontend/src/data/historyApi.ts) | Missing backend: filters, pagination, ordering, private detail tests. |
| Alerts | Exercise/radiation/alert gaps; assessment requirements | `app/services/alerts.py`, alert model/routes — absent | Assessment/overview displays fixture status; no live alert adapter | Missing: dedupe, evidence updates, ack/resolution, persistence tests. |
| Timeline/convergence | [`timeline-integration-contract-gaps.md`](./backend/docs/timeline-integration-contract-gaps.md) | `app/services/timeline.py`, projection schemas/repository — absent | No timeline page/adapter | Missing: order, privacy, synthetic-only, window edge/non-causal tests. |
| Foundation OpenAPI, error envelope, request ID | Backend foundation task and §3 technical standardizations | `app/main.py`, `app/core/middleware.py`, `app/schemas/health.py`; generated from registered routes, docs disabled in production | [`http.ts`](./frontend/src/data/http.ts), [`errors.ts`](./frontend/src/data/errors.ts) remain unwired | Historical foundation status: implemented and tested for operational routes, validation errors, correlation, and sanitized failures. The six local MVP product operations are specified separately under §16. |

Existing backend tests [`test_settings.py`](./backend/tests/test_settings.py), [`test_database.py`](./backend/tests/test_database.py), and [`test_migrations.py`](./backend/tests/test_migrations.py) cover infrastructure only. They do not satisfy the endpoint tests above.

## 13. Operation-wide endpoint schema template

For each operation promoted from blocked to approved, its OpenAPI operation must state:

1. `operationId`, method, exactly one canonical `/api/v1/...` path, summary, tags, and deprecation policy.
2. Required role and astronaut-scope check, including whether inaccessible resources produce `403` or indistinguishable `404`.
3. Path/query/header parameters, requiredness, types, enum values, UTC/date semantics, bounds, and defaults.
4. Request schema and response `data` schema, including nullability, units, privacy classification, provenance, quality, and synthetic marker.
5. Success and all relevant problem responses; stable error `code`, validation paths, and `X-Request-ID`.
6. Persistence/transaction effect, idempotency applicability/retention, audit fields, and side-effect behavior.
7. Tests covering valid, invalid, boundary, authorization, privacy, persistence, retry/idempotency, and error-envelope cases.

## 14. Decisions requiring product/API/scientific owner approval before coding

This section records the pre-addendum decision register. D-01 through D-23 are resolved or explicitly out of scope as mapped in §16; only the narrow operations in the approved addendum may be implemented. Do not treat this historical list as authority to implement an excluded operation or to add further rules.

### API owner / product owner

1. Approve this contract baseline and decide whether the API is implemented as an authenticated server or as a local-only synthetic demonstration. The former local demo login was removed; no authentication endpoint is implemented.
2. Define authentication identity provider, sign-in/token route, token expiry/re-authentication UX, reviewer/crew identity, role assignment, and astronaut assignment scope.
3. Approve one canonical path and method for every unblocked operation candidate in §8; determine whether overview is a route or composed client response, and whether baseline/alert lifecycle actions are separate resources or commands.
4. Approve exact product request/response schemas, nullable semantics, field names, resource IDs, product error codes, and 403/404 disclosure behavior. Foundation `/api/v1` registration, RFC 9457 errors, request IDs, and dev/test OpenAPI are adopted in §3.
5. Approve status/coverage contract: coverage enum and definitions, overall status/coverage aggregation (if any), and treatment of missing/stale/suspect data.
6. Approve list categories, metric filters, sort tie-breaks, pagination limits, history/detail DTOs, retention, update/delete policy, and private-detail roles.
7. Approve idempotency header/body compatibility, key scope, canonical payload hashing, retention, retry behavior, and whether all create operations are idempotent.
8. Decide if check-ins, symptoms, or support requests support offline storage/queueing. If yes, approve browser/device storage and deletion/retention guarantees.
9. Approve whether writes trigger assessment evaluation automatically, explicit refresh behavior, snapshot persistence, and whether failed refresh is reported separately.
10. Approve synthetic-data enforcement/seed policy and whether any non-synthetic record can ever be stored or served by this prototype.

### Scientific / domain owners

11. Supply exact, versioned DEMO1 rule definitions for CV1/CV2/IM1/SL1/PS1/SP1/SP2/MS1/MS2/IM2/RA1, including domain, inputs, units, provenance/quality requirements, freshness, windows, comparisons/boundaries, status, coverage interaction, reason, safe next step, limitation, and boundary tests. Until then every named rule is blocked.
12. Define per-domain freshness/staleness, validity, suspect assignment/review, compatibility (context/acquisition/source/device), pre-mission boundaries, and missing-data behavior. Do not copy proposal examples as approved thresholds.
13. Define baseline calculation statistic, precision/rounding, scope/grouping, comparability, replacement/deactivation/history semantics, and assessment snapshot baseline reference. The minimum of three valid pre-mission observations on three distinct UTC dates is confirmed; the algorithm beyond eligibility is not.
14. Approve sleep duration/date assignment, handling naps, sleep quality/fatigue scales, daily counts, exclusion-count scope, and supported metric definitions. Trends have a confirmed 31-day maximum and no interpolation; implementation semantics still require approval.
15. Approve exact symptom code set/severity, check-in rating scales, and psychological privacy/access policy. No psychological scoring or inference is authorized without this decision.
16. Confirm the radiation quantity identifier `personal_dose_equivalent_hp10`, exact `mSv` unit representation, source/device semantics, precision, interval boundaries/adjacency/overlap, external record ID, provenance/quality fields, `review_requested`, and prohibited input categories. Any dose threshold requires an explicitly approved mission-specific radiation-protection source.
17. Approve exercise plan/log fields, adherence/activity semantics, allowed status vocabulary, one-record references, and any relationship to assessment. Exercise is not a direct measure of bone density, muscle mass, strength, or fitness.
18. Approve alert deduplication scope, rule/version snapshots, exact lifecycle states/transitions, who may acknowledge/resolve/reopen, timestamps/audit fields, and confirmation that no external notification is implied.
19. Approve support request lifecycle and whether `saved_on_device`, `queued`, `transmitted`, `acknowledged` are retained; define explicit actor/action per transition, retry/failure semantics, and ensure “transmitted” never means real receipt.
20. Approve timeline event eligibility/privacy, event timestamp meaning, range limits, synthetic-only selection, query projection vs persistence, convergence domain count/window/boundaries/deduplication, and required non-causal wording.
21. Confirm source ownership and approval of user-facing guidance and educational references. Do not call prototype rules NASA thresholds, clinical guidelines, approved response protocols, or medical advice.

## 15. Change-control rule

Any approved decision that changes route paths, wire field names, enum values, auth/session behavior, status/coverage semantics, scientific rules, privacy access, or lifecycle transitions must update this document and generated OpenAPI together. Frontend types/adapters and backend schemas/tests must be changed from that approved source. Until then, a blocked operation remains unimplemented; demo fixtures must not be represented as server truth.

## 16. Approved local synthetic prototype scope

The [AX1 Local Synthetic Prototype Addendum](./API_CONTRACT_IMPLEMENTATION_ADDENDUM.md) was approved by the user in this conversation on 2026-11-14. It is the authoritative source for the local-only, synthetic-only prototype. No separate team/API-owner/scientific-reviewer approval is represented. The prototype is not suitable for real personal or health data and must not be exposed publicly.

The addendum supersedes conflicting statements elsewhere in AX1 only for these operations:

| Operation | Method and path | Scope |
|---|---|---|
| List synthetic profiles | `GET /api/v1/profiles` | Read-only list; profile-only records are explicitly provisioned by a development command. |
| Read a synthetic profile | `GET /api/v1/profiles/{profile_id}` | Read-only detail. |
| Create vital observation | `POST /api/v1/profiles/{profile_id}/observations` | Heart rate (`bpm`), paired blood pressure (`mmHg`), or body temperature (`°C`); no clinical interpretation. |
| List vital observations | `GET /api/v1/profiles/{profile_id}/observations` | Paginated, deterministic ordering. |
| Create sleep-duration record | `POST /api/v1/profiles/{profile_id}/sleep-records` | Duration in positive integer minutes, UTC reporting date, nap inclusion flag; no sleep-quality/fatigue interpretation. |
| List sleep-duration records | `GET /api/v1/profiles/{profile_id}/sleep-records` | Paginated, deterministic ordering. |

No product identity, authentication, role, or profile-assignment system exists in this local single-workspace prototype. Product routes must not be registered in the production application environment. The development server must bind to `127.0.0.1`. Profile and record responses are synthetic; clients cannot submit a false or true `is_synthetic` override. The database starts empty, and only the explicit profile-only development provisioning command may create a profile. No demo observations or records are seeded.

For these operations, create requests use `client_record_id` UUID idempotency keys, exact units and enums in the addendum, UTC-normalized RFC3339 instants, and sanitized RFC 9457 errors. Records are append-only. The addendum defines list pagination, replay/conflict behavior, and field-level validation. Unsupported product operations remain absent from OpenAPI; they must not return success-shaped placeholders.

### D-01–D-23 disposition

| Decision | Disposition |
|---|---|
| D-01 Identity/authentication | **RESOLVED BY PROTOTYPE ADDENDUM:** no identity/authentication; local single-workspace synthetic demo only. |
| D-02 Roles/authorization | **RESOLVED BY PROTOTYPE ADDENDUM:** no multi-user roles; no public or real/private-data use. |
| D-03 Profiles | **RESOLVED BY PROTOTYPE ADDENDUM:** read/list only; explicit profile-only provisioning; no profile mutation API. |
| D-04 API paths/wire shapes | **RESOLVED BY PROTOTYPE ADDENDUM** for the six operations in §16; other product operations **OUT OF SCOPE**. |
| D-05 Vital observations | **RESOLVED BY PROTOTYPE ADDENDUM:** three named metrics and fixed units; no clinical bounds or status inference. |
| D-06 Sleep/fatigue | **RESOLVED BY PROTOTYPE ADDENDUM** for sleep duration/date/naps only; quality and fatigue **OUT OF SCOPE**. |
| D-07 Check-ins/psychological privacy | **OUT OF SCOPE**; no check-in fields or private notes are stored. |
| D-08 Symptoms | **OUT OF SCOPE**; no symptom or diagnosis endpoint. |
| D-09 Support requests | **OUT OF SCOPE**; no message storage or delivery states. |
| D-10 Assessment | **OUT OF SCOPE**; no assessment route or clinical result. |
| D-11 Rules | **OUT OF SCOPE**; no executable threshold/ruleset. |
| D-12 Baselines | **OUT OF SCOPE**. |
| D-13 Trends | **OUT OF SCOPE**; no aggregation or interpolation. |
| D-14 History | **RESOLVED BY PROTOTYPE ADDENDUM** for pagination and ordering of the two record lists; a combined history/detail API is **OUT OF SCOPE**. |
| D-15 Alerts/notifications | **OUT OF SCOPE**. |
| D-16 Exercise | **OUT OF SCOPE**. |
| D-17 Radiation | **OUT OF SCOPE**. |
| D-18 Timeline/convergence | **OUT OF SCOPE**. |
| D-19 Idempotency/retries | **RESOLVED BY PROTOTYPE ADDENDUM** for supported create operations. |
| D-20 Validation/time/units/provenance/quality | **RESOLVED BY PROTOTYPE ADDENDUM** for supported fields only; no unapproved clinical bounds. |
| D-21 Mutations/retention | **RESOLVED BY PROTOTYPE ADDENDUM** for supported resources as append-only local records; no update/delete/export/retention promise. |
| D-22 Synthetic-only/seeding | **RESOLVED BY PROTOTYPE ADDENDUM:** synthetic-only, empty on startup, explicit profile-only provisioning, production routes disabled. |
| D-23 Errors/retries | **RESOLVED BY PROTOTYPE ADDENDUM** for supported operations; no automatic create retries. |
