import type { HistoryPageResponse, HistoryRequest, RecordDetail } from '../types/history'

/** Page dependency shape only. No history endpoint exists in the approved contract or runtime OpenAPI. */
export interface HistoryApi {
  listRecords(request: HistoryRequest, signal: AbortSignal): Promise<HistoryPageResponse>
  getRecordDetail(astronautId: string, recordId: string, signal: AbortSignal): Promise<RecordDetail>
}

export const liveHistoryApi: HistoryApi | null = null
