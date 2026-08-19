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
  iconClass = 'bg-primary/10 text-primary border border-primary/20',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 h-full ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0">
        <div className="flex items-center gap-3">
          <div className={`size-8.5 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <CardTitle className="text-fluid-lg font-bold text-foreground m-0">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} p-4 sm:p-5`}>
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

  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, onLeave: 0 })
  const [attendanceLists, setAttendanceLists] = useState({ present: [], absent: [], onLeave: [] })
  const [showAttDropdown, setShowAttDropdown] = useState(false)
  const [attFilter, setAttFilter] = useState(null)

  useEffect(() => {
    const todayStr = '2026-07-17' 
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
    const today = new Date('2026-07-17')
    const milestones = []

    employeesList.forEach(emp => {
      if (emp.dob) {
        const dobDate = new Date(emp.dob)
        const birthMonth = dobDate.getMonth()
        const birthDay = dobDate.getDate()

        let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay)
        if (nextBirthday < today) {
          nextBirthday = new Date(today.getFullYear() + 1, birthMonth, birthDay)
        }

        const diffTime = nextBirthday - today
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

        let nextAnniversary = new Date(today.getFullYear(), joinMonth, joinDay)
        if (nextAnniversary < today) {
          nextAnniversary = new Date(today.getFullYear() + 1, joinMonth, joinDay)
        }

        const diffTime = nextAnniversary - today
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
  }

  const upcomingMilestones = calculateUpcomingMilestones(employees)
  const totalTracked = todayStats.present + todayStats.absent + todayStats.onLeave
  const attendanceRate = totalTracked > 0 ? Math.round((todayStats.present / totalTracked) * 100) : 0
  const activeCount = employees.filter(emp => emp.status?.toLowerCase() !== 'inactive' && emp.status?.toLowerCase() !== 'terminated').length
  const inactiveCount = employees.filter(emp => emp.status === 'Terminated' || emp.status === 'Inactive').length

  const recentAnnouncements = announcements
    ? [...announcements]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
    : []

  const upcomingEvents = events
    ? [...events]
        .filter(evt => new Date(evt.date) >= new Date('2026-07-17'))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3)
    : []

  const currentPayrollMonth = payroll && Object.keys(payroll).length > 0
    ? Object.keys(payroll).sort().reverse()[0]
    : null
  const currentPayrollData = currentPayrollMonth ? payroll[currentPayrollMonth] || [] : []
  const paidCount = currentPayrollData.filter(p => p.status === 'Paid').length
  const pendingCount = currentPayrollData.filter(p => p.status === 'Pending').length
  const totalPayrollCost = currentPayrollData.reduce((acc, curr) => acc + (Number(curr.netSalary) || 0), 0)

  const efficiencyScore = totalTracked > 0 ? Math.min(100, Math.round((todayStats.present / totalTracked) * 100 + 5)) : 94
  const completedTasksCount = tasks.filter(t => t.status === 'Done').length
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 85
  const pendingTasksCount = tasks.filter(t => t.status !== 'Done').length
  const recentDocuments = documents.slice(0, 3)
  const availableAssetsCount = assets.filter(a => a.status === 'Available').length

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id)
    return emp ? emp.name : 'Unknown User'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="dashboard" className="text-foreground" size={20}/>
          Dashboard
        </h1>
      </div>
      <div className="border-t border-border border-headline" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between glass-card p-5 sm:p-6 rounded-3xl border border-white/30 dark:border-white/12 shadow-xl gap-4 mb-2">
        <h2 className="text-fluid-lg sm:text-fluid-xl font-extrabold tracking-tight flex items-center gap-3 text-foreground m-0">
          <div className="size-9 rounded-2xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Icon name="monitoring" size={20}/>
          </div>
          Admin Overview
        </h2>
        <span className="text-xs sm:text-sm font-semibold text-foreground apple-glass-btn px-4 py-2 rounded-full border border-white/20 dark:border-white/10 shrink-0">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        
        {canViewAnnouncements && (
          <DashboardWidget
          id="w4"
          title="Announcements"
          icon={<Icon name="rss_feed" size={18}/>}
          iconClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
          cardClass="col-span-full"
          action={<button onClick={() => setCurrentView && setCurrentView('announcements')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">View All</button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {recentAnnouncements.length === 0 ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No active announcements</p>
          ) : (
            recentAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-black/55 transition-all cursor-pointer select-none active:scale-[0.99]"
                onClick={() => setCurrentView && setCurrentView('announcements')}
              >
                <div className="size-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20">
                  <Icon name="rss_feed" size={16}/>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{ann.title}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {getEmployeeName(ann.authorId)} &middot; {new Date(ann.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {ann.priority === 'Important' && (
                  <Badge variant="destructive" className="uppercase text-[10px] rounded-full px-2 py-0.5">
                    Important
                  </Badge>
                )}
              </div>
            ))
          )}
        </DashboardWidget>
        )}

        {canViewAttendance && (
          <DashboardWidget
          id="w2"
          title="Today's Attendance"
          icon={<Icon name="group" size={18}/>}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          action={<button onClick={() => setShowAttDropdown(!showAttDropdown)} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">{showAttDropdown ? 'Hide' : 'Details'}</button>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          <div className="flex items-center justify-between gap-1 sm:gap-2 xl:gap-3 py-2">
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-green m-0"></span>
                {todayStats.present}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Present</span>
            </div>
            <div className="w-[1px] h-10 bg-border/80 dark:bg-white/10"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-xl font-black text-destructive flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-red m-0"></span>
                {todayStats.absent}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Absent</span>
            </div>
            <div className="w-[1px] h-10 bg-border/80 dark:bg-white/10"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-fluid-xl font-black text-amber-500 flex items-center gap-1 xl:gap-1.5">
                <span className="pulse-dot pulse-dot-orange m-0"></span>
                {todayStats.onLeave}
              </span>
              <span className="text-[10px] xl:text-xs font-medium text-muted-foreground mt-1">Leave</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10 flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Attendance Rate</span>
            <span className="font-extrabold text-sm text-foreground">{attendanceRate}%</span>
          </div>
        </DashboardWidget>
        )}

        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} cardClass="" />

        <HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} />

        <DashboardWidget
          id="perf-widget"
          title="Performance Tracker"
          icon={<Icon name="insights" size={18}/>}
          iconClass="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
          {...wProps}
        >
          <div className="flex flex-col gap-5 justify-center h-full">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground">Workforce Efficiency</span>
                <span className="text-base font-bold text-foreground">{efficiencyScore}%</span>
              </div>
              <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${efficiencyScore}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground">Task Completion</span>
                <span className="text-base font-bold text-foreground">{taskCompletionRate}%</span>
              </div>
              <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground">Attendance Rate</span>
                <span className="text-base font-bold text-foreground">{attendanceRate}%</span>
              </div>
              <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }}></div>
              </div>
            </div>
          </div>
        </DashboardWidget>

      {canViewTasks && (
        <DashboardWidget
          id="tasks-widget"
          title="Tasks Overview"
          icon={<Icon name="check_box" size={18}/>}
          iconClass="bg-orange-500/10 text-orange-500 border border-orange-500/20"
          {...wProps}
          action={
            <button onClick={() => setCurrentView('tasks')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-orange-500 hover:text-orange-600 cursor-pointer">
              View All
            </button>
          }
        >
          <div className="flex flex-col h-full justify-between gap-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-fluid-xl font-black text-foreground">{pendingTasksCount}</span>
              <span className="text-xs font-medium text-muted-foreground">Pending Tasks</span>
            </div>
            {tasks.filter(t => t.status !== 'Done').slice(0, 2).map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 px-3 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08]">
                <div className="size-2 rounded-full bg-orange-500 shrink-0" />
                <p className="text-fluid-sm font-medium text-foreground truncate flex-1 m-0">{t.title}</p>
                <Badge variant="outline" className="text-[10px] shrink-0 rounded-full px-2">{t.status}</Badge>
              </div>
            ))}
            {pendingTasksCount === 0 && (
              <p className="text-fluid-sm text-muted-foreground m-0">No pending tasks! Great job.</p>
            )}
          </div>
        </DashboardWidget>
      )}

        {canViewEmployees && (
          <DashboardWidget
          id="w8"
          title="Upcoming Milestones"
          icon={<Icon name="workspace_premium" size={18}/>}
          iconClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
          action={<Badge variant="secondary" className="px-2.5 py-0.5 rounded-full text-xs font-semibold">30 Days</Badge>}
          contentClass="flex flex-col justify-start pt-4"
          {...wProps}
        >
          {upcomingMilestones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
              <Icon name="redeem" className="text-muted-foreground/40 mb-2" size={34}/>
              <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[200px] leading-relaxed">No birthdays or work anniversaries in the next 30 days.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcomingMilestones.map((milestone, i) => (
                <div key={i} className="flex items-center gap-3 p-3 px-3.5 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl bg-black/[0.03] dark:bg-black/35 hover:bg-black/[0.06] dark:hover:bg-black/55 transition-all">
                  <Avatar className="size-8 shrink-0 rounded-xl">
                    {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary rounded-xl"><Icon name="person" size={16}/></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <p className="m-0 text-fluid-xs font-bold text-foreground truncate">{milestone.empName}</p>
                    <p className="m-0 text-[11px] font-medium text-muted-foreground truncate">{milestone.label}</p>
                  </div>
                  <Badge variant="default" className="uppercase text-[10px] rounded-full px-2 py-0.5">
                    {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
        )}

        {showAttDropdown && canViewAttendance && (
          <Card className="col-span-full overflow-hidden p-0">
            <div className="px-6 py-3.5 border-b border-border/80 dark:border-white/10 font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Today's Attendance Roster Breakdowns
            </div>
            {[
              { key: 'present', label: 'Present', count: todayStats.present, dot: 'pulse-dot-green' },
              { key: 'absent', label: 'Absent', count: todayStats.absent, dot: 'pulse-dot-red' },
              { key: 'onLeave', label: 'On Leave', count: todayStats.onLeave, dot: 'pulse-dot-orange' },
            ].map(item => (
              <div key={item.key} className="border-b border-border/80 dark:border-white/10 last:border-none">
                <button
                  onClick={() => setAttFilter(attFilter === item.key ? null : item.key)}
                  className="w-full flex items-center justify-between px-6 py-3.5 border-none bg-transparent hover:bg-black/[0.04] dark:hover:bg-black/40 transition-colors cursor-pointer text-xs sm:text-sm font-bold text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <span className={`pulse-dot ${item.dot} m-0`}></span>
                    {item.label}
                  </span>
                  <Badge variant="secondary" className="px-3 py-1 rounded-full text-xs font-semibold">
                    {item.count}
                  </Badge>
                </button>
                {attFilter === item.key && (
                  <div className="px-6 pb-4 pt-1 bg-black/[0.02] dark:bg-black/30">
                    {attendanceLists[item.key].length === 0 ? (
                      <p className="my-1.5 text-fluid-xs text-muted-foreground">No personnel in this category</p>
                    ) : (
                      attendanceLists[item.key].map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3.5 py-2.5 border-b border-border/60 dark:border-white/10 last:border-none">
                          <Avatar className="size-8 shrink-0 rounded-xl">
                            {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary rounded-xl"><Icon name="person" size={16}/></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-foreground">{emp.name}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">{emp.role}</span>
                          </div>
                          {emp.time && <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 rounded-full">{emp.time}</Badge>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {canViewCalendar && (
          <DashboardWidget
          id="w6"
          title="Upcoming Events"
          icon={<Icon name="calendar_month" size={18}/>}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          cardClass="md:col-span-2 lg:col-span-2"
          action={<button onClick={() => setCurrentView && setCurrentView('calendar')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Events</button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {upcomingEvents.length === 0 ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No upcoming events</p>
          ) : (
            upcomingEvents.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="flex items-center gap-3 p-3 px-3.5 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-black/55 transition-all cursor-pointer select-none active:scale-[0.99]"
                onClick={() => setCurrentView && setCurrentView('calendar')}
              >
                <div
                  className="size-8 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06] dark:border-white/10"
                >
                  <Icon name="calendar_month" style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} size={16}/>
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{evt.title}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">
                    {formatDate(evt.date)}{evt.time ? ` at ${evt.time}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 rounded-full">
                  {evt.type}
                </Badge>
              </div>
            ))
          )}
        </DashboardWidget>
        )}

      {canViewDocuments && (
        <DashboardWidget
          id="documents-widget"
          title="Recent Documents"
          icon={<Icon name="description" size={18}/>}
          iconClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
          {...wProps}
          action={
            <button onClick={() => setCurrentView('documents')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-blue-500 hover:text-blue-600 cursor-pointer">
              View All
            </button>
          }
        >
          <div className="flex flex-col h-full gap-2.5">
            {recentDocuments.length > 0 ? recentDocuments.map((doc, i) => (
              <div key={i} className="flex flex-col gap-1 p-2.5 px-3 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.06] dark:hover:bg-black/55 transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground truncate pr-2">{doc.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full px-2 py-0.5">{doc.category || 'Doc'}</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">Updated {formatDateShort(doc.uploadDate || doc.date || new Date().toISOString())}</span>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-fluid-sm text-muted-foreground text-center m-0">No documents found.</p>
              </div>
            )}
          </div>
        </DashboardWidget>
      )}

        {canViewPayroll && (
          <DashboardWidget
          id="w5"
          title="Payroll Summary"
          icon={<Icon name="account_balance" size={18}/>}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          action={currentPayrollMonth && <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full text-xs font-semibold">{currentPayrollMonth}</Badge>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          {!currentPayrollMonth ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No payroll data found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08]">
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Paid</span>
                  <span className="text-fluid-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">{paidCount}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Pending</span>
                  <span className="text-fluid-xl font-black tabular-nums text-amber-500 mt-0.5 block">{pendingCount}</span>
                </div>
                <div className="col-span-2 border-t border-border/80 dark:border-white/10 pt-2 mt-1">
                  <span className="block text-xs font-medium text-muted-foreground">Total Payroll</span>
                  <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{settings?.currency || '$'}{totalPayrollCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 flex justify-between items-center border-t border-border/80 dark:border-white/10">
                <span className="text-xs font-medium text-muted-foreground">{currentPayrollData.length} Employees</span>
                <button onClick={() => setCurrentView && setCurrentView('payroll')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">View</button>
              </div>
            </>
          )}
        </DashboardWidget>
        )}

        {canViewEmployees && (
          <DashboardWidget
          id="w1"
          title="Employee Directory"
          icon={<Icon name="group" size={18}/>}
          iconClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
          action={<button onClick={() => setCurrentView && setCurrentView('employees')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">View All</button>}
          contentClass="flex items-center justify-around py-4"
          {...wProps}
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-fluid-xl font-black tabular-nums text-foreground">{activeCount}</span>
            <Badge variant="success" className="gap-1 xl:gap-1.5 py-1 px-2.5 xl:px-3 text-[10px] xl:text-xs rounded-full">
              <span className="sync-dot sync-blink w-1.5 h-1.5 rounded-full bg-status-success"></span>
              Active
            </Badge>
          </div>
          <div className="w-[1px] h-12 bg-border/80 dark:bg-white/10"></div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-fluid-xl font-black tabular-nums text-foreground">{inactiveCount}</span>
            <Badge variant="destructive" className="gap-1 xl:gap-1.5 py-1 px-2.5 xl:px-3 text-[10px] xl:text-xs rounded-full">
              <span className="sync-dot w-1.5 h-1.5 rounded-full bg-status-error"></span>
              Inactive
            </Badge>
          </div>
        </DashboardWidget>
        )}

      {canViewAssets && (
        <DashboardWidget
          id="assets-widget"
          title="Asset Inventory"
          icon={<Icon name="devices_other" size={18}/>}
          iconClass="bg-teal-500/10 text-teal-500 border border-teal-500/20"
          {...wProps}
          action={
            <button onClick={() => setCurrentView('assets')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-teal-500 hover:text-teal-600 cursor-pointer">
              Manage
            </button>
          }
        >
          <div className="flex flex-col h-full justify-between gap-3.5">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-0.5">Total Assets</span>
                <span className="text-fluid-xl font-black text-foreground">{assets.length}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.03] dark:bg-black/35 border border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Available</span>
                <span className="text-base font-bold text-foreground">{availableAssetsCount}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Assigned</span>
                <span className="text-base font-bold text-foreground">{assets.length - availableAssetsCount}</span>
              </div>
            </div>
          </div>
        </DashboardWidget>
      )}

      <div className="h-8 col-span-full"></div>
    </div>
    </div>
  )
}
