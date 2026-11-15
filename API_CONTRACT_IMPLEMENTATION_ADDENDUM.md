# AX1 Local Synthetic Prototype Addendum

> **SUPERSEDED (2026-11-15):** this addendum records a former synthetic-only scope and is no longer implementation authority. The current [API_CONTRACT.md](./API_CONTRACT.md) requires an authenticated actual-measurement MVP and takes precedence. The endpoints below describe legacy runtime behavior only; do not use them with real health data.

**Historical status:** approved by the user in this conversation on 2026-11-14 as a local hackathon prototype scope. No separate team, API-owner, or scientific-reviewer sign-off was asserted. At that time, this addendum governed the limited synthetic prototype; it has been superseded by the actual-measurement direction in [API_CONTRACT.md](./API_CONTRACT.md).

This prototype is **local-only and synthetic-only**. It is not suitable for real astronaut, patient, crew, or other personal health data; it is not production-secure, NASA-endorsed, clinically validated, or medical guidance. Bind the development server to loopback (`127.0.0.1`). Product routes must be disabled when `ASTROORBITX_APP_ENVIRONMENT=production`. Do not expose the development server to public networks.

## 1. Approved implementation scope

### Profiles

- `GET /api/v1/profiles` lists profiles in the local synthetic workspace.
- `GET /api/v1/profiles/{profile_id}` reads one profile.
- Profile IDs are UUIDs.
- Profile response fields are `id` (UUID), `display_name` (1–120 characters), and `is_synthetic` (always `true`).
- No profile create/update/delete API exists. Provision a synthetic profile only through the explicit development command documented in `backend/README.md`. The command creates no health records and is never run automatically.
- Profile lists and record lists use `limit` (default 20, maximum 100) and `offset` (default 0); ordering is deterministic, newest first by `created_at`, then `id`, unless otherwise stated.

### Vital observations

- `POST /api/v1/profiles/{profile_id}/observations` creates an append-only observation.
- `GET /api/v1/profiles/{profile_id}/observations` lists observations.
- Supported metrics and exact units:
  - `heart_rate`: positive finite `value`, unit `bpm`.
  - `blood_pressure`: positive finite `systolic` and `diastolic`, unit `mmHg`.
  - `body_temperature`: positive finite `value`, unit `°C`.
- No clinical/physiological range thresholds or diagnoses are applied. A blood-pressure pair is required together; this API does not infer a status from the values.
- Create request fields: `client_record_id` (UUID), `metric`, metric-specific value(s), exact `unit`, `measured_at` (RFC3339 instant with explicit offset), `source` (`manual` or `simulated_device`), and `quality` (`valid`, `suspect`, or `invalid`). Extra fields are rejected. The client cannot set `profile_id`, `is_synthetic`, server `id`, or `created_at`.
- Response fields: `id`, `profile_id`, `client_record_id`, `metric`, metric-specific value(s), `unit`, `measured_at`, `source`, `quality`, `is_synthetic` (always true), and `created_at`.
- Timestamps are normalized to UTC on persistence and serialized with `Z`; `measured_at` is the supplied measurement instant and `created_at` is server persistence time.

### Sleep-duration records

- `POST /api/v1/profiles/{profile_id}/sleep-records` creates an append-only sleep-duration record.
- `GET /api/v1/profiles/{profile_id}/sleep-records` lists sleep-duration records.
- Create request fields: `client_record_id` (UUID), positive integer `duration_minutes`, `reporting_date` (UTC calendar date, `YYYY-MM-DD`), `includes_naps` (boolean), `source` (`manual` or `simulated_device`), and `quality` (`valid`, `suspect`, or `invalid`). Extra fields are rejected.
- Response fields: `id`, `profile_id`, `client_record_id`, `duration_minutes`, `reporting_date`, `includes_naps`, `source`, `quality`, `is_synthetic` (always true), and `created_at` (UTC server persistence time).
- Sleep quality and fatigue scales, daily aggregates, baselines, and clinical interpretations are not implemented.

### Lists, retries, and errors

- Collection response shape is `{ "items": [...], "limit": n, "offset": n }`. Ordering is `created_at DESC, id DESC`. Invalid pagination is a sanitized 422 response.
- Create idempotency uses body field `client_record_id`, scoped to profile and resource type. An identical normalized payload returns the original record with `replayed: true`; a different payload with the same key returns 409 Problem Details. The key is retained for the lifetime of the local database. Writes and idempotency checks are transaction-safe.
- Missing profile/resource is 404. Request validation is 422 with the existing sanitized RFC 9457 error envelope. No 401/403 behavior exists because this prototype deliberately has no identity or role system. No update/delete endpoints are exposed.
- Submitted values are not logged. HTTP errors and validation messages must not echo request values.

## 2. Explicit exclusions

Keep these operations unavailable; do not generate placeholder success responses:

- Authentication, accounts, credentials, roles, profile assignment, and remote authorization.
- Check-ins and psychological scales/notes; symptoms and diagnoses; support request content or delivery states; exercise plans/logs; radiation records.
- Assessments and clinical/scientific rules, including status thresholds, baselines, and recommendations.
- Trends, history aggregation, alerts, notifications, and cross-domain timelines.
- Non-synthetic data, automatic seed data, sample observations, profile mutation APIs, and record update/delete.

The six canonical domain identifiers remain valid registry vocabulary; their presence does not imply a record type or assessment rule. A body-temperature observation is not a symptom report and does not imply immune status. Sleep duration does not imply sleep quality or fatigue.

## 3. Development provisioning and operation

- Run the documented profile-only seed command explicitly. It requires a display name and may accept a caller-supplied UUID; it creates exactly one synthetic profile and no health records.
- Bind the development server to `127.0.0.1`.
- The app starts with no profiles or health records.
- Production environment disables all profile and record routes. The operational health/readiness endpoints remain available according to their existing configuration.

