import type {
  BloodPressureDto,
  BodyTemperatureDto,
  HeartRateDto,
  ObservationCreateResultDto,
  ObservationDto,
  ProfileDto,
  SleepCreateResultDto,
  SleepRecordDto,
} from '../types/api'
import type {
  BloodPressureViewModel,
  BodyTemperatureViewModel,
  HeartRateViewModel,
  ObservationViewModel,
  ProfileViewModel,
  ObservationCreateResultViewModel,
  SleepRecordViewModel,
  SleepCreateResultViewModel,
} from '../types/profiles'

export function mapProfile(dto: ProfileDto): ProfileViewModel {
  return {
    id: dto.id,
    displayName: dto.display_name,
    isSynthetic: dto.is_synthetic,
  }
}

function mapHeartRate(dto: HeartRateDto): HeartRateViewModel {
  return {
    id: dto.id,
    profileId: dto.profile_id,
    clientRecordId: dto.client_record_id,
    metric: dto.metric,
    value: dto.value,
    unit: dto.unit,
    measuredAt: dto.measured_at,
    source: dto.source,
    quality: dto.quality,
    isSynthetic: dto.is_synthetic,
    createdAt: dto.created_at,
  }
}

function mapBloodPressure(dto: BloodPressureDto): BloodPressureViewModel {
  return {
    id: dto.id,
    profileId: dto.profile_id,
    clientRecordId: dto.client_record_id,
    metric: dto.metric,
    systolic: dto.systolic,
    diastolic: dto.diastolic,
    unit: dto.unit,
    measuredAt: dto.measured_at,
    source: dto.source,
    quality: dto.quality,
    isSynthetic: dto.is_synthetic,
    createdAt: dto.created_at,
  }
}

function mapBodyTemperature(dto: BodyTemperatureDto): BodyTemperatureViewModel {
  return {
    id: dto.id,
    profileId: dto.profile_id,
    clientRecordId: dto.client_record_id,
    metric: dto.metric,
    value: dto.value,
    unit: dto.unit,
    measuredAt: dto.measured_at,
    source: dto.source,
    quality: dto.quality,
    isSynthetic: dto.is_synthetic,
    createdAt: dto.created_at,
  }
}

function mapObservationFields(
  dto: ObservationDto | ObservationCreateResultDto,
): ObservationViewModel {
  if (dto.metric === 'heart_rate') return mapHeartRate(dto)
  if (dto.metric === 'blood_pressure') return mapBloodPressure(dto)
  return mapBodyTemperature(dto)
}

export function mapObservation(
  dto: ObservationCreateResultDto,
): ObservationCreateResultViewModel
export function mapObservation(
  dto: ObservationDto,
): ObservationViewModel
export function mapObservation(
  dto: ObservationDto | ObservationCreateResultDto,
): ObservationViewModel | ObservationCreateResultViewModel {
  const mapped = mapObservationFields(dto)
  return 'replayed' in dto ? { ...mapped, replayed: dto.replayed } : mapped
}

function mapSleepRecordFields(dto: SleepRecordDto | SleepCreateResultDto): SleepRecordViewModel {
  return {
    id: dto.id,
    profileId: dto.profile_id,
    clientRecordId: dto.client_record_id,
    durationMinutes: dto.duration_minutes,
    reportingDate: dto.reporting_date,
    includesNaps: dto.includes_naps,
    source: dto.source,
    quality: dto.quality,
    isSynthetic: dto.is_synthetic,
    createdAt: dto.created_at,
  }
}

export function mapSleepRecord(
  dto: SleepCreateResultDto,
): SleepCreateResultViewModel
export function mapSleepRecord(
  dto: SleepRecordDto,
): SleepRecordViewModel
export function mapSleepRecord(
  dto: SleepRecordDto | SleepCreateResultDto,
): SleepRecordViewModel | SleepCreateResultViewModel {
  const mapped = mapSleepRecordFields(dto)
  return 'replayed' in dto ? { ...mapped, replayed: dto.replayed } : mapped
}
