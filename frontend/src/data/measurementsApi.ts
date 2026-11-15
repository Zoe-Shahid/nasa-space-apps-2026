import { ApiError } from './common'
import { http } from './http'

export type MeasurementCategory = 'heart_rate' | 'blood_pressure' | 'body_temperature' | 'blood_glucose' | 'sleep_duration'

export interface Measurement {
  id: string
  category: MeasurementCategory
  value?: string
  systolic?: string
  diastolic?: string
  unit: string
  measured_at: string
  time_zone?: string
  source: 'manual'
  note?: string
  is_synthetic: false
  created_at: string
  updated_at: string
}

export interface MeasurementQuery {
  category?: MeasurementCategory | ''
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface MeasurementPage {
  items: Measurement[]
  limit: number
  offset: number
}

export interface MeasurementTrendDay {
  date: string
  count: number
  min: string | null
  max: string | null
  mean: string | null
}

export interface MeasurementTrendSeries {
  category: MeasurementCategory
  unit: string
  field: 'systolic' | 'diastolic' | null
  days: MeasurementTrendDay[]
}

export interface MeasurementTrends {
  from: string
  to: string
  series: MeasurementTrendSeries[]
}

export type MeasurementInput = {
  client_record_id: string
  category: MeasurementCategory
  value?: string
  systolic?: string
  diastolic?: string
  unit: string
  measured_at: string
  time_zone?: string
  note?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function parseMeasurement(value: unknown): Measurement {
  if (!isRecord(value)) throw new ApiError('The measurements endpoint returned an unexpected response.', { kind: 'server' })
  const { id, category, unit, measured_at, time_zone, source, note, is_synthetic, created_at, updated_at } = value
  const categoryFields = category === 'blood_pressure' ? ['systolic', 'diastolic'] : ['value']
  const allowed = ['id', 'category', 'unit', 'measured_at', 'source', 'is_synthetic', 'created_at', 'updated_at', ...categoryFields]
  if (time_zone !== undefined) allowed.push('time_zone')
  if (note !== undefined) allowed.push('note')
  const keys = Object.keys(value).sort()
  if (
    keys.length !== allowed.length || !keys.every((key, index) => key === [...allowed].sort()[index]) ||
    !isUuid(id) || !['heart_rate', 'blood_pressure', 'body_temperature', 'blood_glucose', 'sleep_duration'].includes(String(category)) ||
    typeof unit !== 'string' || typeof measured_at !== 'string' || !/[+-]\d\d:\d\d$|Z$/.test(measured_at) ||
    (time_zone !== undefined && typeof time_zone !== 'string') || source !== 'manual' || is_synthetic !== false ||
    !isTime(created_at) || !isTime(updated_at) || (note !== undefined && typeof note !== 'string')
  ) throw new ApiError('The measurements endpoint returned an unexpected response.', { kind: 'server' })
  for (const field of categoryFields) {
    if (typeof value[field] !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value[field] as string)) {
      throw new ApiError('The measurements endpoint returned an unexpected response.', { kind: 'server' })
    }
  }
  return value as unknown as Measurement
}

function parsePage(value: unknown): MeasurementPage {
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.limit !== 'number' || typeof value.offset !== 'number') {
    throw new ApiError('The measurements endpoint returned an unexpected response.', { kind: 'server' })
  }
  return { items: value.items.map(parseMeasurement), limit: value.limit, offset: value.offset }
}

function parseTrends(value: unknown): MeasurementTrends {
  if (!isRecord(value) || typeof value.from !== 'string' || typeof value.to !== 'string' || !Array.isArray(value.series)) {
    throw new ApiError('The trends endpoint returned an unexpected response.', { kind: 'server' })
  }
  const series = value.series.map((item): MeasurementTrendSeries => {
    if (!isRecord(item) || typeof item.category !== 'string' || typeof item.unit !== 'string' ||
      !(item.field === null || item.field === 'systolic' || item.field === 'diastolic') || !Array.isArray(item.days)) {
      throw new ApiError('The trends endpoint returned an unexpected response.', { kind: 'server' })
    }
    const days = item.days.map((day): MeasurementTrendDay => {
      if (!isRecord(day) || typeof day.date !== 'string' || typeof day.count !== 'number' ||
        ![day.min, day.max, day.mean].every((part) => part === null || typeof part === 'string')) {
        throw new ApiError('The trends endpoint returned an unexpected response.', { kind: 'server' })
      }
      return { date: day.date, count: day.count, min: day.min as string | null, max: day.max as string | null, mean: day.mean as string | null }
    })
    return { category: item.category as MeasurementCategory, unit: item.unit, field: item.field, days }
  })
  return { from: value.from, to: value.to, series }
}

export const measurementsApi = {
  async list(query: MeasurementQuery = {}, signal?: AbortSignal): Promise<MeasurementPage> {
    const params = new URLSearchParams()
    if (query.category) params.set('category', query.category)
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
    params.set('limit', String(query.limit ?? 50))
    params.set('offset', String(query.offset ?? 0))
    return parsePage(await http(`/api/v1/me/measurements?${params}`, { signal }))
  },
  async create(input: MeasurementInput): Promise<Measurement> {
    return parseMeasurement(await http('/api/v1/me/measurements', { method: 'POST', body: input }))
  },
  async trends(category: MeasurementCategory, from: string, to: string, signal?: AbortSignal): Promise<MeasurementTrends> {
    const params = new URLSearchParams({ category, from, to })
    return parseTrends(await http(`/api/v1/me/trends?${params}`, { signal }))
  },
}