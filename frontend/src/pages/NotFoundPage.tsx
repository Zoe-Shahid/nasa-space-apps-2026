import { ButtonLink, EmptyState, PageHeading } from '../components/ui'
import { ROUTES } from '../lib/routes'

export default function NotFoundPage() {
  return (
    <div className="ao-placeholder">
      <PageHeading title="Page not found" />
      <EmptyState title="This page does not exist" description="Check the address, or go back to the start." action={<ButtonLink to={ROUTES.landing.path}>Go to the start</ButtonLink>} />
    </div>
  )
}
