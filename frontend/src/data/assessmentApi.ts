// Data access for the Assessment screen. No live implementation: the endpoints and response shape are unconfirmed
// (docs/backend-contract-notes.md). `liveAssessmentApi` stays null until they exist. Demo fixtures only in explicit demo mode.
import { DEMO_ASSESSMENTS } from '../fixtures/demoAssessment'
import { DEMO_ASTRONAUT_ID } from '../fixtures/demoOverview'
import type { AssessmentDetail, AssessmentRefreshResult } from '../types/assessment'
import { ApiError, demoFail, wait } from './common'

export interface AssessmentApi {
  /** Null when no assessment has been evaluated yet. Rejects with ApiError 403 or 404 when not allowed or not found. */
  getAssessment(astronautId: string, signal: AbortSignal): Promise<AssessmentDetail | null>
  /** The backend's documented "refresh assessment" operation, once one is documented. */
  refreshAssessment(astronautId: string, signal: AbortSignal): Promise<AssessmentRefreshResult>
}

export const liveAssessmentApi: AssessmentApi | null = null

export const demoAssessmentApi: AssessmentApi = {
  async getAssessment(id, signal) {
    await wait(500, signal)
    if (demoFail() === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (demoFail() === 'forbidden') throw new ApiError('You are not assigned to this profile, so its assessment is not shown.', { status: 403 })
    const found = DEMO_ASSESSMENTS[id]
    if (!found) {
      // Known demo profiles without an assessment return null. Anything else is not found.
      if (id === DEMO_ASTRONAUT_ID) throw new ApiError('No assessment fixture.', { status: 404 })
      if (/^30000000-0000-4000-8000-00000000000[23]$/.test(id)) return null
      throw new ApiError('No profile was found for this link.', { status: 404 })
    }
    const copy = structuredClone(found)
    // QA hook: ?demoFail=sparse removes optional backend fields to exercise the "not provided" states.
    if (demoFail() === 'sparse') {
      delete copy.unresolved
      delete copy.contractVersion
      delete copy.rulesVersion
      for (const d of copy.domains) {
        delete d.reason
        delete d.ruleIds
        delete d.observed
        delete d.comparison
        delete d.missingInputs
        delete d.latestRecordAt
        delete d.nextReviewStep
        delete d.ruleResults
      }
      copy.domains = copy.domains.filter((d) => d.domain !== 'radiation')
    }
    return copy
  },
  async refreshAssessment(id, signal) {
    await wait(900, signal)
    if (demoFail() === 'refresh') throw new ApiError('Demo mode: simulated refresh failure. The previous assessment is still shown.', { requestId: 'demo-simulated', status: 500 })
    const found = DEMO_ASSESSMENTS[id]
    if (!found) throw new ApiError('Demo mode: there is no fixture assessment for this profile, so nothing was evaluated.', { status: 404 })
    return { assessment: structuredClone(found), message: 'Demo refresh finished. No backend was called, so the fixture is unchanged.' }
  },
}

export function assessmentApiFor(demo: boolean): AssessmentApi | null {
  return demo ? demoAssessmentApi : liveAssessmentApi
}
