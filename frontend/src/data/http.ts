import { ApiError, kindFromStatus, type ProblemDetails } from './common'

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  requestId?: string
  onRequestId?: (requestId: string) => void
  timeoutMs?: number
  expectNoContent?: boolean
}

const DEFAULT_TIMEOUT_MS = 10_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Base origin from VITE_API_BASE_URL. Product routes add their contract-defined path. */
export function apiBaseUrl(): string | null {
  const value = import.meta.env.VITE_API_BASE_URL
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '/' || trimmed === './') return ''

  const base = trimmed.replace(/\/+$/, '')
  let url: URL
  try {
    url = new URL(base)
  } catch {
    throw new ApiError('The API base URL is invalid.', { kind: 'unknown' })
  }
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash
  ) {
    throw new ApiError('The API base URL is invalid.', { kind: 'unknown' })
  }
  return base
}

function requestIdFor(candidate?: string): string {
  return candidate && UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseProblem(value: unknown): ProblemDetails | null {
  if (!isRecord(value)) return null
  const { type, title, status, detail, request_id: requestId, errors } = value
  const requiredKeys = ['type', 'title', 'status', 'detail', 'request_id']
  const actualKeys = Object.keys(value).sort()
  const expectedKeys = [...requiredKeys, ...(errors === undefined ? [] : ['errors'])].sort()
  if (
    actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index]) ||
    typeof type !== 'string' ||
    typeof title !== 'string' ||
    typeof status !== 'number' ||
    !Number.isInteger(status) ||
    typeof detail !== 'string' ||
    typeof requestId !== 'string' ||
    !UUID_PATTERN.test(requestId)
  ) return null

  if (errors === undefined) return { type, title, status, detail, request_id: requestId }
  if (!Array.isArray(errors)) return null
  const parsedErrors: NonNullable<ProblemDetails['errors']> = []
  for (const error of errors) {
    if (
      !isRecord(error) ||
      Object.keys(error).length !== 3 ||
      !Object.hasOwn(error, 'field') ||
      !Object.hasOwn(error, 'code') ||
      !Object.hasOwn(error, 'message') ||
      typeof error.field !== 'string' ||
      typeof error.code !== 'string' ||
      typeof error.message !== 'string'
    ) return null
    parsedErrors.push({ field: error.field, code: error.code, message: error.message })
  }
  return { type, title, status, detail, request_id: requestId, errors: parsedErrors }
}

function errorMessage(status: number, problem: ProblemDetails | null): string {
  if (status === 401) return 'Authentication is required to continue.'
  if (status === 403) return 'You do not have access to this resource.'
  if (status === 404) return 'This resource is unavailable.'
  if (problem?.detail) return problem.detail
  if (status === 422) return 'The request was rejected.'
  if (status >= 500) return 'The server reported a problem. Try again in a moment.'
  return 'The request could not be completed.'
}

async function parseErrorResponse(
  response: Response,
  requestId: string,
  onRequestId: HttpOptions['onRequestId'],
  signal: AbortSignal | undefined,
  timedOut: boolean,
): Promise<ApiError> {
  let problem: ProblemDetails | null = null
  if (response.headers.get('content-type')?.includes('application/problem+json')) {
    try {
      problem = parseProblem(await response.json())
    } catch (error) {
      if (signal?.aborted) throw error
      if (timedOut) {
        throw new ApiError('The server took too long to respond. Try again.', {
          kind: 'network',
          requestId: response.headers.get('x-request-id') ?? requestId,
        })
      }
      problem = null
    }
  }

  const responseRequestId = response.headers.get('x-request-id') ?? problem?.request_id ?? requestId
  if (responseRequestId) onRequestId?.(responseRequestId)

  const errors = problem?.errors ?? []
  const fieldErrors = errors.reduce<Record<string, string>>((result, error) => {
    if (error) result[error.field] = error.message
    return result
  }, {})

  return new ApiError(errorMessage(response.status, problem), {
    status: response.status,
    kind: kindFromStatus(response.status),
    requestId: responseRequestId,
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
  })
}

let cachedCsrfToken: string | null = null

function csrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith('astroorbitx_csrf='))
    if (entry) return decodeURIComponent(entry.slice('astroorbitx_csrf='.length))
  }
  return cachedCsrfToken
}

/** Shared JSON transport for the session-cookie API. */
export async function http(path: string, options: HttpOptions = {}, configuredBase: string | null = apiBaseUrl()): Promise<unknown> {
  if (configuredBase === null) throw new ApiError('The API base URL is not configured.', { kind: 'unknown' })

  const requestId = requestIdFor(options.requestId)
  const controller = new AbortController()
  const upstreamSignal = options.signal
  let timedOut = false
  let timeout: ReturnType<typeof setTimeout> | undefined

  const abortFromCaller = () => controller.abort(upstreamSignal?.reason)
  if (upstreamSignal?.aborted) throw upstreamSignal.reason
  upstreamSignal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (timeoutMs > 0) {
    timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  }

  try {
    let body: string | undefined
    try {
      body = options.body === undefined ? undefined : JSON.stringify(options.body)
    } catch {
      throw new ApiError('The request could not be encoded.', { kind: 'unknown', requestId })
    }

    let response: Response
    try {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json, application/problem+json')
      if (body !== undefined) headers.set('Content-Type', 'application/json')
      headers.set('X-Request-ID', requestId)
      if (options.method === 'POST' || options.method === 'PATCH') {
        const token = csrfToken()
        if (token) headers.set('X-CSRF-Token', token)
      }
      response = await fetch(`${configuredBase}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers,
        body,
        signal: controller.signal,
      })
    } catch (error) {
      if (upstreamSignal?.aborted) throw error
      if (timedOut) {
        throw new ApiError('The server took too long to respond. Try again.', { kind: 'network', requestId })
      }
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError('The server could not be reached. Check your connection and try again. Nothing was changed.', { kind: 'network', requestId })
    }

    if (!response.ok) throw await parseErrorResponse(response, requestId, options.onRequestId, upstreamSignal, timedOut)
    const returnedCsrf = response.headers.get('x-csrf-token')
    if (returnedCsrf) cachedCsrfToken = returnedCsrf
    if (path === '/api/v1/auth/logout') cachedCsrfToken = null
    const responseRequestId = response.headers.get('x-request-id')
    if (responseRequestId) options.onRequestId?.(responseRequestId)
    if (response.status === 204) {
      if (options.expectNoContent) return null
      throw new ApiError('The server returned an unexpected empty response.', {
        status: response.status,
        kind: 'server',
        requestId: responseRequestId ?? requestId,
      })
    }

    try {
      return await response.json() as unknown
    } catch (error) {
      if (upstreamSignal?.aborted) throw error
      if (timedOut) {
        throw new ApiError('The server took too long to respond. Try again.', {
          kind: 'network',
          requestId: responseRequestId ?? requestId,
        })
      }
      throw new ApiError('The server sent a response that could not be read.', {
        status: response.status,
        kind: 'server',
        requestId: responseRequestId ?? requestId,
      })
    }
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
    upstreamSignal?.removeEventListener('abort', abortFromCaller)
  }
}
