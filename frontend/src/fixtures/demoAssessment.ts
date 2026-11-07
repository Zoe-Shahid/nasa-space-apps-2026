// DEMO FIXTURE for the Assessment screen. Explicit demo mode only; never a fallback after a failure.
// Wording is copied from the approved reference (AstroOrbitX_Screens-2.pdf, pages 2 and 6). Page 6 spells out only the
// Bone and muscle explanation, so every other optional field is left out and the screen shows "Not provided".
// No vitals, sleep totals or trend values are bundled.
import type { AssessmentDetail } from '../types/assessment'
import { DEMO_ALEX_ID } from './demoOverview'

const INSUFFICIENT = 'Required current inputs are missing, so this area cannot be evaluated. This is not a Normal result.'

export const DEMO_ASSESSMENT: AssessmentDetail = {
  astronaut: { id: DEMO_ALEX_ID, displayName: 'Alex Carter' },
  evaluatedAt: '2026-10-31T12:00:00Z',
  contractVersion: 'AX1',
  rulesVersion: 'DEMO1',
  overallStatus: 'attention',
  overallCoverage: 'partial',
  unresolved: { attention: 1, urgent: 0 },
  domains: [
    {
      domain: 'cardiovascular',
      status: 'normal',
      coverage: 'complete',
      reason: 'Two recent resting heart rates and two recent resting blood pressures were evaluated against the recorded baseline. No configured demo concern.',
      ruleIds: ['CV1', 'CV2'],
      latestRecordAt: '2026-10-31T11:00:00Z',
      nextReviewStep: 'Nothing to review under the demo rules.',
    },
    {
      domain: 'sleep',
      status: 'normal',
      coverage: 'complete',
      reason: 'The recorded sleep total was evaluated under the demo rules. No configured demo concern.',
      ruleIds: [],
      latestRecordAt: '2026-10-31T07:00:00Z',
      nextReviewStep: 'Nothing to review under the demo rules.',
    },
    { domain: 'wellbeing', status: 'insufficient_data', coverage: 'partial', reason: INSUFFICIENT, ruleIds: [], latestRecordAt: null, nextReviewStep: 'Add the missing data.' },
    {
      domain: 'bone_muscle',
      status: 'attention',
      coverage: 'partial',
      reason: '2 of the last 3 planned exercise sessions have no log or a missed log.',
      ruleIds: ['MS1'],
      observed: 'Plans on 28, 29 and 30 Oct. One log, on 29 Oct, reported as partial.',
      comparison: 'Attention if at least 2 of the last 3 completed UTC dates have no log or a missed log.',
      missingInputs: 'None for MS1. MS2 has no log in the last 24 hours.',
      latestRecordAt: '2026-10-29T19:00:00Z',
      nextReviewStep: 'Check whether the unlogged sessions were missed or not yet entered.',
      ruleResults: [
        { ruleId: 'MS1', status: 'attention' },
        { ruleId: 'MS2', status: 'insufficient_data' },
      ],
    },
    { domain: 'immune', status: 'insufficient_data', coverage: 'partial', reason: INSUFFICIENT, ruleIds: [], latestRecordAt: null, nextReviewStep: 'Add the missing data.' },
    {
      domain: 'radiation',
      status: 'insufficient_data',
      coverage: 'missing',
      reason: 'No radiation stream is configured for this profile, so this area cannot be evaluated. This is not a Normal result.',
      ruleIds: [],
      latestRecordAt: null,
      nextReviewStep: 'A reviewer must configure a radiation stream before records can be added.',
    },
  ],
}

/** Only Alex has an assessment in the demo. The other profiles have none (the API returns null). */
export const DEMO_ASSESSMENTS: Record<string, AssessmentDetail> = { [DEMO_ALEX_ID]: DEMO_ASSESSMENT }
