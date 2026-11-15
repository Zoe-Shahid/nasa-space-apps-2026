import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiErrorView } from '../components/ApiErrorView'
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeading, Select, TextInput } from '../components/ui'
import { ApiError } from '../data/common'
import { classifyError } from '../data/errors'
import { liveProfilesApi } from '../data/profilesApi'
import {
  buildRecordRequest,
  idempotencyFingerprint,
  SubmissionGate,
  type NewRecordPayload,
  type RecordDraft,
} from '../lib/recordSubmission'
import type { ProfileViewModel } from '../types/profiles'

const initialDraft: RecordDraft = {
  metric: '',
  value: '',
  systolic: '',
  diastolic: '',
  measuredAt: '',
  durationMinutes: '',
  reportingDate: '',
  includesNaps: '',
  source: 'manual',
  quality: 'valid',
}

type ProfileLoad =
  | { state: 'loading' }
  | { state: 'error'; error: unknown }
  | { state: 'ready'; profiles: ProfileViewModel[] }

type SaveStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; replayed: boolean }
  | { state: 'rejected' }
  | { state: 'unknown' }

export function RecordSaveStatus({ status }: { status: SaveStatus }) {
  if (status.state === 'saving') return <p role="status">Saving to the local synthetic workspace…</p>
  if (status.state === 'saved') {
    return (
      <div className="ao-state ao-state--success" role="status">
        <p className="ao-state__title">{status.replayed ? 'Previously saved synthetic record confirmed' : 'Synthetic record persisted'}</p>
        <p className="ao-state__body">This local-only record was confirmed by the backend. It is not real personal or health data.</p>
      </div>
    )
  }
  if (status.state === 'rejected') {
    return <p role="alert">The server rejected this record. No saved confirmation was received.</p>
  }
  if (status.state === 'unknown') {
    return (
      <p role="alert">
        The outcome is unknown: the record may have been saved even though confirmation was not received.
        Retry the unchanged submission to check safely.
      </p>
    )
  }
  return null
}

export default function AddDataPage() {
  const [profiles, setProfiles] = useState<ProfileLoad>({ state: 'loading' })
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [profileId, setProfileId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('profileId') ?? ''
  })
  const [draft, setDraft] = useState<RecordDraft>(initialDraft)
  const [status, setStatus] = useState<SaveStatus>({ state: 'idle' })
  const [formError, setFormError] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<unknown>(null)
  const gate = useRef(new SubmissionGate())
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null)
  const pendingAttempt = useRef<{ profileId: string; request: NewRecordPayload } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    liveProfilesApi
      .listAllProfiles(controller.signal)
      .then((items) => {
        setProfiles({ state: 'ready', profiles: items })
        setProfileId((current) => current && !items.some((profile) => profile.id === current) ? '' : current)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setProfiles({ state: 'error', error })
      })
    return () => controller.abort()
  }, [profileAttempt])

  function updateDraft(patch: Partial<RecordDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setFormError(null)
    if (status.state === 'rejected' || status.state === 'saved') setStatus({ state: 'idle' })
    setRequestError(null)
  }

  async function submitRequest(targetProfileId: string, request: NewRecordPayload) {
    setFormError(null)
    setRequestError(null)
    setStatus({ state: 'saving' })
    try {
      const result = await gate.current.run(async () => {
        if ('metric' in request) {
          return liveProfilesApi.createObservation(targetProfileId, request)
        }
        return liveProfilesApi.createSleepRecord(targetProfileId, request)
      })
      if (!result.accepted) return
      pendingAttempt.current = null
      setStatus({ state: 'saved', replayed: result.value.replayed })
    } catch (error) {
      setRequestError(error)
      const { kind } = classifyError(error)
      setStatus({
        state: kind === 'network' || kind === 'server' || kind === 'unknown' ? 'unknown' : 'rejected',
      })
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (gate.current.isActive || status.state === 'saved' || status.state === 'unknown') return

    let request: NewRecordPayload
    try {
      request = buildRecordRequest(profileId, draft, '')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Check the entered values.')
      return
    }

    const fingerprint = idempotencyFingerprint(profileId, request)
    if (idempotency.current?.fingerprint !== fingerprint) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() }
    }
    request = { ...request, client_record_id: idempotency.current.key }
    pendingAttempt.current = { profileId, request }
    await submitRequest(profileId, request)
  }

  async function retryUnknownSubmission() {
    const attempt = pendingAttempt.current
    if (!attempt || gate.current.isActive) return
    await submitRequest(attempt.profileId, attempt.request)
  }

  function addAnother() {
    setDraft(initialDraft)
    setStatus({ state: 'idle' })
    setFormError(null)
    setRequestError(null)
    idempotency.current = null
    pendingAttempt.current = null
  }

  const isReady = profiles.state === 'ready'
  const profileOptions = [
    { value: '', label: 'Choose a synthetic profile', disabled: true },
    ...(isReady ? profiles.profiles.map((profile) => ({ value: profile.id, label: `${profile.displayName} · synthetic` })) : []),
  ]
  const metricOptions = [
    { value: '', label: 'Choose a supported record type', disabled: true },
    { value: 'heart_rate', label: 'Heart rate' },
    { value: 'blood_pressure', label: 'Blood pressure' },
    { value: 'body_temperature', label: 'Body temperature observation' },
    { value: 'sleep_duration', label: 'Sleep duration' },
  ]

  const saved = status.state === 'saved'
  const inFlight = status.state === 'saving'
  const outcomeUnknown = status.state === 'unknown'

  return (
    <div className="ao-entry-page">
      <PageHeading
        title="Add synthetic data"
        description="Local-only synthetic prototype. Never enter real astronaut, patient, crew, or other personal health data."
      />
      {profiles.state === 'loading' && <LoadingState label="Loading local synthetic profiles" />}
      {profiles.state === 'error' && <ApiErrorView error={profiles.error} subject="synthetic profiles" onRetry={() => { setProfiles({ state: 'loading' }); setProfileAttempt((attempt) => attempt + 1) }} />}
      {profiles.state === 'ready' && profiles.profiles.length === 0 && (
        <EmptyState
          title="No synthetic profiles available"
          description="The workspace starts empty. Provision a profile with the explicit profile-only development command; this page cannot create profiles."
        />
      )}

      <section className="ao-entry-availability" aria-labelledby="ao-entry-availability-title">
        <h2 id="ao-entry-availability-title">Available synthetic record types</h2>
        <p>These are simple local record-entry operations only. No clinical thresholds, interpretations, or recommendations are applied.</p>
        <div className="ao-entry-categories">
          {[
            ['Vital observations', 'Heart rate (bpm), blood pressure (mmHg), and body temperature (°C). Temperature is an observation, not a symptom or diagnosis.'],
            ['Sleep duration', 'Positive integer minutes, a UTC reporting date, and an includes-naps flag. No sleep quality or fatigue scale.'],
          ].map(([title, description]) => (
            <Card key={title} heading={title} headingLevel={3} className="ao-entry-category">
              <p className="ao-entry-category__records">{description}</p>
              <p className="ao-help">Synthetic · local-only · append-only</p>
            </Card>
          ))}
        </div>
        <h2>Unavailable operations</h2>
        <div className="ao-entry-categories">
          {[
            ['Psychological check-ins', 'No scales, notes, or check-in records.'],
            ['Symptoms and diagnoses', 'No symptom or diagnosis records; temperature is not a symptom report.'],
            ['Support requests', 'No support draft, delivery, or acknowledgement capability.'],
            ['Exercise and activity', 'No exercise plans or logs.'],
            ['Radiation records', 'No radiation quantity, unit, or exposure interpretation is available.'],
            ['Assessment and status', 'No assessment operation or approved rules; readings are never converted into health status.'],
            ['Baselines and trends', 'No baseline or trend operation; no aggregation or interpolation is performed.'],
            ['Alerts and combined timeline', 'No alert, notification, or cross-domain timeline operation.'],
          ].map(([title, description]) => (
            <Card key={title} heading={title} headingLevel={3} className="ao-entry-category">
              <p className="ao-entry-category__records">{description}</p>
              <p className="ao-entry-category__status">Unavailable</p>
            </Card>
          ))}
        </div>
      </section>

      {isReady && profiles.profiles.length > 0 && (
        <section className="ao-entry-unavailable" aria-labelledby="ao-record-entry-title">
          <h2 id="ao-record-entry-title">Create a synthetic record</h2>
          <p>Values are sent only after you submit. A success message appears only after the backend confirms persistence.</p>
          <form className="ao-entry" onSubmit={(event) => void onSubmit(event)}>
            <Select
              label="Synthetic profile"
              options={profileOptions}
              value={profileId}
              disabled={inFlight || saved || outcomeUnknown}
              onChange={(event) => {
                setProfileId(event.target.value)
                setStatus({ state: 'idle' })
                setRequestError(null)
                idempotency.current = null
              }}
              required
            />
            <Select
              label="Record type"
              options={metricOptions}
              value={draft.metric}
              disabled={inFlight || saved || outcomeUnknown}
              onChange={(event) => updateDraft({ metric: event.target.value as RecordDraft['metric'] })}
              required
            />

            {draft.metric === 'heart_rate' && (
              <TextInput label="Heart rate" type="number" min="0" step="any" required value={draft.value} unit="bpm" disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ value: event.target.value })} />
            )}
            {draft.metric === 'blood_pressure' && (
              <div className="ao-entry__row ao-entry__row--2">
                <TextInput label="Systolic pressure" type="number" min="0" step="any" required value={draft.systolic} unit="mmHg" disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ systolic: event.target.value })} />
                <TextInput label="Diastolic pressure" type="number" min="0" step="any" required value={draft.diastolic} unit="mmHg" disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ diastolic: event.target.value })} />
              </div>
            )}
            {draft.metric === 'body_temperature' && (
              <TextInput label="Body temperature observation" type="number" min="0" step="any" required value={draft.value} unit="°C" disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ value: event.target.value })} />
            )}
            {draft.metric && draft.metric !== 'sleep_duration' && (
              <TextInput
                label="Measured at (your local time)"
                type="datetime-local"
                required
                value={draft.measuredAt}
                disabled={inFlight || saved || outcomeUnknown}
                hint="The selected instant is normalized and sent as UTC."
                onChange={(event) => updateDraft({ measuredAt: event.target.value })}
              />
            )}
            {draft.metric === 'sleep_duration' && (
              <>
                <TextInput label="Sleep duration" type="number" min="1" step="1" required value={draft.durationMinutes} unit="minutes" disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ durationMinutes: event.target.value })} />
                <TextInput label="Reporting date (UTC)" type="date" required value={draft.reportingDate} disabled={inFlight || saved || outcomeUnknown} onChange={(event) => updateDraft({ reportingDate: event.target.value })} />
                <Select
                  label="Includes naps"
                  options={[
                    { value: '', label: 'Choose an option', disabled: true },
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                  ]}
                  value={draft.includesNaps}
                  disabled={inFlight || saved || outcomeUnknown}
                  onChange={(event) => updateDraft({ includesNaps: event.target.value })}
                  required
                />
              </>
            )}
            <div className="ao-entry__row ao-entry__row--2">
              <Select
                label="Source"
                options={[
                  { value: 'manual', label: 'manual' },
                  { value: 'simulated_device', label: 'simulated_device' },
                ]}
                value={draft.source}
                disabled={inFlight || saved || outcomeUnknown}
                onChange={(event) => updateDraft({ source: event.target.value as RecordDraft['source'] })}
              />
              <Select
                label="Quality"
                options={[
                  { value: 'valid', label: 'valid' },
                  { value: 'suspect', label: 'suspect' },
                  { value: 'invalid', label: 'invalid' },
                ]}
                value={draft.quality}
                disabled={inFlight || saved || outcomeUnknown}
                onChange={(event) => updateDraft({ quality: event.target.value as RecordDraft['quality'] })}
              />
            </div>
            {formError && <p className="ao-field__error" role="alert">{formError}</p>}
            <RecordSaveStatus status={status} />
            {requestError !== null && status.state === 'rejected' && (
              <ApiErrorView error={requestError} subject="this synthetic record" />
            )}
            {requestError !== null && outcomeUnknown && (
              <ErrorState
                title="Save outcome unknown"
                message="The server may have saved this record. Retrying the unchanged request uses the same client_record_id, so the backend can safely return the original result."
                requestId={requestError instanceof ApiError ? requestError.requestId : undefined}
                onRetry={() => void retryUnknownSubmission()}
                retryLabel="Retry unchanged submission"
              />
            )}
            <div className="ao-entry__buttons">
              <Button type="submit" disabled={!profileId || !draft.metric || inFlight || saved || outcomeUnknown} loading={inFlight}>
                {inFlight ? 'Saving…' : saved ? 'Saved' : 'Save synthetic record'}
              </Button>
              {saved && <Button variant="secondary" onClick={addAnother}>Add another record</Button>}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
