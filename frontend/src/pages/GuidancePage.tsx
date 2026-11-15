import { Link } from 'react-router-dom'
import { CoverageIndicator, PageHeading, StatusBadge } from '../components/ui'
import { AREA_BLOCK_LABEL, COVERAGE_MEANINGS, GUIDANCE_CREDIT, NOT_CONNECTED, REFERENCES, RESEARCH_AREAS, STATUS_MEANINGS } from '../content/guidance'
import { useHashFocus } from '../lib/useHashFocus'
import { ROUTES } from '../lib/routes'

function RefLinks({ ids }: { ids: string[] }) {
  return (
    <span className="ao-refs">
      [
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <a href={`#ref-${id.toLowerCase()}`} aria-label={`Reference ${id}`}>
            {id}
          </a>
        </span>
      ))}
      ]
    </span>
  )
}

export default function GuidancePage() {
  useHashFocus()
  return (
    <div className="ao-guidance">
      <PageHeading title="Guidance and research" description="How to read statuses, what each area can and cannot show, and where the evidence comes from" />
      <p className="ao-guidance__chip">Research background</p>
      <p className="ao-guidance__notice">This page is educational research context, not medical advice, diagnosis, or treatment. References do not imply NASA partnership or endorsement, and this MVP is not clinically validated.</p>

      <nav aria-label="On this page" className="ao-guidance__jump">
        <ul>
          <li>
            <a href="#statuses">Statuses</a>
          </li>
          <li>
            <a href="#coverage">Coverage</a>
          </li>
          {RESEARCH_AREAS.map((a) => (
            <li key={a.id}>
              <a href={`#${a.id}`}>{a.title}</a>
            </li>
          ))}
          <li>
            <a href="#not-connected">Not connected</a>
          </li>
          <li>
            <a href="#references">References</a>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="statuses" className="ao-guidance__block">
        <h2 id="statuses" tabIndex={-1}>
          What each status means
        </h2>
        <ul className="ao-guidance__cards">
          {STATUS_MEANINGS.map((m) => (
            <li key={m.status}>
              <StatusBadge status={m.status} />
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="coverage" className="ao-guidance__block">
        <h2 id="coverage" tabIndex={-1}>
          What coverage means
        </h2>
        <p className="ao-guidance__lede">Coverage is shown separately from status, so a missing stream can never hide an existing concern. Missing data is not zero, and it never implies Normal.</p>
        <ul className="ao-guidance__cards ao-guidance__cards--3">
          {COVERAGE_MEANINGS.map((m) => (
            <li key={m.coverage}>
              <CoverageIndicator coverage={m.coverage} prefix="" />
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="ao-help">Assessment and numerical rules are not implemented. These status and coverage descriptions are conceptual only; the app does not calculate them.</p>
      </section>

      <div className="ao-guidance__cols">
        <section aria-labelledby="evidence" className="ao-guidance__panel">
          <h2 id="evidence">Six mission health domains</h2>
          <p className="ao-help">
            Each section explains the research context, why it matters during missions, what the prototype can display, and what the available data cannot establish. Research references are listed under <a href="#references">References</a>.
          </p>
          {RESEARCH_AREAS.map((area) => (
            <article key={area.id} aria-labelledby={area.id} className="ao-guidance__area">
              <h3 id={area.id} tabIndex={-1}>
                {area.title}
              </h3>
              <p className="ao-guidance__area-intro">{area.explanation} <RefLinks ids={area.refs} /></p>
              <dl className="ao-guidance__area-facts">
                <div className="ao-guidance__row ao-guidance__row--why">
                  <dt>{AREA_BLOCK_LABEL.whyItMatters}</dt>
                  <dd>{area.whyItMatters} <RefLinks ids={area.refs} /></dd>
                </div>
                <div className="ao-guidance__row ao-guidance__row--recorded">
                  <dt>{AREA_BLOCK_LABEL.monitors}</dt>
                  <dd>{area.monitors}</dd>
                </div>
                <div className="ao-guidance__row ao-guidance__row--limit">
                  <dt>{AREA_BLOCK_LABEL.cannotEstablish}</dt>
                  <dd>{area.cannotEstablish} <RefLinks ids={area.refs} /></dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <div className="ao-guidance__side">
          <section aria-labelledby="not-connected" className="ao-guidance__panel">
            <h2 id="not-connected" tabIndex={-1}>
              Not connected in this prototype
            </h2>
            <p className="ao-help">Possible future integrations. None of these exist here.</p>
            <ul className="ao-guidance__future">
              {NOT_CONNECTED.map((n) => (
                <li key={n}>
                  {n} <span className="ao-tag">Not connected</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="references" className="ao-guidance__panel">
            <h2 id="references" tabIndex={-1}>
              References
            </h2>
            <ul className="ao-guidance__refs">
              {REFERENCES.map((r) => (
                <li key={r.id} id={`ref-${r.id.toLowerCase()}`}>
                  [{r.id}]{' '}
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.label}
                    <span className="ao-sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="ao-help">{GUIDANCE_CREDIT}</p>
          </section>
        </div>
      </div>
      <p className="ao-help">
        <Link to={ROUTES.about.path}>About this prototype</Link>
      </p>
    </div>
  )
}
