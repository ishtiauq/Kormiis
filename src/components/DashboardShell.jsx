import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'

import Sidebar from './layout/Sidebar.jsx'
import Topbar from './layout/Topbar.jsx'
import MobileTabButton from './layout/MobileTabButton.jsx'
import Icon from "@/components/ui/Icon.jsx"
import ToastContainer from './layout/ToastContainer.jsx'
import CommandPalette from './layout/CommandPalette.jsx'
import AppContent from './AppContent.jsx'
import AiExpandableFab, { AiQuantumGlyph } from './ai/AiExpandableFab.jsx'
import { allNavItems } from '../utils/helpers.js'
import { useCommandPalette } from '../hooks/useCommandPalette.jsx'
import LoadingScreen from './layout/LoadingScreen.jsx'
import useAppData from '../hooks/useAppData.js'
import AiCoPilotModal from './ai/AiCoPilotModal.jsx'

const EmployeePortal = lazy(() => import('./EmployeePortal.jsx'))

export default function DashboardShell({ user, themeMode, isDarkMode, toggleTheme, addToast, toasts, removeToast, handleLogout, currentView, setCurrentView, isMobile }) {
  const appData = useAppData({ user, addToast })

  const [showAiModal, setShowAiModal] = useState(false)
  const [showAiHistory, setShowAiHistory] = useState(false)
  const [aiModalAction, setAiModalAction] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const lastScrollY = useRef(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  useEffect(() => {
    localStorage.setItem('kormiis_current_view', currentView)
  }, [currentView])

  const scrollRafRef = useRef(null)
  const handleScroll = (e) => {
    if (!isMobile || scrollRafRef.current) return;
    const currentScrollY = e.target.scrollTop;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (currentScrollY < 50) {
        setIsScrollingDown(false);
      } else if (currentScrollY > lastScrollY.current + 5) {
        setIsScrollingDown(true);
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsScrollingDown(false);
      }
      lastScrollY.current = currentScrollY;
    });
  }

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

  if (user.isEmployee || user.role === 'Teammate') {
    return (
      <Suspense fallback={<LoadingScreen isDarkMode={isDarkMode} message="Loading your workspace..." />}>
        <EmployeePortal
          currentUser={{...user, id: user.id || user.employeeId, role: user.role || 'Teammate', department: user.department || 'Engineering'}}
          currentView={currentView}
          setCurrentView={setCurrentView}
          themeMode={themeMode}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          employees={appData.employees}
        setEmployees={appData.handleSetEmployees}
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
        setSettings={appData.handleSetSettings}
        addNotification={appData.addNotification}
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
        dataIntegrityIssues={appData.dataIntegrityIssues}
        showCorruptionModal={appData.showCorruptionModal}
        setShowCorruptionModal={appData.setShowCorruptionModal}
        handleAutoRepairDatabase={appData.handleAutoRepairDatabase}
        isSyncing={appData.isSyncing}
      />
      </Suspense>
    )
  }

  const visibleNavItems = allNavItems.filter(item => appData.hasPermission(item.id))
  const unreadCount = appData.notifications.filter(n => !n.read).length

  return (
    <div className="dashboard-root app-shell relative" style={{ display: 'flex', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      <main 
        className={`content dashboard-content ${isMobile ? 'pb-24' : 'pb-12 px-3 sm:px-5 md:px-6 lg:px-8'} flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center max-w-[100vw] transition-all duration-300`} 
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        <div className="w-full max-w-[1920px] flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className={`sticky top-0 z-40 w-full sm:pt-4 md:pt-5 pb-1.5 sm:pb-2.5 md:pb-3 px-1 sm:px-2 md:px-2 pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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
                currentView={currentView}
                setCurrentView={setCurrentView}
                visibleNavItems={visibleNavItems}
                user={user}
                onOpenSearch={() => setShowCommandPalette(true)}
                onOpenAi={() => {
                  setShowAiModal(prev => {
                    const next = !prev
                    setShowAiHistory(false)
                    if (next) setAiModalAction(`open_chat_${Date.now()}`)
                    return next
                  })
                }}
                isAiOpen={showAiModal}
                employees={appData.employees}
                setEmployees={appData.handleSetEmployees}
                payroll={appData.payroll}
                setPayroll={appData.handleSetPayroll}
                attendance={appData.attendance}
                setAttendance={appData.setAttendance || appData.handleSetAttendance}
                expenses={appData.expenses}
                setExpenses={appData.setExpenses || appData.handleSetExpenses}
                announcements={appData.announcements}
                setAnnouncements={appData.setAnnouncements}
                tasks={appData.tasks}
                setTasks={appData.setTasks || appData.handleSetTasks}
                settings={appData.settings}
                aiModalAction={aiModalAction}
                addToast={addToast}
              />
          </div>

          <div className="w-full flex-1 px-1 sm:px-2 md:px-2 pt-2.5 sm:pt-4 md:pt-5 lg:pt-6">
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
            handleLogout={handleLogout}
            {...appData}
          />
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar (Mobile) - Floating Pill */}
      {isMobile && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-3.5 sm:pb-4 transition-all duration-300 ${isScrollingDown && !showMobileMenu ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <nav className="bottom-bar bottom-bar-pill pointer-events-auto w-auto max-w-[185px] flex items-center justify-center gap-1.5 px-2.5 h-13.5 transition-all duration-300 rounded-full glass-kormiis text-foreground border border-white/30 dark:border-white/14 shadow-2xl backdrop-blur-3xl" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <MobileTabButton
              active={currentView === 'dashboard'}
              label="Dashboard"
              onClick={() => { setCurrentView('dashboard'); setShowMobileMenu(false) }}
            >
              <Icon name="dashboard" size={24}/>
            </MobileTabButton>
            <MobileTabButton
              active={showAiModal}
              label="AI Assistant"
              onClick={() => {
                setShowAiModal(prev => {
                  const next = !prev
                  setShowAiHistory(false)
                  if (next) setAiModalAction(`open_chat_${Date.now()}`)
                  return next
                })
                setShowMobileMenu(false)
              }}
            >
              <AiQuantumGlyph size={24} className="transition-transform duration-300" />
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

      {/* Mobile & Tablet Menu Backdrop Click Catcher (Zero visual overlay) */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-transparent pointer-events-auto"
          onClick={() => setShowMobileMenu(false)}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={`fixed bottom-0 left-0 right-0 w-full z-50 flex flex-col glass-mobile-drawer shadow-2xl transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden overflow-hidden ${showMobileMenu ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
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
            {visibleNavItems.filter(i => !['dashboard', 'profile'].includes(i.id)).map(item => {
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
                  <span className="text-[12px] font-semibold break-words leading-tight text-left">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating AI Co-Pilot Widget (Collapsed FAB hidden on mobile via CSS) */}
      {createPortal(
        <AiExpandableFab
          isOpen={showAiModal}
          onToggle={() => {
            setShowAiModal(prev => {
              const next = !prev
              setShowAiHistory(false)
              if (next) setAiModalAction(`open_chat_${Date.now()}`)
              return next
            })
          }}
          onClose={() => {
            setShowAiModal(false)
            setShowAiHistory(false)
          }}
          currentUser={user}
          employees={appData.employees}
          setEmployees={appData.handleSetEmployees}
          payroll={appData.payroll}
          setPayroll={appData.handleSetPayroll}
          attendance={appData.attendance}
          setAttendance={appData.setAttendance || appData.handleSetAttendance}
          expenses={appData.expenses}
          setExpenses={appData.setExpenses || appData.handleSetExpenses}
          announcements={appData.announcements}
          setAnnouncements={appData.setAnnouncements}
          tasks={appData.tasks}
          setTasks={appData.setTasks || appData.handleSetTasks}
          settings={appData.settings}
          setCurrentView={setCurrentView}
          addToast={addToast}
          initialAction={aiModalAction}
          isDarkMode={isDarkMode}
        />,
        document.body
      )}

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