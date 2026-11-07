import { ApiError, type ErrorKind } from './common'

export interface ClassifiedError {
  kind: ErrorKind
  message: string
  requestId?: string
  /** Whether trying the same request again can help. Not for "not allowed", "not found" or "rejected" outcomes. */
  retryable: boolean
}

const FALLBACK: Record<ErrorKind, string> = {
  network: 'The server could not be reached. Check your connection and try again. Nothing was changed.',
  unauthorized: 'Your session has ended. Sign in again to continue.',
  forbidden: 'You do not have access to this. Nothing is shown.',
  not_found: 'This could not be found.',
  validation: 'The request was rejected.',
  server: 'The server reported a problem. Try again in a moment.',
  unknown: 'The request failed.',
}

/** One place that turns any thrown value into a displayable, typed problem. */
export function classifyError(e: unknown): ClassifiedError {
  if (e instanceof ApiError) {
    return { kind: e.kind, message: e.message || FALLBACK[e.kind], requestId: e.requestId, retryable: e.kind === 'network' || e.kind === 'server' || e.kind === 'unknown' }
  }
  // fetch rejects with a TypeError when the network fails.
  if (e instanceof TypeError) return { kind: 'network', message: FALLBACK.network, retryable: true }
  return { kind: 'unknown', message: FALLBACK.unknown, retryable: true }
}
