import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildRecordRequest, SubmissionGate, type RecordDraft } from '../lib/recordSubmission'
import AddDataPage, { RecordSaveStatus } from './AddDataPage'

const draft: RecordDraft = {
  metric: 'heart_rate',
  value: '72',
  systolic: '',
  diastolic: '',
  measuredAt: '2026-11-14T12:30',
  durationMinutes: '',
  reportingDate: '',
  includesNaps: '',
  source: 'manual',
  quality: 'valid',
}

describe('AddDataPage', () => {
  it('lists only supported forms and clearly marks unsupported categories', () => {
    const markup = renderToStaticMarkup(createElement(AddDataPage))
    for (const text of [
      'Add synthetic data',
      'Vital observations',
      'Sleep duration',
      'Psychological check-ins',
      'Symptoms and diagnoses',
      'Support requests',
      'Exercise and activity',
      'Radiation records',
      'Assessment and status',
      'Baselines and trends',
      'Alerts and combined timeline',
      'local-only',
      'Never enter real astronaut',
    ]) expect(markup).toContain(text)
    expect(markup).not.toMatch(/Record persisted|Successfully saved/i)
  })

  it('builds exact, unprefilled vital and sleep requests', () => {
    expect(buildRecordRequest('profile', draft, 'record-key')).toEqual({
      client_record_id: 'record-key',
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measured_at: new Date('2026-11-14T12:30').toISOString(),
      source: 'manual',
      quality: 'valid',
    })
    expect(buildRecordRequest('profile', {
      ...draft,
      metric: 'blood_pressure',
      value: '',
      systolic: '120',
      diastolic: '80',
    }, 'bp-key')).toEqual({
      client_record_id: 'bp-key',
      metric: 'blood_pressure',
      systolic: 120,
      diastolic: 80,
      unit: 'mmHg',
      measured_at: new Date('2026-11-14T12:30').toISOString(),
      source: 'manual',
      quality: 'valid',
    })
    expect(buildRecordRequest('profile', {
      ...draft,
      metric: 'body_temperature',
      value: '37',
    }, 'temp-key')).toMatchObject({
      client_record_id: 'temp-key',
      metric: 'body_temperature',
      value: 37,
      unit: '°C',
    })
    expect(buildRecordRequest('profile', {
      ...draft,
      metric: 'sleep_duration',
      durationMinutes: '420',
      reportingDate: '2026-11-14',
      includesNaps: 'false',
    }, 'sleep-key')).toEqual({
      client_record_id: 'sleep-key',
      duration_minutes: 420,
      reporting_date: '2026-11-14',
      includes_naps: false,
      source: 'manual',
      quality: 'valid',
    })
  })

  it('rejects invalid measurements and missing profile values before any request', () => {
    expect(() => buildRecordRequest('profile', { ...draft, value: '' }, 'record-key')).toThrow('positive finite number')
    expect(() => buildRecordRequest('', draft, 'record-key')).toThrow('Choose a synthetic profile')
    expect(() => buildRecordRequest('profile', {
      ...draft,
      metric: 'sleep_duration',
      durationMinutes: '3.5',
      reportingDate: '2026-02-31',
      includesNaps: 'false',
    }, 'sleep-key')).toThrow('positive whole number')
    expect(() => buildRecordRequest('profile', {
      ...draft,
      metric: 'sleep_duration',
      durationMinutes: '420',
      reportingDate: '2026-02-31',
      includesNaps: 'false',
    }, 'sleep-key')).toThrow('valid UTC reporting date')
  })

  it('renders saving, persisted, rejected, and unknown outcomes honestly', () => {
    const saving = renderToStaticMarkup(createElement(RecordSaveStatus, { status: { state: 'saving' } }))
    const saved = renderToStaticMarkup(createElement(RecordSaveStatus, { status: { state: 'saved', replayed: false } }))
    const rejected = renderToStaticMarkup(createElement(RecordSaveStatus, { status: { state: 'rejected' } }))
    const unknown = renderToStaticMarkup(createElement(RecordSaveStatus, { status: { state: 'unknown' } }))

    expect(saving).toContain('Saving to the local synthetic workspace')
    expect(saved).toContain('Synthetic record persisted')
    expect(saved).toContain('not real personal or health data')
    expect(rejected).toContain('server rejected this record')
    expect(unknown).toContain('outcome is unknown')
    expect(unknown).toContain('may have been saved')
  })

  it('blocks duplicate submissions while a request is unresolved', async () => {
    const gate = new SubmissionGate()
    let calls = 0
    let finish!: (value: string) => void
    const first = gate.run(() => {
      calls += 1
      return new Promise<string>((resolve) => { finish = resolve })
    })
    const duplicate = await gate.run(async () => {
      calls += 1
      return 'duplicate'
    })
    expect(duplicate).toEqual({ accepted: false })
    expect(calls).toBe(1)
    finish('persisted')
    await expect(first).resolves.toEqual({ accepted: true, value: 'persisted' })
    expect(gate.isActive).toBe(false)
  })
})
