# Repository audit (starting state)

Audited: `Zoe-Shahid/nasa-space-apps-2026`, branch `main` (private; 9 commits, 1 branch, 0 tags). No files were edited during the audit.

## Repository map
The root held only `.gitignore`, `README.md`, `yasha research.md` and `zoeya-research.md`. There was no frontend or backend code: no `package.json`, lockfile, Vite or TypeScript config, `src/`, routes, components, styles, API client, types or env example.

## Commands and tooling
No `package.json` existed. The frontend now has `dev`, `build`, `preview`, `typecheck`, `lint` and `test`. At the start there was no React Router, chart library, form library, test runner, linter or type checker. React Router 6, Vitest, ESLint and TypeScript were added; there is still no chart or form library (charts are hand-built SVG).

## Screens in the design reference (nine)
Landing, Overview, Add data, Crew list, Crew profile, Assessment, Trends, Guidance and research, History. All nine are now implemented. Not in the reference but listed in the requirements document: login, alerts, reviewer tools, the check-in, support, symptom, exercise and radiation forms, and dedicated tablet and mobile layouts. The app is responsive, and login is a demo-only page.

## Backend contract gaps
No schemas are defined for: Profile (created date, reviewer, radiation device, baseline summary), Trend points and summary, Assessment `reasons[]` and `rule_results[]`, Alert, Baseline, RadiationSummary, Ruleset, and error `code` values. There is no get-by-ID endpoint to resolve `evidence_ids`. `GET /astronauts` has no search parameter (the Crew screen has "Search by alias"). No OpenAPI URL has been supplied. The cookie/CSRF flow needs an agreed dev proxy or origin. See `backend-contract-notes.md`.

## Decisions for the backend team
- Dashboard: the reference shows an orbit view with one detail panel; the requirements say six cards.
- Layout: the reference uses a top navigation on most screens and a dark left sidebar on Guidance and History. The app uses the top navigation everywhere.
- Naming: Guidance vs About; Crew vs Astronauts; Open overview vs Open dashboard. The navigation shows both Guidance and About.
- Add data: the reference shows "measured at" as locked; the requirements allow historical timestamps. The requirements also ask for a UTC/local toggle, while the reference says "Times in UTC".
- Whether to design login, alerts, reviewer tools, the remaining forms and dedicated mobile layouts.
- Route shape: the app uses flat routes with `?astronaut=`; the requirements specify `/astronauts/:id/...`.
- Auth transport (proxy or cross-origin) and the OpenAPI source for typed models.
