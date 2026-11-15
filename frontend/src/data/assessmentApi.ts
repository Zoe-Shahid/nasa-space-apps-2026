import type { AssessmentDetail, AssessmentRefreshResult } from '../types/assessment'

/** Page dependency shape only. No assessment endpoint exists in the approved contract or runtime OpenAPI. */
export interface AssessmentApi {
  getAssessment(astronautId: string, signal: AbortSignal): Promise<AssessmentDetail | null>
  refreshAssessment(astronautId: string, signal: AbortSignal): Promise<AssessmentRefreshResult>
}

export const liveAssessmentApi: AssessmentApi | null = null
