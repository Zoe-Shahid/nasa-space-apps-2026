import { useRef, useState, type FormEvent } from 'react'
import { Button, PageHeading, Select, TextInput } from '../components/ui'
import { ApiError } from '../data/common'
import { measurementsApi, type MeasurementCategory } from '../data/measurementsApi'
import { buildMeasurementInput } from '../lib/measurementInput'

const categories: Array<{ value: MeasurementCategory; label: string }> = [
  { value: 'heart_rate', label: 'Heart rate' },
  { value: 'blood_pressure', label: 'Blood pressure' },
  { value: 'body_temperature', label: 'Body temperature' },
  { value: 'blood_glucose', label: 'Blood glucose' },
  { value: 'sleep_duration', label: 'Sleep duration' },
]

export default function MeasurementEntryPage() {
  const [category, setCategory] = useState<MeasurementCategory>('heart_rate')
  const [value, setValue] = useState('')
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [unit, setUnit] = useState('bpm')
  const [measuredAt, setMeasuredAt] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const clientRecordId = useRef<string | null>(null)

  function invalidateRequest() {
    clientRecordId.current = null
    setSaved(false)
    setUnknown(false)
  }

  function changeCategory(next: MeasurementCategory) {
    setCategory(next)
    setUnit(next === 'heart_rate' ? 'bpm' : next === 'blood_pressure' ? 'mmHg' : next === 'body_temperature' ? '°C' : next === 'blood_glucose' ? 'mg/dL' : 'h')
    setValue('')
    setSystolic('')
    setDiastolic('')
    invalidateRequest()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    let input
    try {
      clientRecordId.current ??= crypto.randomUUID()
      input = buildMeasurementInput({ category, value, systolic, diastolic, unit, measuredAt, note }, clientRecordId.current)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Check the entered values.')
      return
    }
    setPending(true)
    try {
      await measurementsApi.create(input)
      setSaved(true)
      setUnknown(false)
      clientRecordId.current = null
      setValue('')
      setSystolic('')
      setDiastolic('')
      setNote('')
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The record could not be saved.')
      setUnknown(!(requestError instanceof ApiError) || requestError.status === undefined || requestError.status >= 500)
    } finally {
      setPending(false)
    }
  }

  const unitOptions = category === 'body_temperature'
    ? [{ value: '°C', label: '°C' }, { value: '°F', label: '°F' }]
    : category === 'blood_glucose'
      ? [{ value: 'mg/dL', label: 'mg/dL' }, { value: 'mmol/L', label: 'mmol/L' }]
      : category === 'sleep_duration'
        ? [{ value: 'h', label: 'Hours (h)' }, { value: 'min', label: 'Minutes (min)' }]
        : [{ value: unit, label: unit }]

  return (
    <div className="ao-actual-page">
      <PageHeading title="Record a measurement" description="Entries are stored in your private account. Values are descriptive records, not medical guidance." />
      <form className="ao-actual-form" onSubmit={(event) => void submit(event)}>
        <Select label="Measurement" value={category} options={categories} onChange={(event) => changeCategory(event.target.value as MeasurementCategory)} disabled={pending || unknown} />
        {category === 'blood_pressure' ? (
          <div className="ao-actual-form__pair">
            <TextInput label="Systolic" value={systolic} onChange={(event) => { setSystolic(event.target.value); invalidateRequest() }} inputMode="decimal" required disabled={pending || unknown} />
            <TextInput label="Diastolic" value={diastolic} onChange={(event) => { setDiastolic(event.target.value); invalidateRequest() }} inputMode="decimal" required disabled={pending || unknown} />
          </div>
        ) : (
          <TextInput label={category === 'sleep_duration' ? 'Duration' : 'Value'} value={value} onChange={(event) => { setValue(event.target.value); invalidateRequest() }} inputMode="decimal" required disabled={pending || unknown} />
        )}
        <Select label="Unit" value={unit} options={unitOptions} onChange={(event) => { setUnit(event.target.value); invalidateRequest() }} disabled={pending || unknown} />
        <TextInput
          label="Measured at (local time)"
          type="datetime-local"
          value={measuredAt}
          onChange={(event) => { setMeasuredAt(event.target.value); invalidateRequest() }}
          required
          disabled={pending || unknown}
          hint={`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device timezone'}`}
        />
        <label className="ao-actual-form__note">
          <span>Private note <span className="ao-help">Optional, up to 2,000 characters</span></span>
          <textarea maxLength={2000} value={note} onChange={(event) => { setNote(event.target.value); invalidateRequest() }} disabled={pending || unknown} />
        </label>
        {error && <p role="alert" className="ao-actual-form__error">{error}</p>}
        {saved && <p role="status" className="ao-actual-form__success">Saved and confirmed by the server.</p>}
        {unknown && <p role="alert">The save outcome is unknown. Retry unchanged to safely check the same record.</p>}
        <Button type="submit" loading={pending} disabled={pending}>{unknown ? 'Retry unchanged save' : 'Save measurement'}</Button>
      </form>
    </div>
  )
}