import { useState, useEffect } from 'react'

import Login from './components/Login.jsx'
import EmployeePortal from './components/EmployeePortal.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import { Badge } from '@/components/ui/badge'
import ToastContainer from './components/layout/ToastContainer.jsx'
import CommandPalette from './components/layout/CommandPalette.jsx'
import AppContent from './components/AppContent.jsx'
import { allNavItems } from './utils/helpers.js'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import { useAuth } from './hooks/useAuth.js'
import { useCommandPalette } from './hooks/useCommandPalette.jsx'
import useAppData from './hooks/useAppData.js'

export default function App() {
  const { themeMode, isDarkMode, toggleTheme } = useTheme()
  const { user, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const appData = useAppData({ user, addToast })

  const [currentView, setCurrentView] = useState(() => localStorage.getItem('hr_pulse_current_view') || 'dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  useEffect(() => {
    localStorage.setItem('hr_pulse_current_view', currentView)
    const timer = setTimeout(() => appData.setIsAppLoading(false), 500)
    return () => clearTimeout(timer)
  }, [currentView])

  useEffect(() => {
    const handleResize = () => setMobileMenuOpen(false)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      window.history.pushState({ mobileMenu: true }, '')
      const handlePop = () => setMobileMenuOpen(false)
      window.addEventListener('popstate', handlePop)
      return () => window.removeEventListener('popstate', handlePop)
    }
  }, [mobileMenuOpen])

  const toggleSidebar = () => {
    const width = window.innerWidth
    if (width >= 768) {
      const next = !isCollapsed
      setIsCollapsed(next)
      localStorage.setItem('sidebar_collapsed', next)
    } else {
      setIsCollapsed(false)
      setMobileMenuOpen(!mobileMenuOpen)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        appData.setShowCommandPalette(prev => !prev)
        appData.setCommandSearch('')
        appData.setPaletteIndex(0)
        return
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        if (e.key === 'Escape') { e.preventDefault(); appData.setShowCommandPalette(false); appData.setCommandSearch(''); appData.setPaletteIndex(0); e.target.blur() }
        return
      }
      if (e.key === '/') { e.preventDefault(); appData.setShowCommandPalette(true); appData.setCommandSearch(''); appData.setPaletteIndex(0) }
      else if (e.key.toLowerCase() === 'e') { e.preventDefault(); setCurrentView('employees') }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); addToast('Save shortcut triggered', 'info') }
      else if (e.key === 'Escape') { appData.setShowCommandPalette(false); setMobileMenuOpen(false) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const { showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem, getCategoryIcon, ConfirmDialog } = useCommandPalette({
    user, employees: appData.employees, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId
  })

  if (!user) {
    return <Login onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} />
  }

  if (appData.simulatedRole === 'Employee' || user.isEmployee) {
    return (
      <EmployeePortal
        currentUser={{...user, role: user.role || 'Employee', department: user.department || 'Engineering'}}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
        employees={appData.employees}
        attendance={appData.attendance}
        payroll={appData.payroll}
        expenses={appData.expenses}
        addLog={appData.addLog}
        addToast={addToast}
        setAttendance={appData.handleSetAttendance}
        pendingProfileEdits={appData.pendingProfileEdits}
        setPendingProfileEdits={appData.setPendingProfileEdits}
        setExpenses={appData.handleSetExpenses}
        roster={appData.roster}
        shiftSwaps={appData.shiftSwaps}
        setShiftSwaps={appData.setShiftSwaps}
        shiftTemplates={appData.settings?.shiftTemplates}
        overtimeClaims={appData.overtimeClaims}
        setOvertimeClaims={appData.setOvertimeClaims}
        announcements={appData.announcements}
        setAnnouncements={appData.setAnnouncements}
        assets={appData.assets}
        setAssets={appData.setAssets}
        tasks={appData.tasks}
        setTasks={appData.handleSetTasks}
        events={appData.events}
        setEvents={appData.handleSetEvents}
        assetRequests={appData.assetRequests}
        setAssetRequests={appData.setAssetRequests}
        settings={appData.settings}
        simulatedRole={appData.simulatedRole}
        setSimulatedRole={appData.setSimulatedRole}
      />
    )
  }

  const visibleNavItems = allNavItems.filter(item => appData.hasPermission(item.id))
  const unreadCount = appData.notifications.filter(n => !n.read).length

  return (
    <div className="dashboard-root app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Sidebar
        visibleNavItems={visibleNavItems}
        isCollapsed={isCollapsed}
        isDarkMode={isDarkMode}
        currentView={currentView}
        setCurrentView={setCurrentView}
        mobileMenuOpen={mobileMenuOpen}
        toggleSidebar={toggleSidebar}
        user={user}
        simulatedRole={appData.simulatedRole}
        showRoleModal={appData.showRoleModal}
        setShowRoleModal={appData.setShowRoleModal}
        handleLogout={handleLogout}
        setIsCollapsed={setIsCollapsed}
        setSimulatedRole={appData.setSimulatedRole}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <main className="content dashboard-content pb-12 flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center max-w-[100vw]" style={{ scrollbarGutter: 'stable' }}>
        <div className="w-full max-w-[1600px] flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className="sticky top-0 z-40 w-full pt-6 md:pt-8 lg:pt-10 pb-6 md:pb-8 lg:pb-10 px-4 md:px-6 lg:px-8">
            <Topbar
                isDarkMode={isDarkMode}
                toggleSidebar={toggleSidebar}
                themeMode={themeMode}
                toggleTheme={toggleTheme}
                handleSync={appData.handleSync}
                isSyncing={appData.isSyncing}
                driveConnected={appData.driveConnected}
                syncConflicts={appData.syncConflicts}
                setShowNotifications={appData.setShowNotifications}
                markNotificationsRead={appData.markNotificationsRead}
                unreadCount={unreadCount}
              />
            </div>

          {/* Notification Panel */}
          {appData.showNotifications && (
            <div
              role="dialog"
              aria-label="Notifications"
              className="fixed top-[calc(64px+2rem)] right-4 md:right-6 lg:right-8 w-[300px] sm:w-[340px] rounded-2xl z-50 overflow-hidden bg-popover text-popover-foreground border border-border shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 p-0"
            >
              <div className="p-3.5 px-4 flex justify-between items-center border-b border-border bg-muted/30">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground m-0">Notifications</h3>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  {appData.notifications.length} Total
                </Badge>
              </div>
              <div className="max-h-[280px] overflow-y-auto p-1">
                {appData.notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">No new notifications</div>
                ) : (
                  appData.notifications.map(n => (
                    <div role="listitem" key={n.id} className="p-3 px-3.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer my-0.5">
                      <p className="text-xs m-0 leading-relaxed text-foreground" style={{ fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
                      <span className="text-[10px] font-medium block mt-1 text-muted-foreground">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="w-full flex-1 px-4 md:px-6 lg:px-8">
            <AppContent
            currentView={currentView}
            setCurrentView={setCurrentView}
            isAppLoading={appData.isAppLoading}
            hasPermission={appData.hasPermission}
            simulatedRole={appData.simulatedRole}
            user={user}
            addToast={addToast}
            isSidebarCollapsed={isCollapsed}
            {...appData}
          />
          </div>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <CommandPalette
        showCommandPalette={showCommandPalette}
        setShowCommandPalette={setShowCommandPalette}
        commandSearch={commandSearch}
        setCommandSearch={setCommandSearch}
        paletteIndex={paletteIndex}
        setPaletteIndex={setPaletteIndex}
        filteredItems={filteredItems}
        selectPaletteItem={selectPaletteItem}
        getCategoryIcon={getCategoryIcon}
      />
      <ConfirmDialog />
    </div>
  )
}
