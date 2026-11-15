import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiErrorView } from '../components/ApiErrorView'
import { ButtonLink, EmptyState, LoadingState, PageHeading } from '../components/ui'
import { liveProfilesApi } from '../data/profilesApi'
import { avatarTone } from '../lib/crewModel'
import { initialsOf } from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import type { ProfileViewModel } from '../types/profiles'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; profiles: ProfileViewModel[] }

/** Local synthetic workspace profiles; no real-data or assignment claim is made. */
export default function CrewPage() {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const searchId = useId()

  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    liveProfilesApi
      .listAllProfiles(ctrl.signal)
      .then((profiles) => setLoad({ state: 'ready', profiles }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [attempt])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setQuery(draft)
  }

  const heading = <PageHeading title="Profiles" description="Synthetic, local-only profiles in this workspace. No real personal or health data belongs here." />
  if (load.state === 'loading') {
    return (
      <div className="ao-crew">
        {heading}
        <LoadingState label="Loading local synthetic profiles" />
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className="ao-crew">
        {heading}
        <ApiErrorView error={load.error} subject="crew profiles" onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }

  const all = load.profiles
  const needle = query.trim().toLocaleLowerCase()
  const shown = needle ? all.filter((profile) => profile.displayName.toLocaleLowerCase().includes(needle)) : all

  return (
    <div className="ao-crew">
      {heading}
      <p className="ao-help">Synthetic/local-only prototype. Profiles can only be provisioned by the explicit backend development command; no profile mutation API is available.</p>

      {all.length === 0 ? (
        <EmptyState title="No profiles provisioned" description="The workspace starts empty. Use the documented profile-only development command to provision one synthetic profile." />
      ) : (
        <>
          <form className="ao-crew__search" role="search" onSubmit={onSubmit}>
            <div className="ao-field">
              <label className="ao-field__label" htmlFor={searchId}>
                Search by display name
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
              description="No local synthetic profile matches this search."
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
            <ul className="ao-crew__list" aria-label="Synthetic local profiles">
              {shown.map((p) => {
                return (
                  <li key={p.id} className="ao-crew__row">
                    <span className={`ao-avatar ao-avatar--${avatarTone(p.id)}`} aria-hidden="true">
                      {initialsOf(p.displayName)}
                    </span>
                    <div className="ao-crew__who">
                      <p className="ao-crew__name">{p.displayName}</p>
                      <p className="ao-help">Synthetic · local-only</p>
                    </div>
                    <div className="ao-crew__actions">
                      <ButtonLink to={ROUTES.crewProfile.path.replace(':profileId', encodeURIComponent(p.id))} variant="secondary" aria-label={`Profile details for ${p.displayName}`}>
                        Profile details
                      </ButtonLink>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="ao-help ao-crew__foot">
            <Link to={ROUTES.about.path}>About AstroOrbitX</Link>
          </p>
        </>
      )}
    </div>
  )
}
