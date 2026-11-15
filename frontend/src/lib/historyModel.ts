import type { HistoryCategory, HistoryRowWire } from '../types/history'

export interface CategoryMeta {
  id: HistoryCategory
  label: string
  metrics: Array<{ value: string; label: string }>
  privateNote?: string
  hideListValues?: boolean
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'vitals', label: 'Vitals', metrics: [{ value: 'heart_rate', label: 'Heart rate' }, { value: 'blood_pressure', label: 'Blood pressure' }, { value: 'temperature', label: 'Temperature' }] },
  { id: 'sleep', label: 'Sleep and Fatigue', metrics: [] },
  { id: 'checkins', label: 'Psychological check-ins', metrics: [], privateNote: 'Psychological check-ins are sensitive. This list hides reported values and notes; private fields are requested only after Details is opened and shown only when access is granted.', hideListValues: true },
  { id: 'support_requests', label: 'Support requests', metrics: [], privateNote: 'Private request details are requested only after Details is opened and only shown when access is granted.' },
  { id: 'symptoms', label: 'Symptoms', metrics: [] },
  { id: 'exercise', label: 'Exercise', metrics: [] },
  { id: 'radiation', label: 'Radiation', metrics: [] },
]

export const PAGE_SIZE = 20

export interface HistoryParams {
  category: HistoryCategory
  metric: string
  from: string
  to: string
  page: number
}

export interface HistoryRowView {
  id: string
  recordedAt: string
  metric: string
  value: string | null
  valueHidden: boolean
  context: string | null
  acquisition: string | null
  entryMethod: string | null
  source: string | null
  quality: string | null
}

type OptionalColumnKey = 'context' | 'acquisition' | 'entryMethod' | 'source' | 'quality'
export const OPTIONAL_COLUMNS: Array<{ key: OptionalColumnKey; header: string }> = [
  { key: 'context', header: 'Context' },
  { key: 'acquisition', header: 'Acquisition' },
  { key: 'entryMethod', header: 'Entry method' },
  { key: 'source', header: 'Source' },
  { key: 'quality', header: 'Quality' },
]

export function isCategory(value: string): value is HistoryCategory {
  return CATEGORIES.some((category) => category.id === value)
}

export function categoryMeta(category: HistoryCategory): CategoryMeta {
  return CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0]
}

export function parseHistoryParams(params: URLSearchParams): HistoryParams {
  const rawPage = Number(params.get('page') ?? '1')
  const rawCategory = params.get('category') ?? 'vitals'
  return {
    category: isCategory(rawCategory) ? rawCategory : 'vitals',
    metric: params.get('metric') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  }
}

export function dayStartUtc(date: string): string {
  return `${date}T00:00:00Z`
}

export function offsetFor(page: number): number {
  return (Math.max(1, Math.floor(page)) - 1) * PAGE_SIZE
}

export function pageCount(total: number, limit: number): number {
  return limit > 0 ? Math.ceil(Math.max(0, total) / limit) : 0
}

export function pageWindow(current: number, count: number): Array<number | null> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
  const pages = new Set([1, count, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b)
  const result: Array<number | null> = []
  for (const page of sorted) {
    if (result.length && page - (result[result.length - 1] as number) > 1) result.push(null)
    result.push(page)
  }
  return result
}

export function validateFilters(from: string, to: string, today: string): string | null {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  const valid = (value: string) => {
    if (!datePattern.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  }
  if (from && !valid(from)) return 'Enter a valid start date.'
  if (to && !valid(to)) return 'Enter a valid end date.'
  if (from && to && from >= to) return 'The end date must be after the start date.'
  if ((from && from > today) || (to && to > today)) return 'Dates cannot be in the future.'
  return null
}

export function toRowView(row: HistoryRowWire, categoryLabel: string, hideListValues = false): HistoryRowView {
  let value: string | null = row.display ?? null
  if (!value && row.systolic !== undefined && row.systolic !== null && row.diastolic !== undefined && row.diastolic !== null) {
    value = `${row.systolic}/${row.diastolic}${row.unit ? ` ${row.unit}` : ''}`
  } else if (!value && row.value !== undefined && row.value !== null) {
    value = `${row.value}${row.unit ? ` ${row.unit}` : ''}`
  }
  const metric = row.metricLabel ?? row.metric ?? categoryLabel
  return {
    id: row.id,
    recordedAt: row.recordedAt,
    metric,
    value: hideListValues ? null : value,
    valueHidden: hideListValues,
    context: hideListValues ? null : row.context ?? null,
    acquisition: row.acquisition ?? null,
    entryMethod: row.entryMethod ?? null,
    source: row.source ?? null,
    quality: row.quality ?? null,
  }
}

export function visibleColumns(rows: HistoryRowView[]): OptionalColumnKey[] {
  return OPTIONAL_COLUMNS.filter(({ key }) => rows.some((row) => row[key] !== null && row[key] !== '')).map(({ key }) => key)
}

export function summaryText(shown: number, total: number, limit: number, offset: number, from: string, to: string): string {
  if (total === 0) return 'No matching records. '
  const first = offset + 1
  const last = Math.min(offset + Math.min(shown, limit), total)
  const range = from || to ? ` Dates ${from || 'any'} to ${to || 'any'} (UTC).` : ''
  return `Showing ${first}–${last} of ${total} records.${range} `
}
