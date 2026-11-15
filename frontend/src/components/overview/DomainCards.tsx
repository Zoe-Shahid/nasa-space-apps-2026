import { Link } from 'react-router-dom'
import { CoverageIndicator, StatusBadge, UtcTime } from '../ui'
import type { OverviewDomainCard } from '../../lib/overviewDomainCards'
import { ROUTES } from '../../lib/routes'

interface DomainCardsProps {
  cards: OverviewDomainCard[]
}

export function DomainCards({ cards }: DomainCardsProps) {
  return (
    <section className="ao-domain-cards" aria-labelledby="domain-cards-title">
      <div className="ao-section-head">
        <h2 id="domain-cards-title">Health domains</h2>
        <p className="ao-help">Statuses and coverage are shown separately. Latest details are limited to data returned by the overview.</p>
      </div>
      <ul className="ao-domain-cards__grid">
        {cards.map((card) => (
          <li key={card.key}>
            <article className="ao-domain-card">
              <header className="ao-domain-card__head">
                <h3>{card.label}</h3>
                {card.status ? <StatusBadge status={card.status} /> : <span className="ao-badge ao-badge--unsupported">Not reported</span>}
              </header>

              {card.coverage ? <CoverageIndicator coverage={card.coverage} /> : <p className="ao-domain-card__coverage">Coverage: Not reported</p>}

              <dl className="ao-domain-card__facts">
                <div>
                  <dt>Latest record</dt>
                  <dd>
                    {card.latestRecordAt ? (
                      <UtcTime value={card.latestRecordAt} format="short" />
                    ) : card.readings.length > 0 ? (
                      'See timestamps below'
                    ) : (
                      'No latest record reported'
                    )}
                  </dd>
                </div>
              </dl>

              <div className="ao-domain-card__latest">
                <h4>Latest recorded information</h4>
                {card.readings.length > 0 ? (
                  <ul>
                    {card.readings.map((reading) => (
                      <li key={reading.label}>
                        <span>{reading.label}: {reading.value}</span>
                        <span className="ao-help"><UtcTime value={reading.recordedAt} format="short" /></span>
                      </li>
                    ))}
                  </ul>
                ) : card.assessmentDetail ? (
                  <p>{card.assessmentDetail}</p>
                ) : (
                  <p className="ao-help">
                    {card.privateDetailsHidden
                      ? 'Private wellbeing details are not shown on the crew overview.'
                      : 'No domain-specific reading details were returned in the overview.'}
                  </p>
                )}
              </div>

              <Link
                className="ao-domain-card__link"
                to={ROUTES.about.path}
              >
                View assessment
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
