import { describe, expect, it } from 'vitest'
import type { AssessmentSummary, LatestReadings } from '../types/overview'
import { overviewDomainCards } from './overviewDomainCards'

const noReadings: LatestReadings = {
  heartRate: null,
  bloodPressure: null,
  temperature: null,
  sleepTotal: null,
}

const assessment: AssessmentSummary = {
  evaluatedAt: '2026-10-31T12:00:00Z',
  overallStatus: 'attention',
  overallCoverage: 'partial',
  unresolvedConcerns: [],
  domains: [
    { domain: 'cardiovascular', status: 'normal', coverage: 'complete', explanation: '', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
    { domain: 'sleep_fatigue', status: 'normal', coverage: 'complete', explanation: '', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
    { domain: 'psychological', status: 'attention', coverage: 'partial', explanation: 'PRIVATE CHECK-IN NOTE', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
    { domain: 'musculoskeletal', status: 'attention', coverage: 'partial', explanation: '', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
    { domain: 'immune', status: 'normal', coverage: 'complete', explanation: '', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
    { domain: 'radiation', status: 'insufficient_data', coverage: 'missing', explanation: '', ruleIds: [], latestRecordAt: null, nextReviewStep: null },
  ],
}

describe('overview domain cards', () => {
  it('builds one card per domain using assessment status and separate coverage', () => {
    const cards = overviewDomainCards(assessment, noReadings)

    expect(cards).toHaveLength(6)
    expect(cards.map(({ label }) => label)).toEqual([
      'Cardiovascular',
      'Sleep and Fatigue',
      'Psychological Wellbeing',
      'Bone and Muscle',
      'Immune and Infection Concerns',
      'Radiation Exposure',
    ])
    expect(cards[0]).toMatchObject({ status: 'normal', coverage: 'complete' })
    expect(cards.map(({ key }) => key)).toEqual([
      'cardiovascular',
      'sleep_fatigue',
      'psychological',
      'musculoskeletal',
      'immune',
      'radiation',
    ])
    expect(cards[3]).toMatchObject({ status: 'attention', coverage: 'partial' })
    expect(cards[5]).toMatchObject({ status: 'insufficient_data', coverage: 'missing' })
  })

  it('includes only overview readings and their backend timestamps for supported domains', () => {
    const readings: LatestReadings = {
      heartRate: { value: 72, unit: 'bpm', recordedAt: '2026-10-31T11:00:00Z' },
      bloodPressure: { systolic: 120, diastolic: 80, unit: 'mmHg', recordedAt: '2026-10-31T10:00:00Z' },
      temperature: null,
      sleepTotal: { totalHours: 7, unit: 'h', reportingDate: '2026-10-31', recordedAt: '2026-10-31T07:00:00Z', includesNaps: null },
    }
    const cards = overviewDomainCards(assessment, readings)

    expect(cards[0].readings).toEqual([
      { label: 'Heart rate', value: '72 bpm', recordedAt: '2026-10-31T11:00:00Z' },
      { label: 'Blood pressure', value: '120/80 mmHg', recordedAt: '2026-10-31T10:00:00Z' },
    ])
    expect(cards[1].readings).toEqual([{ label: 'Sleep total', value: '7 h', recordedAt: '2026-10-31T07:00:00Z' }])
    expect(cards.slice(2).every((card) => card.readings.length === 0)).toBe(true)
  })

  it('keeps unreported status and coverage distinct and hides wellbeing details', () => {
    const cards = overviewDomainCards(assessment, noReadings)

    expect(cards[0].status).toBe('normal')
    expect(cards[2]).toMatchObject({ privateDetailsHidden: true, assessmentDetail: null })
    expect(JSON.stringify(cards)).not.toContain('PRIVATE CHECK-IN NOTE')

    const emptyCards = overviewDomainCards(null, noReadings)
    expect(emptyCards.every((card) => card.status === null && card.coverage === null)).toBe(true)
    expect(emptyCards[3].assessmentDetail).toBeNull()
  })
})
