# Work Baseline

> **SUPERSEDED as product-scope guidance (2026-11-15):** this baseline predates the actual-measurement MVP direction. Preserve its environment and test observations as historical evidence only. The [current API contract](./API_CONTRACT.md) takes precedence over its synthetic-only safe-work/blocker guidance.

Baseline recorded from the current workspace on 2026-11-14. This document records commands executed for this baseline; earlier test results in other status documents are not treated as current results.

## Repository state

- Workspace: `/home/daud/Downloads/nasa-space-apps-2026-main`
- Git metadata was unavailable. `git rev-parse --show-toplevel` and `git status --short --branch` both exited with code 128 (`fatal: not a git repository`); no `.git` directory was found within three parent levels. The current branch and tracked/untracked user changes therefore cannot be determined. No changes were discarded.
- No application source, API contract, models, migrations, or tests were edited for this baseline. The only authored project file is this report.
- Environment setup created `backend/.venv` via the locked backend setup and `frontend/node_modules` via `npm ci`; the frontend production build also generated its normal `dist` output. Dependency manifests and lockfiles were not changed.

## Commands and results

Commands were run from the indicated project directory. Exit codes are recorded as returned by the shell.

| Area | Command | Exit | Result |
|---|---|---:|---|
| Git | `git rev-parse --show-toplevel` | 128 | Not a Git checkout; root unavailable. |
| Git | `git status --short --branch` | 128 | Not a Git checkout; branch and status unavailable. |
| Backend initial attempt | `uv run pytest` (workspace root) | 127 | `uv` was not on `PATH`. |
| Backend initial attempt | `PATH="/tmp/astroorbitx-uv-bootstrap/bin:$PATH" uv run --locked pytest` (workspace root) | 2 | Not run in the backend project; `uv` reported `--locked` has no effect outside a project and could not find `pytest`. |
| Backend environment | From `backend/`: `PATH="/tmp/astroorbitx-uv-bootstrap/bin:$PATH" uv sync --locked` | 0 | Locked environment setup completed. |
| Backend tests | From `backend/`: `PATH="/tmp/astroorbitx-uv-bootstrap/bin:$PATH" uv run pytest` | 0 | 24 tests passed. One warning: Starlette's `anyio.abc.BlockingPortal` alias is deprecated. |
| Frontend environment | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm ci` | 0 | 194 packages installed; 195 audited. Warnings: `eslint@9.39.5` is deprecated/unsupported, and npm reported 9 moderate vulnerabilities. No audit fixes were applied. |
| Frontend lint | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run lint` | 0 | Passed. |
| Frontend typecheck | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run typecheck` | 0 | Passed. |
| Frontend tests | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm test` | 0 | 13 test files and 46 tests passed. Vitest printed an informational note that disabling isolation could make execution faster; no test warning or failure was reported. |
| Frontend production build | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run build` | 0 | TypeScript build and Vite production build passed; 118 modules transformed. |
| Runtime OpenAPI | From `backend/`: `PATH="/tmp/astroorbitx-uv-bootstrap/bin:$PATH" uv run python -c 'import json; from fastapi.testclient import TestClient; from app.core.config import Settings; from app.main import create_app; app = create_app(Settings(app_environment="test", database_url="sqlite://", _env_file=None)); client = TestClient(app); response = client.get("/openapi.json"); response.raise_for_status(); schema = response.json(); operations = [(path, method.upper(), details["operationId"]) for path, methods in schema["paths"].items() for method, details in methods.items() if method in {"get", "post", "put", "patch", "delete"}]; print(json.dumps({"status": response.status_code, "paths": schema["paths"], "operations": operations}, sort_keys=True)); assert {(path, method, operation_id) for path, method, operation_id in operations} == {("/api/v1/health", "GET", "healthCheck"), ("/api/v1/ready", "GET", "readinessCheck")}'` | 0 | Live `GET /openapi.json` returned 200. Only `GET /api/v1/health` (`healthCheck`) and `GET /api/v1/ready` (`readinessCheck`) were present. |

The Node runtime used for frontend checks was installed under `/tmp/ao-baseline-node-22.14.0` and reported Node `v22.14.0`, npm `10.9.2`. The backend test environment reported Python `3.10.12` and pytest `8.3.5`.

## OpenAPI and implementation boundary

The generated OpenAPI document currently exposes exactly two operations:

- `GET /api/v1/health` — operational liveness response.
- `GET /api/v1/ready` — operational database readiness response.

These are operational endpoints, not product-data or authentication APIs. No product, crew/profile, data-intake, assessment, trend/history, alert, support, or authentication operations are currently exposed. Do not treat frontend screens or types as evidence that these operations exist.

## Environment requirements

- Backend: project metadata requires Python `>=3.10,<3.13`; backend setup and tests are documented using `uv`. The initial environment did not have `uv` on `PATH`; the available temporary `uv` binary was used explicitly.
- Frontend: README documents `npm install` and the `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` scripts. Node and npm were absent from the initial `PATH`, and `frontend/node_modules` was absent. A temporary Node 22.14.0/npm 10.9.2 runtime and the existing npm lockfile were used.
- Dependency/security warnings observed during setup are recorded above. They were not changed as part of this non-application-code baseline.

## Safe independent work and blocked product work

Safe to continue independently, without implying unavailable product behavior:

- Maintain contract, audit, setup, and implementation-status documentation.
- Improve research/guidance citations and prototype-boundary wording without making clinical claims.
- Improve visual design, accessibility, responsive behavior, and explicit unavailable/empty/error states.
- Maintain tests for existing operational endpoints, request/error handling, logging redaction, settings, and migration infrastructure.
- Improve non-product developer experience and reproducible CI/build tooling.

Blocked until the contract and linked requirements resolve the relevant decisions:

- Authentication, login/session transport and lifecycle, roles, profile assignment, and authorization.
- Astronaut profile CRUD and all health-record schemas, validation rules, units, timestamps, provenance, quality, privacy, and write/retry semantics.
- Product operations for the six health domains, including intake and record history/detail.
- Assessments, baselines, trends, thresholds, missing-data behavior, statuses, and persistence.
- Alerts/notifications and support-request schemas, permissions, acknowledgement, and lifecycle.
- Frontend product API integration or any UI that claims those operations persist or return real product data.

Until blockers are approved and implemented, keep product operations unavailable and report them as blocked; do not add inferred endpoints, fields, rules, accounts, or records.

## Subsequent approved prototype implementation

After this baseline was recorded, the user approved a bounded local-only, synthetic-only prototype scope in [API_CONTRACT_IMPLEMENTATION_ADDENDUM.md](./API_CONTRACT_IMPLEMENTATION_ADDENDUM.md). [API_CONTRACT.md](./API_CONTRACT.md) now maps the D-01–D-23 decisions and limits implementation authority to that addendum. The supported product slice is profile list/read, create/list vital observations, and create/list sleep-duration records. Authentication, clinical rules, and the other listed product workflows remain unavailable. This update supersedes the earlier blocked-product list only for those explicitly approved operations.

Locally re-verified after implementation on 2026-11-14:

| Area | Command | Result |
|---|---|---|
| Backend | From `backend/`: `PATH="/tmp/astroorbitx-uv-bootstrap/bin:$PATH" uv run pytest` | Exit 0; **54 passed**, one Starlette `BlockingPortal` deprecation warning. |
| Frontend lint | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run lint` | Exit 0. |
| Frontend typecheck | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run typecheck` | Exit 0. |
| Frontend tests | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm test` | Exit 0; **14 files, 54 tests passed**. |
| Frontend build | From `frontend/`: `PATH="/tmp/ao-baseline-node-22.14.0/runtime/bin:$PATH" npm run build` | Exit 0; Vite transformed 120 modules. |

The first post-implementation frontend run exposed lint, typecheck, and test failures. Those were corrected and the successful results above are from the subsequent rerun. GitHub Actions has not been run, and Git branch/status remain unavailable because the workspace has no Git metadata.
