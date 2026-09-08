import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './pwa.js'
import './index.css'

// Handle stale dynamic import chunks automatically after new deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error detected, reloading to get latest build assets...', event)
    window.location.reload()
  })
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
        event.reason?.message?.includes('Loading chunk') ||
        event.reason?.name === 'ChunkLoadError') {
      const lastReload = sessionStorage.getItem('kormiis_chunk_reload')
      const now = Date.now()
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('kormiis_chunk_reload', String(now))
        window.location.reload()
      }
    }
  })
}

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
