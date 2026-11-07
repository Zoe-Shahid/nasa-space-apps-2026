import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { VitalEntryForm } from '../components/entry/VitalEntryForm'
import { ApiErrorView } from '../components/ApiErrorView'
import { ButtonLink, EmptyState, LoadingState, PageHeading, Tabs } from '../components/ui'
import { crewApiFor } from '../data/crewApi'
import { entryApiFor } from '../data/entryApi'
import { DEMO_ASTRONAUT_ID, DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { useDemoMode } from '../lib/demoMode'
import { ROUTES } from '../lib/routes'
import { VITAL_FORMS } from '../lib/vitalForms'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; name: string }

export default function AddDataPage() {
  const demo = useDemoMode()
  const crew = crewApiFor(demo)
  const entry = entryApiFor(demo)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const astronautId = params.get('astronaut') ?? (demo ? DEMO_ASTRONAUT_ID : null)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // Look the profile up first: it gives the name and proves this reviewer may add data for it.
  useEffect(() => {
    if (!crew || !astronautId) return
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    crew
      .getProfile(astronautId, ctrl.signal)
      .then((p) => setLoad({ state: 'ready', name: p.displayName }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [crew, astronautId, attempt])

  const banner = demo ? <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL} Saving records stores nothing.</p> : null
  const overviewHref = astronautId ? `${ROUTES.overview.path}?astronaut=${encodeURIComponent(astronautId)}` : ROUTES.overview.path

  let body
  if (!crew || !entry) body = <BackendNotConnected what="saving records" />
  else if (!astronautId)
    body = <EmptyState title="Choose a profile first" description="Add data needs a crew profile. Open one from the crew list." action={<ButtonLink to={ROUTES.crew.path}>Go to crew</ButtonLink>} />
  else if (load.state === 'loading') body = <LoadingState label="Loading profile" />
  else if (load.state === 'error') {
    body = (
      <>
        <ApiErrorView error={load.error} subject="this profile" onRetry={() => setAttempt((n) => n + 1)} />
        <p>
          <Link to={ROUTES.crew.path}>Back to crew</Link>
        </p>
      </>
    )
  } else {
    const name = load.name
    body = (
      <div className="ao-add">
        <div className="ao-add__main">
          <p className="ao-field__label">Metric</p>
          <Tabs
            label="Metric"
            variant="pill"
            tabs={VITAL_FORMS.map((cfg) => ({
              id: cfg.metric,
              label: cfg.tabLabel,
              panel: <VitalEntryForm key={cfg.metric} config={cfg} astronautId={astronautId} api={entry} onCancel={() => navigate(overviewHref)} />,
            }))}
          />
          <p className="ao-sr-only">Adding data for {name}</p>
        </div>
        <aside className="ao-add__aside" aria-label="About this form">
          <section>
            <h2>About these input checks</h2>
            <p>They only confirm the entry is well formed. A value that passes is not marked healthy, and no range here is a normal range.</p>
          </section>
          <section>
            <h2>Other forms</h2>
            <p>Sleep, daily check-in, request support, symptoms, exercise and radiation (reviewer only) are not in this build. They need confirmed backend request models first.</p>
          </section>
          <section>
            <h2>After you save</h2>
            <ul>
              <li>You see the saved record ID.</li>
              <li>The latest assessment loads next.</li>
              <li>If that load fails, you can refresh it. The record is never submitted twice.</li>
            </ul>
          </section>
          <section>
            <h2>Not connected</h2>
            <p>No live device feed. Wearables, ECG and lab results are future integrations.</p>
          </section>
        </aside>
      </div>
    )
  }

  const name = load.state === 'ready' ? load.name : null
  return (
    <div className="ao-entry-page">
      {banner}
      <PageHeading title="Add data" description={name ? `Record a synthetic vital sign for ${name}. Do not enter real personal records.` : 'Record a synthetic vital sign. Do not enter real personal records.'} />
      {body}
    </div>
  )
}
