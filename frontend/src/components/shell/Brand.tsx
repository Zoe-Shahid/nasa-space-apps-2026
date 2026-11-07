import { Link } from 'react-router-dom'
import { ROUTES } from '../../lib/routes'

export function Brand() {
  return (
    <Link to={ROUTES.landing.path} className="ao-brand" aria-label="AstroOrbitX home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-25 16 16)" fill="none" stroke="#2d3de0" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="6" fill="#ff8a3d" />
      </svg>
      <span>AstroOrbitX</span>
    </Link>
  )
}
