import { lazy, Suspense, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import LoadingScreen from './layout/LoadingScreen.jsx'

const Dashboard = lazy(() => import('./Dashboard.jsx'))
const Employees = lazy(() => import('./Employees.jsx'))
const Payroll = lazy(() => import('./Payroll.jsx'))
const Attendance = lazy(() => import('./Attendance.jsx'))
const Leaves = lazy(() => import('./Leaves.jsx'))
const Expenses = lazy(() => import('./Expenses.jsx'))
const Announcements = lazy(() => import('./Announcements.jsx'))
const Calendar = lazy(() => import('./Calendar.jsx'))
const Documents = lazy(() => import('./Documents.jsx'))
const Assets = lazy(() => import('./Assets.jsx'))
const Settings = lazy(() => import('./Settings.jsx'))
const Tasks = lazy(() => import('./Tasks.jsx'))
const ProfileView = lazy(() => import('./ProfileView.jsx'))
const Notes = lazy(() => import('./Notes.jsx'))
const GigBoardPage = lazy(() => import('./hr/GigBoardPage.jsx'))
const PerformancePage = lazy(() => import('./hr/PerformancePage.jsx'))
const WellbeingPage = lazy(() => import('./hr/WellbeingPage.jsx'))
const AiAssistantPage = lazy(() => import('./ai/AiAssistantPage.jsx'))

const viewPreloadMap = {
  dashboard: () => import('./Dashboard.jsx'),
  employees: () => import('./Employees.jsx'),
  payroll: () => import('./Payroll.jsx'),
  attendance: () => import('./Attendance.jsx'),
  leaves: () => import('./Leaves.jsx'),
  expenses: () => import('./Expenses.jsx'),
  announcements: () => import('./Announcements.jsx'),
  calendar: () => import('./Calendar.jsx'),
  documents: () => import('./Documents.jsx'),
  assets: () => import('./Assets.jsx'),
  settings: () => import('./Settings.jsx'),
  tasks: () => import('./Tasks.jsx'),
  profile: () => import('./ProfileView.jsx'),
  notes: () => import('./Notes.jsx'),
  gigs: () => import('./hr/GigBoardPage.jsx'),
  performance: () => import('./hr/PerformancePage.jsx'),
  wellbeing: () => import('./hr/WellbeingPage.jsx'),
  ai: () => import('./ai/AiAssistantPage.jsx'),
}

function ViewSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded-xl bg-foreground/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-foreground/10" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-foreground/10" />
    </div>
  )
}

function PreloadOnHover({ children, view }) {
  const preload = useCallback(() => {
    if (viewPreloadMap[view]) viewPreloadMap[view]()
  }, [view])
  return <div onMouseEnter={preload} onTouchStart={preload}>{children}</div>
}

export default function AppContent({ currentView, setCurrentView, isAppLoading, hasPermission, user, isSidebarCollapsed, themeMode, toggleTheme, ...data }) {
  // Preload adjacent views on idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(() => {
        const likelyNextViews = ['employees', 'attendance', 'payroll', 'tasks']
        likelyNextViews.forEach(v => { if (v !== currentView && viewPreloadMap[v]) viewPreloadMap[v]() })
      })
      return () => cancelIdleCallback(idleCallback)
    }
  }, [currentView])

  if (isAppLoading) {
    return <LoadingScreen isDarkMode={themeMode === 'dark'} />
  }

  if (!hasPermission(currentView)) {
    return (
      <div className="animate-fade-in p-16 px-8" style={{ textAlign: 'center', background: 'var(--muted)', borderRadius: '20px', border: '1px solid var(--border)', marginTop: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', marginBottom: '16px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>!</span>
        </div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--destructive)', marginBottom: '16px' }}>403 Forbidden</h2>
        <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto' }}>
          Your current role (<strong>{user?.role || (user?.isEmployee ? 'Teammate' : 'Admin')}</strong>) does not have permission to access the <strong>{currentView}</strong> module.
        </p>
      </div>
    )
  }

  let view
  switch (currentView) {
    case 'dashboard':
      view = <Dashboard employees={data.employees} syncLogs={data.syncLogs} addLog={data.addLog} onSync={data.handleSync} setCurrentView={setCurrentView} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addNotification={data.addNotification} events={data.events} payroll={data.payroll} isSidebarCollapsed={isSidebarCollapsed} hasPermission={hasPermission} tasks={data.tasks} documents={data.documents} assets={data.assets} attendance={data.attendance} setAttendance={data.handleSetAttendance} currentUser={user} addToast={data.addToast} settings={data.settings} notes={data.notes} setNotes={data.handleSetNotes} roster={data.roster} />
      break
    case 'employees':
      view = <Employees employees={data.employees} setEmployees={data.handleSetEmployees} attendance={data.attendance} addLog={data.addLog} addAuditLog={data.addAuditLog} pendingProfileEdits={data.pendingProfileEdits} setPendingProfileEdits={data.setPendingProfileEdits} addToast={data.addToast} selectedEmployeeId={data.selectedEmployeeId} setSelectedEmployeeId={data.setSelectedEmployeeId} isSidebarCollapsed={isSidebarCollapsed} adminUid={data.adminUid} currentUser={user} settings={data.settings} />
      break
    case 'payroll':
      view = <Payroll employees={data.employees} payroll={data.payroll} setPayroll={data.handleSetPayroll} addLog={data.addLog} settings={data.settings} addAuditLog={data.addAuditLog} expenses={data.expenses} setExpenses={data.handleSetExpenses} addToast={data.addToast} currentUser={user} addNotification={data.addNotification} defaultTab="payroll" />
      break
    case 'attendance':
      view = <Attendance employees={data.employees} attendance={data.attendance} setAttendance={data.handleSetAttendance} roster={data.roster} setRoster={data.setRoster} shiftSwaps={data.shiftSwaps} setShiftSwaps={data.setShiftSwaps} shiftTemplates={data.settings?.shiftTemplates} overtimeClaims={data.overtimeClaims} setOvertimeClaims={data.setOvertimeClaims} addLog={data.addLog} addToast={data.addToast} addNotification={data.addNotification} addAuditLog={data.addAuditLog} settings={data.settings} setSettings={data.handleSetSettings} defaultTab="daily" />
      break
    case 'leaves':
      view = <Attendance employees={data.employees} attendance={data.attendance} setAttendance={data.handleSetAttendance} roster={data.roster} setRoster={data.setRoster} shiftSwaps={data.shiftSwaps} setShiftSwaps={data.setShiftSwaps} shiftTemplates={data.settings?.shiftTemplates} overtimeClaims={data.overtimeClaims} setOvertimeClaims={data.setOvertimeClaims} addLog={data.addLog} addToast={data.addToast} addNotification={data.addNotification} addAuditLog={data.addAuditLog} settings={data.settings} setSettings={data.handleSetSettings} defaultTab="leave" />
      break
    case 'announcements':
      view = <Announcements employees={data.employees} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addLog={data.addLog} addToast={data.addToast} currentUser={user} addNotification={data.addNotification} events={data.events} setEvents={data.handleSetEvents} settings={data.settings} defaultTab="announcements" />
      break
    case 'calendar':
      view = <Announcements employees={data.employees} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addLog={data.addLog} addToast={data.addToast} currentUser={user} addNotification={data.addNotification} events={data.events} setEvents={data.handleSetEvents} settings={data.settings} defaultTab="calendar" />
      break
    case 'documents':
      view = <Documents documents={data.documents} setDocuments={data.handleSetDocuments} employees={data.employees} addLog={data.addLog} addToast={data.addToast} currentUser={user} adminUid={data.adminUid} addNotification={data.addNotification} settings={data.settings} />
      break
    case 'assets':
      view = <Assets employees={data.employees} assets={data.assets} setAssets={data.setAssets} assetRequests={data.assetRequests} setAssetRequests={data.setAssetRequests} assetCategories={data.assetCategories} setAssetCategories={data.setAssetCategories} addLog={data.addLog} addToast={data.addToast} currentUser={user} addNotification={data.addNotification} settings={data.settings} />
      break
    case 'tasks':
      view = <Tasks tasks={data.tasks} setTasks={data.handleSetTasks} employees={data.employees} currentUser={user} addToast={data.addToast} addLog={data.addLog} addNotification={data.addNotification} notes={data.notes} setNotes={data.handleSetNotes} defaultTab="tasks" settings={data.settings} />
      break
    case 'expenses':
      view = <Payroll employees={data.employees} payroll={data.payroll} setPayroll={data.handleSetPayroll} addLog={data.addLog} settings={data.settings} addAuditLog={data.addAuditLog} expenses={data.expenses} setExpenses={data.handleSetExpenses} addToast={data.addToast} currentUser={user} addNotification={data.addNotification} defaultTab="expenses" />
      break
    case 'settings':
      view = <Settings settings={data.settings} setSettings={data.handleSetSettings} addLog={data.addLog} addToast={data.addToast} auditLogs={data.auditLogs} themeMode={themeMode} toggleTheme={toggleTheme} employees={data.employees} setEmployees={data.handleSetEmployees} currentUser={user} onLoadDemoData={data.handleLoadDemoData} onClearDemoData={data.handleClearDemoData} />
      break
    case 'profile':
      view = <ProfileView currentUser={user} pendingProfileEdits={data.pendingProfileEdits} setPendingProfileEdits={data.setPendingProfileEdits} addToast={data.addToast} addLog={data.addLog} settings={data.settings} setSettings={data.handleSetSettings} employees={data.employees} setEmployees={data.handleSetEmployees} handleLogout={data.handleLogout} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addNotification={data.addNotification} />
      break
    case 'notes':
      view = <Tasks tasks={data.tasks} setTasks={data.handleSetTasks} employees={data.employees} currentUser={user} addToast={data.addToast} addLog={data.addLog} addNotification={data.addNotification} notes={data.notes} setNotes={data.handleSetNotes} defaultTab="notes" />
      break
    case 'gigs':
      view = <GigBoardPage adminUid={data.adminUid} currentUser={user} employees={data.employees} addToast={data.addToast} />
      break
    case 'performance':
      view = <PerformancePage adminUid={data.adminUid} currentUser={user} employees={data.employees} addToast={data.addToast} defaultTab="performance" />
      break
    case 'wellbeing':
      view = <PerformancePage adminUid={data.adminUid} currentUser={user} employees={data.employees} addToast={data.addToast} defaultTab="wellbeing" />
      break
    case 'ai':
      view = <AiAssistantPage currentUser={user} employees={data.employees} setEmployees={data.handleSetEmployees} payroll={data.payroll} setPayroll={data.handleSetPayroll} attendance={data.attendance} setAttendance={data.handleSetAttendance} expenses={data.expenses} setExpenses={data.handleSetExpenses} announcements={data.announcements} setAnnouncements={data.setAnnouncements} tasks={data.tasks} setTasks={data.setTasks} settings={data.settings} setCurrentView={setCurrentView} addToast={data.addToast} />
      break
    default:
      view = <Dashboard employees={data.employees} syncLogs={data.syncLogs} addLog={data.addLog} onSync={data.handleSync} setCurrentView={setCurrentView} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addNotification={data.addNotification} events={data.events} payroll={data.payroll} isSidebarCollapsed={isSidebarCollapsed} hasPermission={hasPermission} tasks={data.tasks} documents={data.documents} assets={data.assets} attendance={data.attendance} setAttendance={data.handleSetAttendance} currentUser={user} addToast={data.addToast} settings={data.settings} notes={data.notes} setNotes={data.handleSetNotes} roster={data.roster} />
  }

  return (
    <Suspense fallback={<ViewSkeleton />}>
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {view}
      </motion.div>
    </Suspense>
  )
}