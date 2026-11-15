# AstroOrbitX Local Synthetic MVP Decisions

> **SUPERSEDED (2026-11-15):** this decision record applies only to the former synthetic-only local prototype. The [current API contract](../API_CONTRACT.md) supersedes its scope and exclusions. Retain the compatible technical decisions and exact legacy runtime behavior for traceability only.

**Decision scope:** local localhost-only hackathon MVP; synthetic data only.  
**Decision date:** 2026-11-14.  
**Authority:** the user-approved [AX1 Local Synthetic Prototype Addendum](../API_CONTRACT_IMPLEMENTATION_ADDENDUM.md), with the technical conventions below recorded as project decisions. This record does not claim separate team/API-owner, scientific, clinical, NASA, identity-provider, privacy-policy, external-delivery, or production-security approval.

## 1. Outcome summary

| Outcome | Count |
|---|---:|
| `RESOLVED_FOR_LOCAL_MVP` | 12 |
| `OUT_OF_SCOPE_FOR_LOCAL_MVP` | 11 |
| `STILL_BLOCKED` | 0 |

The six included product operations are:

1. `GET /api/v1/profiles`
2. `GET /api/v1/profiles/{profile_id}`
3. `POST /api/v1/profiles/{profile_id}/observations`
4. `GET /api/v1/profiles/{profile_id}/observations`
5. `POST /api/v1/profiles/{profile_id}/sleep-records`
6. `GET /api/v1/profiles/{profile_id}/sleep-records`

The operational endpoints `GET /api/v1/health` and `GET /api/v1/ready` remain part of the existing foundation and are specified in §8. They do not add product or health-data capabilities.

## 2. Scope boundary and AX1 compatibility check

- The service is a single local workspace bound to `127.0.0.1`, not a public or multi-user service. No real account, identity, session, role, assignment, or authorization grant exists.
- `profile_id` in a path identifies the synthetic resource to read/write; it is not an identity credential or an authorization grant. The API makes no claim to satisfy authenticated profile assignment for a shared service. A shared/networked deployment or any real-person/health-data use is outside this decision and requires a separately approved identity, authorization, privacy, and security contract.
- Product routes are disabled when `ASTROORBITX_APP_ENVIRONMENT=production`. Operational health/readiness routes remain available under their existing configuration.
- Profiles and records are always synthetic. The database starts empty; the explicit development provisioning command creates only a profile. No observations or sleep records are seeded.
- No included operation evaluates a clinical or scientific condition, produces an assessment, or infers diagnosis, risk, immune status, sleep quality/fatigue, exercise benefit, or radiation exposure.
- The canonical domain identifiers remain exactly `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, and `radiation`; aliases are not canonical IDs. No included operation emits a domain assessment.
- For any future assessment, status and coverage are separate dimensions. Missing, stale, suspect, or incomplete inputs must never become zero or `normal`; no numerical rule may produce `urgent`. No clinical or NASA threshold is introduced by this local MVP.
- Private psychological or support content is not collected by included operations and must not appear in shared views, notifications, analytics, or logs. Support delivery and acknowledgement are not claimed. No radiation dose field or unit is included.
- This scope does not conflict with any included AX1-confirmed metric, unit, UTC, null/missing-data, or non-inference behavior. Confirmed authenticated profile-scope requirements are not represented as satisfied: authenticated/shared access is not part of this single-workspace MVP.
- The addendum permits `insufficient_data` or `not_configured` only if an exact response is documented there as agreed behavior. It documents neither as an assessment response; therefore no assessment route or placeholder response is included.

## 3. Project-selected technical conventions

The following are **project decisions for this MVP**, not claims that every convention was already an AX1 fact. They are selected only where an existing contract/proposal provides the concept and no competing source supplies a different approved shape.

| Concern | Project decision | Basis and rationale |
|---|---|---|
| API namespace | `/api/v1` | The foundation standardizes this prefix; the addendum gives the six canonical operations under it. |
| Wire representation | `application/json` UTF-8 JSON with `snake_case` property names for requests and successful responses | The addendum defines the exact field vocabulary in snake_case, and the included schemas use that vocabulary. No competing approved wire casing exists. |
| Success envelope | No extra `data`/`result` wrapper; return each declared object directly | Existing foundation health schemas and the addendum's `{items, limit, offset}` collection shape are direct JSON responses. |
| Resource identifiers | UUID for profile, observation, sleep-record, and `client_record_id` identifiers | The addendum explicitly defines UUID profile IDs and UUID client idempotency IDs; response `id` concepts exist for persisted resources. UUID record IDs are selected as a conventional project detail, not asserted as an AX1-confirmed requirement. |
| Pagination | Query `limit` default 20, range 1–100; `offset` default 0, minimum 0 | Existing addendum convention; applies only to the three collection operations. |
| Collection order | `created_at DESC, id DESC` | Addendum convention; stable ID tie-breaker ensures deterministic paging. |
| Create status/replay marker | First create returns `201` with `replayed: false`; identical retry returns `200` with `replayed: true`; changed retry returns `409` | **Selected project decision**, not an addendum fact. Existing route behavior, schemas, and tests provide the concept; this closes the ambiguity recorded in [IMPLEMENTATION_API_REFERENCE.md](./IMPLEMENTATION_API_REFERENCE.md) §6.2–§6.3. |
| Errors/correlation | RFC 9457 `application/problem+json`; `X-Request-ID`; sanitized field errors | Existing foundation convention. No request values are echoed. |
| Create idempotency | Body `client_record_id`, scoped by profile and resource type; no `Idempotency-Key` header | Explicit addendum convention. Same normalized request replays original resource; changed request conflicts. |
| Mutation | Append-only API; no update/delete operation | Explicit addendum exclusion. No retention period or export guarantee is promised. |

## 4. Shared types, validation, and error schema

### 4.1 Scalar and timestamp conventions

- UUIDs are serialized as canonical UUID strings.
- JSON measurement values are finite numbers, not strings or booleans. A supported vital value must be greater than zero; no clinical/physiological upper or lower threshold is applied.
- `measured_at` is an RFC3339 instant with an explicit UTC designator or numeric offset. The instant is normalized and persisted in UTC, then serialized with `Z`. It means the measurement instant supplied by the caller.
- `created_at` is the server persistence instant, UTC serialized with `Z`; it is not the event/measurement time.
- `reporting_date` is a UTC calendar date encoded as exactly `YYYY-MM-DD`; it is not a timestamp, and the API does not infer a sleep interval or convert a local time.
- `duration_minutes` is a strict positive integer. No additional application-level maximum is specified.
- Required request properties are listed below. Unknown/extra request properties are rejected. Clients may not provide server IDs, profile IDs in the body, server timestamps, or `is_synthetic`.
- POST request bodies use `Content-Type: application/json`; successful response bodies use `application/json`.
- `source` is exactly `manual | simulated_device`. `quality` is exactly `valid | suspect | invalid`. Quality is descriptive only in this MVP; no assessment or exclusion calculation consumes it.
- The `is_synthetic` response property is always the literal `true`.

### 4.2 Problem Details

Errors use `Content-Type: application/problem+json` and have this shape:

```json
{
  "type": "about:blank",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Request validation failed.",
  "request_id": "UUID",
  "errors": [
    {
      "field": "body.value",
      "code": "greater_than",
      "message": "Invalid value."
    }
  ]
}
```

`type`, `title`, `status`, `detail`, and UUID `request_id` are required. `errors` is optional and is present for validation failures; each item has required string `field`, `code`, and `message`. Validation `field` is the dot-separated request location. Messages do not contain submitted values. An `X-Request-ID` response header is returned; a valid UUID request header is normalized, otherwise the server generates a UUID.

Generic HTTP errors do not disclose whether submitted values were valid or repeat record contents. No product `401` or `403` response exists because no identity or role system exists. No stable application-specific error `code` property is added.

## 5. Included product operation schemas

### 5.1 `GET /api/v1/profiles` — `listProfiles`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-03, D-04, D-14, D-20, D-22, D-23).  
**Purpose:** list profiles in this local synthetic workspace.  
**Privacy:** synthetic-only workspace metadata; do not treat it as public or as a real-person privacy classification. `display_name` must be a synthetic label, not a real person's name.  
**Request:** no body. Optional query parameters:

| Name | Type | Required | Default / validation |
|---|---|---:|---|
| `limit` | integer | No | 20; inclusive range 1–100 |
| `offset` | integer | No | 0; minimum 0 |

**Response `200` JSON:**

```json
{
  "items": [
    {
      "id": "UUID",
      "display_name": "Synthetic profile",
      "is_synthetic": true
    }
  ],
  "limit": 20,
  "offset": 0
}
```

`items` is an array of profile objects. Each `id` is a UUID string; `display_name` is a required string of 1–120 characters; `is_synthetic` is required and always `true`. `limit` and `offset` are required integer response properties echoing the effective query values. An empty workspace returns `items: []`; there is no implicit seed and no `total` property.

**Ordering:** `created_at DESC, id DESC`; `created_at` is not exposed in the profile object.  
**Errors:** `422` for invalid query values; `500` generic Problem Details for an unexpected server failure.  
**Persistence/idempotency:** read-only; not applicable.  
**Rationale:** the addendum supplies list/read-only profile capability and pagination; no profile mutation or account-assignment operation is authorized.

### 5.2 `GET /api/v1/profiles/{profile_id}` — `getProfile`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-03, D-04, D-20, D-22, D-23).  
**Request:** required path parameter `profile_id`, UUID string; no query or body.  
**Response `200` JSON:** the profile object, with exactly:

| Property | Type | Required | Validation / meaning |
|---|---|---:|---|
| `id` | UUID string | Yes | Same resource ID as `profile_id` |
| `display_name` | string | Yes | 1–120 characters; synthetic label only |
| `is_synthetic` | literal boolean `true` | Yes | Server-controlled |

**Errors:** `404` for an unknown profile; `422` for a malformed UUID path; `500` generic Problem Details for unexpected server failure.  
**Privacy:** synthetic-only workspace metadata as in §5.1; no real-person privacy classification is made.  
**Persistence/idempotency:** read-only; not applicable.  
**Rationale:** exact profile fields and UUID path parameter follow the addendum. There is no profile detail expansion with mission, reviewer, baseline, radiation, or assessment fields.

### 5.3 `POST /api/v1/profiles/{profile_id}/observations` — `createObservation`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-04, D-05, D-19, D-20, D-21, D-22, D-23).  
**Request path:** required `profile_id` UUID string. No query parameters.  
**Request body:** exactly one of the following discriminator variants; all listed properties are required and additional properties are rejected.

**Heart rate**

```json
{
  "client_record_id": "UUID",
  "metric": "heart_rate",
  "value": 72.5,
  "unit": "bpm",
  "measured_at": "2026-11-14T12:30:00+05:00",
  "source": "manual",
  "quality": "valid"
}
```

**Blood pressure**

```json
{
  "client_record_id": "UUID",
  "metric": "blood_pressure",
  "systolic": 120,
  "diastolic": 80,
  "unit": "mmHg",
  "measured_at": "2026-11-14T07:30:00Z",
  "source": "simulated_device",
  "quality": "suspect"
}
```

**Body temperature**

```json
{
  "client_record_id": "UUID",
  "metric": "body_temperature",
  "value": 37,
  "unit": "°C",
  "measured_at": "2026-11-14T07:30:00Z",
  "source": "manual",
  "quality": "valid"
}
```

| Request property | Type | Required | Unit / validation |
|---|---|---:|---|
| `client_record_id` | UUID string | Yes | Idempotency key in request body |
| `metric` | enum string | Yes | `heart_rate`, `blood_pressure`, or `body_temperature` |
| `value` | finite JSON number | Conditional | Required only for heart rate/body temperature; strictly greater than 0 |
| `systolic` | finite JSON number | Conditional | Required only for blood pressure; strictly greater than 0 |
| `diastolic` | finite JSON number | Conditional | Required only for blood pressure; strictly greater than 0 |
| `unit` | enum string | Yes | `bpm`, `mmHg`, or `°C`, exactly matching `metric` |
| `measured_at` | RFC3339 instant string | Yes | Explicit `Z` or `±HH:MM` offset; input instant normalized to UTC |
| `source` | enum string | Yes | `manual` or `simulated_device` |
| `quality` | enum string | Yes | `valid`, `suspect`, or `invalid` |

For `blood_pressure`, `systolic` and `diastolic` are a required pair; `value` is not allowed. For the other metrics, both blood-pressure fields are not allowed. No conversion, clinical threshold, diagnosis, or status inference is applied.

**Selected project status decision:** first creation returns `201` and includes `replayed: false`; an identical idempotent retry returns `200` and includes `replayed: true`. This resolves the prior response ambiguity recorded in [IMPLEMENTATION_API_REFERENCE.md](./IMPLEMENTATION_API_REFERENCE.md) §6.2–§6.3; it is a project decision informed by the existing route behavior/tests, not an assertion that the addendum explicitly specified those values.

**Response `201` JSON for a newly created record:** required properties are `id` (UUID), `profile_id` (UUID), `client_record_id` (UUID), `metric`, metric-specific value field(s), exact `unit`, `measured_at` (UTC RFC3339 string ending in `Z`), `source`, `quality`, `is_synthetic` (literal `true`), `created_at` (server UTC persistence timestamp ending in `Z`), and `replayed` (`false`). The response variant follows the request `metric`.

**Heart-rate response example:**

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "profile_id": "11111111-1111-4111-8111-111111111111",
  "client_record_id": "22222222-2222-4222-8222-222222222222",
  "metric": "heart_rate",
  "value": 72.5,
  "unit": "bpm",
  "measured_at": "2026-11-14T07:30:00Z",
  "source": "manual",
  "quality": "valid",
  "is_synthetic": true,
  "created_at": "2026-11-14T07:30:01Z",
  "replayed": false
}
```

The blood-pressure response uses the same common properties with `metric: "blood_pressure"`, required `systolic` and `diastolic` numbers, and `unit: "mmHg"` instead of `value`. The body-temperature response uses `metric: "body_temperature"`, `value`, and `unit: "°C"`. All common and variant fields are required; each variant rejects fields belonging only to another variant. On idempotent replay, the original object is returned with `replayed: true` and status `200`.

| Response property | Type | Required | Applies to |
|---|---|---:|---|
| `id` | UUID string | Yes | All variants |
| `profile_id` | UUID string | Yes | All variants |
| `client_record_id` | UUID string | Yes | All variants |
| `metric` | enum string | Yes | Exactly one of the three metrics |
| `value` | finite number > 0 | Yes, conditional | Heart rate and body temperature only |
| `systolic`, `diastolic` | finite numbers > 0 | Yes, conditional | Blood pressure only |
| `unit` | enum string | Yes | Metric-specific exact unit |
| `measured_at` | UTC RFC3339 string ending in `Z` | Yes | Measurement instant |
| `source` | enum string | Yes | `manual` or `simulated_device` |
| `quality` | enum string | Yes | `valid`, `suspect`, or `invalid` |
| `is_synthetic` | literal boolean `true` | Yes | All variants |
| `created_at` | UTC RFC3339 string ending in `Z` | Yes | Server persistence instant |
| `replayed` | boolean | Yes on POST response | `false` on initial creation; `true` on replay; omitted from GET collection items |

**Errors:** `404` unknown profile; `409` same scoped idempotency key with a different normalized payload; `422` malformed UUID, missing/extra fields, wrong metric/unit/value shape, invalid enum, nonpositive/nonfinite number, or timestamp without explicit offset; `500` generic Problem Details for unexpected server failure.

**Privacy:** profile-associated synthetic health-like measurement; no client or server logs may include values or full payloads.  
**Persistence/idempotency:** append-only. Key uniqueness is scoped to `(profile_id, observation resource)`; equivalent instants normalize to UTC before payload comparison. Same normalized payload returns the original record; different content returns `409`. The key and record remain for the lifetime of the local database. No update/delete endpoint exists.

**Rationale:** the addendum and `data-intake-contract-proposal.md` provide the vital metric and idempotency concepts. The proposal's extra `context`, device/source labels, acquisition, and entry-method fields are not adopted because the approved addendum does not define them. Positive finite checks are data-shape validation only, not a clinical range.

### 5.4 `GET /api/v1/profiles/{profile_id}/observations` — `listObservations`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-04, D-05, D-14, D-20, D-22, D-23).  
**Request:** required `profile_id` UUID path parameter; optional `limit` integer (default 20, 1–100) and `offset` integer (default 0, minimum 0); no body or other filters.  
**Response `200` JSON:**

```json
{
  "items": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "profile_id": "11111111-1111-4111-8111-111111111111",
      "client_record_id": "22222222-2222-4222-8222-222222222222",
      "metric": "heart_rate",
      "value": 72.5,
      "unit": "bpm",
      "measured_at": "2026-11-14T07:30:00Z",
      "source": "manual",
      "quality": "valid",
      "is_synthetic": true,
      "created_at": "2026-11-14T07:30:01Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

Each item has the same metric-specific response properties as §5.3, except `replayed` is omitted. The collection has no `total`.

**Ordering:** `created_at DESC, id DESC`. The collection contains all supported vital metric variants, newest persisted first; it is not a trend or history aggregation.

**Errors:** `404` unknown profile; `422` invalid UUID or pagination; `500` generic Problem Details for unexpected server failure.  
**Privacy/idempotency:** synthetic-only, profile-associated health-like data; read-only; no idempotency or public-data classification.  
**Rationale:** list route and collection paging are in the addendum; no date, metric, context, or source filters are adopted.

### 5.5 `POST /api/v1/profiles/{profile_id}/sleep-records` — `createSleepRecord`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-04, D-06, D-19, D-20, D-21, D-22, D-23).  
**Request path:** required `profile_id` UUID string; no query parameters.  
**Request body:** exactly the following required properties; no additional properties:

```json
{
  "client_record_id": "UUID",
  "duration_minutes": 420,
  "reporting_date": "2026-11-14",
  "includes_naps": false,
  "source": "manual",
  "quality": "valid"
}
```

| Request property | Type | Required | Unit / validation |
|---|---|---:|---|
| `client_record_id` | UUID string | Yes | Idempotency key in request body |
| `duration_minutes` | strict integer | Yes | Minutes; must be greater than 0; no additional application maximum |
| `reporting_date` | calendar-date string | Yes | Exact `YYYY-MM-DD`, interpreted as UTC calendar date |
| `includes_naps` | strict boolean | Yes | `true` or `false` |
| `source` | enum string | Yes | `manual` or `simulated_device` |
| `quality` | enum string | Yes | `valid`, `suspect`, or `invalid` |

**Response `201` JSON for a new record:**

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "profile_id": "11111111-1111-4111-8111-111111111111",
  "client_record_id": "22222222-2222-4222-8222-222222222222",
  "duration_minutes": 420,
  "reporting_date": "2026-11-14",
  "includes_naps": false,
  "source": "manual",
  "quality": "valid",
  "is_synthetic": true,
  "created_at": "2026-11-14T07:30:01Z",
  "replayed": false
}
```

These are all required properties. An identical retry returns the same record data with `replayed: true` and status `200`.

**Errors:** `404` unknown profile; `409` same scoped key with different normalized payload; `422` malformed UUID, missing/extra property, nonpositive/non-integer duration, invalid date, wrong boolean type, or invalid enum; `500` generic Problem Details for unexpected server failure.

**Privacy:** profile-associated synthetic health-like data; no real sleep record or private free text is accepted.  
**Persistence/idempotency:** append-only; uniqueness is scoped to `(profile_id, sleep-record resource)`; identical normalized requests replay, changed requests conflict. Key remains for the local database lifetime. No update/delete endpoint exists.

**Rationale:** the addendum supplies the complete field vocabulary, UTC date semantics, duration unit, source/quality values, and retry behavior. Sleep quality, fatigue, totals in hours, intervals, daily aggregation, and clinical interpretation are not added.

### 5.6 `GET /api/v1/profiles/{profile_id}/sleep-records` — `listSleepRecords`

**Decision:** `RESOLVED_FOR_LOCAL_MVP` (D-04, D-06, D-14, D-20, D-22, D-23).  
**Request:** required `profile_id` UUID path parameter; optional `limit` integer (default 20, 1–100) and `offset` integer (default 0, minimum 0); no body or other filters.  
**Response `200` JSON:**

```json
{
  "items": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "profile_id": "11111111-1111-4111-8111-111111111111",
      "client_record_id": "22222222-2222-4222-8222-222222222222",
      "duration_minutes": 420,
      "reporting_date": "2026-11-14",
      "includes_naps": false,
      "source": "manual",
      "quality": "valid",
      "is_synthetic": true,
      "created_at": "2026-11-14T07:30:01Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

Each item has the §5.5 response properties except `replayed` is omitted. There is no `total`.

**Ordering:** `created_at DESC, id DESC`. This lists stored records, not daily aggregation or a combined cross-domain history.

**Errors:** `404` unknown profile; `422` invalid UUID or pagination; `500` generic Problem Details for unexpected server failure.  
**Privacy/idempotency:** synthetic-only, profile-associated health-like data; read-only; no idempotency or public-data classification.  
**Rationale:** exact path, fields, pagination, and order follow the addendum. No reporting-date filter or sleep-quality/fatigue fields are introduced.

## 6. Out-of-scope decisions and schemas

The following register items are `OUT_OF_SCOPE_FOR_LOCAL_MVP`. Their routes, request/response fields, enums, validation rules, and status-code mappings are intentionally **not defined**. Their UI must remain explicitly unavailable and must not show a success-shaped placeholder.

| ID | Outcome | Capability excluded | Source/rationale |
|---|---|---|---|
| D-07 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Check-ins, psychological scales/ratings, private notes | Blocker register D-07; exact scales, privacy access, and retention are absent; addendum §2 excludes them. |
| D-08 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Symptoms, symptom free text, diagnosis | Blocker register D-08 and intake proposal; vocabulary/privacy schema is incomplete; addendum §2 excludes. |
| D-09 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Support requests, offline queue, transmission, acknowledgement | Blocker register D-09, intake proposal, and backend handoff; no complete local-only draft schema or lifecycle; no delivery claim. |
| D-10 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Assessment envelope, snapshots, coverage, evaluation | Blocker register D-10 and assessment proposal; no exact agreed prototype response in the addendum. No `insufficient_data`/`not_configured` placeholder route. |
| D-11 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | DEMO1 execution, status/rule outputs, numerical rules | Blocker register D-11 and assessment/rules proposals; exact executable rule set requires missing scientific/product facts. |
| D-12 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Baseline activation, calculation, versioning | Blocker register D-12 and baseline/trend proposal; calculation and lifecycle schema are incomplete. |
| D-13 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Trends and daily aggregation | Blocker register D-13; confirmed date/range ideas do not settle route, filters, aggregation, pagination, counts, or response schema. |
| D-15 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Alerts, acknowledgement/resolution, notification | Blocker register D-15 and exercise/radiation/alert gaps; no lifecycle schema, rule source, or external delivery. |
| D-16 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Exercise plans, completion/adherence logs | Blocker register D-16 and exercise/radiation/alert gaps; field dictionary is incomplete. |
| D-17 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Radiation intervals, dose fields, selected streams | Blocker register D-17 and exercise/radiation/alert gaps; exact quantity/unit semantics and scientific interpretation are not approved. |
| D-18 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Combined timeline and convergence | Blocker register D-18 and timeline integration gaps; route, event schema, privacy projection, range/pagination, and window are unresolved. |

There is no combined history endpoint. The two included record-list operations are the only history-like reads; do not broaden them into a cross-resource projection.

## 7. Decision register closure

Every historical decision ID has exactly one local-MVP outcome. Sources refer to [API_CONTRACT_BLOCKERS_AND_DECISIONS.md](../API_CONTRACT_BLOCKERS_AND_DECISIONS.md) unless otherwise named.

| ID | Outcome | Adopted decision and source/rationale |
|---|---|---|
| D-01 | `RESOLVED_FOR_LOCAL_MVP` | No identity, accounts, sessions, or authentication in a local single-workspace prototype. Source: addendum §§1, 2; no identity-provider decision is made for any future deployment. |
| D-02 | `RESOLVED_FOR_LOCAL_MVP` | No roles or profile assignment; `profile_id` is a resource selector only. This is restricted to loopback and synthetic data; authenticated/shared scope and real-person privacy are not claimed. Source: addendum §§1, 2, 3. |
| D-03 | `RESOLVED_FOR_LOCAL_MVP` | Read/list fields and paths are specified in §§5.1–5.2; profile-only provisioning remains an explicit development command; no profile mutation API. Source: addendum §1, `backend/README.md`. |
| D-04 | `RESOLVED_FOR_LOCAL_MVP` | Six product paths and response shapes in §5; direct JSON and snake_case are recorded technical choices; all other candidate routes are excluded. Source: addendum §1 and exact operation declarations. Response codes are selected project decisions as documented in the conventions table and close `IMPLEMENTATION_API_REFERENCE.md` §6.3. |
| D-05 | `RESOLVED_FOR_LOCAL_MVP` | Three vital metrics, exact units, fields, timestamp and validation in §§5.3–5.4. No clinical threshold or temperature-to-immune inference. Source: addendum §1; proposal-only extra provenance fields intentionally omitted. |
| D-06 | `RESOLVED_FOR_LOCAL_MVP` | Sleep duration/date/naps only, §§5.5–5.6; fatigue and quality are excluded. Source: addendum §1. |
| D-07 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No check-in schema or private-note access decision is made for this MVP. Source: addendum §2; intake proposal is not an approved schema. |
| D-08 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No symptom vocabulary or free-text record. Source: addendum §2; intake proposal and blocker D-08 show missing fields/privacy. |
| D-09 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No support request resource, lifecycle, queue, or external-delivery claim. Source: addendum §2; proposal does not provide complete local draft schema. |
| D-10 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No assessment route or snapshot. The addendum does not agree an `insufficient_data`/`not_configured` response shape. Source: addendum §2, assessment proposal. |
| D-11 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No executable thresholds/rules or statuses. Missing scientific/product rule definitions are not inferred. Source: addendum §2, assessment and rules proposals. |
| D-12 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No baseline operation or baseline reference. Source: addendum §2, baseline/trend proposal. |
| D-13 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No trend endpoint; documented candidate semantics do not provide a complete consistent route/filter/aggregation/pagination/response. Source: addendum §2, baseline/trend proposal. |
| D-14 | `RESOLVED_FOR_LOCAL_MVP` | Pagination and ordering defined for profile list and two record lists; combined history/detail is excluded. Source: addendum §§1, 2. |
| D-15 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No alert lifecycle or notification operation. Source: addendum §2, exercise/radiation/alert gap document. |
| D-16 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No exercise plan/log field dictionary or endpoint. Source: addendum §2, exercise/radiation/alert gap document. |
| D-17 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No radiation quantity, interval, stream, or record schema. Source: addendum §2, exercise/radiation/alert gap document. |
| D-18 | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No combined timeline or convergence window. Source: addendum §2, timeline integration gaps. |
| D-19 | `RESOLVED_FOR_LOCAL_MVP` | Body `client_record_id` key, profile/resource scope, replay/conflict, and local-database lifetime for the two included create routes; no header key. First-create/replay statuses and `replayed` values are selected project decisions to close `IMPLEMENTATION_API_REFERENCE.md` §6.2–§6.3. Source: addendum §§1, 3, plus existing implementation behavior/tests. |
| D-20 | `RESOLVED_FOR_LOCAL_MVP` | Included field types, requiredness, units, UTC handling, enums, and data-shape validation only, §§4–5. Source: addendum §1; no unapproved clinical bounds. |
| D-21 | `RESOLVED_FOR_LOCAL_MVP` | Append-only included resources, no update/delete/export, and no retention promise. Source: addendum §§1, 2. |
| D-22 | `RESOLVED_FOR_LOCAL_MVP` | Synthetic-only, empty start, explicit profile provisioning, product routes disabled in production. Source: addendum §§1, 3. |
| D-23 | `RESOLVED_FOR_LOCAL_MVP` | Included operation statuses and Problem Details are specified in §§4–5 and 8; creates are not automatically retried by the client. The POST success statuses and replay marker close the prior OpenAPI gap as project decisions. Source: addendum §1, foundation error conventions, and existing route behavior/tests. |

## 8. Operational foundation operations

These existing endpoints are operational probes, not product-data routes. Their error schema and request ID follow §4.2.

### `GET /api/v1/health` — `healthCheck`

- Request: no body, path, or query parameters.
- `200 application/json`: exactly `{ "status": "ok" }`; `status` is the literal string `"ok"`.
- `500 application/problem+json`: generic unexpected server error.
- Operational metadata only; no personal/profile data or timestamps are returned.
- Read-only process liveness; no database or profile access. No pagination or idempotency.

### `GET /api/v1/ready` — `readinessCheck`

- Request: no body, path, or query parameters.
- `200 application/json`: exactly `{ "status": "ready", "database": "available" }`; both properties are literal strings.
- `503 application/problem+json`: database is unavailable; generic detail does not reveal database internals.
- `500 application/problem+json`: generic unexpected server error.
- Operational database-availability metadata only; no personal/profile data or timestamps are returned.
- Read-only database connectivity probe (`SELECT 1`); it does not inspect records. No pagination or idempotency.

## 9. Human review required before future scope expansion

No human decision is needed to implement the declared MVP contract. Exact questions and safe defaults for future scope expansion are recorded in [HUMAN_REVIEW_REQUIRED.md](./HUMAN_REVIEW_REQUIRED.md); those reviews do not block operations marked `RESOLVED_FOR_LOCAL_MVP`.

- **D-01/D-02:** identity provider, authentication/session lifecycle, role/profile assignment, protected-resource access, and real-person privacy policy before shared/network deployment.
- **D-07/D-08:** rating scales, symptom vocabulary, free-text policy, private-field access and retention before check-ins or symptoms.
- **D-09/D-15:** local support schema and lifecycle; what constitutes acknowledgement; alert state transitions; whether any external delivery exists and its provider before support/alerts/notifications.
- **D-10/D-11:** exact response/coverage schema, evidence/baseline references, assessment trigger and persistence, plus complete versioned scientific/product definitions and tests for each rule before any assessment/status result. The urgent/help event semantics require explicit owner review.
- **D-12:** baseline calculation statistic, comparability/freshness, activation and version lifecycle before baseline endpoints.
- **D-13:** canonical metric filters, aggregation and rounding, blood-pressure grouping, eligible-record rules, excluded/suspect count definitions, route, pagination, and exact response before trends.
- **D-16:** plan/log fields, activity/adherence vocabulary, lifecycle, permissions, and shared-log identity before exercise records.
- **D-17:** exact radiation quantity semantics, unit/precision, interval boundaries/overlap, stream/device identity, provenance/quality, and any mission-specific threshold from an approved radiation-protection source before radiation records or rules.
- **D-18:** event eligibility/schema, privacy projection, timestamps/order, pagination/range, and convergence domain/window/boundary/deduplication configuration before timeline/convergence.
- **D-21:** retention/deletion/export/audit policy before any persistence commitment beyond the local database's own lifetime.

This record does not authorize any of those future decisions and does not claim the app is complete.
