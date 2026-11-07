import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { RangeControl } from '../components/trends/RangeControl'
import { TrendChart } from '../components/trends/TrendChart'
import { TrendTable } from '../components/trends/TrendTable'
import { ApiErrorView } from '../components/ApiErrorView'
import { classifyError } from '../data/errors'
import { EmptyState, LoadingState, PageHeading, Tabs } from '../components/ui'
import { crewApiFor } from '../data/crewApi'
import { trendsApiFor, type TrendsApi } from '../data/trendsApi'
import { DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { lastNDays, rangeLabel, todayUtc } from '../lib/dateRange'
import { useDemoMode } from '../lib/demoMode'
import { ROUTES } from '../lib/routes'
import { isNoData, isPartial } from '../lib/trendsModel'
import { useAstronautId } from '../lib/useAstronautId'
import type { TrendMetric, TrendsResponse } from '../types/trends'

const DEFAULT_DAYS = 7

const METRICS: Array<{ id: TrendMetric; label: string; kind: 'line' | 'bar'; shows: string; cannot: string }> = [
  {
    id: 'heart_rate',
    label: 'Heart rate',
    kind: 'line',
    shows: 'Recorded resting heart rate by day, set beside a recorded baseline when the backend returns one.',
    cannot: 'ECG analysis, a heart diagnosis or a prediction. A pulse number cannot replace an ECG or ultrasound.',
  },
  {
    id: 'blood_pressure',
    label: 'Blood pressure',
    kind: 'line',
    shows: 'Recorded resting blood pressure by day, as supplied by the backend.',
    cannot: 'A diagnosis, a treatment decision or a prediction. A pressure reading cannot replace a clinical assessment.',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    kind: 'bar',
    shows: 'Recorded sleep totals by day.',
    cannot: 'A verdict on sleep quality, a fatigue score or a prediction. Observational findings support trend review, not a universal cutoff or a prediction for one person.',
  },
]

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; data: TrendsResponse }

function Panel({ api, astronautId, metric, from, to, onApply, today }: { api: TrendsApi; astronautId: string; metric: (typeof METRICS)[number]; from: string; to: string; onApply: (f: string, t: string) => void; today: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    api
      .getTrends({ astronautId, metric: metric.id, from, to }, ctrl.signal)
      .then((data) => setLoad({ state: 'ready', data }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [api, astronautId, metric.id, from, to, attempt])

  const range = (max: number | null | undefined) => <RangeControl key={`${from}-${to}-${max ?? 'x'}`} from={from} to={to} today={today} maxRangeDays={max} defaultDays={DEFAULT_DAYS} onApply={onApply} />

  if (load.state === 'loading') return <LoadingState label={`Loading ${metric.label.toLowerCase()} trend`} />
  if (load.state === 'error') {
    const c = classifyError(load.error)
    return (
      <div className="ao-trends__stack">
        {c.kind === 'validation' && range(31)}
        <ApiErrorView error={load.error} subject="this trend" titles={{ validation: 'This date range was rejected' }} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }

  const r = load.data
  const none = isNoData(r.days, r.series)
  const partial = isPartial(r.days, r.series)
  const summary = r.summary ?? []

  return (
    <div className="ao-trends__stack">
      {range(r.maxRangeDays)}
      <div className="ao-trends__grid">
        <div className="ao-trends__main">
          <section aria-labelledby="trend-chart-title">
            <h2 id="trend-chart-title">{r.title}</h2>
            <p className="ao-help">
              {rangeLabel(r.from, r.to)}. {r.caption}
            </p>
            {none ? (
              <EmptyState title="No data in this range" description="The backend returned no valid readings for these dates. Nothing is drawn and no values are filled in." />
            ) : (
              <>
                {partial && (
                  <p className="ao-trends__partial" role="status">
                    Some days have no data. They appear as gaps in the chart and as “no data” in the table.
                  </p>
                )}
                <TrendChart response={r} kind={metric.kind} />
              </>
            )}
          </section>
          <TrendTable response={r} />
        </div>

        <aside className="ao-trends__aside" aria-label="Summary and limits">
          <section>
            <h2>Summary from the backend</h2>
            <p className="ao-help">Averages and differences are calculated by the server, not in the browser.</p>
            {summary.length > 0 ? (
              <dl className="ao-trends__summary">
                {summary.map((s) => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>
                      {s.value}
                      {s.unit ? ` ${s.unit}` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="ao-unavailable">No summary was returned for this range.</p>
            )}
          </section>
          <section>
            <h2>What this can show</h2>
            <p>{metric.shows}</p>
          </section>
          <section>
            <h2>What it cannot show</h2>
            <p>{metric.cannot}</p>
            <p className="ao-help">These are descriptions of what was recorded, not predictions.</p>
          </section>
          <p className="ao-help">
            Default range is the last {DEFAULT_DAYS} UTC days.
            {r.maxRangeDays && r.maxRangeDays > DEFAULT_DAYS ? ` Longer and custom ranges, up to ${r.maxRangeDays} days, use this same view.` : ''}
          </p>
        </aside>
      </div>
    </div>
  )
}

export default function TrendsPage() {
  const demo = useDemoMode()
  const api = trendsApiFor(demo)
  const crew = crewApiFor(demo)
  const astronautId = useAstronautId()
  const today = useMemo(() => todayUtc(), [])
  const [range, setRange] = useState(() => lastNDays(today, DEFAULT_DAYS))
  const [metric, setMetric] = useState<TrendMetric>('heart_rate')
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!crew || !astronautId) return
    const ctrl = new AbortController()
    crew
      .getProfile(astronautId, ctrl.signal)
      .then((p) => setName(p.displayName))
      .catch(() => setName(null))
    return () => ctrl.abort()
  }, [crew, astronautId])

  const banner = demo ? <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p> : null
  let body
  if (!api) body = <BackendNotConnected what="trends" />
  else if (!astronautId)
    body = <EmptyState title="Choose a profile first" description="Trends belong to one crew profile. Open one from the crew list." action={<Link to={ROUTES.crew.path}>Go to crew</Link>} />
  else
    body = (
      <Tabs
        label="Metric"
        variant="pill"
        value={metric}
        onChange={(id) => {
          const next = METRICS.find((m) => m.id === id)
          if (next) setMetric(next.id)
        }}
        tabs={METRICS.map((m) => ({
          id: m.id,
          label: m.label,
          panel: <Panel key={m.id} api={api} astronautId={astronautId} metric={m} from={range.from} to={range.to} today={today} onApply={(from, to) => setRange({ from, to })} />,
        }))}
      />
    )

  return (
    <div className="ao-trends">
      {banner}
      <PageHeading title="Trends" description={`${name ? `${name}. ` : ''}Recorded data by day, ${rangeLabel(range.from, range.to)}. These are descriptions of what was recorded, not predictions.`} />
      {body}
    </div>
  )
}
