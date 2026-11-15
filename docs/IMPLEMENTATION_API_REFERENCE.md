# AstroOrbitX Implementation API Reference

> **SUPERSEDED as target API reference (2026-11-15):** this document describes the former synthetic-only runtime and contract. The [current API contract](../API_CONTRACT.md) is authoritative. Routes and schemas listed here are legacy implementation facts, not authorization for actual-data use.

**Historical authority:** [API_CONTRACT_IMPLEMENTATION_ADDENDUM.md](../API_CONTRACT_IMPLEMENTATION_ADDENDUM.md). This reference does not approve any additional route or field.

**Scope:** local-only, synthetic-only prototype. Never use real personal or health data. This prototype is not production-secure, NASA-endorsed, clinically validated, or medical guidance. Development services bind to `127.0.0.1`; product routes are disabled in production.

This reference distinguishes the approved target contract from current runtime OpenAPI. Generated OpenAPI is the wire-contract verification source. The runtime exposes the six product operations below and the existing health/readiness endpoints. Historical replay/status decisions in §6 are closed for the local MVP by the linked decision record; generated OpenAPI may still need fuller documentation of the approved error responses.

## 1. Approved product endpoint inventory

Only the following six operations are in scope in the approved addendum. Overview is not an API operation.

The canonical domain identifiers are `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, and `radiation`. Their presence in the domain vocabulary does not add a resource, endpoint, or assessment rule. The supported record operations below do not accept a generic `domain` field.

| Method | Path | Purpose | Request | Response | Error outcomes | Tests |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/profiles` | List explicitly provisioned synthetic profiles. | Query: `limit`, `offset`; no body. | `ProfileCollection`. | 422 for invalid query; generic sanitized 5xx. | `test_profile_list_detail_and_pagination`; `test_empty_database_has_no_seed_and_lists_empty_collections`; OpenAPI inventory test. |
| `GET` | `/api/v1/profiles/{profile_id}` | Read one synthetic profile by UUID. | Path: `profile_id` UUID; no body. | `ProfileResponse`. | 404 if missing; 422 if path UUID is invalid; generic sanitized 5xx. | `test_profile_list_detail_and_pagination`; OpenAPI inventory test. |
| `POST` | `/api/v1/profiles/{profile_id}/observations` | Append one supported synthetic vital observation. | Path: `profile_id` UUID; one metric-discriminated request body described below. | Metric-specific observation response; initial create includes `replayed: false`, identical replay includes `replayed: true`. | 404 if profile is missing; 409 if the same scoped `client_record_id` is reused for a different normalized payload; 422 for invalid path/body; generic sanitized 5xx. | `test_create_observations_persists_and_normalizes_utc`; `test_observation_retry_returns_original_and_conflict_is_409`; `test_observation_validation_is_sanitized_and_rejects_extra_fields`; `test_blood_pressure_pair_is_required_and_no_extra_observation_values`; `test_body_temperature_has_no_clinical_thresholds`; `test_nonexistent_profile_record_routes_return_404`. |
| `GET` | `/api/v1/profiles/{profile_id}/observations` | List vital observations for one profile. | Path: `profile_id` UUID; query: `limit`, `offset`; no body. | `ObservationCollection`. | 404 if profile is missing; 422 for invalid path/query; generic sanitized 5xx. | `test_record_list_order_and_pagination`; `test_nonexistent_profile_record_routes_return_404`; empty-list assertion in `test_empty_database_has_no_seed_and_lists_empty_collections`. |
| `POST` | `/api/v1/profiles/{profile_id}/sleep-records` | Append one synthetic sleep-duration record. | Path: `profile_id` UUID; request body described below. | `SleepResponse` plus `replayed: false` on initial creation or `replayed: true` on identical retry. | 404 if profile is missing; 409 if the same scoped `client_record_id` is reused for a different normalized payload; 422 for invalid path/body; generic sanitized 5xx. | `test_sleep_create_retry_conflict_and_list`; `test_sleep_validation_rejects_invalid_and_extra_fields`; `test_nonexistent_profile_record_routes_return_404`. |
| `GET` | `/api/v1/profiles/{profile_id}/sleep-records` | List sleep-duration records for one profile. | Path: `profile_id` UUID; query: `limit`, `offset`; no body. | `SleepCollection`. | 404 if profile is missing; 422 for invalid path/query; generic sanitized 5xx. | `test_sleep_record_list_order_and_pagination`; `test_nonexistent_profile_record_routes_return_404`; empty-list assertion in `test_empty_database_has_no_seed_and_lists_empty_collections`. |

### Common pagination and ordering

All profile and record collection routes use:

| Field | Type | Requiredness / default | Validation | Privacy |
|---|---|---|---|---|
| `limit` | Integer query parameter | Optional; default `20` | Minimum `1`, maximum `100`. | Request metadata; no record value. |
| `offset` | Integer query parameter | Optional; default `0` | Minimum `0`. | Request metadata; no record value. |

Collections are `{ "items": [...], "limit": integer, "offset": integer }`. List ordering is `created_at DESC, id DESC` for profile and record lists. The profile response does not expose `created_at`; it is used only for deterministic ordering.

## 2. Field dictionary

“Required” below means required by the approved request/response field inventory. Conditional request fields are required for the selected `metric`. Additional fields are rejected on create requests. The client cannot set server-controlled identity, synthetic, or creation fields.

Privacy labels use API_CONTRACT.md §6 where available: `public metadata`, `crew-private`, `restricted`, and `internal`. The approved addendum does not specify a privacy classification for every profile field; those omissions are flagged rather than silently classified.

### Profile resources

#### `GET /api/v1/profiles` and `GET /api/v1/profiles/{profile_id}`

`GET /api/v1/profiles` returns a `ProfileCollection`; `GET /api/v1/profiles/{profile_id}` returns one `ProfileResponse`.

| Field | Type | Requiredness | Unit / timestamp semantics | Privacy | Notes |
|---|---|---|---|---|---|
| `profile_id` (path) | UUID | Required on profile read and nested record routes | N/A | Profile-read identifier: not assigned by the addendum/API contract; nested record route scope: `crew-private`. | Identifies the synthetic local profile. No profile mutation endpoint. |
| `id` | UUID | Required in each profile response | N/A | Not assigned by addendum/API contract for profile identifiers; team decision required. | Server/provisioner assigned profile identifier. |
| `display_name` | String | Required; 1–120 characters | N/A | Not assigned by addendum/API contract; team decision required. | Must be synthetic; no real person name. |
| `is_synthetic` | Boolean literal `true` | Required | N/A | Public metadata | Server-controlled; always `true`. |
| `items` | Array of `ProfileResponse` | Required in list response | N/A | Inherits item field classifications. | Empty array is valid when no profiles have been explicitly provisioned. |
| `limit` | Integer | Required in collection response | N/A | Request/response pagination metadata | Echoes effective pagination value. |
| `offset` | Integer | Required in collection response | N/A | Request/response pagination metadata | Echoes effective pagination value. |

The addendum does not approve profile create/update/delete routes. Explicit development provisioning is an operator command, not an API endpoint; it creates one profile and no records.

The persistence layer stores timestamp instants in UTC. ORM reads return timezone-aware UTC instants, including on SQLite, whose native datetime storage does not preserve timezone metadata.

### Vital observations

#### `POST /api/v1/profiles/{profile_id}/observations`

The request is a discriminated union selected by `metric`. The listed fields for the selected variant are required.

| Request field | Type / allowed values | Requiredness | Unit / timestamp semantics | Privacy | Validation / restrictions |
|---|---|---|---|---|---|
| `client_record_id` | UUID | Required | N/A | Internal | Idempotency key scoped to profile and resource type; retained for database lifetime. |
| `metric` | Enum: `heart_rate`, `blood_pressure`, `body_temperature` | Required | N/A | Crew-private | Selects exactly one value shape below. |
| `value` | Positive finite number | Required for `heart_rate` and `body_temperature`; absent for `blood_pressure` | `bpm` for heart rate; `°C` for body temperature | Crew-private | No clinical/physiological threshold or diagnosis. |
| `systolic` | Positive finite number | Required for `blood_pressure`; absent for other metrics | `mmHg` | Crew-private | Blood-pressure pair must be present together. |
| `diastolic` | Positive finite number | Required for `blood_pressure`; absent for other metrics | `mmHg` | Crew-private | Blood-pressure pair must be present together. |
| `unit` | Literal string conditional on metric: `bpm`, `mmHg`, or `°C` | Required | Unit for the selected measurement quantity | Crew-private | Exact metric/unit pairing only; no conversion. |
| `measured_at` | RFC3339 instant string with explicit UTC offset | Required | Time the measurement occurred; normalized to UTC and returned with `Z`. | Crew-private | The addendum sets no historical/future bounds. |
| `source` | Enum: `manual`, `simulated_device` | Required | N/A | Crew-private | No other provenance value is approved. |
| `quality` | Enum: `valid`, `suspect`, `invalid` | Required | N/A | Crew-private | No automatic reassessment or clinical status follows from quality. |

The client must not submit `profile_id`, `id`, `is_synthetic`, or `created_at`. All extra request fields are rejected.

#### Vital observation responses

`GET` list items contain the record response fields below. A successful `POST` returns the created record; the replay marker ambiguity is documented separately.

| Response field | Type | Requiredness | Unit / timestamp semantics | Privacy | Notes |
|---|---|---|---|---|---|
| `id` | UUID | Required | N/A | Crew-private | Server record ID. |
| `profile_id` | UUID | Required | N/A | Crew-private | Owning synthetic profile. |
| `client_record_id` | UUID | Required | N/A | Internal | Original idempotency key. |
| `metric` | `heart_rate`, `blood_pressure`, or `body_temperature` | Required | N/A | Crew-private | One canonical metric per record. |
| `value` | Positive finite number | Required for heart rate/body temperature; absent for blood pressure | `bpm` or `°C` according to metric | Crew-private | No derived values. |
| `systolic` | Positive finite number | Required for blood pressure; absent otherwise | `mmHg` | Crew-private | Paired with `diastolic`. |
| `diastolic` | Positive finite number | Required for blood pressure; absent otherwise | `mmHg` | Crew-private | Paired with `systolic`. |
| `unit` | `bpm`, `mmHg`, or `°C` | Required | Measurement unit, exact metric pairing | Crew-private | No unit conversion. |
| `measured_at` | RFC3339 UTC instant string ending in `Z` | Required | Measurement event time | Crew-private | Normalized from the input instant. |
| `source` | `manual` or `simulated_device` | Required | N/A | Crew-private | Preserved as supplied. |
| `quality` | `valid`, `suspect`, or `invalid` | Required | N/A | Crew-private | Preserved as supplied. |
| `is_synthetic` | Boolean literal `true` | Required | N/A | Public metadata | Server-controlled. |
| `created_at` | RFC3339 UTC instant string ending in `Z` | Required | Server persistence time, distinct from `measured_at` | Crew-private | Server generated. |
| `replayed` | Boolean | Required on POST responses: `false` on initial creation and `true` for an identical retry, per the local MVP decision record. | N/A | Internal | Not part of list-item fields. |

### Sleep-duration records

#### `POST /api/v1/profiles/{profile_id}/sleep-records`

| Request field | Type / allowed values | Requiredness | Unit / timestamp semantics | Privacy | Validation / restrictions |
|---|---|---|---|---|---|
| `client_record_id` | UUID | Required | N/A | Internal | Idempotency key scoped to profile and resource type; retained for database lifetime. |
| `duration_minutes` | Positive integer | Required | Minutes | Crew-private | Strictly an entered duration; no quality/fatigue interpretation. |
| `reporting_date` | `YYYY-MM-DD` calendar date | Required | UTC calendar date; not an instant | Crew-private | No local-time conversion or sleep-interval inference. |
| `includes_naps` | Boolean | Required | N/A | Crew-private | States whether the supplied duration includes naps. |
| `source` | Enum: `manual`, `simulated_device` | Required | N/A | Crew-private | No other provenance value is approved. |
| `quality` | Enum: `valid`, `suspect`, `invalid` | Required | N/A | Crew-private | No automatic assessment follows from quality. |

The client must not submit `profile_id`, `id`, `is_synthetic`, or `created_at`. All extra request fields are rejected.

#### Sleep-duration responses

`GET` list items contain these fields. A successful `POST` returns the created record; the replay marker ambiguity is the same as for vital observations.

| Response field | Type | Requiredness | Unit / timestamp semantics | Privacy | Notes |
|---|---|---|---|---|---|
| `id` | UUID | Required | N/A | Crew-private | Server record ID. |
| `profile_id` | UUID | Required | N/A | Crew-private | Owning synthetic profile. |
| `client_record_id` | UUID | Required | N/A | Internal | Original idempotency key. |
| `duration_minutes` | Positive integer | Required | Minutes | Crew-private | No daily aggregate, score, or inferred quality. |
| `reporting_date` | `YYYY-MM-DD` | Required | UTC calendar date | Crew-private | Not an instant. |
| `includes_naps` | Boolean | Required | N/A | Crew-private | Supplied nap-inclusion flag. |
| `source` | `manual` or `simulated_device` | Required | N/A | Crew-private | Preserved as supplied. |
| `quality` | `valid`, `suspect`, or `invalid` | Required | N/A | Crew-private | Preserved as supplied. |
| `is_synthetic` | Boolean literal `true` | Required | N/A | Public metadata | Server-controlled. |
| `created_at` | RFC3339 UTC instant string ending in `Z` | Required | Server persistence time | Crew-private | Server generated. |
| `replayed` | Boolean | Required on POST responses: `false` on initial creation and `true` for an identical retry, per the local MVP decision record. | N/A | Internal | Not part of list-item fields. |

## 3. Error envelope and outcomes

The existing foundation uses RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, and `request_id`. Validation errors additionally contain `errors: [{field, code, message}]`; field paths are dot-separated, messages are sanitized, and submitted values are not echoed. `X-Request-ID` is returned on responses and used for correlation. Request bodies and record values must not enter logs.

| HTTP status | Approved meaning for supported operations |
|---|---|
| 404 | Requested profile/resource does not exist. |
| 409 | Create retry uses an existing `client_record_id` with a different normalized payload. |
| 422 | Invalid UUID path, pagination, missing/extra/wrongly typed field, enum/unit mismatch, invalid number, or timestamp/date validation failure. |
| 5xx | Generic sanitized server failure using the foundation problem response; no submitted record values in detail/logs. |

No 401/403 behavior exists because the addendum specifies no identity or role system. No update/delete methods are approved.

## 4. Tests mapped to approved operations

These are current backend tests that exercise the contract surface. The OpenAPI inventory test checks route registration; the per-resource tests exercise payloads, errors, persistence, retry, and list behavior.

| Operation | Existing backend test coverage |
|---|---|
| `GET /api/v1/profiles` | `test_empty_database_has_no_seed_and_lists_empty_collections`; `test_profile_list_detail_and_pagination` |
| `GET /api/v1/profiles/{profile_id}` | `test_profile_list_detail_and_pagination` |
| `POST /api/v1/profiles/{profile_id}/observations` | `test_create_observations_persists_and_normalizes_utc`; `test_observation_retry_returns_original_and_conflict_is_409`; `test_observation_validation_is_sanitized_and_rejects_extra_fields`; `test_blood_pressure_pair_is_required_and_no_extra_observation_values`; `test_body_temperature_has_no_clinical_thresholds` |
| `GET /api/v1/profiles/{profile_id}/observations` | `test_record_list_order_and_pagination`; `test_empty_database_has_no_seed_and_lists_empty_collections` |
| `POST /api/v1/profiles/{profile_id}/sleep-records` | `test_sleep_create_retry_conflict_and_list`; `test_sleep_validation_rejects_invalid_and_extra_fields` |
| `GET /api/v1/profiles/{profile_id}/sleep-records` | `test_sleep_record_list_order_and_pagination`; `test_empty_database_has_no_seed_and_lists_empty_collections` |
| Cross-cutting | `test_nonexistent_profile_record_routes_return_404`; `test_private_extra_fields_are_not_echoed_or_logged`; `test_product_routes_are_disabled_in_production`; `test_openapi_contains_operational_and_approved_prototype_routes`; persistence tests cover SQL constraints, UTC-aware round trips, caller-owned rollback, idempotency scope, and migrations; CLI tests verify explicit profile-only provisioning. |

Frontend adapter and UI tests are in `frontend/src/data/profilesApi.test.ts` and `frontend/src/pages/AddDataPage.test.ts`; they cover request paths/shapes, validation response handling, response parsing, form validation, duplicate-submit blocking, and save-state behavior.

## 5. Requested operations that remain out of scope

The user's requested MVP list includes several operations that the approved addendum explicitly excludes. This reference does not promote them to approved endpoints. They have no approved route, request fields, response fields, status mapping, or endpoint tests. Do not implement them until the team resolves the conflict in the approved contract.

| Requested feature | Addendum / API_CONTRACT disposition | Fields/path status |
|---|---|---|
| Categorical check-in create/list | **OUT OF SCOPE** (addendum §2; API_CONTRACT.md §16 D-07). | No approved categorical values, request/response fields, path, privacy projection, or tests. Team decision required. |
| Local support-request create/list | **OUT OF SCOPE** (addendum §2; API_CONTRACT.md §16 D-09). | No approved message/content fields, lifecycle state, path, response, privacy policy, or tests. “Local” does not by itself approve a schema. |
| Assessment read | **OUT OF SCOPE** (addendum §2; API_CONTRACT.md §16 D-10 and D-11). | No assessment endpoint/schema or active rules. The canonical domain identifiers and status vocabulary do not approve an assessment response. No assessment status is emitted. |
| Trends read | **OUT OF SCOPE** (addendum §2; API_CONTRACT.md §16 D-13). | No trend route, query/response fields, aggregation, or tests. |
| Combined history list | **OUT OF SCOPE** (addendum §2; API_CONTRACT.md §16 D-14). | Pagination/order are approved only for the two individual record collections; no combined history path, filters, item union, or response schema exists. |
| Overview | No overview endpoint is approved. | The request specifies frontend composition only, not a route. The addendum does not define an overview response or approve an overview UI; do not create an API endpoint or infer a combined model. |

### Explicitly excluded operations

No route, form, mock adapter, placeholder data, or success state is approved for:

- Authentication, accounts, credentials, sessions, roles, or profile assignment.
- Profile create/update/delete or health-record update/delete.
- Symptom reports or diagnoses.
- Baselines.
- Alerts or notifications.
- Exercise plans or exercise logs.
- Radiation intake.
- Timeline or convergence.
- Psychological notes/scales, support delivery/transmission/acknowledgement.
- Assessment/rule evaluation, clinical thresholds, recommendations, or medical status inference.

## 6. Historical contract and OpenAPI notes

The items below record questions that existed before the local MVP decision closure. The linked [Local MVP decision closure](#local-mvp-decision-closure) resolves them for the six included operations; they do not block those operations. The generated runtime OpenAPI may still omit explicit error response documentation.

1. **Historical scope conflict (superseded).** The former synthetic addendum excluded check-ins, support requests, assessment, trends, and combined history from its six-operation slice. The current [API_CONTRACT.md](../API_CONTRACT.md) supersedes that scope; this reference remains a runtime snapshot only.
2. **Replay response shape (resolved project decision).** First creation returns `201` with `replayed: false`; an identical retry returns `200` with `replayed: true`.
3. **Create and error statuses (resolved project decision).** Create/replay/conflict statuses are `201`/`200`/`409`; invalid input is `422`; unknown profile is `404`; unexpected failure is sanitized `500`. OpenAPI response documentation may still be incomplete.
4. **Profile field privacy (resolved for local scope).** Profile attributes are synthetic-only local-workspace metadata; they are not designated public and do not establish a real-person privacy class.
5. **Status vocabulary is not an assessment endpoint.** The AX1 status vocabulary does not add an assessment operation; no assessment status is emitted by this MVP.

The local MVP remains limited to the six operations in §1. Do not add any excluded route, field, status, or response behavior.

## Local MVP decision closure

At the time of this historical reference, the [local MVP decision record](./ASTROORBITX_LOCAL_MVP_DECISIONS.md) resolved documentation questions for the six-operation synthetic-only scope. That scope is superseded by the current [API_CONTRACT.md](../API_CONTRACT.md); this historical note does not define actual-MVP behavior.

- **Create/replay behavior (§6.2–§6.3):** as an explicit project decision, first creation returns `201` with `replayed: false`; an identical retry returns `200` with `replayed: true`; changed content under the same scoped `client_record_id` returns `409`. Existing runtime behavior and tests informed the selection, but those exact success values were not explicitly supplied by the addendum.
- **Documented outcomes (§6.3):** for included product operations, unknown profile is `404`, invalid path/body/query is sanitized `422`, changed-payload idempotency conflict is sanitized `409`, and unexpected failure is a generic sanitized `500`. Operational readiness remains `503` when the database is unavailable.
- **Profile field privacy (§6.4):** profile attributes are classified only as synthetic-only local-workspace metadata. They are not designated public, and this decision does not define a real-person privacy class. Real-person names/data and external exposure remain prohibited.
- **Remaining scope:** all other exclusions in §5 remain unavailable. In particular, no assessment, trend, check-in, support, or combined-history operation is introduced.

See the linked decision record for exact request/response fields and rationale. This documentation decision does not change application code or claim that the app is complete.
