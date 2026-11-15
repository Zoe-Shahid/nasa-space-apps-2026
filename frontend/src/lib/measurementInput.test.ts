import { describe, expect, it } from 'vitest'
import { buildMeasurementInput, type MeasurementDraft } from './measurementInput'

const base: MeasurementDraft = {
  category: 'heart_rate', value: '72.500', systolic: '', diastolic: '', unit: 'bpm',
  measuredAt: '2026-11-14T12:30', note: '',
}

describe('buildMeasurementInput', () => {
  it('preserves values, units, local timestamp offsets, and timezone for all categories', () => {
    const drafts: MeasurementDraft[] = [
      base,
      { ...base, category: 'blood_pressure', value: '', systolic: '120.0', diastolic: '80.25', unit: 'mmHg' },
      { ...base, category: 'body_temperature', value: '98.60', unit: '°F' },
      { ...base, category: 'blood_glucose', value: '5.75', unit: 'mmol/L' },
      { ...base, category: 'sleep_duration', value: '7.5', unit: 'h' },
    ]
    const inputs = drafts.map((draft) => buildMeasurementInput(draft, '22222222-2222-4222-8222-222222222222'))
    expect(inputs.map((input) => input.category)).toEqual([
      'heart_rate', 'blood_pressure', 'body_temperature', 'blood_glucose', 'sleep_duration',
    ])
    expect(inputs.map((input) => input.unit)).toEqual(['bpm', 'mmHg', '°F', 'mmol/L', 'h'])
    expect(inputs[0].value).toBe('72.500')
    expect(inputs[1]).toMatchObject({ systolic: '120.0', diastolic: '80.25' })
    expect(inputs[0].measured_at).toMatch(/^2026-11-14T12:30:00[+-]\d\d:\d\d$/)
    expect(inputs[0].time_zone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('rejects malformed, zero, incomplete, and unit-incompatible drafts', () => {
    expect(() => buildMeasurementInput({ ...base, value: '0' }, 'key')).toThrow('positive finite decimal')
    expect(() => buildMeasurementInput({ ...base, value: '1e3' }, 'key')).toThrow('positive finite decimal')
    expect(() => buildMeasurementInput({ ...base, category: 'blood_pressure', unit: 'mmHg', systolic: '120' }, 'key')).toThrow('positive finite decimal')
    expect(() => buildMeasurementInput({ ...base, unit: 'beats/min' }, 'key')).toThrow('supported unit')
    expect(() => buildMeasurementInput({ ...base, measuredAt: '2026-02-31T12:30' }, 'key')).toThrow('valid measurement date')
  })
})