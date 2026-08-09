import { useEffect, useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDateShort } from '../services/date.js'
import GeoCheckInWidget from './attendance/GeoCheckInWidget.jsx'
import DailyChecklistWidget from './DailyChecklistWidget.jsx'
import HrOverview from './hr/HrOverview.jsx'

const DashboardWidget = ({ 
  id, title, icon, action, 
  useAccordion, expandedWidgets, toggleWidget,
  cardClass = '',
  contentClass = '',
  iconClass = 'bg-primary/10 text-primary',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 h-full ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <CardTitle className="text-base font-extrabold m-0">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} p-4`}>
        {children}
      </CardContent>
    </Card>
  )
}

export default function Dashboard({ employees, onSync, attendance, setAttendance, currentUser, addToast, setCurrentView, announcements, events, payroll, isSidebarCollapsed, hasPermission, tasks = [], documents = [], assets = [], settings, notes = [], setNotes }) {
  const [expandedWidgets, setExpandedWidgets] = useState([])
  
  const toggleWidget = (id) => setExpandedWidgets(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id])

  const wProps = { expandedWidgets, toggleWidget }

  const canViewEmployees = hasPermission ? hasPermission('employees') : true
  const canViewAttendance = hasPermission ? hasPermission('attendance') : true
  const canViewPayroll = hasPermission ? hasPermission('payroll') : true
  const canViewCalendar = hasPermission ? hasPermission('calendar') : true
  const canViewAnnouncements = hasPermission ? hasPermission('announcements') : true
  const canViewTasks = hasPermission ? hasPermission('tasks') : true
  const canViewDocuments = hasPermission ? hasPermission('documents') : true
  const canViewAssets = hasPermission ? hasPermission('assets') : true

  const [totalEmployees, setTotalEmployees] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [leaveCount, setLeaveCount] = useState(0)
  const [upcomingMilestones, setUpcomingMilestones] = useState([])
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, onLeave: 0 })
  const [attendanceLists, setAttendanceLists] = useState({ present: [], absent: [], onLeave: [] })
  const [showAttDropdown, setShowAttDropdown] = useState(false)
  const [attFilter, setAttFilter] = useState(null) // 'present' | 'absent' | 'onLeave' | null

  useEffect(() => {
    setTotalEmployees(employees.length)
    
    // Simulate active status
      const active = employees.filter(emp => emp.status?.toLowerCase() !== 'inactive').length
    setActiveCount(active)
    setLeaveCount(employees.filter(emp => emp.status?.toLowerCase() === 'on leave').length)

    // Compute upcoming milestones (Birthdays & Workversaries) in the next 30 days
    const milestones = calculateUpcomingMilestones(employees)
    setUpcomingMilestones(milestones)

    // Compute dynamic today's attendance stats and details
    const todayStr = '2026-07-17' // Match local baseline date
    const todayLogs = attendance?.dailyLogs?.[todayStr] || {}
    
    const presentList = []
    const absentList = []
    const onLeaveList = []

    employees.forEach(emp => {
      if (emp.status === 'Terminated') return
      const log = todayLogs[emp.id]
      const entry = { id: emp.id, name: emp.name, avatar: emp.avatar, role: emp.role, time: log?.checkIn || null }
      if (log) {
        if (log.status === 'Present' || log.status === 'Late') {
          presentList.push(entry)
        } else if (log.status === 'Absent') {
          absentList.push(entry)
        } else if (log.status === 'On Leave') {
          onLeaveList.push(entry)
        }
      } else {
        if (emp.status === 'On Leave') {
          onLeaveList.push(entry)
        } else {
          absentList.push(entry)
        }
      }
    })

    setTodayStats({
      present: presentList.length,
      absent: absentList.length,
      onLeave: onLeaveList.length
    })
    setAttendanceLists({ present: presentList, absent: absentList, onLeave: onLeaveList })
  }, [employees, attendance])

  const calculateUpcomingMilestones = (employeesList) => {
    const today = new Date('2026-07-17') // Target simulated baseline date matching our current context
    const milestones = []

    employeesList.forEach(emp => {
      // 1. Birthdays
      if (emp.dob) {
        const dobDate = new Date(emp.dob)
        const birthMonth = dobDate.getMonth()
        const birthDay = dobDate.getDate()

        let bdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay)
        const diffTime = bdayThisYear - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 30) {
          milestones.push({
            type: 'birthday',
            empName: emp.name,
            avatar: emp.avatar,
            role: emp.role,
            date: bdayThisYear,
            daysRemaining: diffDays,
            label: `Birthday (${formatDateShort(emp.dob)})`
          })
        }
      }

      // 2. Workversaries
      if (emp.joiningDate) {
        const joinDate = new Date(emp.joiningDate)
        const joinMonth = joinDate.getMonth()
        const joinDay = joinDate.getDate()

        let workversaryThisYear = new Date(today.getFullYear(), joinMonth, joinDay)
        const diffTime = workversaryThisYear - today
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 30) {
          const years = today.getFullYear() - joinDate.getFullYear()
          if (years > 0) {
            milestones.push({
              type: 'workversary',
              empName: emp.name,
              avatar: emp.avatar,
              role: emp.role,
              date: workversaryThisYear,
              daysRemaining: diffDays,
              label: `${years}${getOrdinalSuffix(years)} Anniversary`
            })
          }
        }
      }
    })

    return milestones.sort((a, b) => a.daysRemaining - b.daysRemaining)
  }

  const getOrdinalSuffix = (i) => {
    const j = i % 10, k = i % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const handleManualSync = () => {
    if (onSync) onSync()
  }

  const attendanceRate = activeCount > 0 ? Math.round((todayStats.present / activeCount) * 100) : 0
  const inactiveCount = employees.filter(emp => emp.status?.toLowerCase() !== 'active').length

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.name || id

  const currentPayrollMonth = payroll && Object.keys(payroll).length > 0
    ? Object.keys(payroll).sort().reverse()[0]
    : null
  const currentPayrollData = currentPayrollMonth ? payroll[currentPayrollMonth] : []
  const totalPayrollCost = currentPayrollData.reduce((sum, p) => sum + (p.grossSalary || 0), 0)
  const paidCount = currentPayrollData.filter(p => p.status === 'Paid').length
  const pendingCount = currentPayrollData.filter(p => p.status === 'Pending').length

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const pendingTasksCount = tasks.filter(t => t.status !== 'Done').length
  const recentDocuments = documents.slice(0, 3)
  const availableAssetsCount = assets.filter(a => a.status === 'Available').length

  const upcomingEvents = (events || [])
    .filter(e => new Date(e.date) >= new Date('2026-07-17'))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3)

  const recentAnnouncements = (announcements || []).slice(0, 3)

  return (
    <div className="animate-fade-in flex flex-col gap-4 sm:gap-6 lg:gap-8">
      
      {currentUser?.role === 'Teammate' && currentUser && (
        <GeoCheckInWidget 
          currentUser={currentUser} 
          attendance={attendance} 
          setAttendance={setAttendance} 
          addToast={addToast} 
          settings={settings}
          notes={notes}
          setNotes={setNotes}
        />
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="dashboard" size={20} className="text-foreground" />
          Dashboard
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-r from-card to-primary/5 gap-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground m-0">
          <Icon name="monitoring" size={24} className="text-primary shrink-0" />
          Admin Overview
        </h2>
        <span className="text-sm font-semibold text-foreground bg-muted/80 px-4 py-2 rounded-md border border-border/50 shrink-0">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Unified Responsive & Adaptive Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        
        {/* Widget 4 — Announcements (Span 6) */}
        {canViewAnnouncements && (
          <DashboardWidget
          id="w4"
          title="Announcements"
          icon={<Icon name="rss_feed" size={18} />}
          iconClass="bg-amber-500/10 text-amber-500"
          cardClass="col-span-full"
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('announcements')} className="text-xs font-semibold h-7">View All</Button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {recentAnnouncements.length === 0 ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No active announcements</p>
          ) : (
            recentAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => setCurrentView && setCurrentView('announcements')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                  <Icon name="rss_feed" size={16} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{ann.title}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {getEmployeeName(ann.authorId)} &middot; {new Date(ann.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {ann.priority === 'Important' && (
                  <Badge variant="destructive" className="uppercase text-[10px]">
                    Important
                  </Badge>
                )}
              </div>
            ))
          )}
        </DashboardWidget>
        )}

        {/* Widget 2 — Today's Attendance (Span 4) */}
        {canViewAttendance && (
          <DashboardWidget
          id="w2"
          title="Today's Attendance"
          icon={<Icon name="group" size={18} />}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          action={<Button variant="outline" size="sm" onClick={() => setShowAttDropdown(!showAttDropdown)} className="text-xs font-semibold h-7">{showAttDropdown ? 'Hide' : 'Details'}</Button>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          <div className="flex items-center justify-between gap-1 sm:gap-2 xl:gap-3 py-2">
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-green m-0"></span>
                {todayStats.present}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Present</span>
            </div>
            <div className="w-[1px] h-10 bg-border"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-2xl font-black text-destructive flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-red m-0"></span>
                {todayStats.absent}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Absent</span>
            </div>
            <div className="w-[1px] h-10 bg-border"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-2xl font-black text-amber-500 flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-orange m-0"></span>
                {todayStats.onLeave}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Leave</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Attendance Rate</span>
            <span className="font-extrabold text-sm text-foreground">{attendanceRate}%</span>
          </div>
        </DashboardWidget>
        )}

        {/* Widget 4 — Daily Checklist */}
        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} cardClass="" />

        {/* HR Automation — People Insights */}
        <HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} />

        {/* 8. TASKS WIDGET */}
      {canViewTasks && (
        <DashboardWidget
          id="tasks-widget"
          title="Tasks Overview"
          icon={<Icon name="check_box" size={18} />}
          iconClass="bg-orange-500/10 text-orange-500"
          {...wProps}
          action={
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('tasks')} className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 -mr-2">
              View All
            </Button>
          }
        >
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-fluid-display font-black text-foreground">{pendingTasksCount}</span>
              <span className="text-sm font-medium text-muted-foreground">Pending Tasks</span>
            </div>
            {tasks.filter(t => t.status !== 'Done').slice(0, 2).map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <p className="text-fluid-sm font-medium text-foreground truncate flex-1">{t.title}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">{t.status}</Badge>
              </div>
            ))}
            {pendingTasksCount === 0 && (
              <p className="text-fluid-sm text-muted-foreground">No pending tasks! Great job.</p>
            )}
          </div>
        </DashboardWidget>
      )}

      {/* Attendance Details Dropdown (Full Width) */}
        {showAttDropdown && canViewAttendance && (
          <Card className="md:col-span-2 lg:col-span-3 overflow-hidden p-0">
            <div className="px-6 py-3.5 border-b border-border font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
              Today's Attendance Roster Breakdowns
            </div>
            {[
              { key: 'present', label: 'Present', count: todayStats.present, dot: 'pulse-dot-green' },
              { key: 'absent', label: 'Absent', count: todayStats.absent, dot: 'pulse-dot-red' },
              { key: 'onLeave', label: 'On Leave', count: todayStats.onLeave, dot: 'pulse-dot-orange' },
            ].map(item => (
              <div key={item.key} className="border-b border-border/50 last:border-none">
                <button
                  onClick={() => setAttFilter(attFilter === item.key ? null : item.key)}
                  className="w-full flex items-center justify-between px-6 py-3 border-none bg-transparent hover:bg-muted/50 transition-colors cursor-pointer text-xs sm:text-sm font-bold text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <span className={`pulse-dot ${item.dot} m-0`}></span>
                    {item.label}
                  </span>
                  <Badge variant="secondary" className="px-3 py-1">
                    {item.count}
                  </Badge>
                </button>
                {attFilter === item.key && (
                  <div className="px-6 pb-4 pt-1 bg-muted/20">
                    {attendanceLists[item.key].length === 0 ? (
                      <p className="my-1.5 text-fluid-xs text-muted-foreground">No personnel in this category</p>
                    ) : (
                      attendanceLists[item.key].map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3.5 py-2 border-b border-border/40 last:border-none">
                          <Avatar className="w-8 h-8 shrink-0">
                            {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={16} /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-extrabold text-foreground">{emp.name}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">{emp.role}</span>
                          </div>
                          {emp.time && <Badge variant="outline" className="text-[11px] px-2.5 py-0.5">{emp.time}</Badge>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

      {/* Widget 6 — Upcoming Events */}
        {canViewCalendar && (
          <DashboardWidget
          id="w6"
          title="Upcoming Events"
          icon={<Icon name="calendar_month" size={18} />}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          cardClass="md:col-span-2 lg:col-span-2"
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('calendar')} className="text-xs font-semibold h-7">Events</Button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {upcomingEvents.length === 0 ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No upcoming events</p>
          ) : (
            upcomingEvents.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => setCurrentView && setCurrentView('calendar')}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Icon name="calendar_month" size={16} style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{evt.title}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">
                    {formatDate(evt.date)}{evt.time ? ` at ${evt.time}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5">
                  {evt.type}
                </Badge>
              </div>
            ))
          )}
        </DashboardWidget>
        )}

        {/* 9. DOCUMENTS WIDGET */}
      {canViewDocuments && (
        <DashboardWidget
          id="documents-widget"
          title="Recent Documents"
          icon={<Icon name="description" size={18} />}
          iconClass="bg-blue-500/10 text-blue-500"
          {...wProps}
          action={
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('documents')} className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 -mr-2">
              View All
            </Button>
          }
        >
          <div className="flex flex-col h-full gap-3">
            {recentDocuments.length > 0 ? recentDocuments.map((doc, i) => (
              <div key={i} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground truncate pr-2">{doc.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{doc.category || 'Doc'}</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">Updated {formatDateShort(doc.uploadDate || doc.date || new Date().toISOString())}</span>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-fluid-sm text-muted-foreground text-center">No documents found.</p>
              </div>
            )}
          </div>
        </DashboardWidget>
      )}

        {/* Widget 5 — Payroll Summary */}
        {canViewPayroll && (
          <DashboardWidget
          id="w5"
          title="Payroll Summary"
          icon={<Icon name="account_balance" size={18} />}
          action={currentPayrollMonth && <Badge variant="secondary" className="px-3 py-1 h-7">{currentPayrollMonth}</Badge>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          {!currentPayrollMonth ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No payroll data found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/50">
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Paid</span>
                  <span className="text-fluid-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">{paidCount}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Pending</span>
                  <span className="text-fluid-2xl font-black tabular-nums text-amber-500 mt-0.5 block">{pendingCount}</span>
                </div>
                <div className="col-span-2 border-t border-border/50 pt-2 mt-1">
                  <span className="block text-xs font-medium text-muted-foreground">Total Payroll</span>
                  <span className="text-fluid-2xl font-black tabular-nums text-foreground mt-0.5 block">{settings?.currency || '$'}{totalPayrollCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 flex justify-between items-center border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">{currentPayrollData.length} Emp</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('payroll')} className="text-xs font-semibold h-7">View</Button>
              </div>
            </>
          )}
        </DashboardWidget>
        )}

        {/* Widget 1 — Employee Directory */}
        {canViewEmployees && (
          <DashboardWidget
          id="w1"
          title="Employee Directory"
          icon={<Icon name="group" size={18} />}
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('employees')} className="text-xs font-semibold h-7">View All</Button>}
          contentClass="flex items-center justify-around py-4"
          {...wProps}
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-fluid-display font-black tabular-nums text-foreground">{activeCount}</span>
            <Badge variant="success" className="gap-1 xl:gap-1.5 py-1 px-2 xl:px-3 text-[10px] xl:text-xs">
              <span className="sync-dot sync-blink w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full bg-status-success"></span>
              Active
            </Badge>
          </div>
          <div className="w-[1px] h-12 bg-border"></div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-fluid-display font-black tabular-nums text-foreground">{inactiveCount}</span>
            <Badge variant="destructive" className="gap-1 xl:gap-1.5 py-1 px-2 xl:px-3 text-[10px] xl:text-xs">
              <span className="sync-dot w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full bg-status-error"></span>
              Inactive
            </Badge>
          </div>
        </DashboardWidget>
        )}

        {/* 10. ASSETS WIDGET */}
      {canViewAssets && (
        <DashboardWidget
          id="assets-widget"
          title="Asset Inventory"
          icon={<Icon name="devices_other" size={18} />}
          iconClass="bg-teal-500/10 text-teal-500"
          {...wProps}
          action={
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('assets')} className="text-teal-500 hover:text-teal-600 hover:bg-teal-500/10 -mr-2">
              Manage
            </Button>
          }
        >
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-teal-600/80 uppercase tracking-wider mb-1">Total Assets</span>
                  <span className="text-fluid-2xl font-black text-foreground">{assets.length}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available</span>
                <span className="text-xl font-bold text-foreground">{availableAssetsCount}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assigned</span>
                <span className="text-xl font-bold text-foreground">{assets.length - availableAssetsCount}</span>
              </div>
            </div>
          </div>
        </DashboardWidget>
      )}

        {/* Widget 8 — Upcoming Milestones (Span 4) */}
        {canViewEmployees && (
          <DashboardWidget
          id="w8"
          title="Upcoming Milestones"
          icon={<Icon name="workspace_premium" size={18} />}
          iconClass="bg-amber-500/10 text-amber-500"
          action={<Badge variant="secondary" className="px-3 py-1">30 Days</Badge>}
          contentClass="flex flex-col justify-start pt-4"
          {...wProps}
        >
          {upcomingMilestones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
              <Icon name="redeem" size={34} className="text-muted-foreground/40 mb-2" />
              <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[200px] leading-relaxed">No birthdays or work anniversaries in the next 30 days.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingMilestones.map((milestone, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl bg-card hover:shadow-md transition-shadow">
                  <Avatar className="w-8 h-8 shrink-0">
                    {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary"><Icon name="person" size={16} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{milestone.empName}</p>
                    <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground">{milestone.label}</p>
                  </div>
                  <Badge variant="default" className="uppercase text-[10px]">
                    {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
        )}

      {/* SPACER for bottom padding */}
      <div className="h-8 col-span-full"></div>
    </div>
    </div>
  )
}
