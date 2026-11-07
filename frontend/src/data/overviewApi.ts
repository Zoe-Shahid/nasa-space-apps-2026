// Data access for the Overview screen.
//
// There is NO live implementation yet, on purpose: no endpoint, path or response schema has been supplied by the
// backend team, and this project must not invent them (see docs/backend-contract-notes.md). Once the contract is
// confirmed, implement `OverviewApi` against it and assign it to `liveOverviewApi`. Nothing else in the UI changes.
//
// Rules enforced here and in the page:
// - Demo fixtures are used only when demo mode is explicitly on.
// - A failed request is an error state. It never falls back to fixtures.
import { DEMO_ASTRONAUT_ID, DEMO_OVERVIEWS } from '../fixtures/demoOverview'
import { ApiError, demoFail, wait } from './common'
import type { AssessmentSummary, OverviewResponse } from '../types/overview'

export interface RefreshResult {
  assessment: AssessmentSummary
  /** Optional line shown in the success message. */
  message?: string
}

export interface OverviewApi {
  loadOverview(astronautId: string | null, signal: AbortSignal): Promise<OverviewResponse>
  /** The backend's documented "refresh assessment" operation, once one is documented. */
  refreshAssessment(astronautId: string | null, signal: AbortSignal): Promise<RefreshResult>
}

/** Not implemented: waiting for the confirmed backend contract. */
export { ApiError }
export const liveOverviewApi: OverviewApi | null = null

export const demoOverviewApi: OverviewApi = {
  async loadOverview(astronautId, signal) {
    await wait(500, signal)
    if (demoFail() === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (demoFail() === 'forbidden') throw new ApiError('You are not assigned to this profile.', { status: 403 })
    const found = DEMO_OVERVIEWS[astronautId ?? DEMO_ASTRONAUT_ID]
    if (!found) throw new ApiError('No profile was found for this link.', { status: 404 })
    return structuredClone(found)
  },
  async refreshAssessment(astronautId, signal) {
    await wait(900, signal)
    if (demoFail() === 'refresh') throw new ApiError('Demo mode: simulated refresh failure. The previous assessment is still shown.', { requestId: 'demo-simulated', status: 500 })
    const found = DEMO_OVERVIEWS[astronautId ?? DEMO_ASTRONAUT_ID]?.assessment
    if (!found) throw new ApiError('Demo mode: there is no fixture assessment for this profile, so nothing was evaluated.', { status: 404 })
    return { assessment: structuredClone(found), message: 'Demo refresh finished. No backend was called, so the fixture is unchanged.' }
  },
}

export function overviewApiFor(demo: boolean): OverviewApi | null {
  return demo ? demoOverviewApi : liveOverviewApi
}
