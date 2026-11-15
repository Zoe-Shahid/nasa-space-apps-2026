# API Contract Blockers and Decisions

**Status:** active release-gate register for the implemented local actual-measurement MVP.  
**Authority:** [API_CONTRACT.md](./API_CONTRACT.md), §§1–7. Historical decisions below are retained for traceability only and are superseded where they conflict with the current contract.  
**Implementation state:** local authentication, owner-scoped actual-data storage, measurement APIs, frontend entry/history/dashboard/trends, and security tests are implemented. The exact runtime and test evidence are in the linked status and handoff documents. This is not a production security or privacy certification.

## Current Direction

Actual user-owned health measurements, authentication, private history, a dashboard, trends, and descriptive summaries are the implemented local MVP scope. The previous synthetic-only decisions are historical. Keep the service local and isolated; public deployment remains blocked by the gates below.

## Resolved Implementation Defaults

These are project defaults selected under the actual-MVP direction on 2026-11-15 so implementation can proceed. They are not represented as a separate external security review or legal/privacy approval.

| Area | Default selected | Status |
|---|---|---|
| Identity | First-party email/password, normalized lowercase email, standard-library `scrypt` password hashing, minimum 12-character password, no external identity service dependency. | Resolved for MVP; account recovery/email verification remain public-release gates. |
| Sessions | Database-backed opaque sessions; store only token hash; 12-hour expiry; `Secure`, `HttpOnly`, `SameSite=Lax` cookie; session-bound CSRF token and `Origin` validation on state-changing requests. | Resolved for MVP. |
| Roles and profile | One `user` role; one profile per account; owner is immutable. No reviewer/admin access to health records. | Resolved for MVP. |
| Ownership | All `/api/v1/me/...` handlers derive the user/profile from the session; repositories constrain by that profile. Missing and foreign-owned measurement IDs return the same sanitized 404. | Resolved for MVP. |
| Measurement resource | `POST/GET /api/v1/me/measurements`, `GET/PATCH /api/v1/me/measurements/{measurement_id}`; category/unit/value shapes and fields are defined in `API_CONTRACT.md` §5. No measurement DELETE. | Resolved as target API; not yet implemented. |
| Units and values | Decimal-string wire values; preserve input value/unit; accept finite decimal values without physiological thresholds. BP is an atomic pair. Sleep duration carries `h` or `min`. | Resolved for MVP. |
| Timezone | Require RFC 3339 timestamp with explicit offset; preserve input text and optional IANA `time_zone`, plus normalized UTC instant. | Resolved for MVP. |
| Source and note | Manual-only entry; server sets source `manual`; note optional, max 2,000 characters, private and excluded from logs. | Resolved for MVP. |
| Storage and demo separation | SQLite for local single-host MVP/tests; retain all existing rows as synthetic/demo. New actual profile/records are server-labelled non-synthetic. PostgreSQL is not required until multi-instance hosting. | Resolved for local MVP. |
| Collection and trends | History `from` inclusive/`to` exclusive UTC instants; page limit 50/max 100; newest measurement first. Trends use inclusive UTC dates, max 31 days, daily count/min/max/mean, null gaps, no interpolation, and separate series for each submitted unit. | Resolved for MVP. |
| Errors and retries | RFC 9457; 401 unauthenticated, 404 missing/non-owned, 409 changed idempotency replay, 422 invalid input, 429 throttled. Reuse UUID `client_record_id` scoped to profile. | Resolved for MVP. |

The existing FastAPI/Pydantic/SQLAlchemy/Alembic and React/TypeScript/Vite stack, `/api/v1`, explicit transactions, request IDs, sanitized errors, UTC normalization, and allowlisted logging remain in use. Local verification is summarized in `docs/ACTUAL_MVP_HANDOFF.md`.

## Remaining Public-Release Gates

These do not block local implementation but must be resolved before opening registration or collecting real data over a public/networked service:

| Gate | Why it remains open |
|---|---|
| Account verification, password reset/recovery, abuse operations | No email/recovery service exists. The local MVP defaults to non-public registration; a public deployment needs an approved recovery and abuse policy. |
| Retention, account erasure, backup expiry, privacy notice, incident owner | Legal/privacy obligations and backup lifecycle depend on deployment and jurisdiction; the repository contains no approved retention duration. |
| Remote deployment | Public/multi-instance hosting requires TLS termination, encrypted volumes/backups, key management, trusted proxy/CORS settings, and operational review. The default SQLite profile is single-host only. |
| Formal security/privacy review | Automated tests cover authentication, CSRF, owner isolation, validation, redacted errors/logs, and clean migrations; they are not a formal penetration test, privacy review, or regulatory assessment. Complete those reviews before any production real-data use. |

No additional API/schema/identity decision is required for the implemented local scope. Do not treat historical D-01–D-23 text below as active blockers.

## SUPERSEDED: Historical Synthetic-Prototype Register

All material below is the prior AX1/local synthetic-only decision register. It is not active authority. References to “resolved for local MVP,” “out of scope,” synthetic-only as product policy, and blocked authentication/history/trends are historical and must not be used to prevent the requirements in [API_CONTRACT.md](./API_CONTRACT.md). Retain only compatible technical and domain context.

---

This register separates:

- **CONFIRMED** — explicitly required behavior or vocabulary. It may still be unimplemented.
- **PROPOSED** — a field, route, behavior, or enum found in a UI type or proposal document. It is not approved.
- **TECHNICAL STANDARDIZATION** — an already adopted foundation convention. It does not decide product behavior.
- **BLOCKED** — a product, API, privacy, security, or scientific owner must make the stated decision before implementation.

Unless stated otherwise, every product operation below has a blocked method/path, request/response schema, authorization policy, and product error mapping. Browser routes such as `/crew` are not API routes.

## Adopted baseline and current implementation facts

The table and the pre-addendum dispositions below preserve the pre-approval baseline only. They are superseded where the approved addendum defines routes or schemas; consult API_CONTRACT.md §16 for the current disposition. Implementation status is tracked separately in BACKEND_IMPLEMENTATION_STATUS.md and FRONTEND_IMPLEMENTATION_STATUS.md.

| Area | Confirmed or standardized | Not thereby approved |
|---|---|---|
| Operational API | `/api/v1/health` and `/api/v1/ready`; `/api/v1` is the adopted foundation prefix. | Any product route, resource nesting, or action path. |
| Errors and request IDs | Foundation errors use RFC 9457 `application/problem+json`, a `request_id`, sanitized validation `errors`, and `X-Request-ID`. | Product-specific 401/403/404/409/422 mapping, stable business error codes, or inaccessible-resource disclosure. |
| OpenAPI and CORS | OpenAPI is generated from actual FastAPI routes outside production. Development/test CORS defaults are the Vite origins; production defaults to no cross-origin allowlist and credentials are disabled. | Product route publication or authentication transport. |
| Domains and assessment vocabulary | Canonical domains are `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, `radiation`. Assessment statuses are `normal`, `attention`, `urgent`, `insufficient_data`; status and coverage are separate concepts. | Coverage enum/meaning, aggregate status logic, or alternate aliases. |
| Synthetic/demo | Demo records are fictional and visibly labelled synthetic/demo. Assessment requirements specify `contract_version=AX1`, `ruleset_version=DEMO1`, `mode=demo_only`, `is_synthetic=true`. | Whether the service can ever store or serve non-synthetic data, or how demo-only access is enforced. |
| Time/trends | UTC instants and UTC calendar dates are distinct. Trend requirements name `heart_rate`, `blood_pressure`, `body_temperature`, `sleep_duration`; UTC inclusive calendar-date ranges have a 31-day maximum, empty dates have zero count/null aggregates, and there is no interpolation. | Product timestamp field names/meanings, record eligibility, exact aggregation/count details, endpoint shape, and whether the same date semantics apply to every resource. |
| Backend state | `backend/app/api/router.py` registers only health routes; `backend/app/models/domain.py` and migration `0001_initial_baseline.py` define only an empty canonical-domain registry. No user/profile/observation models exist. | Product persistence/lifecycle. A database schema or TypeScript interface alone would not approve it. |
| Frontend state (pre-addendum snapshot) | At the time of this historical snapshot, product adapters were null and product screens were unavailable; the current supported adapters are documented in FRONTEND_IMPLEMENTATION_STATUS.md. | Any proposed adapter outside the current addendum scope. |

## Pre-addendum implementation request disposition (historical snapshot)

The current AX1 contract does **not** approve any product profile CRUD or health-record CRUD route/schema. The only implemented routes are the operational health/readiness endpoints. `domain_catalog` is an empty canonical-domain registry, not a profile or observation table. Accordingly, no product models, repositories, routes, migrations, or route tests can be added without promoting blocked proposals to contract requirements.

| Requested area | Approved implementation possible now? | Contract blocker |
|---|---|---|
| Astronaut profiles | **No product CRUD.** | Only list/read candidates are discussed; path, fields, roles, assignment scope, identifier format, and provisioning are unapproved. Profile create/update/delete are not authorized by AX1. (D-02–D-04) |
| Cardiovascular | **No record route/schema.** | `heart_rate` and paired `blood_pressure` metric/unit semantics are confirmed, but the observation wire schema, route, validation bounds/precision, timestamp meaning, provenance/quality enums, authorization, and idempotency are blocked. (D-05, D-19–D-20) |
| Sleep/fatigue | **No record route/schema.** | `sleep_duration` as a trend concept and the distinction between duration, quality, and fatigue are confirmed; intake fields, units/date assignment, scales, route, and assessment eligibility are blocked. (D-06) |
| Psychological | **No record route/schema.** | Privacy restrictions and the non-diagnostic nature of self-report are confirmed; check-in prompts/scales, note fields, roles, routes, private detail policy, and retention are blocked. (D-02, D-07) |
| Musculoskeletal | **No record route/schema.** | A synthetic exercise plan/completion-log capability and shared-log intent are requirements, but plan/log fields, lifecycle, roles, and routes are not approved. Exercise is not a direct body measurement. (D-16) |
| Immune | **No symptom or temperature contract.** | Temperature metric/unit is a confirmed concept but observation field/schema and domain mapping are blocked. Symptom vocabulary, scales, privacy, routes, and permissions are also blocked; symptoms cannot diagnose infection or immune function. (D-05, D-08) |
| Radiation | **No interval route/schema.** | Interval recording is requested, but the candidate `personal_dose_equivalent_hp10` quantity, `mSv` unit and related fields are explicitly unapproved pending owner confirmation; stream selection, overlap, provenance/quality, permissions, and route are blocked. (D-17) |
| Retry/idempotency | **No server behavior or tests.** | `client_record_id` is a proposal; the `Idempotency-Key` header is not adopted. Key scope, payload replay/conflict, retention, and concurrency semantics are blocked. (D-19) |
| Route-level authorization/privacy tests | **Cannot be implemented against nonexistent product routes.** | Authentication and authorization roles, profile scope, and private-detail policy are blocked. Existing backend tests cover infrastructure only. (D-01–D-02) |

This disposition is intentional: the available contract does not authorize field invention, schema creation, or route registration. Once the decisions above are approved in [API_CONTRACT.md](./API_CONTRACT.md), implementation and route-level integration tests can proceed against that single source of truth.

## Domain-service calculation disposition

The backend currently has no persisted health-record models or record repositories. The only model is the empty `domain_catalog` lookup schema, and the only routes are operational health/readiness endpoints. Therefore there are no actual stored observations from which domain services can retrieve or summarize data. Adding typed record inputs, repository queries, or output fields would invent the blocked schemas recorded below.

| Domain/calculation | Confirmed behavior usable by a service | Why no calculation/data retrieval is implemented |
|---|---|---|
| Cardiovascular summaries | Heart rate is measured in `bpm`; blood pressure is a paired quantity in `mmHg`; suspect data cannot contribute to calculations. | No observation model/repository, approved value/timestamp/context/provenance/quality field names, summary statistic, compatibility definition, or freshness rule. (D-05, D-20) |
| Sleep/fatigue summaries | Sleep duration is distinct from sleep quality and fatigue; trend dates are UTC calendar dates, gaps remain null, and interpolation is prohibited. | No stored sleep records, approved duration/date fields, nap treatment, scales, freshness rule, or summary algorithm. A `sleep_duration` trend metric alone does not approve an intake model. (D-06, D-13) |
| Psychological check-ins | Self-report must not produce an unapproved clinical score; private notes are restricted and excluded from shared/list/log outputs. | No check-in schema, storage model, rating scale, authorized-detail role, or repository exists. Creating a retrieval interface would require inventing record and permission types. (D-02, D-07) |
| Musculoskeletal exercise/activity | Exercise logs may describe activity/adherence context and must not be interpreted as bone density, muscle mass, strength, or fitness. | No plan/log fields, stored records, activity vocabulary, or summary definition is approved. No body-measurement inference is allowed. (D-16) |
| Immune/symptom summaries | Reported symptoms and temperature are not diagnoses and do not establish infection or immune function. | No symptom schema/repository or approved summary semantics; temperature's record field and domain mapping are blocked. (D-05, D-08) |
| Radiation summaries | Do not infer exposure from wearables, heart rate, or illustrations, and do not relabel Hp(10) as effective or absorbed dose. | Candidate quantity/unit and interval fields are explicitly awaiting owner confirmation; no stored records, selected-stream model, interval boundary/overlap policy, or freshness rule exists. (D-17) |
| Baselines | At least three valid pre-mission observations on three distinct UTC dates are an eligibility requirement; assessment snapshots retain the version used. | Calculation statistic, comparability, precision, freshness, and lifecycle are blocked. Eligibility alone does not define a baseline calculation. (D-12) |
| Trends | Requested metrics, inclusive UTC date ranges (maximum 31 days), empty-day nulls/zero counts, and no interpolation are specified. | No stored metric observations or approved repository/input types exist; exact aggregation/count scope, record eligibility, compatibility, freshness, and stale-data handling are unresolved. Do not expose computed trend values until those inputs and behaviors are approved. (D-13, D-20) |
| Assessment | Missing/stale/suspect/incomplete inputs cannot silently become Normal; status and coverage remain independent. | Required coverage enum and all complete executable DEMO1 definitions are blocked. No domain records exist to retrieve, and no assessment service can produce a valid snapshot. (D-10–D-11) |

These are not empty service implementations or success-shaped fallback outputs: the correct current behavior is to keep product calculations and retrieval unavailable. Once the API owner approves record schemas and repositories exist, service interfaces can be typed against those approved models. Scientific owners must separately approve any algorithm, freshness, compatibility, or status behavior before a calculation is implemented.

## Assessment, alert, and support workflow disposition

No workflow route, persistence model, service, or integration test is implementable from the currently approved contract. In particular, a fabricated response labeled `blocked`, `unconfigured`, or `insufficient_data` would still invent a product endpoint and response behavior; the contract's §11.7 requires unsupported features to remain explicitly unavailable rather than return success-shaped placeholders.

| Workflow | Approved behavior that can be preserved | Blocked behavior; do not implement yet |
|---|---|---|
| Assessment | The required envelope semantics and six canonical domain identifiers; status values `normal`, `attention`, `urgent`, `insufficient_data`; status/coverage independence; reason/evidence/missing-input concepts; reproducibility metadata. Missing/stale/suspect/incomplete evidence must not become Normal, and no numerical rule can produce Urgent. | No assessment route or persistence policy is approved. Coverage enum and aggregation, exact schema, evidence ID type, baseline reference shape, evaluation trigger, and complete executable DEMO1 definitions are blocked. The named rule IDs are not executable rules. Do not return an invented “insufficient/unconfigured” assessment in lieu of an approved result. (D-10–D-12) |
| Alerts | Alert creation is required only from approved Attention/Urgent conditions; deduplication by astronaut/rule/scope and evidence/`last_seen` update are required. Acknowledgement is distinct from resolution and does not resolve an alert; no external notification may be implied. | No approved rule currently qualifies to create an alert. State enum, transition graph, actor permissions, endpoints, persistence, dedupe/reopen details, and response fields are blocked. Do not invent states or expose a synthetic alert lifecycle. (D-15) |
| Support requests | A support request is a distinct, private resource. No response may claim delivery to Earth or a responder without an explicit confirmed acknowledgement event. | The candidate `saved_on_device`, `queued`, `transmitted`, and `acknowledged` values are explicitly unapproved; no request schema, route, persistence, transport, acknowledgement source, or role is defined. Do not persist or report these states absent an approved and implemented delivery mechanism. (D-09) |

Consequently, no assessment, alert, or support workflow code or tests were added. The existing backend has no corresponding routes against which anonymous/role/scope, lifecycle, evidence, replay, or privacy tests could run. Those test cases become implementable only after the referenced contract decisions are approved and the required domain records/authentication are available.

## Decision register

### D-01 — Product mode, identity provider, and authentication

1. **Feature/endpoint:** Sign-in, session establishment, all authenticated product routes.
2. **Current definition:** **CONFIRMED:** no real authentication exists; the login screen explicitly opens a local synthetic demo. **PROPOSED:** a reviewer/crew identity and a `POST` credential operation appear in API contract discussions, but there is no approved path or body. **TECHNICAL STANDARDIZATION:** secrets must not be sent in URLs.
3. **Missing/ambiguous:** The app may become an authenticated server or remain a local-only synthetic demonstration. There is no identity provider, credential/session schema, token/cookie transport, expiry, refresh, logout, reload behavior, or account provisioning method. If cookies are selected, CSRF protections are not specified.
4. **Exact decision:** Choose the deployment model; if authenticated, name the identity provider and approve sign-in, credential transport, session lifetime/refresh/logout, re-authentication UX, and CSRF strategy if applicable. Specify how first accounts are provisioned without hard-coded credentials.
5. **Dependencies:** Backend `app/core/security.py`, identity models/routes and auth dependencies do not exist; `backend/app/main.py` currently configures no auth. The former demo login/state were removed. The current [http.ts](./frontend/src/data/http.ts) and [common.ts](./frontend/src/data/common.ts) have no product authentication behavior.

### D-02 — Roles, profile assignment, and authorization disclosure

1. **Feature/endpoint:** Every profile-scoped read/write, private detail, support request, baseline, exercise plan, radiation record, assessment, alert, and timeline operation.
2. **Current definition:** **CONFIRMED:** the server must enforce scope; a browser-supplied `astronaut_id` cannot be trusted as authorization. Private psychological/support notes must not appear in shared views, generic notifications, analytics, or logs. **PROPOSED:** reviewer-assigned profile access and crew self-entry are described in UI/proposals.
3. **Missing/ambiguous:** No approved roles, permissions, assignment source, self-access policy, reviewer-to-profile relationship, role administration, private-detail rule, or distinction between a forbidden resource and a nonexistent one. The UI's `granted`/`denied`/`none` private access values are proposals.
4. **Exact decision:** Approve a role/operation/profile-scope matrix, who can create/change assignments, crew self-service permissions, access to psychological and support details, audit requirements, and whether out-of-scope resources return 403 or indistinguishable 404. Decide whether authorization is checked on every operation using the authenticated principal's server-side assignments.
5. **Dependencies:** Backend auth/authorization dependencies and profile assignment models are absent. Frontend [crewApi.ts](./frontend/src/data/crewApi.ts), [historyApi.ts](./frontend/src/data/historyApi.ts), [RecordDetails.tsx](./frontend/src/components/history/RecordDetails.tsx), [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx), and all profile-scoped data pages.

### D-03 — Astronaut profiles and profile lifecycle

1. **Feature/endpoint:** List assigned profiles, read profile, and any profile create/update/delete operation.
2. **Current definition:** **CONFIRMED:** all health records are scoped to a profile/astronaut; profile identifier supplied by a caller does not grant access. **PROPOSED:** list/read operations and fields such as `id`, `display_name`, `is_synthetic`, mission start/day/phase, baseline summaries, selected radiation stream, recent measurements, and latest assessment. The UI says profiles are provisioned outside the app, but no provisioning API/command is approved here.
3. **Missing/ambiguous:** No canonical path, identifier format, profile schema, list filters/order/pagination, profile creation authority, allowed mutations, deletion/archive behavior, mission-date semantics, or field visibility. The candidate profile response embeds other resource summaries whose schemas are separately blocked.
4. **Exact decision:** Decide who creates profiles and by what supported mechanism; approve list/read paths and exact summary/detail fields; define profile ID format, synthetic marker authority, mission date/day semantics, reviewer assignment behavior, and whether update, deactivation, deletion, or no mutation is allowed.
5. **Dependencies:** Backend profile model/schema/repository/routes do not exist. Frontend [crew.ts](./frontend/src/types/crew.ts), [crewApi.ts](./frontend/src/data/crewApi.ts), [CrewPage.tsx](./frontend/src/pages/CrewPage.tsx), [CrewProfilePage.tsx](./frontend/src/pages/CrewProfilePage.tsx), and [useProfile.ts](./frontend/src/lib/useProfile.ts).

### D-04 — API paths, wire schemas, success envelope, and operation inventory

1. **Feature/endpoint:** All product operations, including overview composition and action-style operations.
2. **Current definition:** **TECHNICAL STANDARDIZATION:** product routers belong under `/api/v1`; errors use the adopted foundation Problem Details shape. **CONFIRMED:** API schema must be documented in generated OpenAPI. **PROPOSED:** source documents list candidate operations, but no product route is approved. No success envelope is currently defined.
3. **Missing/ambiguous:** Resource naming/nesting, HTTP methods, path/query/body placement, snake_case versus camelCase, success response wrapper, operation IDs, and whether overview is a route or a client-composed response. Proposals conflict (`/astronauts`, nested profile paths, and browser `?astronaut=` are not one selected API shape).
4. **Exact decision:** For every approved operation in this register, select exactly one method/path and approve the request and response JSON shape, casing, nullability, success-envelope policy, operation ID, and OpenAPI behavior. State which proposed operations are explicitly out of scope.
5. **Dependencies:** Backend `backend/app/api/router.py`, route modules, Pydantic schemas, and generated OpenAPI. Frontend [http.ts](./frontend/src/data/http.ts), [common.ts](./frontend/src/data/common.ts), all `*Api.ts` adapters, and [App.tsx](./frontend/src/App.tsx) (browser routes only).

### D-05 — Vital observation intake

1. **Feature/endpoint:** Create/read heart-rate, blood-pressure, and body-temperature observations.
2. **Current definition:** **CONFIRMED:** heart-rate unit `bpm`, blood-pressure unit `mmHg` and paired systolic/diastolic semantics, body-temperature unit `°C`; a temperature reading cannot diagnose infection or measure immune function. Missing values are not zero. **PROPOSED:** `VitalEntryRequest` includes `metric`, `value` or `systolic`/`diastolic`, `unit`, `context`, `measured_at`, `source_label`, `device_id`, `quality`, `acquisition`, `entry_method`, `client_record_id`, and `astronaut_id`.
3. **Missing/ambiguous:** No approved create/read path, metric-to-domain mapping (notably temperature), wire names, requiredness, numeric precision/ranges, contexts, source/device identity model, acquisition/entry method values, quality authority, record timestamp semantics, or response ID. UI positive-number and future-time checks are not server validation requirements.
4. **Exact decision:** Approve each metric's exact request/response fields and requiredness; accepted units and whether conversion is ever allowed; numeric precision/ranges without implying clinical thresholds; timestamp meaning and historical/future bounds; permitted contexts, provenance/source/device and quality vocabularies; domain mapping; and create/read operations. Decide whether records are append-only and how a correction is represented, if at all.
5. **Dependencies:** Backend observation models/schemas/repositories/routes do not exist. Former frontend intake proposals (`entry.ts`, `entryApi.ts`, `entryValidation.ts`, `vitalForms.ts`, and `VitalEntryForm.tsx`) were removed because they were disconnected/unapproved; [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx) remains an unavailable presentation screen, not an intake endpoint.

### D-06 — Sleep duration, sleep quality, and fatigue records

1. **Feature/endpoint:** Sleep/fatigue data intake, history, trends, and assessment inputs.
2. **Current definition:** **CONFIRMED:** sleep duration, sleep quality, and fatigue are distinct; a sleep total alone does not measure fatigue or a disorder. `sleep_duration` is a requested trend metric, with no interpolation and empty-day null aggregates. **PROPOSED:** the UI uses a `sleep` trend alias, `sleep_total`, hours, `reporting_date`, and optional `includes_naps`.
3. **Missing/ambiguous:** No approved sleep intake route/schema; duration unit/storage precision; UTC reporting-date assignment; sleep interval versus total semantics; nap inclusion; sleep quality/fatigue scales; source/provenance; valid/missing/stale rules; or whether/how those inputs relate to assessment.
4. **Exact decision:** Decide which sleep/fatigue facts may be recorded and their exact fields, units, date/time semantics, nap treatment, scales and allowed values. Approve mapping from `sleep_duration` to wire metric and trend series, and whether any sleep/fatigue input is eligible for a DEMO1 rule.
5. **Dependencies:** Backend sleep schema/model/service/routes do not exist. Frontend [trends.ts](./frontend/src/types/trends.ts), [trendsApi.ts](./frontend/src/data/trendsApi.ts), [history.ts](./frontend/src/types/history.ts), and the unavailable sleep panel in [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx).

### D-07 — Daily check-ins and psychological privacy

1. **Feature/endpoint:** Create/list/read daily psychological or wellbeing check-ins.
2. **Current definition:** **CONFIRMED:** psychological notes are restricted; they must not leak into crew-wide views, generic notifications, analytics, or logs. Self-reported check-ins are not diagnoses. **PROPOSED:** mood/stress concepts, optional private notes, and separate list/detail access; no exact schema is approved.
3. **Missing/ambiguous:** No approved rating scales, questions, scale bounds, check-in frequency/date semantics, required fields, note field, actor permissions, list/detail roles, retention/deletion policy, or privacy access DTO. Frontend detail access values are not approved API enums.
4. **Exact decision:** Approve the exact check-in prompts/fields/scales and their interpretation limits; who may create, list, and read each field; which fields are restricted; whether notes are allowed; retention/correction rules; and list/detail projections that cannot leak private content.
5. **Dependencies:** Backend check-in schemas/models/routes and privacy-aware repository/service do not exist. Frontend [history.ts](./frontend/src/types/history.ts), [historyApi.ts](./frontend/src/data/historyApi.ts), [historyModel.ts](./frontend/src/lib/historyModel.ts), [RecordDetails.tsx](./frontend/src/components/history/RecordDetails.tsx), and [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx).

### D-08 — Reported symptoms

1. **Feature/endpoint:** Create/list/read reported symptoms; possible timeline or assessment projection.
2. **Current definition:** **CONFIRMED:** reported symptoms do not diagnose infection or measure immune function; private symptom notes must not be shared. **PROPOSED:** symptom code/description, severity, onset and recorded times are mentioned as possible fields but are not accepted schema.
3. **Missing/ambiguous:** No symptom vocabulary, severity scale, free-text policy, timing semantics, actor/role, privacy class per field, retention/correction policy, route, response, or explicit exclusion from/eligibility for assessment and shared timeline.
4. **Exact decision:** Approve allowed structured symptom codes and any scale, whether free text is collected, exact timestamp fields, author/scope permissions, private-field treatment in list/detail/timeline, and explicitly whether symptoms may influence any approved rule (without diagnostic inference).
5. **Dependencies:** Backend symptom model/schema/service/routes do not exist. Frontend has only unavailable UI and category proposals in [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx), [history.ts](./frontend/src/types/history.ts), and [historyModel.ts](./frontend/src/lib/historyModel.ts).

### D-09 — Support requests and delivery lifecycle

1. **Feature/endpoint:** Create/read support requests; optional offline queue, transmit, acknowledgement, or other lifecycle actions.
2. **Current definition:** **CONFIRMED:** a support request is distinct from a check-in. Never claim it reached Earth or a responder unless the backend confirms an acknowledged state. Private request text must not leak. **PROPOSED:** `saved_on_device`, `queued`, `transmitted`, `acknowledged` transitions.
3. **Missing/ambiguous:** No request body, recipient, urgency, identity, actor, state enum, transition graph, persistence boundary, offline behavior, delivery acknowledgement source, retry behavior, or route. “Transmitted” could be misconstrued as delivery.
4. **Exact decision:** Decide whether support requests are in scope; approve request fields and recipients, who may create/read them, exact states and legal transitions, what evidence constitutes acknowledgement, offline storage/queue behavior, failure/retry handling, retention, and user-facing wording. Prohibit claims of external receipt unless an explicit backend acknowledgement exists.
5. **Dependencies:** Backend support-request model/service/routes do not exist. There is no live frontend support adapter; the form remains unavailable in [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx). Related proposal: [data-intake-contract-proposal.md](./backend/docs/data-intake-contract-proposal.md).

### D-10 — Assessment envelope, coverage, and snapshots

1. **Feature/endpoint:** Read and evaluate/refresh a six-domain assessment; overview/profile projections.
2. **Current definition:** **CONFIRMED:** six canonical domains; statuses `normal`, `attention`, `urgent`, `insufficient_data`; separate status and coverage; each result has status, coverage, reasons, evidence IDs, missing fields, latest time; envelope has `evaluated_at`, AX1, DEMO1, `demo_only`, and synthetic marker. Reasons include rule ID, plain-language message, observed condition/value, configured comparison, next step and limitation. Explain what cannot be concluded. Assessment is deterministic and snapshots evidence IDs and applicable baseline/ruleset version. No numerical rule yields urgent; urgent is reserved for an explicit immediate-help/support request as defined by the contract. **PROPOSED/BLOCKED:** the illustrative sample's `coverage` value and rule ID are placeholders, not approved enums or executable rules.
3. **Missing/ambiguous:** Exact coverage enum/definitions; overall status/coverage aggregation; full JSON types/nullability; baseline ID/version property placement; evidence ID type and resolvability; snapshot ID/persistence/retention; evaluation trigger (automatic or explicit); meaning of `latest_at`; whether a missing rule/domain is insufficient data or another approved state; and how immediate-help is represented.
4. **Exact decision:** Approve coverage enum and state semantics independent of severity; domain and overall aggregation; exact response schema and snapshot retention; evidence/baseline references; evaluation trigger and refresh behavior; and a precise immediate-help event contract. Do not define a numerical urgent outcome.
5. **Dependencies:** Backend assessment/rules/snapshot services and schemas do not exist. Frontend [assessment.ts](./frontend/src/types/assessment.ts), [assessmentApi.ts](./frontend/src/data/assessmentApi.ts), [overview.ts](./frontend/src/types/overview.ts), [overviewApi.ts](./frontend/src/data/overviewApi.ts), [AssessmentPage.tsx](./frontend/src/pages/AssessmentPage.tsx), and [assessmentModel.ts](./frontend/src/lib/assessmentModel.ts).

### D-11 — DEMO1 rule definitions and data eligibility

1. **Feature/endpoint:** Assessment evaluation, status/reason generation, alert creation, and evidence selection.
2. **Current definition:** **CONFIRMED:** implement only exact documented DEMO1 rules if their complete definitions exist in the approved project rule source; do not invent numerical values. Named candidates are `CV1`, `CV2`, `IM1`, `SL1`, `PS1`, `SP1`, `SP2`, `MS1`, `MS2`, `IM2`, `RA1`. Missing/ambiguous rules are blocked. Missing, stale, suspect, or incomplete data cannot become Normal; normal only means no configured demo condition triggered with sufficient current valid inputs. It is not a medical determination.
3. **Missing/ambiguous:** The named IDs do not supply complete definitions. Inputs, quantities/units, freshness windows, comparison boundaries, baseline use, valid/suspect rules, rule-to-domain mapping, reason text, next steps, limitations, and boundary cases remain absent or ambiguous.
4. **Exact decision:** A scientific/product owner must provide and approve each executable, versioned rule with input fields, units, eligibility/provenance/quality, freshness and time window, exact comparison/boundaries, behavior for missing/stale/suspect inputs, output status/coverage interaction, reason, next step, limitation, and tests. Explicitly mark each absent rule blocked; do not substitute proposal examples.
5. **Dependencies:** Backend ruleset source and assessment evaluator do not exist. Frontend renders backend-provided details through [assessment.ts](./frontend/src/types/assessment.ts), [assessmentModel.ts](./frontend/src/lib/assessmentModel.ts), and [AssessmentPage.tsx](./frontend/src/pages/AssessmentPage.tsx). Source proposals: [assessment-engine-contract-proposal.md](./backend/docs/assessment-engine-contract-proposal.md) and [backend-developer-2-rules-proposal.md](./backend/docs/backend-developer-2-rules-proposal.md).

### D-12 — Baselines and version references

1. **Feature/endpoint:** Reviewer activation/read of baselines and assessment/trend references to a baseline.
2. **Current definition:** **CONFIRMED:** baseline eligibility requires at least three valid pre-mission observations on three distinct UTC dates; assessment snapshots retain the exact baseline version used. Candidate metrics are heart rate, blood pressure, and body temperature. **PROPOSED:** a baseline statistic, profile display, and version fields.
3. **Missing/ambiguous:** Calculation statistic, precision/rounding, comparability definition, source/device/context grouping, freshness and suspect exclusions, activation authority/path, replacement/deactivation/history, response schema, and exact assessment reference field.
4. **Exact decision:** Approve metric-specific calculation and precision, comparability/eligibility beyond the confirmed minimum, exclusions, activation/replacement/deactivation lifecycle, version numbering and retrieval, authorized roles, and the exact immutable ID/version reference stored in each assessment snapshot.
5. **Dependencies:** Backend baseline model/service/routes do not exist. Frontend profile summary types [crew.ts](./frontend/src/types/crew.ts), trend types [trends.ts](./frontend/src/types/trends.ts), and [baseline-trend-contract-proposal.md](./backend/docs/baseline-trend-contract-proposal.md).

### D-13 — Trends and aggregation details

1. **Feature/endpoint:** Get daily trends for heart rate, blood pressure, body temperature, and sleep duration.
2. **Current definition:** **CONFIRMED:** those four metric concepts; inclusive UTC calendar dates, maximum 31 days; one daily value per date; empty days count zero with null aggregates; no interpolation. **PROPOSED:** query names, response series/stat field names, summary strings, and baseline projection.
3. **Missing/ambiguous:** API path and auth; exact metric wire names (`temperature`/`body_temperature`, `sleep`/`sleep_duration` conflict); mean/min/max definition and rounding; BP component grouping; source/context eligibility (e.g. resting-only); count denominator; excluded/suspect counts and whether counts are per metric or record; baseline statistic/reference; handling of invalid or stale values; exact date-boundary implementation and range errors.
4. **Exact decision:** Approve canonical metric keys and series for each metric; aggregation, grouping, rounding and count scope; eligible records and context; excluded/suspect counts; baseline representation; query/response schema and access policy. Preserve the 31-day inclusive range, empty-date nulls, and no interpolation.
5. **Dependencies:** Backend trend query/service does not exist. Frontend [trends.ts](./frontend/src/types/trends.ts), [trendsApi.ts](./frontend/src/data/trendsApi.ts), [TrendsPage.tsx](./frontend/src/pages/TrendsPage.tsx), and [TrendTable.tsx](./frontend/src/components/trends/TrendTable.tsx).

### D-14 — History, pagination, sorting, and record details

1. **Feature/endpoint:** Paginated history list and explicit record detail for all supported categories.
2. **Current definition:** **CONFIRMED:** history must not silently fill missing values; private notes/free text are excluded from general lists. **PROPOSED:** categories `vitals`, `sleep`, `checkins`, `support_requests`, `symptoms`, `exercise`, `radiation`; candidate UTC `from` inclusive/`to` exclusive filters; `{items,total,limit,offset}`; newest-first ordering; UI page size 20; `private_fields.access` values.
3. **Missing/ambiguous:** Route/query shape, supported categories, category-specific list fields, filters, default/max page size, offset versus cursor, deterministic tie-breaker, total semantics, inclusive/exclusive instant boundaries, private detail authorization, field omission versus access metadata, and ID scoping.
4. **Exact decision:** Approve categories and list/detail schema per resource; default/max pagination and stable ordering/tie-break; filter and time-boundary semantics; totals; role-specific private detail; and whether inaccessible detail is 403 or 404. Confirm no private free text appears in lists, overview, timeline, notifications, analytics, or logs.
5. **Dependencies:** Backend history repository/routes and resource-specific projections do not exist. Frontend [history.ts](./frontend/src/types/history.ts), [historyApi.ts](./frontend/src/data/historyApi.ts), [historyModel.ts](./frontend/src/lib/historyModel.ts), [HistoryPage.tsx](./frontend/src/pages/HistoryPage.tsx), [HistoryTable.tsx](./frontend/src/components/history/HistoryTable.tsx), and [RecordDetails.tsx](./frontend/src/components/history/RecordDetails.tsx).

### D-15 — Alerts, acknowledgement, resolution, and notifications

1. **Feature/endpoint:** Create/deduplicate/list alerts; acknowledge or resolve; any notification delivery.
2. **Current definition:** **CONFIRMED:** create alerts only from attention/urgent conditions defined by DEMO1; deduplicate by astronaut/rule/scope and update evidence/last-seen; include rule version, triggering evidence, reason, next step, and limitation. Acknowledged is distinct from resolved; acknowledgement does not clear an alert. No external notification or responder contact may be implied. **PROPOSED/BLOCKED:** lifecycle enum, action routes, actors and DTO field names.
3. **Missing/ambiguous:** Exact scope key and dedupe/reopen behavior, alert ID/schema, state values and transitions, acknowledgement/resolution criteria, actor/reason/timestamps/audit, allowed roles, read/list filters, and whether notifications exist at all. Rules remain blocked until D-11.
4. **Exact decision:** Approve alert state enum and transition graph; deduplication scope, update/reopen behavior, evidence snapshot semantics, who can acknowledge/resolve and required audit fields; list/read/action routes; and explicitly choose no external notifications or specify a real delivery/acknowledgement mechanism without success-shaped claims.
5. **Dependencies:** Backend alert model/service/routes do not exist. Frontend has only assessment concern displays in [Concerns.tsx](./frontend/src/components/overview/Concerns.tsx) and [AssessmentPage.tsx](./frontend/src/pages/AssessmentPage.tsx); no alert API adapter/notification service exists. Source: [exercise-radiation-alert-contract-gaps.md](./backend/docs/exercise-radiation-alert-contract-gaps.md).

### D-16 — Exercise plans and completion logs

1. **Feature/endpoint:** Reviewer-created synthetic exercise plans; crew completion logs; history and cross-domain context.
2. **Current definition:** **CONFIRMED:** requested capability includes synthetic plans and completion logs where contracted; one exercise log should be reusable across cardiovascular, musculoskeletal, and wellbeing views. Exercise/adherence/activity context is not direct measurement of bone density, muscle mass, strength, or fitness. **PROPOSED:** no approved field schema or lifecycle exists.
3. **Missing/ambiguous:** Plan/log fields, activity/adherence vocabulary, units and dates, author roles, assignment, completion/correction lifecycle, synthetic marker authority, references from other domain views, and assessment eligibility.
4. **Exact decision:** Approve plan and completion-log schemas, allowed activity/adherence values, actor permissions, assignment and lifecycle, timestamp semantics, synthetic enforcement, one shared log identity/reference model, and whether any data may contribute to an approved rule (without claiming direct body measurement).
5. **Dependencies:** Backend exercise models/services/routes do not exist. Frontend entry is explicitly unavailable in [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx); exercise is only a proposed history category in [history.ts](./frontend/src/types/history.ts). Source: [exercise-radiation-alert-contract-gaps.md](./backend/docs/exercise-radiation-alert-contract-gaps.md).

### D-17 — Radiation intervals and selected device stream

1. **Feature/endpoint:** Create/list/read synthetic interval records for one profile-selected device stream.
2. **Current definition:** **CONFIRMED:** do not infer personal radiation exposure from wearables, heart rate, or solar-event illustrations; do not relabel Hp(10) as effective or absorbed dose. The requested interval capability is synthetic and constrained to a selected stream. **PROPOSED/BLOCKED:** `personal_dose_equivalent_hp10`, `mSv`, interval start/end, device/stream identity, external record ID, provenance, quality, and `review_requested` appear as candidate fields; exact field semantics remain unapproved. Cumulative snapshots and dose rates are excluded by the stated MVP requirement, but schema-level rejection needs approved discrimination rules.
3. **Missing/ambiguous:** Quantity identifier/wire spelling and precise meaning, unit representation/precision, interval endpoint inclusivity and adjacency, selected stream setup/change lifecycle, device identity, external ID uniqueness, provenance/quality vocabularies, review-request meaning, overlap scope/policy, role, and response schema. No numerical radiation rule is approved.
4. **Exact decision:** Confirm or reject each candidate field and define quantity/unit semantics without relabeling; approve interval boundaries, precision, overlap/duplicate policy, stream selection, device/external ID identity, provenance/quality and `review_requested`; define how the API distinguishes prohibited cumulative snapshots/rates; state whether any mission-specific dose threshold is explicitly in scope. Until confirmed, do not implement radiation intake or assessment rules.
5. **Dependencies:** Backend radiation model/service/routes do not exist. Frontend category is unavailable in [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx) and only a proposed category in [history.ts](./frontend/src/types/history.ts). Source: [exercise-radiation-alert-contract-gaps.md](./backend/docs/exercise-radiation-alert-contract-gaps.md).

### D-18 — Cross-domain timeline and convergence

1. **Feature/endpoint:** Chronological event timeline and optional convergence markers.
2. **Current definition:** **CONFIRMED:** requested event kinds include sleep, fatigue, stress, exercise, symptoms, and radiation where permitted; shared timeline must omit private psychological/symptom notes; a convergence marker is temporal co-occurrence, never causation; expose synthetic demo event data only. **PROPOSED/BLOCKED:** no route, event schema, time filters, page shape, or convergence-window value is approved.
3. **Missing/ambiguous:** Event eligibility, one or multiple timestamps, ordering and tie-break, event/domain labels, provenance/quality/evidence references, profile scope/roles, synthetic-only enforcement, pagination/range, whether computed or persisted, minimum domains, configured window/boundaries, deduplication, and exact non-causal wording.
4. **Exact decision:** Approve event sources/fields and eligible synthetic records; timestamps, ordering, filters/pagination and access; privacy projection/redaction; query projection versus stored resource; and convergence configuration (window, domain count, boundaries, grouping/deduplication) with required non-causal language. Do not choose an arbitrary window.
5. **Dependencies:** Backend timeline service/schema/routes do not exist. No timeline page/adapter exists; contributing frontend pages include [HistoryPage.tsx](./frontend/src/pages/HistoryPage.tsx) and [AddDataPage.tsx](./frontend/src/pages/AddDataPage.tsx). Source: [timeline-integration-contract-gaps.md](./backend/docs/timeline-integration-contract-gaps.md).

### D-19 — Duplicate submissions, idempotency, and retry outcomes

1. **Feature/endpoint:** All create operations, especially observation intake and support/exercise/radiation submissions.
2. **Current definition:** **CONFIRMED:** retries must not silently duplicate a record where idempotency is approved; persistence must be transaction-safe. **PROPOSED:** body field `client_record_id` (UUID), replay same payload to original record, conflict on changed payload. `Idempotency-Key` header is an unadopted alternative. The browser generates a stable UUID per form submission, but that is not server policy.
3. **Missing/ambiguous:** Which operations require idempotency, header versus body key, key scope (actor/profile/resource), payload canonicalization, retention, behavior after expiration, same-key/different-payload status, concurrent retries, transaction boundary, and whether failed/uncertain client requests reuse the key.
4. **Exact decision:** Select one key transport and resource coverage; define namespace/scope, canonical request comparison, replay response, conflict status/body, retention and concurrency guarantees, and behavior after a timeout or partial failure. Specify which frontend retries preserve a key and which user edits create a new one.
5. **Dependencies:** Backend idempotency storage/constraints and create services do not exist. Former frontend retry handling and demo adapter were removed with the disconnected intake UI; no current product retry state is implemented.

### D-20 — Units, timestamp meanings, validation, provenance, and quality

1. **Feature/endpoint:** All intake, filter, response, trend, assessment, and history schemas.
2. **Current definition:** **CONFIRMED:** units are distinct from measured quantities; UTC-aware timestamps and UTC calendar dates are distinct; missing/null must not become zero; do not interpolate; suspect data is excluded from assessment/baselines as specified; bad/missing provenance or quality cannot silently become valid. Foundation validation errors are sanitized and use field paths. **PROPOSED:** `measured_at`, `recorded_at`, `observed_at`, `reporting_date`, `source_label`, `device_id`, `quality`, `acquisition`, `entry_method`, and `context` with candidate enums.
3. **Missing/ambiguous:** Canonical field names and per-resource timestamp meaning; RFC3339 precision/offset acceptance; historical/future bounds; date-to-UTC mapping; numeric precision and allowed ranges; metric/unit pairs and conversions; provenance authority and device registry; valid/suspect/invalid states and who assigns/reviews them; freshness windows; per-field required/null semantics; stable validation codes and product status mapping.
4. **Exact decision:** Publish a per-resource field dictionary with type, requiredness/nullability, unit, time meaning, privacy, validation, source and domain. Define accepted timestamp grammar and bounds, unit whitelist/conversion policy, quality/provenance ownership and allowed enums, and error mapping/codes without echoing submitted private text. Keep unapproved clinical/scientific bounds blocked.
5. **Dependencies:** Backend Pydantic schemas, validators, repositories and resource services do not exist; foundation handlers are in `backend/app/main.py` and `backend/app/core/middleware.py`. Former intake proposals were removed; remaining history/trend presentation types are not wire schemas.

### D-21 — Resource mutation, correction, retention, and audit

1. **Feature/endpoint:** Update/delete/correction/supersession for profiles and stored records; retention and audit.
2. **Current definition:** **CONFIRMED:** observation create/read was requested; no update/delete permission was established. The UI treats history as append-only, but that is not by itself an approved backend lifecycle. Private fields must not be logged.
3. **Missing/ambiguous:** Whether records are immutable; how errors are corrected; whether superseding records preserve prior evidence; profile deactivation/deletion; retention/erasure/export; audit actor/time; and what assessment/alert snapshots retain after source-data changes.
4. **Exact decision:** Approve per-resource create/read/update/delete/correction/supersession and retention rules, including audit metadata and snapshot/evidence preservation. If no mutation is approved, state append-only behavior explicitly and define how erroneous records are flagged without silent replacement.
5. **Dependencies:** No domain records or lifecycle services exist in backend. Frontend currently says history cannot be edited/deleted in [HistoryPage.tsx](./frontend/src/pages/HistoryPage.tsx); this is current UI behavior, not a fully approved persistence policy.

### D-22 — Synthetic-only boundary, seed/provisioning, and demo mode

1. **Feature/endpoint:** Data creation, listing, assessment, fixture use, and first-user/profile provisioning.
2. **Current definition:** **CONFIRMED:** demo records are fictional, visibly synthetic/demo; assessment envelope is demo-only and synthetic. The backend clean-start requirement leaves schema only, with no seed users/profiles/observations. **HISTORICAL PROPOSAL:** frontend fixtures and local demo state previously simulated records and user access; that active behavior was removed.
3. **Missing/ambiguous:** Whether any real/non-synthetic data may be accepted; server enforcement of `is_synthetic`; which roles may create synthetic data; seed/provisioning process and environment guard; fixture ownership and route isolation; whether production deployments are supported.
4. **Exact decision:** Decide whether this prototype is strictly synthetic-only in every environment; define server-controlled synthetic labeling and reject/allow policy for non-synthetic payloads; authorize synthetic profile/record provisioning and specify a safe explicit command/process; separate browser demo fixtures from server truth.
5. **Dependencies:** Backend has only schema-only migration and no seed command/product resource. Frontend demo mode, product fixtures, and demo adapters were removed; illustrative design assets and research content are not active product records. Authentication remains unimplemented.

### D-23 — Error outcomes and frontend retry policy

1. **Feature/endpoint:** All product failures, validation, conflict, authorization, idempotent replay, and client retries.
2. **Current definition:** **TECHNICAL STANDARDIZATION:** foundation Problem Details and sanitized field errors are adopted. **CONFIRMED:** submitted private values must not be echoed. **PROPOSED:** frontend maps statuses to `unauthorized`, `forbidden`, `not_found`, `validation`, `server`, etc.; no product status mapping is adopted.
3. **Missing/ambiguous:** Product-specific 400/401/403/404/409/422/429/5xx mapping; stable business error codes; details for duplicate/idempotency conflicts; whether inaccessible IDs are concealed; retryability of each error; and distinction between save failure and an assessment refresh failure.
4. **Exact decision:** Approve status and stable error-code mapping per operation, field path format, conflict/idempotent replay response, safe human-readable messages, 403/404 policy, and retryability. Preserve the foundation request ID and never include private text or submitted values in errors/logs.
5. **Dependencies:** Backend foundation error formatting in `backend/app/main.py` and `backend/app/core/middleware.py`; frontend [common.ts](./frontend/src/data/common.ts), [errors.ts](./frontend/src/data/errors.ts), [http.ts](./frontend/src/data/http.ts), and [AssessmentPage.tsx](./frontend/src/pages/AssessmentPage.tsx). The former intake form was removed; product error behavior remains unimplemented.

## Prioritized decision checklist

Decisions are ordered by dependency: downstream schema and UI work cannot safely precede the identity/scope and canonical field choices.

1. **Choose product mode and identity:** authenticated server versus local-only synthetic demo; if authenticated, identity provider, session transport/lifecycle, provisioning, roles, and CSRF if cookie-based. (D-01, D-22)
2. **Approve authorization:** role/operation/profile matrix, profile assignment, private-field access, and 403-versus-404 disclosure. (D-02)
3. **Approve profile resource:** provisioning authority, ID and profile fields, list/read routes, assignment filters, and profile lifecycle. (D-03)
4. **Approve common API shapes:** canonical product paths/methods, wire casing, success envelope, request/response schemas, and OpenAPI inventory. (D-04)
5. **Approve data foundations:** per-resource timestamp semantics, units/quantities, validation/nullability, provenance/quality vocabularies, synthetic enforcement, and error mapping. (D-05, D-06, D-20, D-22, D-23)
6. **Approve record families:** vital and sleep schemas first, then check-in/symptom privacy, support request lifecycle, exercise plan/log, and radiation interval semantics. (D-05–D-09, D-16–D-17)
7. **Approve persistence and retries:** idempotency key semantics, transaction/replay behavior, mutation/correction, retention, and audit. (D-19, D-21)
8. **Approve assessment prerequisites:** coverage enum/aggregation, exact executable DEMO1 rule definitions, data eligibility/freshness, baseline algorithm/version references, and snapshot/evaluation lifecycle. Keep every undefined rule blocked. (D-10–D-12)
9. **Approve derived read models:** trend aggregations/counts, history filters/pagination/order/detail projection, and overview composition. (D-04, D-13–D-14)
10. **Approve alert and timeline lifecycle:** alert states/actors/deduplication and any notification behavior; timeline privacy, event selection, and convergence window/configuration. (D-15, D-18)
11. **Update contract and traceability:** record each decision in [API_CONTRACT.md](./API_CONTRACT.md), update its implementation traceability and generated OpenAPI requirements, then align backend schemas, frontend adapters/types, and tests. Until then, leave the affected UI explicitly unavailable rather than guessing.

## Local MVP closure mapping

This appended closure mapping applies only to the local, synthetic-only MVP in [API_CONTRACT_IMPLEMENTATION_ADDENDUM.md](./API_CONTRACT_IMPLEMENTATION_ADDENDUM.md) and the detailed [local MVP decision record](./docs/ASTROORBITX_LOCAL_MVP_DECISIONS.md). The historical blocker text above is preserved. `RESOLVED_FOR_LOCAL_MVP` means the cited source is adopted only within the stated scope; excluded features have no endpoint and must remain explicitly unavailable. No item is still blocked for this MVP. Human decisions required before any future scope expansion are listed in [HUMAN_REVIEW_REQUIRED.md](./docs/HUMAN_REVIEW_REQUIRED.md); they do not block the resolved MVP operations.

| Decision | Outcome | Closure |
|---|---|---|
| D-01 | RESOLVED_FOR_LOCAL_MVP | Single local workspace; no identity, accounts, credentials, sessions, or authentication. |
| D-02 | RESOLVED_FOR_LOCAL_MVP | No roles, assignment, or protected profile scope; profile IDs select synthetic resources only. Loopback-only; no public, multi-user, or real-person use. |
| D-03 | RESOLVED_FOR_LOCAL_MVP | Profile list/read only; explicit profile-only development provisioning; no profile mutation API. |
| D-04 | RESOLVED_FOR_LOCAL_MVP | Adopt only the six addendum-defined product paths and direct snake_case JSON shapes; all other candidate product operations are out of scope. |
| D-05 | RESOLVED_FOR_LOCAL_MVP | Heart rate, paired blood pressure, and body-temperature create/list schemas and units as specified in the decision record; no clinical interpretation. |
| D-06 | RESOLVED_FOR_LOCAL_MVP | Sleep-duration create/list only; sleep quality, fatigue, scales, and derived interpretation are out of scope. |
| D-07 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No check-in, rating, psychological scale, private note, or related UI success state. |
| D-08 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No symptom or diagnosis record or endpoint. |
| D-09 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No support-request content, queue, transmission, acknowledgement, or delivery claim. |
| D-10 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No assessment endpoint, snapshot, coverage response, or `insufficient_data`/`not_configured` placeholder. |
| D-11 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No executable DEMO1 rule, threshold, status inference, or clinical/scientific rule. |
| D-12 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No baseline activation, calculation, storage, or baseline reference. |
| D-13 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No trends endpoint or aggregation; confirmed trend concepts do not supply a complete route/filter/aggregation/response contract. |
| D-14 | RESOLVED_FOR_LOCAL_MVP | Exact pagination and ordering apply to profile and the two resource collections only; generic combined history and record-detail APIs are out of scope. |
| D-15 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No alert lifecycle, acknowledgement, resolution, notification, or responder contact. |
| D-16 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No exercise plan, completion log, or adherence record. |
| D-17 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No radiation quantity, interval, stream, dose, or radiation assessment record. |
| D-18 | OUT_OF_SCOPE_FOR_LOCAL_MVP | No combined timeline, convergence marker, or cross-domain aggregation. |
| D-19 | RESOLVED_FOR_LOCAL_MVP | `client_record_id` body key, profile/resource scoping, replay and conflict behavior apply only to the two included create operations. |
| D-20 | RESOLVED_FOR_LOCAL_MVP | Exact supported field types, units, timestamps, strict enums, positive-value validation, and sanitized errors are limited to the included schemas. |
| D-21 | RESOLVED_FOR_LOCAL_MVP | Included records are append-only through the API; no update/delete/export route or retention promise is made. |
| D-22 | RESOLVED_FOR_LOCAL_MVP | Synthetic-only data; empty startup; explicit profile-only provisioning; product routes disabled in production. |
| D-23 | RESOLVED_FOR_LOCAL_MVP | Problem Details, statuses, request IDs, sanitized validation/conflict errors, and no automatic create retries for included operations. |

There are **12 resolved**, **11 out of scope**, and **0 still blocked** decision-register items for this MVP. Future scope expansion still requires the human reviews identified in the decision record; that does not make an excluded capability available now.
