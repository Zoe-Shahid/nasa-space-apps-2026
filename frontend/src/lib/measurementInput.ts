import type { MeasurementCategory, MeasurementInput } from '../data/measurementsApi'

export interface MeasurementDraft {
  category: MeasurementCategory
  value: string
  systolic: string
  diastolic: string
  unit: string
  measuredAt: string
  note: string
}

const DECIMAL = /^(?:\d+(?:\.\d*)?|\.\d+)$/

function positiveDecimal(value: string, label: string): string {
  if (value.length > 64 || !DECIMAL.test(value) || !/[1-9]/.test(value)) {
    throw new Error(`${label} must be a positive finite decimal.`)
  }
  return value
}

function localTimestamp(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid measurement date and time.')
  const [day, time] = value.split('T')
  const [year, month, date] = day.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const instant = new Date(year, month - 1, date, hour, minute)
  if (
    instant.getFullYear() !== year || instant.getMonth() !== month - 1 || instant.getDate() !== date ||
    instant.getHours() !== hour || instant.getMinutes() !== minute
  ) throw new Error('Enter a valid measurement date and time.')
  const eastMinutes = -instant.getTimezoneOffset()
  const sign = eastMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(eastMinutes)
  const offset = `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
  return `${value}:00${offset}`
}

export function buildMeasurementInput(draft: MeasurementDraft, clientRecordId: string): MeasurementInput {
  if (!draft.measuredAt) throw new Error('Enter a measurement date and time.')
  if (draft.note.length > 2000) throw new Error('The private note must be 2,000 characters or fewer.')
  const common = {
    client_record_id: clientRecordId,
    category: draft.category,
    unit: draft.unit,
    measured_at: localTimestamp(draft.measuredAt),
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(draft.note ? { note: draft.note } : {}),
  }
  if (draft.category === 'blood_pressure') {
    if (draft.unit !== 'mmHg') throw new Error('Blood pressure unit must be mmHg.')
    return {
      ...common,
      systolic: positiveDecimal(draft.systolic, 'Systolic value'),
      diastolic: positiveDecimal(draft.diastolic, 'Diastolic value'),
    }
  }
  const validUnits: Record<Exclude<MeasurementCategory, 'blood_pressure'>, string[]> = {
    heart_rate: ['bpm'],
    body_temperature: ['°C', '°F'],
    blood_glucose: ['mg/dL', 'mmol/L'],
    sleep_duration: ['h', 'min'],
  }
  if (!validUnits[draft.category].includes(draft.unit)) throw new Error('Choose a supported unit for this category.')
  return { ...common, value: positiveDecimal(draft.value, 'Value') }
}