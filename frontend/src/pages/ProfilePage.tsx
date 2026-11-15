import { useEffect, useState, type FormEvent } from 'react'
import { Button, PageHeading, TextInput } from '../components/ui'
import { useAuth } from '../lib/authState'

export default function ProfilePage() {
  const { state, updateProfile } = useAuth()
  const profile = state.status === 'signed-in' ? state.account.profile : null
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name)
  }, [profile])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus('')
    setError('')
    try {
      await updateProfile(displayName.trim())
      setStatus('Profile updated and confirmed by the server.')
    } catch {
      setError('The profile could not be updated.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="ao-actual-page">
      <PageHeading title="Your profile" description={profile?.email ?? ''} />
      <form className="ao-actual-form" onSubmit={(event) => void submit(event)}>
        <TextInput label="Display name" value={displayName} maxLength={120} required onChange={(event) => setDisplayName(event.target.value)} disabled={pending} />
        {error && <p role="alert" className="ao-actual-form__error">{error}</p>}
        {status && <p role="status" className="ao-actual-form__success">{status}</p>}
        <Button type="submit" loading={pending} disabled={pending}>Save profile</Button>
      </form>
    </div>
  )
}