// Shared pieces for the (not yet implemented) live API layer and the explicit demo layer.
export type ErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'server' | 'unknown'

/** Maps an HTTP status to the kind of problem. No status means the request never got an answer (see http.ts). */
export function kindFromStatus(status?: number): ErrorKind {
  if (status === undefined) return 'unknown'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 400 || status === 409 || status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'unknown'
}

export class ApiError extends Error {
  requestId?: string
  /** HTTP-style status when known: 401, 403, 404, 422, 5xx. Used to separate "not allowed" from "not found". */
  status?: number
  kind: ErrorKind
  /** Field-level problems returned by the server, keyed by form field name. */
  fieldErrors?: Record<string, string>
  constructor(message: string, opts: { requestId?: string; status?: number; kind?: ErrorKind; fieldErrors?: Record<string, string> } = {}) {
    super(message)
    this.name = 'ApiError'
    this.requestId = opts.requestId
    this.status = opts.status
    this.kind = opts.kind ?? kindFromStatus(opts.status)
    this.fieldErrors = opts.fieldErrors
  }
}

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const t = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** QA hook, demo mode only: ?demoFail=<name> simulates a failure so error states can be tested. */
export function demoFail(): string | null {
  return new URLSearchParams(window.location.search).get('demoFail')
}

const fired = new Set<string>()
/** True the first time it is asked for a given name, then false. Simulates a transient failure that a retry fixes. */
export function failOnce(name: string): boolean {
  if (fired.has(name)) return false
  fired.add(name)
  return true
}
