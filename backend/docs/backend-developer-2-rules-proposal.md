# Backend Developer 2: service and DEMO1 rules proposal

> **SUPERSEDED as project scope (2026-11-15):** this proposal's synthetic-only scope is not active. The [root API contract](../../API_CONTRACT.md) is authoritative; this document is historical domain/rules research, not permission to implement assessments or clinical rules.

**Status: review only.** No service modules or rules are implemented by this document. Do not treat this proposal as approved AX1 behavior, clinical guidance, NASA thresholds, or a production assessment system. Coordinate interface names and schemas with Backend Developer 1 before implementation.

The assessment-specific route, envelope, evidence, coverage, snapshot, and missing DEMO1 definitions are tracked in [assessment-engine-contract-proposal.md](assessment-engine-contract-proposal.md).

## Contract and implementation audit

The repository does not contain an AX1/OpenAPI specification. The backend currently has:

- No registered API routes (`app.api.router.api_router` is empty).
- No domain SQLAlchemy models; the initial Alembic migration is an empty baseline.
- No Pydantic request/response schemas, service interfaces, or shared API error envelope.
- No baseline, trend, assessment, rules, alert, exercise, or radiation service modules. `app.services` only has its package initializer.
- No approved input schema, model, route, or persisted field for the six domains, observation intake, quality/provenance, exercise, radiation, or alerts.
- No configured Python enum in backend code for assessment status.

Developer 1's [backend handoff](backend-developer-2-handoff.md) confirms the same infrastructure boundaries. Its [intake contract proposal](data-intake-contract-proposal.md) is explicitly not approved.

The database convention that does exist is `app.db.base.Base`, with metadata naming conventions. `app.db.session.get_session()` yields a SQLAlchemy `Session` and closes it; it does not implicitly commit. Transaction-owning code should use an explicit transaction scope (for example `with SessionLocal.begin() as session:`) after the model/interface contract is settled.

## Confirmed product vocabulary versus API contract

The project requirements specify six canonical domain identifiers:

| Domain identifier | Display concept |
|---|---|
| `cardiovascular` | Cardiovascular |
| `sleep_fatigue` | Sleep and fatigue |
| `psychological` | Psychological wellbeing |
| `musculoskeletal` | Bone and muscle |
| `immune` | Immune and infection concerns |
| `radiation` | Radiation exposure |

These are requirements for the product, not yet backend/OpenAPI model values. The user requirements also specify the status vocabulary `normal`, `attention`, `urgent`, and `insufficient_data`; no backend enum or response schema currently implements it. Data coverage must remain a separate concept.

The research guides define proposed meanings: Normal means no configured condition triggered in available valid data; Attention means a documented demonstration rule identifies a concern for review; Urgent requires a defined escalation condition or explicit immediate-help request; Insufficient Data means required valid/current data or context is missing. They explicitly caution against inventing medical cutoffs.

## Intake metadata findings

No intake fields exist in backend models or schemas. In particular, none of these are currently implemented backend fields: `client_record_id`, `is_synthetic`, `source_label`, `acquisition_type`, `entry_method`, or `quality`.

The names and concepts appear only as requested semantics in the unapproved [intake contract proposal](data-intake-contract-proposal.md). That proposal requests:

- UUID idempotency key `client_record_id`;
- synthetic marker `is_synthetic=true`;
- provenance concepts `source_label`, `acquisition_type` (`measured`, `self_reported`, `modeled`), and `entry_method` (`manual`, `import`);
- `quality` (`valid`, `suspect`);
- timezone-aware client timestamps normalized to UTC and server-assigned identifiers, `created_at`, and `created_by`.

These names, enum values, requiredness, applicability, and wire formats are not AX1-approved and must be reconciled with Developer 1 before code uses them.

## Proposed DEMO1 configuration policy

This proposal intentionally defines a safe policy structure, not numerical rules:

1. Keep each domain's rules independently versioned and deterministic. Do not calculate an opaque combined health/risk score.
2. Read status values and coverage separately. Never infer a status from a coverage percentage or convert missing values to zero.
3. Use only records whose quality is explicitly valid in any rule or baseline calculation. Suspect records remain visible in history but are excluded from calculations.
4. Do not interpolate missing observations. Trend summaries must preserve data gaps and report the valid record count/date range once those fields are contract-defined.
5. Emit `normal` only when the approved rule's required inputs are available, current, valid, and the rule is evaluated with no trigger. The contract still needs to define "current", required inputs, and freshness per domain.
6. Emit `attention` or `urgent` only from a named, versioned, explicitly approved demonstration rule. No current source supplies complete thresholds or escalation configuration. An immediate-help request remains a separate support-request event unless the agreed contract explicitly defines how it maps to an assessment status.
7. Emit `insufficient_data` when the contract-defined inputs or context needed for that domain's assessment are missing, stale, suspect, or incomplete. The contract must define staleness and completeness.
8. Each triggered rule should be explainable by a human-readable reason, the relevant input references, and a rule version, but response field names and visibility are pending AX1 approval. Do not put private psychological or symptom notes into crew-wide results, alerts, logs, or analytics.
9. Keep DEMO1 clearly labelled as a student prototype demonstration configuration, not NASA thresholds, clinical guidance, an approved response protocol, or diagnosis/treatment logic.

### Domain rule readiness

| Domain | Research/source support | DEMO1 inputs and thresholds still needed |
|---|---|---|
| Cardiovascular | Research discusses heart rate, blood pressure, context, trends, and data quality. | Approved observation schema, contextual requirements, freshness, and any non-clinical review rule; no threshold is approved. |
| Sleep/fatigue | Research recommends keeping sleep duration, quality, and fatigue distinct. It gives a synthetic short-duration/fatigue example but explicitly says any flag is a team-designed rule, not a NASA diagnostic threshold. | Approved scales, date semantics, valid-day definition, stale-data handling, and rule/window approval. The example is not a threshold. |
| Psychological | Research recommends private mood/stress check-ins and says repeated low mood/high stress could prompt a private check-in under a documented rule. | Approved rating scales/window, privacy permissions, missing-data behavior, and threshold/trigger approval. Never infer wellbeing from a missed check-in. |
| Musculoskeletal | Research discusses exercise adherence, symptoms, and clinical measures, while warning that ordinary wearables do not measure bone density. | Approved exercise plan/log schema, adherence definition, symptom permissions, baseline inputs, and any review rules. No fitness/bone-status inference. |
| Immune | Research discusses symptom reporting and lab sources, but the prototype cannot diagnose infection or quantify immune function. | Approved symptom and laboratory schema, provenance/quality rules, and human-review conditions. Symptoms or temperature do not establish infection/immune status. |
| Radiation | Research requires dedicated dosimetry and mission-specific thresholds from radiation-protection staff; ordinary wearables do not establish personal dose. | Approved radiation measurement quantity/unit, source/provenance, interval, quality, and mission-configured thresholds. Do not convert quantities or invent dose limits. |

## Service interface proposal for Developer 1 review

Before creating implementation modules, agree on:

- Canonical input/output types and module import paths for each service.
- Whether baseline/trend functions consume ORM records, Pydantic schemas, or explicit immutable domain values.
- Assessment response fields, status enum ownership, separate coverage model, rule identifiers/versioning, and per-domain required-input definition.
- Alert persistence/lifecycle and duplicate suppression ownership.
- Exercise-plan/log and radiation-record schemas, routes, permissions, and source/quality semantics.
- Clock injection convention for freshness and date-window calculations.
- Error envelope and transaction boundaries between routes, services, repositories, and session dependency.

Subject to that agreement, the intended architecture is thin routes -> services -> repositories -> database. Pure calculations should accept explicit records/configuration and an injected clock where time affects results. Services must not commit partial writes or log credentials, private notes, or complete health payloads.

## Proposed research/configuration approval path

The research sources support explanatory content and recommend transparent demonstration rules, but do not fully specify an executable DEMO1 ruleset. Before implementation, the project owner and Backend Developer 1 should approve a versioned configuration containing, for every rule:

- target domain and synthetic-only scope;
- explicitly defined input fields, units, provenance, quality, and freshness;
- deterministic comparison/window and boundary behavior;
- output status and coverage semantics;
- human-readable reason and safe next-step wording;
- privacy/visibility classification;
- rule version, owner, and tests for missing, suspect, boundary, stale, and valid inputs.

No numerical limits or clinical/mission thresholds are supplied by this proposal. For radiation, any threshold must come from an explicitly approved mission/team source. For cardiovascular, sleep, psychological, exercise, and immune domains, any numeric threshold or scoring window likewise requires explicit project approval and must remain labelled as a demonstration rule.
