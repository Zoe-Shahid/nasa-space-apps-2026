# Backend Developer 2 handoff

> **SUPERSEDED as implementation direction (2026-11-15):** this handoff predates the actual-measurement MVP direction. Use the [root API contract](../../API_CONTRACT.md) and [current blocker register](../../API_CONTRACT_BLOCKERS_AND_DECISIONS.md). Retain only technical context compatible with those documents.

**Status:** Infrastructure handoff only. The repository has no approved AX1/OpenAPI contract for authentication, data intake, or delayed synchronization. The names and behavior below describe existing foundation components or explicitly marked proposals; they are not permission to invent API surfaces.

## Existing foundation

| Area | Current repository state |
|---|---|
| Declarative model base | `app.db.base.Base`; no domain models are registered. |
| Settings | `app.core.config.Settings` and cached `get_settings()`. `ASTROORBITX_DATABASE_URL` configures the database; default is SQLite under `backend/data/astroorbitx.db`. |
| Engine and session | `app.db.session.engine`, `SessionLocal`, `build_engine()`, `build_session_factory()`, and `get_session()`. The dependency yields a SQLAlchemy `Session` and closes it; it does not commit implicitly. Own writes in explicit transaction scopes, for example `with SessionLocal.begin() as session:`. |
| Migrations | Alembic is configured; `0001_initial_baseline` is intentionally empty. |
| API router | `app.api.router.api_router` is empty; no routes are defined. |
| Schemas/errors | No request/response schemas or shared API error envelope are implemented. |

## No shared data-intake/sync names exist yet

- **Models:** No `Observation`, `DailyCheckIn`, `ReportedSymptom`, `SupportRequest`, or outbox/sync model exists.
- **Schemas:** No intake request/response or sync schemas exist.
- **Routes:** No intake, history, support lifecycle, queue, simulated-transmit, or acknowledgement route exists.
- **Enums:** No support-request lifecycle or sync status enum exists. Do not add or rename one before AX1/API-owner coordination.
- **Authentication/authorization:** No auth dependency, roles, profile scoping, or reviewer assignment model exists.
- **Errors:** No standardized conflict, unauthorized, forbidden, or validation envelope exists.

## Contract proposal to review

See [data-intake-contract-proposal.md](data-intake-contract-proposal.md). Its proposed support-request sequence is `saved_on_device -> queued -> transmitted -> acknowledged`, with a distinct explicit trigger for each state. In particular:

- Local save may only produce `saved_on_device`.
- Queueing may only produce `queued`.
- A successful simulated transmission may produce `transmitted`; it is not evidence of real delivery.
- Only an explicit simulated acknowledgement may produce `acknowledged`.
- Failures preserve the last confirmed state; retries reuse the same `client_record_id`.
- Duplicate queue submissions must not produce duplicate records.
- Check-ins and symptoms remain non-queueable unless both the contract and application architecture approve offline queueing.

These state names and transitions are **not currently implemented or AX1-approved**. The proposal does not supply route paths, timestamp/error field names, or unapproved payload schema.

For the API, model, intake-provenance, and DEMO1 rule audit, see [backend-developer-2-rules-proposal.md](backend-developer-2-rules-proposal.md). Its rules and service interfaces are proposals only; agree with Developer 1 before implementation.

Exercise records, radiation intervals, and alert lifecycle definitions are also absent from AX1; their exact blockers are recorded in [exercise-radiation-alert-contract-gaps.md](exercise-radiation-alert-contract-gaps.md).

The timeline integration dependencies, privacy requirements, and executed foundation QA results are recorded in [timeline-integration-contract-gaps.md](timeline-integration-contract-gaps.md).

## Integration/test gates

Before implementation, obtain approval for AX1 routes, schemas, roles, private-note permissions, idempotency uniqueness/canonicalization, lifecycle transitions, timestamp representation, retry/failure semantics, and offline-storage scope. Then coordinate model/enum names with Backend Developer 2, add a migration, use the existing `Base` and explicit SQLAlchemy transaction pattern, and test offline queueing, retries, duplicate suppression, invalid transitions, failure recovery, authorization, and private-data isolation against the approved contract.

This is a student-prototype simulation foundation handoff, not a claim of production-grade security or spacecraft communication capability.
