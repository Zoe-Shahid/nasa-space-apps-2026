# Backend contract notes

**No AX1 API contract, endpoint list, OpenAPI file, request/response types or shared API client exists in this repository.** The frontend therefore calls no endpoint. Each `live*Api` object in `src/data/` is `null`, so with demo mode off every data screen says "The backend is not connected yet". Nothing is replaced by mock data after a failure.

## What is ready for the contract
- `src/data/http.ts`: the only place `fetch` may be used. It contains no paths or schemas. The base URL comes from `VITE_API_BASE_URL` (see `.env.example`).
- `src/data/common.ts` and `errors.ts`: `ApiError` with a `kind` (network, unauthorized, forbidden, not_found, validation, server, unknown), `classifyError`, and the shared `ApiErrorView`.
- One interface per area, already used by the UI: `OverviewApi`, `CrewApi`, `AssessmentApi`, `TrendsApi`, `HistoryApi`, `EntryApi` (`src/data/*Api.ts`), with proposed request and response types in `src/types/`. The proposed shapes are questions for the backend team, not facts about the backend.
- Demo mode ("Open the demo") uses labelled synthetic fixtures. It bundles no health readings, so readings, trends, history and recent records show their empty states.

## Questions for the backend team
| Area | Needed |
|---|---|
| Sign-in and session | Mechanism (cookie or token), 401 behaviour, how the UI learns the reviewer name and role. `demo_reviewer` is a fixed demo identity today |
| Crew | List and profile paths; assigned-only rule; 403 vs 404; field names (`types/crew.ts`). No search parameter is known, so search filters the loaded list in the browser |
| Overview | Paths; how the profile is selected (`?astronaut=` is assumed); response (`types/overview.ts`); a null assessment for profiles with none; the refresh-assessment operation |
| Assessment | Paths; response (`types/assessment.ts`); server-supplied counts of unresolved Attention and Urgent items; per-domain reason, rule IDs, observed, comparison, missing inputs, latest record, next step; individual rule results; domain key spelling |
| Trends | Path and parameters (`from`/`to` inclusive UTC dates); the supported range (custom ranges appear only if `maxRangeDays` is above 7); one entry per UTC date with null for no data; series definitions (key, label, unit, decimals); summary lines as ready-to-show strings; baseline (drawn only if supplied) |
| History | List path; category names; metric filter keys; `from` inclusive and `to` exclusive as UTC instants; `limit` and `offset`; newest-first ordering by the server; `total`; page size |
| Record details | Path; how private fields are gated by role (`granted`, `denied`, `none`, or a 403); that check-in notes are never returned in lists |
| Data entry | Path; request fields and enums (`types/entry.ts`); the idempotency key (`clientRecordId` is assumed from the form's "Retry ID"); 422 field-error format; whether an assessment refresh is required after saving; upper limits for blood pressure and temperature (only heart rate has a documented check: above 0 and at most 400 bpm) |
| Other entry forms | Request models and role rules for sleep, daily check-in, support request, symptoms, exercise and radiation (reviewer only). These forms are not built |
| Errors | Shape of error bodies and the request-ID header (`x-request-id` is assumed) |

## Guidance page: source material
All text, limits and references on the Guidance page come from the team's design reference (page 8); the reference URLs are the hyperlinks embedded in that PDF. Gaps:
- The sources (S1 to S11) are not in the repository, only their titles and URLs. The page cannot check that each summary matches its source.
- The URLs could not be opened from the build environment, so reachability was not tested. Please open each once.
- The reference gives no definitions of the coverage levels. The three lines on the page restate the idea in plain words and should be confirmed or replaced (`src/content/guidance.ts`, `COVERAGE_MEANINGS`).
- Future work is listed only for Bone and muscle and in the Not-connected list. Nothing else was added.
- There is no separate About screen in the reference; About uses wording from the landing and guidance screens.

## Rules the UI keeps
Status, coverage, counts, rule results, daily means, baselines and trend summaries are shown exactly as the backend supplies them and are never calculated in the browser. A missing value is never shown as 0, and Insufficient Data is never shown as Normal. A saved record stays visible even if the assessment refresh that follows it fails.
