import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiErrorView } from '../components/ApiErrorView'
import { ButtonLink, EmptyState, LoadingState } from '../components/ui'
import { liveProfilesApi } from '../data/profilesApi'
import { ROUTES } from '../lib/routes'
import type {
  ObservationViewModel,
  ProfileViewModel,
  SleepRecordViewModel,
} from '../types/profiles'

interface ProfileDetailData {
  profile: ProfileViewModel
  observations: ObservationViewModel[]
  sleepRecords: SleepRecordViewModel[]
}

type Load =
  | { state: 'loading' }
  | { state: 'error'; error: unknown }
  | { state: 'ready'; data: ProfileDetailData }

function utcLabel(timestamp: string): string {
  return new Date(timestamp).toISOString().replace('T', ' ').replace('Z', ' UTC')
}

function observationLabel(record: ObservationViewModel): string {
  if (record.metric === 'blood_pressure') return `${record.systolic}/${record.diastolic} ${record.unit}`
  return `${record.value} ${record.unit}`
}

export default function CrewProfilePage() {
  const { profileId = '' } = useParams()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoad({ state: 'loading' })
    Promise.all([
      liveProfilesApi.getProfile(profileId, controller.signal),
      liveProfilesApi.listAllObservations(profileId, controller.signal),
      liveProfilesApi.listAllSleepRecords(profileId, controller.signal),
    ])
      .then(([profile, observations, sleepRecords]) => {
        setLoad({ state: 'ready', data: { profile, observations, sleepRecords } })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoad({ state: 'error', error })
      })
    return () => controller.abort()
  }, [profileId, attempt])

  if (load.state === 'loading') {
    return <LoadingState label="Loading synthetic profile and records" />
  }
  if (load.state === 'error') {
    return <ApiErrorView error={load.error} subject="this synthetic profile" onRetry={() => setAttempt((value) => value + 1)} />
  }

  const { profile, observations, sleepRecords } = load.data
  const addDataPath = `${ROUTES.demoAddData.path}?profileId=${encodeURIComponent(profile.id)}`
  return (
    <div className="ao-profile">
      <p><Link to={ROUTES.crew.path}>Back to profiles</Link></p>
      <header className="ao-profile__head">
        <div className="ao-profile__title">
          <h1>{profile.displayName}</h1>
          <p className="ao-profile__sub">Synthetic · local-only · not for real personal or health data</p>
        </div>
        <ButtonLink to={addDataPath}>Add supported data</ButtonLink>
      </header>
      <section aria-labelledby="profile-facts-title">
        <h2 id="profile-facts-title">Profile details</h2>
        <dl className="ao-detail__facts">
          <div>
            <dt>Profile ID</dt>
            <dd className="ao-mono">{profile.id}</dd>
          </div>
          <div>
            <dt>Synthetic</dt>
            <dd>{profile.isSynthetic ? 'Yes — local-only prototype' : 'No'}</dd>
          </div>
        </dl>
        <p className="ao-help">Profile records are append-only. Profile creation and mutation are not available in the product UI.</p>
      </section>
      <section aria-labelledby="observations-title">
        <h2 id="observations-title">Vital observations</h2>
        {observations.length === 0 ? (
          <EmptyState title="No vital observations" description="No supported synthetic vital observations have been recorded for this profile." />
        ) : (
          <div className="ao-scroll" role="region" tabIndex={0} aria-label="Vital observations, scrolls horizontally on small screens">
            <table className="ao-recent__table ao-profile__table">
              <caption className="ao-sr-only">Synthetic vital observations sorted newest first</caption>
              <thead>
                <tr><th scope="col">Measured at (UTC)</th><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Source</th><th scope="col">Quality</th></tr>
              </thead>
              <tbody>
                {observations.map((record) => (
                  <tr key={record.id}>
                    <td>{utcLabel(record.measuredAt)}</td>
                    <td>{record.metric.replaceAll('_', ' ')}</td>
                    <td>{observationLabel(record)}</td>
                    <td>{record.source}</td>
                    <td>{record.quality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="sleep-records-title">
        <h2 id="sleep-records-title">Sleep-duration records</h2>
        {sleepRecords.length === 0 ? (
          <EmptyState title="No sleep-duration records" description="No supported synthetic sleep-duration records have been recorded for this profile." />
        ) : (
          <div className="ao-scroll" role="region" tabIndex={0} aria-label="Sleep-duration records, scrolls horizontally on small screens">
            <table className="ao-recent__table ao-profile__table">
              <caption className="ao-sr-only">Synthetic sleep-duration records sorted newest first</caption>
              <thead>
                <tr><th scope="col">Reporting date (UTC)</th><th scope="col">Duration</th><th scope="col">Includes naps</th><th scope="col">Source</th><th scope="col">Quality</th><th scope="col">Recorded at (UTC)</th></tr>
              </thead>
              <tbody>
                {sleepRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.reportingDate}</td>
                    <td>{record.durationMinutes} minutes</td>
                    <td>{record.includesNaps ? 'Yes' : 'No'}</td>
                    <td>{record.source}</td>
                    <td>{record.quality}</td>
                    <td>{utcLabel(record.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="ao-help">Only the supported profile, vital observation, and sleep-duration operations are available. No combined history, assessments, trends, diagnoses, or recommendations are provided.</p>
    </div>
  )
}
