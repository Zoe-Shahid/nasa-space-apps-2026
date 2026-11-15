# Actual MVP Decision Register

**Purpose:** record what is documented as approved, what remains undecided, and a dependency-ordered route to implementation. This file does not convert recommendations into approvals. The authoritative product contract is [API_CONTRACT.md](../API_CONTRACT.md); unresolved choices are tracked in [API_CONTRACT_BLOCKERS_AND_DECISIONS.md](../API_CONTRACT_BLOCKERS_AND_DECISIONS.md).

## Current Implementation Defaults

The team has directed the project to proceed with the actual MVP. The following defaults are selected for implementation under that direction; the repository contains no separate vote or external security review, so this document does not claim one:

- First-party email/password account using standard-library `scrypt`; database-backed opaque session, 12-hour expiry, secure HttpOnly SameSite=Lax cookie and CSRF/Origin checks.
- One user owns one profile; only the `user` role can access its own health records. No staff/reviewer record access.
- Implement the `/api/v1/auth/*`, `/api/v1/me/*` routes and schemas now specified in `API_CONTRACT.md`; preserve RFC 9457, explicit transactions, and allowlisted logging.
- Preserve decimal values and explicit units, original RFC 3339 timestamp/offset and optional IANA zone plus normalized UTC; use the approved sleep duration unit and note/source defaults in the contract.
- SQLite for a single-host local MVP; preserve existing synthetic rows as demo, never seed measurements into actual accounts, and retain no-clinical-threshold rules.

These are implementation defaults, not claims that the code already provides authentication, owner isolation, or actual-data storage. Local implementation can begin. Public registration/real-data deployment still requires the release gates at the end of this file.

## Repository Comparison

The [decision proposal](ACTUAL_MVP_DECISION_PROPOSAL.md) recommends a suitable architecture but is not an approval record. The current repository has no identity provider, account/user/session model, password handling, authentication dependency, or owner-authorization code. `backend/app/api/router.py` registers operational routes; `backend/app/main.py` registers legacy synthetic profile/record routes outside production. `Profile` is unowned, while `VitalObservation` and `SleepRecord` are constrained to `is_synthetic=true` by the models and migration `0002_synthetic_local_records`.

The database defaults to SQLite. Existing useful conventions include FastAPI/Pydantic, SQLAlchemy/Alembic, `/api/v1`, explicit transactions, strict validation, UTC normalization, sanitized RFC 9457 errors, request IDs, and allowlisted logs. Existing security-related tests cover log allowlisting and rejection/redaction of private extra fields (`backend/tests/test_api.py`, `backend/tests/test_profiles_api.py`); none test authentication or cross-user isolation.

## 1. Decisions Already Documented

No separate team vote or external security review for these choices is documented. The implementation defaults in `API_CONTRACT.md` and this file are selected to proceed under the team's actual-MVP direction; they must not be described as independent security, legal, or regulatory approval.

The following are documented requirements or existing technical conventions, not evidence that the actual MVP is implemented:

| Documented item | Evidence and status |
|---|---|
| Actual-measurement MVP and local implementation defaults | The user directed the project to proceed. The active contract selects the simple local implementation defaults; no separate team vote or external security review is documented. |
| Categories, units, ownership, timestamps, privacy, no medical claims | Required in `API_CONTRACT.md` §§2–4. Concrete local wire/storage defaults are now in §§2–5; runtime implementation and production security remain incomplete. |
| Server-side owner checks; no client-supplied owner authority | Required in `API_CONTRACT.md` §4 and `API_CONTRACT_BLOCKERS_AND_DECISIONS.md`. No implementation exists. |
| Existing stack and API/error/logging conventions | Present in code and documented in `API_CONTRACT.md` §6: FastAPI, Pydantic, SQLAlchemy, Alembic, React/TypeScript/Vite, `/api/v1`, explicit transactions, RFC 9457, request IDs, sanitized errors, allowlisted logging. Reuse unless a reviewed security requirement necessitates change. |
| Existing synthetic prototype details | The user-approved 2026-11-14 local addendum describes the legacy prototype only. It is marked superseded and does not approve actual-data auth, access, or persistence behavior. |

## Historical Recommendations (Superseded)

The table below records options considered before the actual-MVP defaults were selected. It is not an active approval checklist. The selected defaults above and in `API_CONTRACT.md` govern local implementation.

“Recommended default” below is advice only. Each item remains unapproved until the responsible owners record an explicit decision in the contract/change record.

| Decision | Recommended default | Approval needed from | Dependency / gate |
|---|---|---|---|
| Identity provider and registration | Managed OpenID Connect; Authorization Code with PKCE; provider-hosted registration, verification, and recovery. If managed OIDC is unavailable or offline operation is required, explicitly choose first-party credentials instead. | Product and security | Must precede auth implementation. The repository has no auth dependency or provider configuration. |
| App roles and permissions | One `user` role for the initial MVP. Users access only their own profile and records. No routine reviewer or administrator access to health values or notes. | Product, privacy, security | Must precede authorization dependencies and profile API design. |
| Account/profile association | One account owns one profile initially; profile has a unique, immutable `user_id`. No shared profiles or ownership transfer in the first release. | Product and API | Must precede user/profile models and owner-scoped routes. |
| Session and browser transport | Opaque server-side session with only a hashed random token stored in the database; `Secure`, `HttpOnly`, `SameSite=Lax` cookie; rotation, expiry, revocation, CSRF token and Origin validation. Avoid browser localStorage tokens. | Security and API | Depends on the identity choice; defines cookie, CORS, logout, and test behavior. |
| Registration/profile routes and wire format | Approve exact method/path, request/response fields, casing, validation, and error behavior before implementation. Candidate paths must be marked proposed until approved and implemented. | API owner | Must precede route/schema code and OpenAPI acceptance. |
| Authorization disclosure | Default to indistinguishable `404` for another user's resource to reduce existence disclosure; use consistent policy across list/detail/mutations. | Security and API | Must precede cross-user endpoint tests. This is a recommendation, not current behavior. |
| Measurement value representation | Preserve the submitted numeric value and exact unit. Prefer decimal-safe storage (`NUMERIC`/`Decimal`) with precision/scale selected per field; no silent conversion or rounding. | API/data owner | Must precede model/schema and migration work. |
| Timestamp and timezone representation | Accept a timezone-aware timestamp; store normalized UTC for comparison plus submitted offset and any supplied named timezone. Approve syntax, precision, timestamp meaning, and historical/future bounds. | API and data owners | Must precede measurement schema, serialization, and trend boundary decisions. |
| Measurement fields and provenance | Preserve the five required categories and exact allowed units; make source/method optional when unknown; approve source vocabulary and note limit/privacy. Keep blood pressure atomic. | API, product, privacy | Must precede record schema/migration and form design. |
| Sleep semantics | Preserve entered duration and explicit hours/minutes unit. Decide timestamp meaning and whether `reporting_date`/nap inclusion remain independent fields. | Product and API | Must precede sleep model/API and daily trend behavior. |
| Corrections, updates, and retention | Keep `created_at` immutable and update `updated_at` on approved edits. Decide append/correction history, delete/export behavior, account erasure, audit, retention period, and backup expiry before exposing mutation or deletion. | Product, privacy, legal/security as applicable | Must precede record update routes and production data collection. |
| Synthetic/demo separation | Keep legacy rows explicitly demo/synthetic; add a server-controlled account/profile mode; reject mixing modes and filter demo rows from actual-user reads. | Product and security | Must precede migration that removes `is_synthetic=true` constraints. |
| Database and deployment target | Keep SQLite for local development/tests. For hosted multi-user health data, prefer a managed PostgreSQL deployment on the existing SQLAlchemy/Alembic stack, with TLS, encrypted storage/backups, managed keys, and restricted DB credentials. | Security/operations and product | Deployment target and restore plan must be approved before real data is loaded. |
| History/dashboard contract | Approve owner-scoped routes or composition, filters, pagination, sorting, note visibility, and error behavior. | API and privacy | Depends on identity, ownership, and measurement schema. |
| Trend and summary semantics | Approve date boundaries/timezone, aggregation/rounding, blood-pressure handling, valid/suspect/invalid/stale inclusion, empty/insufficient-data representation, and minimum count. Summaries remain descriptive only. | Product/data; scientific review only if interpretation is proposed | Depends on stable stored units/timestamps and data-quality policy. |
| Mutation idempotency and error policy | Decide create idempotency scope/key, replay/conflict behavior, 401/403/404/409/422 mapping, and safe retry policy. Preserve RFC 9457 and request IDs. | API and security | Must be approved for write APIs; existing synthetic retry behavior is not automatically the actual-user contract. |

## 3. Decision Dependencies

1. **Identity choice -> session design.** Provider/credential choice determines registration, verification, recovery, token validation, session storage, logout, CSRF, CORS, and required dependencies.
2. **Identity + role matrix -> ownership model.** The authenticated principal and profile cardinality define the server-side owner foreign key and authorization predicate. Owner policy must precede profile and record routes.
3. **Ownership + profile lifecycle -> migration.** User/profile constraints and how to classify old demo profiles determine safe backfill. Legacy synthetic rows must remain isolated and must never be attached to a real user automatically.
4. **Measurement field/value/time decisions -> record models and APIs.** Numeric precision, units, timestamp/timezone, source, note, and sleep semantics must be fixed before model constraints and migrations.
5. **Record and quality semantics -> history and trends.** Trend aggregation cannot be safely implemented until timezones, units, data eligibility, stale/invalid handling, and empty-data behavior are defined.
6. **Retention/deletion policy -> mutation, audit, and backups.** Correction/deletion semantics must align with audit retention and backup-expiry behavior.
7. **Deployment target -> release security.** Hosted data collection requires approved TLS, database encryption, backup/key controls, session origins, operational access limits, and incident ownership.

## Current Implementation Order

1. Implement user/session/profile ownership with first-party `scrypt` authentication, secure cookies, CSRF/Origin checks, and unauthenticated/cross-user denial tests.
2. Add the user/profile/session migration and the contract-defined five-category measurement schema. Preserve legacy records as synthetic/demo and seed no measurements.
3. Implement the contract-defined owner-scoped create/list/filter/detail/correction API and validate units, decimal strings, timestamps/timezones, idempotency, and sanitized errors.
4. Connect private history and dashboard reads to the existing frontend structure.
5. Implement descriptive trends and summaries using the approved UTC-day, per-unit, null-gap behavior.
6. Pass migration, security, and end-to-end gates before enabling actual-data use; resolve public-release gates separately.

### Historical order before defaults were selected

1. Record approvals for the identity/session, role/ownership, account/profile, and auth/profile route decisions below. Do not start actual-data writes before this gate.
2. Implement identity/session establishment and server-side authorization using the approved provider/session choice. Add user/profile ownership and migration while preserving all legacy rows as isolated demo data. Add unauthenticated and cross-user denial tests.
3. Approve the measurement schemas and data lifecycle. Add the next Alembic migration and extend existing `VitalObservation`/`SleepRecord` architecture for all required categories, units, timestamps/timezones, provenance, notes, and timestamps. Do not rewrite prior migrations.
4. Implement authenticated, owner-scoped create/list/detail/correction operations and frontend forms after schemas and mutation semantics are approved. Verify exact unit/value/timezone round trips and transactional behavior.
5. Implement private history and dashboard projections. Add owner-scope and note-visibility tests.
6. Implement trend charts and descriptive summaries after aggregation, date-boundary, quality, and empty-data semantics are approved. Do not introduce thresholds or diagnosis/prediction behavior.
7. Before enabling production real-data access, meet the security acceptance criteria below and complete migration, backup/restore, retention, and privacy review.

## 5. Security Acceptance Criteria

The MVP must not accept real health data until all applicable criteria are implemented and tested:

- Every private endpoint rejects unauthenticated requests; principal identity is verified server-side and owner IDs are never trusted from request bodies.
- Every profile/measurement/dashboard/history/trend/summary query is owner-scoped. A second user's known or guessed IDs cannot expose records or mutate them; error disclosure follows the approved policy.
- Registration and sign-in do not store plaintext passwords. Session tokens are protected, revocable, time-limited, and absent from URLs/localStorage; cookie sessions have CSRF and Origin defenses.
- No passwords, tokens, measurement values, notes, request bodies, SQL parameters, or other sensitive health data appear in application/access/error logs, traces, analytics, or support tooling. Existing logger allowlisting and sanitized Problem Details are retained and extended.
- Database credentials are least-privilege; production traffic uses TLS; database volumes and backups are encrypted with managed keys; backup access and restoration are restricted and tested.
- Demo and actual records are server-distinguishable and cannot mix in an account/profile or actual-user read. Existing legacy rows remain demo data through migration.
- Input validation enforces category/unit pairs, numeric representations, atomic blood-pressure values, and timezone requirements without adding clinical thresholds. Submitted values, units, and timestamp/timezone information round-trip without silent conversion or loss.
- Migration tests cover upgrade from the current schema, legacy-row preservation, constraints, and rollback/restore strategy. Security tests cover sessions, CSRF, cross-user access, owner forgery, logging redaction, and retention/deletion behavior.
- A documented privacy notice, retention/deletion policy, incident owner, and operational access policy exist before collecting real data.

## Current Public-Release Gates

No additional identity, schema, or API decision is required to begin local implementation under the defaults in `API_CONTRACT.md`. Do not accept real health data until authentication, owner isolation, measurement validation, demo separation, logging redaction, and their tests are implemented. Before public registration or remote deployment, approve account recovery/abuse controls, retention and deletion, privacy notice, TLS, encryption, backups, and incident ownership as listed in the active blocker register.

## Historical Approval Checklist (Superseded)

The following items were the approval gate before defaults were selected. They are superseded for local implementation by the current defaults in `API_CONTRACT.md` and are retained for history only.

- [ ] Select managed OIDC or first-party credentials; if OIDC, name the provider/issuer and approve registration, verification, recovery, and account-disablement behavior.
- [ ] Approve the session transport and lifecycle: cookie versus another reviewed mechanism, server-side storage, expiry, rotation, logout/revocation, CSRF, CORS origins, and production origin model.
- [ ] Approve the initial role matrix: whether the MVP is user-only, and explicitly whether reviewers, support staff, or administrators may access health records or notes. Recommended default: no such access.
- [ ] Approve profile ownership/cardinality and provisioning: recommended one user to one profile, immutable owner, and no sharing/reassignment in the initial MVP.
- [ ] Approve the first auth/profile operation paths and request/response schemas, including unauthorized-resource `403` versus `404` behavior.

Before the measurement schema/migration work, additionally approve exact value precision, unit storage/preservation, timestamp/timezone representation, sleep semantics, source/method and note policy, correction/update/idempotency behavior, synthetic/demo mode and legacy-row handling, and the target database/migration plan.

Before trends and production release, approve aggregation/data-quality semantics, retention/deletion/audit policy, hosting/TLS/encryption/backup controls, privacy notice, and security acceptance gates. Recommendations in this document remain proposals until these checklist items are explicitly approved.