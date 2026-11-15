# Actual MVP Decision Proposal

> **SUPERSEDED AS A CHOICE DOCUMENT (2026-11-15):** the earlier OIDC-first recommendations below were not selected. The implementation defaults now recorded in [API_CONTRACT.md](../API_CONTRACT.md) are first-party email/password with `scrypt`, database-backed sessions, one user-owned profile, user-only health-data access, and the contracted `/api/v1/me` routes. This proposal is retained as decision history; do not treat its OIDC recommendation as an active blocker or selected design.

**Purpose:** propose an implementable identity, ownership, schema, and privacy baseline for the actual-measurement MVP. This is a proposal, not team approval or a claim that the features exist. [API_CONTRACT.md](../API_CONTRACT.md) remains authoritative; do not accept real health data in the current runtime.

## Current Repository Facts

- Backend stack: FastAPI 0.115.12, Pydantic 2.11.3, SQLAlchemy 2.0.40, Alembic 1.15.2, Python 3.10–3.12. The database defaults to SQLite. There are no authentication dependencies in `pyproject.toml`.
- `backend/app/api/router.py` registers operational health/readiness routes. `backend/app/main.py` registers legacy profile/record routes only outside production. No registration, login, auth dependency, identity, session, password, or authorization implementation exists.
- `Profile` has no owner. `VitalObservation` stores heart rate, paired blood pressure, or °C temperature; `SleepRecord` stores integer minutes and a reporting date. Both force `is_synthetic=true`. Migration `0002_synthetic_local_records` creates these synthetic-only tables.
- Existing conventions worth retaining: strict Pydantic validation, `/api/v1`, explicit SQLAlchemy transaction scopes, Alembic migrations, UTC normalization, RFC 9457 sanitized errors, request IDs, and allowlisted structured logs.
- `backend/tests/test_api.py` tests sanitized validation/errors, log-field allowlisting, and disabled access logging. `backend/tests/test_profiles_api.py` tests private extra-field rejection and confirms the value is absent from responses and logs. These are not authentication or cross-user authorization tests.

## Conflicts to Resolve

| Former specification/runtime behavior | Actual-MVP requirement | Resolution |
|---|---|---|
| The superseded local addendum declares synthetic-only data, no accounts/authentication, and no real health data. | Authorized users enter and privately review actual measurements. | Treat the addendum and its local-MVP decisions as historical only. The new contract supersedes the restriction; the running code still enforces it. |
| Profile and record models constrain every row to `is_synthetic=true`; product routes are disabled in production. | Actual-user records must persist and be available through a secured deployment. | Remove/replace these runtime constraints only as part of an approved migration and authenticated release. Preserve legacy rows as demo data; do not silently relabel them as real. |
| No glucose, °F, submitted-timezone retention, optional note, `updated_at`, account owner, or authenticated history exists. Sleep has `reporting_date`, not an event timestamp. | All five categories, requested units, provenance, notes, timestamps, updates, and owner-specific history are required. | Extend the schema and APIs after wire semantics are approved. Do not infer fields or convert away submitted values/units. |
| `liveOverviewApi` and `liveTrendsApi` are `null`; current UI models are not API contracts. | Dashboard, charts, and summaries must use the authenticated user's persisted records. | Do not treat the existing visual components as working data flows. Define owner-scoped read behavior and aggregation before connecting them. |

The current contract already establishes the product direction and minimum record fields. Team approvals below concern the unresolved implementation policy and exact wire/storage choices, not whether authentication or actual measurements belong in scope.

## 1. Identity

### Recommendation

Use an OpenID Connect provider for registration and sign-in, with Authorization Code flow and PKCE. The provider handles credentials, verification, and recovery; AstroOrbitX stores the immutable `(issuer, subject)` identity, not an external password. FastAPI validates issuer, audience, signature, and expiry. Prefer a backend-for-frontend pattern: the backend establishes a random, opaque, server-side session and the React app receives only a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Do not put access or refresh tokens in URLs or browser local storage.

This avoids building password storage and recovery in the MVP while retaining the existing React/FastAPI architecture. It requires the team to select a provider and confirm that the target deployment can reach it. If offline or self-contained registration is a hard requirement, approve a separate first-party credential design before implementation; use a maintained Argon2id password-hashing library and never store plaintext or reversibly encrypted passwords. No such library or identity provider is currently configured.

### Roles and profile association

- MVP authorization role: `user`, permitted to manage only their own account/profile and measurements. Do not add a reviewer or administrator health-record role by default.
- Operational administrators may manage service infrastructure but receive no routine access to measurement values or notes.
- Recommend one user account owns one personal profile for the MVP. Store the provider identity in `users`; store a unique `profiles.user_id` foreign key. Keep the profile ID as a resource identifier, not a credential.
- Whether a user may later have multiple profiles, share a profile, or transfer ownership requires product approval. Reviewer/administrator access to health records requires explicit approval, least privilege, purpose limitation, and audit requirements before any such route exists.

### Session behavior

Recommend a database-backed `sessions` table with a random high-entropy opaque session token; store only a hash of the token, its user ID, creation/expiry/last-seen/revocation timestamps, and minimal device metadata if approved. Rotate on sign-in and privilege changes; revoke on logout, expiry, account disablement, and credential/provider security events. Set cookies `Secure`, `HttpOnly`, and `SameSite=Lax`; use CSRF tokens and Origin/Referer validation for state-changing requests. Credentialed CORS must use explicit trusted origins, never `*`. A same-origin production reverse proxy is preferred; current development CORS disables credentials and would need an explicit reviewed change.

**Team approval required:** provider, allowed registration population, verification/recovery, session lifetime/idle expiry, concurrent-session policy, logout/revocation behavior, deployment origins, and whether a managed OIDC service is acceptable.

## 2. Data Ownership

### Recommendation

Derive the application user ID from the validated session on every request. Never accept `user_id` or an owner ID from request JSON as authority. Resolve the caller's profile server-side; create/list/read/update/delete measurement queries only through that profile. A caller-supplied profile or measurement ID may select a resource but never grant access. Apply the same owner predicate to collection, detail, dashboard, trend, summary, correction, and deletion operations.

Prefer an inaccessible-resource response policy that does not disclose another user's record existence; team/API owners must choose consistent `404` versus `403` behavior. Keep the current RFC 9457 error format and sanitized messages. Ownership checks belong in backend dependencies/services and repository query predicates, not only in React route guards.

Each measurement should reference its owner profile with a non-null foreign key. The profile's unique `user_id` is the authoritative ownership link. If database-level defense-in-depth is desired, add a composite unique key/FK that prevents a measurement from referring to a profile under a different owner. Do not duplicate mutable owner IDs on every record without a constraint that keeps them consistent.

### Reviewer and administrator access

**Recommendation:** no reviewer or administrator reads of health records in the initial MVP. Operational support access is not implied by an admin role. Any later break-glass access requires a separately approved role, reason/purpose, time limit, audit event, user disclosure policy, and tests. The team must explicitly decide whether any professional/reviewer role is part of the MVP.

### Required authorization tests

Test unauthenticated denial; two users with distinct profiles; cross-user list/detail/update/delete denial even with a known UUID; attempts to forge owner/profile IDs; dashboard/trend queries scoped to the current principal; revoked/expired sessions; and no record values or existence leaks in errors. Add service/repository tests as well as API tests so an omitted route dependency cannot bypass ownership filters.

## 3. Database Schema

### Recommended reuse-oriented model

Keep SQLAlchemy models, repositories/services, explicit transactions, and Alembic. Add:

| Model/table | Proposed responsibility and constraints |
|---|---|
| `User` / `users` | UUID primary key; unique identity-provider `(issuer, subject)`; account state and server timestamps. No password column in the OIDC recommendation. Do not store provider tokens unless a specifically approved feature requires them. |
| `Profile` / `profiles` | Existing profile with non-null unique `user_id` FK; synthetic/demo mode explicitly represented; server-managed creation/update timestamps. One profile per user is the recommendation, pending approval. |
| `VitalObservation` / `vital_observations` | Reuse existing discriminated model for `heart_rate`, `blood_pressure`, `body_temperature`, and add `blood_glucose`. Keep metric-specific checks: scalar value for HR/temperature/glucose, paired systolic/diastolic for BP, and exact allowed unit per metric. Support temperature `°C`/`°F`, glucose `mg/dL`/`mmol/L`, HR `bpm`, BP `mmHg`. |
| `SleepRecord` / `sleep_records` | Reuse the separate duration model. Preserve the submitted duration and explicit hours/minutes unit. Add a measurement instant/timezone; keep `reporting_date` only if its meaning is approved and distinct from that instant. |
| `Session` / `sessions` | Opaque server-side sessions as described above; unique token hash, user FK, expiry/revocation indexes. Use only if the team approves cookie-backed sessions. |

Add the common measurement fields to both measurement models: profile FK, measurement time, submitted timezone/offset representation, explicit unit, optional source/method, optional private note, `created_at`, and `updated_at`. Server owns IDs and timestamps. Blood pressure remains atomic. Continue rejecting unknown fields and malformed/unit-mismatched values.

Use a decimal-safe database type (`NUMERIC`/SQLAlchemy `Numeric` with `Decimal`) rather than binary float if preserving submitted precision is required. Do not select scale, rounding, numeric bounds, or conversion policy without product/API approval. Store the original submitted value and unit unchanged. For timestamp comparison, store a normalized UTC instant plus the submitted offset and any provided IANA timezone identifier; the current `UTCDateTime` helper normalizes to UTC and cannot by itself preserve the original offset. Exact timestamp grammar, precision, and named-timezone policy require approval.

Make source/method optional when unavailable, as required by the contract. The existing required enum (`manual | simulated_device`) is a synthetic-prototype constraint; for manual entry, the server can record a known manual method, but the team must approve the wire vocabulary and whether simulated-device provenance is allowed in the MVP. Notes are health data: choose a length limit, list/detail exposure, retention, and redaction policy before accepting them.

### Relationships, indexes, and migration

- `User` to `Profile` one-to-one (recommended initial cardinality); `Profile` to `VitalObservation` and `SleepRecord` one-to-many; optional `User` to `Session` one-to-many.
- Add unique index on `profiles.user_id`; add owner-scoped query indexes such as `(profile_id, measured_at_utc, id)` for vital and sleep history/trends. Keep existing idempotency uniqueness where create retry semantics remain approved.
- Use a new Alembic revision after `0002_synthetic_local_records`; do not rewrite applied migration history. Preserve all existing rows as explicitly synthetic/demo. Never backfill legacy profiles or measurements to a real user automatically. The actual-account tables start empty.
- Remove the `is_synthetic IS TRUE` constraints only in the approved migration. Preserve an explicit server-controlled demo/actual mode and enforce that an actual profile cannot receive demo records and that real-account queries exclude demo data. The team must approve whether a per-record flag, profile/account mode, or both is canonical.
- Test upgrade from the current `0002` schema, downgrade strategy, foreign keys, unit/value-shape constraints, uniqueness, owner scoping, timestamp round trips, and preservation of old synthetic rows. Backups and migration rollback need an operational plan before production data is loaded.

**Team approval required:** decimal precision/scale, timestamp and timezone wire/storage fields, sleep duration and date semantics, source/method enum, note length/visibility, correction/update and idempotency behavior, synthetic-mode representation, and whether the current SQLite default is strictly local development with PostgreSQL (or another managed SQL database) required for a hosted deployment. SQLAlchemy/Alembic can support a database change without changing the app framework.

## 4. Privacy and Security

### Recommended baseline

- Require a valid authenticated session for every private route. Apply server-side owner checks on every query and mutation. Default deny; do not expose reviewer/admin access.
- With OIDC, do not handle or store user passwords. If first-party passwords are selected instead, use a maintained Argon2id implementation, unique per-password salts managed by the library, rate limiting, generic login errors, secure reset tokens, and no password/token logging. Never use reversible password encryption or a fast general-purpose hash.
- Use HTTPS for any non-loopback environment; secure cookies and CSRF controls for cookie sessions. Validate `Origin`/`Referer` on unsafe methods and use explicit credentialed CORS origins only where required.
- Encrypt database volumes and backups with managed keys, restrict database credentials to the service, keep secrets outside source control, and define backup access/restore controls. The current SQLite default is not by itself a production security or multi-user deployment decision.
- Preserve the current allowlisted structured logger and sanitized RFC 9457 errors. Never log passwords, tokens, measurement values, notes, request bodies, or SQL parameter values. Keep SQL echo off. Add redaction to error reporting, tracing, analytics, and support tooling as well as application logs.
- Isolate demo data by explicit account/profile mode and enforce the mode in server queries and write validation. Do not seed measurements into actual accounts or relabel historical demo data.

### Retention, deletion, and audit

The repository does not define a retention period, data export policy, account deletion behavior, or audit requirements. These require product, privacy, and security approval. Recommend a documented retention schedule, user-requested account/record deletion or correction process, backup-expiry behavior, and minimal security audit events that record actor/resource/action/time without storing measurement values or notes. Do not promise immediate erasure from backups until the backup policy can guarantee it.

### Security tests required before real-data release

1. Registration/sign-in/session lifecycle, invalid/expired/revoked session denial, cookie flags, CSRF rejection, and rate-limit behavior.
2. Cross-user access denial on every read/write surface, including history, dashboard, trends, notes, and guessed IDs; verify no content/existence leakage per approved response policy.
3. Ownership forgery and synthetic/actual mixing rejection at API and persistence boundaries.
4. No credentials, tokens, health values, notes, payloads, or SQL parameters in application logs, error responses, tracing, or analytics.
5. Input/unit/timestamp validation, exact value/unit/timezone round-trip, BP atomicity, transactional rollback, and migration upgrade/rollback/preservation of legacy demo rows.
6. Retention/deletion, audit access restrictions, backup encryption/restore permissions, and deployment TLS/security headers against the approved operational policy.

Existing `test_api.py` and `test_profiles_api.py` privacy tests are useful foundations but do not establish any of these authentication or owner-isolation properties.

## Team Approval Checklist

- [ ] Select managed OIDC or explicitly approve a first-party password system; name the identity provider and registration/recovery policy.
- [ ] Approve the session transport/lifetime, logout/revocation, CSRF, CORS, and deployment-origin policy.
- [ ] Approve one-profile-per-user ownership or an alternative; confirm that reviewers/administrators have no health-record access in the initial MVP unless explicitly specified.
- [ ] Approve measurement numeric precision, timestamp/timezone representation, sleep semantics, source/method values, note limits, updates/corrections, and retention/deletion.
- [ ] Approve the synthetic/demo isolation representation and treatment of existing synthetic rows.
- [ ] Approve production database/deployment, TLS, encryption/key management, backups, audit, privacy notice, and incident-response ownership.
- [ ] Approve the required cross-user, session, logging, migration, and privacy test gates before enabling actual-data routes.