// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CrewPage from './CrewPage'
import CrewProfilePage from './CrewProfilePage'
import AddDataPage from './AddDataPage'

const profileId = '11111111-1111-4111-8111-111111111111'
const recordId = '22222222-2222-4222-8222-222222222222'
const requestId = '33333333-3333-4333-8333-333333333333'

const profile = {
  id: profileId,
  display_name: 'Synthetic profile',
  is_synthetic: true,
}

const emptyCollection = { items: [], limit: 100, offset: 0 }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'X-Request-ID': requestId,
    },
  })
}

function profilesPage() {
  return jsonResponse({ items: [profile], limit: 100, offset: 0 })
}

function wrapper(path: string, element: ReactElement) {
  return createElement(
    MemoryRouter,
    { initialEntries: [path] },
    createElement(Routes, null, createElement(Route, { path, element })),
  )
}

function profileDetailWrapper(element: ReactElement) {
  return createElement(
    MemoryRouter,
    { initialEntries: [`/crew/${profileId}`] },
    createElement(Routes, null, createElement(Route, { path: '/crew/:profileId', element })),
  )
}

function setApi() {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
}

function submitHeartRate() {
  fireEvent.change(screen.getByLabelText('Synthetic profile'), { target: { value: profileId } })
  fireEvent.change(screen.getByLabelText('Record type'), { target: { value: 'heart_rate' } })
  fireEvent.change(screen.getByLabelText('Heart rate'), { target: { value: '72' } })
  fireEvent.change(screen.getByLabelText('Measured at (your local time)'), {
    target: { value: '2026-11-14T12:30' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save synthetic record' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('connected synthetic product screens', () => {
  it('shows profile loading then an honest empty state', async () => {
    setApi()
    let resolveFetch!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve })))
    render(wrapper('/crew', createElement(CrewPage)))

    expect(screen.getByRole('status').textContent).toContain('Loading local synthetic profiles')
    await act(async () => resolveFetch(jsonResponse(emptyCollection)))
    expect(await screen.findByText('No profiles provisioned')).toBeTruthy()
    expect(screen.getByText(/workspace starts empty/i)).toBeTruthy()
  })

  it('renders only the backend profile list and explicitly permits no profile mutation', async () => {
    setApi()
    const fetchMock = vi.fn().mockResolvedValue(profilesPage())
    vi.stubGlobal('fetch', fetchMock)
    render(wrapper('/crew', createElement(CrewPage)))

    expect(await screen.findByText('Synthetic profile')).toBeTruthy()
    expect(screen.getByText(/no profile mutation API is available/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Profile details for Synthetic profile' }).getAttribute('href')).toBe(`/crew/${profileId}`)
    expect(screen.queryByText(/psychological|support request|diagnosis/i)).toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://127.0.0.1:8000/api/v1/profiles?limit=100&offset=0',
    )
  })

  it('loads one profile with its two supported collections and renders empty record states', async () => {
    setApi()
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith(`/profiles/${profileId}`)) return Promise.resolve(jsonResponse(profile))
      if (path.endsWith('/observations?limit=100&offset=0')) return Promise.resolve(jsonResponse(emptyCollection))
      if (path.endsWith('/sleep-records?limit=100&offset=0')) return Promise.resolve(jsonResponse(emptyCollection))
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(profileDetailWrapper(createElement(CrewProfilePage)))

    expect(await screen.findByRole('heading', { name: 'Synthetic profile' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add supported data' }).getAttribute('href')).toBe(`/demo/add-data?profileId=${profileId}`)
    expect(screen.getByText('No vital observations')).toBeTruthy()
    expect(screen.getByText('No sleep-duration records')).toBeTruthy()
    expect(screen.getByText(/No combined history, assessments, trends/i)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('validates input shape locally and reports backend validation rejection without retry', async () => {
    setApi()
    const fetchMock = vi.fn().mockResolvedValue(profilesPage())
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(AddDataPage))
    await screen.findByLabelText('Synthetic profile')

    fireEvent.change(screen.getByLabelText('Synthetic profile'), { target: { value: profileId } })
    fireEvent.change(screen.getByLabelText('Record type'), { target: { value: 'heart_rate' } })
    fireEvent.change(screen.getByLabelText('Heart rate'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Measured at (your local time)'), {
      target: { value: '2026-11-14T12:30' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Save synthetic record' }).closest('form')!)
    expect(await screen.findByText('Heart rate must be a positive finite number.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('submits the exact supported vital payload and shows saved only on backend confirmation', async () => {
    setApi()
    const created = {
      id: recordId,
      profile_id: profileId,
      client_record_id: '44444444-4444-4444-8444-444444444444',
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measured_at: '2026-11-14T12:30:00Z',
      source: 'manual',
      quality: 'valid',
      is_synthetic: true,
      created_at: '2026-11-14T12:31:00Z',
      replayed: false,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(profilesPage())
      .mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => {
        const requestBody = JSON.parse(String(init?.body)) as {
          client_record_id: string
          measured_at: string
        }
        return Promise.resolve(jsonResponse({
          ...created,
          client_record_id: requestBody.client_record_id,
          measured_at: requestBody.measured_at,
        }, 201))
      })
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(AddDataPage))
    await screen.findByLabelText('Synthetic profile')
    submitHeartRate()

    expect(await screen.findByText('Synthetic record persisted')).toBeTruthy()
    const [url, options] = fetchMock.mock.calls[1]
    expect(url).toBe(`http://127.0.0.1:8000/api/v1/profiles/${profileId}/observations`)
    expect(options.method).toBe('POST')
    const postedBody = JSON.parse(options.body)
    expect(postedBody).toEqual({
      client_record_id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measured_at: '2026-11-14T07:30:00.000Z',
      source: 'manual',
      quality: 'valid',
    })
  })

  it('shows backend validation failure without treating it as saved or offering retry', async () => {
    setApi()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(profilesPage())
      .mockResolvedValueOnce(new Response(JSON.stringify({
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Request validation failed.',
        request_id: requestId,
        errors: [{ field: 'body.value', code: 'greater_than', message: 'Invalid value.' }],
      }), {
        status: 422,
        headers: { 'content-type': 'application/problem+json', 'X-Request-ID': requestId },
      }))
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(AddDataPage))
    await screen.findByLabelText('Synthetic profile')
    submitHeartRate()

    expect(await screen.findByText('The server rejected this record. No saved confirmation was received.')).toBeTruthy()
    expect(screen.getByText('Request validation failed.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
    expect(screen.queryByText('Synthetic record persisted')).toBeNull()
  })

  it('reports an unknown POST outcome and retries only the unchanged idempotent request', async () => {
    setApi()
    const replayed = {
      id: recordId,
      profile_id: profileId,
      client_record_id: '55555555-5555-4555-8555-555555555555',
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
      measured_at: '2026-11-14T12:30:00Z',
      source: 'manual',
      quality: 'valid',
      is_synthetic: true,
      created_at: '2026-11-14T12:31:00Z',
      replayed: true,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(profilesPage())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => {
        const requestBody = JSON.parse(String(init?.body)) as { client_record_id: string }
        return Promise.resolve(jsonResponse({ ...replayed, client_record_id: requestBody.client_record_id }, 200))
      })
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(AddDataPage))
    await screen.findByLabelText('Synthetic profile')
    submitHeartRate()

    expect(await screen.findByText('Save outcome unknown')).toBeTruthy()
    expect(screen.getByText(/may have saved this record/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry unchanged submission' }))
    expect(await screen.findByText('Previously saved synthetic record confirmed')).toBeTruthy()

    const firstPost = fetchMock.mock.calls[1]
    const replayPost = fetchMock.mock.calls[2]
    expect(firstPost[0]).toBe(replayPost[0])
    expect(JSON.parse(firstPost[1].body)).toEqual(JSON.parse(replayPost[1].body))
    expect(JSON.parse(firstPost[1].body).client_record_id).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('shows excluded product pages as unavailable with the scope reason', async () => {
    const { BackendNotConnected } = await import('../components/BackendNotConnected')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const markup = renderToStaticMarkup(createElement(BackendNotConnected, { what: 'assessment' }))
    expect(markup).toContain('Unavailable in this MVP')
    expect(markup).toContain('no active data connection')
    expect(markup).not.toMatch(/normal|attention|urgent|delivered|acknowledged/i)
  })
})
