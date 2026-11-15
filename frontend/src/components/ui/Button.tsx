import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cx } from '../../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm'

function classes(variant: Variant, size: Size, extra?: string) {
  return cx('ao-btn', `ao-btn--${variant}`, size === 'sm' && 'ao-btn--sm', extra)
}

/** size "sm" is 36px tall: below the 44px target, so use it only for dense secondary actions. */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Disables the button and sets aria-busy while an action is in flight. */
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button {...rest} ref={ref} type={type} className={classes(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && <span className="ao-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  children: ReactNode
}

/** A real link (navigation) that looks like a button. */
export function ButtonLink({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={classes(variant, size, className)}>
      {children}
    </Link>
  )
}
