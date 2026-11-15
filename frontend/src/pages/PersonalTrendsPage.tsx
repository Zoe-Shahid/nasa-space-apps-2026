import { useEffect, useState } from 'react'
import { ApiErrorView } from '../components/ApiErrorView'
import { EmptyState, LoadingState, PageHeading } from '../components/ui'
import { measurementsApi, type MeasurementCategory, type MeasurementTrends } from '../data/measurementsApi'

const categories: Array<{ value: MeasurementCategory; label: string }> = [
  { value: 'heart_rate', label: 'Heart rate' }, { value: 'blood_pressure', label: 'Blood pressure' },
  { value: 'body_temperature', label: 'Body temperature' }, { value: 'blood_glucose', label: 'Blood glucose' },
  { value: 'sleep_duration', label: 'Sleep duration' },
]
function utcDay(date: Date): string { return date.toISOString().slice(0, 10) }
function initialRange() {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { from: utcDay(start), to: utcDay(end) }
}

export default function PersonalTrendsPage() {
  const [category, setCategory] = useState<MeasurementCategory>('heart_rate')
  const [range, setRange] = useState(initialRange)
  const [data, setData] = useState<MeasurementTrends | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(null)
    measurementsApi.trends(category, range.from, range.to, controller.signal).then(
      setData,
      (requestError: unknown) => { if (!controller.signal.aborted) setError(requestError) },
    )
    return () => controller.abort()
  }, [category, range.from, range.to, attempt])

  const dayCount = Math.floor((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86400000) + 1
  return (
    <div className="ao-actual-page">
      <PageHeading title="Trends" description="Daily descriptive summaries from your saved records. Units remain separate; no values are filled or clinically interpreted." />
      <div className="ao-actual-filters">
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as MeasurementCategory)}>{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>From (UTC)<input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>To (UTC)<input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label>
        <p className="ao-help">Maximum range: 31 UTC days. Current range: {dayCount} days.</p>
      </div>
      {(dayCount < 1 || dayCount > 31) && <p role="alert">Choose an inclusive date range of 1 to 31 days.</p>}
      {data === null && !error && range.from && range.to && dayCount >= 1 && dayCount <= 31 && <LoadingState label="Loading daily summaries" />}
      {error !== null && <ApiErrorView error={error} subject="your trend" onRetry={() => setAttempt((value) => value + 1)} />}
      {data && data.series.length === 0 && <EmptyState title="No records in this range" description="No saved measurements were found. No trend values are generated." />}
      {data?.series.map((series) => {
        const values = series.days.map((day) => day.mean === null ? null : Number(day.mean))
        const numeric = values.filter((value): value is number => value !== null && Number.isFinite(value))
        const min = Math.min(...numeric)
        const max = Math.max(...numeric)
        const span = max - min || 1
        return (
          <section className="ao-actual-trend" key={`${series.category}|${series.field ?? ''}|${series.unit}`} aria-label={`${series.field ? `${series.field} ` : ''}${series.category.replaceAll('_', ' ')} in ${series.unit}`}>
            <div className="ao-actual-section__heading"><h2>{series.field ? `${series.field} · ` : ''}{series.category.replaceAll('_', ' ')} ({series.unit})</h2><span>{series.days.reduce((total, day) => total + day.count, 0)} records</span></div>
            <p className="ao-help">Values are scaled only within this unit series. Range: {numeric.length ? `${min} to ${max} ${series.unit}` : 'no recorded values'}.</p>
            <div className="ao-actual-chart" style={{ gridTemplateColumns: `repeat(${series.days.length}, minmax(0, 1fr))` }} role="img" aria-label={`Daily means in ${series.unit}; gaps indicate no records`}>
              {series.days.map((day, index) => {
                const value = values[index]
                const height = value === null || !Number.isFinite(value) ? 0 : 12 + ((value - min) / span) * 78
                return <div className="ao-actual-chart__day" key={day.date} title={`${day.date}: ${day.mean ?? 'no data'} ${series.unit}`}>
                  <span className={value === null ? 'is-empty' : ''} style={{ height: `${height}%` }} /><small>{day.date.slice(5)}</small>
                </div>
              })}
            </div>
            <div className="ao-actual-table-wrap"><table className="ao-actual-table">
              <thead><tr><th scope="col">UTC date</th><th scope="col">Count</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Mean</th></tr></thead>
              <tbody>{series.days.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.count}</td><td>{day.min ?? 'No data'}</td><td>{day.max ?? 'No data'}</td><td>{day.mean ?? 'No data'}{day.mean ? ` ${series.unit}` : ''}</td></tr>)}</tbody>
            </table></div>
          </section>
        )
      })}
    </div>
  )
}