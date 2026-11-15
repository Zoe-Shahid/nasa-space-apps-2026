import { ApiError } from './common'
import { http } from './http'
import { mapObservation, mapProfile, mapSleepRecord } from './profileMappers'
import type {
  BloodPressureDto,
  BodyTemperatureDto,
  HeartRateDto,
  ObservationCreateDto,
  ObservationCreateResultDto,
  ObservationDto,
  PaginationQueryDto,
  ProfileDto,
  SleepCreateResultDto,
  SleepCreateDto,
  SleepRecordDto,
} from '../types/api'
import type {
  ObservationCollectionViewModel,
  ObservationCreateResultViewModel,
  ObservationViewModel,
  ProfileViewModel,
  SleepCollectionViewModel,
  SleepCreateResultViewModel,
  SleepRecordViewModel,
} from '../types/profiles'

export type PageRequest = PaginationQueryDto

export interface Page<T> {
  items: T[]
  limit: number
  offset: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isUtcTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*Z$/.test(value) && Number.isFinite(Date.parse(value))
}

function isSource(value: unknown): value is 'manual' | 'simulated_device' {
  return value === 'manual' || value === 'simulated_device'
}

function isQuality(value: unknown): value is 'valid' | 'suspect' | 'invalid' {
  return value === 'valid' || value === 'suspect' || value === 'invalid'
}

function unexpected(name: string): never {
  throw new ApiError(`The ${name} endpoint returned an unexpected response.`, { kind: 'server' })
}

function parseProfile(value: unknown): ProfileDto {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['id', 'display_name', 'is_synthetic']) ||
    !isUuid(value.id) ||
    typeof value.display_name !== 'string' ||
    value.display_name.length < 1 ||
    value.display_name.length > 120 ||
    value.is_synthetic !== true
  ) return unexpected('profile')

  return {
    id: value.id,
    display_name: value.display_name,
    is_synthetic: true,
  }
}

function parsePage<TDto, TView>(
  value: unknown,
  name: string,
  parseItem: (item: unknown) => TDto,
  mapItem: (item: TDto) => TView,
): Page<TView> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['items', 'limit', 'offset']) ||
    !Array.isArray(value.items) ||
    typeof value.limit !== 'number' ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    value.limit > 100 ||
    typeof value.offset !== 'number' ||
    !Number.isInteger(value.offset) ||
    value.offset < 0 ||
    value.items.length > value.limit
  ) return unexpected(name)

  return {
    items: value.items.map((item) => mapItem(parseItem(item))),
    limit: value.limit,
    offset: value.offset,
  }
}

function parseObservation(
  value: unknown,
  createResult?: false,
): ObservationDto
function parseObservation(
  value: unknown,
  createResult: true,
): ObservationCreateResultDto
function parseObservation(
  value: unknown,
  createResult = false,
): ObservationDto | ObservationCreateResultDto {
  if (!isRecord(value)) return unexpected('observation')

  const commonFields = [
    'id',
    'profile_id',
    'client_record_id',
    'metric',
    'unit',
    'measured_at',
    'source',
    'quality',
    'is_synthetic',
    'created_at',
  ]
  const fields = createResult ? [...commonFields, 'replayed'] : commonFields
  const variantFields = value.metric === 'blood_pressure'
    ? ['systolic', 'diastolic']
    : value.metric === 'heart_rate' || value.metric === 'body_temperature'
      ? ['value']
      : []
  if (
    variantFields.length === 0 ||
    !hasExactKeys(value, [...fields, ...variantFields]) ||
    !isUuid(value.id) ||
    !isUuid(value.profile_id) ||
    !isUuid(value.client_record_id) ||
    !isUtcTimestamp(value.measured_at) ||
    !isUtcTimestamp(value.created_at) ||
    !isSource(value.source) ||
    !isQuality(value.quality) ||
    value.is_synthetic !== true ||
    (createResult && typeof value.replayed !== 'boolean')
  ) return unexpected('observation')

  const base = {
    id: value.id,
    profile_id: value.profile_id,
    client_record_id: value.client_record_id,
    measured_at: value.measured_at,
    source: value.source,
    quality: value.quality,
    is_synthetic: true as const,
    created_at: value.created_at,
  }
  const replay = () => {
    if (!createResult) return {}
    if (typeof value.replayed !== 'boolean') return unexpected('observation')
    return { replayed: value.replayed }
  }

  if (value.metric === 'heart_rate') {
    if (value.unit !== 'bpm' || typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value <= 0) {
      return unexpected('observation')
    }
    const result: HeartRateDto = { ...base, metric: 'heart_rate', value: value.value, unit: 'bpm' }
    return createResult ? { ...result, ...replay() } : result
  }

  if (value.metric === 'body_temperature') {
    if (value.unit !== '°C' || typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value <= 0) {
      return unexpected('observation')
    }
    const result: BodyTemperatureDto = { ...base, metric: 'body_temperature', value: value.value, unit: '°C' }
    return createResult ? { ...result, ...replay() } : result
  }

  if (
    value.unit !== 'mmHg' ||
    typeof value.systolic !== 'number' ||
    !Number.isFinite(value.systolic) ||
    value.systolic <= 0 ||
    typeof value.diastolic !== 'number' ||
    !Number.isFinite(value.diastolic) ||
    value.diastolic <= 0
  ) return unexpected('observation')

  const result: BloodPressureDto = {
    ...base,
    metric: 'blood_pressure',
    systolic: value.systolic,
    diastolic: value.diastolic,
    unit: 'mmHg',
  }
  return createResult ? { ...result, ...replay() } : result
}

function parseSleepRecord(
  value: unknown,
  createResult?: false,
): SleepRecordDto
function parseSleepRecord(
  value: unknown,
  createResult: true,
): SleepCreateResultDto
function parseSleepRecord(
  value: unknown,
  createResult = false,
): SleepRecordDto | SleepCreateResultDto {
  const fields = [
    'id',
    'profile_id',
    'client_record_id',
    'duration_minutes',
    'reporting_date',
    'includes_naps',
    'source',
    'quality',
    'is_synthetic',
    'created_at',
  ]
  if (createResult) fields.push('replayed')

  const reportingDate = isRecord(value) && typeof value.reporting_date === 'string'
    ? new Date(`${value.reporting_date}T00:00:00Z`)
    : null
  if (
    !isRecord(value) ||
    !hasExactKeys(value, fields) ||
    !isUuid(value.id) ||
    !isUuid(value.profile_id) ||
    !isUuid(value.client_record_id) ||
    typeof value.duration_minutes !== 'number' ||
    !Number.isInteger(value.duration_minutes) ||
    value.duration_minutes <= 0 ||
    typeof value.reporting_date !== 'string' ||
    !/^\d{4}-\d\d-\d\d$/.test(value.reporting_date) ||
    !reportingDate ||
    !Number.isFinite(reportingDate.getTime()) ||
    reportingDate.toISOString().slice(0, 10) !== value.reporting_date ||
    typeof value.includes_naps !== 'boolean' ||
    !isSource(value.source) ||
    !isQuality(value.quality) ||
    value.is_synthetic !== true ||
    !isUtcTimestamp(value.created_at) ||
    (createResult && typeof value.replayed !== 'boolean')
  ) return unexpected('sleep record')

  const result: SleepRecordDto = {
    id: value.id,
    profile_id: value.profile_id,
    client_record_id: value.client_record_id,
    duration_minutes: value.duration_minutes,
    reporting_date: value.reporting_date,
    includes_naps: value.includes_naps,
    source: value.source,
    quality: value.quality,
    is_synthetic: true,
    created_at: value.created_at,
  }
  if (!createResult) return result
  if (typeof value.replayed !== 'boolean') return unexpected('sleep record')
  return { ...result, replayed: value.replayed }
}

function pageQuery({ limit = 20, offset = 0 }: PageRequest = {}): string {
  return `?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`
}

async function collectPages<T>(
  loadPage: (request: PageRequest, signal?: AbortSignal) => Promise<Page<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  while (true) {
    const page = await loadPage({ limit: 100, offset }, signal)
    items.push(...page.items)
    if (page.items.length < page.limit) return items
    offset += page.limit
  }
}

export interface ProfilesApi {
  listProfiles(request?: PageRequest, signal?: AbortSignal): Promise<Page<ProfileViewModel>>
  listAllProfiles(signal?: AbortSignal): Promise<ProfileViewModel[]>
  getProfile(profileId: string, signal?: AbortSignal): Promise<ProfileViewModel>
  listObservations(profileId: string, request?: PageRequest, signal?: AbortSignal): Promise<ObservationCollectionViewModel>
  listAllObservations(profileId: string, signal?: AbortSignal): Promise<ObservationViewModel[]>
  createObservation(profileId: string, request: ObservationCreateDto, signal?: AbortSignal): Promise<ObservationCreateResultViewModel>
  listSleepRecords(profileId: string, request?: PageRequest, signal?: AbortSignal): Promise<SleepCollectionViewModel>
  listAllSleepRecords(profileId: string, signal?: AbortSignal): Promise<SleepRecordViewModel[]>
  createSleepRecord(profileId: string, request: SleepCreateDto, signal?: AbortSignal): Promise<SleepCreateResultViewModel>
}

export const liveProfilesApi: ProfilesApi = {
  async listProfiles(request, signal) {
    const raw = await http(`/api/v1/profiles${pageQuery(request)}`, { signal })
    return parsePage(raw, 'profile list', parseProfile, mapProfile)
  },
  async listAllProfiles(signal) {
    return collectPages((request, pageSignal) => this.listProfiles(request, pageSignal), signal)
  },
  async getProfile(profileId, signal) {
    return mapProfile(parseProfile(await http(`/api/v1/profiles/${encodeURIComponent(profileId)}`, { signal })))
  },
  async listObservations(profileId, request, signal) {
    const raw = await http(
      `/api/v1/profiles/${encodeURIComponent(profileId)}/observations${pageQuery(request)}`,
      { signal },
    )
    return parsePage(
      raw,
      'observation list',
      (item) => parseObservation(item),
      (item) => mapObservation(item),
    )
  },
  async listAllObservations(profileId, signal) {
    return collectPages(
      (request, pageSignal) => this.listObservations(profileId, request, pageSignal),
      signal,
    )
  },
  async createObservation(profileId, request, signal) {
    const raw = await http(`/api/v1/profiles/${encodeURIComponent(profileId)}/observations`, {
      method: 'POST',
      body: request,
      signal,
    })
    const result: ObservationCreateResultDto = parseObservation(raw, true)
    return mapObservation(result)
  },
  async listSleepRecords(profileId, request, signal) {
    const raw = await http(
      `/api/v1/profiles/${encodeURIComponent(profileId)}/sleep-records${pageQuery(request)}`,
      { signal },
    )
    return parsePage(
      raw,
      'sleep-record list',
      (item) => parseSleepRecord(item),
      (item) => mapSleepRecord(item),
    )
  },
  async listAllSleepRecords(profileId, signal) {
    return collectPages(
      (request, pageSignal) => this.listSleepRecords(profileId, request, pageSignal),
      signal,
    )
  },
  async createSleepRecord(profileId, request, signal) {
    const raw = await http(`/api/v1/profiles/${encodeURIComponent(profileId)}/sleep-records`, {
      method: 'POST',
      body: request,
      signal,
    })
    const result: SleepCreateResultDto = parseSleepRecord(raw, true)
    return mapSleepRecord(result)
  },
}
