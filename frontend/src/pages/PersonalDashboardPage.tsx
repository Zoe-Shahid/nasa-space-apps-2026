import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiErrorView } from '../components/ApiErrorView'
import { EmptyState, LoadingState, PageHeading } from '../components/ui'
import { HeartRateChart } from '../components/overview/HeartRateChart'
import { OrbitView } from '../components/orbit/OrbitView'
import { measurementsApi, type Measurement } from '../data/measurementsApi'
import type { HeartRateTrend } from '../types/overview'
import { useAuth } from '../lib/authState'
import { DOMAINS, domainMeta } from '../lib/domains'
import { ROUTES } from '../lib/routes'

type Load = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; items: Measurement[]; trend: HeartRateTrend | null }

function dateRange() {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 6)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function displayValue(record: Measurement): string {
  const value = record.category === 'blood_pressure' ? `${record.systolic}/${record.diastolic}` : record.value
  return `${value} ${record.unit}`
}

export default function PersonalDashboardPage() {
  const { state } = useAuth()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0].key)
  const profile = state.status === 'signed-in' ? state.account.profile : null

  useEffect(() => {
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    const range = dateRange()
    Promise.all([
      measurementsApi.list({ limit: 100 }, controller.signal),
      measurementsApi.trends('heart_rate', range.from, range.to, controller.signal),
    ]).then(
      ([page, trends]) => {
        const series = trends.series[0]
        setLoad({
          status: 'ready',
          items: page.items,
          trend: series ? {
            unit: series.unit,
            baseline: null,
            days: series.days.map((day) => ({ date: day.date, dailyMean: day.mean === null ? null : Number(day.mean) })),
          } : null,
        })
      },
      (error: unknown) => { if (!controller.signal.aborted) setLoad({ status: 'error', error }) },
    )
    return () => controller.abort()
  }, [attempt])

  const latestByCategory = load.status === 'ready'
    ? load.items.reduce<Partial<Record<Measurement['category'], Measurement>>>((latest, item) => {
      if (!latest[item.category]) latest[item.category] = item
      return latest
    }, {})
    : {}
  const orbitNodes = DOMAINS.map((domain) => ({ key: domain.key, label: domain.orbitLabel, status: null }))

  return (
    <div className="ao-actual-page ao-personal-dashboard ao-overview">
      <PageHeading title={profile?.display_name ?? 'Your measurements'} description="Saved records from your account, shown as entered. No health status is inferred." />
      {load.status === 'loading' && <LoadingState label="Loading your saved measurements" />}
      {load.status === 'error' && <ApiErrorView error={load.error} subject="your measurements" onRetry={() => setAttempt((value) => value + 1)} />}
      {load.status === 'ready' && (
        <>
          <div className="ao-overview__actions">
            <Link className="ao-btn ao-btn--primary" to={ROUTES.addData.path}>Record a measurement</Link>
            <Link className="ao-btn ao-btn--secondary" to={ROUTES.history.path}>Open history</Link>
          </div>

          <div className="ao-overview__top">
            <section className="ao-orbit-panel" aria-labelledby="systems-title">
              <h2 id="systems-title" className="ao-sr-only">Six health systems</h2>
              <OrbitView
                nodes={orbitNodes}
                selectedKey={selectedDomain}
                onSelect={setSelectedDomain}
                monogram={profile?.display_name.slice(0, 2).toUpperCase() ?? 'AX'}
                groupLabel="Health systems; no assessment statuses are evaluated"
                showStatusText
                unreportedLabel="Not evaluated"
              />
              <div className="ao-orbit-panel__caption">
                <p className="ao-orbit-panel__live" role="status">{domainMeta(selectedDomain)?.fullLabel}: no assessment status is computed.</p>
                <p>Saved measurements appear in history and trends. This visualization does not interpret them.</p>
              </div>
            </section>

            <section className="ao-actual-section" aria-labelledby="latest-readings-heading">
              <h2 id="latest-readings-heading">Latest recorded values</h2>
              {load.items.length === 0 ? (
                <EmptyState title="No measurements saved" description="A value appears here only after the server confirms it was saved." action={<Link to={ROUTES.addData.path}>Record a measurement</Link>} />
              ) : (
                <ul className="ao-readings__grid">
                  {(['heart_rate', 'blood_pressure', 'body_temperature', 'blood_glucose', 'sleep_duration'] as const).map((category) => {
                    const record = latestByCategory[category]
                    const value = record ? displayValue(record) : null
                    return <li className="ao-reading" key={category}>
                      <p className="ao-reading__label">{category.replaceAll('_', ' ')}</p>
                      {value ? <p className="ao-reading__value"><span className="ao-reading__unit">{value}</span></p> : <p className="ao-reading__none">No record</p>}
                      {record && <time className="ao-help" dateTime={record.measured_at}>{record.measured_at}</time>}
                    </li>
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="ao-trend" aria-labelledby="dashboard-trend-title">
            <div className="ao-section-head"><h2 id="dashboard-trend-title">Heart rate by day</h2><Link to={ROUTES.trends.path}>All trends</Link></div>
            {load.trend?.days.some((day) => day.dailyMean !== null)
              ? <HeartRateChart trend={load.trend} />
              : <EmptyState title="No heart-rate records in this range" description="No values are drawn or filled in for the last seven UTC days." />}
          </section>

          <section className="ao-recent" aria-labelledby="dashboard-history-title">
            <div className="ao-section-head"><h2 id="dashboard-history-title">Recent records</h2><Link to={ROUTES.history.path}>Full history</Link></div>
            {load.items.length === 0 ? <p className="ao-recent__empty">No saved records.</p> : (
              <div className="ao-actual-table-wrap">
                <table className="ao-recent__table">
                  <thead><tr><th scope="col">Measured at</th><th scope="col">Category</th><th scope="col">Value</th></tr></thead>
                  <tbody>{load.items.slice(0, 8).map((record) => <tr key={record.id}>
                    <td><time dateTime={record.measured_at}>{record.measured_at}{record.time_zone ? ` · ${record.time_zone}` : ''}</time></td>
                    <td>{record.category.replaceAll('_', ' ')}</td>
                    <td>{displayValue(record)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
          <p className="ao-help">Latest 100 records at most. Freshness is not classified; values are shown as submitted.</p>
        </>
      )}
    </div>
  )
}