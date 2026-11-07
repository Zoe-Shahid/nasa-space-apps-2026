// Data access for History. No live implementation: endpoints, filters and pagination are unconfirmed
// (docs/backend-contract-notes.md). `liveHistoryApi` stays null until they exist.
//
// Demo mode bundles NO records, so it returns an empty page. For development only, a test page may inject records
// through window.__AO_QA_HISTORY__; the hook is compiled out of production builds (import.meta.env.DEV). The demo API then
// plays the part of the backend (filtering, newest-first order, offset/limit) so the UI can be tested.
import type { HistoryCategory, HistoryPageResponse, HistoryRequest, HistoryRowWire, RecordDetail } from '../types/history'
import { ApiError, demoFail, wait } from './common'

export interface HistoryApi {
  /** Rejects with ApiError 403 or 404 when not allowed or not found, 422 when the filters are rejected. */
  listRecords(request: HistoryRequest, signal: AbortSignal): Promise<HistoryPageResponse>
  /** Loads one record, including private fields only if the signed-in user's permissions allow it. Called only when the user opens Details. */
  getRecordDetail(astronautId: string, recordId: string, signal: AbortSignal): Promise<RecordDetail>
}

export const liveHistoryApi: HistoryApi | null = null

export interface QaHistoryOverride {
  /** Newest first. */
  rows: Partial<Record<HistoryCategory, HistoryRowWire[]>>
  details: Record<string, RecordDetail>
}
declare global {
  interface Window {
    __AO_QA_HISTORY__?: QaHistoryOverride
  }
}
const qa = (): QaHistoryOverride | undefined => (import.meta.env.DEV ? window.__AO_QA_HISTORY__ : undefined)

/** Makes the most recent request visible to browser tests (dev only). */
function recordRequest(kind: string, payload: unknown) {
  if (import.meta.env.DEV) document.documentElement.dataset.aoLastHistoryRequest = JSON.stringify({ kind, payload })
}

export const demoHistoryApi: HistoryApi = {
  async listRecords(req, signal) {
    recordRequest('list', req)
    await wait(450, signal)
    const f = demoFail()
    if (f === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (f === 'forbidden') throw new ApiError('You are not assigned to this profile, so its records are not shown.', { status: 403 })
    if (f === 'network') throw new ApiError('', { kind: 'network' })
    if (f === 'unauthorized') throw new ApiError('Your session has ended.', { status: 401 })
    if (f === 'filters') throw new ApiError('The backend rejected these filters.', { status: 422 })
    const all = (qa()?.rows[req.category] ?? []).filter((r) => {
      if (req.metric && r.metric !== req.metric) return false
      if (req.from && r.recordedAt < req.from) return false
      if (req.to && r.recordedAt >= req.to) return false
      return true
    })
    return { items: all.slice(req.offset, req.offset + req.limit), total: all.length, limit: req.limit, offset: req.offset }
  },
  async getRecordDetail(_astronautId, recordId, signal) {
    recordRequest('detail', { recordId })
    await wait(400, signal)
    const f = demoFail()
    if (f === 'detail') throw new ApiError('Demo mode: simulated server error while loading details.', { requestId: 'demo-simulated', status: 500 })
    if (f === 'detailForbidden') throw new ApiError('Your role does not allow opening this record.', { status: 403 })
    const found = qa()?.details[recordId]
    if (!found) throw new ApiError('This record was not found.', { status: 404 })
    if (f === 'private') return { ...found, privateFields: { access: 'denied' } }
    return structuredClone(found)
  },
}

export function historyApiFor(demo: boolean): HistoryApi | null {
  return demo ? demoHistoryApi : liveHistoryApi
}
