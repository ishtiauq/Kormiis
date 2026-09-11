import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from "@/components/ui/Icon.jsx"
import NavigationDock from './layout/NavigationDock.jsx'
import MobileResponsiveBottomBar from './layout/MobileResponsiveBottomBar.jsx'
import AiCoPilotModal from './ai/AiCoPilotModal.jsx'
import AiExpandableFab, { AiQuantumGlyph } from './ai/AiExpandableFab.jsx'
import { useModal } from '../services/useModal.js'
import { formatDate } from '../services/date.js'
import { parseMin } from '../services/attendance.js'
import { Select, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
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
import EmployeeSettings from './EmployeeSettings.jsx'
import GeoCheckInWidget from './attendance/GeoCheckInWidget.jsx'
import AttendancePage from './attendance/AttendancePage.jsx'
import MyAttendanceView from './attendance/MyAttendanceView.jsx'
import PerformancePage from './hr/PerformancePage.jsx'
import AiAssistantPage from './ai/AiAssistantPage.jsx'
import { AnnouncementsWidget } from './widgets/AnnouncementsWidget.jsx'
import { EmployeeDirectoryWidget } from './widgets/EmployeeDirectoryWidget.jsx'
import { AttendanceWidget } from './widgets/AttendanceWidget.jsx'
import { MyAttendanceWidget } from './widgets/MyAttendanceWidget.jsx'
import { PerformanceTrackerWidget } from './widgets/PerformanceTrackerWidget.jsx'
import { TasksWidget } from './widgets/TasksWidget.jsx'
import { PayrollWidget } from './widgets/PayrollWidget.jsx'
import { MyPayrollWidget } from './widgets/MyPayrollWidget.jsx'
import { LeaveWidget } from './widgets/LeaveWidget.jsx'

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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false)
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
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePunchSubmit = () => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    const todayLogs = attendance?.dailyLogs?.[today] || {}
    const myLog = todayLogs[currentUser.id] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }
    
    let updatedLog = { ...myLog }
    let action = 'in'
    if (myLog.checkIn === '--') {
      updatedLog.status = 'In Office'
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
        return (
          <DashboardView 
            currentUser={currentUser} 
            attendance={attendance} 
            setAttendance={setAttendance} 
            addToast={addToast} 
            announcements={announcements} 
            setAnnouncements={setAnnouncements}
            tasks={tasks} 
            setActiveTab={setActiveTab} 
            settings={settings}
            payroll={payroll}
            expenses={expenses}
            roster={roster}
            notes={notes}
            setNotes={setNotes}
            employees={employees}
            events={events}
            setEvents={setEvents}
            shiftTemplates={shiftTemplates}
            addLog={addLog}
            addNotification={addNotification}
          />
        )
      case 'attendance':
      case 'schedule':
      case 'leave':
      case 'leaves':
        return <MyAttendanceView 
                 currentUser={currentUser} 
                 employees={employees}
                 attendance={attendance} 
                 setAttendance={setAttendance}
                 roster={roster}
                 shiftSwaps={shiftSwaps}
                 setShiftSwaps={setShiftSwaps}
                 shiftTemplates={shiftTemplates}
                 overtimeClaims={overtimeClaims}
                 setOvertimeClaims={setOvertimeClaims}
                 settings={settings}
                 addToast={addToast} 
                 addLog={addLog}
                 addNotification={addNotification}
                 initialSubTab={activeTab === 'leave' || activeTab === 'leaves' ? 'leave' : undefined}
               />
      case 'announcements':
      case 'events':
      case 'calendar':
        return <Announcements 
                 currentUser={currentUser} 
                 employees={employees} 
                 announcements={announcements} 
                 setAnnouncements={setAnnouncements} 
                 addToast={addToast}
                 addLog={addLog}
                 addNotification={addNotification}
                 events={events}
                 setEvents={setEvents}
                 headline="Feed"
                 defaultTab={activeTab === 'events' || activeTab === 'calendar' ? 'calendar' : 'announcements'}
               />
      case 'payslips':
      case 'payroll':
      case 'expenses':
        return <PayslipsView 
                 currentUser={currentUser} 
                 payroll={payroll} 
                 employees={employees}
                 expenses={expenses}
                 setExpenses={setExpenses}
                 addLog={addLog}
                 addToast={addToast} 
                 settings={settings}
                 addNotification={addNotification}
                 initialSubTab={activeTab === 'expenses' ? 'expenses' : 'payslips'}
               />
      case 'settings':
      case 'profile':
        return <EmployeeSettings 
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
          themeMode={themeMode}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
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
      case 'notes':
        return <div className="max-w-[1200px] mx-auto w-full"><Tasks tasks={tasks} setTasks={setTasks} employees={employees} currentUser={currentUser} addToast={addToast} addLog={addLog} addNotification={addNotification} notes={notes} setNotes={setNotes} defaultTab={activeTab === 'notes' ? 'notes' : 'tasks'} /></div>
      case 'documents':
        return <div className="max-w-[1200px] mx-auto w-full"><Documents documents={documents} setDocuments={setDocuments} addLog={addLog} addToast={addToast} currentUser={currentUser} addNotification={addNotification} /></div>
      case 'performance':
      case 'wellbeing':
        return <div className="max-w-[1200px] mx-auto w-full"><PerformancePage adminUid={currentUser.adminUid} currentUser={currentUser} employees={employees} addToast={addToast} defaultTab={activeTab === 'wellbeing' ? 'wellbeing' : 'performance'} /></div>
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
        return (
          <DashboardView 
            currentUser={currentUser} 
            attendance={attendance} 
            setAttendance={setAttendance} 
            addToast={addToast} 
            announcements={announcements} 
            setAnnouncements={setAnnouncements}
            tasks={tasks} 
            setActiveTab={setActiveTab} 
            settings={settings}
            payroll={payroll}
            expenses={expenses}
            roster={roster}
            notes={notes}
            setNotes={setNotes}
            employees={employees}
            events={events}
            setEvents={setEvents}
            shiftTemplates={shiftTemplates}
            addLog={addLog}
            addNotification={addNotification}
          />
        )
      case 'team_attendance':
        return (
          <AttendancePage 
            currentUser={currentUser}
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
    { id: 'dashboard', icon: <Icon name="dashboard" size={20}/>, label: 'Dashboard' },
    { id: 'attendance', icon: <Icon name="schedule" size={20}/>, label: 'Attendance' },
    { id: 'my-tasks', icon: <Icon name="check_box" size={20}/>, label: 'Tasks' },
    { id: 'announcements', icon: <Icon name="rss_feed" size={20}/>, label: 'Announcements' },
    { id: 'payslips', icon: <Icon name="account_balance" size={20}/>, label: 'Payroll' },
    { id: 'documents', icon: <Icon name="folder_open" size={20}/>, label: 'Documents' },
    { id: 'my-assets', icon: <Icon name="devices_other" size={20}/>, label: 'Assets' },
    { id: 'performance', icon: <Icon name="insights" size={20}/>, label: 'Performance' },
    ...(currentUser?.permissions?.includes('manage_attendance') ? [{ id: 'team_attendance', icon: <Icon name="check_circle" size={20}/>, label: 'Team Attendance' }] : []),
    { id: 'settings', icon: <Icon name="settings" size={20}/>, label: 'Settings' }
  ]

  const resolvedIsDark = isDarkMode ?? (themeMode === 'dark')

  return (
    <div className="dashboard-root app-shell employee-portal-root relative" style={{ display: 'flex', width: '100vw', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
      <main 
        className={`content dashboard-content ${isMobile ? 'pb-24' : 'pb-12'} px-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center w-full max-w-[100vw] transition-all duration-300`} 
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScroll}
      >
        <div className="w-full flex flex-col relative">
          
          {/* Sticky Header Wrapper */}
          <div className={`sticky top-0 z-40 w-full pointer-events-none transition-transform duration-300 ease-in-out ${isMobile && isScrollingDown && !showMobileMenu && !showNotifications ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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
                onProfileClick={() => setActiveTab('settings')}
                handleLogout={handleLogout}
                currentView={activeTab}
                setCurrentView={setActiveTab}
                visibleNavItems={navItems}
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
                setEmployees={null}
                payroll={null}
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

          <div className="w-full max-w-[1920px] mx-auto flex-1 px-3 sm:px-5 md:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
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

      {/* Bottom Menu Bar Dock (Mobile 4-icon dock with expandable menu / Tablet full dock) */}
      {isMobile && (
        <MobileResponsiveBottomBar
          visibleNavItems={navItems}
          currentView={activeTab}
          setCurrentView={setActiveTab}
          isDark={resolvedIsDark}
          onOpenAi={() => {
            setShowAiModal(prev => {
              const next = !prev
              setShowAiHistory(false)
              if (next) setAiModalAction(`open_chat_${Date.now()}`)
              return next
            })
          }}
          isAiOpen={showAiModal}
          notifications={notifications || []}
          markNotificationsRead={markNotificationsRead}
          clearNotifications={clearNotifications}
          unreadCount={notifications ? notifications.filter(n => !n.read).length : 0}
          onProfileClick={() => {
            if (showAiModal) setShowAiModal(false)
            setActiveTab('settings')
          }}
          user={currentUser}
          employees={employees}
          attendance={attendance}
          setAttendance={setAttendance}
          expenses={expenses}
          setExpenses={setExpenses}
          tasks={tasks}
          setTasks={setTasks}
          announcements={announcements}
          addToast={addToast}
          isScrollingDown={isScrollingDown}
          prefix="employee-bottom"
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

function DashboardView({ 
  currentUser, 
  attendance, 
  setAttendance, 
  addToast, 
  announcements, 
  setAnnouncements,
  tasks, 
  setActiveTab, 
  settings, 
  payroll, 
  expenses = [],
  roster, 
  notes = [], 
  setNotes,
  employees = [],
  events = [],
  setEvents,
  shiftTemplates = [],
  addLog,
  addNotification
}) {
  const myActiveTasks = tasks?.filter(t => t.assigneeIds?.includes(currentUser.id) && t.status !== 'Done') || []
  const urgentTasks = myActiveTasks.filter(t => t.priority === 'Urgent' || t.priority === 'High')

  // Leave / Attendance metrics for today
  const today = new Date().toISOString().split('T')[0]
  const todayLog = attendance?.dailyLogs?.[today]?.[currentUser.id] || {}
  const status = todayLog?.status || 'Off Duty'

  // Current month pay slip status if available
  const currentMonthPayslip = (payroll?.history || [])
    .filter(p => p.employeeId === currentUser.id || p.employeeName === currentUser.name)
    .sort((a, b) => new Date(b.date || b.period || 0) - new Date(a.date || a.period || 0))[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Calculate upcoming milestones for birthdays / anniversaries
  const upcomingMilestones = useMemo(() => {
    const nowDate = new Date()
    const milestones = []

    employees.forEach(emp => {
      if (emp.dob) {
        const dobDate = new Date(emp.dob)
        const birthMonth = dobDate.getMonth()
        const birthDay = dobDate.getDate()

        let nextBirthday = new Date(nowDate.getFullYear(), birthMonth, birthDay)
        if (nextBirthday < nowDate) {
          nextBirthday = new Date(nowDate.getFullYear() + 1, birthMonth, birthDay)
        }

        const diffTime = nextBirthday - nowDate
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 30) {
          milestones.push({
            type: 'Birthday',
            empName: emp.name,
            avatar: emp.avatar,
            date: nextBirthday,
            daysRemaining: diffDays,
            label: `Birthday in ${diffDays === 0 ? 'today' : `${diffDays} days`}`
          })
        }
      }

      if (emp.joiningDate) {
        const joinDate = new Date(emp.joiningDate)
        const joinMonth = joinDate.getMonth()
        const joinDay = joinDate.getDate()

        let nextAnniversary = new Date(nowDate.getFullYear(), joinMonth, joinDay)
        if (nextAnniversary < nowDate) {
          nextAnniversary = new Date(nowDate.getFullYear() + 1, joinMonth, joinDay)
        }

        const diffTime = nextAnniversary - nowDate
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const yearsCount = nextAnniversary.getFullYear() - joinDate.getFullYear()

        if (diffDays >= 0 && diffDays <= 30 && yearsCount > 0) {
          milestones.push({
            type: 'Anniversary',
            empName: emp.name,
            avatar: emp.avatar,
            date: nextAnniversary,
            daysRemaining: diffDays,
            label: `${yearsCount} Year Workversary in ${diffDays === 0 ? 'today' : `${diffDays} days`}`
          })
        }
      }
    })

    return milestones.sort((a, b) => a.daysRemaining - b.daysRemaining)
  }, [employees])

  const upcomingEvents = useMemo(() => {
    return events
      ? [...events]
          .filter(evt => new Date(evt.date) >= new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3)
      : []
  }, [events])

  const taskList = Array.isArray(tasks) ? tasks : []
  const completedTasksCount = taskList.filter(t => t && t.status === 'Done').length
  const taskCompletionRate = taskList.length > 0 ? Math.round((completedTasksCount / taskList.length) * 100) : 0
  const pendingTasksCount = taskList.filter(t => t && t.status !== 'Done').length

  const activeEmps = useMemo(() => employees.filter(e => e.status !== 'Terminated'), [employees])
  const dayLogs = attendance?.dailyLogs?.[today] || {}
  const arrivedCount = useMemo(() => {
    let count = 0
    activeEmps.forEach(emp => {
      const log = dayLogs[emp.id]
      if (!log) return
      const s = String(log.status || '').trim()
      if (s === 'In Office' || s === 'Remote' || s === 'On-Field') count++
    })
    return count
  }, [activeEmps, dayLogs])
  const attendanceRate = activeEmps.length > 0 ? Math.round((arrivedCount / activeEmps.length) * 100) : 0
  const efficiencyScore = Math.min(100, Math.round(attendanceRate * 0.5 + taskCompletionRate * 0.5))

  const currentPayrollMonth = payroll && typeof payroll === 'object' && Object.keys(payroll).length > 0
    ? Object.keys(payroll).sort().reverse()[0]
    : null
  const rawCurrentData = (currentPayrollMonth && payroll) ? payroll[currentPayrollMonth] : null
  const currentPayrollData = Array.isArray(rawCurrentData)
    ? rawCurrentData
    : (Array.isArray(rawCurrentData?.records) ? rawCurrentData.records : (Array.isArray(rawCurrentData?.entries) ? rawCurrentData.entries : []))
  const paidCount = currentPayrollData.filter(p => p && p.status === 'Paid').length
  const pendingCount = currentPayrollData.filter(p => p && p.status === 'Pending').length
  const totalPayrollCost = currentPayrollData.reduce((acc, curr) => {
    const net = Number(curr?.netSalary || curr?.net || (Number(curr?.grossSalary || 0) - Number(curr?.deductions || 0))) || 0
    return acc + net
  }, 0)

  return (
    <div className="space-y-6 pb-6">
      {/* 12-Column Grid matching portal architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 auto-rows-[minmax(148px,auto)] items-stretch pt-2">

        {/* Column 1: Attendance / Geo Check-In Column — col-span-12 lg:col-span-4 */}
        <div className="col-span-12 lg:col-span-4 h-[680px] w-full flex flex-col">
          {currentUser && (
            <GeoCheckInWidget 
              currentUser={currentUser} 
              attendance={attendance} 
              setAttendance={setAttendance} 
              addToast={addToast} 
              settings={settings}
              notes={notes}
              setNotes={setNotes}
              roster={roster}
              shiftTemplates={shiftTemplates}
              setCurrentView={setActiveTab}
              cardClassName="h-full w-full min-h-0"
            />
          )}
        </div>

        {/* Column 2: Catch Up (Announcements, Notice & Events) in Middle — col-span-12 lg:col-span-4 */}
        <AnnouncementsWidget
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          currentUser={currentUser}
          employees={employees}
          upcomingMilestones={upcomingMilestones}
          upcomingEvents={upcomingEvents}
          events={events}
          setEvents={setEvents}
          setCurrentView={setActiveTab}
          addToast={addToast}
          addLog={addLog}
          addNotification={addNotification}
          settings={settings}
          cardClass="col-span-12 lg:col-span-4 h-[680px] w-full"
        />

        {/* Column 3: Team Directory Widget — col-span-12 lg:col-span-4 */}
        <EmployeeDirectoryWidget
          employees={employees}
          setCurrentView={setActiveTab}
          cardClass="col-span-12 lg:col-span-4 h-[680px] w-full"
        />

        {/* Secondary Row: Tasks, Payroll & Leaves widgets */}
        <TasksWidget
          tasks={tasks}
          pendingTasksCount={pendingTasksCount}
          taskCompletionRate={taskCompletionRate}
          setCurrentView={setActiveTab}
          cardClass="col-span-12 sm:col-span-6 lg:col-span-4 min-h-[360px] w-full"
        />

        <MyPayrollWidget
          currentUser={currentUser}
          payroll={payroll}
          expenses={expenses}
          settings={settings}
          setCurrentView={setActiveTab}
          addToast={addToast}
          cardClass="col-span-12 sm:col-span-6 lg:col-span-4 min-h-[360px] w-full"
        />

        <LeaveWidget
          currentUser={currentUser}
          attendance={attendance}
          settings={settings}
          setCurrentView={setActiveTab}
          cardClass="col-span-12 sm:col-span-12 lg:col-span-4 min-h-[360px] w-full"
        />

      </div>
    </div>
  )
}

function PayslipsView({ currentUser, payroll, employees, expenses, setExpenses, addLog, addToast, settings, addNotification, initialSubTab = 'payslips' }) {
  const [subTab, setSubTab] = useState(initialSubTab)
  const myPayslips = useMemo(() => {
    if (!payroll || typeof payroll !== 'object') return []
    if (Array.isArray(payroll.history)) {
      return payroll.history.filter(p => p && p.employeeId === currentUser?.id)
    }
    const list = []
    Object.entries(payroll).forEach(([monthKey, records]) => {
      const arr = Array.isArray(records) ? records : (Array.isArray(records?.records) ? records.records : (Array.isArray(records?.entries) ? records.entries : []))
      arr.forEach(rec => {
        if (rec && rec.employeeId === currentUser?.id) {
          list.push({ ...rec, date: rec.paymentDate || monthKey, month: monthKey })
        }
      })
    })
    return list
  }, [payroll, currentUser?.id])

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
      doc.text(`Team Member Name: ${currentUser.name}`, 14, startY)
      doc.text(`Role: ${currentUser.role || 'Teammate'}`, 14, startY + 6)
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
        headStyles: { fillColor: [30, 41, 59] }
      })

      doc.save(`Payslip_${currentUser.name}_${slip.date}.pdf`)
      addToast('Payslip PDF downloaded successfully', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to generate PDF', 'destructive')
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Finance sections" className="menu-bar">
          <Button
            role="tab"
            aria-selected={subTab === 'payslips'}
            variant={subTab === 'payslips' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${subTab !== 'payslips' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setSubTab('payslips')}
          >
            <Icon name="account_balance" size={15}/> My Payslips
          </Button>
          <Button
            role="tab"
            aria-selected={subTab === 'expenses'}
            variant={subTab === 'expenses' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${subTab !== 'expenses' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setSubTab('expenses')}
          >
            <Icon name="wallet" size={15}/> Expense Claims
          </Button>
        </div>
      </div>

      {subTab === 'expenses' ? (
        <Expenses
          employees={employees}
          expenses={expenses}
          setExpenses={setExpenses}
          settings={settings}
          addLog={addLog}
          addToast={addToast}
          addAuditLog={addLog}
          currentUser={currentUser}
          addNotification={addNotification}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">My Payslips</h2>
              <p className="text-sm text-muted-foreground">View and download your monthly salary statements.</p>
            </div>
          </div>

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
        </>
      )}
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
            vendor: 'Reported by Team Member',
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
