import { useState, useEffect, useRef, lazy, Suspense } from 'react'

import Login from './components/Login.jsx'
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

const EmployeePortal = lazy(() => import('./components/EmployeePortal.jsx'))

export default function App() {
  const { themeMode, isDarkMode, toggleTheme, setThemeMode } = useTheme()
  const { user, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const appData = useAppData({ user, addToast })

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('kormiis_current_view') || 'dashboard')

  useEffect(() => {
    window.__kormiisNavigate = (view) => {
      if (view && view !== currentView) setCurrentView(view)
      window.focus()
    }
    return () => { window.__kormiisNavigate = null }
  }, [currentView])
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const lastScrollY = useRef(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 150)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem('kormiis_current_view', currentView)
    const timer = setTimeout(() => appData.setIsAppLoading(false), 150)
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
      <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message="Loading your workspace..." />}>
        <EmployeePortal
          currentUser={{...user, id: user.id || user.employeeId, role: user.role || 'Teammate', department: user.department || 'Engineering'}}
        themeMode={themeMode}
        isDarkMode={isDarkMode}
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
      </Suspense>
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
          <div className={`sticky top-0 z-40 w-full sm:pt-4 md:pt-6 sm:pb-3 sm:px-4 md:px-6 pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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

          <div className="w-full flex-1 px-4 md:px-6 lg:px-8 pt-4 sm:pt-2 md:pt-0">
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
          <nav className="bottom-bar bottom-bar-pill pointer-events-auto w-full max-w-[210px] flex items-center justify-around px-2 h-15 transition-all duration-300 rounded-full glass-kormiis text-foreground border border-white/30 dark:border-white/14 shadow-2xl backdrop-blur-3xl" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <MobileTabButton
              active={currentView === 'dashboard'}
              label="Home"
              onClick={() => { setCurrentView('dashboard'); setShowMobileMenu(false) }}
            >
              <Icon name="home" size={24}/>
            </MobileTabButton>
            <MobileTabButton
              active={currentView === 'announcements'}
              label="Announcements"
              onClick={() => { setCurrentView('announcements'); setShowMobileMenu(false) }}
            >
              <Icon name="rss_feed" size={24}/>
            </MobileTabButton>
            <MobileTabButton
              active={showMobileMenu}
              label={showMobileMenu ? "Close Menu" : "Menu"}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Icon 
                name={showMobileMenu ? "close" : "menu"} 
                size={24}
                className={`transition-transform duration-300 ${showMobileMenu ? 'rotate-90 text-primary' : 'rotate-0'}`}
              />
            </MobileTabButton>
          </nav>
        </div>
      )}

      {/* Mobile Menu Backdrop Click Catcher (Zero visual overlay) */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-40 md:hidden bg-transparent pointer-events-auto"
          onClick={() => setShowMobileMenu(false)}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={`fixed bottom-0 left-0 right-0 w-full z-50 flex flex-col glass-mobile-drawer shadow-2xl transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden overflow-hidden ${showMobileMenu ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        aria-hidden={!showMobileMenu}
      >
        {/* Pull handle indicator */}
        <div className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mt-2 mb-0.5 shrink-0" />

        <div className="px-5 py-2 border-b border-border/80 dark:border-white/10 shrink-0 flex items-center justify-between">
          <h2 className="text-left text-fluid-sm font-bold text-foreground m-0 leading-none">Menu</h2>
          <button 
            className="rounded-full size-7 apple-glass-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer" 
            onClick={() => setShowMobileMenu(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={16}/>
          </button>
        </div>
        <div className="px-3.5 pt-2.5 pb-7 sm:pb-8">
          <div className="grid grid-cols-2 gap-1.5">
            {visibleNavItems.filter(i => !['dashboard', 'announcements', 'profile'].includes(i.id)).map(item => {
              const active = currentView === item.id
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-2 h-9 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-[0.97] min-w-0 ${
                    active 
                      ? 'bg-primary/15 dark:bg-primary/25 text-primary font-bold border border-primary/35 shadow-xs' 
                      : 'text-foreground font-medium hover:bg-white/20 dark:hover:bg-white/[0.08] border border-white/20 dark:border-white/8 bg-white/10 dark:bg-white/[0.03]'
                  }`}
                  onClick={() => { setCurrentView(item.id); setShowMobileMenu(false) }}
                >
                  <div className={`shrink-0 flex items-center justify-center ${active ? 'text-primary' : 'text-foreground/80'}`}>
                    {item.icon}
                  </div>
                  <span className="text-[12px] font-semibold truncate leading-tight text-left">{item.label}</span>
                </button>
              )
            })}
          </div>
          
          <div className="h-px bg-border/80 dark:bg-white/10 my-2.5 shrink-0" />
          
          <button 
            className="w-full flex items-center justify-center gap-2 h-9.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm active:scale-[0.97] transition-all"
            onClick={() => { handleLogout(); setShowMobileMenu(false) }}
          >
            <Icon name="logout" size={16}/>
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
