import { Link } from 'react-router-dom'
import { ErrorState } from './ui'
import type { ErrorKind } from '../data/common'
import { classifyError } from '../data/errors'
import { ROUTES } from '../lib/routes'

interface Props {
  error: unknown
  /** For titles such as "Unable to load the overview". */
  subject: string
  onRetry?: () => void
  retryLabel?: string
  /** Replace the default title for a kind, for example validation: "This date range was rejected". */
  titles?: Partial<Record<ErrorKind, string>>
}

const TITLE: Partial<Record<ErrorKind, string>> = {
  network: 'Could not reach the server',
  unauthorized: 'Your session has ended',
  forbidden: 'You are not assigned to this profile',
  not_found: 'Profile not found',
  validation: 'The request was rejected',
}

/** Shared error panel for every screen: network, unauthorized, forbidden, not found, rejected, server and unknown. */
export function ApiErrorView({ error, subject, onRetry, retryLabel, titles }: Props) {
  const c = classifyError(error)
  const title = titles?.[c.kind] ?? TITLE[c.kind] ?? `Unable to load ${subject}`
  return (
    <div className="ao-apierror" data-kind={c.kind}>
      <ErrorState title={title} message={c.message} requestId={c.requestId} onRetry={c.retryable ? onRetry : undefined} retryLabel={retryLabel} />
      {c.kind === 'unauthorized' && (
        <p>
          <Link to={ROUTES.login.path}>Sign in</Link>
        </p>
      )}
    </div>
  )
}
