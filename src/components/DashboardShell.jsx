import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'

import Sidebar from './layout/Sidebar.jsx'
import Topbar from './layout/Topbar.jsx'
import MobileTabButton from './layout/MobileTabButton.jsx'
import NavigationDock from './layout/NavigationDock.jsx'
import MobileResponsiveBottomBar from './layout/MobileResponsiveBottomBar.jsx'
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

  const { showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem, getCategoryIcon, ConfirmDialog } = useCommandPalette({
    employees: appData.employees, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId, onLoadDemoData: appData.handleLoadDemoData, onClearDemoData: appData.handleClearDemoData
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
        setCommandSearch('')
        setPaletteIndex(0)
        return
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        if (e.key === 'Escape') { e.preventDefault(); setShowCommandPalette(false); setCommandSearch(''); setPaletteIndex(0); e.target.blur() }
        return
      }
      if (e.key === '/') { e.preventDefault(); setShowCommandPalette(true); setCommandSearch(''); setPaletteIndex(0) }
      else if (e.key.toLowerCase() === 'e') { e.preventDefault(); setCurrentView('employees') }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); addToast('Save shortcut triggered', 'info') }
      else if (e.key === 'Escape') { setShowCommandPalette(false); setMobileMenuOpen(false) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addToast, setCurrentView, setCommandSearch, setPaletteIndex, setShowCommandPalette])

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
    <div className="dashboard-root app-shell relative" style={{ display: 'flex', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      <main 
        className={`content dashboard-content ${isMobile ? 'pb-24' : 'pb-12'} px-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center w-full max-w-[100vw] transition-all duration-300`} 
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        <div className="w-full flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className={`sticky top-0 z-40 w-full pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu && !appData.showNotifications ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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

          <div className="w-full max-w-[1920px] mx-auto flex-1 px-3 sm:px-5 md:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
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

      {/* Bottom Menu Bar Dock (Mobile 4-icon dock with expandable menu / Tablet full dock) */}
      {isMobile && (
        <MobileResponsiveBottomBar
          visibleNavItems={visibleNavItems}
          currentView={currentView}
          setCurrentView={setCurrentView}
          isDark={isDarkMode ?? (themeMode === 'dark')}
          onOpenAi={() => {
            setShowAiModal(prev => {
              const next = !prev
              setShowAiHistory(false)
              if (next) setAiModalAction(`open_chat_${Date.now()}`)
              return next
            })
          }}
          isAiOpen={showAiModal}
          notifications={appData.notifications || []}
          markNotificationsRead={appData.markNotificationsRead}
          clearNotifications={appData.clearNotifications || appData.handleClearNotifications}
          unreadCount={appData.notifications ? appData.notifications.filter(n => !n.read).length : 0}
          onProfileClick={() => {
            if (showAiModal) setShowAiModal(false)
            setCurrentView('profile')
          }}
          user={user}
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
          addToast={addToast}
          isScrollingDown={isScrollingDown}
          prefix="admin-bottom"
        />
      )}



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