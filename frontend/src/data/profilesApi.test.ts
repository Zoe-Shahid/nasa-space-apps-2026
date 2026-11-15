import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './common'
import { liveProfilesApi } from './profilesApi'
import type {
  BloodPressureDto,
  BodyTemperatureDto,
  HeartRateCreateDto,
  HeartRateDto,
  ObservationCollectionDto,
  ObservationDto,
  ObservationCreateResultDto,
  ProfileCollectionDto,
  ProfileDto,
  SleepCreateDto,
  SleepCollectionDto,
  SleepRecordDto,
} from '../types/api'

const profileId = '11111111-1111-4111-8111-111111111111'
const recordId = '22222222-2222-4222-8222-222222222222'
const clientRecordId = '33333333-3333-4333-8333-333333333333'
const requestId = '44444444-4444-4444-8444-444444444444'

const profileDto = {
  id: profileId,
  display_name: 'Synthetic test profile',
  is_synthetic: true,
} satisfies ProfileDto
const profileCollectionDto = {
  items: [profileDto],
  limit: 20,
  offset: 0,
} satisfies ProfileCollectionDto

const heartRateDto = {
  id: recordId,
  profile_id: profileId,
  client_record_id: clientRecordId,
  metric: 'heart_rate',
  value: 72,
  unit: 'bpm',
  measured_at: '2026-11-14T07:30:00Z',
  source: 'manual',
  quality: 'valid',
  is_synthetic: true,
  created_at: '2026-11-14T07:30:01Z',
} satisfies HeartRateDto

const bloodPressureDto = {
  id: '55555555-5555-4555-8555-555555555555',
  profile_id: profileId,
  client_record_id: '66666666-6666-4666-8666-666666666666',
  metric: 'blood_pressure',
  systolic: 120,
  diastolic: 80,
  unit: 'mmHg',
  measured_at: '2026-11-14T08:30:00Z',
  source: 'simulated_device',
  quality: 'suspect',
  is_synthetic: true,
  created_at: '2026-11-14T08:30:01Z',
} satisfies BloodPressureDto

const bodyTemperatureDto = {
  id: '77777777-7777-4777-8777-777777777777',
  profile_id: profileId,
  client_record_id: '88888888-8888-4888-8888-888888888888',
  metric: 'body_temperature',
  value: 36.5,
  unit: '°C',
  measured_at: '2026-11-14T09:30:00Z',
  source: 'manual',
  quality: 'invalid',
  is_synthetic: true,
  created_at: '2026-11-14T09:30:01Z',
} satisfies BodyTemperatureDto

const sleepRecordDto = {
  id: recordId,
  profile_id: profileId,
  client_record_id: clientRecordId,
  duration_minutes: 420,
  reporting_date: '2026-11-14',
  includes_naps: false,
  source: 'manual',
  quality: 'valid',
  is_synthetic: true,
  created_at: '2026-11-14T07:30:01Z',
} satisfies SleepRecordDto

const observationCollectionDto = {
  items: [heartRateDto, bloodPressureDto, bodyTemperatureDto] satisfies ObservationDto[],
  limit: 20,
  offset: 0,
} satisfies ObservationCollectionDto

const sleepCollectionDto = {
  items: [sleepRecordDto],
  limit: 20,
  offset: 0,
} satisfies SleepCollectionDto

function response(value: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('profiles API adapter', () => {
  it('lists profiles from the exact wire collection shape and maps to view models', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.fn().mockResolvedValue(response(profileCollectionDto))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfilesApi.listProfiles()).resolves.toEqual({
      items: [{ id: profileId, displayName: 'Synthetic test profile', isSynthetic: true }],
      limit: 20,
      offset: 0,
    })
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8000/api/v1/profiles?limit=20&offset=0')
  })

  it('reads one profile at the exact runtime route and maps its fields', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.fn().mockResolvedValue(response(profileDto))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfilesApi.getProfile(profileId)).resolves.toEqual({
      id: profileId,
      displayName: 'Synthetic test profile',
      isSynthetic: true,
    })
    expect(fetchMock.mock.calls[0][0]).toBe(`http://127.0.0.1:8000/api/v1/profiles/${profileId}`)
  })

  it('posts the exact observation DTO and maps the exact create response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const request = {
      client_record_id: clientRecordId,
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measured_at: '2026-11-14T07:30:00Z',
      source: 'manual',
      quality: 'valid',
    } satisfies HeartRateCreateDto
    const createResult = { ...heartRateDto, replayed: false } satisfies ObservationCreateResultDto
    const fetchMock = vi.fn().mockResolvedValue(response(createResult, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfilesApi.createObservation(profileId, request)).resolves.toEqual({
      id: recordId,
      profileId,
      clientRecordId,
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measuredAt: '2026-11-14T07:30:00Z',
      source: 'manual',
      quality: 'valid',
      isSynthetic: true,
      createdAt: '2026-11-14T07:30:01Z',
      replayed: false,
    })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`http://127.0.0.1:8000/api/v1/profiles/${profileId}/observations`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(request)
    expect(options.credentials).toBe('include')
    expect(new Headers(options.headers).get('X-Request-ID')).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('lists only exact observation DTO variants and keeps suspect quality descriptive', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.fn().mockResolvedValue(response(observationCollectionDto))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfilesApi.listObservations(profileId)).resolves.toEqual({
      items: [
        {
          id: recordId,
          profileId,
          clientRecordId,
          metric: 'heart_rate',
          value: 72,
          unit: 'bpm',
          measuredAt: '2026-11-14T07:30:00Z',
          source: 'manual',
          quality: 'valid',
          isSynthetic: true,
          createdAt: '2026-11-14T07:30:01Z',
        },
        {
          id: bloodPressureDto.id,
          profileId,
          clientRecordId: bloodPressureDto.client_record_id,
          metric: 'blood_pressure',
          systolic: 120,
          diastolic: 80,
          unit: 'mmHg',
          measuredAt: '2026-11-14T08:30:00Z',
          source: 'simulated_device',
          quality: 'suspect',
          isSynthetic: true,
          createdAt: '2026-11-14T08:30:01Z',
        },
        {
          id: bodyTemperatureDto.id,
          profileId,
          clientRecordId: bodyTemperatureDto.client_record_id,
          metric: 'body_temperature',
          value: 36.5,
          unit: '°C',
          measuredAt: '2026-11-14T09:30:00Z',
          source: 'manual',
          quality: 'invalid',
          isSynthetic: true,
          createdAt: '2026-11-14T09:30:01Z',
        },
      ],
      limit: 20,
      offset: 0,
    })
    expect(fetchMock.mock.calls[0][0]).toBe(
      `http://127.0.0.1:8000/api/v1/profiles/${profileId}/observations?limit=20&offset=0`,
    )
  })

  it('creates and lists sleep records using exact wire fields and separate view models', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(sleepCollectionDto))
      .mockResolvedValueOnce(response({ ...sleepRecordDto, replayed: true }, 200))
    vi.stubGlobal('fetch', fetchMock)
    const request = {
      client_record_id: clientRecordId,
      duration_minutes: 420,
      reporting_date: '2026-11-14',
      includes_naps: false,
      source: 'manual',
      quality: 'valid',
    } satisfies SleepCreateDto

    await expect(liveProfilesApi.listSleepRecords(profileId)).resolves.toEqual({
      items: [{
        id: recordId,
        profileId,
        clientRecordId,
        durationMinutes: 420,
        reportingDate: '2026-11-14',
        includesNaps: false,
        source: 'manual',
        quality: 'valid',
        isSynthetic: true,
        createdAt: '2026-11-14T07:30:01Z',
      }],
      limit: 20,
      offset: 0,
    })
    await expect(liveProfilesApi.createSleepRecord(profileId, request)).resolves.toEqual({
      id: recordId,
      profileId,
      clientRecordId,
      durationMinutes: 420,
      reportingDate: '2026-11-14',
      includesNaps: false,
      source: 'manual',
      quality: 'valid',
      isSynthetic: true,
      createdAt: '2026-11-14T07:30:01Z',
      replayed: true,
    })
    expect(fetchMock.mock.calls[1][0]).toBe(
      `http://127.0.0.1:8000/api/v1/profiles/${profileId}/sleep-records`,
    )
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(request)
  })

  it('loads all pages using only the approved limit and offset query parameters', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...heartRateDto,
      id: `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`,
    }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: firstPage, limit: 100, offset: 0 }))
      .mockResolvedValueOnce(response({ items: [], limit: 100, offset: 100 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfilesApi.listAllObservations(profileId)).resolves.toHaveLength(100)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `http://127.0.0.1:8000/api/v1/profiles/${profileId}/observations?limit=100&offset=0`,
      `http://127.0.0.1:8000/api/v1/profiles/${profileId}/observations?limit=100&offset=100`,
    ])
  })

  it('rejects extra and non-synthetic fields instead of accepting incompatible wire schemas', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...profileDto, extra: 'unexpected' })))
    await expect(liveProfilesApi.getProfile(profileId)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
    } satisfies Partial<ApiError>)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...profileDto, is_synthetic: false })))
    await expect(liveProfilesApi.getProfile(profileId)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
    } satisfies Partial<ApiError>)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      items: [{ ...heartRateDto, extra: 'unexpected' }],
      limit: 20,
      offset: 0,
    })))
    await expect(liveProfilesApi.listObservations(profileId)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
    } satisfies Partial<ApiError>)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      items: [{ ...sleepRecordDto, reporting_date: '2026-02-30' }],
      limit: 20,
      offset: 0,
    })))
    await expect(liveProfilesApi.listSleepRecords(profileId)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
    } satisfies Partial<ApiError>)
  })

  it('keeps RFC 9457 field errors and response request IDs on rejected creates', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Request validation failed.',
      request_id: requestId,
      errors: [{ field: 'body.value', code: 'greater_than', message: 'Invalid value.' }],
    }), {
      status: 422,
      headers: { 'content-type': 'application/problem+json', 'X-Request-ID': requestId },
    })))

    await expect(liveProfilesApi.createObservation(profileId, {
      client_record_id: clientRecordId,
      metric: 'heart_rate',
      value: 0,
      unit: 'bpm',
      measured_at: '2026-11-14T07:30:00Z',
      source: 'manual',
      quality: 'valid',
    })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      requestId,
      fieldErrors: { 'body.value': 'Invalid value.' },
    } satisfies Partial<ApiError>)
  })
})
