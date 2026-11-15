export const ROUTES = {
  landing: { path: '/', label: 'Home' },
  login: { path: '/login', label: 'Sign in' },
  overview: { path: '/overview', label: 'Overview' },
  crew: { path: '/crew', label: 'Crew' },
  crewProfile: { path: '/crew/:profileId', label: 'Crew profile' },
  profile: { path: '/profile', label: 'My profile' },
  addData: { path: '/add-data', label: 'Add data' },
  demoAddData: { path: '/demo/add-data', label: 'Synthetic data' },
  history: { path: '/history', label: 'History' },
  assessment: { path: '/assessment', label: 'Assessment' },
  trends: { path: '/trends', label: 'Trends' },
  guidance: { path: '/guidance', label: 'Guidance and research' },
  about: { path: '/about', label: 'About' },
} as const

export const NAV_ROUTES = [
  ROUTES.overview,
  ROUTES.addData,
  ROUTES.crew,
  ROUTES.history,
  ROUTES.assessment,
  ROUTES.trends,
  ROUTES.guidance,
]

export type AppMode = 'public' | 'actual' | 'synthetic'

export function appModeForPath(pathname: string, variant: 'landing' | 'app'): AppMode {
  if (variant === 'landing') return 'public'
  if (pathname === ROUTES.crew.path || pathname.startsWith(`${ROUTES.crew.path}/`) || pathname === ROUTES.demoAddData.path) {
    return 'synthetic'
  }
  return 'actual'
}

export function titleForPath(pathname: string): string {
  const route = Object.values(ROUTES).find((item) => item.path === pathname)
  if (route) return route.label
  if (/^\/crew\/[^/]+\/?$/.test(pathname)) return ROUTES.crewProfile.label
  return 'AstroOrbitX'
}
