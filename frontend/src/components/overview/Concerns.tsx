import { StatusBadge } from '../ui'
import { domainFullLabel } from '../../lib/domains'
import { parseStatus } from '../../types/status'
import type { UnresolvedConcern } from '../../types/overview'

/** Lists what the backend reports as unresolved: domain and rule identifier. Nothing is derived in the browser. */
export function Concerns({ concerns }: { concerns: UnresolvedConcern[] }) {
  if (concerns.length === 0) {
    return (
      <section className="ao-concerns ao-concerns--none" aria-label="Unresolved concerns">
        <p>
          <strong>No unresolved concerns were reported for this assessment.</strong> This is not a health clearance.
        </p>
      </section>
    )
  }
  const urgent = concerns.some((c) => parseStatus(c.status) === 'urgent')
  return (
    <section className={urgent ? 'ao-concerns ao-concerns--urgent' : 'ao-concerns'} aria-label="Unresolved concerns">
      <p className="ao-concerns__title">
        {concerns.length} unresolved {concerns.length === 1 ? 'concern' : 'concerns'}.
      </p>
      <ul className="ao-concerns__list">
        {concerns.map((c) => (
          <li key={`${c.domain}-${c.ruleId}`}>
            <span className="ao-concerns__where">
              {domainFullLabel(c.domain)} ({c.ruleId})
            </span>{' '}
            <StatusBadge status={c.status} /> <span>{c.summary}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
