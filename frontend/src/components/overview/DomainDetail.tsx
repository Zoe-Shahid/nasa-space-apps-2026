import { Link } from 'react-router-dom'
import { CoverageIndicator, StatusBadge, UtcTime } from '../ui'
import { DOMAIN_LIMITS, domainFullLabel, domainMeta } from '../../lib/domains'
import { joinList } from '../../lib/overviewModel'
import { ROUTES } from '../../lib/routes'
import { parseStatus } from '../../types/status'
import type { DomainAssessment } from '../../types/overview'

interface DomainDetailProps {
  id: string
  /** Domain key being shown, used for the heading when the backend did not report this domain. */
  domainKey: string
  domain: DomainAssessment | undefined
  /** Where "Open the full assessment" goes, already carrying the profile and domain. */
  assessmentHref?: string
}

/** Shows exactly what the backend returned for the selected domain. Status and coverage stay separate. */
export function DomainDetail({ id, domainKey, domain, assessmentHref = ROUTES.about.path }: DomainDetailProps) {
  const heading = domainFullLabel(domainKey)

  if (!domain) {
    return (
      <section id={id} className="ao-detail" aria-labelledby={`${id}-title`}>
        <div className="ao-detail__head">
          <h2 id={`${id}-title`}>{heading}</h2>
          <span className="ao-badge ao-badge--unsupported">Not reported</span>
        </div>
        <p className="ao-detail__text">The backend did not return an assessment for this system, so no status is shown. This is not a Normal result.</p>
        <Link className="ao-detail__link" to={assessmentHref}>
          Open the full assessment
        </Link>
      </section>
    )
  }

  const insufficient = parseStatus(domain.status) === 'insufficient_data'
  const limit = DOMAIN_LIMITS[domainMeta(domainKey)?.key ?? domainKey]

  return (
    <section id={id} className="ao-detail" aria-labelledby={`${id}-title`}>
      <div className="ao-detail__head">
        <h2 id={`${id}-title`}>{heading}</h2>
        <StatusBadge status={domain.status} />
      </div>
      <CoverageIndicator coverage={domain.coverage} />

      <p className="ao-detail__text">{domain.explanation}</p>
      {limit && <p className="ao-help">{limit}</p>}

      <dl className="ao-detail__facts">
        <div>
          <dt>Rule</dt>
          <dd>{domain.ruleIds.length > 0 ? joinList(domain.ruleIds) : 'Not provided'}</dd>
        </div>
        <div>
          <dt>Latest record</dt>
          <dd>{domain.latestRecordAt ? <UtcTime value={domain.latestRecordAt} format="short" /> : 'No relevant record'}</dd>
        </div>
        <div>
          <dt>Next review step</dt>
          <dd>{domain.nextReviewStep ?? 'Not provided'}</dd>
        </div>
      </dl>

      <p className="ao-help">
        Assessment is unavailable in this local MVP. No rules run and no health status is calculated.
        {insufficient && ' Insufficient Data means the area could not be evaluated. It is not Normal.'}
      </p>
      <Link className="ao-detail__link" to={assessmentHref}>
        Open the full assessment
      </Link>
    </section>
  )
}
