# Testing and review

## Commands (from `package.json`)
`npm run typecheck`, `npm run lint`, `npm test` (Vitest, 106 tests), `npm run build`. The dev server prints only its ready banner.

## Browser checks
Python scripts in `docs/qa/` drive Chromium with Playwright. They are not part of `package.json`. Start `npm run dev`, then run a script, for example `python3 docs/qa/landing-overview-check.py`.

| Script | Covers |
|---|---|
| `landing-overview-check.py` | Landing page, orbit visualization, overview, refresh, sign out |
| `crew-add-data-check.py` | Crew list and search, profile tabs, Add data forms, validation, duplicate-submit guard, save then assessment refresh |
| `assessment-trends-check.py` | Assessment panel and states; Trends charts, date ranges, gaps, table and tooltip agreement |
| `guidance-history-journey-check.py` | Guidance content and anchors; History filters, UTC boundaries, pagination, private details; the full user journey; error states |
| `routes-crawl.py` | Every route and navigation link, headings, dead links |
| `axe-audit.py` | axe-core (WCAG 2.0/2.1 A and AA, best practice) over every route and key state, desktop and mobile. Install axe-core outside the repo: `npm i axe-core --prefix /tmp/axe` |

Latest results: typecheck and lint clean; 106 unit tests pass; build succeeds; browser scripts pass 59/59, 89/89, 118/118, 107/107 and 23/23; axe-core reports 0 violations over 21 page states at desktop and mobile; no console errors or warnings in any run.

## Test data
The demo bundles no health readings. For Trends and History, the browser scripts inject made-up records through `window.__AO_QA_TRENDS__` and `window.__AO_QA_HISTORY__`. Those hooks exist only in the dev server (`import.meta.env.DEV`) and are not in the production bundle (checked by searching the built files). With demo mode on, `?demoFail=` (`load`, `refresh`, `empty`, `forbidden`, `unauthorized`, `network`, `validation`, `submit`, `assess`, `filters`, `detail`, `private`, `range`, `sparse`) simulates failures so error states can be seen.

## Review findings that were fixed
1. Orbit nodes: the accessible name did not contain the visible text. It now starts with the label and status, and the glyph is drawn by CSS.
2. History details skipped heading levels. Fixed.
3. Overview loading and error states, and the profile loading and error states, had no `h1`. Fixed.
4. Scrollable tables could not be reached by keyboard. They are now focusable labelled regions.
5. The main navigation dropped the selected profile when moving between profile screens. It now keeps it.
6. No unauthorized (401) or network-error handling, and error code was repeated per page. Replaced by one shared classifier and panel.
7. Unchecked type assertions were replaced by narrowing and type guards. A test counter was removed from the production bundle.
8. React Router future-flag warnings in the console were removed.

Checked and correct: all times are UTC (no local-time API is used); status and coverage are separate; missing values are not 0; Insufficient Data is not Normal; Suspect records are shown with a warning and described as excluded from rules and baselines; check-in notes never appear in lists or in the page until Details is opened and allowed; history has no edit or delete; duplicate submits are blocked; the saved record stays visible if the assessment refresh fails; chart, table and tooltip values match and missing dates are gaps.

## Remaining risks
1. Nothing has been tested against a real backend.
2. `http.ts` returns parsed JSON as the requested type without runtime validation. Add schema checks once the contract exists.
3. Demo screens mostly show empty states because no readings are bundled. A presentation needs a backend or an agreed set of labelled fixtures.
4. The `?demoFail=` hooks also work in production builds, but only while demo mode is on.
5. Automated checks find only part of the possible accessibility issues. No manual screen-reader, Firefox or Safari testing was done. The reference links were not opened.
6. The coverage wording on the Guidance page needs confirmation.
7. The development-only `/design-system` route is still in the dev build (it is not in production builds).
