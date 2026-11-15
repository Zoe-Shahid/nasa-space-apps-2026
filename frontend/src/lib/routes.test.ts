import { describe, expect, it } from 'vitest'
import { appModeForPath, titleForPath } from './routes'

describe('titleForPath', () => {
  it('uses the personal profile title', () => {
    expect(titleForPath('/profile')).toBe('My profile')
  })

  it('keeps known page titles and uses a fallback for unknown routes', () => {
    expect(titleForPath('/overview')).toBe('Overview')
    expect(titleForPath('/crew')).toBe('Crew')
    expect(titleForPath('/crew/11111111-1111-4111-8111-111111111111')).toBe('Crew profile')
    expect(titleForPath('/assessment')).toBe('Assessment')
    expect(titleForPath('/guidance')).toBe('Guidance and research')
    expect(titleForPath('/unknown')).toBe('AstroOrbitX')
  })
})

describe('appModeForPath', () => {
  it('keeps synthetic profiles and entry separate from actual account routes', () => {
    expect(appModeForPath('/', 'landing')).toBe('public')
    expect(appModeForPath('/overview', 'app')).toBe('actual')
    expect(appModeForPath('/profile', 'app')).toBe('actual')
    expect(appModeForPath('/crew', 'app')).toBe('synthetic')
    expect(appModeForPath('/crew/profile-id', 'app')).toBe('synthetic')
    expect(appModeForPath('/demo/add-data', 'app')).toBe('synthetic')
  })
})
