export interface ProfileViewModel {
  id: string
  displayName: string
  isSynthetic: true
}

interface ObservationViewModelBase {
  id: string
  profileId: string
  clientRecordId: string
  measuredAt: string
  source: 'manual' | 'simulated_device'
  quality: 'valid' | 'suspect' | 'invalid'
  isSynthetic: true
  createdAt: string
  replayed?: boolean
}

export interface HeartRateViewModel extends ObservationViewModelBase {
  metric: 'heart_rate'
  value: number
  unit: 'bpm'
}

export interface BloodPressureViewModel extends ObservationViewModelBase {
  metric: 'blood_pressure'
  systolic: number
  diastolic: number
  unit: 'mmHg'
}

export interface BodyTemperatureViewModel extends ObservationViewModelBase {
  metric: 'body_temperature'
  value: number
  unit: '°C'
}

export type ObservationViewModel =
  | HeartRateViewModel
  | BloodPressureViewModel
  | BodyTemperatureViewModel
export type ObservationCreateResultViewModel = ObservationViewModel & { replayed: boolean }

export interface ObservationCollectionViewModel {
  items: ObservationViewModel[]
  limit: number
  offset: number
}

export interface SleepRecordViewModel {
  id: string
  profileId: string
  clientRecordId: string
  durationMinutes: number
  reportingDate: string
  includesNaps: boolean
  source: 'manual' | 'simulated_device'
  quality: 'valid' | 'suspect' | 'invalid'
  isSynthetic: true
  createdAt: string
  replayed?: boolean
}

export interface SleepCollectionViewModel {
  items: SleepRecordViewModel[]
  limit: number
  offset: number
}

export type SleepCreateResultViewModel = SleepRecordViewModel & { replayed: boolean }
