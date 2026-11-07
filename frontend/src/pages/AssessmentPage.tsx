import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BackendNotConnected } from '../components/BackendNotConnected'
import { ApiErrorView } from '../components/ApiErrorView'
import { Button, CoverageIndicator, EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge, SuccessMessage, UtcTime } from '../components/ui'
import { ApiError } from '../data/common'
import { assessmentApiFor } from '../data/assessmentApi'
import { DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { domainRows, initialDomain, supplied, unresolvedText, versionText } from '../lib/assessmentModel'
import { useDemoMode } from '../lib/demoMode'
import { DOMAIN_LIMITS } from '../lib/domains'
import { joinList, statusText } from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import { useAstronautId } from '../lib/useAstronautId'
import type { AssessmentDetail } from '../types/assessment'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; data: AssessmentDetail | null }
type Refresh = { state: 'idle' } | { state: 'loading' } | { state: 'success'; message: string } | { state: 'error'; message: string; requestId?: string }

const DETAIL_ID = 'assessment-detail'

function errorInfo(e: unknown): { message: string; requestId?: string; status?: number } {
  return e instanceof ApiError ? { message: e.message, requestId: e.requestId, status: e.status } : { message: 'The request failed. No assessment was loaded.' }
}

/** A field the backend did not supply. Shown plainly, never filled in. */
function Unavailable() {
  return <span className="ao-unavailable">Not provided by the backend</span>
}

export default function AssessmentPage() {
  const demo = useDemoMode()
  const api = assessmentApiFor(demo)
  const astronautId = useAstronautId()
  const [params, setParams] = useSearchParams()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState(() => initialDomain(params.get('domain')))
  const [refresh, setRefresh] = useState<Refresh>({ state: 'idle' })

  useEffect(() => {
    if (!api || !astronautId) return
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    setRefresh({ state: 'idle' })
    api
      .getAssessment(astronautId, ctrl.signal)
      .then((data) => setLoad({ state: 'ready', data }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [api, astronautId, attempt])

  const onRefresh = useCallback(async () => {
    if (!api || !astronautId) return
    setRefresh({ state: 'loading' })
    try {
      const res = await api.refreshAssessment(astronautId, new AbortController().signal)
      setLoad({ state: 'ready', data: res.assessment })
      setRefresh({ state: 'success', message: res.message ?? 'Assessment refreshed.' })
    } catch (e) {
      // The last loaded assessment stays on screen. Fixtures are never swapped in.
      setRefresh({ state: 'error', ...errorInfo(e) })
    }
  }, [api, astronautId])

  function select(key: string) {
    setSelected(key)
    const next = new URLSearchParams(params)
    next.set('domain', key)
    setParams(next, { replace: true })
  }

  const banner = demo ? <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p> : null
  const shell = (children: ReactNode) => (
    <div className="ao-assess">
      {banner}
      {children}
    </div>
  )

  if (!api) return shell(<><PageHeading title="Assessment" /><BackendNotConnected what="the assessment" /></>)
  if (!astronautId) return shell(<><PageHeading title="Assessment" /><EmptyState title="Choose a profile first" description="The assessment belongs to one crew profile. Open one from the crew list." action={<Link to={ROUTES.crew.path}>Go to crew</Link>} /></>)
  if (load.state === 'loading') return shell(<><PageHeading title="Assessment" /><LoadingState label="Loading the assessment" /></>)
  if (load.state === 'error') {
    return shell(
      <>
        <PageHeading title="Assessment" />
        <ApiErrorView error={load.error} subject="the assessment" onRetry={() => setAttempt((n) => n + 1)} />
        <p>
          <Link to={ROUTES.crew.path}>Back to crew</Link>
        </p>
      </>,
    )
  }

  const a = load.data
  if (!a) {
    return shell(
      <>
        <PageHeading title="Assessment" />
        <EmptyState title="No assessment yet for this profile" description="Nothing has been evaluated, so no status is shown and none is assumed. This is not a Normal result." action={<Link to={`${ROUTES.addData.path}?astronaut=${encodeURIComponent(astronautId)}`}>Add data</Link>} />
      </>,
    )
  }

  const rows = domainRows(a)
  const current = rows.find((r) => r.meta.key === selected) ?? rows[0]
  const d = current.detail
  const counts = unresolvedText(a.unresolved)
  const q = `?astronaut=${encodeURIComponent(astronautId)}`
  const reason = supplied(d?.reason)
  const observed = supplied(d?.observed)
  const comparison = supplied(d?.comparison)
  const missing = supplied(d?.missingInputs)
  const next = supplied(d?.nextReviewStep)
  const ruleIds = d?.ruleIds ?? []
  const ruleResults = d?.ruleResults ?? []

  return shell(
    <>
      <PageHeading
        title="Assessment"
        description={
          <>
            {a.astronaut.displayName}. Evaluated <UtcTime value={a.evaluatedAt} />
            {versionText(a)}.
          </>
        }
      />

      <div className="ao-assess__summary">
        <span className="ao-overall">
          <span>Overall:</span>
          <StatusBadge status={a.overallStatus} />
        </span>
        <CoverageIndicator coverage={a.overallCoverage} />
        <span className="ao-help ao-assess__counts">{counts ?? 'Unresolved Attention and Urgent counts were not provided by the backend.'}</span>
        <Button variant="secondary" onClick={onRefresh} loading={refresh.state === 'loading'}>
          Refresh assessment
        </Button>
      </div>

      <p className="ao-sr-only" role="status">
        {refresh.state === 'loading' ? 'Refreshing the assessment' : ''}
      </p>
      {refresh.state === 'success' && (
        <div className="ao-assess__feedback">
          <SuccessMessage title="Assessment refreshed">
            {refresh.message} Evaluated <UtcTime value={a.evaluatedAt} />.
          </SuccessMessage>
        </div>
      )}
      {refresh.state === 'error' && (
        <div className="ao-assess__feedback">
          <ErrorState title="Could not refresh the assessment" message={`${refresh.message} The assessment below is the last one that loaded.`} requestId={refresh.requestId} onRetry={onRefresh} retryLabel="Try refresh again" />
        </div>
      )}

      <div className="ao-assess__grid">
        <div className="ao-assess__left">
          <ul className="ao-assess__list" aria-label="Health systems">
            {rows.map((r) => {
              const isSel = r.meta.key === current.meta.key
              return (
                <li key={r.meta.key}>
                  <button type="button" className="ao-assess__row" aria-pressed={isSel} aria-controls={DETAIL_ID} onClick={() => select(r.meta.key)}>
                    <span className="ao-assess__name">{r.meta.fullLabel}</span>
                    {r.detail ? <StatusBadge status={r.detail.status} /> : <span className="ao-badge ao-badge--unsupported">Not reported</span>}
                    <span className="ao-assess__cov">
                      <span className="ao-sr-only">Coverage: </span>
                      {r.detail ? <CoverageIndicator coverage={r.detail.coverage} prefix="" /> : <span className="ao-help">Not reported</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="ao-help">Status and coverage are separate. Normal means no configured demo concern was triggered by the available required inputs. It is not a health clearance. Insufficient Data is never shown as Normal.</p>
        </div>

        <section id={DETAIL_ID} className="ao-assess__detail" aria-labelledby={`${DETAIL_ID}-title`}>
          <p className="ao-sr-only" role="status">
            Showing {current.meta.fullLabel}: {statusText(d?.status ?? null)}.
          </p>
          <div className="ao-detail__head">
            <h2 id={`${DETAIL_ID}-title`}>Why: {current.meta.fullLabel}</h2>
            {d ? <StatusBadge status={d.status} /> : <span className="ao-badge ao-badge--unsupported">Not reported</span>}
          </div>
          {d ? <CoverageIndicator coverage={d.coverage} /> : <p className="ao-help">The backend did not return this system, so no status is shown. This is not a Normal result.</p>}

          <dl className="ao-detail__facts ao-assess__facts">
            <div>
              <dt>Reason</dt>
              <dd>{reason ?? <Unavailable />}</dd>
            </div>
            <div>
              <dt>Rule</dt>
              <dd>{ruleIds.length > 0 ? joinList(ruleIds) : <Unavailable />}</dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{observed ?? <Unavailable />}</dd>
            </div>
            <div>
              <dt>Comparison</dt>
              <dd>{comparison ?? <Unavailable />}</dd>
            </div>
            <div>
              <dt>Missing inputs</dt>
              <dd>{missing ?? <Unavailable />}</dd>
            </div>
            <div>
              <dt>Latest record</dt>
              <dd>
                {d?.latestRecordAt ? <UtcTime value={d.latestRecordAt} format="short" /> : 'No relevant record'}
                {d && (
                  <>
                    {' '}
                    <Link to={`${ROUTES.history.path}${q}`}>See the records used</Link>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Next review step</dt>
              <dd>{next ?? <Unavailable />}</dd>
            </div>
          </dl>

          <section aria-labelledby={`${DETAIL_ID}-rules`}>
            <h3 id={`${DETAIL_ID}-rules`} className="ao-assess__rules-title">
              Rule results
            </h3>
            {ruleResults.length > 0 ? (
              <ul className="ao-assess__rules">
                {ruleResults.map((r) => (
                  <li key={r.ruleId}>
                    <strong>{r.ruleId}</strong> <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ao-help">No individual rule results were supplied.</p>
            )}
          </section>

          <p className="ao-help">{DOMAIN_LIMITS[current.meta.key]}</p>
        </section>
      </div>
    </>,
  )
}
