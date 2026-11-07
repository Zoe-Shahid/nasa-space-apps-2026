import { useNavigate } from 'react-router-dom'
import { Button, Card, PageHeading } from '../components/ui'
import { DEMO_REVIEWER, enterDemoMode } from '../lib/demoMode'
import { ROUTES } from '../lib/routes'

/** No real authentication exists yet. The only sign-in available is the explicit synthetic demo. */
export default function LoginPage() {
  const navigate = useNavigate()
  function openDemo() {
    enterDemoMode()
    navigate(ROUTES.overview.path)
  }
  return (
    <div className="ao-login">
      <PageHeading title="Sign in" description="Account sign-in is not connected to a backend in this prototype." />
      <Card heading="Use the demo reviewer" headingLevel={2}>
        <div className="ao-stack">
          <p>
            The demo opens the app as <strong>{DEMO_REVIEWER.username}</strong> ({DEMO_REVIEWER.role}) with clearly labelled synthetic fixture data. No password is needed and nothing is sent to a server.
          </p>
          <div>
            <Button onClick={openDemo}>Open the demo</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
