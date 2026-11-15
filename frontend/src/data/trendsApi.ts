import type { TrendsRequest, TrendsResponse } from '../types/trends'

/** Page dependency shape only. No trends endpoint exists in the approved contract or runtime OpenAPI. */
export interface TrendsApi {
  getTrends(request: TrendsRequest, signal: AbortSignal): Promise<TrendsResponse>
}

export const liveTrendsApi: TrendsApi | null = null
