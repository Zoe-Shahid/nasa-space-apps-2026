// Data access for the Crew list and profile. No live implementation: the backend contract is unconfirmed
// (docs/backend-contract-notes.md). `liveCrewApi` stays null until it exists. Demo fixtures only in explicit demo mode.
import { DEMO_CREW, DEMO_CREW_DETAILS } from '../fixtures/demoCrew'
import type { CrewProfileDetail, CrewProfileSummary } from '../types/crew'
import { ApiError, demoFail, wait } from './common'

export interface CrewApi {
  /** Profiles assigned to the signed-in reviewer. The server decides assignment; the UI never widens it. */
  listProfiles(signal: AbortSignal): Promise<CrewProfileSummary[]>
  /** Rejects with ApiError status 403 (not assigned) or 404 (no such profile). */
  getProfile(id: string, signal: AbortSignal): Promise<CrewProfileDetail>
}

export const liveCrewApi: CrewApi | null = null

export const demoCrewApi: CrewApi = {
  async listProfiles(signal) {
    await wait(450, signal)
    if (demoFail() === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (demoFail() === 'empty') return []
    return structuredClone(DEMO_CREW)
  },
  async getProfile(id, signal) {
    await wait(450, signal)
    if (demoFail() === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (demoFail() === 'forbidden') throw new ApiError('You are not assigned to this profile, so its records are not shown.', { status: 403 })
    const found = DEMO_CREW_DETAILS[id]
    if (!found) throw new ApiError('No profile was found for this link.', { status: 404 })
    return structuredClone(found)
  },
}

export function crewApiFor(demo: boolean): CrewApi | null {
  return demo ? demoCrewApi : liveCrewApi
}
