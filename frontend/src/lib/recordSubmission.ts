import type {
  ObservationCreateDto,
  RecordQualityDto,
  RecordSourceDto,
  SleepCreateDto,
} from '../types/api'

export type RecordKind = ObservationCreateDto['metric'] | 'sleep_duration'

export interface RecordDraft {
  metric: RecordKind | ''
  value: string
  systolic: string
  diastolic: string
  measuredAt: string
  durationMinutes: string
  reportingDate: string
  includesNaps: string
  source: RecordSourceDto
  quality: RecordQualityDto
}

export type NewRecordPayload = ObservationCreateDto | SleepCreateDto

function positiveNumber(value: string, label: string): number {
  const parsed = Number(value)
  if (value.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive finite number.`)
  }
  return parsed
}

export function buildRecordRequest(
  profileId: string,
  draft: RecordDraft,
  clientRecordId: string,
): NewRecordPayload {
  if (!profileId) throw new Error('Choose a synthetic profile.')
  if (!draft.metric) throw new Error('Choose a supported record type.')

  if (draft.metric === 'sleep_duration') {
    const duration = Number(draft.durationMinutes)
    if (!Number.isInteger(duration) || duration <= 0) throw new Error('Duration must be a positive whole number of minutes.')
    const reportDate = new Date(`${draft.reportingDate}T00:00:00Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.reportingDate) ||
      !Number.isFinite(reportDate.getTime()) ||
      reportDate.toISOString().slice(0, 10) !== draft.reportingDate
    ) {
      throw new Error('Enter a valid UTC reporting date.')
    }
    if (draft.includesNaps !== 'true' && draft.includesNaps !== 'false') throw new Error('Choose whether naps are included.')
    return {
      client_record_id: clientRecordId,
      duration_minutes: duration,
      reporting_date: draft.reportingDate,
      includes_naps: draft.includesNaps === 'true',
      source: draft.source,
      quality: draft.quality,
    }
  }

  if (!draft.measuredAt) throw new Error('Enter when the observation was measured.')
  const measuredDate = new Date(draft.measuredAt)
  if (!Number.isFinite(measuredDate.getTime())) throw new Error('Enter a valid measurement time.')
  const measured_at = measuredDate.toISOString()

  if (draft.metric === 'heart_rate') {
    return {
      client_record_id: clientRecordId,
      metric: draft.metric,
      value: positiveNumber(draft.value, 'Heart rate'),
      unit: 'bpm',
      measured_at,
      source: draft.source,
      quality: draft.quality,
    }
  }
  if (draft.metric === 'body_temperature') {
    return {
      client_record_id: clientRecordId,
      metric: draft.metric,
      value: positiveNumber(draft.value, 'Body temperature'),
      unit: '°C',
      measured_at,
      source: draft.source,
      quality: draft.quality,
    }
  }
  return {
    client_record_id: clientRecordId,
    metric: draft.metric,
    systolic: positiveNumber(draft.systolic, 'Systolic pressure'),
    diastolic: positiveNumber(draft.diastolic, 'Diastolic pressure'),
    unit: 'mmHg',
    measured_at,
    source: draft.source,
    quality: draft.quality,
  }
}

export function idempotencyFingerprint(profileId: string, request: NewRecordPayload): string {
  const payload = Object.fromEntries(
    Object.entries(request).filter(([key]) => key !== 'client_record_id'),
  )
  return JSON.stringify([profileId, payload])
}

export class SubmissionGate {
  private active = false

  get isActive(): boolean {
    return this.active
  }

  async run<T>(action: () => Promise<T>): Promise<{ accepted: false } | { accepted: true; value: T }> {
    if (this.active) return { accepted: false }
    this.active = true
    try {
      return { accepted: true, value: await action() }
    } finally {
      this.active = false
    }
  }
}
