import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PrototypeNotice } from './PrototypeNotice'

describe('PrototypeNotice', () => {
  it('distinguishes actual account, synthetic demo, and public states', () => {
    expect(renderToStaticMarkup(createElement(PrototypeNotice, { mode: 'actual' }))).toContain('Actual account')
    const demo = renderToStaticMarkup(createElement(PrototypeNotice, { mode: 'synthetic' }))
    expect(demo).toContain('Synthetic demo')
    expect(demo).toContain('never saved to your actual account')
    expect(renderToStaticMarkup(createElement(PrototypeNotice, { mode: 'public' }))).toContain('not endorsed by NASA')
  })
})
