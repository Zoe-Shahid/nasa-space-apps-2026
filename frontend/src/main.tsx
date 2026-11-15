import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/shell.css'
import './styles/pages.css'
import './styles/orbit.css'
import './styles/landing.css'
import './styles/overview.css'
import './styles/crew.css'
import './styles/entry.css'
import './styles/assessment.css'
import './styles/trends.css'
import './styles/guidance.css'
import './styles/history.css'
import './styles/actual.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
