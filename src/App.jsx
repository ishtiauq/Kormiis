import { useState, useEffect, lazy, Suspense } from 'react'

import LoadingScreen from './components/layout/LoadingScreen.jsx'
import GlobalTooltip from './components/GlobalTooltip.jsx'
import WhatsAppQueueModal from './components/WhatsAppQueueModal.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import { useAuth } from './hooks/useAuth.js'

const Login = lazy(() => import('./components/Login.jsx'))
const DashboardShell = lazy(() => import('./components/DashboardShell.jsx'))

export default function App() {
  const { themeMode, isDarkMode, toggleTheme, setThemeMode } = useTheme()
  const { user, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  // Read initial view from URL hash or localStorage
  const [currentView, setCurrentViewState] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').trim()
    return hash || localStorage.getItem('kormiis_current_view') || 'dashboard'
  })

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1368 : false)

  // Unified navigation handler with browser history support
  const setCurrentView = (newView, pushState = true) => {
    if (!newView) return
    setCurrentViewState(prev => {
      if (prev === newView) return prev
      if (pushState) {
        window.history.pushState({ view: newView }, '', `#${newView}`)
      }
      localStorage.setItem('kormiis_current_view', newView)
      return newView
    })
  }

  // Handle browser back and forward button clicks across all devices & screen sizes
  useEffect(() => {
    // Set initial history state if not already recorded
    const initialView = window.location.hash.replace(/^#\/?/, '').trim() || localStorage.getItem('kormiis_current_view') || 'dashboard'
    window.history.replaceState({ view: initialView }, '', `#${initialView}`)

    const handlePopState = (event) => {
      const hashView = window.location.hash.replace(/^#\/?/, '').trim()
      const targetView = event.state?.view || hashView || 'dashboard'
      if (targetView) {
        setCurrentViewState(targetView)
        localStorage.setItem('kormiis_current_view', targetView)
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [])

  useEffect(() => {
    window.__kormiisNavigate = (view) => {
      if (view && view !== currentView) setCurrentView(view, true)
      window.focus()
    }
    return () => { window.__kormiisNavigate = null }
  }, [currentView])

  useEffect(() => {
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => setIsMobile(window.innerWidth <= 1368), 150)
    }
    window.addEventListener('resize', handleResize)
    return () => { clearTimeout(resizeTimer); window.removeEventListener('resize', handleResize) }
  }, [])

  if (!user) {
    return (
      <>
        <GlobalTooltip />
        <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message="Loading Kormiis..." />}>
          <Login onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} setThemeMode={setThemeMode} />
        </Suspense>
      </>
    )
  }

  return (
    <>
      <GlobalTooltip />
      <WhatsAppQueueModal />
      <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message="Loading your workspace..." />}>
        <DashboardShell
          user={user}
          themeMode={themeMode}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          addToast={addToast}
          toasts={toasts}
          removeToast={removeToast}
          handleLogout={handleLogout}
          currentView={currentView}
          setCurrentView={setCurrentView}
          isMobile={isMobile}
        />
      </Suspense>
    </>
  )
}