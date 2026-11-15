# Proposed AX1 change: data intake and persistence

> **SUPERSEDED as contract authority (2026-11-15):** this proposal predates the actual-measurement MVP and does not define the adopted wire schema. The [root API contract](../../API_CONTRACT.md) is authoritative; compatible validation/privacy ideas may be considered only after current decisions are approved.

**Status: proposal only — not an approved contract.** This repository contains no AX1/OpenAPI specification, and the backend router and database schema are empty. Do not implement endpoints or persistence from this document until the API owner approves the route and schema decisions called out below.

## Contract change requested

Add contract-defined create and history-read operations for observations, daily check-ins, reported symptoms, and support requests. Define each operation's method, path, authentication requirement, role permissions, request schema, response schema, error envelope, and pagination behavior in AX1/OpenAPI. Do not infer CRUD operations beyond those explicitly approved.

Support requests must be a distinct resource with its own explicitly defined lifecycle. They must not be created implicitly as a check-in field or treated as an acknowledged request unless the contract returns an acknowledged state.

## Required data semantics

The following requirements come from the requested product behavior. They define semantics, not an approved wire schema:

- Observation types in scope: heart rate in bpm; paired blood pressure in mmHg; body temperature in °C with oral site only where specified by the contract; and sleep duration in hours associated with a UTC report date.
- Sleep quality and fatigue are separate subjective values. Neither is derived from sleep duration.
- Check-ins may contain mood, stress, and other ratings only when individually specified and approved by the contract.
- Private notes are stored separately from list-summary data. They are never returned in list summaries and are available only through an explicitly authorized detail operation. They must not enter logs or generic notifications.
- Reported symptoms may carry a contract-defined code or description, severity, onset time, and recorded time. They are reports only; symptoms or temperature do not establish infection or immune status.
- The requested idempotency key is `client_record_id` (UUID). Repeating it with the same canonical payload returns the original record; reusing it with a different payload returns HTTP 409.
- Records are marked synthetic using `is_synthetic=true` for this prototype. Provenance concepts requested are `source_label`, `acquisition_type` (`measured`, `self_reported`, or `modeled`), `entry_method` (`manual` or `import`), and `quality` (`valid` or `suspect`). The contract must define where these apply, their nullability, and allowed combinations.
- All client-supplied timestamps must include a timezone and be normalized to UTC. The server assigns record identifiers, creation timestamps, and creator identity; exact wire names and formats require approval.
- MVP import means manual transcription of fictional external data. It does not imply integration with a real device or laboratory.
- Suspect records remain available in history and are excluded from baseline and rule calculations.
- Missing values remain missing, never become zero or a normal status. Validation completes before any write is committed; failed requests leave no partial records.

## Decisions required before implementation

1. **Routes and operations:** Exact paths and methods for creation, history/list reads, authorized detail reads, and any support-request lifecycle transitions. Whether update or delete is allowed is unspecified.
2. **Identity and authorization:** Authentication mechanism, supported roles, who may create each record type, profile scoping, private-note access rules, and authorization response behavior. The prior backend audit found no approved role or auth contract.
3. **Request and response schemas:** Exact field names and types for each resource; required versus optional values; whether observations share an envelope or have per-type payloads; how paired blood pressure is represented; how UTC report dates are encoded; and which provenance concepts apply to each record.
4. **Validation:** Approved minimum/maximum bounds and precision for measurements and ratings; accepted symptom code vocabulary or free-text policy; timestamp ordering rules; and validation error format. No ranges or rating scales are specified here.
5. **Read/privacy behavior:** List ordering, filters, pagination, which non-private fields appear in summaries, and the separate detail response that may expose a private note to an authorized caller.
6. **Idempotency and conflicts:** Canonical payload definition (including normalization rules), uniqueness scope for `client_record_id`, retention period, and exact 409 response body.
7. **Server metadata and audit:** Exact response names and formats for server-assigned identifiers, creation time, creator identity, request correlation, and audit events. Audit data must use identifiers only and must not include passwords, tokens, private notes, or health payloads.
8. **Transactions and downstream calculations:** Whether creation triggers assessment refresh, how failures are reported without rolling back a successfully persisted record, and confirmation that suspect records are excluded by downstream calculations.
9. **Support lifecycle and delayed-sync simulation:** Confirm that the AX1 lifecycle is `saved_on_device`, `queued`, `transmitted`, `acknowledged`; define which actor/action is allowed to perform each transition; identify the authoritative component for each transition; and specify timestamp and error/retry fields. No delivery-to-Earth or responder-acknowledgment claim may be made without an explicitly recorded `acknowledged` state.
10. **Offline behavior:** Confirm whether observations, check-ins, symptoms, and support requests may be queued locally; whether a browser/device outbox is in scope; its storage/privacy/retention guarantees; and how queued payloads are reconciled after authentication or authorization changes.
11. **Simulation scope:** Define the simulated-transmission operation and its failure semantics. It must be documented and presented as a prototype simulation, not as spacecraft communications or real delivery.

## Proposed delayed-sync transition semantics (approval required)

These are a proposed interpretation of the requested lifecycle, not active API behavior or an approved enum:

| State | Meaning | Trigger |
|---|---|---|
| `saved_on_device` | The support request was durably stored by the local application. No transmission is implied. | Successful local save only. |
| `queued` | The saved request has been accepted into the retryable synchronization queue. | Explicit queueing of that saved request only. |
| `transmitted` | The prototype's simulated transmission step completed successfully. This does not mean Earth or a responder received it. | Successful simulated-transmission action only. |
| `acknowledged` | The simulation explicitly recorded an acknowledgement event. | Explicit acknowledgement action only. |

Recommended transition graph for contract review: `saved_on_device -> queued -> transmitted -> acknowledged`. Do not skip states, mark a record `transmitted` on local save/queue, or mark it `acknowledged` merely because a transmission was simulated. Define whether retries from `queued` remain `queued` until a simulated transmission succeeds and how retrying a prior `transmitted` request behaves.

For retry safety, reuse the same `client_record_id` for the same logical payload at every retry. The server-side idempotency behavior described above must return the original persisted record for an identical payload and conflict for changed content. Duplicate queue submissions must reference the existing queued item rather than creating a second record. A failed operation must preserve the last confirmed state and must not manufacture a later state; retry/error metadata and timestamps need contract approval.

State-change timestamps should be recorded for each confirmed transition, but exact field names, timestamp response shape, and whether the record stores all transition times or only the latest transition require contract approval. Check-ins and symptom records must not be queued unless both AX1 and the application architecture explicitly support it.

## Tests required after approval

Add contract-driven tests covering measurement units and approved ranges; timezone-aware timestamp validation and UTC normalization; omitted versus explicit zero values; per-type required fields; idempotent replay and changed-payload conflict; suspect-record history inclusion and calculation exclusion; authentication and cross-profile authorization; reviewer assignment boundaries if that role is approved; private-note omission from lists and logs; support-request lifecycle; and transaction rollback on validation or persistence failure.

## Current repository evidence

- `backend/app/api/router.py` has no registered routes.
- The current initial Alembic migration is an empty baseline.
- There is no backend support-request model, sync-state enum, synchronization route, or persisted outbox.
- No local browser outbox or offline queue exists in the frontend contract notes.
- `frontend/docs/backend-contract-notes.md` states that no AX1/OpenAPI file, endpoint list, request/response types, or shared API client is present and identifies data-entry request fields, units, permissions, and error formats as unresolved.

Until these decisions are approved and added to AX1/OpenAPI, this proposal intentionally defines no routes, request/response field names beyond those explicitly supplied in the request, state timestamp field names, retry/error fields, or unprovided measurement limits.
