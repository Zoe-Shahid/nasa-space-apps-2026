// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { measurementsApi } from './measurementsApi'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  document.cookie = 'astroorbitx_csrf=; Max-Age=0; Path=/'
})

describe('measurementsApi authentication transport', () => {
  it('uses the configured backend origin, includes cookies, and attaches CSRF to a create', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    document.cookie = 'astroorbitx_csrf=csrf-test-value; Path=/'
    const response = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      category: 'heart_rate',
      value: '72.50',
      unit: 'bpm',
      measured_at: '2026-11-14T12:30:00+05:00',
      source: 'manual',
      is_synthetic: false,
      created_at: '2026-11-14T07:31:00Z',
      updated_at: '2026-11-14T07:31:00Z',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await measurementsApi.create({
      client_record_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      category: 'heart_rate',
      value: '72.50',
      unit: 'bpm',
      measured_at: '2026-11-14T12:30:00+05:00',
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:8000/api/v1/me/measurements')
    expect(options.credentials).toBe('include')
    expect(new Headers(options.headers).get('X-CSRF-Token')).toBe('csrf-test-value')
    expect(JSON.parse(String(options.body))).not.toHaveProperty('user_id')
  })

  it('uses the owner-scoped collection and includes session cookies on reads', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], limit: 50, offset: 0 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await measurementsApi.list({ category: 'heart_rate' })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('http://127.0.0.1:8000/api/v1/me/measurements?')
    expect(url).toContain('category=heart_rate')
    expect(options.credentials).toBe('include')
  })
})