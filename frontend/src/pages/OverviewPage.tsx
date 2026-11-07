import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Concerns } from '../components/overview/Concerns'
import { DomainDetail } from '../components/overview/DomainDetail'
import { HeartRateChart } from '../components/overview/HeartRateChart'
import { LatestReadings } from '../components/overview/LatestReadings'
import { RecentRecords } from '../components/overview/RecentRecords'
import { OrbitLegend, OrbitView } from '../components/orbit/OrbitView'
import { ApiErrorView } from '../components/ApiErrorView'
import { classifyError } from '../data/errors'
import { Button, ButtonLink, CoverageIndicator, EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge, SuccessMessage, UtcTime } from '../components/ui'
import { ApiError } from '../data/common'
import { overviewApiFor } from '../data/overviewApi'
import { DEMO_FIXTURE_LABEL } from '../fixtures/demoOverview'
import { DOMAINS, domainFullLabel } from '../lib/domains'
import { useDemoMode } from '../lib/demoMode'
import {
  bloodPressureView,
  heartRateView,
  initialsOf,
  recentRecordsForDisplay,
  sleepView,
  statusText,
  temperatureView,
} from '../lib/overviewModel'
import { ROUTES } from '../lib/routes'
import { formatUtcDayMonth, formatUtcDate } from '../lib/time'
import type { OverviewResponse } from '../types/overview'

type Load = { state: 'loading' } | { state: 'error'; error: unknown } | { state: 'ready'; data: OverviewResponse }
type Refresh = { state: 'idle' } | { state: 'loading' } | { state: 'success'; message: string } | { state: 'error'; message: string; requestId?: string }

const DETAIL_ID = 'domain-detail'

function describeError(e: unknown): { message: string; requestId?: string; status?: number } {
  if (e instanceof ApiError) return { message: e.message, requestId: e.requestId, status: e.status }
  return { message: 'The request failed. No data was loaded.' }
}

export default function OverviewPage() {
  const demo = useDemoMode()
  const api = overviewApiFor(demo)
  const [searchParams] = useSearchParams()
  const astronautId = searchParams.get('astronaut')
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<string>(DOMAINS[0].key)
  const [refresh, setRefresh] = useState<Refresh>({ state: 'idle' })

  useEffect(() => {
    if (!api) return
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    setRefresh({ state: 'idle' })
    api
      .loadOverview(astronautId, ctrl.signal)
      .then((data) => setLoad({ state: 'ready', data }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setLoad({ state: 'error', error: e })
      })
    return () => ctrl.abort()
  }, [api, attempt, astronautId])

  const onRefresh = useCallback(async () => {
    if (!api || load.state !== 'ready') return
    const current = load.data
    setRefresh({ state: 'loading' })
    try {
      const result = await api.refreshAssessment(astronautId ?? current.astronaut.id, new AbortController().signal)
      setLoad((prev) => (prev.state === 'ready' ? { state: 'ready', data: { ...prev.data, assessment: result.assessment } } : prev))
      setRefresh({ state: 'success', message: result.message ?? 'Assessment refreshed.' })
    } catch (e) {
      // Keep the last loaded assessment on screen; it is real data. Never swap in fixtures.
      setRefresh({ state: 'error', ...describeError(e) })
    }
  }, [api, load, astronautId])

  // No live backend contract yet and demo mode is off: say so instead of showing anything.
  if (!api) {
    return (
      <div className="ao-overview">
        <PageHeading title="Overview" />
        <EmptyState
          title="The backend is not connected yet"
          description="The overview API contract has not been confirmed, so no assessment is loaded and none is invented. Open the demo to see the screen with clearly labelled synthetic fixtures."
          action={
            <ButtonLink to={ROUTES.login.path} variant="secondary">
              Go to sign in
            </ButtonLink>
          }
        />
      </div>
    )
  }

  if (load.state === 'loading') {
    return (
      <div className="ao-overview">
        {demo && <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p>}
        <PageHeading title="Overview" />
        <LoadingState label="Loading the latest assessment" />
      </div>
    )
  }

  if (load.state === 'error') {
    const c = classifyError(load.error)
    return (
      <div className="ao-overview">
        {demo && <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p>}
        <PageHeading title="Overview" />
        <ApiErrorView error={load.error} subject="the overview" onRetry={() => setAttempt((n) => n + 1)} />
        {!c.retryable && (
          <p>
            <Link to={ROUTES.crew.path}>Back to crew</Link>
          </p>
        )}
      </div>
    )
  }

  const { astronaut, assessment, latestReadings, restingHeartRateTrend, recentRecords } = load.data
  const nodes = DOMAINS.map((d) => {
    const found = assessment?.domains.find((x) => x.domain === d.key)
    return { key: d.key, label: d.orbitLabel, status: found?.status ?? null, coverage: found ? found.coverage : null }
  })
  const selectedDomain = assessment?.domains.find((d) => d.domain === selected)
  const readings = [heartRateView(latestReadings.heartRate), bloodPressureView(latestReadings.bloodPressure), temperatureView(latestReadings.temperature), sleepView(latestReadings.sleepTotal)]
  const records = recentRecordsForDisplay(recentRecords)
  const missionDay = astronaut.missionDay === null ? null : `Mission day ${astronaut.missionDay}`
  const trendDays = restingHeartRateTrend?.days ?? []
  const trendRange =
    trendDays.length > 0
      ? `${formatUtcDayMonth(trendDays[0].date)} to ${formatUtcDate(trendDays[trendDays.length - 1].date)?.replace(' (UTC date)', '')} (UTC)`
      : null
  const noDataDays = trendDays.filter((d) => d.dailyMean === null).map((d) => formatUtcDayMonth(d.date) ?? d.date)

  return (
    <div className="ao-overview">
      {demo && <p className="ao-fixture-banner">{DEMO_FIXTURE_LABEL}</p>}

      <PageHeading
        title={astronaut.displayName}
        description={
          <>
            {missionDay ?? 'Mission day not reported'}. {assessment ? <>Assessment evaluated <UtcTime value={assessment.evaluatedAt} />.</> : 'No assessment has been evaluated yet.'}
          </>
        }
        actions={
          <div className="ao-overview__actions">
            {assessment && (
              <>
                <span className="ao-overall">
                  <span>Overall:</span>
                  <StatusBadge status={assessment.overallStatus} />
                </span>
                <CoverageIndicator coverage={assessment.overallCoverage} />
              </>
            )}
            <Button variant="secondary" onClick={onRefresh} loading={refresh.state === 'loading'}>
              Refresh assessment
            </Button>
            <ButtonLink to={`${ROUTES.addData.path}?astronaut=${encodeURIComponent(astronaut.id)}`}>Add data</ButtonLink>
          </div>
        }
      />

      <p className="ao-sr-only" role="status">
        {refresh.state === 'loading' ? 'Refreshing the assessment' : ''}
      </p>
      {refresh.state === 'success' && (
        <div className="ao-overview__feedback">
          <SuccessMessage title="Assessment refreshed">
            {refresh.message}{assessment && (<> Evaluated <UtcTime value={assessment.evaluatedAt} />.</>)}
          </SuccessMessage>
        </div>
      )}
      {refresh.state === 'error' && (
        <div className="ao-overview__feedback">
          <ErrorState title="Could not refresh the assessment" message={`${refresh.message} The assessment below is the last one that loaded, evaluated at its time shown above.`} requestId={refresh.requestId} onRetry={onRefresh} retryLabel="Try refresh again" />
        </div>
      )}

      {assessment ? (
        <div className="ao-overview__top">
          <div className="ao-orbit-panel">
            <OrbitView
              nodes={nodes}
              selectedKey={selected}
              onSelect={setSelected}
              monogram={initialsOf(astronaut.displayName)}
              centerSub={astronaut.missionDay === null ? undefined : `Day ${astronaut.missionDay}`}
              groupLabel={`Health systems for ${astronaut.displayName}`}
              controlsId={DETAIL_ID}
              showStatusText
            />
            <div className="ao-orbit-panel__caption">
              <p className="ao-orbit-panel__live" role="status">
                Showing {domainFullLabel(selected)}: {statusText(selectedDomain?.status ?? null)}.
              </p>
              <p>Select a system to read the reason behind its status. A dashed ring means not enough data to evaluate.</p>
              <OrbitLegend />
            </div>
          </div>

          <div className="ao-overview__side">
            <DomainDetail id={DETAIL_ID} domainKey={selected} domain={selectedDomain} assessmentHref={`${ROUTES.assessment.path}?astronaut=${encodeURIComponent(astronaut.id)}&domain=${selected}`} />
            <Concerns concerns={assessment.unresolvedConcerns} />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No assessment yet for this profile"
          description="Nothing has been evaluated, so no status is shown and none is assumed. This is not a Normal result. Add data, then refresh the assessment."
        />
      )}

      <LatestReadings readings={readings} />

      <div className="ao-overview__bottom">
        <section className="ao-trend" aria-labelledby="trend-title">
          <h2 id="trend-title">Resting heart rate by day</h2>
          {restingHeartRateTrend && trendRange ? (
            <>
              <p className="ao-help">
                {trendRange}. Daily mean of valid resting readings, in {restingHeartRateTrend.unit}.{noDataDays.length > 0 && ` ${noDataDays.join(', ')} ${noDataDays.length === 1 ? 'has' : 'have'} no data.`}
              </p>
              <HeartRateChart trend={restingHeartRateTrend} />
              <p>
                <Link to={`${ROUTES.trends.path}?astronaut=${encodeURIComponent(astronaut.id)}`}>See the data table and other metrics</Link>
              </p>
            </>
          ) : (
            <EmptyState title="No resting heart rate trend was returned" description="Nothing is drawn, and no values are filled in." />
          )}
        </section>
        <RecentRecords records={records} astronautId={astronaut.id} />
      </div>
    </div>
  )
}
