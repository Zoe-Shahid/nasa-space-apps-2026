import { describe, expect, it } from 'vitest'
import type { AssessmentDetail } from '../types/assessment'
import { domainRows, initialDomain } from './assessmentModel'
import { DOMAINS, domainFullLabel, domainMeta, sameDomain } from './domains'

describe('canonical domain presentation', () => {
  it('uses exactly the canonical domain identifiers as the domain keys', () => {
    expect(DOMAINS.map((domain) => domain.key)).toEqual([
      'cardiovascular',
      'sleep_fatigue',
      'psychological',
      'musculoskeletal',
      'immune',
      'radiation',
    ])
  })

  it('presents all six research domains with their full names', () => {
    expect(DOMAINS.map((domain) => domain.fullLabel)).toEqual([
      'Cardiovascular',
      'Sleep and Fatigue',
      'Psychological Wellbeing',
      'Bone and Muscle',
      'Immune and Infection Concerns',
      'Radiation Exposure',
    ])
  })

  it('recognizes legacy presentation keys as aliases to canonical IDs', () => {
    expect(domainMeta('sleep')?.key).toBe('sleep_fatigue')
    expect(domainMeta('wellbeing')?.key).toBe('psychological')
    expect(domainMeta('bone_muscle')?.key).toBe('musculoskeletal')
    expect(sameDomain('sleep_fatigue', 'sleep')).toBe(true)
    expect(domainFullLabel('psychological')).toBe('Psychological Wellbeing')
    expect(initialDomain('musculoskeletal')).toBe('musculoskeletal')
    expect(initialDomain('bone_muscle')).toBe('musculoskeletal')
  })

  it('associates the required domain names with existing assessment details', () => {
    const assessment: AssessmentDetail = {
      astronaut: { id: 'test-profile', displayName: 'Test Profile' },
      evaluatedAt: '2026-10-31T12:00:00Z',
      overallStatus: 'attention',
      overallCoverage: 'partial',
      domains: [{ domain: 'sleep_fatigue', status: 'attention', coverage: 'partial' }],
    }

    expect(domainRows(assessment).find((row) => row.meta.key === 'sleep_fatigue')?.detail?.status).toBe('attention')
  })

  it('does not treat an unknown domain as a supported one', () => {
    expect(domainMeta('unknown')).toBeUndefined()
    expect(domainFullLabel('unknown')).toBe('Unsupported domain')
    expect(sameDomain('unknown', 'sleep_fatigue')).toBe(false)
  })
})
