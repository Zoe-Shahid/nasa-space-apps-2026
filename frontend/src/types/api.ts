/** Wire DTOs aligned to the generated backend OpenAPI document and approved local MVP addendum. */
export type UuidDto = string

export type RecordSourceDto = 'manual' | 'simulated_device'
export type RecordQualityDto = 'valid' | 'suspect' | 'invalid'

export interface PaginationQueryDto {
  limit?: number
  offset?: number
}

export interface ProfileDto {
  id: UuidDto
  display_name: string
  is_synthetic: true
}

export interface ProfileCollectionDto {
  items: ProfileDto[]
  limit: number
  offset: number
}

interface ObservationCreateBaseDto {
  client_record_id: UuidDto
  measured_at: string
  source: RecordSourceDto
  quality: RecordQualityDto
}

export interface HeartRateCreateDto extends ObservationCreateBaseDto {
  metric: 'heart_rate'
  value: number
  unit: 'bpm'
}

export interface BloodPressureCreateDto extends ObservationCreateBaseDto {
  metric: 'blood_pressure'
  systolic: number
  diastolic: number
  unit: 'mmHg'
}

export interface BodyTemperatureCreateDto extends ObservationCreateBaseDto {
  metric: 'body_temperature'
  value: number
  unit: '°C'
}

export type ObservationCreateDto =
  | HeartRateCreateDto
  | BloodPressureCreateDto
  | BodyTemperatureCreateDto

interface ObservationResponseBaseDto {
  id: UuidDto
  profile_id: UuidDto
  client_record_id: UuidDto
  measured_at: string
  source: RecordSourceDto
  quality: RecordQualityDto
  is_synthetic: true
  created_at: string
}

export interface HeartRateDto extends ObservationResponseBaseDto {
  metric: 'heart_rate'
  value: number
  unit: 'bpm'
}

export interface BloodPressureDto extends ObservationResponseBaseDto {
  metric: 'blood_pressure'
  systolic: number
  diastolic: number
  unit: 'mmHg'
}

export interface BodyTemperatureDto extends ObservationResponseBaseDto {
  metric: 'body_temperature'
  value: number
  unit: '°C'
}

export type ObservationDto = HeartRateDto | BloodPressureDto | BodyTemperatureDto

export type ObservationCreateResultDto =
  | (HeartRateDto & { replayed: boolean })
  | (BloodPressureDto & { replayed: boolean })
  | (BodyTemperatureDto & { replayed: boolean })

export interface ObservationCollectionDto {
  items: ObservationDto[]
  limit: number
  offset: number
}

export interface SleepCreateDto {
  client_record_id: UuidDto
  duration_minutes: number
  reporting_date: string
  includes_naps: boolean
  source: RecordSourceDto
  quality: RecordQualityDto
}

export interface SleepRecordDto {
  id: UuidDto
  profile_id: UuidDto
  client_record_id: UuidDto
  duration_minutes: number
  reporting_date: string
  includes_naps: boolean
  source: RecordSourceDto
  quality: RecordQualityDto
  is_synthetic: true
  created_at: string
}

export type SleepCreateResultDto = SleepRecordDto & { replayed: boolean }

export interface SleepCollectionDto {
  items: SleepRecordDto[]
  limit: number
  offset: number
}

export interface ValidationFieldErrorDto {
  field: string
  code: string
  message: string
}

export interface ProblemDetailsDto {
  type: string
  title: string
  status: number
  detail: string
  request_id: UuidDto
  errors?: ValidationFieldErrorDto[]
}

export interface HealthResponseDto {
  status: 'ok'
}

export interface ReadinessResponseDto {
  status: 'ready'
  database: 'available'
}
