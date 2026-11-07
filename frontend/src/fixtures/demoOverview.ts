// DEMO FIXTURE. Clearly labelled synthetic data for the explicit demo mode ONLY.
// - It is never used when demo mode is off, and never used as a fallback after an API failure.
// - Assessment wording is taken from the approved reference screens (AstroOrbitX_Screens-2.pdf, pages 2, 5 and 6).
// - This fixture bundles NO health readings (no vitals, sleep totals, trend points or recent records).
// - The reference only names rule IDs CV1, CV2, MS1 and MS2. Other domains have no rule ID here on purpose, so the
//   UI shows "Not provided" instead of an invented identifier.
// - There are no private check-in notes in this fixture.
import type { OverviewResponse } from '../types/overview'

// Fixture profile IDs. Alex's ID is the one printed on the approved crew-profile reference. The other two follow the same pattern.
export const DEMO_ALEX_ID = '30000000-0000-4000-8000-000000000001'
export const DEMO_RIYA_ID = '30000000-0000-4000-8000-000000000002'
export const DEMO_LIAM_ID = '30000000-0000-4000-8000-000000000003'
export const DEMO_ASTRONAUT_ID = DEMO_ALEX_ID

export const DEMO_FIXTURE_LABEL = 'Demo mode. Every value on this page is a synthetic fixture bundled with the app. It was not loaded from the backend.'

export const DEMO_OVERVIEW: OverviewResponse = {
  astronaut: { id: DEMO_ALEX_ID, displayName: 'Alex Carter', missionDay: 7 },
  assessment: {
    evaluatedAt: '2026-10-31T12:00:00Z',
    overallStatus: 'attention',
    overallCoverage: 'partial',
    domains: [
      {
        domain: 'cardiovascular',
        status: 'normal',
        coverage: 'complete',
        explanation: 'Two recent resting heart rates and two recent resting blood pressures were evaluated against the recorded baseline. No configured demo concern.',
        ruleIds: ['CV1', 'CV2'],
        latestRecordAt: '2026-10-31T11:00:00Z',
        nextReviewStep: 'Nothing to review under the demo rules.',
      },
      {
        domain: 'sleep',
        status: 'normal',
        coverage: 'complete',
        explanation: 'The recorded sleep total was evaluated under the demo rules. No configured demo concern.',
        ruleIds: [],
        latestRecordAt: '2026-10-31T07:00:00Z',
        nextReviewStep: 'Nothing to review under the demo rules.',
      },
      {
        domain: 'wellbeing',
        status: 'insufficient_data',
        coverage: 'partial',
        explanation: 'Required current inputs are missing, so this area cannot be evaluated. This is not a Normal result.',
        ruleIds: [],
        latestRecordAt: null,
        nextReviewStep: 'Add the missing data.',
      },
      {
        domain: 'bone_muscle',
        status: 'attention',
        coverage: 'partial',
        explanation: '2 of the last 3 planned exercise sessions have no log or a missed log. This reports completion only. It does not show bone density, strength or fitness.',
        ruleIds: ['MS1', 'MS2'],
        latestRecordAt: '2026-10-29T19:00:00Z',
        nextReviewStep: 'Check whether the unlogged sessions were missed or not yet entered.',
      },
      {
        domain: 'immune',
        status: 'insufficient_data',
        coverage: 'partial',
        explanation: 'Required current inputs are missing, so this area cannot be evaluated. This is not a Normal result.',
        ruleIds: [],
        latestRecordAt: null,
        nextReviewStep: 'Add the missing data.',
      },
      {
        domain: 'radiation',
        status: 'insufficient_data',
        coverage: 'missing',
        explanation: 'No radiation stream is configured for this profile, so this area cannot be evaluated. This is not a Normal result.',
        ruleIds: [],
        latestRecordAt: null,
        nextReviewStep: 'A reviewer must configure a radiation stream before records can be added.',
      },
    ],
    unresolvedConcerns: [
      { domain: 'bone_muscle', ruleId: 'MS1', status: 'attention', summary: '2 of the last 3 planned sessions have no log or a missed log.' },
    ],
  },
  // No demo readings: no vitals, no sleep total, no heart-rate trend and no recent records are bundled.
  // The page shows its honest empty states ("No reading loaded", no trend, no records) instead.
  latestReadings: { heartRate: null, bloodPressure: null, temperature: null, sleepTotal: null },
  restingHeartRateTrend: null,
  recentRecords: [],
}

/** A profile with no recorded data yet: no assessment, no readings, no trend. Shows the empty states honestly. */
function noDataOverview(id: string, displayName: string, missionDay: number | null): OverviewResponse {
  return {
    astronaut: { id, displayName, missionDay },
    assessment: null,
    latestReadings: { heartRate: null, bloodPressure: null, temperature: null, sleepTotal: null },
    restingHeartRateTrend: null,
    recentRecords: [],
  }
}

export const DEMO_OVERVIEWS: Record<string, OverviewResponse> = {
  [DEMO_ALEX_ID]: DEMO_OVERVIEW,
  [DEMO_RIYA_ID]: noDataOverview(DEMO_RIYA_ID, 'Riya Sharma', 7),
  [DEMO_LIAM_ID]: noDataOverview(DEMO_LIAM_ID, 'Liam Chen', null),
}
