import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OrbitView } from '../components/orbit/OrbitView'
import { ButtonLink } from '../components/ui'
import { DOMAINS, domainMeta } from '../lib/domains'
import { ROUTES } from '../lib/routes'

export default function LandingPage() {
  const [selected, setSelected] = useState(DOMAINS[0].key)
  const nodes = DOMAINS.map((domain) => ({ key: domain.key, label: domain.orbitLabel, status: null }))
  const selectedDomain = domainMeta(selected)

  return (
    <div className="ao-actual-page ao-landing">
      <section className="ao-hero" aria-labelledby="landing-title">
        <div className="ao-hero__text">
          <h1 id="landing-title" className="ao-hero__title">See each system in one orbit.</h1>
          <p className="ao-hero__lede">AstroOrbitX is a private place to record and review your own measurements. It shows saved values descriptively, without clinical interpretation.</p>
          <div className="ao-hero__actions">
            <ButtonLink to={ROUTES.login.path}>Sign in or create account</ButtonLink>
          </div>
        </div>
        <div className="ao-orbit-panel">
          <OrbitView
            nodes={nodes}
            selectedKey={selected}
            onSelect={setSelected}
            monogram="AX"
            groupLabel="Conceptual six-system orbit; no assessment statuses are evaluated"
            showStatusText
            unreportedLabel="Not evaluated"
          />
          <div className="ao-orbit-panel__caption">
            <p className="ao-orbit-panel__live" role="status">{selectedDomain?.fullLabel}: no status is evaluated or implied.</p>
            <p>Conceptual organization only. The orbit does not represent a person, saved measurements, or assessment results.</p>
          </div>
        </div>
      </section>

      <section className="ao-steps" aria-label="Record, Evaluate, Explain">
        <ol className="ao-steps__list">
          <li className="ao-steps__item"><h2>Record</h2><p>Enter measurements with explicit units and timestamps in your private account.</p></li>
          <li className="ao-steps__item"><h2>Evaluate</h2><p>Assessment rules are not available; the application does not calculate health status.</p></li>
          <li className="ao-steps__item"><h2>Explain</h2><p>Review saved values, history, and descriptive trends without diagnosis or risk prediction.</p></li>
        </ol>
      </section>

      <section className="ao-notdo" aria-labelledby="landing-limits">
        <h2 id="landing-limits">Scope and limitations</h2>
        <ul className="ao-notdo__list">
          <li><h3>No clinical interpretation</h3><p>AstroOrbitX does not diagnose, predict risk, recommend treatment, or label a reading normal or abnormal.</p></li>
          <li><h3>No connected data feeds</h3><p>Wearables, ECG, laboratory, imaging, dosimetry, and emergency services are not connected.</p></li>
          <li><h3>Independent from NASA</h3><p>AstroOrbitX is not endorsed, validated, or operated by NASA.</p></li>
        </ul>
        <p className="ao-help"><Link to={ROUTES.about.path}>About AstroOrbitX</Link></p>
      </section>
    </div>
  )
}
