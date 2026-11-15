import { useEffect, useState } from 'react'
import { ApiErrorView } from '../components/ApiErrorView'
import { EmptyState, LoadingState, PageHeading } from '../components/ui'
import { measurementsApi, type Measurement, type MeasurementCategory } from '../data/measurementsApi'

const options: Array<{ value: MeasurementCategory | ''; label: string }> = [
  { value: '', label: 'All categories' }, { value: 'heart_rate', label: 'Heart rate' },
  { value: 'blood_pressure', label: 'Blood pressure' }, { value: 'body_temperature', label: 'Body temperature' },
  { value: 'blood_glucose', label: 'Blood glucose' }, { value: 'sleep_duration', label: 'Sleep duration' },
]

function dayStart(day: string): string | undefined { return day ? `${day}T00:00:00Z` : undefined }
function dayAfter(day: string): string | undefined {
  if (!day) return undefined
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().replace('.000Z', 'Z')
}
function valueText(record: Measurement): string {
  const value = record.category === 'blood_pressure' ? `${record.systolic} / ${record.diastolic}` : record.value
  return `${value} ${record.unit}`
}

export default function PersonalHistoryPage() {
  const [category, setCategory] = useState<MeasurementCategory | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [items, setItems] = useState<Measurement[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setItems(null)
    setError(null)
    setHasMore(false)
    if (from && to && from > to) {
      setItems([])
      setError(new Error('The start date must not be after the end date.'))
      return () => controller.abort()
    }
    measurementsApi.list({ category, from: dayStart(from), to: dayAfter(to), limit: 100, offset: 0 }, controller.signal).then(
      (page) => { setItems(page.items); setHasMore(page.items.length === page.limit) },
      (requestError: unknown) => { if (!controller.signal.aborted) setError(requestError) },
    )
    return () => controller.abort()
  }, [category, from, to, attempt])

  async function loadMore() {
    if (!items || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await measurementsApi.list({ category, from: dayStart(from), to: dayAfter(to), limit: 100, offset: items.length })
      setItems((current) => current ? [...current, ...page.items] : page.items)
      setHasMore(page.items.length === page.limit)
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="ao-actual-page">
      <PageHeading title="Measurement history" description="Your saved entries, newest first. Values and units are shown as submitted; times retain their recorded offset." />
      <div className="ao-actual-filters">
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as MeasurementCategory | '')}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>From date (UTC)<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Through date (UTC)<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      {items === null && !error && <LoadingState label="Loading your history" />}
      {error !== null && <ApiErrorView error={error} subject="your history" onRetry={() => setAttempt((value) => value + 1)} />}
      {items?.length === 0 && <EmptyState title="No matching measurements" description="No saved records match these filters." />}
      {items && items.length > 0 && (
        <div className="ao-actual-table-wrap">
          <table className="ao-actual-table">
            <thead><tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Measured at</th><th scope="col">Time zone</th><th scope="col">Note</th></tr></thead>
            <tbody>{items.map((record) => (
              <tr key={record.id}><th scope="row">{record.category.replaceAll('_', ' ')}</th><td>{valueText(record)}</td>
                <td><time dateTime={record.measured_at}>{record.measured_at}</time></td><td>{record.time_zone ?? 'Not supplied'}</td><td>{record.note ?? 'None'}</td></tr>
            ))}</tbody>
          </table>
          {hasMore && <button type="button" className="ao-btn ao-btn--secondary" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
          <p className="ao-help">No stale or clinical status is inferred from these records.</p>
        </div>
      )}
    </div>
  )
}