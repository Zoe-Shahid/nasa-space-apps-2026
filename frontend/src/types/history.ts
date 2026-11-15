// Legacy History page/view models only. AX1 and backend OpenAPI define no history route or wire schema.
// These types are not used by an API adapter and do not approve filtering or pagination behavior.

export type HistoryCategory = 'vitals' | 'sleep' | 'checkins' | 'support_requests' | 'symptoms' | 'exercise' | 'radiation'

export interface HistoryRequest {
  astronautId: string
  category: HistoryCategory
  /** Metric key within the category (vitals only in the reference). Omitted means all metrics. */
  metric?: string | null
  /** ISO 8601 UTC instant, INCLUSIVE, for example 2026-10-25T00:00:00Z. */
  from?: string | null
  /** ISO 8601 UTC instant, EXCLUSIVE. */
  to?: string | null
  limit: number
  offset: number
}

/** A list row. It never carries private fields: those are loaded only through getRecordDetail. */
export interface HistoryRowWire {
  id: string
  /** ISO 8601 UTC. */
  recordedAt: string
  /** Metric key, for filtering only. */
  metric?: string | null
  /** Label to show, for example "Heart rate". */
  metricLabel?: string | null
  value?: number | null
  systolic?: number | null
  diastolic?: number | null
  unit?: string | null
  /** Backend-formatted value text for categories that are not a number with a unit. */
  display?: string | null
  context?: string | null
  acquisition?: string | null
  entryMethod?: string | null
  source?: string | null
  /** Expected valid or suspect. */
  quality?: string | null
}

export interface HistoryPageResponse {
  /** Newest first, as ordered by the backend. */
  items: HistoryRowWire[]
  /** Total records matching the filters, across all pages. */
  total: number
  limit: number
  offset: number
}

export interface DetailField {
  label: string
  value: string
}

export interface RecordDetail {
  id: string
  recordedAt: string
  categoryLabel: string
  /** Non-private fields. */
  fields: DetailField[]
  /** granted: private fields included. denied: the user's role does not allow them. none: this record has none. */
  privateFields: { access: 'granted' | 'denied' | 'none'; fields?: DetailField[] }
}
