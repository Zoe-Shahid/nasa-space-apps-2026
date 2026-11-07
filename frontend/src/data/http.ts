// The one place a real HTTP request may be made. It is a generic, typed transport with error mapping.
// It contains NO URL paths, request bodies or response schemas: those must come from the confirmed backend contract
// (docs/backend-contract-notes.md). Nothing calls it yet, because no endpoint has been documented.
import { ApiError, kindFromStatus } from './common'

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** Base URL from VITE_API_BASE_URL. Unset means the backend is not configured. */
export function apiBaseUrl(): string | null {
  const v = import.meta.env.VITE_API_BASE_URL
  return typeof v === 'string' && v.trim() !== '' ? v.replace(/\/+$/, '') : null
}

export async function http<T>(path: string, opts: HttpOptions = {}, base: string | null = apiBaseUrl()): Promise<T> {
  if (base === null) throw new ApiError('The API base URL is not configured.', { kind: 'unknown' })
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      headers: { Accept: 'application/json', ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError('The server could not be reached. Check your connection and try again. Nothing was changed.', { kind: 'network' })
  }
  if (!res.ok) throw new ApiError(`The server answered with status ${res.status}.`, { status: res.status, kind: kindFromStatus(res.status), requestId: res.headers.get('x-request-id') ?? undefined })
  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('The server sent a response that could not be read.', { status: res.status, kind: 'server' })
  }
}
