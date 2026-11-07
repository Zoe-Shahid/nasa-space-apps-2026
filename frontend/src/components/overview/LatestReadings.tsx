import { UtcTime } from '../ui'
import type { ReadingView } from '../../lib/overviewModel'

/** Recorded values only. A missing reading says so; it is never shown as 0. */
export function LatestReadings({ readings }: { readings: ReadingView[] }) {
  return (
    <section className="ao-readings" aria-labelledby="readings-title">
      <div className="ao-section-head">
        <h2 id="readings-title">Latest readings</h2>
        <p className="ao-help">Recorded values, not a health judgement</p>
      </div>
      <ul className="ao-readings__grid">
        {readings.map((r) => (
          <li key={r.label} className="ao-reading">
            <p className="ao-reading__label">{r.label}</p>
            {r.value === null ? (
              <p className="ao-reading__none">No reading loaded</p>
            ) : (
              <p className="ao-reading__value">
                <span className="ao-reading__number">{r.value}</span>
                {r.unit && <span className="ao-reading__unit">{r.unit}</span>}
              </p>
            )}
            <p className="ao-help">
              {r.timeUtc ? (
                <>
                  <UtcTime value={r.timeUtc} format="short" />
                  {r.note && <> · {r.note}</>}
                </>
              ) : (
                r.note
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
