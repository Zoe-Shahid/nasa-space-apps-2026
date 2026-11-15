import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, kindFromStatus } from './common'
import { classifyError } from './errors'
import { http } from './http'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const problemResponse = (status: number, body: unknown, requestId = 'c55be8a8-919c-4bd0-8d77-0400a16c649f') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json', 'X-Request-ID': requestId },
  })

describe('error kinds', () => {
  it('maps HTTP statuses', () => {
    expect([401, 403, 404, 422, 409, 500, 503, 418].map(kindFromStatus)).toEqual([
      'unauthorized',
      'forbidden',
      'not_found',
      'validation',
      'validation',
      'server',
      'server',
      'unknown',
    ])
  })

  it('only retries failures that may resolve on retry', () => {
    expect(classifyError(new ApiError('x', { status: 503 })).retryable).toBe(true)
    expect(classifyError(new ApiError('x', { kind: 'network' })).retryable).toBe(true)
    for (const status of [401, 403, 404, 422]) {
      expect(classifyError(new ApiError('x', { status })).retryable).toBe(false)
    }
  })

  it('classifies network and unknown failures safely', () => {
    expect(classifyError(new TypeError('Failed to fetch')).kind).toBe('network')
    expect(classifyError('boom').kind).toBe('unknown')
    expect(classifyError(new ApiError('', { status: 401 })).message).toBe('Authentication is required to continue.')
  })
})

describe('shared HTTP transport', () => {
  it('requires a configured API base URL', async () => {
    await expect(http('/api/v1/health', {}, null)).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('sends JSON requests with cookies and a request ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      http('/api/v1/example', { method: 'POST', body: { value: 3 } }, 'https://api.test'),
    ).resolves.toEqual({ accepted: true })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.test/api/v1/example')
    expect(options.body).toBe('{"value":3}')
    expect(options.credentials).toBe('include')
    expect(new Headers(options.headers).get('X-Request-ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('sends the session CSRF cookie as a header on mutations only', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('document', { cookie: 'astroorbitx_csrf=csrf-session-value' })

    await http('/api/v1/me', {}, 'http://127.0.0.1:8000')
    await http('/api/v1/me/profile', { method: 'PATCH', body: { display_name: 'Local' } }, 'http://127.0.0.1:8000')

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-CSRF-Token')).toBeNull()
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('X-CSRF-Token')).toBe('csrf-session-value')
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:8000/api/v1/me/profile')
    expect(fetchMock.mock.calls[1][1].credentials).toBe('include')
  })

  it('preserves a valid supplied request ID and replaces an invalid one', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const suppliedId = 'C55BE8A8-919C-4BD0-8D77-0400A16C649F'

    await http('/x', { requestId: suppliedId }, 'https://api.test')
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-Request-ID')).toBe(suppliedId.toLowerCase())

    await http('/x', { requestId: 'not-a-uuid' }, 'https://api.test')
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('X-Request-ID')).toMatch(
      /^[0-9a-f-]{36}$/i,
    )
  })

  it('surfaces the response request ID to callers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true }, 200, { 'X-Request-ID': 'c55be8a8-919c-4bd0-8d77-0400a16c649f' }),
    )
    const onRequestId = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await http('/x', { onRequestId }, 'https://api.test')
    expect(onRequestId).toHaveBeenCalledWith('c55be8a8-919c-4bd0-8d77-0400a16c649f')
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [422, 'validation'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('maps %s Problem Details errors', async (status, kind) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        problemResponse(status, {
          type: 'about:blank',
          title: 'Request failed',
          status,
          detail: 'The request could not be completed.',
          request_id: 'c55be8a8-919c-4bd0-8d77-0400a16c649f',
          ...(status === 422 ? { errors: [{ field: 'body.value', code: 'missing', message: 'Field is required.' }] } : {}),
        }),
      ),
    )

    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({
      status,
      kind,
      requestId: 'c55be8a8-919c-4bd0-8d77-0400a16c649f',
      ...(status === 422 ? { fieldErrors: { 'body.value': 'Field is required.' } } : {}),
    })
  })

  it.each([
    [401, 'Authentication is required to continue.'],
    [403, 'You do not have access to this resource.'],
    [404, 'This resource is unavailable.'],
  ] as const)('does not expose server detail for %s access outcomes', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        problemResponse(status, {
          type: 'about:blank',
          title: 'Request failed',
          status,
          detail: 'Private profile record crew-123 exists but is restricted.',
          request_id: 'c55be8a8-919c-4bd0-8d77-0400a16c649f',
        }),
      ),
    )

    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({
      status,
      message,
    })
  })

  it('maps a network failure without returning successful empty data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({
      kind: 'network',
      message: expect.stringContaining('Nothing was changed.'),
    })
  })

  it('rejects empty success responses instead of fabricating data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))
    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'server' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'server', status: 204 })
  })

  it('maps unreadable JSON and allows caller cancellation through unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'server' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    await expect(http('/api/v1/resource', {}, 'https://api.test')).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('maps a timed-out request and clears the request timer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
      ),
    )

    const request = http('/api/v1/resource', { timeoutMs: 25 }, 'https://api.test')
    const rejection = expect(request).rejects.toMatchObject({
      kind: 'network',
      message: expect.stringContaining('too long'),
    })
    await vi.advanceTimersByTimeAsync(25)
    await rejection
    expect(vi.getTimerCount()).toBe(0)
  })
})
