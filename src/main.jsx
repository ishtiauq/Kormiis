import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './pwa.js'
import './index.css'

if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-loaded')
  }).catch(() => {
    document.documentElement.classList.add('fonts-loaded')
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
