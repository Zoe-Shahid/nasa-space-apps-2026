// @vitest-environment jsdom
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AssessmentPage from './AssessmentPage'

describe('AssessmentPage', () => {
  it('shows all systems as not evaluated and does not render assessment statuses', () => {
    const { container } = render(createElement(MemoryRouter, null, createElement(AssessmentPage)))
    expect(container.textContent).toContain('No assessment rules or assessment API are available')
    expect(container.querySelectorAll('.ao-assess__unavailable-row .ao-badge')).toHaveLength(6)
    expect(container.querySelector('.ao-badge--normal, .ao-badge--attention, .ao-badge--urgent, .ao-badge--insufficient_data')).toBeNull()
  })
})