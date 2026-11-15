import { describe, expect, it } from 'vitest'
import { ringStyleFor } from './overviewModel'

describe('ringStyleFor', () => {
  it('distinguishes unreported status from explicit insufficient data', () => {
    expect(ringStyleFor(null)).toBe('neutral')
    expect(ringStyleFor(undefined)).toBe('neutral')
    expect(ringStyleFor('insufficient_data')).toBe('dashed')
    expect(ringStyleFor('normal')).toBe('solid')
    expect(ringStyleFor('attention')).toBe('solid')
    expect(ringStyleFor('urgent')).toBe('solid')
  })
})