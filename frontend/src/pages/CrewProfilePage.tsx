import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { ApiErrorView } from '../components/ApiErrorView'
import { ButtonLink, CoverageIndicator, LoadingState, QualityBadge, StatusBadge, Tabs, UtcTime } from '../components/ui'
import { crewApiFor } from '../data/crewApi'
import { DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { measurementRows, profileSubtitle } from '../lib/crewModel'
import { useDemoMode } from '../lib/demoMode'
import { DOMAINS } from '../lib/domains'
import { glyphFor, initialsOf, ringStyleFor, statusText } from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import { formatUtcDayMonthYear } from '../lib/time'
import type { CrewProfileDetail } from '../types/crew'
import { avatarTone } from '../lib/crewModel'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; profile: CrewProfileDetail }

export default function CrewProfilePage() {
  const { profileId = '' } = useParams()
  const demo = useDemoMode()
  const api = crewApiFor(demo)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!api) return
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    api
      .getProfile(profileId, ctrl.signal)
      .then((profile) => setLoad({ state: 'ready', profile }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [api, profileId, attempt])

  const back = (
    <p>
      <Link to={ROUTES.crew.path}>Back to crew</Link>
    </p>
  )
  // Loading, error and not-connected states show no profile name yet, so they carry a hidden page title for screen readers.
  const stateTitle = <h1 className="ao-sr-only">Crew profile</h1>
  const banner = demo ? <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p> : null

  if (!api) {
    return (
      <div className="ao-profile">
        {back}
        {stateTitle}
        <BackendNotConnected what="crew profiles" />
      </div>
    )
  }
  if (load.state === 'loading') {
    return (
      <div className="ao-profile">
        {banner}
        {back}
        {stateTitle}
        <LoadingState label="Loading profile" />
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className="ao-profile">
        {banner}
        {back}
        {stateTitle}
        <ApiErrorView error={load.error} subject="this profile" onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }

  const p = load.profile
  const rows = measurementRows(p.recentMeasurements)
  const q = `?astronaut=${encodeURIComponent(p.id)}`

  const measurements = (
    <section aria-labelledby="meas-title">
      <div className="ao-section-head">
        <h2 id="meas-title">Recent measurements</h2>
        <Link to={`${ROUTES.history.path}${q}`}>See all records</Link>
      </div>
      <p className="ao-help">Latest loaded records. Suspect records stay visible with a warning and are left out of the rules.</p>
      {rows.length === 0 ? (
        <p className="ao-recent__empty">No measurements are loaded for this profile.</p>
      ) : (
        <div className="ao-scroll" tabIndex={0} role="region" aria-label="Recent measurements table, scrolls sideways on small screens">
          <table className="ao-recent__table ao-profile__table">
            <caption className="ao-sr-only">Recent measurements, times in UTC</caption>
            <thead>
              <tr>
                <th scope="col">Time (UTC)</th>
                <th scope="col">Metric</th>
                <th scope="col">Value</th>
                <th scope="col">Context</th>
                <th scope="col">Quality</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.timeText}</td>
                  <td>{r.metric}</td>
                  <td>{r.valueText}</td>
                  <td>{r.context}</td>
                  <td>
                    <QualityBadge quality={r.quality} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const a = p.latestAssessment
  const assessment = (
    <section aria-labelledby="assess-title">
      <h2 id="assess-title">Latest assessment</h2>
      {a ? (
        <div className="ao-profile__assess">
          <p className="ao-profile__overall">
            <span className="ao-overall">
              <span>Overall:</span>
              <StatusBadge status={a.overallStatus} />
            </span>
            <CoverageIndicator coverage={a.overallCoverage} />
          </p>
          <ul className="ao-chips" aria-label="Status by health system">
            {DOMAINS.map((d) => {
              const status = a.domains.find((x) => x.domain === d.key)?.status ?? null
              return (
                <li key={d.key} className="ao-chip" data-ring={ringStyleFor(status)} data-status={status ?? 'unreported'}>
                  <span className="ao-chip__ring" aria-hidden="true">
                    {glyphFor(status)}
                  </span>
                  <span>
                    {d.orbitLabel}
                    <span className="ao-sr-only">: {statusText(status)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="ao-help">
            Evaluated <UtcTime value={a.evaluatedAt} />.
          </p>
          <Link to={`${ROUTES.assessment.path}${q}`}>Read the reasons</Link>
        </div>
      ) : (
        <p className="ao-recent__empty">No assessment has been evaluated for this profile yet. This is not a Normal result.</p>
      )}
    </section>
  )

  const created = p.createdAt ? formatUtcDayMonthYear(p.createdAt) : null
  const details = (
    <section aria-labelledby="details-title">
      <h2 id="details-title">Profile details</h2>
      <dl className="ao-detail__facts">
        <div>
          <dt>Profile ID</dt>
          <dd className="ao-mono">{p.id}</dd>
        </div>
        {created && (
          <div>
            <dt>Created</dt>
            <dd>{created}</dd>
          </div>
        )}
        {p.reviewer && (
          <div>
            <dt>Reviewer</dt>
            <dd>{p.reviewer}</dd>
          </div>
        )}
        {p.baselines !== undefined && (
          <div>
            <dt>Baselines</dt>
            <dd>{p.baselines.length === 0 ? 'None recorded' : p.baselines.map((b) => `${b.label} ${b.version} (${b.active ? 'active' : 'inactive'})`).join(', ')}</dd>
          </div>
        )}
        {p.radiationStream !== undefined && p.radiationStream !== null && (
          <div>
            <dt>Radiation stream</dt>
            <dd>{p.radiationStream.configured ? `Configured${p.radiationStream.label ? `: ${p.radiationStream.label}` : ''}` : 'Not configured'}</dd>
          </div>
        )}
      </dl>
      <p className="ao-help">Profiles and assignments are created through seed tooling, not in this app.</p>
    </section>
  )

  const summary = (
    <div className="ao-profile__grid">
      {measurements}
      <div className="ao-profile__side">
        {assessment}
        {details}
      </div>
    </div>
  )

  return (
    <div className="ao-profile">
      {banner}
      {back}
      <header className="ao-profile__head">
        <span className={`ao-avatar ao-avatar--lg ao-avatar--${avatarTone(p.id)}`} aria-hidden="true">
          {initialsOf(p.displayName)}
        </span>
        <div className="ao-profile__title">
          <h1>{p.displayName}</h1>
          <p className="ao-profile__sub">{profileSubtitle(p)}</p>
        </div>
        <ButtonLink to={`${ROUTES.overview.path}${q}`}>Open overview</ButtonLink>
      </header>

      <Tabs
        label="Profile sections"
        variant="line"
        tabs={[
          { id: 'summary', label: 'Summary', panel: summary },
          {
            id: 'measurements',
            label: 'Measurements',
            panel: (
              <div className="ao-profile__single">
                {measurements}
                <p>
                  <Link to={`${ROUTES.history.path}${q}`}>Open all records in History</Link>
                </p>
              </div>
            ),
          },
          {
            id: 'assessment',
            label: 'Assessment',
            panel: (
              <div className="ao-profile__single">
                {assessment}
                <p>
                  <Link to={`${ROUTES.assessment.path}${q}`}>Open the full assessment</Link>
                </p>
              </div>
            ),
          },
          {
            id: 'trends',
            label: 'Trends',
            panel: (
              <div className="ao-profile__single">
                <h2>Trends</h2>
                <p>Trend charts are calculated by the backend and shown on the Trends page. They describe what was recorded; they are not predictions.</p>
                <p>
                  <Link to={`${ROUTES.trends.path}${q}`}>Open Trends</Link>
                </p>
              </div>
            ),
          },
          {
            id: 'about',
            label: 'About',
            panel: (
              <div className="ao-profile__single">
                {details}
                <p className="ao-help">This is a synthetic profile for a hackathon prototype. Do not enter real personal records.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
