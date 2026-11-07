// DEMO FIXTURE for the Crew list and profile. Used only in explicit demo mode, never after a failed request.
// Alex Carter's values come from the approved reference (pages 4 and 5). Riya Sharma and Liam Chen have only the
// fields printed on the crew list: no baselines, radiation stream, measurements or assessment are invented for them.
import type { CrewProfileDetail, CrewProfileSummary } from '../types/crew'
import { DEMO_ALEX_ID, DEMO_LIAM_ID, DEMO_RIYA_ID } from './demoOverview'

export const DEMO_CREW: CrewProfileSummary[] = [
  { id: DEMO_ALEX_ID, displayName: 'Alex Carter', isSynthetic: true, missionStart: '2026-10-25', missionDay: 7, missionPhaseLabel: null },
  { id: DEMO_RIYA_ID, displayName: 'Riya Sharma', isSynthetic: true, missionStart: '2026-10-25', missionDay: 7, missionPhaseLabel: null },
  { id: DEMO_LIAM_ID, displayName: 'Liam Chen', isSynthetic: true, missionStart: '2026-11-01', missionDay: null, missionPhaseLabel: 'Pre-mission' },
]

export const DEMO_CREW_DETAILS: Record<string, CrewProfileDetail> = {
  [DEMO_ALEX_ID]: {
    ...DEMO_CREW[0],
    createdAt: '2026-10-20T00:00:00Z',
    reviewer: 'demo_reviewer',
    baselines: [{ label: 'Heart rate', version: 'v1', active: true }],
    radiationStream: { configured: false },
    // No demo readings are bundled, so the measurements list shows its empty state.
    recentMeasurements: [],
    latestAssessment: {
      evaluatedAt: '2026-10-31T12:00:00Z',
      overallStatus: 'attention',
      overallCoverage: 'partial',
      domains: [
        { domain: 'cardiovascular', status: 'normal' },
        { domain: 'sleep', status: 'normal' },
        { domain: 'wellbeing', status: 'insufficient_data' },
        { domain: 'bone_muscle', status: 'attention' },
        { domain: 'immune', status: 'insufficient_data' },
        { domain: 'radiation', status: 'insufficient_data' },
      ],
    },
  },
  [DEMO_RIYA_ID]: { ...DEMO_CREW[1], recentMeasurements: [], latestAssessment: null },
  [DEMO_LIAM_ID]: { ...DEMO_CREW[2], recentMeasurements: [], latestAssessment: null },
}
