import { Link } from 'react-router-dom'
import { ROUTES } from '../../lib/routes'

export function Footer() {
  return (
    <footer className="ao-footer">
      <p className="ao-footer__inner">
        Hackathon prototype by Team AstroOrbitX. Contract AX1, demo rules DEMO1. Research references are listed on the <Link to={ROUTES.guidance.path}>Guidance page</Link>.
      </p>
    </footer>
  )
}
