import { ApiError } from './common'
import { http } from './http'

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export interface SelfProfile {
  id: string
  email: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface AuthResult {
  user: AuthUser
  profile: SelfProfile
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function parseAuthResult(value: unknown): AuthResult {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.profile)) {
    throw new ApiError('The authentication endpoint returned an unexpected response.', { kind: 'server' })
  }
  const user = value.user
  const profile = value.profile
  if (
    !isUuid(user.id) || typeof user.email !== 'string' || typeof user.created_at !== 'string' ||
    !isUuid(profile.id) || typeof profile.email !== 'string' || typeof profile.display_name !== 'string' ||
    typeof profile.created_at !== 'string' || typeof profile.updated_at !== 'string'
  ) throw new ApiError('The authentication endpoint returned an unexpected response.', { kind: 'server' })
  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    profile: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    },
  }
}

export const authApi = {
  async me(signal?: AbortSignal): Promise<AuthResult> {
    return parseAuthResult(await http('/api/v1/me', { signal }))
  },
  async login(email: string, password: string): Promise<AuthResult> {
    return parseAuthResult(await http('/api/v1/auth/login', { method: 'POST', body: { email, password } }))
  },
  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    return parseAuthResult(await http('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, display_name: displayName },
    }))
  },
  async logout(): Promise<void> {
    await http('/api/v1/auth/logout', { method: 'POST', expectNoContent: true })
  },
  async updateProfile(displayName: string): Promise<SelfProfile> {
    const value = await http('/api/v1/me/profile', { method: 'PATCH', body: { display_name: displayName } })
    if (!isRecord(value) || !isUuid(value.id) || typeof value.email !== 'string' ||
      typeof value.display_name !== 'string' || typeof value.created_at !== 'string' || typeof value.updated_at !== 'string') {
      throw new ApiError('The profile endpoint returned an unexpected response.', { kind: 'server' })
    }
    return value as unknown as SelfProfile
  },
}