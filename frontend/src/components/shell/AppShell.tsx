import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { titleForPath } from '../../lib/routes'
import { Footer } from './Footer'
import { Header } from './Header'
import { PrototypeNotice } from './PrototypeNotice'

interface AppShellProps {
  variant: 'landing' | 'app'
}

export function AppShell({ variant }: AppShellProps) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    document.title = titleForPath(pathname)
    // After in-app navigation, move focus to the page so keyboard and screen-reader users start at the top.
    const previous = lastPath.current
    lastPath.current = pathname
    if (previous === null || previous === pathname) return
    window.scrollTo(0, 0)
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="ao-app">
      <a className="ao-skip-link" href="#main">
        Skip to main content
      </a>
      <Header variant={variant}>
        <PrototypeNotice />
      </Header>
      <main id="main" ref={mainRef} tabIndex={-1} className="ao-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
