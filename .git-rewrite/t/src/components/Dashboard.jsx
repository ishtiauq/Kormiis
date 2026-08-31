import { useEffect, useState } from 'react'
import { Megaphone, Calendar as CalendarIcon, CreditCard, ChevronDown, LayoutDashboard, Gift, Award, Users, Activity, User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDateShort } from '../services/date.js'

const DashboardWidget = ({ 
  id, title, icon, action, 
  useAccordion, expandedWidgets, toggleWidget,
  cardClass = '',
  contentClass = '',
  iconClass = 'bg-primary/10 text-primary',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 ${useAccordion ? 'h-auto' : `h-full xl:col-span-4 ${cardClass}`}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <CardTitle className="text-base font-extrabold m-0">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} py-4 pt-0`}>
        {children}
      </CardContent>
    </Card>
  )
}

export default function Dashboard({ employees, driveConnected, onSync, attendance, setCurrentView, announcements, events, payroll, isSidebarCollapsed, simulatedRole, hasPermission }) {
  const [isIpad, setIsIpad] = useState(false)
  const [expandedWidgets, setExpandedWidgets] = useState([])
  
  useEffect(() => {
    const checkIpad = () => setIsIpad(window.innerWidth >= 768 && window.innerWidth < 1024)
    checkIpad()
    window.addEventListener('resize', checkIpad)
    return () => window.removeEventListener('resize', checkIpad)
  }, [])

  const useAccordion = isIpad && !isSidebarCollapsed
  const toggleWidget = (id) => setExpandedWidgets(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id])

  const wProps = { useAccordion, expandedWidgets, toggleWidget }

  const canViewEmployees = hasPermission ? hasPermission('employees') : true
  const canViewAttendance = hasPermission ? hasPermission('attendance') : true
  const canViewPayroll = hasPermission ? hasPermission('payroll') : true
  const canViewCalendar = hasPermission ? hasPermission('calendar') : true
  const canViewAnnouncements = hasPermission ? hasPermission('announcements') : true
  const canViewDrive = hasPermission ? hasPermission('drive') : true

  const [totalEmployees, setTotalEmployees] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [leaveCount, setLeaveCount] = useState(0)
  const [syncLogs, setSyncLogs] = useState([])
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

    // Set mock sync logs
    setSyncLogs([
      { id: 1, action: 'Directory Pulled', timestamp: 'Just now', details: 'Retrieved 8 personnel entries successfully.', status: 'success' },
      { id: 2, action: 'Roster Synced', timestamp: '12 mins ago', details: 'Uploaded today\'s biometric clock-in logs.', status: 'warn' },
      { id: 3, action: 'Leave Ledgers Failed', timestamp: '1 hr ago', details: 'Network timeout while updating sickness allowances.', status: 'error' },
    ])

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

  const upcomingEvents = (events || [])
    .filter(e => new Date(e.date) >= new Date('2026-07-17'))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)

  const recentAnnouncements = (announcements || []).slice(0, 3)

  return (
    <div className="flex-1 flex flex-col gap-6 sm:gap-8">
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <LayoutDashboard size={20} className="text-primary" />
          Dashboard
        </h1>
      </div>
      <div className="border-t border-border" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-r from-card to-primary/5 gap-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground m-0">
          <Activity size={24} className="text-primary shrink-0" />
          {simulatedRole === 'Admin' ? 'Admin Overview' : 'Manager Overview'}
        </h2>
        <span className="text-sm font-semibold text-foreground bg-muted/80 px-4 py-2 rounded-md border border-border/50 shrink-0">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Unified Responsive & Adaptive Dashboard Grid */}
      <div className={useAccordion ? "flex flex-col gap-4 w-full" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 lg:gap-6 items-stretch"}>
        
        {/* Widget 1 — Employee Directory (Span 4) */}
        {canViewEmployees && (
          <DashboardWidget
          id="w1"
          title="Employee Directory"
          icon={<Users size={18} />}
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('employees')} className="text-xs font-semibold h-7">View All</Button>}
          contentClass="flex items-center justify-around py-4"
          {...wProps}
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-4xl font-black tabular-nums text-foreground">{activeCount}</span>
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <span className="sync-dot sync-blink w-2 h-2 rounded-full bg-emerald-500"></span>
              Active
            </Badge>
          </div>
          <div className="w-[1px] h-12 bg-border"></div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-4xl font-black tabular-nums text-foreground">{inactiveCount}</span>
            <Badge variant="destructive" className="gap-1.5 py-1 px-3">
              <span className="sync-dot w-2 h-2 rounded-full bg-destructive"></span>
              Inactive
            </Badge>
          </div>
        </DashboardWidget>
        )}

        {/* Widget 2 — Today's Attendance (Span 4) */}
        {canViewAttendance && (
          <DashboardWidget
          id="w2"
          title="Today's Attendance"
          icon={<Users size={18} />}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          action={<Button variant="outline" size="sm" onClick={() => setShowAttDropdown(!showAttDropdown)} className="text-xs font-semibold h-7">{showAttDropdown ? 'Hide' : 'Details'}</Button>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="pulse-dot pulse-dot-green m-0"></span>
                {todayStats.present}
              </span>
              <span className="text-xs font-medium text-muted-foreground mt-1">Present</span>
            </div>
            <div className="w-[1px] h-10 bg-border"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl sm:text-3xl font-black text-destructive flex items-center gap-1.5">
                <span className="pulse-dot pulse-dot-red m-0"></span>
                {todayStats.absent}
              </span>
              <span className="text-xs font-medium text-muted-foreground mt-1">Absent</span>
            </div>
            <div className="w-[1px] h-10 bg-border"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1.5">
                <span className="pulse-dot pulse-dot-orange m-0"></span>
                {todayStats.onLeave}
              </span>
              <span className="text-xs font-medium text-muted-foreground mt-1">Leave</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Attendance Rate</span>
            <span className="font-extrabold text-sm text-foreground">{attendanceRate}%</span>
          </div>
        </DashboardWidget>
        )}

        {/* Widget 3 — Drive Connection (Span 4) */}
        {canViewDrive && (
          <DashboardWidget
          id="w3"
          title="Drive Connection"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 0-9 4.4 4.4 0 0 0-.8.1 7 7 0 1 0-11 5.9"></path></svg>}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          cardClass={driveConnected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'}
          action={<Badge variant={driveConnected ? "success" : "destructive"}>{driveConnected ? 'Synced' : 'Error'}</Badge>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {driveConnected ? 'Healthy Connection' : 'Drive Disconnected'}
            </span>
          </div>
          <p className="text-xs font-medium m-0 mt-3 text-muted-foreground leading-relaxed">
            {driveConnected ? 'Google Drive biometric & roster logs sync automatically.' : 'Re-authenticate with Google Drive to enable auto sync.'}
          </p>
        </DashboardWidget>
        )}

        {/* Attendance Details Dropdown (Span 12 Full Width) */}
        {showAttDropdown && canViewAttendance && (
          <Card className="xl:col-span-12 overflow-hidden p-0">
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
                      <p className="my-1.5 text-xs text-muted-foreground italic">No personnel in this category</p>
                    ) : (
                      attendanceLists[item.key].map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3.5 py-2 border-b border-border/40 last:border-none">
                          <Avatar className="w-8 h-8 shrink-0">
                            {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><User size={16} /></AvatarFallback>
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

        {/* Widget 4 — Announcements (Span 6) */}
        {canViewAnnouncements && (
          <DashboardWidget
          id="w4"
          title="Announcements"
          icon={<Megaphone size={18} />}
          iconClass="bg-amber-500/10 text-amber-500"
          cardClass="xl:col-span-6"
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('announcements')} className="text-xs font-semibold h-7">View All</Button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {recentAnnouncements.length === 0 ? (
            <p className="text-center my-auto text-xs text-muted-foreground">No active announcements</p>
          ) : (
            recentAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => setCurrentView && setCurrentView('announcements')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                  <Megaphone size={16} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-xs font-bold text-foreground break-words">{ann.title}</p>
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

        {/* Widget 5 — Payroll Summary (Span 6) */}
        {canViewPayroll && (
          <DashboardWidget
          id="w5"
          title="Payroll Summary"
          icon={<CreditCard size={18} />}
          cardClass="xl:col-span-6"
          action={currentPayrollMonth && <Badge variant="secondary" className="px-3 py-1 h-7">{currentPayrollMonth}</Badge>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          {!currentPayrollMonth ? (
            <p className="text-center my-auto text-xs text-muted-foreground">No payroll data found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/50">
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Paid</span>
                  <span className="text-xl sm:text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">{paidCount}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Pending</span>
                  <span className="text-xl sm:text-2xl font-black tabular-nums text-amber-500 mt-0.5 block">{pendingCount}</span>
                </div>
                <div className="col-span-2 xl:col-span-1 xl:text-right border-t xl:border-t-0 border-border/50 pt-2 xl:pt-0 mt-1 xl:mt-0">
                  <span className="block text-xs font-medium text-muted-foreground">Total Payroll</span>
                  <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground mt-0.5 block">${totalPayrollCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 flex justify-between items-center border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">{currentPayrollData.length} Employees total</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('payroll')} className="text-xs font-semibold h-7">View Payroll</Button>
              </div>
            </>
          )}
        </DashboardWidget>
        )}

        {/* Widget 6 — Upcoming Events (Span 4) */}
        {canViewCalendar && (
          <DashboardWidget
          id="w6"
          title="Upcoming Events"
          icon={<CalendarIcon size={18} />}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          action={<Button variant="outline" size="sm" onClick={() => setCurrentView && setCurrentView('calendar')} className="text-xs font-semibold h-7">Calendar</Button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {upcomingEvents.length === 0 ? (
            <p className="text-center my-auto text-xs text-muted-foreground">No upcoming events</p>
          ) : (
            upcomingEvents.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => setCurrentView && setCurrentView('calendar')}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: evt.type === 'holiday' ? 'rgba(16, 185, 129, 0.12)' : evt.type === 'birthday' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)' }}
                >
                  <CalendarIcon size={16} style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-xs font-bold text-foreground break-words">{evt.title}</p>
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

        {/* Widget 7 — Drive Sync Logs (Span 4) */}
        {canViewDrive && (
          <DashboardWidget
          id="w7"
          title="Drive Sync Logs"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>}
          action={<Badge variant="success">Live</Badge>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {syncLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 p-3 px-3.5 rounded-lg bg-muted/40 border border-border/50">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted text-muted-foreground shrink-0 border border-border/40">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="m-0 text-xs font-bold text-foreground break-words">{log.action}</p>
                <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">{log.details}</p>
              </div>
              <Badge variant={log.status === 'success' ? 'success' : log.status === 'error' ? 'destructive' : 'warning'} className="uppercase text-[10px]">
                {log.status === 'success' ? 'Synced' : log.status === 'error' ? 'Failed' : 'Pending'}
              </Badge>
            </div>
          ))}
        </DashboardWidget>
        )}

        {/* Widget 8 — Upcoming Milestones (Span 4) */}
        {canViewEmployees && (
          <DashboardWidget
          id="w8"
          title="Upcoming Milestones"
          icon={<Award size={18} />}
          iconClass="bg-amber-500/10 text-amber-500"
          action={<Badge variant="secondary" className="px-3 py-1">30 Days</Badge>}
          contentClass="flex flex-col justify-start pt-4"
          {...wProps}
        >
          {upcomingMilestones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
              <Gift size={34} className="text-muted-foreground/40 mb-2" />
              <p className="m-0 text-xs font-medium text-muted-foreground max-w-[200px] leading-relaxed">No birthdays or work anniversaries in the next 30 days.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingMilestones.map((milestone, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl bg-card hover:shadow-md transition-shadow">
                  <Avatar className="w-8 h-8 shrink-0">
                    {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary"><User size={16} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="m-0 text-xs font-bold text-foreground break-words">{milestone.empName}</p>
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

      </div>
    </div>
  )
}
