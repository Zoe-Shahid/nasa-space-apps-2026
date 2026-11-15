import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './common'
import { liveHealthApi } from './healthApi'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('health API adapter', () => {
  it('uses the configured API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test/')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await liveHealthApi.health()
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/health')
  })

  it('calls the contract liveness route and validates its response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveHealthApi.health(undefined)).resolves.toEqual({ status: 'ok' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/health')
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-Request-ID')).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('calls the readiness route and validates the documented schema', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ready', database: 'available' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveHealthApi.readiness(undefined)).resolves.toEqual({ status: 'ready', database: 'available' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/ready')
  })

  it('rejects unexpected health payloads', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"status":"healthy"}', { status: 200 })))

    await expect(liveHealthApi.health(undefined)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'server',
    } satisfies Partial<ApiError>)
  })
})
