import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, kindFromStatus } from './common'
import { classifyError } from './errors'
import { http } from './http'

afterEach(() => vi.unstubAllGlobals())

describe('error kinds', () => {
  it('maps statuses', () => {
    expect([401, 403, 404, 422, 409, 500, 503, 418].map(kindFromStatus)).toEqual(['unauthorized', 'forbidden', 'not_found', 'validation', 'validation', 'server', 'server', 'unknown'])
  })
  it('only retries what a retry can fix', () => {
    expect(classifyError(new ApiError('x', { status: 503 })).retryable).toBe(true)
    expect(classifyError(new ApiError('x', { kind: 'network' })).retryable).toBe(true)
    for (const s of [401, 403, 404, 422]) expect(classifyError(new ApiError('x', { status: s })).retryable).toBe(false)
  })
  it('treats a fetch TypeError as a network error and unknown values as unknown', () => {
    expect(classifyError(new TypeError('Failed to fetch')).kind).toBe('network')
    expect(classifyError('boom').kind).toBe('unknown')
  })
  it('falls back to standard wording when the message is empty', () => {
    expect(classifyError(new ApiError('', { status: 401 })).message).toMatch(/Sign in again/)
  })
})

describe('http transport', () => {
  const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  it('refuses to run without a configured base URL', async () => {
    await expect(http('/x', {}, null)).rejects.toMatchObject({ kind: 'unknown' })
  })
  it('returns parsed JSON on success and sends JSON bodies', async () => {
    const f = vi.fn().mockResolvedValue(ok({ a: 1 }))
    vi.stubGlobal('fetch', f)
    expect(await http<{ a: number }>('/p', { method: 'POST', body: { z: 1 } }, 'https://api.test')).toEqual({ a: 1 })
    expect(f.mock.calls[0][0]).toBe('https://api.test/p')
    expect(f.mock.calls[0][1].body).toBe('{"z":1}')
  })
  it('maps a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(http('/p', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'network' })
  })
  it('maps status codes and request id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403, headers: { 'x-request-id': 'abc' } })))
    await expect(http('/p', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'forbidden', status: 403, requestId: 'abc' })
  })
  it('reports an unreadable success body as a server problem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    await expect(http('/p', {}, 'https://api.test')).rejects.toMatchObject({ kind: 'server' })
  })
  it('lets an abort through unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    await expect(http('/p', {}, 'https://api.test')).rejects.toMatchObject({ name: 'AbortError' })
  })
})
