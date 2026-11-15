import { Link } from 'react-router-dom'
import { PageHeading } from '../components/ui'
import { DOMAINS } from '../lib/domains'
import { ROUTES } from '../lib/routes'

export default function AssessmentPage() {
  return (
    <div className="ao-assess">
      <PageHeading
        title="Assessment"
        description="No assessment rules or assessment API are available in this MVP."
      />
      <p className="ao-assess__disclaimer" role="note">
        No status, coverage, diagnosis, risk estimate, or treatment recommendation is computed. “Not evaluated” is not a health conclusion.
      </p>
      <div className="ao-assess__grid">
        <ul className="ao-assess__list" aria-label="Systems not evaluated">
          {DOMAINS.map((domain) => (
            <li key={domain.key}>
              <div className="ao-assess__unavailable-row">
                <span className="ao-assess__name">{domain.fullLabel}</span>
                <span className="ao-badge ao-badge--unsupported">Not evaluated</span>
              </div>
            </li>
          ))}
        </ul>
        <section className="ao-assess__detail" aria-labelledby="assessment-empty-title">
          <h2 id="assessment-empty-title">No assessment result</h2>
          <p>Saved measurements remain available as records only. Missing information is not converted into “Normal” or “Insufficient Data” assessment output.</p>
          <p className="ao-assess__actions">
            <Link to={ROUTES.history.path}>Review history</Link>
            {' · '}
            <Link to={ROUTES.guidance.path}>Guidance and research</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
