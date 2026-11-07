import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { NAV_ROUTES, ROUTES } from '../../lib/routes'
import { cx } from '../../lib/cx'
import { DEMO_REVIEWER, exitDemoMode, useDemoMode } from '../../lib/demoMode'
import { ButtonLink, Button } from '../ui'
import { Brand } from './Brand'

// Screens that belong to one crew profile keep the selected profile when you move between them.
const PROFILE_SCOPED = new Set<string>([ROUTES.overview.path, ROUTES.addData.path, ROUTES.history.path, ROUTES.assessment.path, ROUTES.trends.path])

interface HeaderProps {
  /** "landing" shows only the brand and Sign in, as in the approved landing screen. */
  variant: 'landing' | 'app'
  /** Rendered inside the banner landmark, under the bar (the prototype notice). */
  children?: ReactNode
}

export function Header({ variant, children }: HeaderProps) {
  const navId = useId()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const demo = useDemoMode()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const astronaut = searchParams.get('astronaut')
  const showUser = variant === 'app' && demo
  const userText = `${DEMO_REVIEWER.username}, ${DEMO_REVIEWER.role}`

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  // Sign out follows the only flow that exists: the demo session. It ends demo mode and returns to the landing page.
  function signOut() {
    exitDemoMode()
    setOpen(false)
    navigate(ROUTES.landing.path)
  }

  return (
    <header className="ao-header" onKeyDown={onKeyDown}>
      <div className="ao-header__bar">
        <Brand />
        {variant === 'app' && (
          <nav id={navId} className={cx('ao-nav', open && 'is-open')} aria-label="Main" onClick={(e) => {
              if (e.target instanceof Element && e.target.closest('a')) setOpen(false)
            }}>
            <ul className="ao-nav__list">
              {NAV_ROUTES.map((r) => (
                <li key={r.path}>
                  <NavLink to={astronaut && PROFILE_SCOPED.has(r.path) ? `${r.path}?astronaut=${encodeURIComponent(astronaut)}` : r.path} className="ao-nav__link">
                    {r.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {showUser && <p className="ao-nav__user">Signed in as {userText}</p>}
          </nav>
        )}
        <div className="ao-header__spacer" />
        <div className="ao-header__tools">
          {showUser ? (
            <>
              <span className="ao-header__user">{userText}</span>
              <Button variant="ghost" className="ao-signout" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <ButtonLink to={ROUTES.login.path} variant="secondary">
              Sign in
            </ButtonLink>
          )}
          {variant === 'app' && (
            <Button ref={buttonRef} variant="ghost" className="ao-menu-button" aria-expanded={open} aria-controls={navId} onClick={() => setOpen((o) => !o)}>
              Menu
            </Button>
          )}
        </div>
      </div>
      {children}
    </header>
  )
}
