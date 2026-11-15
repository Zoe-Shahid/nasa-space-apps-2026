import { ApiError } from './common'
import { http } from './http'
import type { HealthResponse, ReadinessResponse } from '../types/health'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseHealthResponse(value: unknown): HealthResponse {
  if (!isRecord(value) || value.status !== 'ok') {
    throw new ApiError('The health endpoint returned an unexpected response.', { kind: 'server' })
  }
  return { status: 'ok' }
}

function parseReadinessResponse(value: unknown): ReadinessResponse {
  if (!isRecord(value) || value.status !== 'ready' || value.database !== 'available') {
    throw new ApiError('The readiness endpoint returned an unexpected response.', { kind: 'server' })
  }
  return { status: 'ready', database: 'available' }
}

export interface HealthApi {
  health(signal?: AbortSignal): Promise<HealthResponse>
  readiness(signal?: AbortSignal): Promise<ReadinessResponse>
}

export const liveHealthApi: HealthApi = {
  async health(signal) {
    return parseHealthResponse(await http('/api/v1/health', { signal }))
  },
  async readiness(signal) {
    return parseReadinessResponse(await http('/api/v1/ready', { signal }))
  },
}
