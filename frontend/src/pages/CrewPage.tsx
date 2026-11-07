import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { ApiErrorView } from '../components/ApiErrorView'
import { ButtonLink, EmptyState, LoadingState, PageHeading } from '../components/ui'
import { crewApiFor } from '../data/crewApi'
import { DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { avatarTone, filterProfiles, missionText, syntheticOnly } from '../lib/crewModel'
import { useDemoMode } from '../lib/demoMode'
import { initialsOf } from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import type { CrewProfileSummary } from '../types/crew'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; profiles: CrewProfileSummary[] }

/** Profiles assigned to the signed-in reviewer. No health readings are requested or shown here. */
export default function CrewPage() {
  const demo = useDemoMode()
  const api = crewApiFor(demo)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const searchId = useId()

  useEffect(() => {
    if (!api) return
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    api
      .listProfiles(ctrl.signal)
      .then((profiles) => setLoad({ state: 'ready', profiles: syntheticOnly(profiles) }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [api, attempt])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setQuery(draft)
  }

  const heading = <PageHeading title="Crew" description="The synthetic profiles assigned to you. No health values are loaded on this page." />
  const banner = demo ? <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p> : null

  if (!api) {
    return (
      <div className="ao-crew">
        {heading}
        <BackendNotConnected what="the crew list" />
      </div>
    )
  }
  if (load.state === 'loading') {
    return (
      <div className="ao-crew">
        {banner}
        {heading}
        <LoadingState label="Loading assigned profiles" />
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className="ao-crew">
        {banner}
        {heading}
        <ApiErrorView error={load.error} subject="crew profiles" onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }

  const all = load.profiles
  const shown = filterProfiles(all, query)

  return (
    <div className="ao-crew">
      {banner}
      {heading}

      {all.length === 0 ? (
        <EmptyState title="No crew profiles assigned" description="Ask the project administrator to configure a synthetic profile. Profiles are created through seed tooling, not in this app." />
      ) : (
        <>
          <form className="ao-crew__search" role="search" onSubmit={onSubmit}>
            <div className="ao-field">
              <label className="ao-field__label" htmlFor={searchId}>
                Search by alias
              </label>
              <input id={searchId} type="search" className="ao-input" placeholder="Type a name, then press Enter" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" />
            </div>
            <p className="ao-help" role="status">
              Showing {shown.length} of {all.length} {all.length === 1 ? 'profile' : 'profiles'}
              {query.trim() && <> matching “{query.trim()}”</>}
            </p>
          </form>

          {shown.length === 0 ? (
            <EmptyState
              title="No profiles match this search"
              description="Only profiles assigned to you can be found."
              action={
                <button
                  type="button"
                  className="ao-linkish"
                  onClick={() => {
                    setDraft('')
                    setQuery('')
                  }}
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <ul className="ao-crew__list" aria-label="Assigned synthetic profiles">
              {shown.map((p) => {
                const mission = missionText(p)
                const q = `?astronaut=${encodeURIComponent(p.id)}`
                return (
                  <li key={p.id} className="ao-crew__row">
                    <span className={`ao-avatar ao-avatar--${avatarTone(p.id)}`} aria-hidden="true">
                      {initialsOf(p.displayName)}
                    </span>
                    <div className="ao-crew__who">
                      <p className="ao-crew__name">
                        <span>{p.displayName}</span> <span className="ao-tag">Synthetic</span>
                      </p>
                      {mission && <p className="ao-help">{mission}</p>}
                    </div>
                    <div className="ao-crew__actions">
                      <ButtonLink to={`${ROUTES.overview.path}${q}`} aria-label={`Open overview for ${p.displayName}`}>
                        Open overview
                      </ButtonLink>
                      <ButtonLink to={`${ROUTES.crew.path}/${encodeURIComponent(p.id)}`} variant="secondary" aria-label={`Profile details for ${p.displayName}`}>
                        Profile details
                      </ButtonLink>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="ao-help ao-crew__foot">
            A reviewer with no assignments sees “No crew profiles assigned”. Profiles and assignments are created through seed tooling, not in this app. <Link to={ROUTES.guidance.path}>How statuses are read</Link>
          </p>
        </>
      )}
    </div>
  )
}
