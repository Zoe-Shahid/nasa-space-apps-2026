import { describe, expect, it } from 'vitest'
import { ADD_DATA_DOMAINS } from './addDataDomains'

describe('Add Data health-domain navigation', () => {
  it('lists the six requested categories in order', () => {
    expect(ADD_DATA_DOMAINS.map(({ label }) => label)).toEqual([
      'Cardiovascular',
      'Sleep/Fatigue',
      'Psychological',
      'Bone/Muscle',
      'Immune',
      'Radiation',
    ])
  })
})
