# AstroOrbitX Local MVP End-to-End Test Report

> **HISTORICAL / SUPERSEDED SCOPE (2026-11-15):** this report verifies only the former synthetic-only prototype. Its test results do not establish authentication, owner authorization, or safety for real health data. See the [current API contract](../API_CONTRACT.md).

**Date:** 2026-11-15  
**Historical contract authority:** [ASTROORBITX_LOCAL_MVP_DECISIONS.md](./ASTROORBITX_LOCAL_MVP_DECISIONS.md)  
**Scope:** only product operations marked `RESOLVED_FOR_LOCAL_MVP`, plus existing operational health/readiness endpoints. This report does not claim production security, clinical validity, NASA approval, or regulatory compliance.

## Environment

| Component | Environment |
|---|---|
| OS | Linux |
| Backend | Python 3.10.12; FastAPI app via Uvicorn; SQLAlchemy/Alembic |
| Database | Fresh SQLite file `/tmp/astroorbitx-e2e-20261115.db`; schema migrated to head; initially no profiles or records |
| Frontend | Node v22.14.0; npm 10.9.2; Vite on `http://127.0.0.1:5173` |
| Backend URL | `http://127.0.0.1:8000`, explicitly bound to `127.0.0.1` |
| Test profile | Explicitly provisioned synthetic profile `11111111-1111-4111-8111-111111111111`, display name `Synthetic E2E Profile` |

No automatic seeding was used. The initial `GET /api/v1/profiles?limit=20&offset=0` returned `{"items":[],"limit":20,"offset":0}`. The profile was created later by the documented explicit development provisioning command.

All values submitted during this run were synthetic test examples. No real-person or real health data was used. A server `is_synthetic=true` label does not independently prove input provenance.

## Commands run and results

Commands below were run from the workspace root unless their `cd` is shown.

### Clean database and migrations

```sh
test ! -e /tmp/astroorbitx-e2e-20261115.db
cd backend
ASTROORBITX_DATABASE_URL=sqlite:////tmp/astroorbitx-e2e-20261115.db .venv/bin/alembic upgrade head
ASTROORBITX_DATABASE_URL=sqlite:////tmp/astroorbitx-e2e-20261115.db .venv/bin/alembic downgrade base
ASTROORBITX_DATABASE_URL=sqlite:////tmp/astroorbitx-e2e-20261115.db .venv/bin/alembic upgrade head
```

**Result:** all upgrade and downgrade steps passed. The database was upgraded again to `head` for the live application.

### Start local application and provision the profile

Backend, from `backend/`:

```sh
ASTROORBITX_DATABASE_URL=sqlite:////tmp/astroorbitx-e2e-20261115.db .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Frontend, from `frontend/`:

```sh
PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173
```

Explicit profile provisioning, from `backend/`:

```sh
ASTROORBITX_DATABASE_URL=sqlite:////tmp/astroorbitx-e2e-20261115.db .venv/bin/python -m app.cli provision-profile --display-name "Synthetic E2E Profile" --id 11111111-1111-4111-8111-111111111111
```

**Result:** backend health returned `{"status":"ok"}`; frontend returned HTTP 200; initial profile collection was empty; explicit provisioning created the one profile.

### Backend tests

```sh
backend/.venv/bin/python -m pytest backend/tests -q
```

**Result:** 77 passed; one existing Starlette/AnyIO `BlockingPortal` deprecation warning.

### Frontend tests, typecheck, lint, and build

```sh
cd frontend
PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm test -- --run
PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run typecheck
PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run lint
PATH="/tmp/astroorbitx-node-v22.14.0/bin:$PATH" npm run build
```

**Results:** 69 tests passed across 16 files; typecheck passed; lint passed; production build passed (121 modules transformed).

### Runtime OpenAPI and canonical-domain checks

```sh
backend/.venv/bin/python -c 'import json, urllib.request; d=json.load(urllib.request.urlopen("http://127.0.0.1:8000/openapi.json")); ops={(p,m.upper()) for p,methods in d["paths"].items() for m in methods if m in {"get","post","put","patch","delete"}}; expected={("/api/v1/health","GET"),("/api/v1/ready","GET"),("/api/v1/profiles","GET"),("/api/v1/profiles/{profile_id}","GET"),("/api/v1/profiles/{profile_id}/observations","GET"),("/api/v1/profiles/{profile_id}/observations","POST"),("/api/v1/profiles/{profile_id}/sleep-records","GET"),("/api/v1/profiles/{profile_id}/sleep-records","POST")}; assert ops==expected,(ops,expected); print(json.dumps({"operation_count":len(ops),"exact_match":True,"operations":sorted(ops)}))'
cd backend && .venv/bin/python -c 'from app.models.domain import CANONICAL_DOMAINS; import re; from pathlib import Path; text=Path("../frontend/src/lib/domains.ts").read_text(); frontend=tuple(re.findall(r"\{ key: '\''([^'\'']+)'\''", text)); assert frontend==CANONICAL_DOMAINS,(frontend,CANONICAL_DOMAINS); print(frontend)'
```

**Results:** runtime OpenAPI had exactly 8 operations: health/readiness and the 6 approved product operations. The existing `test_openapi_product_routes_and_schemas_match_approved_reference` also passed as part of the backend suite, checking response/request schemas and error shapes. Frontend and backend canonical IDs matched exactly: `cardiovascular`, `sleep_fatigue`, `psychological`, `musculoskeletal`, `immune`, `radiation`.

Live retry, invalid-input, and excluded-route probes were run while both local servers were running:

```sh
backend/.venv/bin/python -c 'import json, urllib.error, urllib.request; base="http://127.0.0.1:8000/api/v1"; profile="11111111-1111-4111-8111-111111111111"; payload={"client_record_id":"33333333-3333-4333-8333-333333333333","metric":"heart_rate","value":70,"unit":"bpm","measured_at":"2026-11-14T12:00:00Z","source":"manual","quality":"valid"}; req=lambda: urllib.request.Request(f"{base}/profiles/{profile}/observations", data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"}, method="POST"); first=urllib.request.urlopen(req()); first_body=json.load(first); retry=urllib.request.urlopen(req()); retry_body=json.load(retry); invalid_payload={**payload,"client_record_id":"44444444-4444-4444-8444-444444444444","value":0}; invalid_req=urllib.request.Request(f"{base}/profiles/{profile}/observations", data=json.dumps(invalid_payload).encode(), headers={"Content-Type":"application/json","X-Request-ID":"55555555-5555-4555-8555-555555555555"}, method="POST");
try: urllib.request.urlopen(invalid_req)
except urllib.error.HTTPError as error: invalid_status=error.code; invalid_body=json.load(error); invalid_request_id=error.headers["X-Request-ID"]
assert first.status == 201 and first_body["replayed"] is False; assert retry.status == 200 and retry_body["replayed"] is True and retry_body["id"] == first_body["id"]; assert invalid_status == 422 and invalid_body["status"] == 422 and invalid_request_id == invalid_body["request_id"] == "55555555-5555-4555-8555-555555555555"; print(json.dumps({"first_create":first.status,"identical_retry":retry.status,"replayed":retry_body["replayed"],"invalid_value":invalid_status,"request_id_preserved":invalid_request_id}))'
backend/.venv/bin/python -c 'import urllib.error, urllib.request; base="http://127.0.0.1:8000/api/v1"; paths=["/assessments","/trends","/history","/support-requests","/profiles/11111111-1111-4111-8111-111111111111/check-ins"]; results={};
for path in paths:
 try: results[path]=urllib.request.urlopen(base+path).status
 except urllib.error.HTTPError as error: results[path]=error.code
assert all(status==404 for status in results.values()), results; print(results)'
```

**Results:** first create `201`; identical retry `200` with `replayed=true` and the same resource ID; invalid value `422` with matching preserved request ID; all five excluded API paths returned `404`.

## Browser and live API journey

The app was opened in the integrated browser at `http://127.0.0.1:5173/crew`.

1. **Empty workspace:** the Profiles page displayed “No profiles provisioned”; no sample profile appeared automatically.
2. **Profile list and detail:** after explicit CLI provisioning, the profile appeared in the list. Opening it showed profile details and empty vital-observation and sleep-duration collections.
3. **Heart-rate observation:** submitted through the Add synthetic data screen; `POST /api/v1/profiles/{profile_id}/observations` returned `201`, `metric=heart_rate`, `value=72.5`, `unit=bpm`, `is_synthetic=true`, `replayed=false`. UI confirmed persistence.
4. **Blood-pressure observation:** submitted `systolic=120`, `diastolic=80`; POST returned `201`, `unit=mmHg`, `is_synthetic=true`, `replayed=false`. UI confirmed persistence.
5. **Body-temperature observation:** submitted `value=36.8`, `unit=°C`, `quality=suspect`; POST returned `201`, preserving `quality=suspect`, `is_synthetic=true`, `replayed=false`. No status was calculated or displayed.
6. **Sleep-duration record:** submitted `duration_minutes=420`, `reporting_date=2026-11-14`, `includes_naps=false`; `POST /api/v1/profiles/{profile_id}/sleep-records` returned `201`, `is_synthetic=true`, `replayed=false`. UI confirmed persistence.
7. **Refresh/persistence:** navigated back to the profile detail page, causing fresh profile, observation-list, and sleep-list GETs. The page showed all three observation variants, including the suspect quality as entered, and the sleep record. Values remained raw records; no assessment or interpretation appeared.
8. **Invalid input:** attempted to submit sleep duration `0`. Browser validity rejected the field; no POST was issued and no saved confirmation appeared. A live API request with `value=0` returned sanitized `422 application/problem+json`; the supplied UUID `X-Request-ID` was preserved in both header and body.
9. **Idempotent retry:** the approved same-payload retry probe returned `201` initially and `200` on retry, with `replayed=true` and the same resource ID. No duplicate record was created for that idempotency key.

The browser displayed the observations in UTC; its local `12:30`, `12:31`, and `12:32` input times were returned as `07:30Z`, `07:31Z`, and `07:32Z`, respectively, in this environment.

## Exclusions verified

- The Add data screen explicitly marked psychological check-ins and other unsupported record types unavailable. No check-in fields or check-in submission was attempted because check-ins are `OUT_OF_SCOPE_FOR_LOCAL_MVP`.
- Browser routes `/assessment`, `/trends`, and `/history` each displayed the unavailable MVP state, explicitly said no records were displayed or created, and showed no computed health status or fabricated product data.
- Live GET probes for `/api/v1/assessments`, `/api/v1/trends`, `/api/v1/history`, `/api/v1/support-requests`, and `/api/v1/profiles/{profile_id}/check-ins` all returned `404`. None appeared in runtime OpenAPI.
- No external support delivery, acknowledgement, auth, alerts, radiation records, combined timeline, assessment, trend, or clinical/NASA rule behavior was exercised or claimed.

## Failures and notes

- **Application or contract test failures:** none.
- **Browser automation selector issue:** an initial locator for “Record type” matched both a section name and the select label. The locator was narrowed to the exact label; all subsequent interactions completed. This was an automation selector ambiguity, not an application failure.
- Browser request-aborted notices appeared when navigating away while prior page loads were still in flight; subsequent page loads completed and returned the expected records.

This report documents only the operations and journeys actually run above. It does not imply that excluded features are implemented or that the prototype is suitable for real personal/health data.
