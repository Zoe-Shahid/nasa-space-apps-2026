import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink, ErrorState, Select, SuccessMessage, TextInput, UtcTime } from '../ui'
import { ApiError } from '../../data/common'
import type { EntryApi } from '../../data/entryApi'
import { buildVitalRequest, createSubmitGuard, formatUtcInput, parseUtcInput, validateVital, type VitalFormValues } from '../../lib/entryValidation'
import { ROUTES } from '../../lib/routes'
import { ACQUISITION_VALUE, DEMO_DEVICE_ID, isRestingContext, type VitalFormConfig } from '../../lib/vitalForms'
import type { VitalEntryRequest } from '../../types/entry'

interface Props {
  config: VitalFormConfig
  astronautId: string
  api: EntryApi
  onCancel: () => void
}

type Saved = { recordId: string; request: VitalEntryRequest }
type Refresh = { state: 'loading' } | { state: 'ok'; message?: string } | { state: 'error'; message: string; requestId?: string }

function initialValues(config: VitalFormConfig): VitalFormValues {
  return { value: '', systolic: '', diastolic: '', context: config.defaultContext, measuredAt: formatUtcInput(new Date()), sourceLabel: config.defaultSource, quality: 'valid', entryMethod: 'manual' }
}

/** One vital-sign entry form. Format checks only: nothing here says a value is healthy or normal. */
export function VitalEntryForm({ config, astronautId, api, onCancel }: Props) {
  const [values, setValues] = useState<VitalFormValues>(() => initialValues(config))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<{ message: string; requestId?: string; uncertain: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [refresh, setRefresh] = useState<Refresh | null>(null)
  const [retryId, setRetryId] = useState(() => crypto.randomUUID())
  const [focusTick, setFocusTick] = useState(0)
  const guard = useMemo(() => createSubmitGuard(), [])
  const formRef = useRef<HTMLFormElement>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // After a failed submit, move focus to the first invalid field so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (focusTick > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusTick])

  function set<K extends keyof VitalFormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  async function refreshAssessment() {
    setRefresh({ state: 'loading' })
    try {
      const res = await api.refreshAssessment(astronautId, new AbortController().signal)
      if (mounted.current) setRefresh({ state: 'ok', message: res.message })
    } catch (e) {
      if (mounted.current) setRefresh({ state: 'error', message: e instanceof ApiError ? e.message : 'The assessment request failed.', requestId: e instanceof ApiError ? e.requestId : undefined })
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (guard.busy || saving) return
    setFormError(null)
    const result = validateVital(config, values, new Date())
    setErrors(result.errors)
    if (!result.ok) {
      setFocusTick((n) => n + 1)
      return
    }
    const request = buildVitalRequest(config, values, { astronautId, clientRecordId: retryId, deviceId: DEMO_DEVICE_ID })
    setSaving(true)
    const outcome = await guard.run(async () => {
      try {
        return { ok: true as const, res: await api.submitVital(request, new AbortController().signal) }
      } catch (err) {
        return { ok: false as const, err }
      }
    })
    if (!mounted.current) return
    setSaving(false)
    if (!outcome) return
    if (outcome.ok) {
      setSaved({ recordId: outcome.res.recordId, request })
      void refreshAssessment()
      return
    }
    const err = outcome.err
    if (err instanceof ApiError && err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
      setErrors(err.fieldErrors)
      setFormError({ message: err.message, requestId: err.requestId, uncertain: false })
      setFocusTick((n) => n + 1)
    } else if (err instanceof ApiError && (err.kind === 'unauthorized' || err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'validation')) {
      setFormError({ message: err.message, requestId: err.requestId, uncertain: false })
    } else {
      setFormError({ message: err instanceof ApiError ? err.message : 'The request failed and the result is unknown.', requestId: err instanceof ApiError ? err.requestId : undefined, uncertain: true })
    }
  }

  function addAnother() {
    setValues(initialValues(config))
    setErrors({})
    setFormError(null)
    setSaved(null)
    setRefresh(null)
    setRetryId(crypto.randomUUID())
  }

  // ---- Saved: the record stays on screen no matter what the assessment request does. ----
  if (saved) {
    const resting = isRestingContext(saved.request.context)
    const ctxLabel = config.contexts.find((c) => c.value === saved.request.context)?.label ?? saved.request.context
    return (
      <div className="ao-entry-saved">
        <SuccessMessage title="Record saved">
          <p>
            Record ID: <code>{saved.recordId}</code>
          </p>
          <p>
            Measured at <UtcTime value={saved.request.measuredAt} /> as {config.title.toLowerCase()}, {ctxLabel.toLowerCase()}, quality {saved.request.quality}.
          </p>
          {(config.metric === 'heart_rate' || config.metric === 'blood_pressure') && !resting && <p>This is kept as a {ctxLabel.toLowerCase()} reading. It is not a resting measurement and is left out of resting rules.</p>}
          {saved.request.quality === 'suspect' && <p>This record is marked Suspect. It stays visible in history and is left out of rules and baselines.</p>}
          <p>Passing input checks does not mean the value is healthy or normal.</p>
        </SuccessMessage>

        {refresh?.state === 'loading' && (
          <p className="ao-help" role="status">
            Loading the latest assessment…
          </p>
        )}
        {refresh?.state === 'ok' && (
          <p role="status">
            The latest assessment was requested. {refresh.message} <Link to={`${ROUTES.overview.path}?astronaut=${encodeURIComponent(astronautId)}`}>Open the overview</Link>
          </p>
        )}
        {refresh?.state === 'error' && <ErrorState title="Assessment refresh failed" message={`${refresh.message} The record above is saved and will not be submitted again.`} requestId={refresh.requestId} onRetry={() => void refreshAssessment()} retryLabel="Retry assessment refresh" />}

        <div className="ao-entry__buttons">
          <Button variant="secondary" onClick={addAnother}>
            Add another record
          </Button>
          <ButtonLink to={`${ROUTES.overview.path}?astronaut=${encodeURIComponent(astronautId)}`}>Open overview</ButtonLink>
        </div>
      </div>
    )
  }

  const parsed = parseUtcInput(values.measuredAt)
  const errCount = Object.values(errors).filter(Boolean).length
  const numericFields = config.fields
  const showNonResting = (config.metric === 'heart_rate' || config.metric === 'blood_pressure') && !isRestingContext(values.context)

  return (
    <form ref={formRef} className="ao-entry" onSubmit={onSubmit} noValidate aria-label={`${config.title} entry`}>
      <div>
        <h2 className="ao-entry__title">{config.title}</h2>
        <p className="ao-help">
          {config.purpose} All fields are required. Times are UTC.
        </p>
      </div>

      {errCount > 0 && !formError && (
        <p className="ao-entry__alert" role="alert">
          {errCount === 1 ? '1 field needs attention.' : `${errCount} fields need attention.`} Nothing was saved.
        </p>
      )}
      {formError && (
        <div className="ao-entry__alert" role="alert">
          <p>
            <strong>{formError.message}</strong>
          </p>
          {formError.uncertain && <p>You can press Save record again. The same Retry ID and values are sent, so no duplicate record is created.</p>}
          {formError.requestId && (
            <p>
              Request ID: <code>{formError.requestId}</code>
            </p>
          )}
        </div>
      )}

      <div className={numericFields.length > 1 ? 'ao-entry__row ao-entry__row--2' : 'ao-entry__row'}>
        {numericFields.map((f, i) => (
          <TextInput
            key={f.name}
            label={f.label}
            name={f.name}
            unit={f.unit}
            inputMode="decimal"
            autoComplete="off"
            aria-required="true"
            value={values[f.name]}
            onChange={(e) => set(f.name, e.target.value)}
            error={errors[f.name] || undefined}
            hint={i === numericFields.length - 1 ? config.inputCheck : undefined}
          />
        ))}
      </div>

      <div className="ao-entry__row ao-entry__row--2">
        <Select label={config.contextLabel} name="context" aria-required="true" value={values.context} onChange={(e) => set('context', e.target.value)} options={config.contexts} error={errors.context || undefined} hint={config.contextHint} />
        <TextInput
          label="Measured at (UTC)"
          name="measuredAt"
          unit="UTC"
          placeholder="YYYY-MM-DD HH:mm"
          autoComplete="off"
          aria-required="true"
          value={values.measuredAt}
          onChange={(e) => set('measuredAt', e.target.value)}
          error={errors.measuredAt || undefined}
          hint={parsed ? <>Defaults to now. Future times are rejected. Will be saved as <UtcTime value={parsed.toISOString()} />.</> : 'Defaults to now. Future times are rejected.'}
        />
      </div>
      {showNonResting && <p className="ao-entry__note">This will be kept as a {values.context} reading, not a resting measurement.</p>}

      <div className="ao-entry__row ao-entry__row--2">
        <TextInput label="Source label" name="sourceLabel" aria-required="true" value={values.sourceLabel} onChange={(e) => set('sourceLabel', e.target.value)} error={errors.sourceLabel || undefined} />
        <TextInput label="Device ID" name="deviceId" value={DEMO_DEVICE_ID} readOnly hint="Fixed for this prototype." />
      </div>

      <div className="ao-entry__row ao-entry__row--3">
        <Select
          label="Quality"
          name="quality"
          aria-required="true"
          value={values.quality}
          onChange={(e) => set('quality', e.target.value)}
          options={[
            { value: 'valid', label: 'Valid' },
            { value: 'suspect', label: 'Suspect' },
          ]}
          error={errors.quality || undefined}
          hint="Suspect records stay in history but are left out of rules and baselines."
        />
        <TextInput label="Acquisition" name="acquisition" value="Measured (fixed)" readOnly data-value={ACQUISITION_VALUE} />
        <Select
          label="Entry method"
          name="entryMethod"
          aria-required="true"
          value={values.entryMethod}
          onChange={(e) => set('entryMethod', e.target.value)}
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'import', label: 'Import' },
          ]}
          error={errors.entryMethod || undefined}
        />
      </div>

      <p className="ao-help">
        Retry ID for this form: <code>{retryId}</code>. If a save is uncertain, the same ID and values are sent again so no duplicate is created.
      </p>
      <p className="ao-help">These checks only confirm the entry is well formed. They do not decide whether a value is medically normal.</p>

      <div className="ao-entry__buttons">
        <Button type="submit" loading={saving}>
          Save record
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
