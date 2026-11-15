import { domainMeta } from './domains'
import type { BloodPressureReading, RecentRecordWire, ScalarReading, SleepReading, HeartRateTrend } from '../types/overview'

export interface ReadingView {
  label: string
  value: string | null
  unit: string
  timeUtc: string | null
  note?: string
}

export interface RecentRecordView {
  id: string
  recordedAt: string
  title: string
  valueText: string
  accessibleText: string
}

export interface RecentRecordSegmentPoint {
  date: string
  value: number
}

export const ORBIT = { width: 100, height: 106, cx: 50, cy: 50, outerRadius: 43, nodeRadius: 34, innerRadius: 23 }

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0].toLocaleUpperCase()).join('') || '?'
}

export function statusText(value: string | null | undefined): string {
  switch (value) {
    case 'normal': return 'Normal'
    case 'attention': return 'Attention'
    case 'urgent': return 'Urgent'
    case 'insufficient_data': return 'Insufficient Data'
    default: return 'Not reported'
  }
}

export function glyphFor(value: string | null | undefined): string {
  switch (value) {
    case 'normal': return '✓'
    case 'attention': return '!'
    case 'urgent': return '!'
    case 'insufficient_data': return '…'
    default: return '?'
  }
}

export function ringStyleFor(value: string | null | undefined): 'solid' | 'dashed' | 'neutral' {
  if (value === 'normal' || value === 'attention' || value === 'urgent') return 'solid'
  if (value === 'insufficient_data') return 'dashed'
  return 'neutral'
}

export function nodeAccessibleName(
  key: string,
  status: string | null,
  coverage?: string | null,
  unreportedLabel = 'Not reported',
): string {
  const label = domainMeta(key)?.orbitLabel ?? key
  const coverageText = coverage ? `, coverage ${coverage.replace('_', ' ')}` : ''
  return `${label}: ${status === null ? unreportedLabel : statusText(status)}${coverageText}`
}

export function nodePosition(index: number, count: number): { left: string; top: string } {
  if (count < 1) return { left: '50%', top: '50%' }
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count
  return { left: `${50 + 34 * Math.cos(angle)}%`, top: `${50 + 34 * Math.sin(angle) * (100 / 106)}%` }
}

export function joinList(values: string[]): string {
  if (values.length < 2) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`
}

export function heartRateView(reading: ScalarReading | null): ReadingView {
  return { label: 'Heart rate', value: reading ? String(reading.value) : null, unit: reading?.unit ?? 'bpm', timeUtc: reading?.recordedAt ?? null }
}

export function bloodPressureView(reading: BloodPressureReading | null): ReadingView {
  return { label: 'Blood pressure', value: reading ? `${reading.systolic}/${reading.diastolic}` : null, unit: reading?.unit ?? 'mmHg', timeUtc: reading?.recordedAt ?? null }
}

export function temperatureView(reading: ScalarReading | null): ReadingView {
  return { label: 'Temperature', value: reading ? String(reading.value) : null, unit: reading?.unit ?? '', timeUtc: reading?.recordedAt ?? null }
}

export function sleepView(reading: SleepReading | null): ReadingView {
  return { label: 'Sleep total', value: reading ? String(reading.totalHours) : null, unit: reading?.unit ?? 'h', timeUtc: reading?.recordedAt ?? null, note: reading ? `Reporting date ${reading.reportingDate} (UTC)` : undefined }
}

export function recentRecordsForDisplay(records: RecentRecordWire[]): RecentRecordView[] {
  return records.flatMap((record) => {
    let title: string
    let valueText: string
    switch (record.kind) {
      case 'heart_rate':
        title = 'Heart rate'
        valueText = record.value === undefined ? '' : `${record.value} ${record.unit ?? 'bpm'}`
        break
      case 'blood_pressure':
        title = 'Blood pressure'
        valueText = record.systolic === undefined || record.diastolic === undefined ? '' : `${record.systolic}/${record.diastolic} ${record.unit ?? 'mmHg'}`
        break
      case 'temperature':
        title = 'Temperature'
        valueText = record.value === undefined ? '' : `${record.value} ${record.unit ?? ''}`.trim()
        break
      case 'sleep_total':
        title = 'Sleep total'
        valueText = record.totalHours === undefined ? '' : `${record.totalHours} ${record.unit ?? 'h'}`
        break
      default:
        return []
    }
    return [{ id: record.id, recordedAt: record.recordedAt, title, valueText, accessibleText: `${title}${valueText ? ` ${valueText}` : ''}` }]
  })
}

export function segmentsOf(days: HeartRateTrend['days']): RecentRecordSegmentPoint[][] {
  const segments: RecentRecordSegmentPoint[][] = []
  for (const [index, day] of days.entries()) {
    if (day.dailyMean === null) {
      continue
    }
    const point = { date: day.date, value: day.dailyMean }
    const previous = days[index - 1]
    if (index > 0 && previous && previous.dailyMean !== null) segments[segments.length - 1].push(point)
    else segments.push([point])
  }
  return segments
}

export function gapDates(days: HeartRateTrend['days']): string[] {
  return days.filter((day) => day.dailyMean === null).map((day) => day.date)
}

export interface Axis {
  min: number
  max: number
  ticks: number[]
}

export function niceAxis(values: number[], targetTicks = 5): Axis | null {
  const finite = values.filter(Number.isFinite)
  if (!finite.length) return null
  let min = Math.min(...finite)
  let max = Math.max(...finite)
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / Math.max(targetTicks - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
  const axisMin = Math.floor(min / step) * step
  const axisMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let tick = axisMin, i = 0; tick <= axisMax + step / 1000 && i < 100; tick += step, i += 1) ticks.push(Number(tick.toPrecision(10)))
  return { min: axisMin, max: axisMax, ticks }
}
