// Proposed data-entry request model, not yet confirmed with the backend team. See docs/backend-contract-notes.md.
// Field names come from the approved reference (page 3) and history (page 9) because no backend request models or
// generated TypeScript types exist in this repository. The backend team must confirm or rename every field.
export type VitalMetric = 'heart_rate' | 'blood_pressure' | 'temperature'

export interface VitalEntryRequest {
  /** Retry ID shown on the form. Same value is re-sent after an uncertain save so no duplicate record is created. */
  clientRecordId: string
  astronautId: string
  metric: VitalMetric
  value?: number
  systolic?: number
  diastolic?: number
  unit: string
  /** resting | exercise | recovery for heart rate and blood pressure; oral for temperature. */
  context: string
  /** ISO 8601 UTC, for example 2026-10-31T12:00:00Z. */
  measuredAt: string
  sourceLabel: string
  deviceId: string
  /** valid | suspect */
  quality: string
  /** Fixed to measured on this form. */
  acquisition: string
  /** manual | import */
  entryMethod: string
}

export interface VitalEntryResult {
  recordId: string
}
