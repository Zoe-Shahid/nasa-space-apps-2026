import { ButtonLink, EmptyState } from './ui'
import { ROUTES } from '../lib/routes'

/** Shown instead of any data when demo mode is off and no confirmed backend contract exists. Never shows fixtures. */
export function BackendNotConnected({ what }: { what: string }) {
  return (
    <EmptyState
      title="The backend is not connected yet"
      description={`The API contract for ${what} has not been confirmed, so nothing is loaded and nothing is invented. Open the demo to see this screen with clearly labelled synthetic fixtures.`}
      action={
        <ButtonLink to={ROUTES.login.path} variant="secondary">
          Go to sign in
        </ButtonLink>
      }
    />
  )
}
