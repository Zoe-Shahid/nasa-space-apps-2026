import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BackendNotConnected } from './BackendNotConnected'

describe('BackendNotConnected', () => {
  it('explains unavailable data without implying an alternate data source', () => {
    const markup = renderToStaticMarkup(createElement(BackendNotConnected, { what: 'the overview' }))

    expect(markup).toContain('Unavailable in this MVP')
    expect(markup).toContain('the overview')
    expect(markup).toContain('no active data connection')
    expect(markup).not.toMatch(/demo|fixture/i)
  })
})
