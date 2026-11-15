# Exercise, radiation, and alert contract gaps

> **SUPERSEDED as current MVP scope (2026-11-15):** this historical proposal does not add exercise, radiation, or alert features to the actual-measurement MVP. Follow the [root API contract](../../API_CONTRACT.md).

**Status: contract change proposal only. No API, model, migration, or service implementation is approved by this document.** The workspace contains no AX1/OpenAPI specification. The backend router is empty, the initial migration is an empty baseline, and there are no exercise, radiation, or alert backend schemas/models.

## Repository evidence

- `backend/app/api/router.py` registers no routes.
- `backend/app/models/` and `backend/app/schemas/` contain only package initializers.
- `backend/migrations/versions/0001_initial_baseline.py` creates no tables.
- `frontend/docs/backend-contract-notes.md` explicitly says request models, fields, units/scales, permissions, and validation for exercise and radiation are not supplied; those forms are not built. It also says no Alert schema exists.
- The frontend test fixtures and research papers are not an AX1/OpenAPI contract. Research notes describe dosimetry and exercise generally, but do not define the requested resource schemas, status enums, persistence behavior, or routes.

## Exercise records: decisions needed

The requested behavior is to support reviewer-created synthetic exercise plans and crew completion logs, with one log reusable as context across cardiovascular, musculoskeletal, and wellbeing views. Exercise activity/adherence must not be presented as a direct measurement of bone density or muscle mass.

AX1 must define:

- Canonical resource/model names and whether a plan and a completion log are separate resources.
- Create/read/update operations and exact route names; role permissions for reviewer plan creation and crew logging; astronaut/profile scoping.
- Plan/log fields and types: activity/session identity, scheduled date/time/timezone, completion/adherence state, duration/workload if supported, context, source/provenance, quality, synthetic marker, creator and timestamps.
- Whether a log references a plan, what happens when the plan changes, and how one log is linked to multiple views without creating duplicated records.
- Allowed status enums and validation bounds, including the distinction between missed, partial, completed, not-yet-reported, and unknown if those states are supported.
- Idempotency, history/list behavior, error responses, and transaction rules.

No exercise route or field name is confirmed. Do not equate activity or completion with measured bone density, muscle mass, strength, or fitness.

## Radiation interval records: field and semantic ambiguity

The prompt requests a synthetic interval record for one profile-selected device stream and names the exact quantity `personal_dose_equivalent_hp10` with unit `mSv` **if those are approved AX1 fields**. No such AX1 definition exists in the repository. The exact spelling, quantity semantics, accepted unit representation, and enum values therefore cannot be confirmed.

AX1 must define:

- Canonical model/schema and exact route names and methods.
- Whether the exact field is `personal_dose_equivalent_hp10`, whether `mSv` is the only allowed unit, numeric precision/range, and the precise Hp(10) definition. Preserve Hp(10) as operational personal dose equivalent; do not relabel it as effective dose or absorbed dose.
- Profile-selected stream identity, device identity, external record ID, interval start/end representations and timezone requirements, overlap policy, and whether adjacent intervals are allowed.
- Provenance fields and accepted values; quality values and review workflow; exact semantics/permission of `review_requested`; synthetic-only and source constraints.
- Which cumulative snapshots and dose-rate inputs are prohibited, and how to reject them if the schema has a way to represent those input types.
- Idempotency, deduplication scope, authorization, error envelope, history/read behavior, and transaction boundaries.

If AX1 confirms interval-only measurements and a single canonical quantity/unit, validate that exact contract. Do not infer radiation from ordinary wearables, heart rate, symptoms, or solar-event illustrations; do not convert quantities or invent mission thresholds.

## Alert lifecycle: decisions needed

No alert enum, alert schema, lifecycle route, persistence model, or approved DEMO1 rule configuration exists. Existing requirements say alerts may only be created from configured Attention/Urgent conditions, should deduplicate by astronaut/rule/scope, update evidence and `last_seen`, and distinguish acknowledgement from resolution. Those requirements do not define the wire contract.

AX1 must define:

- Alert and transition resource names, endpoints, permissions, response/error schemas, and event audit behavior.
- Exact status enum and allowed transitions, including whether acknowledgement and resolution are independent fields/events or states.
- Deduplication scope keys and behavior when a trigger reappears after acknowledgement/resolution.
- How evidence IDs and rule version are stored and updated; whether reason, next step, limitation, observed/comparison, and last-seen values are snapshots or mutable.
- Who may acknowledge, resolve, reopen, or dismiss; actor/time fields; required reason; and whether resolution can be reversed.
- Explicit confirmation that acknowledgement never clears/resolves an alert and that no external notification/responder contact is implied.
- Which exact DEMO1 Attention/Urgent rules can create alerts. No complete approved rule definitions are present; numerical rules must not produce Urgent.

## Contract alignment and implementation gate

Before implementation, add the approved schemas, operations, role permissions, enums, validation rules, and error formats to AX1/OpenAPI and coordinate shared model names with Backend Developer 1. Then extend the existing `Base`, use the established explicit SQLAlchemy transaction convention (`get_session()` does not commit), add a migration, keep calculations/lifecycle logic in services rather than route handlers, and test:

- Exercise plan/log permissions, single-log reuse, idempotency, and separation from bone-density/muscle-mass claims.
- Radiation interval ordering and boundary validation, stream-scoped overlap rejection, exact quantity/unit preservation, provenance/quality/review fields, and prohibited cumulative/rate inputs.
- Alert deduplication, evidence and `last_seen` updates, acknowledgement without resolution, resolution behavior, persistence, authorization, and no external-delivery claims.

Until AX1 defines the above, no exercise/radiation/alert code or tests can be written without inventing fields, routes, or enums.
