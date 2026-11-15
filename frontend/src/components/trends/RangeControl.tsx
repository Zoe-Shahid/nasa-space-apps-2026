import { useState, type FormEvent } from 'react'
import { Button } from '../ui'
import { lastNDays, rangeLabel, validateRange } from '../../lib/dateRange'

interface Props {
  from: string
  to: string
  today: string
  /** Backend-declared longest range. Null or undefined means longer and custom ranges are not supported. */
  maxRangeDays: number | null | undefined
  defaultDays: number
  onApply: (from: string, to: string) => void
}

/** UTC date-range control. Custom ranges are offered only when the backend declares a maximum. */
export function RangeControl({ from, to, today, maxRangeDays, defaultDays, onApply }: Props) {
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const [error, setError] = useState<string | null>(null)
  const isDefault = (() => {
    const d = lastNDays(today, defaultDays)
    return d.from === from && d.to === to
  })()

  const max = maxRangeDays ?? 0
  if (max <= defaultDays) {
    return (
      <p className="ao-help ao-range__fixed">
        Showing <strong>{rangeLabel(from, to)}</strong>. Longer and custom ranges are not available because the backend has not declared support for them.
      </p>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validateRange(draftFrom, draftTo, today, max)
    setError(problem)
    if (!problem) onApply(draftFrom, draftTo)
  }

  function reset() {
    const d = lastNDays(today, defaultDays)
    setDraftFrom(d.from)
    setDraftTo(d.to)
    setError(null)
    onApply(d.from, d.to)
  }

  return (
    <form className="ao-range" onSubmit={submit} noValidate aria-label="Date range">
      <div className="ao-field">
        <label className="ao-field__label" htmlFor="range-from">
          From (UTC date)
        </label>
        <input id="range-from" name="from" type="date" className={error ? 'ao-input ao-input--error' : 'ao-input'} value={draftFrom} max={today} onChange={(e) => setDraftFrom(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby="range-help range-error" />
      </div>
      <div className="ao-field">
        <label className="ao-field__label" htmlFor="range-to">
          To (UTC date)
        </label>
        <input id="range-to" name="to" type="date" className={error ? 'ao-input ao-input--error' : 'ao-input'} value={draftTo} max={today} onChange={(e) => setDraftTo(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby="range-help range-error" />
      </div>
      <Button type="submit">Apply range</Button>
      <Button variant="secondary" onClick={reset} disabled={isDefault && draftFrom === from && draftTo === to}>
        Last {defaultDays} UTC days
      </Button>
      <p id="range-help" className="ao-help ao-range__help">
        Showing <strong>{rangeLabel(from, to)}</strong>. Calendar days in UTC, up to {max} days.
      </p>
      {error && (
        <p id="range-error" className="ao-field__error ao-range__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
