// Legacy Trends page/view models only. AX1 and backend OpenAPI define no trends route or wire schema.
// These types are not used by an API adapter.
export type TrendMetric = 'heart_rate' | 'blood_pressure' | 'temperature' | 'sleep'

export interface TrendsRequest {
  astronautId: string
  metric: TrendMetric
  /** First UTC date, inclusive, YYYY-MM-DD. */
  from: string
  /** Last UTC date, inclusive, YYYY-MM-DD. */
  to: string
}

export interface TrendSeries {
  key: string
  label: string
  unit: string
  /** Wording for the per-day value, for example "Daily mean" or "Total". */
  meanLabel: string
  /** How many decimals the backend wants shown for the mean. */
  decimals: number
}

export interface TrendStat {
  /** Null means no valid value that day. Never 0. */
  mean: number | null
  min?: number | null
  max?: number | null
}

export interface TrendDay {
  /** UTC date, YYYY-MM-DD. */
  date: string
  recordCount: number
  /** Keyed by TrendSeries.key. Null (or a missing key) means no data for that series on that day. */
  values: Record<string, TrendStat | null>
}

/** A backend-calculated summary line. `value` is already a string, so nothing is recomputed or reformatted. */
export interface TrendSummaryItem {
  label: string
  value: string
  unit?: string | null
}

export interface TrendsResponse {
  metric: TrendMetric
  from: string
  to: string
  /** Longest range the backend accepts, in days. Absent means longer or custom ranges are NOT supported. */
  maxRangeDays?: number | null
  title: string
  /** For example "Valid resting readings only, in bpm. Source: ...". */
  caption?: string | null
  series: TrendSeries[]
  /** Drawn only when supplied. Nothing is invented. */
  baseline?: { version: string; value: number; unit: string } | null
  /** One entry per UTC date in range, oldest first. A date with no records still appears, with null values. */
  days: TrendDay[]
  summary?: TrendSummaryItem[] | null
}
