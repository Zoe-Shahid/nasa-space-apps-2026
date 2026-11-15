# Testing and review

> **HISTORICAL / SUPERSEDED SCOPE (2026-11-15):** the tests and product limitations below describe the prior synthetic-only frontend. They do not define actual-MVP requirements or establish readiness for real health data. Follow the [root API contract](../../API_CONTRACT.md).

## Project checks

Run from `frontend/`:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests use isolated synthetic inputs and do not insert real-data records. Profile/record adapter tests cover exact routes and payloads, response parsing, and sanitized validation errors. Add Data tests cover input validation, in-flight duplicate suppression, and saving/persisted/error response states. Login remains unavailable, and unsupported product APIs have no adapters.

Latest local verification (2026-11-14, Node `v22.14.0`, npm `10.9.2`): `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all passed; Vitest reported 14 files and 54 tests passed. The informational Vitest worker-isolation note does not indicate a failing test. GitHub Actions has not been run from this workspace.

## Browser checks

The scripts under `docs/qa/` are optional Playwright checks, not part of `package.json`. They use no product-data fixtures:

| Script | Covers |
|---|---|
| `routes-crawl.py` | Route headings, navigation, unavailable states, and a not-found link |
| `axe-audit.py` | axe-core against public and backend-unavailable screens at desktop and mobile sizes |

Start `npm run dev -- --host 127.0.0.1` before running either script. `axe-audit.py` requires axe-core installed outside the repository as noted in its header. Do not expose the synthetic prototype to public networks.

## Product limitations

Only local synthetic profile list/read and vital-observation/sleep-duration create/list are connected. They are not for real personal or health data, are not production-secure or clinically validated, and do not provide assessment rules. Authentication/login, profile mutation, check-ins, symptoms, support, exercise, radiation, baselines, trends, alerts, and combined history remain unavailable. API failures are errors, never fixture-backed success. The design-system page retains explicitly labelled illustrative layout content only.

Research and guidance content is educational and is not an approved clinical or mission protocol. No manual screen-reader, Firefox, or Safari testing is documented here.
