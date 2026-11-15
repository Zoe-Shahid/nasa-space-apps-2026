import type { TrendDay, TrendSeries, TrendStat } from '../types/trends'

export function meanOf(day: TrendDay, series: TrendSeries | undefined): number | null {
  if (!series) return null
  const stat: TrendStat | null | undefined = day.values[series.key]
  return stat?.mean ?? null
}

export function dayHasData(day: TrendDay, series: TrendSeries[]): boolean {
  return series.some((item) => meanOf(day, item) !== null)
}

export function isNoData(days: TrendDay[], series: TrendSeries[]): boolean {
  return !days.some((day) => dayHasData(day, series))
}

export function isPartial(days: TrendDay[], series: TrendSeries[]): boolean {
  return days.some((day) => !dayHasData(day, series))
}

export function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(parsed.valueOf()) ? date : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parsed)
}

function formatValue(value: number, series: TrendSeries): string {
  return Number.isInteger(series.decimals) && series.decimals >= 0 ? value.toFixed(series.decimals) : String(value)
}

export function dayLines(day: TrendDay, series: TrendSeries[]): string[] {
  if (!dayHasData(day, series)) return ['No data']
  return series.map((item) => {
    const value = meanOf(day, item)
    return value === null ? `${item.label}: no data` : `${item.label}: ${formatValue(value, item)} ${item.unit}`
  })
}

export function dayDescription(day: TrendDay, series: TrendSeries[]): string {
  return `${dayLabel(day.date)} (UTC): ${dayLines(day, series).join('; ')}`
}

export interface TrendPoint {
  date: string
  value: number
}

export function seriesSegments(days: TrendDay[], series: TrendSeries): TrendPoint[][] {
  const segments: TrendPoint[][] = []
  for (const [index, day] of days.entries()) {
    const value = meanOf(day, series)
    if (value === null) continue
    const point = { date: day.date, value }
    const previous = days[index - 1]
    if (index > 0 && previous && meanOf(previous, series) !== null) segments[segments.length - 1].push(point)
    else segments.push([point])
  }
  return segments
}

export interface TrendAxis {
  min: number
  max: number
  ticks: number[]
}

function axisFor(values: number[], includeZero: boolean): TrendAxis | null {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return null
  let min = Math.min(...valid)
  let max = Math.max(...valid)
  if (includeZero) min = Math.min(0, min)
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const stepRaw = (max - min) / 4
  const magnitude = 10 ** Math.floor(Math.log10(stepRaw))
  const fraction = stepRaw / magnitude
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude
  const lower = Math.floor(min / step) * step
  const upper = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = lower, i = 0; value <= upper + step / 1000 && i < 100; value += step, i += 1) ticks.push(Number(value.toPrecision(10)))
  return { min: lower, max: upper, ticks }
}

export function lineAxis(values: number[]): TrendAxis | null {
  return axisFor(values, false)
}

export function barAxis(values: number[]): TrendAxis | null {
  return axisFor(values, true)
}

export function labelEvery(count: number, width: number): number {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / 64))))
}

export function tableColumns(series: TrendSeries[], days: TrendDay[]): Array<{ key: string; header: string; cell: (day: TrendDay) => string }> {
  return [
    { key: 'date', header: 'Date (UTC)', cell: (day) => dayLabel(day.date) },
    ...series.map((item) => ({
      key: item.key,
      header: `${item.meanLabel} · ${item.label} (${item.unit})`,
      cell: (day: TrendDay) => {
        const value = meanOf(day, item)
        return value === null ? 'no data' : formatValue(value, item)
      },
    })),
    ...(days.some((day) => day.recordCount > 0) ? [{ key: 'count', header: 'Records', cell: (day: TrendDay) => String(day.recordCount) }] : []),
  ]
}
