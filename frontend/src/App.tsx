import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { ROUTES } from './lib/routes'
import AboutPage from './pages/AboutPage'
import AddDataPage from './pages/AddDataPage'
import AssessmentPage from './pages/AssessmentPage'
import CrewPage from './pages/CrewPage'
import CrewProfilePage from './pages/CrewProfilePage'
import DesignSystemPage from './pages/DesignSystemPage'
import GuidancePage from './pages/GuidancePage'
import HistoryPage from './pages/HistoryPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import OverviewPage from './pages/OverviewPage'
import TrendsPage from './pages/TrendsPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<AppShell variant="landing" />}>
          <Route path={ROUTES.landing.path} element={<LandingPage />} />
          <Route path={ROUTES.login.path} element={<LoginPage />} />
        </Route>
        <Route element={<AppShell variant="app" />}>
          <Route path={ROUTES.overview.path} element={<OverviewPage />} />
          <Route path={ROUTES.crew.path} element={<CrewPage />} />
          <Route path={ROUTES.crewProfile.path} element={<CrewProfilePage />} />
          <Route path={ROUTES.addData.path} element={<AddDataPage />} />
          <Route path={ROUTES.history.path} element={<HistoryPage />} />
          <Route path={ROUTES.assessment.path} element={<AssessmentPage />} />
          <Route path={ROUTES.trends.path} element={<TrendsPage />} />
          <Route path={ROUTES.guidance.path} element={<GuidancePage />} />
          <Route path={ROUTES.about.path} element={<AboutPage />} />
          {import.meta.env.DEV && <Route path="/design-system" element={<DesignSystemPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
