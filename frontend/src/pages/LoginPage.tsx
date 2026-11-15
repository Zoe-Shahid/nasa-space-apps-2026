import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, PageHeading, TextInput } from '../components/ui'
import { ApiError } from '../data/common'
import { useAuth } from '../lib/authState'

export default function LoginPage() {
  const { state, signIn, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      if (creating) await register(email, password, displayName)
      else await signIn(email, password)
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/overview'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The account request could not be completed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="ao-login ao-actual-page">
      <PageHeading title={creating ? 'Create your account' : 'Sign in'} description="Your profile and measurements are private to your account." />
      {state.status === 'signed-in' ? <p role="status">You are signed in.</p> : (
        <form className="ao-actual-form" onSubmit={(event) => void submit(event)}>
          {creating && <TextInput label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} required disabled={pending} />}
          <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required disabled={pending} />
          <TextInput label="Password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={creating ? 12 : 1} maxLength={256} required disabled={pending} />
          {error && <p role="alert" className="ao-actual-form__error">{error}</p>}
          <Button type="submit" loading={pending} disabled={pending}>{creating ? 'Create account' : 'Sign in'}</Button>
          <button type="button" className="ao-link-button" onClick={() => { setCreating((current) => !current); setError('') }} disabled={pending}>
            {creating ? 'I already have an account' : 'Create a new account'}
          </button>
          <p className="ao-help">Registration is intended for a local single-host MVP. Account recovery is not available.</p>
        </form>
      )}
    </div>
  )
}
