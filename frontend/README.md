# AstroOrbitX frontend

React 18, TypeScript and Vite 6. A synthetic-data prototype for review support. It is not a diagnosis or treatment system.
Visual reference: `AstroOrbitX_Screens-2.pdf`. Contract AX1, demo rules DEMO1.

## Getting started
```
npm install
npm run dev
```
Open the app and choose "Open the demo" on the landing page to see the screens with clearly labelled synthetic data. Without demo mode the data screens say the backend is not connected, because no API contract has been agreed yet (see `docs/backend-contract-notes.md`).

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (also serves `/design-system`) |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Screens
Landing, Overview, Crew, Crew profile, Add data, History, Assessment, Trends, Guidance and research, About, and a demo-only sign-in page.

## Structure
- `src/styles/`: `tokens.css` (colour, spacing, radius, type, border, shadow and focus tokens; use these, do not hard-code values) plus `base`, `ui`, `shell` and per-screen stylesheets.
- `src/components/ui/`: shared primitives (Button, Field, TextInput, Select, Tabs, Card, PageHeading, StatusBadge, CoverageIndicator, QualityBadge, states, UtcTime and others).
- `src/components/shell/`: app shell, header and navigation, prototype notice, footer.
- `src/components/orbit/`: the orbital health visualization. Solid ring = evaluated status; dashed ring = Insufficient Data.
- `src/components/{overview,trends,history,entry}/`: screen-specific components. Charts are hand-built SVG; no chart library is installed.
- `src/pages/`: one file per screen.
- `src/data/`: the data layer. `http.ts` is the only place `fetch` is used; `*Api.ts` files define each area's interface, a demo implementation, and a `live*Api` that stays `null` until the backend contract is confirmed.
- `src/types/`: proposed request and response shapes, and the status and coverage values.
- `src/lib/`: formatting, validation and presentation helpers (UTC time, date ranges, history, trends, entry forms). `src/content/`: Guidance and prototype text.
- `src/fixtures/`: labelled demo fixtures. No health readings are bundled.

## Conventions
- Status (`normal | attention | urgent | insufficient_data`) and coverage (`complete | partial | missing`) are separate components. Unknown values render as "Unsupported format", never as Normal.
- Every time is UTC and labelled. Use `UtcTime`; `dateOnly` for UTC reporting dates.
- Colour is never the only signal: badges carry text and an icon; "Insufficient Data" also uses a dashed border.
- Interactive targets are at least 44px tall (the `sm` button is 36px; avoid it for primary actions).
- Status, coverage, rules, counts, daily means, baselines and trend summaries come from the backend. The browser does not calculate them.
- Demo fixtures are used only in explicit demo mode and never after a failed request. A missing value is never shown as 0.
- Once a contract exists, copy `.env.example` and set `VITE_API_BASE_URL`.

## Docs
- `docs/repository-audit.md`: starting state of the repository and open design decisions.
- `docs/backend-contract-notes.md`: what the backend team needs to confirm.
- `docs/testing-and-review.md`: how the app is tested, review findings and remaining risks. Browser and accessibility scripts are in `docs/qa/` (Python Playwright; axe-core is installed outside the repo, not in `package.json`).
