# Baselines and trends: AX1 contract gaps and proposal

> **SUPERSEDED as contract authority (2026-11-15):** historical proposal only. Trends are now an MVP requirement, but this document does not approve routes, fields, aggregations, or baselines. Follow the [root API contract](../../API_CONTRACT.md) and current blocker register.

**Status: proposal only — no backend implementation.** The repository contains no approved AX1/OpenAPI specification, baseline/trend routes, domain models, request/response schemas, or shared error envelope. The frontend trend types and demo adapter are explicitly marked as proposed/demo-only. Do not treat this document as an approved contract or add routes/models from it before Developer 1 agrees to the interface.

## Confirmed repository state

- `backend/app/api/router.py` registers no routes.
- The only Alembic revision, `0001_initial_baseline`, is empty.
- There are no baseline, trend, or observation ORM models, Pydantic schemas, services, status enums, or error envelopes in the backend.
- `app.db.base.Base` is the declarative model base. `app.db.session.get_session()` yields and closes a SQLAlchemy `Session`, without implicit commit; writes should use an explicit transaction scope.
- `frontend/src/types/trends.ts` is explicitly labeled “Proposed trends shapes, not yet confirmed with the backend team.” It proposes inclusive `from`/`to` UTC dates, one day per UTC date, and null-valued empty days.
- `frontend/src/data/trendsApi.ts` says the endpoint and response are unconfirmed; `liveTrendsApi` is `null`. Its 31-day range, metric names, series and empty-day behavior are demo behavior only.
- `frontend/src/types/crew.ts` is also labeled proposed and does not define comparable source/device/acquisition fields or a baseline activation contract.
- `frontend/docs/backend-contract-notes.md` says there is no OpenAPI URL, no Baseline schema, and Trends path/parameters/series/baseline remain unconfirmed.

## Requirements supplied for contract review

These are requested behavior, not proof of existing AX1:

- Reviewer-only baseline activation.
- Heart rate, blood pressure, and body temperature baselines require at least three valid pre-mission observations on three distinct UTC dates.
- A baseline may use only comparable records, with comparability involving context, acquisition type, source, and device as defined in the contract.
- Exclude suspect, stale, and incompatible observations.
- Version each activated baseline; an assessment snapshot retains the exact baseline version it used.
- Trends are limited to `heart_rate`, `blood_pressure`, `body_temperature`, and `sleep_duration`; grouped by UTC day with at most 31 dates.
- Include only compatible valid records and expose excluded/suspect counts.
- Empty days have count zero and null min/max/mean. Do not interpolate absent days.

## Proposed contract semantics requiring approval

### Date boundary and trend range

Proposed request semantics: `from` and `to` are ISO UTC calendar dates, both inclusive. A date `d` maps to the half-open UTC instant range `[dT00:00:00Z, (d + 1 day)T00:00:00Z)`. Reject requests where `to < from` or the inclusive date count exceeds 31. This aligns with the frontend's current proposed type, but is not approved AX1 behavior.

The response should contain one ordered day entry for every requested UTC date. A day with no eligible record has `count=0`, `min=null`, `max=null`, and `mean=null` for each applicable series. No synthetic/interpolated values are created. Define whether the reported per-day count is shared across paired blood-pressure values or per series.

### Eligibility and exclusions

The requested `valid`/`suspect`, `source_label`, `acquisition_type`, and possible `device`/context concepts have not been added to an approved backend schema. AX1 must define:

- Exact field names and allowed enum values, including device identity (if supported).
- How to define “pre-mission” and where the mission start/phase comes from.
- How context equality/compatibility is represented (exact match, normalized category, or another rule).
- Whether source and device must match exactly, and how null/unknown values compare.
- What makes data “stale,” per metric, and whether staleness applies to historic trends as well as current baseline eligibility.
- What denominator and categories the excluded and suspect counts use, whether they are per day or whole query, and how overlapping reasons are counted.
- How daily sleep records are assigned to a UTC report date and what timestamp validity means for them.

Do not silently treat missing quality/provenance/context fields as valid or compatible. Keep suspect data visible in history but outside baseline and trend calculations, as required by the product constraints.

### Baseline activation, calculation, and versioning

The required minimum is three eligible observations from three distinct UTC dates for each baseline metric. AX1 must still specify:

- Baseline create/activate method and path, request/response schemas, reviewer permission enforcement, and error envelope.
- The numerical baseline statistic (mean, median, or another explicitly chosen method), units, rounding/precision, and whether outliers are handled. Do not infer this from chart presentation.
- Whether a baseline is scoped per astronaut, metric, comparable-record group, or another key.
- Behavior when replacing an active baseline, version identifiers/sequence, activation timestamps, and whether old versions can be deactivated or queried.
- How an assessment snapshot references baseline identity and version, and how that reference is preserved if a baseline is later replaced.
- Failure responses when fewer than three eligible observations or three distinct dates remain after exclusions.

No baseline should be activated if its eligible observations do not meet the minimum. No Normal status or substitute baseline should be produced for insufficient data.

### Candidate API/data shapes (not approved names)

No exact route spelling is proposed here because the request says not to create duplicate route spellings and no existing route exists to extend. Developer 1 must choose and publish one canonical path per operation in AX1 before implementation.

The contract needs operations for:

1. Reviewer-authorized baseline activation for an astronaut and supported metric.
2. Trend retrieval for an astronaut, supported metric, and inclusive UTC date range.

The request/response definitions must cover metric identifier, requested range, daily sample count, null-capable min/max/mean, excluded/suspect counts, series/unit metadata, and (where supplied) active baseline value/version. Exact JSON property names, error body, role/auth mechanism, pagination (if any), and ID types remain undecided.

## Test cases to bind to approved contract

After Developer 1 approves the schemas and semantics, test:

- Two versus three eligible baseline records; three records on fewer than three distinct UTC dates; and three records on exactly three dates.
- Exclusion of suspect, stale, post-mission, and context/acquisition/source/device-incompatible records.
- Comparability grouping for every field and the explicitly approved behavior for missing metadata.
- Reviewer authorization and rejection of other roles.
- Baseline activation/version replacement and retention of an old version reference in an assessment snapshot.
- Inclusive UTC `from`/`to`, records immediately before/at/after day boundaries, leap/month/year boundaries, and invalid reversed ranges.
- Exactly 31 requested UTC dates accepted and 32 rejected.
- Aggregation correctness per metric and paired blood-pressure series; correct eligible/excluded/suspect counts.
- Empty days return zero count and null aggregates; no missing-date interpolation.
- No baseline or trend calculation consumes suspect/incompatible records.

Until AX1 and Developer 1 approve the unresolved points above, this document is the handoff; no endpoint, model, field, role policy, statistic, or stale-data threshold is implemented.
