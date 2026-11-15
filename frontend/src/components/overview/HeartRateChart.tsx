import { useId } from 'react'
import { formatUtcDayMonth } from '../../lib/time'
import { gapDates, niceAxis, segmentsOf } from '../../lib/overviewModel'
import { useElementWidth } from '../../lib/useElementWidth'
import type { HeartRateTrend } from '../../types/overview'

const HEIGHT = 250
const M = { top: 26, right: 14, bottom: 56, left: 44 }
const INSET = 18 // keeps the first and last points off the axis edges

function tickLabel(date: string, previous: string | null): string {
  const full = formatUtcDayMonth(date) ?? date
  const day = full.split(' ')[0]
  if (previous === null) return full
  return formatUtcDayMonth(previous)?.split(' ')[1] === full.split(' ')[1] ? day : full
}

/**
 * Draws a daily-mean trend that the BACKEND calculated. The browser only scales and plots it.
 * A day with no value breaks the line and is marked "no data"; it is never drawn as zero or joined across.
 * No normal or safe zone is drawn because none is defined.
 */
export function HeartRateChart({ trend }: { trend: HeartRateTrend }) {
  const titleId = useId()
  const descId = useId()
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const days = trend.days
  const unit = trend.unit
  const baseline = trend.baseline
  const values = days.map((d) => d.dailyMean).filter((v): v is number => v !== null)
  const axis = niceAxis(baseline ? [...values, baseline.value] : values, 15)

  if (days.length === 0 || !axis) return null

  const plotW = Math.max(width - M.left - M.right, 80)
  const plotH = HEIGHT - M.top - M.bottom
  const x = (i: number) => M.left + INSET + (days.length === 1 ? (plotW - 2 * INSET) / 2 : (i / (days.length - 1)) * (plotW - 2 * INSET))
  const y = (v: number) => M.top + plotH - ((v - axis.min) / (axis.max - axis.min)) * plotH
  const indexOf = (date: string) => days.findIndex((d) => d.date === date)
  const segments = segmentsOf(days)
  const gaps = gapDates(days)

  const summary = days.map((d) => `${formatUtcDayMonth(d.date) ?? d.date}: ${d.dailyMean === null ? 'no data' : `${d.dailyMean} ${unit}`}`).join('; ')
  const baselineText = baseline ? ` Recorded baseline ${baseline.version}: ${baseline.value} ${unit}.` : ''

  return (
    <div ref={wrapRef} className="ao-chart">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Heart rate by day, daily mean in {unit}</title>
        <desc id={descId}>
          {summary}.{baselineText} Days without data are gaps in the line. The full data table is on the Trends page.
        </desc>

        <text className="ao-chart__axis-title" x={M.left - 6} y={12} textAnchor="end">
          {unit}
        </text>
        {axis.ticks.map((t) => (
          <g key={t}>
            <line className="ao-chart__grid" x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
            <text className="ao-chart__tick" x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}

        {gaps.map((date) => {
          const gx = x(indexOf(date))
          return (
            <g key={date}>
              <line className="ao-chart__gap" x1={gx} x2={gx} y1={M.top - 6} y2={M.top + plotH + 4} />
              <text className="ao-chart__gap-label" x={gx} y={M.top + plotH + 38} textAnchor="middle">
                {formatUtcDayMonth(date) ?? date}: no data
              </text>
            </g>
          )
        })}

        {baseline && (
          <g>
            <line className="ao-chart__baseline" x1={M.left} x2={M.left + plotW} y1={y(baseline.value)} y2={y(baseline.value)} />
            <text className="ao-chart__baseline-label" x={M.left + plotW} y={y(baseline.value) + 15} textAnchor="end">
              Recorded baseline {baseline.version}: {baseline.value} {unit}
            </text>
          </g>
        )}

        {segments.map((seg, i) => (
          <g key={i}>
            {seg.length > 1 && <polyline className="ao-chart__line" points={seg.map((p) => `${x(indexOf(p.date))},${y(p.value)}`).join(' ')} />}
            {seg.map((p) => (
              <circle key={p.date} className="ao-chart__point" cx={x(indexOf(p.date))} cy={y(p.value)} r={5} />
            ))}
          </g>
        ))}

        {days.map((d, i) =>
          d.dailyMean === null ? null : (
            <text key={d.date} className="ao-chart__tick" x={x(i)} y={M.top + plotH + 20} textAnchor="middle">
              {tickLabel(d.date, i === 0 ? null : days[i - 1].date)}
            </text>
          ),
        )}
      </svg>

      <div className="ao-sr-only">
        <table>
        <caption>Heart rate by day, daily mean in {unit} (UTC dates)</caption>
          <thead>
            <tr>
              <th scope="col">Date (UTC)</th>
              <th scope="col">Daily mean ({unit})</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <th scope="row">{formatUtcDayMonth(d.date) ?? d.date}</th>
                <td>{d.dailyMean === null ? 'no data' : d.dailyMean}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
