// Data access for Add data. No live implementation: the request models and endpoints are unconfirmed
// (docs/backend-contract-notes.md). `liveEntryApi` stays null until they exist. Demo mode stores nothing.
import type { VitalEntryRequest, VitalEntryResult } from '../types/entry'
import { ApiError, demoFail, failOnce, wait } from './common'

export interface EntryApi {
  /** Rejects with ApiError. status 422 + fieldErrors means the server rejected specific fields. */
  submitVital(request: VitalEntryRequest, signal: AbortSignal): Promise<VitalEntryResult>
  /** Requests the latest assessment after a save. Failure here never undoes a saved record. */
  refreshAssessment(astronautId: string, signal: AbortSignal): Promise<{ message?: string }>
}

export const liveEntryApi: EntryApi | null = null

// Demo-only memory of retry IDs, so re-sending the same ID returns the same record instead of a duplicate.
const demoRecords = new Map<string, string>()
let demoCounter = 0

export const demoEntryApi: EntryApi = {
  async submitVital(request, signal) {
    if (import.meta.env.DEV) {
      // Test counter for the browser checks. Compiled out of production builds.
      const d = document.documentElement.dataset
      d.aoDemoSubmitCalls = String(Number(d.aoDemoSubmitCalls ?? '0') + 1)
    }
    await wait(700, signal)
    if (demoFail() === 'forbidden') throw new ApiError('You are not assigned to this profile, so nothing was saved.', { status: 403 })
    if (demoFail() === 'validation') {
      throw new ApiError('The server rejected this entry. Nothing was saved.', { status: 422, requestId: 'demo-simulated', fieldErrors: { [request.metric === 'blood_pressure' ? 'systolic' : 'value']: 'Demo server check: this value was rejected.' } })
    }
    if (demoFail() === 'submit' && failOnce('submit')) {
      throw new ApiError('Demo mode: simulated network failure. The result of this save is unknown.', { status: 503, requestId: 'demo-simulated' })
    }
    const existing = demoRecords.get(request.clientRecordId)
    if (existing) return { recordId: existing }
    demoCounter += 1
    const recordId = `demo-record-${String(demoCounter).padStart(4, '0')}`
    demoRecords.set(request.clientRecordId, recordId)
    return { recordId }
  },
  async refreshAssessment(_astronautId, signal) {
    await wait(600, signal)
    if (demoFail() === 'assess' && failOnce('assess')) throw new ApiError('Demo mode: simulated assessment failure.', { status: 503, requestId: 'demo-simulated' })
    return { message: 'Demo mode: no backend was called, so no assessment changed.' }
  },
}

export function entryApiFor(demo: boolean): EntryApi | null {
  return demo ? demoEntryApi : liveEntryApi
}
