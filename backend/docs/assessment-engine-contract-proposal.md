# Assessment engine: AX1 and DEMO1 contract gaps

> **SUPERSEDED as project scope (2026-11-15):** this remains an unapproved historical proposal. Assessment/rules are not part of the current health-data MVP contract. The [root API contract](../../API_CONTRACT.md) takes precedence; no clinical or assessment behavior is authorized by this proposal.

**Status: proposal only; assessment code is blocked.** There is no approved AX1/OpenAPI assessment schema or executable DEMO1 rule source in this repository. Do not treat frontend demo fixtures or this proposal as approved contract behavior.

## Repository findings

- `backend/app/api/router.py` has no routes. There are no assessment models, schemas, services, status/coverage enums, error envelope, or persisted snapshots.
- The empty baseline migration defines no domain schema.
- `frontend/src/types/assessment.ts` is explicitly marked proposed and unconfirmed. Its domain names differ from the six canonical names requested by the project.
- `frontend/src/fixtures/demoAssessment.ts` and `demoOverview.ts` are explicitly demo fixtures, not a backend rules source. They mention CV1/CV2 and MS1/MS2, and include one MS1 example, but do not define all requested rule behavior or the required assessment response. The fixture uses alternate domain keys and does not provide persisted evidence IDs or baseline-version snapshots.
- The project research (`zoeya-research.md`) says numeric limits, freshness windows, and persistence rules need a written specification before implementation. It defines only high-level proposed status meanings, not a complete DEMO1 ruleset.
- No approved AX1 document or Screens-2 PDF is present in the workspace.

## Requested assessment envelope (needs AX1 approval)

The request asks for an envelope containing:

- `evaluated_at`
- `contract_version` with value `AX1`
- `ruleset_version` with value `DEMO1`
- `mode` with value `demo_only`
- `is_synthetic=true`
- domain results for exactly `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, and `radiation`

Each domain result is requested to contain:

- `status`: `normal`, `attention`, `urgent`, or `insufficient_data`
- a separate coverage value; `complete`, `partial`, and `missing` are suggested in the request, but the phrase “or the exact approved enum” makes the authoritative enum unresolved
- `reasons[]`, `evidence_ids[]`, `missing_fields[]`, and `latest_at`
- a baseline version reference where a baseline participated in the assessment

Each reason is requested to contain `rule_id`, plain-language `message`, observed condition/value, configured comparison, `next_step`, and limitation text. The exact property names, nullability, data types, and error behavior must be added to AX1 before implementation.

The snapshot must preserve the evidence IDs, baseline version, evaluated time, and exact ruleset version used. Snapshot identity, persistence, reproducibility definition, and storage schema are not yet specified.

## Rule-definition status

The requested identifiers are CV1, CV2, IM1, SL1, PS1, SP1, SP2, MS1, MS2, IM2, and RA1. Their complete approved definitions are not present in the repository. Do not infer domain mappings from identifier prefixes.

| Rule ID | Approved exact definition found? | Blocking information |
|---|---|---|
| CV1 | No | Inputs, unit/context, freshness, comparability, window, comparison/boundaries, status, reason, next step and limitation are unspecified. |
| CV2 | No | Same rule-definition details are unspecified; its relation to CV1 and required paired inputs is also undefined. |
| IM1 | No | Domain mapping and all inputs/conditions are unspecified. |
| SL1 | No | Sleep metric(s), UTC reporting-date/window, subjective scale handling, freshness and comparison are unspecified. |
| PS1 | No | Rating inputs/window, privacy and visibility, trigger, and missing-data behavior are unspecified. |
| SP1 | No | Meaning of “SP”, input and trigger are unspecified; do not assume it means a support request. |
| SP2 | No | Meaning of “SP”, input and trigger are unspecified; do not assume it means a support request. |
| MS1 | No approved definition | A frontend fixture contains a demo-only example (“at least 2 of the last 3 completed UTC dates have no log or a missed log”), but no approved backend rule source confirms its exact window, definition of completed date/missed log, status behavior, or fields. |
| MS2 | No | The frontend mentions a missing log in the last 24 hours, but no approved rule source specifies its inputs, exact cutoff, timezone behavior, status, or relationship to MS1. |
| IM2 | No | Domain mapping and all inputs/conditions are unspecified. |
| RA1 | No | Radiation measurement quantity/unit, source, mission configuration, threshold, freshness and safe response are unspecified. Research requires mission-specific thresholds from radiation-protection staff; none are supplied. |

The source research also warns against inferring bone density, infection/immune function, or personal radiation dose from ordinary consumer sensors. Symptoms or temperature alone cannot establish infection or immune status. No numerical rule may produce `urgent`; urgent requires an explicitly defined immediate-help/support event and approved contract behavior.

## Decisions required from Developer 1 / contract owner

1. Publish the exact AX1 assessment request/response schema, route, authentication/authorization, error envelope, and approved coverage enum.
2. Confirm the six wire-domain identifiers and the allowed status enum.
3. Provide an approved, versioned DEMO1 rule configuration for every implemented identifier: domain, required valid inputs, provenance/quality constraints, freshness, time window, exact deterministic condition and boundaries, status, message, next step, limitations, and tests. Mark unapproved rules blocked rather than approximating.
4. Define the role and explicit event that may produce `urgent`, including lifecycle/acknowledgement semantics. Numerical rules remain unable to produce urgent.
5. Define evidence identifier format and access/privacy constraints, especially for psychological and symptom evidence; define what `latest_at` means when some required inputs are absent.
6. Define coverage computation independently of status, including how missing/stale/suspect inputs affect coverage and whether coverage is rule- or domain-level.
7. Define snapshot storage/identity, deterministic replay guarantees, and exact baseline-version reference behavior.
8. Define the injected-clock interface and staleness interpretation, without using wall-clock time implicitly in pure rules.

## Implementation gate and proposed tests

Do not implement the engine until Developer 1 agrees to the above interface and supplies definitions. After approval, implement only the approved rules and test each rule's boundaries, missing/stale/suspect inputs, independent status/coverage combinations, privacy of evidence/reasons, explicit-help urgent behavior, synthetic-only fixtures, and snapshot reproducibility including evidence, baseline version, and ruleset version.

This is a student-prototype assessment proposal, not a diagnosis, clinical guideline, NASA threshold set, treatment recommendation, or production-ready assessment system.
