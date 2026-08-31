import Dashboard from './Dashboard.jsx'
import Employees from './Employees.jsx'
import Payroll from './Payroll.jsx'
import Attendance from './Attendance.jsx'
import Expenses from './Expenses.jsx'
import Announcements from './Announcements.jsx'
import Calendar from './Calendar.jsx'
import Documents from './Documents.jsx'
import Assets from './Assets.jsx'
import Settings from './Settings.jsx'
import DriveSync from './DriveSync.jsx'
import Tasks from './Tasks.jsx'
import { Skeleton } from "@/components/ui/skeleton"

export default function AppContent({ currentView, setCurrentView, isAppLoading, hasPermission, simulatedRole, user, isSidebarCollapsed, ...data }) {
  const renderBreadcrumbs = () => {
    if (currentView === 'dashboard') return null
    return (
      <div className="breadcrumb-container">
        <span className="breadcrumb-item" onClick={() => setCurrentView('dashboard')}>Dashboard</span>
        <span>/</span>
        <span className="breadcrumb-current" style={{ textTransform: 'capitalize' }}>
          {currentView === 'drive' ? 'Google Drive Sync' : currentView}
        </span>
      </div>
    )
  }

  if (isAppLoading) {
    const skeletonLayouts = {
      dashboard: (
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>
      ),
      employees: (
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      ),
      table: (
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-12 w-full max-w-sm rounded-lg" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        </div>
      ),
      settings: (
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
            <Skeleton className="h-[500px] rounded-xl" />
          </div>
        </div>
      )
    }
    const layoutKey = currentView === 'dashboard' ? 'dashboard'
      : currentView === 'employees' ? 'employees'
      : (currentView === 'settings' || currentView === 'drive') ? 'settings'
      : 'table'
    return skeletonLayouts[layoutKey]
  }

  if (!hasPermission(currentView)) {
    return (
      <div className="animate-fade-in p-16 px-8" style={{ textAlign: 'center', background: 'var(--color-md-sys-surface-container)', borderRadius: '16px', border: '1px solid var(--color-md-sys-outline-variant)', marginTop: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-md-sys-error)', marginBottom: '16px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>!</span>
        </div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-md-sys-error)', marginBottom: '16px' }}>403 Forbidden</h2>
        <p style={{ color: 'var(--color-md-sys-on-surface-variant)', maxWidth: '400px', margin: '0 auto' }}>
          Your current role (<strong>{simulatedRole}</strong>) does not have permission to access the <strong>{currentView}</strong> module.
        </p>
      </div>
    )
  }

  switch (currentView) {
    case 'dashboard':
      return <Dashboard employees={data.employees} syncLogs={data.syncLogs} driveConnected={data.driveConnected} addLog={data.addLog} onSync={data.handleSync} setCurrentView={setCurrentView} announcements={data.announcements} events={data.events} payroll={data.payroll} isSidebarCollapsed={isSidebarCollapsed} simulatedRole={simulatedRole} hasPermission={hasPermission} />
    case 'employees':
      return <Employees employees={data.employees} setEmployees={data.handleSetEmployees} addLog={data.addLog} driveConnected={data.driveConnected} simulatedRole={simulatedRole} addAuditLog={data.addAuditLog} pendingProfileEdits={data.pendingProfileEdits} setPendingProfileEdits={data.setPendingProfileEdits} addToast={data.addToast} selectedEmployeeId={data.selectedEmployeeId} setSelectedEmployeeId={data.setSelectedEmployeeId} />
    case 'payroll':
      return <Payroll employees={data.employees} payroll={data.payroll} setPayroll={data.handleSetPayroll} addLog={data.addLog} driveConnected={data.driveConnected} settings={data.settings} simulatedRole={simulatedRole} addAuditLog={data.addAuditLog} />
    case 'attendance':
      return <Attendance employees={data.employees} attendance={data.attendance} setAttendance={data.handleSetAttendance} roster={data.roster} setRoster={data.setRoster} shiftSwaps={data.shiftSwaps} setShiftSwaps={data.setShiftSwaps} shiftTemplates={data.settings?.shiftTemplates} overtimeClaims={data.overtimeClaims} setOvertimeClaims={data.setOvertimeClaims} addLog={data.addLog} driveConnected={data.driveConnected} addToast={data.addToast} addNotification={data.addNotification} simulatedRole={simulatedRole} addAuditLog={data.addAuditLog} />
    case 'announcements':
      return <Announcements employees={data.employees} announcements={data.announcements} setAnnouncements={data.setAnnouncements} addLog={data.addLog} addToast={data.addToast} currentUser={user} simulatedRole={simulatedRole} />
    case 'calendar':
      return <Calendar events={data.events} setEvents={data.handleSetEvents} employees={data.employees} addLog={data.addLog} addToast={data.addToast} currentUser={user} simulatedRole={simulatedRole} />
    case 'documents':
      return <Documents documents={data.documents} setDocuments={data.handleSetDocuments} employees={data.employees} addLog={data.addLog} addToast={data.addToast} currentUser={user} simulatedRole={simulatedRole} />
    case 'assets':
      return <Assets employees={data.employees} assets={data.assets} setAssets={data.setAssets} assetRequests={data.assetRequests} setAssetRequests={data.setAssetRequests} addLog={data.addLog} addToast={data.addToast} currentUser={user} simulatedRole={simulatedRole} />
    case 'tasks':
      return <Tasks tasks={data.tasks} setTasks={data.handleSetTasks} employees={data.employees} currentUser={user} addToast={data.addToast} simulatedRole={simulatedRole} addLog={data.addLog} addNotification={data.addNotification} />
    case 'expenses':
      return <Expenses employees={data.employees} expenses={data.expenses} setExpenses={data.handleSetExpenses} settings={data.settings} addLog={data.addLog} addToast={data.addToast} addAuditLog={data.addAuditLog} simulatedRole={simulatedRole} />
    case 'settings':
      return <Settings settings={data.settings} setSettings={data.handleSetSettings} addLog={data.addLog} addToast={data.addToast} auditLogs={data.auditLogs} simulatedRole={simulatedRole} syncConflicts={data.syncConflicts} setSyncConflicts={data.setSyncConflicts} />
    case 'drive':
      return <DriveSync user={user} driveConnected={data.driveConnected} setDriveConnected={data.setDriveConnected} addLog={data.addLog} />
    default:
      return <Dashboard employees={data.employees} syncLogs={data.syncLogs} driveConnected={data.driveConnected} addLog={data.addLog} attendance={data.attendance} setCurrentView={setCurrentView} onSync={data.handleSync} announcements={data.announcements} events={data.events} payroll={data.payroll} isSidebarCollapsed={isSidebarCollapsed} simulatedRole={simulatedRole} hasPermission={hasPermission} />
  }
}
