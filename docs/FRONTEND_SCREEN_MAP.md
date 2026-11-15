# Frontend Screen Map

**Reviewed:** 2026-11-15. This is an implementation map for the nine requested screens, not a visual-regression claim. The referenced “AstroOrbitX Screens” PDF and original presentation assets are not present in the workspace; only the written requirements and existing repository components are available.

| Screen | Existing/reusable UI | Data source and route | Gap / safety boundary |
|---|---|---|---|
| Landing | `LandingPage`, `OrbitView`, landing/orbit styles | Public, no measurement API | Current landing is a minimal account entry; restore six-system orbit, Record/Evaluate/Explain content, and limitations. No status is computed. |
| Overview | `PersonalDashboardPage`, `measurementsApi`, `OrbitView`, existing heart-rate chart | Actual account: `GET /api/v1/me`, measurements and trends | Add orbit and a small saved-record trend/recent-list composition. All values remain owner-scoped; no assessment/status badges. |
| Add Data | `MeasurementEntryPage`, `measurementInput`, `measurementsApi` | Actual account: `POST /api/v1/me/measurements` | Keep current five categories, units, timezone, CSRF, idempotent retry, validation, and confirmed-save states. |
| Crew | `CrewPage`, `profilesApi` | Synthetic-only legacy `GET /api/v1/profiles` | Mount only under an unmistakable `/demo/crew` path; no actual accounts or records may appear. Empty until an explicit synthetic profile is provisioned. |
| Crew Profile | `CrewProfilePage`, `profilesApi` | Synthetic-only legacy `/api/v1/profiles/{id}/...` reads | Mount only under `/demo/crew/:profileId`; keep demo label and links in demo mode. |
| Assessment | `AssessmentPage`, `assessmentApi` | `liveAssessmentApi` is `null`; no contract route exists | Show an unavailable, non-computing state. Do not invent status, coverage, rules, or response data. |
| Trends | `PersonalTrendsPage`, `measurementsApi` | Actual account: `GET /api/v1/me/trends` | Already owner-scoped and unit-separated. Keep empty days as gaps/nulls and enforce the 31-day limit. |
| Guidance and Research | `GuidancePage`, `content/guidance.ts` | Static approved reference content; no health-record API | Correct obsolete “not connected” statements for supported data operations; preserve research limitations and clearly state no assessment is active. |
| History | `PersonalHistoryPage`, `measurementsApi` | Actual account: `GET /api/v1/me/measurements` | Already owner-scoped; keep category/date filters, exact unit/timezone display, and paged results. |

## Separation Plan

- Actual-user screens remain inside `RequireAuth` and use `/api/v1/me/...` adapters.
- Legacy synthetic Crew/Profile/Add Data screens use a distinct `/demo/...` route group and the existing synthetic-only API. They never call actual-account adapters.
- The backend legacy repositories filter synthetic profiles, and the authenticated measurement repositories filter by session-derived user/profile. Do not relax those constraints for visual parity.
- No demo reading fixtures are seeded into an actual account. Demo pages show an empty state when no explicit synthetic profile exists.

## Verification Limit

No reference PDF or screenshots were found under the project workspace. The implementation can restore the repository’s existing visual language, but PDF-based pixel/element comparison cannot be performed without the reference file. Report screenshot-based fidelity as unverified until the team supplies the PDF.