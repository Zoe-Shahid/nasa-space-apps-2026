import { useId, useState, type KeyboardEvent } from 'react'
import { useElementWidth } from '../../lib/useElementWidth'
import { dayDescription, dayHasData, dayLabel, dayLines, barAxis, labelEvery, lineAxis, meanOf, seriesSegments } from '../../lib/trendsModel'
import type { TrendsResponse } from '../../types/trends'

const HEIGHT = 270
const M = { top: 30, right: 14, bottom: 62, left: 48 }

interface Props {
  response: TrendsResponse
  kind: 'line' | 'bar'
}

/**
 * Draws backend-calculated daily values. A day with no value is a gap: no line is drawn across it and nothing is drawn
 * as zero. No safe band or threshold is drawn. Every day is one keyboard stop (Tab, or arrow keys) and its tooltip,
 * accessible name and table row are built from the same helpers, so they always agree.
 */
export function TrendChart({ response, kind }: Props) {
  const titleId = useId()
  const descId = useId()
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const { days, series, baseline } = response
  const n = days.length

  const values = days.flatMap((d) => series.map((s) => meanOf(d, s)).filter((v): v is number => v !== null))
  const axis = kind === 'bar' ? barAxis(values) : lineAxis(baseline ? [...values, baseline.value] : values)
  if (n === 0 || !axis) return null

  const plotW = Math.max(width - M.left - M.right, 120)
  const plotH = HEIGHT - M.top - M.bottom
  const slot = plotW / n
  const x = (i: number) => M.left + (i + 0.5) * slot
  const y = (v: number) => M.top + plotH - ((v - axis.min) / (axis.max - axis.min)) * plotH
  const every = labelEvery(n, plotW)
  const gaps = days.map((d, i) => (dayHasData(d, series) ? -1 : i)).filter((i) => i >= 0)
  const unit = series[0]?.unit ?? ''
  const barW = Math.min(slot * 0.6, 44)

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const items = Array.from(e.currentTarget.querySelectorAll<SVGGElement>('[data-day]'))
    const i = items.findIndex((el) => el === document.activeElement)
    if (i < 0) return
    const next = e.key === 'ArrowRight' ? Math.min(i + 1, items.length - 1) : e.key === 'ArrowLeft' ? Math.max(i - 1, 0) : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1
    if (next < 0) return
    e.preventDefault()
    items[next].focus()
  }

  // Tooltip for the active day, using the same lines as the accessible name and the table.
  const tip = active !== null ? [`${dayLabel(days[active].date)} (UTC)`, ...dayLines(days[active], series)] : null
  const tipW = tip ? Math.min(Math.max(...tip.map((l) => l.length)) * 6.6 + 18, plotW) : 0
  const tipH = tip ? tip.length * 16 + 10 : 0
  const tipX = active !== null ? Math.min(Math.max(x(active) - tipW / 2, M.left), M.left + plotW - tipW) : 0

  return (
    <div ref={wrapRef} className="ao-tchart">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="group" aria-labelledby={titleId} aria-describedby={descId} onKeyDown={onKeyDown}>
        <title id={titleId}>{response.title}</title>
        <desc id={descId}>
          {n} UTC days. Use Tab or the arrow keys to move between days. Each day reads out its value, or no data. The full data table follows the chart.
        </desc>

        <text className="ao-tchart__axis-title" x={M.left - 8} y={14} textAnchor="end">
          {unit}
        </text>
        {axis.ticks.map((t) => (
          <g key={t}>
            <line className="ao-tchart__grid" x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
            <text className="ao-tchart__tick" x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}

        {gaps.map((i) => (
          <g key={days[i].date}>
            <line className="ao-tchart__gap" x1={x(i)} x2={x(i)} y1={M.top - 6} y2={M.top + plotH + 4} />
            {gaps.length <= 3 && (
              <text className="ao-tchart__gap-label" x={x(i)} y={M.top + plotH + 44} textAnchor="middle">
                {dayLabel(days[i].date)}: no data
              </text>
            )}
          </g>
        ))}

        {baseline && (
          <g>
            <line className="ao-tchart__baseline" x1={M.left} x2={M.left + plotW} y1={y(baseline.value)} y2={y(baseline.value)} />
            <text className="ao-tchart__baseline-label" x={M.left + plotW} y={y(baseline.value) + 15} textAnchor="end">
              Recorded baseline {baseline.version}: {baseline.value} {baseline.unit}
            </text>
          </g>
        )}

        {kind === 'line' &&
          series.map((s, si) => (
            <g key={s.key} className={`ao-tchart__series ao-tchart__series--${si}`}>
              {seriesSegments(days, s).map((seg, i) => (
                <g key={i}>
                  {seg.length > 1 && <polyline className="ao-tchart__line" points={seg.map((p) => `${x(days.findIndex((d) => d.date === p.date))},${y(p.value)}`).join(' ')} />}
                  {seg.map((p) => {
                    const cx = x(days.findIndex((d) => d.date === p.date))
                    return si === 0 ? <circle key={p.date} className="ao-tchart__point" cx={cx} cy={y(p.value)} r={5} /> : <rect key={p.date} className="ao-tchart__point" x={cx - 5} y={y(p.value) - 5} width={10} height={10} />
                  })}
                </g>
              ))}
            </g>
          ))}

        {kind === 'bar' &&
          days.map((d, i) => {
            const v = meanOf(d, series[0])
            return v === null ? null : <rect key={d.date} className="ao-tchart__bar" x={x(i) - barW / 2} y={y(v)} width={barW} height={Math.max(y(axis.min) - y(v), 0)} />
          })}

        {days.map((d, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={d.date} className="ao-tchart__tick" x={x(i)} y={M.top + plotH + 20} textAnchor="middle">
              {tickText(d.date, i === 0 ? null : days[i - 1].date)}
            </text>
          ) : null,
        )}

        {days.map((d, i) => (
          <g
            key={d.date}
            data-day
            className="ao-tchart__day"
            tabIndex={0}
            role="img"
            aria-label={dayDescription(d, series)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
          >
            <rect className="ao-tchart__hit" x={x(i) - slot / 2} y={M.top - 8} width={slot} height={plotH + 16} />
          </g>
        ))}

        {tip && (
          <g className="ao-tchart__tip" pointerEvents="none">
            <rect x={tipX} y={M.top - 2} width={tipW} height={tipH} rx={6} />
            {tip.map((line, i) => (
              <text key={i} x={tipX + 9} y={M.top + 14 + i * 16} fontWeight={i === 0 ? 700 : 400}>
                {line}
              </text>
            ))}
          </g>
        )}
      </svg>

      {kind === 'line' && series.length > 1 && (
        <ul className="ao-tchart__legend" aria-label="Chart key">
          {series.map((s, si) => (
            <li key={s.key}>
              <span className={`ao-tchart__swatch ao-tchart__swatch--${si}`} aria-hidden="true" />
              {s.label} ({s.unit}){si === 0 ? ', solid line, round markers' : ', dashed line, square markers'}
            </li>
          ))}
        </ul>
      )}
      <p className="ao-help">Dashed vertical lines mark days with no data. Gaps are never drawn as zero or joined. No safe or normal zone is drawn because none is defined here.</p>
    </div>
  )
}

/** "25 Oct" for the first label and when the month changes, otherwise just the day number. */
function tickText(date: string, previous: string | null): string {
  const full = dayLabel(date)
  if (previous === null) return full
  const [day, month] = full.split(' ')
  return dayLabel(previous).split(' ')[1] === month ? day : full
}
