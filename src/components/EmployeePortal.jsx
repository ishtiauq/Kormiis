import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from "@/components/ui/Icon.jsx"
import AiCoPilotModal from './ai/AiCoPilotModal.jsx'
import AiExpandableFab from './ai/AiExpandableFab.jsx'
import DailyChecklistWidget from './DailyChecklistWidget.jsx'
import { useModal } from '../services/useModal.js'
import { formatDate, formatDateShort, formatDateTime, formatMonthYear, formatDateWithWeekday } from '../services/date.js'
import { parseMin } from '../services/attendance.js'
import { Select, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import Tasks from './Tasks.jsx'
import Calendar from './Calendar.jsx'
import Announcements from './Announcements.jsx'
import Expenses from './Expenses.jsx'
import Documents from './Documents.jsx'
import Notes from './Notes.jsx'
import Sidebar from './layout/Sidebar.jsx'
import Topbar from './layout/Topbar.jsx'
import MobileTabButton from './layout/MobileTabButton.jsx'
import ProfileView from './ProfileView.jsx'
import GeoCheckInWidget from './attendance/GeoCheckInWidget.jsx'
import AttendancePage from './attendance/AttendancePage.jsx'
import GigBoardPage from './hr/GigBoardPage.jsx'
import PerformancePage from './hr/PerformancePage.jsx'
import AiAssistantPage from './ai/AiAssistantPage.jsx'

// Dummy profile image generation based on initials
const getInitialsAvatar = (name) => {
  const parts = name.split(' ')
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]
  
  // Deterministic color
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = hash % 360
  
  return (
    <div className="flex items-center justify-center size-10 rounded-full font-bold text-base shrink-0" style={{
      background: `hsl(${h}, 70%, 80%)`, color: `hsl(${h}, 70%, 20%)`,
    }}>
      {initials.toUpperCase()}
    </div>
  )
}

export default function EmployeePortal({ 
  currentUser,
  currentView,
  setCurrentView,
  themeMode,
  isDarkMode,
  toggleTheme,
  employees, 
  setEmployees,
  attendance, 
  payroll, 
  expenses, 
  addLog, 
  addToast, 
  setAttendance, 
  pendingProfileEdits, 
  setPendingProfileEdits,
  setExpenses,
  roster,
  shiftSwaps,
  setShiftSwaps,
  shiftTemplates,
  overtimeClaims,
  setOvertimeClaims,
  announcements,
  setAnnouncements,
  assets,
  setAssets,
  assetCategories,
  setAssetCategories,
  documents,
  setDocuments,
  tasks,
  setTasks,
  events,
  setEvents,
  assetRequests,
  setAssetRequests,
  settings,
  setSettings,
  addNotification,
  notes,
  setNotes,
  handleLogout,
  showNotifications,
  setShowNotifications,
  notifications,
  markNotificationsRead,
  clearNotifications,
  dataIntegrityIssues = [],
  showCorruptionModal,
  setShowCorruptionModal,
  handleAutoRepairDatabase,
  isSyncing = false
}) {
  const [localActiveTab, setLocalActiveTab] = useState('dashboard')
  const activeTab = currentView || localActiveTab
  const setActiveTab = (tab) => {
    if (setCurrentView) setCurrentView(tab)
    else setLocalActiveTab(tab)
  }
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showAiHistory, setShowAiHistory] = useState(false)
  const [aiModalAction, setAiModalAction] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')
  const [showPunchModal, setShowPunchModal] = useState(false)
  useModal(() => setShowPunchModal(false))
  const [punchClock, setPunchClock] = useState(new Date())

  useEffect(() => {
    if (!showPunchModal) return
    const timer = setInterval(() => setPunchClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [showPunchModal])

  const punchToday = new Date().toISOString().split('T')[0]
  const punchLog = attendance?.dailyLogs?.[punchToday]?.[currentUser?.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
  const isPunchedIn = punchLog.checkIn !== '--'
  const isPunchedOut = punchLog.checkOut !== '--'

  const punchElapsed = (() => {
    if (!isPunchedIn || isPunchedOut) return null
    const ci = parseMin(punchLog.checkIn)
    const now = parseMin(punchClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    if (ci === null || now === null) return null
    let d = now - ci
    if (d < 0) d += 1440
    return `${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m`
  })()
  
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const lastScrollY = useRef(0)

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

  const handlePunchSubmit = () => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    const todayLogs = attendance?.dailyLogs?.[today] || {}
    const myLog = todayLogs[currentUser.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
    
    let updatedLog = { ...myLog }
    let action = 'in'
    if (myLog.checkIn === '--') {
      updatedLog.status = 'Present'
      updatedLog.checkIn = nowTime
    } else if (myLog.checkOut === '--') {
      action = 'out'
      updatedLog.checkOut = nowTime
      const ci = parseMin(myLog.checkIn)
      const co = parseMin(nowTime)
      if (ci !== null && co !== null) {
        let d = co - ci; if (d < 0) d += 1440
        updatedLog.hours = (d / 60).toFixed(1)
      }
    } else {
      addToast('You have already completed check in and check out for today.', 'info')
      setShowPunchModal(false)
      return
    }
    
    const newLogs = {
      ...attendance.dailyLogs,
      [today]: {
        ...todayLogs,
        [currentUser.id]: updatedLog
      }
    }
    
    setAttendance(prev => ({
      ...prev,
      dailyLogs: newLogs
    }))
    
    setShowPunchModal(false)
    addToast(`Successfully clocked ${action === 'in' ? 'in' : 'out'} at ${nowTime}.`, 'success')
  }

  if (!currentUser) {
    return <div className="p-5">Loading portal...</div>
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView currentUser={currentUser} attendance={attendance} setAttendance={setAttendance} addToast={addToast} expenses={expenses} announcements={announcements} setActiveTab={setActiveTab} setShowPunchModal={setShowPunchModal} settings={settings} notes={notes} setNotes={setNotes} />
      case 'attendance':
      case 'schedule':
        return <AttendanceView 
                 currentUser={currentUser} 
                 employees={employees}
                 attendance={attendance} 
                 roster={roster}
                 shiftSwaps={shiftSwaps}
                 setShiftSwaps={setShiftSwaps}
                 shiftTemplates={shiftTemplates}
                 overtimeClaims={overtimeClaims}
                 setOvertimeClaims={setOvertimeClaims}
                 settings={settings}
                 addToast={addToast} 
                 addNotification={addNotification}
               />
      case 'announcements':
        return <Announcements 
                 currentUser={currentUser} 
                 employees={employees} 
                 announcements={announcements} 
                 setAnnouncements={setAnnouncements} 
                 addToast={addToast}
                 addLog={addLog}
                 addNotification={addNotification}
                 headline="Feed"
               />
      case 'payslips':
        return <PayslipsView currentUser={currentUser} payroll={payroll} addToast={addToast} settings={settings} />
      case 'leave':
      case 'leaves':
        return <LeaveView currentUser={currentUser} attendance={attendance} setAttendance={setAttendance} addToast={addToast} addLog={addLog} settings={settings} addNotification={addNotification} />
      case 'profile':
        return <ProfileView 
          currentUser={currentUser} 
          pendingProfileEdits={pendingProfileEdits} 
          setPendingProfileEdits={setPendingProfileEdits} 
          addToast={addToast} 
          addLog={addLog} 
          settings={settings} 
          setSettings={setSettings}
          employees={employees} 
          setEmployees={setEmployees}
          handleLogout={handleLogout}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          addNotification={addNotification}
        />
      case 'assets':
      case 'my-assets':
        return <MyAssetsView
                 currentUser={currentUser}
                 assets={assets}
                 setAssets={setAssets}
                 assetRequests={assetRequests}
                 setAssetRequests={setAssetRequests}
                 assetCategories={assetCategories}
                 setAssetCategories={setAssetCategories}
                 addToast={addToast}
                 addNotification={addNotification}
               />
      case 'tasks':
      case 'my-tasks':
        return <div className="max-w-[1200px] mx-auto w-full"><Tasks tasks={tasks} setTasks={setTasks} employees={employees} currentUser={currentUser} addToast={addToast} addLog={addLog} addNotification={addNotification} /></div>
      case 'calendar':
      case 'events':
        return <div className="max-w-[1200px] mx-auto w-full"><Calendar events={events} setEvents={setEvents} employees={employees} addLog={addLog} addToast={addToast} currentUser={currentUser} addNotification={addNotification} /></div>
      case 'expenses':
        return <div className="max-w-[1200px] mx-auto w-full"><Expenses employees={employees} expenses={expenses} setExpenses={setExpenses} settings={settings} addLog={addLog} addToast={addToast} addAuditLog={addLog} currentUser={currentUser} addNotification={addNotification} /></div>
      case 'documents':
        return <div className="max-w-[1200px] mx-auto w-full"><Documents documents={documents} setDocuments={setDocuments} addLog={addLog} addToast={addToast} currentUser={currentUser} addNotification={addNotification} /></div>
      case 'notes':
        return <div className="max-w-[1200px] mx-auto w-full"><Notes notes={notes} setNotes={setNotes} currentUser={currentUser} addToast={addToast} /></div>
      case 'gigs':
        return <div className="max-w-[1200px] mx-auto w-full"><GigBoardPage adminUid={currentUser.adminUid} currentUser={currentUser} employees={employees} addToast={addToast} /></div>
      case 'performance':
        return <div className="max-w-[1200px] mx-auto w-full"><PerformancePage adminUid={currentUser.adminUid} currentUser={currentUser} addToast={addToast} /></div>
      case 'ai':
        return (
          <div className="w-full">
            <AiAssistantPage
              currentUser={currentUser}
              employees={employees}
              setEmployees={setEmployees}
              payroll={payroll}
              setPayroll={setPayroll}
              attendance={attendance}
              setAttendance={setAttendance}
              expenses={expenses}
              setExpenses={setExpenses}
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              tasks={tasks}
              setTasks={setTasks}
              settings={settings}
              setActiveTab={setActiveTab}
              addToast={addToast}
            />
          </div>
        )
      default:
        return <DashboardView currentUser={currentUser} attendance={attendance} setAttendance={setAttendance} addToast={addToast} expenses={expenses} announcements={announcements} tasks={tasks} events={events} setActiveTab={setActiveTab} setShowPunchModal={setShowPunchModal} settings={settings} notes={notes} setNotes={setNotes} />
      case 'team_attendance':
        return (
          <AttendancePage 
            employees={employees} 
            attendance={attendance} 
            setAttendance={setAttendance} 
            roster={roster} 
            setRoster={setRoster} 
            shiftSwaps={shiftSwaps} 
            setShiftSwaps={setShiftSwaps} 
            shiftTemplates={shiftTemplates} 
            overtimeClaims={overtimeClaims} 
            setOvertimeClaims={setOvertimeClaims} 
            addLog={addLog} 
            addToast={addToast} 
            addNotification={addNotification}
            settings={settings}
            headline="Team Attendance"
          />
        )
    }
  }

  const navItems = [
    { id: 'dashboard', icon: <Icon name="dashboard" size={18}/>, label: 'Dashboard' },
    { id: 'attendance', icon: <Icon name="schedule" size={18}/>, label: 'Attendance' },
    { id: 'my-tasks', icon: <Icon name="check_box" size={18}/>, label: 'Tasks' },
    { id: 'announcements', icon: <Icon name="rss_feed" size={18}/>, label: 'Announcements' },
    { id: 'events', icon: <Icon name="calendar_month" size={18}/>, label: 'Events' },
    { id: 'leave', icon: <Icon name="event_busy" size={18}/>, label: 'Leave' },
    { id: 'payslips', icon: <Icon name="account_balance" size={18}/>, label: 'Payslips' },
    { id: 'expenses', icon: <Icon name="wallet" size={18}/>, label: 'Expenses' },
    { id: 'documents', icon: <Icon name="folder_open" size={18}/>, label: 'Documents' },
    { id: 'notes', icon: <Icon name="sticky_note_2" size={18}/>, label: 'Notes' },
    { id: 'my-assets', icon: <Icon name="devices_other" size={18}/>, label: 'Assets' },
    { id: 'gigs', icon: <Icon name="handshake" size={18}/>, label: 'Help Hub' },
    { id: 'performance', icon: <Icon name="insights" size={18}/>, label: 'Performance' },
    ...(currentUser?.permissions?.includes('manage_attendance') ? [{ id: 'team_attendance', icon: <Icon name="check_circle" size={18}/>, label: 'Team Attendance' }] : []),
    { id: 'profile', icon: <Icon name="person" size={18}/>, label: 'Profile' }
  ]

  const resolvedIsDark = isDarkMode ?? (themeMode === 'dark')

  return (
    <div className="dashboard-root app-shell relative" style={{ display: 'flex', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* 1. Left Navigation Menu Sidebar (Fixed Stationary at calc(50% - 191px)) */}
      <Sidebar
        visibleNavItems={navItems}
        isCollapsed={isSidebarCollapsed}
        isDarkMode={resolvedIsDark}
        currentView={activeTab}
        setCurrentView={setActiveTab}
        mobileMenuOpen={showMobileMenu}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        user={currentUser}
        handleLogout={handleLogout}
        setIsCollapsed={setIsSidebarCollapsed}
        setMobileMenuOpen={setShowMobileMenu}
      />

      <main 
        className={`content dashboard-content ${isMobile ? 'pb-24' : 'pb-12 md:pl-16 md:pr-5 lg:pr-6 xl:pr-8'} flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center max-w-[100vw] transition-all duration-300`} 
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        <div className="w-full max-w-[1920px] flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className={`sticky top-0 z-40 w-full sm:pt-4 md:pt-5 sm:pb-3 px-1 sm:px-2 md:px-2 pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
            <Topbar
                isDarkMode={resolvedIsDark}
                toggleSidebar={() => setShowMobileMenu(prev => !prev)}
                themeMode={themeMode}
                toggleTheme={toggleTheme}
                handleSync={() => {}} 
                isSyncing={isSyncing}
                dataIntegrityIssues={dataIntegrityIssues}
                showCorruptionModal={showCorruptionModal}
                setShowCorruptionModal={setShowCorruptionModal}
                handleAutoRepairDatabase={handleAutoRepairDatabase}
                setShowNotifications={setShowNotifications}
                markNotificationsRead={markNotificationsRead}
                unreadCount={notifications ? notifications.filter(n => !n.read).length : 0}
                showNotifications={showNotifications}
                notifications={notifications}
                clearNotifications={clearNotifications}
                onProfileClick={() => setActiveTab('profile')}
                handleLogout={handleLogout}
                setCurrentView={setActiveTab}
                user={currentUser}
                onOpenAi={() => {
                  setShowAiModal(prev => {
                    const next = !prev
                    setShowAiHistory(false)
                    if (next) setAiModalAction(`open_chat_${Date.now()}`)
                    return next
                  })
                }}
                isAiOpen={showAiModal}
                employees={employees}
                setEmployees={setEmployees}
                payroll={payroll}
                setPayroll={null}
                attendance={attendance}
                setAttendance={setAttendance}
                expenses={expenses}
                setExpenses={setExpenses}
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                tasks={tasks}
                setTasks={setTasks}
                settings={settings}
                aiModalAction={aiModalAction}
                addToast={addToast}
            />
          </div>

          <div className="w-full flex-1 px-1 sm:px-2 md:px-2 pt-4 sm:pt-2 md:pt-0">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Punch Modal */}
      <Dialog open={showPunchModal} onOpenChange={setShowPunchModal}>
        <DialogContent className="sm:max-w-[380px] p-5 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Mark Attendance</DialogTitle>
              <button onClick={() => setShowPunchModal(false)} className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer" aria-label="Close">
                <Icon name="close" size={16}/>
              </button>
            </div>
          </DialogHeader>

          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <Icon name={isPunchedIn ? "login" : "schedule"} className={isPunchedIn ? "text-emerald-500 shrink-0" : "text-primary shrink-0"} size={48}/>
            <div className="text-fluid-display font-black tabular-nums tracking-tight text-foreground" aria-live="polite">
              {punchClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">
              {formatDate(new Date().toISOString().split('T')[0])}
            </div>
            {punchElapsed && (
              <div className="mt-1 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-primary/70">Working time</span>
                <span className="font-sans text-sm font-bold text-primary">{punchElapsed}</span>
              </div>
            )}
          </div>

          <div className="pt-2 pb-1">
            {isPunchedOut ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Icon name="check_circle" size={36} className="text-foreground shrink-0"/>
                <p className="text-fluid-sm font-semibold text-foreground">Today's attendance completed</p>
                <p className="text-fluid-xs text-muted-foreground">In: {punchLog.checkIn} • Out: {punchLog.checkOut} • {punchLog.hours}h</p>
              </div>
            ) : (
              <Button
                onClick={handlePunchSubmit}
                className={`w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 ${!isPunchedIn ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30'}`}
              >
                {isPunchedIn ? <><Icon name="logout" size={18}/> Check Out</> : <><Icon name="login" size={18}/> Check In</>}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar (Mobile) — Floating Pill */}
      {isMobile && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-3.5 sm:pb-4 transition-all duration-300 ${isScrollingDown && !showMobileMenu ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <nav className="bottom-bar bottom-bar-pill pointer-events-auto w-full max-w-[280px] flex items-center justify-around px-2 h-15 transition-all duration-300 rounded-full glass-kormiis text-foreground border border-white/30 dark:border-white/14 shadow-2xl backdrop-blur-3xl" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <MobileTabButton
              active={activeTab === 'dashboard'}
              label="Home"
              onClick={() => { setActiveTab('dashboard'); setShowMobileMenu(false) }}
            >
              <Icon name="home" size={24}/>
            </MobileTabButton>
            <MobileTabButton
              active={activeTab === 'announcements'}
              label="Announcements"
              onClick={() => { setActiveTab('announcements'); setShowMobileMenu(false) }}
            >
              <Icon name="rss_feed" size={24}/>
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
              <Icon name="auto_awesome" size={24}/>
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
            {navItems.filter(i => !['dashboard', 'announcements', 'profile'].includes(i.id)).map(item => {
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-2 h-9 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-[0.97] min-w-0 ${
                    active 
                      ? 'bg-primary/15 dark:bg-primary/25 text-primary font-bold border border-primary/35 shadow-xs' 
                      : 'text-foreground font-medium hover:bg-white/20 dark:hover:bg-white/[0.08] border border-white/20 dark:border-white/8 bg-white/10 dark:bg-white/[0.03]'
                  }`}
                  onClick={() => { setActiveTab(item.id); setShowMobileMenu(false) }}
                >
                  <div className={`shrink-0 flex items-center justify-center ${active ? 'text-primary' : 'text-foreground/80'}`}>
                    {item.icon}
                  </div>
                  <span className="text-[12px] font-semibold break-words leading-tight text-left">{item.label}</span>
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

      {/* Floating AI Co-Pilot Widget (Desktop & Mobile Portal) */}
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
          currentUser={currentUser}
          employees={employees}
          setEmployees={setEmployees}
          payroll={payroll}
          setPayroll={null}
          attendance={attendance}
          setAttendance={setAttendance}
          expenses={expenses}
          setExpenses={setExpenses}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          tasks={tasks}
          setTasks={setTasks}
          settings={settings}
          setCurrentView={setActiveTab}
          addToast={addToast}
          initialAction={aiModalAction}
          isDarkMode={resolvedIsDark}
        />,
        document.body
      )}
    </div>
  )
}

// ----------------------------------------------------

function DashboardView({ currentUser, attendance, setAttendance, addToast, expenses, announcements, tasks, events, setActiveTab, setShowPunchModal, settings, notes, setNotes }) {
  const currentBalances = attendance?.balances?.[currentUser.id] || {
    annual: { limit: 20, used: 0 },
    sick: { limit: 14, used: 0 },
    casual: { limit: 10, used: 0 }
  }

  const myExpenses = expenses?.list?.filter(e => e.employeeId === currentUser.id && e.status === 'Pending') || []
  const totalPending = myExpenses.reduce((sum, e) => sum + e.amount, 0)
  
  const recentAnnouncements = (announcements || [])
    .filter(a => a.audience === 'all' || a.audience === currentUser.department)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)

  const myActiveTasks = tasks?.filter(t => t.assigneeIds?.includes(currentUser.id) && t.status !== 'Done') || []
  
  const todayDate = new Date().toISOString().split('T')[0]
  const upcomingEvents = events?.filter(e => e.date >= todayDate).sort((a,b) => a.date.localeCompare(b.date)) || []
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="dashboard" className="text-foreground shrink-0" size={28}/>
          Dashboard
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-6 sm:p-8 flex items-center gap-5 sm:gap-6">
          <div className="size-16 sm:size-20 bg-background rounded-full shadow-sm flex items-center justify-center p-1">
            {getInitialsAvatar(currentUser.name)}
          </div>
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h1 className="text-fluid-xl font-extrabold tracking-tight m-0 text-foreground">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            <p className="m-0 text-fluid font-medium text-muted-foreground">{currentUser.role} • {currentUser.department}</p>
          </div>
        </CardContent>
      </Card>

      <GeoCheckInWidget 
        currentUser={currentUser} 
        attendance={attendance} 
        setAttendance={setAttendance} 
        addToast={addToast} 
        settings={settings}
      />

      {/* ANNOUNCEMENTS - MOVED TO TOP */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-fluid-xl font-semibold text-foreground m-0">Announcements</h3>
          <button className="bg-transparent border-0 font-semibold cursor-pointer text-sm text-primary hover:text-primary/80 transition-colors" onClick={() => setActiveTab('announcements')}>View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentAnnouncements.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">No new announcements</CardContent>
            </Card>
          ) : (
            recentAnnouncements.map(ann => (
              <Card key={ann.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${ann.priority === 'Urgent' ? 'border-l-4 border-l-red-500' : ''}`} onClick={() => setActiveTab('announcements')}>
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="font-semibold leading-tight ">{ann.title}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDateShort(ann.date)}</span>
                    </div>
                    <p className="text-fluid-sm text-muted-foreground m-0 break-words ">{ann.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} />
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('my-tasks')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Icon name="check_box" size={18}/>
              <h3 className="text-fluid-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Active Tasks</h3>
            </div>
            <div className="text-fluid-xl font-black tabular-nums text-foreground">
              {myActiveTasks.length} <span className="text-fluid-sm font-semibold text-muted-foreground ml-1">tasks</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('events')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <Icon name="calendar_month" size={18}/>
              <h3 className="text-fluid-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Next Event</h3>
            </div>
            <div className="text-fluid-xl font-bold break-words text-foreground mb-1">
              {nextEvent ? nextEvent.title : 'None Scheduled'}
            </div>
            <div className="text-fluid-sm font-medium text-muted-foreground">
              {nextEvent ? formatDateShort(nextEvent.date) : 'Enjoy your time!'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('leave')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <Icon name="calendar_month" size={18}/>
              <h3 className="text-fluid-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Available Leave</h3>
            </div>
            <div className="text-fluid-xl font-black tabular-nums text-foreground">
              {currentBalances.annual.limit - currentBalances.annual.used + currentBalances.sick.limit - currentBalances.sick.used} <span className="text-fluid-sm font-semibold text-muted-foreground ml-1">days total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('my-assets')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-amber-500">
              <Icon name="monitor" size={18}/>
              <h3 className="text-fluid-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Reimbursements</h3>
            </div>
            <div className="text-fluid-xl font-black tabular-nums text-foreground">
              ${totalPending.toFixed(2)} <span className="text-fluid-sm font-semibold text-muted-foreground ml-1">pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <h3 className="text-fluid-xl font-semibold m-0">Quick Actions</h3>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer h-28 flex items-center justify-center group" onClick={() => setActiveTab('leave')}>
            <CardContent className="p-0 flex flex-col gap-3 justify-center items-center">
              <Icon name="calendar_month" className="text-blue-500 transition-transform group-hover:scale-110" size={28}/>
              <span className="text-sm font-medium">Request Leave</span>
            </CardContent>
          </Card>
          <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer h-28 flex items-center justify-center group" onClick={() => setActiveTab('payslips')}>
            <CardContent className="p-0 flex flex-col gap-3 justify-center items-center">
              <Icon name="download" className="text-green-500 transition-transform group-hover:scale-110" size={28}/>
              <span className="text-sm font-medium">Download Payslip</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AttendanceView({ 
  currentUser, 
  employees,
  attendance, 
  roster,
  shiftSwaps,
  setShiftSwaps,
  shiftTemplates,
  overtimeClaims,
  setOvertimeClaims,
  settings,
  addToast,
  addNotification
}) {
  const currentMonth = formatMonthYear(new Date().toISOString().split('T')[0])
  const [activeSubTab, setActiveSubTab] = useState('history') // 'history', 'roster', 'swap', 'overtime', 'offday'

  const today = new Date()
  const currentDay = today.getDay()
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates.push(d)
  }

  const myRoster = weekDates.map(date => {
    const dateStr = date.toISOString().split('T')[0]
    const shiftEntry = roster?.find(r => r.employeeId === currentUser.id && r.date === dateStr)
    const template = shiftTemplates?.find(t => t.id === shiftEntry?.templateId)
    return { date, dateStr, template }
  })

  const [swapDate, setSwapDate] = useState('')
  const [swapColleague, setSwapColleague] = useState('')
  const [swapReason, setSwapReason] = useState('')

  const handleRequestSwap = (e) => {
    e.preventDefault()
    if (!swapDate || !swapColleague) return addToast('Please select date and colleague', 'warning')
    
    const newSwap = {
      id: `swap-${Date.now()}`,
      requesterId: currentUser.id,
      targetId: swapColleague,
      date: swapDate,
      reason: swapReason,
      status: 'Pending'
    }
    
    setShiftSwaps(prev => [...prev, newSwap])
    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested a shift swap for ${swapDate}`, 
        'attendance', 
        { title: 'Shift Swap Requested', category: 'attendance', targetRoles: ['Admin', 'HR'], targetEmployeeIds: swapColleague ? [swapColleague] : null }
      )
    }

    setSwapDate('')
    setSwapColleague('')
    setSwapReason('')
    addToast('Shift swap request sent to HR for approval.', 'success')
  }

  const [offdayCurrent, setOffdayCurrent] = useState('')
  const [offdayNew, setOffdayNew] = useState('')
  const [offdayReason, setOffdayReason] = useState('')
  const [offdayType, setOffdayType] = useState('Temporary')

  const handleRequestOffday = (e) => {
    e.preventDefault()
    if (!offdayCurrent || !offdayNew) return addToast('Please select both dates', 'warning')
    
    // In a real app this would go to HR approval. For now we just mock the request.
    setOffdayCurrent('')
    setOffdayNew('')
    setOffdayReason('')
    setOffdayType('Temporary')
    addToast('Alternative offday request sent to HR for approval.', 'success')
  }

  const [otDate, setOtDate] = useState('')
  const [otHours, setOtHours] = useState('')
  const [otReason, setOtReason] = useState('')

  const handleClaimOvertime = (e) => {
    e.preventDefault()
    if (!otDate || !otHours) return addToast('Please fill required fields', 'warning')

    const newClaim = {
      id: `ot-${Date.now()}`,
      employeeId: currentUser.id,
      date: otDate,
      hours: parseFloat(otHours),
      reason: otReason,
      status: 'Pending'
    }

    setOvertimeClaims(prev => [...prev, newClaim])
    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} submitted an overtime claim of ${otHours} hours for ${otDate}`, 
        'attendance', 
        { title: 'Overtime Claim Submitted', category: 'attendance', targetRoles: ['Admin', 'HR'] }
      )
    }

    setOtDate('')
    setOtHours('')
    setOtReason('')
    addToast('Overtime claim submitted for approval.', 'success')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="schedule" className="text-foreground shrink-0" size={28}/>
          Attendance
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Attendance sections" className="menu-bar">
          <Button
            role="tab"
            aria-selected={activeSubTab === 'history'}
            variant={activeSubTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'history' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <Icon name="schedule" size={15}/> My Logs
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'roster'}
            variant={activeSubTab === 'roster' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'roster' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('roster')}
          >
            <Icon name="swap_vert" size={15}/> My Schedule
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'swap'}
            variant={activeSubTab === 'swap' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'swap' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('swap')}
          >
            <Icon name="swap_horiz" size={15}/> Request Swap
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'offday'}
            variant={activeSubTab === 'offday' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'offday' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('offday')}
          >
            <Icon name="event_busy" size={15}/> Change Offday
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'overtime'}
            variant={activeSubTab === 'overtime' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'overtime' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('overtime')}
          >
            <Icon name="memory" size={15}/> Log Overtime
          </Button>
        </div>
      </div>

      {activeSubTab === 'history' && (() => {
        const myHistory = Object.entries(attendance?.dailyLogs || {})
          .filter(([date, logs]) => logs[currentUser.id])
          .map(([date, logs]) => ({ date, log: logs[currentUser.id] }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 30) // last 30 days
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>My Attendance Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Total Hrs</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No recent logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myHistory.map(({ date, log }) => (
                        <TableRow key={date}>
                          <TableCell className="font-medium">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                          <TableCell>{log.checkIn}</TableCell>
                          <TableCell>{log.checkOut}</TableCell>
                          <TableCell>{log.hours}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'Present' ? 'default' : 'secondary'}>{log.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {activeSubTab === 'roster' && (
        <Card>
          <CardHeader>
            <CardTitle>This Week ({currentMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              {myRoster.map(({ date, template }, i) => (
                <div key={i} className="p-4 rounded-lg flex flex-col gap-2 border" style={{ 
                  borderColor: template ? template.color : 'hsl(var(--border))',
                  backgroundColor: template ? `${template.color}15` : 'hsl(var(--muted))',
                }}>
                  <div className="text-sm font-medium text-muted-foreground">{formatDateWithWeekday(date.toISOString().split('T')[0])}</div>
                  {template ? (
                    <>
                      <div className="font-bold" style={{ color: template.color }}>{template.name}</div>
                      <div className="text-xs text-foreground">{template.start} - {template.end}</div>
                    </>
                  ) : (
                    <div className="font-semibold text-muted-foreground">Off</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'swap' && (
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="swap_horiz" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Request Shift Swap</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="swap-form" onSubmit={handleRequestSwap} className="flex flex-col gap-5">
              <div className="space-y-2">
                <DatePicker label="Date to Swap" required value={swapDate} onChange={(e) => setSwapDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Colleague to Swap With</label>
                <Select value={swapColleague} onChange={setSwapColleague} placeholder="Select Colleague...">
                  {employees?.filter(e => e.id !== currentUser.id && e.department === currentUser.department).map(emp => (
                    <SelectItem id={emp.id} key={emp.id}>{emp.name}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Reason</label>
                <textarea 
                  rows={3} 
                  value={swapReason} 
                  onChange={(e) => setSwapReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Why do you need to swap?" 
                />
              </div>
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="swap-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
            </Button>
          </div>
        </Card>
      )}

      {activeSubTab === 'offday' && (
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="event_busy" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Request Alternative Offday</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="offday-form" onSubmit={handleRequestOffday} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Change Type</label>
                <Select value={offdayType} onChange={setOffdayType} placeholder="Select Change Type">
                  <SelectItem id="Temporary">One-time Change (This Week Only)</SelectItem>
                  <SelectItem id="Permanent">Permanent Change (From Now On)</SelectItem>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">{offdayType === 'Permanent' ? 'Current Offday' : 'Regular Offday (Working Day)'}</label>
                  <Input type={offdayType === 'Permanent' ? 'text' : 'date'} required value={offdayCurrent} onChange={(e) => setOffdayCurrent(e.target.value)} placeholder={offdayType === 'Permanent' ? 'e.g. Friday' : ''} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Requested Offday</label>
                  <Input type={offdayType === 'Permanent' ? 'text' : 'date'} required value={offdayNew} onChange={(e) => setOffdayNew(e.target.value)} placeholder={offdayType === 'Permanent' ? 'e.g. Sunday' : ''} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Reason</label>
                <textarea 
                  rows={3} 
                  value={offdayReason} 
                  onChange={(e) => setOffdayReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Why do you need to change your offday?" 
                />
              </div>
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="offday-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
            </Button>
          </div>
        </Card>
      )}


      {activeSubTab === 'overtime' && (
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="memory" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Log Overtime</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="overtime-form" onSubmit={handleClaimOvertime} className="flex flex-col gap-5">
              <div className="space-y-2">
                <DatePicker label="Date" required value={otDate} onChange={(e) => setOtDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Total Overtime Hours</label>
                <Input type="number" step="0.5" required value={otHours} onChange={(e) => setOtHours(e.target.value)} placeholder="e.g. 2.5" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Justification / Manager Name</label>
                <textarea 
                  rows={3} 
                  required 
                  value={otReason} 
                  onChange={(e) => setOtReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Explain work done..." 
                />
              </div>
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="overtime-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Overtime
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function PayslipsView({ currentUser, payroll, addToast, settings }) {
  const myPayslips = (payroll?.history || []).filter(p => p.employeeId === currentUser.id)

  const downloadSlipPDF = async (slip) => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      const companyName = settings?.company?.name || 'Kormiis'
      const companyLogo = settings?.company?.logo
      const pdfCurrency = settings?.currency || '৳'
      let startY = 20

      if (companyLogo) {
        try {
          let format = 'PNG'
          if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) format = 'JPEG'
          else if (companyLogo.startsWith('data:image/webp')) format = 'WEBP'
          doc.addImage(companyLogo, format, 14, 14, 18, 18)
          
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(20, 20, 20)
          doc.text(companyName.toUpperCase(), 36, 21)
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(`OFFICIAL PAYSLIP • ${slip.date}`, 36, 28)
          startY = 38
        } catch (e) {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.text(`${companyName.toUpperCase()} — PAYSLIP`, 14, 22)
          startY = 32
        }
      } else {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(`${companyName.toUpperCase()} — PAYSLIP`, 14, 22)
        startY = 32
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
      doc.text(`Employee Name: ${currentUser.name}`, 14, startY)
      doc.text(`Role: ${currentUser.role || 'Employee'}`, 14, startY + 6)
      doc.text(`Pay Period / Date: ${slip.date}`, 14, startY + 12)

      autoTable(doc, {
        startY: startY + 18,
        head: [['Component', 'Amount']],
        body: [
          ['Gross Pay', `${pdfCurrency} ${Number(slip.gross || 0).toFixed(2)}`],
          ['Total Deductions', `-${pdfCurrency} ${Number(slip.deductions || 0).toFixed(2)}`],
          ['Net Disbursed Salary', `${pdfCurrency} ${Number(slip.net || 0).toFixed(2)}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [254, 53, 1] },
        styles: { fontSize: 10, cellPadding: 4 }
      })

      const finalY = (doc.lastAutoTable?.finalY ?? (startY + 45)) + 15
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(120, 120, 120)
      doc.text(`This is a computer-generated payslip for ${currentUser.name}. Issued by ${companyName}.`, 14, finalY)

      doc.save(`Payslip_${currentUser.name.replace(/\s+/g, '_')}_${slip.date}.pdf`)
      addToast('Payslip PDF downloaded successfully', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to download PDF', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="account_balance" className="text-foreground shrink-0" size={28}/>
          Payslips
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      {myPayslips.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No payslips available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myPayslips.map((slip, i) => (
                <TableRow key={i}>
                  <TableCell>{slip.date}</TableCell>
                  <TableCell>{settings?.currency || '$'}{slip.gross}</TableCell>
                  <TableCell>{settings?.currency || '$'}{slip.deductions}</TableCell>
                  <TableCell className="font-semibold text-green-600 dark:text-green-400">{settings?.currency || '$'}{slip.net}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => downloadSlipPDF(slip)}>
                      <Icon name="download" className="h-4 w-4 mr-2" size={16}/> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function LeaveView({ currentUser, attendance, setAttendance, addToast, addLog, settings, addNotification }) {
  const myLeaves = (attendance?.leaves || []).filter(l => l.employeeId === currentUser.id)
  
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 }
  const myBalance = attendance?.leaveBalances?.[currentUser.id] || defaultPolicies
  const leaveTypes = Object.keys(defaultPolicies)
  
  const [type, setType] = useState(leaveTypes[0] || 'Annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptName, setReceiptName] = useState('')

  const handleApply = (e) => {
    e.preventDefault()
    if (!startDate || !endDate) return addToast('Please select dates', 'warning')
    
    const newLeave = {
      id: `leave-${Date.now()}`,
      employeeId: currentUser.id,
      leaveType: type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      receipt,
      receiptName
    }

    setAttendance(prev => ({ ...prev, leaves: [newLeave, ...(prev.leaves || [])] }))
    addToast('Leave request submitted successfully!', 'success')
    addLog('Leave Requested', `${currentUser.name} requested ${type} leave.`, 'info')

    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested ${type} leave (${startDate} to ${endDate})`,
        'leaves',
        { title: 'New Leave Request', category: 'leave', targetRoles: ['Admin', 'HR'] }
      )
    }

    setStartDate(''); setEndDate(''); setReason(''); setReceipt(null); setReceiptName('')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="calendar_month" className="text-foreground shrink-0" size={28}/>
          Leave
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(myBalance).map(([lType, days]) => (
       <Card key={lType} className="bg-muted/40 border-border/50 shadow-sm">
             <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{lType}</div>
                <div className="text-fluid-display font-black text-foreground tabular-nums">{days} <span className="text-fluid-sm text-muted-foreground">days</span></div>
             </CardContent>
           </Card>
        ))}
      </div>
      
      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="calendar_month" className="text-foreground shrink-0" size={24}/>
            <CardTitle className="text-base m-0 modal-title-solid">Apply for Leave</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {Object.entries(myBalance).reduce((sum, [, d]) => sum + (d || 0), 0)} days left
          </Badge>
        </div>
        <CardContent className="p-5 sm:p-6">
          <form id="apply-leave-form" onSubmit={handleApply} className="flex flex-col gap-5 max-w-[500px]">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Leave type</label>
              <Select value={type} onChange={setType} placeholder="Leave type">
                {leaveTypes.map(t => (
                  <SelectItem key={t} id={t}>{t}</SelectItem>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              <DatePicker label="End Date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Reason / Handover notes</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                placeholder="Reason / Handover notes" 
                rows="3" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Attach Receipt / Medical Certificate</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" type="button" className="relative cursor-pointer overflow-hidden group">
                  <Icon name="upload" className="h-4 w-4 mr-2" size={16}/> 
                  <span>{receiptName ? 'Change Document' : 'Upload File'}</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiptName(file.name);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </Button>
                {receiptName && (
                  <span className="text-sm text-muted-foreground break-words max-w-[200px]">
                    {receiptName}
                  </span>
                )}
              </div>
            </div>

          </form>
        </CardContent>
        <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
          <Button type="submit" form="apply-leave-form">
            <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No leave history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  myLeaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.leaveType}</TableCell>
                      <TableCell>{l.startDate} to {l.endDate}</TableCell>
                      <TableCell className="max-w-[200px] break-words">{l.reason}</TableCell>
                      <TableCell>
                        {l.receipt ? (
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <a href={l.receipt} target="_blank" rel="noreferrer">
                              <Icon name="description" className="h-3.5 w-3.5 mr-1" size={14}/> View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'Approved' ? 'default' : l.status === 'Rejected' ? 'destructive' : 'secondary'} className={l.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : l.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// My Assets View (Employee)
// ----------------------------------------------------------------------
function MyAssetsView({ currentUser, assets, setAssets, assetRequests, setAssetRequests, addToast, assetCategories, setAssetCategories, addNotification }) {
  const [activeTab, setActiveTab] = useState('assigned') // 'assigned', 'request', 'maintenance'
  const [requestForm, setRequestForm] = useState({ name: '', category: 'Laptop', justification: '', urgency: 'Medium' })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [catFormName, setCatFormName] = useState('')
  const [maintenanceForm, setMaintenanceForm] = useState({ assetId: '', urgency: 'Medium', description: '' })
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueAsset, setIssueAsset] = useState(null)
  const [issueText, setIssueText] = useState('')
  const [successDialog, setSuccessDialog] = useState(null) // 'equipment' | 'maintenance' | null

  const myAssets = (assets || []).filter(a => a.assignedTo === currentUser.id && a.status === 'Assigned')
  const myRequests = (assetRequests || []).filter(r => r.employeeId === currentUser.id)

  const allCategories = [...new Set([...(assetCategories || []), ...(assets || []).map(a => a.category).filter(Boolean)])]

  const handleSaveCategory = () => {
    const name = catFormName.trim()
    if (!name) return addToast('Category name is required', 'warning')
    if (!allCategories.includes(name)) {
      setAssetCategories(prev => [...prev, name])
      setRequestForm(p => ({ ...p, category: name }))
      addToast('Category added', 'success')
    } else {
      addToast('Category already exists', 'warning')
    }
    setCatFormName('')
    setShowCategoryModal(false)
  }

  const handleReportIssue = (e) => {
    e.preventDefault()
    setAssets(prev => prev.map(a => {
      if (a.id === issueAsset.id) {
        return {
          ...a,
          status: 'Under Repair',
          maintenanceLogs: [...(a.maintenanceLogs || []), {
            id: `maint-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            issue: issueText,
            cost: 0,
            vendor: 'Reported by Employee',
            status: 'In Progress'
          }]
        }
      }
      return a
    }))

    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} reported an issue for asset: "${issueAsset?.name || 'Asset'}"`, 
        'assets', 
        { title: 'Asset Issue Reported', category: 'asset', targetRoles: ['Admin', 'HR'] }
      )
    }

    setIssueText('')
    setShowIssueModal(false)
    addToast('Issue reported. IT will follow up shortly.', 'success')
  }

  const handleRequestReturn = (assetId) => {
    const targetAsset = (assets || []).find(a => a.id === assetId)
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        return { ...a, status: 'Available', assignedTo: null, assignmentDate: null }
      }
      return a
    }))

    if (addNotification && targetAsset) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested return for asset: "${targetAsset.name || 'Asset'}"`, 
        'assets', 
        { title: 'Asset Return Request', category: 'asset', targetRoles: ['Admin', 'HR'] }
      )
    }

    addToast('Return request submitted. Please hand over the device to IT/HR.', 'info')
  }

  const handleSubmitRequest = (e) => {
    e.preventDefault()
    const newReq = {
      id: `AREQ-${Date.now()}`,
      employeeId: currentUser.id,
      type: 'equipment',
      name: requestForm.name,
      category: requestForm.category,
      justification: requestForm.justification,
      urgency: requestForm.urgency,
      status: 'Pending',
      date: new Date().toISOString()
    }
    setAssetRequests(prev => [newReq, ...prev])

    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested asset: "${requestForm.name || requestForm.category}"`, 
        'assets', 
        { title: 'New Asset Request', category: 'asset', targetRoles: ['Admin', 'HR'] }
      )
    }

    setRequestForm({ name: '', category: 'Laptop', justification: '', urgency: 'Medium' })
    setSuccessDialog('equipment')
    addToast('Asset request submitted to IT/HR', 'success')
  }

  const handleSubmitMaintenanceRequest = (e) => {
    e.preventDefault()
    const asset = (assets || []).find(a => a.id === maintenanceForm.assetId)
    const newReq = {
      id: `MREQ-${Date.now()}`,
      employeeId: currentUser.id,
      type: 'maintenance',
      assetId: maintenanceForm.assetId,
      assetName: asset?.name || '',
      category: asset?.category || 'Maintenance',
      justification: maintenanceForm.description,
      urgency: maintenanceForm.urgency,
      status: 'Pending',
      date: new Date().toISOString()
    }
    setAssetRequests(prev => [newReq, ...prev])

    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested maintenance for asset: "${asset?.name || 'Asset'}"`, 
        'assets', 
        { title: 'Asset Maintenance Request', category: 'asset', targetRoles: ['Admin', 'HR'] }
      )
    }

    setMaintenanceForm({ assetId: '', urgency: 'Medium', description: '' })
    setSuccessDialog('maintenance')
    addToast('Maintenance request submitted to IT/HR', 'success')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[900px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name="monitor" className="text-foreground shrink-0" size={28}/>
          Assets
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      <div className="bg-card p-1.5 rounded-xl border border-border/50 shadow-sm w-full sm:w-auto">
          <div className="menu-bar">
            <Button variant={activeTab === 'assigned' ? 'default' : 'ghost'} size="sm" className="rounded-full px-4" onClick={() => setActiveTab('assigned')}>
              Assigned to Me
            </Button>
            <Button variant={activeTab === 'request' ? 'default' : 'ghost'} size="sm" className="rounded-full px-4" onClick={() => setActiveTab('request')}>
              Request Equipment
            </Button>
            <Button variant={activeTab === 'maintenance' ? 'default' : 'ghost'} size="sm" className="rounded-full px-4" onClick={() => setActiveTab('maintenance')}>
              Maintenance Request
            </Button>
          </div>
      </div>

      {activeTab === 'assigned' && (
        <div className="flex flex-col gap-4">
          {myAssets.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Icon name="monitor" className="h-10 w-10 mb-3 opacity-20" size={40}/>
                No assets are currently assigned to you.
              </CardContent>
            </Card>
          ) : (
            myAssets.map(asset => (
              <Card key={asset.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <Icon name="monitor" className="text-primary shrink-0" size={36}/>
                    <div>
                      <div className="font-bold text-lg">{asset.name}</div>
                      <div className="text-sm text-muted-foreground">{asset.category} &middot; SN: {asset.serialNumber}</div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        Assigned: {asset.assignmentDate} &middot; Condition: {asset.condition}
                      </div>
                      {asset.warrantyExpiry && (
                        <div className="text-xs text-muted-foreground">Warranty until: {asset.warrantyExpiry}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600" onClick={() => { setIssueAsset(asset); setShowIssueModal(true) }}>
                      <Icon name="warning" className="h-4 w-4 mr-2" size={16}/> Report Issue
                    </Button>
                    <Button variant="outline" onClick={() => handleRequestReturn(asset.id)}>
                      Request Return
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {myRequests.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-3">My Past Requests</h4>
              <div className="space-y-3">
                {myRequests.map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{req.category}</span>
                        <span className="ml-2 text-sm text-muted-foreground break-words max-w-[200px] sm:max-w-[400px] inline-block align-bottom">&quot;{req.justification}&quot;</span>
                      </div>
                      <Badge variant={req.status === 'Approved' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'} className={req.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : req.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                        {req.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <Card>
          <CardHeader>
            <CardTitle>Request New Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="flex flex-col gap-5 max-w-[500px]">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Equipment Name / Model</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro 14-inch, iPhone 15..."
                  value={requestForm.name}
                  onChange={e => setRequestForm(p => ({...p, name: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Equipment Category</label>
                <div className="flex bg-muted/40 rounded-xl p-1 border border-border/50 focus-within:ring-0 focus-within:outline-none transition-all">
                  <div className="flex-1">
                    <Select value={requestForm.category || null} onChange={(val) => setRequestForm(p => ({...p, category: val}))} placeholder="Category">
                      {allCategories.map(cat => (
                        <SelectItem key={cat} id={cat}>{cat}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <button type="button" className="shrink-0 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-none group/add h-10 px-4 rounded-lg flex items-center transition-all duration-300 ease-out overflow-hidden" onClick={() => { setCatFormName(''); setShowCategoryModal(true) }}>
                    <Icon name="add" className="transition-transform duration-300 group-hover/add:rotate-90 group-hover/add:scale-110" size={18}/>
                    <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 ease-out group-hover/add:w-auto group-hover/add:opacity-100 group-hover/add:ml-2">Add</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Urgency Level</label>
                <Select value={requestForm.urgency} onChange={(val) => setRequestForm(p => ({...p, urgency: val}))} placeholder="Urgency">
                  <SelectItem id="Low">Low</SelectItem>
                  <SelectItem id="Medium">Medium</SelectItem>
                  <SelectItem id="High">High</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Justification</label>
                <textarea 
                  required 
                  rows={4} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Explain why you need this equipment..." 
                  value={requestForm.justification} 
                  onChange={e => setRequestForm(p => ({...p, justification: e.target.value}))} 
                />
              </div>
              <Button type="submit" className="w-fit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader>
            <CardTitle>Request Equipment Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            {myAssets.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Icon name="build" className="h-10 w-10 mb-3 opacity-20" size={40}/>
                No assets are currently assigned to you, so there is nothing to request maintenance for.
              </div>
            ) : (
              <form onSubmit={handleSubmitMaintenanceRequest} className="flex flex-col gap-5 max-w-[500px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Asset</label>
                  <Select value={maintenanceForm.assetId} onChange={(val) => setMaintenanceForm(p => ({...p, assetId: val}))} placeholder="Select an assigned asset">
                    {myAssets.map(asset => (
                      <SelectItem key={asset.id} id={asset.id}>{asset.name} (SN: {asset.serialNumber})</SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Urgency Level</label>
                  <Select value={maintenanceForm.urgency} onChange={(val) => setMaintenanceForm(p => ({...p, urgency: val}))} placeholder="Urgency">
                    <SelectItem id="Low">Low</SelectItem>
                    <SelectItem id="Medium">Medium</SelectItem>
                    <SelectItem id="High">High</SelectItem>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Describe the Problem</label>
                  <textarea 
                    required 
                    rows={4} 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    placeholder="e.g. Battery drains quickly, screen flickering, keyboard not working..." 
                    value={maintenanceForm.description} 
                    onChange={e => setMaintenanceForm(p => ({...p, description: e.target.value}))} 
                  />
                </div>
                <Button type="submit" className="w-fit">Submit Maintenance Request</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Issue Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Report Issue: {issueAsset?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportIssue} className="flex flex-col gap-5 pt-4">
            <textarea 
              required 
              rows={5} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Describe the issue in detail..." 
              value={issueText} 
              onChange={e => setIssueText(e.target.value)} 
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button type="submit">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Submitted Success Dialog */}
      <Dialog open={!!successDialog} onOpenChange={(open) => { if (!open) setSuccessDialog(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <div className="size-16 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                <Icon name="check_circle" size={36}/>
              </div>
              <DialogTitle className="text-xl">Request Submitted</DialogTitle>
              <DialogDescription className="text-sm max-w-[280px]">
                {successDialog === 'maintenance'
                  ? 'Your maintenance request has been sent to IT/HR. They will follow up shortly.'
                  : 'Your equipment request has been sent to IT/HR. You will be notified once it is approved.'}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => setSuccessDialog(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-4 mb-4 space-y-0">
            <DialogTitle>Manage Categories</DialogTitle>
            <button className="rounded-full p-2 hover:bg-muted transition-colors" onClick={() => { setShowCategoryModal(false); setCatFormName('') }}>
              <Icon name="close" size={16}/>
            </button>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.82rem] font-semibold text-muted-foreground">Categories</label>
              <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
                {allCategories.map(cat => (
                  <div key={cat} className={`flex items-center gap-2 p-2 px-3 rounded-lg bg-muted/30 border ${requestForm.category === cat ? 'border-primary/40' : 'border-border'}`}>
                    <button type="button" className="flex-1 text-[0.9rem] font-medium text-foreground text-left" onClick={() => { setRequestForm(p => ({...p, category: cat})); setShowCategoryModal(false) }}>
                      {cat}
                    </button>
                    {requestForm.category === cat && <Icon name="check" className="text-primary shrink-0" size={16}/>}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="m-0 mb-3 text-[0.95rem] font-semibold text-foreground">Add New Category</h3>
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  value={catFormName}
                  onChange={e => setCatFormName(e.target.value)}
                  aria-label="Category name"
                  placeholder="e.g. Printer"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCategory();
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" className="flex items-center gap-1.5" onClick={handleSaveCategory}>
                    <Icon name="add" size={14}/> Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
