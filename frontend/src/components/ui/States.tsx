import type { ReactNode } from 'react'
import { Button } from './Button'

export function LoadingState({ label = 'Loading recorded data' }: { label?: string }) {
  return (
    <div className="ao-state ao-state--loading" role="status" aria-busy="true">
      <p className="ao-state__title">{label}</p>
      <div className="ao-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ao-state ao-state--empty">
      <p className="ao-state__title">{title}</p>
      {description && <p className="ao-state__body">{description}</p>}
      {action && <div className="ao-state__action">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: ReactNode
  /** Backend request ID, when one was returned. */
  requestId?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({ title = 'Unable to load records', message, requestId, onRetry, retryLabel = 'Retry' }: ErrorStateProps) {
  return (
    <div className="ao-state ao-state--error" role="alert">
      <p className="ao-state__title">{title}</p>
      {message && <p className="ao-state__body">{message}</p>}
      {requestId && (
        <p className="ao-state__body">
          Request ID: <code>{requestId}</code>
        </p>
      )}
      {onRetry && (
        <div className="ao-state__action">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

interface SuccessMessageProps {
  title: string
  children?: ReactNode
}

/** Announced politely to screen readers. Never put private note text in here. */
export function SuccessMessage({ title, children }: SuccessMessageProps) {
  return (
    <div className="ao-state ao-state--success" role="status">
      <p className="ao-state__title">{title}</p>
      {children && <div className="ao-state__body">{children}</div>}
    </div>
  )
}
