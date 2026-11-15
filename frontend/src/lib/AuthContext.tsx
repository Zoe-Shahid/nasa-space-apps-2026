import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authApi } from '../data/authApi'
import { ApiError } from '../data/common'
import { AuthContext, type AuthState, useAuth } from './authState'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    authApi.me(controller.signal).then(
      (account) => setState({ status: 'signed-in', account }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState(error instanceof ApiError && error.status === 401 ? { status: 'signed-out' } : { status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [])

  async function signIn(email: string, password: string) {
    setState({ status: 'signed-in', account: await authApi.login(email, password) })
  }

  async function register(email: string, password: string, displayName: string) {
    setState({ status: 'signed-in', account: await authApi.register(email, password, displayName) })
  }

  async function signOut() {
    await authApi.logout()
    setState({ status: 'signed-out' })
  }

  async function updateProfile(displayName: string) {
    if (state.status !== 'signed-in') throw new Error('Authentication required')
    const profile = await authApi.updateProfile(displayName)
    setState({ status: 'signed-in', account: { ...state.account, profile } })
  }

  return <AuthContext.Provider value={{ state, signIn, register, signOut, updateProfile }}>{children}</AuthContext.Provider>
}

export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <p role="status">Checking your session…</p>
  if (state.status === 'error') return <p role="alert">Could not verify the session. Reload to try again.</p>
  if (state.status === 'signed-out') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}