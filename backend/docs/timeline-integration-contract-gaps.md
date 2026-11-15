# Timeline and integration QA handoff

> **SUPERSEDED as current MVP scope (2026-11-15):** this historical proposal does not add timeline or convergence features to the actual-measurement MVP. Follow the [root API contract](../../API_CONTRACT.md).

**Status: implementation blocked pending approved AX1 and Developer 1 coordination.** No timeline route, shared auth, domain models, service implementations, or approved OpenAPI contract exists in this repository. This document proposes no route spelling or wire-field names.

## Current integration state

- `backend/app/api/router.py` is empty.
- `backend/app/models/` and `backend/app/schemas/` contain only package initializers; no shared domain model/schema names exist.
- `backend/app/db/base.py` provides `Base`; `backend/app/db/session.py:get_session()` yields and closes a session without committing. Explicit transaction scopes are the existing write convention.
- `backend/app/main.py` disables the OpenAPI endpoint (`openapi_url=None`); there are no routes to compare with a contract.
- No shared auth/authorization dependency or error envelope exists.
- There are no baseline, trend, assessment, intake, exercise, radiation, alert, or timeline service implementations.
- The delayed-sync state names `saved_on_device`, `queued`, `transmitted`, and `acknowledged` appear only in an explicitly unapproved proposal; there is no persistence enum/model or API implementation. Alert acknowledgement/resolution enums are also undefined.

## Timeline contract decisions required

The requested timeline may include chronological sleep, fatigue, stress, exercise, symptom, and radiation markers only where the corresponding AX1 resource and access permissions exist. Before implementation, AX1 and Developer 1 must define:

1. The single canonical route and method, auth requirements, profile scope, pagination/range limits, response schema, and error envelope. Do not duplicate or guess route spellings.
2. Exact event/resource types and event timestamp semantics (recorded, observed, interval start/end, created, or another approved timestamp). Define ordering and deterministic tie-break behavior.
3. Exact domain labels and provenance/quality/evidence reference fields. The six required canonical domains are product terminology, but the backend wire values remain unconfirmed.
4. Which event classes/fields are visible to each role and whether symptom events are allowed in a shared timeline. Private psychological and symptom notes must never appear in the shared timeline, even for an otherwise authorized event.
5. How a “convergence marker” is represented: the participating domain set, configured time-window source/value, event eligibility, duplicate suppression, marker evidence references, and whether a marker is recomputed or persisted.
6. Explicit non-causal wording and limitations for convergence markers. The marker may describe temporal proximity only and must not imply one event caused another.
7. Synthetic-data guarantees: how only synthetic demo events are selected and how non-synthetic records are excluded or rejected.
8. Whether the timeline is a query-time projection or a persisted resource, plus snapshot/cache behavior and audit requirements.

Do not treat example durations or windows as an approved configuration. The existing research provides no configured cross-domain convergence window. Until one is approved, no convergence logic should be implemented.

## Privacy and domain safeguards

- Never select or serialize `private_note` or equivalent psychological/symptom free text into shared event DTOs, logs, generic notifications, or analytics.
- Apply authorization before querying astronaut-scoped records, not only after loading a record for filtering.
- Exclude missing, stale, suspect, or incompatible measurements from calculations according to the agreed contract, while preserving required history visibility.
- Do not infer infection/immune status from symptoms/temperature; bone density/muscle mass from exercise logs; or radiation quantity from wearables, heart rate, or illustrations.
- A simulated transmission is not receipt. Do not claim Earth or a responder received a request unless an explicit acknowledged state exists under the approved contract.

## Integration/test plan after contract approval

Coordinate shared route registration, models, schemas, authorization dependencies, error envelope, enums, and session ownership with Backend Developer 1 before implementing the projection. Then add contract-driven integration tests for:

- all six domain result identifiers, separate status/coverage values, and evidence references;
- baseline-version references and deterministic snapshot reproduction;
- missing, stale, suspect, and incompatible data handling;
- timeline chronological ordering, UTC boundaries, range/page constraints, and no fabricated empty values;
- convergence window boundary behavior and non-causal copy;
- role/profile authorization and private-note omission from responses and logs;
- synthetic-only event selection;
- idempotency and alert duplicate/evidence/acknowledgement/resolution behavior if those approved operations are part of the integrated API;
- support lifecycle transitions using exactly the approved shared enum values across API, persistence, and tests;
- migration upgrade/downgrade and a clean setup from the documented `uv sync --locked`, `uv run alembic upgrade head`, and `uv run pytest` commands.

## QA run for current repository state

Executed from `backend/`:

| Command | Result |
|---|---|
| `/tmp/astroorbitx-uv-bootstrap/bin/uv run --locked pytest` | Passed: 7 tests (database/session, empty migration baseline, settings). These do not exercise timeline or domain services, which do not exist. |
| `/tmp/astroorbitx-uv-bootstrap/bin/uv run --locked alembic heads && /tmp/astroorbitx-uv-bootstrap/bin/uv run --locked alembic history` | Passed: `0001_initial_baseline` is the only head; history is the empty baseline from `<base>`. |
| `/tmp/astroorbitx-uv-bootstrap/bin/uv run --locked python -m compileall -q app migrations tests` | Passed: current backend modules compile. |

No backend lint or type-check command is configured in `backend/pyproject.toml`. OpenAPI accuracy cannot be verified because OpenAPI is disabled and no routes/schema exist. Timeline, six-domain integration, status/coverage, evidence, baseline snapshot, stale/suspect, privacy, idempotency, alert lifecycle, and support-lifecycle integration tests were **not run** because the corresponding contract and implementation are absent.

This handoff is not a claim of production readiness or real communication capability.
