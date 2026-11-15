import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { REFERENCES, RESEARCH_AREAS } from './guidance'
import GuidancePage from '../pages/GuidancePage'

describe('mission health guidance', () => {
  it('covers the six requested domains with explanation, mission relevance, monitoring, limits, and references', () => {
    expect(RESEARCH_AREAS.map((area) => area.title)).toEqual([
      'Cardiovascular',
      'Sleep and Fatigue',
      'Psychological Wellbeing',
      'Bone and Muscle',
      'Immune and Infection Concerns',
      'Radiation Exposure',
    ])

    for (const area of RESEARCH_AREAS) {
      expect(area.explanation.trim()).not.toBe('')
      expect(area.whyItMatters.trim()).not.toBe('')
      expect(area.monitors.trim()).not.toBe('')
      expect(area.cannotEstablish.trim()).not.toBe('')
      expect(area.refs.length).toBeGreaterThan(0)
      expect(area.refs.every((id) => REFERENCES.some((reference) => reference.id === id))).toBe(true)
    }
  })

  it('distinguishes supported manual records from unavailable integrations and assessments', () => {
    expect(RESEARCH_AREAS.find((area) => area.id === 'radiation')?.monitors).toContain('not supported')
    expect(RESEARCH_AREAS.find((area) => area.id === 'wellbeing')?.monitors).toContain('not supported')
    expect(RESEARCH_AREAS.find((area) => area.id === 'immune')?.cannotEstablish).toContain('cannot confirm infection or measure immune function')
    expect(RESEARCH_AREAS.find((area) => area.id === 'bone-muscle')?.cannotEstablish).toContain('does not measure bone density')
    expect(RESEARCH_AREAS.find((area) => area.id === 'cardiovascular')?.monitors).toContain('are supported')
    expect(RESEARCH_AREAS.find((area) => area.id === 'immune')?.monitors).toContain('Manual body-temperature observations are supported')
    expect(RESEARCH_AREAS.find((area) => area.id === 'bone-muscle')?.monitors).toContain('not supported')
  })

  it('states that assessment and numerical rules are unavailable', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(GuidancePage)),
    )

    expect(markup).toContain('Assessment and numerical rules are not implemented')
    expect(markup).toContain('the app does not calculate them')
    expect(markup).not.toContain('student-prototype parameters')
  })
})
