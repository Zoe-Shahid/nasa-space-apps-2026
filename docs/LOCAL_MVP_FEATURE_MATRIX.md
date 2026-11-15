# AstroOrbitX Local MVP Feature Matrix

> **SUPERSEDED (2026-11-15):** this matrix describes the former local, synthetic-only MVP. The actual-measurement scope is defined by [API_CONTRACT.md](../API_CONTRACT.md). The tables below describe legacy implementation scope only and do not constrain the target product.

**Historical scope:** local, loopback-only, synthetic-only MVP. No real accounts, health data, public deployment, clinical rules, or external delivery.

## Included capabilities

| Capability | API operation(s) | UI behavior | Decision IDs |
|---|---|---|---|
| List synthetic profiles | `GET /api/v1/profiles` | Show synthetic/local-only profiles; an empty database is a valid empty state. | D-03, D-04, D-14, D-22 |
| Read one synthetic profile | `GET /api/v1/profiles/{profile_id}` | Display only `id`, synthetic `display_name`, and `is_synthetic=true`. | D-03, D-04, D-22 |
| Create and list vital observations | `POST` / `GET /api/v1/profiles/{profile_id}/observations` | Heart rate (`bpm`), paired blood pressure (`mmHg`), body temperature (`°C`); no medical status, diagnosis, or threshold interpretation. | D-04, D-05, D-19, D-20, D-21 |
| Create and list sleep-duration records | `POST` / `GET /api/v1/profiles/{profile_id}/sleep-records` | Positive integer minutes, UTC reporting date, nap-inclusion flag; no sleep quality, fatigue, or clinical interpretation. | D-04, D-06, D-19, D-20, D-21 |
| Operational liveness/readiness | `GET /api/v1/health`; `GET /api/v1/ready` | Operational status only; not a product-data or assessment surface. | Existing API foundation |
| Explicit profile-only local provisioning | Development CLI command documented in `backend/README.md` (not an HTTP route) | Creates one synthetic profile, no records; never runs automatically. | D-03, D-22 |

All collection endpoints use `limit`/`offset` pagination; defaults are 20/0 and maximum `limit` is 100. Collections are ordered deterministically by `created_at DESC, id DESC`. Creates use a body `client_record_id` UUID; identical normalized retries replay the original, changed payload returns a sanitized `409`. Records are append-only through the API.

## Explicitly out-of-scope capabilities

| Capability | Outcome | Required UI state / prohibition | Decision IDs |
|---|---|---|---|
| Accounts, authentication, sessions, roles, profile assignments | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No real login, identity, role, or authorization claims. No public/network service. | D-01, D-02 |
| Profile create/update/delete | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No profile mutation forms or APIs; use only the explicit development provisioning command. | D-03, D-21 |
| Check-ins, psychological ratings/scales/notes | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; do not create or retain ratings/private notes. | D-07 |
| Symptoms or diagnoses | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; do not label a temperature record as a symptom or infer infection/immune status. | D-08 |
| Support requests and lifecycle | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no message storage, queue, transmission, acknowledgement, or claim of receipt. | D-09 |
| Assessment, status rules, DEMO1 evaluation | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no success-shaped `insufficient_data` or `not_configured` result. | D-10, D-11 |
| Baselines | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no activation, calculation, or version reference. | D-12 |
| Trends | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no aggregation, interpolation, or baseline comparison. | D-13 |
| Combined history/detail | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no cross-resource history or private-detail route. The two supported record collections remain available. | D-14 |
| Alerts, acknowledgement/resolution, notifications | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no alert lifecycle or responder-contact claim. | D-15 |
| Exercise plans/logs/adherence | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no activity/adherence or bone/muscle/fitness inference. | D-16 |
| Radiation records/dose | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no interval, device stream, dose record, dose conversion, or threshold. | D-17 |
| Timeline/convergence | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Show unavailable; no cross-domain aggregation or causal inference. | D-18 |
| Record update/delete/export and retention promise | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | No update/delete/export API; no promise of database retention duration. | D-21 |
| Real-person or non-synthetic data | `OUT_OF_SCOPE_FOR_LOCAL_MVP` | Reject from use; synthetic warnings must be prominent; never enter actual personal or health data. | D-22 |

## Still blocked capabilities

**None for the declared local MVP.** All non-included items above have been deliberately excluded rather than left as partially available routes.

For any future scope expansion, human review remains a prerequisite. [HUMAN_REVIEW_REQUIRED.md](./HUMAN_REVIEW_REQUIRED.md) lists the exact questions and safe defaults. Those reviews do not block the capabilities marked included above. An excluded capability must stay explicitly unavailable until the relevant decision is made and its contract is updated.
