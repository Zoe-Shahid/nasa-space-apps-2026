# OpenAPI Implementation Checklist — Local Synthetic MVP

> **SUPERSEDED (2026-11-15):** this checklist targets the former synthetic-only API. Use [API_CONTRACT.md](../API_CONTRACT.md) for current requirements. Existing checklist items may be retained as legacy-runtime checks only; they are not acceptance criteria for the actual-measurement MVP.

This document records historical OpenAPI checks and does not claim that the actual MVP is implemented.

## Contract-wide requirements

- [ ] Register product operations under `/api/v1` with exactly the listed paths and methods; do not add aliases or candidate routes.
- [ ] Use direct JSON responses and the exact snake_case field names; no success `data` envelope.
- [ ] Publish schemas generated from actual routes outside production; product routes and OpenAPI/docs are disabled in production according to the existing environment configuration.
- [ ] Mark all profile and record data synthetic-only; reject unknown/extra request properties and prevent clients from supplying `id`, `profile_id`, `created_at`, or `is_synthetic`.
- [ ] Bind development service to `127.0.0.1`; do not expose publicly or use real personal/health data.
- [ ] Include `X-Request-ID` response header; document RFC 9457 `application/problem+json` with `request_id` and sanitized optional `errors`.
- [ ] Never echo request values or log health values/payloads. Do not invent 401/403 behavior or role claims.
- [ ] Include no assessment, check-in, symptom, support, exercise, radiation, baseline, trend, alert, combined-history, timeline, update, delete, or export operation.
- [ ] Do not generate OpenAPI or client code as part of this documentation task.

## Route acceptance criteria

### `GET /api/v1/health` — `healthCheck`

- [ ] No request body or query/path parameters.
- [ ] `200 application/json` schema is exactly `{status: "ok"}` with the literal value.
- [ ] `500 application/problem+json` is documented for an unexpected server failure.
- [ ] Probe is process liveness only; it performs no database or product-data access.

### `GET /api/v1/ready` — `readinessCheck`

- [ ] No request body or query/path parameters.
- [ ] `200 application/json` schema is exactly `{status: "ready", database: "available"}`.
- [ ] `503 application/problem+json` is documented for database unavailability; `500` for unexpected failure.
- [ ] Probe checks database connectivity only; it does not inspect profile or record data.

### `GET /api/v1/profiles` — `listProfiles`

- [ ] Optional `limit` is integer, default `20`, minimum `1`, maximum `100`.
- [ ] Optional `offset` is integer, default `0`, minimum `0`.
- [ ] `200` response is exactly `{items, limit, offset}`; no `total`.
- [ ] Each item is exactly `{id, display_name, is_synthetic}`; UUID, 1–120 character string, literal `true`.
- [ ] Empty database returns `items: []`; no seed is run.
- [ ] Order by `created_at DESC, id DESC`.
- [ ] `422` invalid pagination and `500` unexpected server failure use sanitized Problem Details.

### `GET /api/v1/profiles/{profile_id}` — `getProfile`

- [ ] Path parameter `profile_id` is required UUID.
- [ ] `200` response contains exactly `{id, display_name, is_synthetic}` with the profile-list types and constraints.
- [ ] Unknown profile returns `404`; malformed UUID returns `422`; unexpected failure returns `500`.
- [ ] No mission, reviewer, assignment, baseline, radiation, assessment, or other nested summary properties.

### `POST /api/v1/profiles/{profile_id}/observations` — `createObservation`

- [ ] Required UUID path parameter `profile_id`; JSON body is a strict discriminated union on `metric`.
- [ ] `heart_rate` variant requires exactly `client_record_id`, `metric`, positive finite numeric `value`, `unit: "bpm"`, explicit-offset RFC3339 `measured_at`, `source`, `quality`.
- [ ] `blood_pressure` variant requires exactly `client_record_id`, `metric`, positive finite numeric `systolic` and `diastolic`, `unit: "mmHg"`, `measured_at`, `source`, `quality`; no `value`.
- [ ] `body_temperature` variant requires exactly `client_record_id`, `metric`, positive finite numeric `value`, `unit: "°C"`, `measured_at`, `source`, `quality`.
- [ ] `source` enum is exactly `manual | simulated_device`; `quality` exactly `valid | suspect | invalid`.
- [ ] No clinical bounds, conversion, diagnosis, immune mapping, or status computation.
- [ ] New record returns `201` with the complete matching response variant, server-generated UUIDs/timestamp, `is_synthetic: true`, and `replayed: false`.
- [ ] Identical normalized retry returns `200`, original record identity/data and `replayed: true`.
- [ ] Same `(profile, observation, client_record_id)` with changed payload returns `409`; body and logs disclose no submitted values.
- [ ] Unknown profile `404`; invalid body/path `422`; unexpected failure `500`.
- [ ] Validation checks missing/extra fields, metric/unit mismatch, incomplete BP pair, wrong types/enums, nonpositive/nonfinite values, and timestamps lacking explicit offset.
- [ ] Normalize `measured_at` to UTC and serialize with `Z`; `created_at` is UTC server persistence time with `Z`.
- [ ] Persist append-only in a transaction; no update/delete path.

### `GET /api/v1/profiles/{profile_id}/observations` — `listObservations`

- [ ] Required UUID `profile_id`; `limit` default `20`, range `1–100`; `offset` default `0`, minimum `0`.
- [ ] `200` response exactly `{items, limit, offset}`; no `total`, `replayed`, filters, or aggregation.
- [ ] Each item matches one of the three observation response variants and includes the synthetic marker.
- [ ] Order by `created_at DESC, id DESC`.
- [ ] Unknown profile `404`; invalid path/pagination `422`; unexpected failure `500`.

### `POST /api/v1/profiles/{profile_id}/sleep-records` — `createSleepRecord`

- [ ] Required UUID path parameter `profile_id`.
- [ ] Strict JSON object with exactly `client_record_id` UUID, positive integer `duration_minutes`, `reporting_date` exact `YYYY-MM-DD`, boolean `includes_naps`, `source`, and `quality`; all required.
- [ ] `source` enum is exactly `manual | simulated_device`; `quality` exactly `valid | suspect | invalid`.
- [ ] No sleep quality/fatigue fields, hours conversion, interval inference, aggregation, or clinical interpretation.
- [ ] New record returns `201` with UUIDs, all request data, `is_synthetic: true`, UTC `created_at`, and `replayed: false`.
- [ ] Identical normalized retry returns `200` with the original record and `replayed: true`; changed scoped payload returns sanitized `409`.
- [ ] Unknown profile `404`; invalid body/path `422`; unexpected failure `500`.
- [ ] `reporting_date` remains a UTC calendar date, not an instant; `created_at` is server persistence time.
- [ ] Persist append-only in a transaction; no update/delete path.

### `GET /api/v1/profiles/{profile_id}/sleep-records` — `listSleepRecords`

- [ ] Required UUID `profile_id`; `limit` default `20`, range `1–100`; `offset` default `0`, minimum `0`.
- [ ] `200` response exactly `{items, limit, offset}`; no `total`, `replayed`, date filters, or aggregation.
- [ ] Each item has the exact sleep response schema and `is_synthetic: true`.
- [ ] Order by `created_at DESC, id DESC`.
- [ ] Unknown profile `404`; invalid path/pagination `422`; unexpected failure `500`.

## Shared response/error and UI checks

- [ ] Every successful operation returns `X-Request-ID`; all errors use `application/problem+json`.
- [ ] Error object has required `type`, `title`, `status`, `detail`, `request_id`; validation may add `errors[]` with `field`, `code`, and generic `message`.
- [ ] Invalid request values do not appear in error details, field messages, application logs, or analytics.
- [ ] `409` is only used for changed-payload reuse of an idempotency key; replay is a successful `200`.
- [ ] No automatic retry is sent by the client; an explicit unchanged retry reuses `client_record_id`.
- [ ] UI communicates synthetic/local-only scope, never pre-fills measurement values, and leaves excluded features explicitly unavailable.
- [ ] OpenAPI route inventory is exactly the eight operations above in non-production; there are no success-shaped placeholders for excluded capabilities.
