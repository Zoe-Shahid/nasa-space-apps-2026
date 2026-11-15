import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Header } from '../components/shell/Header'
import { AuthProvider } from '../lib/AuthContext'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  it('renders account sign-in and registration controls without demo credentials', () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(LoginPage))))

    expect(markup).toContain('Sign in')
    expect(markup).toContain('Email')
    expect(markup).toContain('Password')
    expect(markup).toContain('Create a new account')
    expect(markup).not.toMatch(/open the demo|demo reviewer|synthetic fixture/i)
    expect(markup).toMatch(/<form|<input|type="password"/i)
  })

  it('offers sign-in from the landing header', () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(Header, { variant: 'landing' }))),
    )

    expect(markup).toContain('Sign in')
  })
})
