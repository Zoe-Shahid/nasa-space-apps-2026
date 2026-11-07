import type { ElementType, ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface CardProps {
  as?: ElementType
  /** Optional visible heading; becomes the accessible name of a <section>. */
  heading?: string
  headingLevel?: 2 | 3 | 4
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ as, heading, headingLevel = 2, actions, className, children }: CardProps) {
  const Tag: ElementType = as ?? (heading ? 'section' : 'div')
  const H = `h${headingLevel}` as ElementType
  return (
    <Tag className={cx('ao-card', className)}>
      {(heading || actions) && (
        <div className="ao-card__head">
          {heading && <H className="ao-card__title">{heading}</H>}
          {actions && <div className="ao-card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  )
}
