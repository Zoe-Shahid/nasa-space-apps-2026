import { describe, expect, it } from 'vitest'
import { CATEGORIES, toRowView } from './historyModel'

describe('history categories and privacy', () => {
  it('labels sleep/fatigue and psychological check-ins explicitly', () => {
    expect(CATEGORIES.find((category) => category.id === 'sleep')?.label).toBe('Sleep and Fatigue')
    expect(CATEGORIES.find((category) => category.id === 'checkins')?.label).toBe('Psychological check-ins')
    expect(CATEGORIES.find((category) => category.id === 'vitals')?.metrics).toContainEqual({ value: 'temperature', label: 'Temperature' })
    expect(CATEGORIES.map((category) => category.id)).toEqual(['vitals', 'sleep', 'checkins', 'support_requests', 'symptoms', 'exercise', 'radiation'])
  })

  it('hides check-in values and context in lists while retaining record time and available source', () => {
    const row = toRowView(
      {
        id: 'checkin-1',
        recordedAt: '2026-10-31T09:00:00Z',
        metricLabel: 'Daily check-in',
        display: 'Mood rating: 2',
        value: 2,
        unit: 'score',
        context: 'Private note',
        source: 'Self-reported',
      },
      'Psychological check-ins',
      true,
    )

    expect(row).toMatchObject({
      recordedAt: '2026-10-31T09:00:00Z',
      metric: 'Daily check-in',
      value: null,
      valueHidden: true,
      context: null,
      source: 'Self-reported',
    })
  })

  it('shows backend-supplied values and units for non-private measurement rows', () => {
    const row = toRowView(
      { id: 'temperature-1', recordedAt: '2026-10-31T10:10:00Z', metricLabel: 'Body temperature', value: 36.8, unit: '°C', source: 'Synthetic thermometer' },
      'Vitals',
    )

    expect(row.value).toBe('36.8 °C')
    expect(row.source).toBe('Synthetic thermometer')
  })
})
