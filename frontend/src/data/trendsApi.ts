// Data access for Trends. No live implementation: the endpoint and response are unconfirmed
// (docs/backend-contract-notes.md). `liveTrendsApi` stays null until they exist.
//
// Demo mode bundles NO health readings. It returns the requested calendar dates with no values, so the screen shows
// its honest "no data" state. For development only, a test page may inject readings through window.__AO_QA_TRENDS__;
// that hook is compiled out of production builds (import.meta.env.DEV).
import type { TrendDay, TrendMetric, TrendSeries, TrendsRequest, TrendsResponse } from '../types/trends'
import { listDates } from '../lib/dateRange'
import { ApiError, demoFail, failOnce, wait } from './common'

export interface TrendsApi {
  /** Rejects with ApiError 403 or 404 when not allowed or not found, 422 when the range is rejected. */
  getTrends(request: TrendsRequest, signal: AbortSignal): Promise<TrendsResponse>
}

export const liveTrendsApi: TrendsApi | null = null

interface MetricSpec {
  title: string
  caption: string
  series: TrendSeries[]
}

// Labels and units only. These describe a metric; they are not readings.
const SPECS: Record<TrendMetric, MetricSpec> = {
  heart_rate: {
    title: 'Resting heart rate: daily mean',
    caption: 'Valid resting readings only, in bpm.',
    series: [{ key: 'heart_rate', label: 'Heart rate', unit: 'bpm', meanLabel: 'Daily mean', decimals: 2 }],
  },
  blood_pressure: {
    title: 'Resting blood pressure: daily mean',
    caption: 'Valid resting readings only, in mmHg.',
    series: [
      { key: 'systolic', label: 'Systolic', unit: 'mmHg', meanLabel: 'Daily mean', decimals: 2 },
      { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', meanLabel: 'Daily mean', decimals: 2 },
    ],
  },
  sleep: {
    title: 'Sleep total by day',
    caption: 'Daily sleep totals as recorded, in hours.',
    series: [{ key: 'sleep_total', label: 'Sleep total', unit: 'h', meanLabel: 'Total', decimals: 1 }],
  },
}

/** Dev-only test injection. Shape: { [metric]: { days, summary?, baseline?, caption? } }. */
export type QaTrendOverride = Partial<Pick<TrendsResponse, 'summary' | 'baseline' | 'caption'>> & { days: TrendDay[] }
declare global {
  interface Window {
    __AO_QA_TRENDS__?: Partial<Record<TrendMetric, QaTrendOverride>>
  }
}

function qaOverride(metric: TrendMetric): QaTrendOverride | undefined {
  return import.meta.env.DEV ? window.__AO_QA_TRENDS__?.[metric] : undefined
}

export const demoTrendsApi: TrendsApi = {
  async getTrends(req, signal) {
    await wait(500, signal)
    const f = demoFail()
    if (f === 'load') throw new ApiError('Demo mode: simulated load failure. No fixture data is shown after a failure.', { requestId: 'demo-simulated', status: 500 })
    if (f === 'trends' && failOnce('trends')) throw new ApiError('Demo mode: simulated load failure. Try again.', { requestId: 'demo-simulated', status: 503 })
    if (f === 'forbidden') throw new ApiError('You are not assigned to this profile, so its trends are not shown.', { status: 403 })
    if (f === 'range') throw new ApiError('The backend rejected this date range.', { status: 422 })
    const spec = SPECS[req.metric]
    const override = qaOverride(req.metric)
    const byDate = new Map((override?.days ?? []).map((d) => [d.date, d]))
    const emptyValues = Object.fromEntries(spec.series.map((s) => [s.key, null]))
    const days: TrendDay[] = listDates(req.from, req.to).map((date) => byDate.get(date) ?? { date, recordCount: 0, values: emptyValues })
    return {
      metric: req.metric,
      from: req.from,
      to: req.to,
      maxRangeDays: 31,
      title: spec.title,
      caption: override?.caption ?? spec.caption,
      series: spec.series,
      baseline: override?.baseline ?? null,
      days,
      summary: override?.summary ?? [],
    }
  },
}

export function trendsApiFor(demo: boolean): TrendsApi | null {
  return demo ? demoTrendsApi : liveTrendsApi
}
