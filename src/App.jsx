import { useState, useEffect, useRef } from 'react'

import Login from './components/Login.jsx'
import EmployeePortal from './components/EmployeePortal.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import MobileTabButton from './components/layout/MobileTabButton.jsx'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from '@/components/ui/badge'
import ToastContainer from './components/layout/ToastContainer.jsx'
import CommandPalette from './components/layout/CommandPalette.jsx'
import AppContent from './components/AppContent.jsx'
import { allNavItems } from './utils/helpers.js'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import { useAuth } from './hooks/useAuth.js'
import { useCommandPalette } from './hooks/useCommandPalette.jsx'
import LoadingScreen from './components/layout/LoadingScreen.jsx'
import useAppData from './hooks/useAppData.js'

export default function App() {
  const { themeMode, isDarkMode, toggleTheme, setThemeMode } = useTheme()
  const { user, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const appData = useAppData({ user, addToast })

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('kormiis_current_view') || 'dashboard')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const lastScrollY = useRef(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem('kormiis_current_view', currentView)
    const timer = setTimeout(() => appData.setIsAppLoading(false), 500)
    return () => clearTimeout(timer)
  }, [currentView])

  const handleScroll = (e) => {
    if (!isMobile) return;
    const currentScrollY = e.target.scrollTop;
    if (currentScrollY < 50) {
      setIsScrollingDown(false);
    } else if (currentScrollY > lastScrollY.current + 5) {
      setIsScrollingDown(true);
    } else if (currentScrollY < lastScrollY.current - 5) {
      setIsScrollingDown(false);
    }
    lastScrollY.current = currentScrollY;
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (showMobileMenu) {
      window.history.pushState({ mobileMenu: true }, '')
      const handlePop = () => setShowMobileMenu(false)
      window.addEventListener('popstate', handlePop)
      return () => window.removeEventListener('popstate', handlePop)
    }
  }, [showMobileMenu])

  const toggleSidebar = () => {
    setShowMobileMenu(prev => !prev)
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
    employees: appData.employees, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId
  })

  if (isInitialLoading) {
    return <LoadingScreen isDarkMode={isDarkMode} message="Welcome to Kormiis..." />
  }

  if (!user) {
    return <Login onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} setThemeMode={setThemeMode} />
  }

  if (user.isEmployee || user.role === 'Teammate') {
    return (
      <EmployeePortal
        currentUser={{...user, id: user.id || user.employeeId, role: user.role || 'Teammate', department: user.department || 'Engineering'}}
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
        assetCategories={appData.assetCategories}
        setAssetCategories={appData.setAssetCategories}
        tasks={appData.tasks}
        setTasks={appData.handleSetTasks}
        events={appData.events}
        setEvents={appData.handleSetEvents}
        assetRequests={appData.assetRequests}
        setAssetRequests={appData.setAssetRequests}
        settings={appData.settings}
        documents={appData.documents}
        setDocuments={appData.handleSetDocuments}
        notes={appData.notes}
        setNotes={appData.handleSetNotes}
        handleLogout={handleLogout}
        showNotifications={appData.showNotifications}
        setShowNotifications={appData.setShowNotifications}
        notifications={appData.notifications}
        markNotificationsRead={appData.markNotificationsRead}
        clearNotifications={appData.clearNotifications}
      />
    )
  }

  const visibleNavItems = allNavItems.filter(item => appData.hasPermission(item.id))
  const unreadCount = appData.notifications.filter(n => !n.read).length

  return (
    <div className="dashboard-root app-shell relative" style={{ display: 'flex', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      


      <Sidebar
        visibleNavItems={visibleNavItems}
        isCollapsed={isCollapsed}
        isDarkMode={isDarkMode}
        currentView={currentView}
        setCurrentView={setCurrentView}
        mobileMenuOpen={showMobileMenu}
        toggleSidebar={toggleSidebar}
        user={user}
        handleLogout={handleLogout}
        setIsCollapsed={setIsCollapsed}
        setMobileMenuOpen={setShowMobileMenu}
      />



      <main 
        className={`content dashboard-content ${isMobile ? 'pb-24' : 'pb-12 md:pl-20 lg:pl-24'} flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center max-w-[100vw] transition-all duration-300`} 
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        <div className="w-full max-w-[1600px] flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className={`sticky top-0 z-40 w-full pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 px-2 sm:px-4 md:px-6 pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
            <Topbar
                isDarkMode={isDarkMode}
                toggleSidebar={toggleSidebar}
                themeMode={themeMode}
                toggleTheme={toggleTheme}
                handleSync={appData.handleSync}
                isSyncing={appData.isSyncing}
                dataIntegrityIssues={appData.dataIntegrityIssues}
                showCorruptionModal={appData.showCorruptionModal}
                setShowCorruptionModal={appData.setShowCorruptionModal}
                handleAutoRepairDatabase={appData.handleAutoRepairDatabase}
                setShowNotifications={appData.setShowNotifications}
                markNotificationsRead={appData.markNotificationsRead}
                unreadCount={unreadCount}
                showNotifications={appData.showNotifications}
                notifications={appData.notifications}
                clearNotifications={appData.clearNotifications}
                onProfileClick={() => setCurrentView('profile')}
                handleLogout={handleLogout}
                setCurrentView={setCurrentView}
                user={user}
                onOpenSearch={() => setShowCommandPalette(true)}
              />
          </div>

          <div className="w-full flex-1 px-4 md:px-6 lg:px-8">
            <AppContent
            currentView={currentView}
            setCurrentView={setCurrentView}
            isAppLoading={appData.isAppLoading}
            hasPermission={appData.hasPermission}
            user={user}
            addToast={addToast}
            themeMode={themeMode}
            toggleTheme={toggleTheme}
            isSidebarCollapsed={isCollapsed}
            {...appData}
          />
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar (Mobile) - Floating Pill */}
      {isMobile && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-3.5 sm:pb-4 transition-all duration-300 ${isScrollingDown && !showMobileMenu ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <nav className="bottom-bar bottom-bar-pill pointer-events-auto w-full max-w-[260px] flex items-center justify-around px-2.5 h-15 transition-all duration-300 rounded-full glass-kormiis text-foreground border border-white/30 dark:border-white/14 shadow-2xl backdrop-blur-3xl" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <MobileTabButton
              active={currentView === 'dashboard'}
              label="Home"
              onClick={() => { setCurrentView('dashboard'); setShowMobileMenu(false) }}
            >
              <Icon name="home" size={22}/>
            </MobileTabButton>
            <MobileTabButton
              active={currentView === 'announcements'}
              label="Announcements"
              onClick={() => { setCurrentView('announcements'); setShowMobileMenu(false) }}
            >
              <Icon name="rss_feed" size={22}/>
            </MobileTabButton>
            <MobileTabButton
              active={false}
              label="Notifications"
              onClick={() => { appData.setShowNotifications(true); appData.markNotificationsRead() }}
              badge={unreadCount > 0 ? (
                <span className="absolute top-1.5 right-1.5 flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                </span>
              ) : null}
            >
              <Icon name="notifications_active" size={22}/>
            </MobileTabButton>
            <MobileTabButton
              active={showMobileMenu}
              label="Menu"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Icon name="menu" size={22}/>
            </MobileTabButton>
          </nav>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed inset-0 z-50 backdrop-blur-md bg-black/60 transition-opacity duration-300 md:hidden ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowMobileMenu(false)}
        aria-hidden={!showMobileMenu}
      />
      
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col glass-kormiis-modal rounded-t-[32px] shadow-2xl border-t border-x border-white/30 dark:border-white/14 transition-transform duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:w-[420px] sm:mx-auto max-h-[85vh] md:hidden overflow-hidden ${showMobileMenu ? 'translate-y-0' : 'translate-y-full'}`}
        aria-hidden={!showMobileMenu}
      >
        {/* Pull handle indicator */}
        <div className="w-12 h-1.5 rounded-full bg-foreground/20 mx-auto mt-3 mb-1 shrink-0" />

        <div className="px-6 py-3.5 border-b border-border/80 dark:border-white/10 shrink-0 flex items-center justify-between">
          <h2 className="text-left text-fluid-lg font-bold text-foreground m-0 leading-none">Navigation Menu</h2>
          <button 
            className="rounded-full size-8 apple-glass-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer" 
            onClick={() => setShowMobileMenu(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={18}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5 pb-24" style={{ scrollbarWidth: 'thin' }}>
          {visibleNavItems.filter(i => !['dashboard', 'announcements', 'profile'].includes(i.id)).map(item => {
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3.5 h-12 px-4 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                  active 
                    ? 'bg-primary/15 dark:bg-primary/25 text-primary font-semibold border border-primary/30 shadow-xs' 
                    : 'text-foreground font-medium hover:bg-white/20 dark:hover:bg-white/[0.08] border border-transparent'
                }`}
                onClick={() => { setCurrentView(item.id); setShowMobileMenu(false) }}
              >
                <div className={`size-6 flex items-center justify-center shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
          
          <div className="h-px bg-border/80 dark:bg-white/10 my-3 mx-1 shrink-0" />
          
          <button 
            className="liquid-glass-btn w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl bg-destructive/15 hover:bg-destructive/25 text-destructive dark:text-red-400 border border-destructive/25 font-bold text-sm cursor-pointer shadow-sm active:scale-[0.97] transition-all"
            onClick={() => { handleLogout(); setShowMobileMenu(false) }}
          >
            <Icon name="logout" size={18}/>
            <span>Logout</span>
          </button>
        </div>
      </div>

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
