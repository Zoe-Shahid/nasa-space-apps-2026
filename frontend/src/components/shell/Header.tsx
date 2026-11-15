import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_ROUTES, ROUTES } from '../../lib/routes'
import { cx } from '../../lib/cx'
import { ButtonLink, Button } from '../ui'
import { useAuth } from '../../lib/authState'
import { Brand } from './Brand'

interface HeaderProps {
  /** "landing" shows only the brand and sign-in link. */
  variant: 'landing' | 'app'
  /** Rendered inside the banner landmark, under the bar (the prototype notice). */
  children?: ReactNode
}

export function Header({ variant, children }: HeaderProps) {
  const { signOut } = useAuth()
  const navId = useId()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      buttonRef.current?.focus()
    }
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
                  <NavLink to={r.path} className="ao-nav__link">
                    {r.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="ao-header__spacer" />
        <div className="ao-header__tools">
          {variant === 'landing' ? (
            <ButtonLink to={ROUTES.login.path} variant="secondary">Sign in</ButtonLink>
          ) : (
            <>
              <ButtonLink to={ROUTES.profile.path} variant="ghost">My profile</ButtonLink>
              <Button variant="secondary" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
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
