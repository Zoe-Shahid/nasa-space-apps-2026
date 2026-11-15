import { useEffect } from 'react'

export function useHashFocus(): void {
  useEffect(() => {
    const focusTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      document.getElementById(id)?.focus({ preventScroll: true })
    }
    focusTarget()
    window.addEventListener('hashchange', focusTarget)
    return () => window.removeEventListener('hashchange', focusTarget)
  }, [])
}
