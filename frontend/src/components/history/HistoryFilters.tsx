import { useId, useState, type FormEvent } from 'react'
import { Button } from '../ui'
import { validateFilters, type CategoryMeta } from '../../lib/historyModel'

interface Props {
  category: CategoryMeta
  metric: string
  from: string
  to: string
  today: string
  onApply: (f: { metric: string; from: string; to: string }) => void
}

/** Category/metric and UTC from/to filters. Invalid combinations are explained and no request is made. */
export function HistoryFilters({ category, metric, from, to, today, onApply }: Props) {
  const [m, setM] = useState(metric)
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)
  const [error, setError] = useState<string | null>(null)
  const errId = useId()

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validateFilters(f, t, today)
    setError(problem)
    if (!problem) onApply({ metric: m, from: f, to: t })
  }

  const invalid = error ? true : undefined
  return (
    <form className="ao-hfilters" onSubmit={submit} noValidate aria-label="Filters">
      <div className="ao-field">
        <label className="ao-field__label" htmlFor="hf-metric">
          Metric
        </label>
        <select id="hf-metric" className="ao-input ao-select" value={m} onChange={(e) => setM(e.target.value)} disabled={category.metrics.length === 0}>
          <option value="">All metrics</option>
          {category.metrics.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ao-field">
        <label className="ao-field__label" htmlFor="hf-from">
          From (UTC, inclusive)
        </label>
        <input id="hf-from" type="date" className={error ? 'ao-input ao-input--error' : 'ao-input'} value={f} onChange={(e) => setF(e.target.value)} aria-invalid={invalid} aria-describedby={error ? errId : undefined} />
      </div>
      <div className="ao-field">
        <label className="ao-field__label" htmlFor="hf-to">
          To (UTC, exclusive)
        </label>
        <input id="hf-to" type="date" className={error ? 'ao-input ao-input--error' : 'ao-input'} value={t} onChange={(e) => setT(e.target.value)} aria-invalid={invalid} aria-describedby={error ? errId : undefined} />
      </div>
      <Button type="submit">Apply</Button>
      {error && (
        <p id={errId} className="ao-field__error ao-hfilters__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
