import { describe, expect, it } from 'vitest'
import { parseCoverage, parseStatus } from './status'

describe('status and coverage parsing', () => {
  it('accepts canonical lowercase API values', () => {
    expect(parseStatus('insufficient_data')).toBe('insufficient_data')
    expect(parseCoverage('partial')).toBe('partial')
  })
  it('never maps unknown values to normal', () => {
    expect(parseStatus('ok')).toBeNull()
    expect(parseStatus('Normal')).toBeNull()
    expect(parseStatus(undefined)).toBeNull()
    expect(parseCoverage('full')).toBeNull()
  })
})
