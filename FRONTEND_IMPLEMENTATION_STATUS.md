# Frontend Implementation Status

**Reviewed:** 2026-11-15. **Authority:** [API_CONTRACT.md](./API_CONTRACT.md). The active route tree uses authenticated, owner-scoped API adapters; this is not production certification.

## Implemented workflows

- `/login`: sign in or create a local account; session restore uses `GET /api/v1/me`.
- `/profile`: view and edit the signed-in user’s display name.
- `/add-data`: create heart-rate, blood-pressure, body-temperature, blood-glucose, and sleep-duration records with explicit units, date/time, timezone, optional private note, client validation, loading/error states, and success only after server confirmation.
- `/overview`: latest saved records and account-derived category counts from up to 100 persisted entries.
- `/history`: owner-scoped category/date filtering and saved values, units, timestamps, timezones, and private notes; the UI caps each result page at 100 and supports narrowing filters.
- `/trends`: owner-scoped daily series with unit-specific charts and exact aggregate values, null gaps, and a 31-day range limit.

The shared HTTP client includes cookies and attaches the session CSRF token to POST/PATCH requests. No synthetic measurements or fixtures are inserted into actual accounts. Legacy synthetic profile adapters are not used in active actual-user workflows. Unavailable assessment/guidance routes are not mounted.

## Validation status

Editor diagnostics reported no errors in the changed frontend files. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and browser end-to-end/accessibility checks were **not run** in this environment because both `node` and `npm` are absent from `PATH`; installed `node_modules` alone is not executable. No frontend pass is claimed.

Run from `frontend/` after installing Node.js and npm:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Limits

No account recovery/email verification or diagnosis/risk/treatment workflow exists. This project is not clinically validated or NASA-endorsed. Keep the backend local; public use requires the open gates in [`API_CONTRACT_BLOCKERS_AND_DECISIONS.md`](./API_CONTRACT_BLOCKERS_AND_DECISIONS.md).
