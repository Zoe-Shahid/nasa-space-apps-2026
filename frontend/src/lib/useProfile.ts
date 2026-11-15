import { useEffect, useState } from 'react'
import { liveProfilesApi } from '../data/profilesApi'
import type { ProfileViewModel } from '../types/profiles'

type ProfileLoad =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; error: unknown }
  | { state: 'ready'; profile: ProfileViewModel }

export function useProfile(id: string | null, attempt = 0): ProfileLoad {
  const [load, setLoad] = useState<ProfileLoad>({ state: 'idle' })
  useEffect(() => {
    if (!id) {
      setLoad({ state: 'idle' })
      return
    }
    const controller = new AbortController()
    setLoad({ state: 'loading' })
    liveProfilesApi.getProfile(id, controller.signal)
      .then((profile) => setLoad({ state: 'ready', profile }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoad({ state: 'error', error })
      })
    return () => controller.abort()
  }, [id, attempt])
  return load
}
