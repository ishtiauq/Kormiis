import { useState, useEffect, lazy, Suspense } from 'react'

import LoadingScreen from './components/layout/LoadingScreen.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import { useAuth } from './hooks/useAuth.js'

const Login = lazy(() => import('./components/Login.jsx'))
const DashboardShell = lazy(() => import('./components/DashboardShell.jsx'))

export default function App() {
  const { themeMode, isDarkMode, toggleTheme, setThemeMode } = useTheme()
  const { user, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('kormiis_current_view') || 'dashboard')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    window.__kormiisNavigate = (view) => {
      if (view && view !== currentView) setCurrentView(view)
      window.focus()
    }
    return () => { window.__kormiisNavigate = null }
  }, [currentView])

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 150)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isInitialLoading) {
    return <LoadingScreen isDarkMode={isDarkMode} message="Welcome to Kormiis..." />
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message="Loading Kormiis..." />}>
        <Login onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} setThemeMode={setThemeMode} />
      </Suspense>
    )
  }

  return (
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
  )
}