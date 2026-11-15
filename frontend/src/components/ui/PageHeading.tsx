import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description?: ReactNode
  /** Buttons or links aligned to the end of the heading row. */
  actions?: ReactNode
  /** Status, coverage and time information shown under the title. */
  meta?: ReactNode
}

export function PageHeading({ title, description, actions, meta }: PageHeadingProps) {
  return (
    <header className="ao-page-heading">
      <div className="ao-page-heading__row">
        <div className="ao-page-heading__text">
          <h1>{title}</h1>
          {description && <p className="ao-page-heading__desc">{description}</p>}
        </div>
        {actions && <div className="ao-page-heading__actions">{actions}</div>}
      </div>
      {meta && <div className="ao-page-heading__meta">{meta}</div>}
    </header>
  )
}
