import type { AssessmentSummary, OverviewResponse } from '../types/overview'

export interface RefreshResult {
  assessment: AssessmentSummary
  message?: string
}

/** Page dependency shape only. No overview endpoint exists in the approved contract or runtime OpenAPI. */
export interface OverviewApi {
  loadOverview(astronautId: string | null, signal: AbortSignal): Promise<OverviewResponse>
  refreshAssessment(astronautId: string | null, signal: AbortSignal): Promise<RefreshResult>
}

export const liveOverviewApi: OverviewApi | null = null
