import { useState, type MouseEvent } from 'react'
import { ButtonLink, StatusBadge } from '../components/ui'
import { OrbitLegend, OrbitView } from '../components/orbit/OrbitView'
import { LANDING_EXAMPLE_NAME, LANDING_EXAMPLE_STATUS } from '../fixtures/landingExample'
import { DOMAINS, domainMeta } from '../lib/domains'
import { enterDemoMode } from '../lib/demoMode'
import { WILL_NOT } from '../content/prototype'
import { initialsOf, ringStyleFor, statusText } from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import { Link } from 'react-router-dom'

const STATUS_ID = 'how-statuses-are-read'
const DEFAULT_CAPTION = 'Select a system to see how its ring is drawn.'

const STEPS = [
  { title: 'Record', body: 'Enter vitals, sleep, check-ins, symptoms, exercise and radiation intervals by hand. Each entry keeps its source, time in UTC and quality.' },
  { title: 'Evaluate', body: 'The backend applies fixed demo rules to the saved records and returns a status and a coverage level for each system.' },
  { title: 'Explain', body: 'Open any status to see the rule, the records used, what is missing and the next review step.' },
]

const STATUS_MEANINGS = [
  { status: 'normal', text: 'No configured demonstration condition is active in the available required data. It never means healthy or safe for duty.' },
  { status: 'attention', text: 'A documented demonstration rule asks for review. Look at the reason, the records used and the next review step.' },
  { status: 'urgent', text: 'Used only for an explicit immediate-help request. It is recorded in this prototype; no external responder has been contacted.' },
  { status: 'insufficient_data', text: 'Required current inputs are missing, so the area cannot be evaluated. Add the missing data; do not read this as Normal.' },
]

export default function LandingPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const nodes = DOMAINS.map((d) => ({ key: d.key, label: d.orbitLabel, status: LANDING_EXAMPLE_STATUS[d.key] ?? null }))
  const selectedMeta = selected ? domainMeta(selected) : undefined
  const selectedStatus = selected ? (LANDING_EXAMPLE_STATUS[selected] ?? null) : null
  const caption = selectedMeta
    ? `${selectedMeta.orbitLabel} (${selectedMeta.fullLabel}): ${statusText(selectedStatus)} in this example. ${ringStyleFor(selectedStatus) === 'solid' ? 'A solid ring means a status was evaluated.' : 'A dashed ring means not enough data to evaluate.'}`
    : DEFAULT_CAPTION

  // Reveal the status explanation on this page, move focus to it, and respect reduced motion.
  function revealStatuses(e: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(STATUS_ID)
    if (!target) return
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
    window.history.replaceState(null, '', `#${STATUS_ID}`)
  }

  return (
    <div className="ao-landing">
      <section className="ao-hero" aria-labelledby="hero-title">
        <div className="ao-hero__text">
          <h1 id="hero-title" className="ao-hero__title">
            See the whole crew in one orbit.
          </h1>
          <p className="ao-hero__lede">
            AstroOrbitX turns recorded, synthetic health readings into a status for six body systems. Every status points back to the exact records and the rule behind it.
          </p>
          <div className="ao-hero__actions">
            <ButtonLink to={ROUTES.overview.path} onClick={enterDemoMode}>
              Open the demo
            </ButtonLink>
            <a className="ao-btn ao-btn--secondary" href={`#${STATUS_ID}`} onClick={revealStatuses}>
              How statuses are read
            </a>
          </div>
        </div>

        <div className="ao-orbit-panel">
          <OrbitView nodes={nodes} selectedKey={selected} onSelect={setSelected} monogram={initialsOf(LANDING_EXAMPLE_NAME)} groupLabel="Example health systems for a synthetic crew member" />
          <div className="ao-orbit-panel__caption">
            <p className="ao-orbit-panel__live" role="status">
              {caption}
            </p>
            <OrbitLegend />
            <p>Example synthetic crew member. Rings show example statuses only, not live spacecraft telemetry.</p>
          </div>
        </div>
      </section>

      <section className="ao-steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="ao-sr-only">
          How it works
        </h2>
        <ol className="ao-steps__list">
          {STEPS.map((s) => (
            <li key={s.title} className="ao-steps__item">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ao-notdo" aria-labelledby="notdo-title">
        <h2 id="notdo-title">What this prototype will not do</h2>
        <ul className="ao-notdo__list">
          {WILL_NOT.map((w) => (
            <li key={w.title}>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="ao-statuses" aria-labelledby={STATUS_ID}>
        <h2 id={STATUS_ID} tabIndex={-1}>
          How statuses are read
        </h2>
        <p className="ao-statuses__intro">Status and coverage are two separate things. Status says what the demo rules found. Coverage (Complete, Partial or Missing) says how much of the required data was there.</p>
        <ul className="ao-statuses__list">
          {STATUS_MEANINGS.map((m) => (
            <li key={m.status}>
              <StatusBadge status={m.status} />
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="ao-statuses__more">
          Rule values are student-prototype parameters, not NASA thresholds or clinical guidance. Evidence and references are on the <Link to={ROUTES.guidance.path}>Guidance page</Link>.
        </p>
      </section>
    </div>
  )
}
