import { useEffect, useState, useMemo, useDeferredValue, memo, lazy, Suspense } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDateShort } from '../services/date.js'
import GeoCheckInWidget from './attendance/GeoCheckInWidget.jsx'
import DailyChecklistWidget from './DailyChecklistWidget.jsx'
import HrOverview from './hr/HrOverview.jsx'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'

// Lazy load heavy widgets for progressive rendering
const PerformanceTrackerWidget = lazy(() => import('./widgets/PerformanceTrackerWidget.jsx').then(m => ({ default: m.PerformanceTrackerWidget })))
const TasksWidget = lazy(() => import('./widgets/TasksWidget.jsx').then(m => ({ default: m.TasksWidget })))
const MilestonesWidget = lazy(() => import('./widgets/MilestonesWidget.jsx').then(m => ({ default: m.MilestonesWidget })))
const EventsWidget = lazy(() => import('./widgets/EventsWidget.jsx').then(m => ({ default: m.EventsWidget })))
const DocumentsWidget = lazy(() => import('./widgets/DocumentsWidget.jsx').then(m => ({ default: m.DocumentsWidget })))
const PayrollWidget = lazy(() => import('./widgets/PayrollWidget.jsx').then(m => ({ default: m.PayrollWidget })))
const EmployeeDirectoryWidget = lazy(() => import('./widgets/EmployeeDirectoryWidget.jsx').then(m => ({ default: m.EmployeeDirectoryWidget })))
const AssetsWidget = lazy(() => import('./widgets/AssetsWidget.jsx').then(m => ({ default: m.AssetsWidget })))

// Skeleton fallback for lazy widgets
function WidgetSkeleton({ className = '' }) {
  return (
    <div className={`w-full h-48 rounded-2xl bg-foreground/10 animate-pulse ${className}`} aria-hidden="true" />
  )
}

export const DashboardWidget = memo(({ 
  id, title, icon, action, 
  useAccordion, expandedWidgets, toggleWidget,
  cardClass = '',
  contentClass = '',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 h-full ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
            {icon}
          </div>
          <CardTitle className="text-fluid-lg font-bold tracking-tight text-foreground m-0 leading-snug break-words ">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} p-4 sm:p-5`}>
        {children}
      </CardContent>
    </Card>
  )
})

DashboardWidget.displayName = 'DashboardWidget'

const EmployeeRow = memo(({ emp }) => (
  <div className="flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar className="size-7 rounded-xl border border-white/40 dark:border-white/10 shrink-0">
        {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
        <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-[10px] font-bold">
          {emp.name?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-foreground break-words ">{emp.name}</span>
        <span className="text-[10px] text-muted-foreground break-words ">{emp.role || 'Teammate'}</span>
      </div>
    </div>
    {emp.time ? (
      <span className="text-[11px] font-mono font-bold text-foreground bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
        {emp.time}
      </span>
    ) : (
      <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0">
        {emp.status || 'Absent'}
      </Badge>
    )}
  </div>
))

EmployeeRow.displayName = 'EmployeeRow'

const VirtualizedList = memo(({ items, filter }) => {
  if (!items?.length) return (
    <p className="text-center py-3 text-xs text-muted-foreground">
      No teammates in this category.
    </p>
  )
  
  return (
    <div className="max-h-36 overflow-y-auto pr-1 flex flex-col divide-y divide-border/40 dark:divide-white/6">
      {items.map((emp) => (
        <EmployeeRow key={emp.id} emp={emp} />
      ))}
    </div>
  )
})

VirtualizedList.displayName = 'VirtualizedList'

export default function Dashboard({ employees, onSync, attendance, setAttendance, currentUser, addToast, setCurrentView, announcements, events, payroll, isSidebarCollapsed, hasPermission, tasks = [], documents = [], assets = [], settings, notes = [], setNotes }) {
  const [expandedWidgets, setExpandedWidgets] = useState([])
  const [attFilter, setAttFilter] = useState(null)
  const [attTab, setAttTab] = useState('donut')
  const [selectedDayIndex, setSelectedDayIndex] = useState(6)
  
  // Defer filter updates to keep UI responsive during scroll
  const deferredAttFilter = useDeferredValue(attFilter)
  const deferredSelectedDayIndex = useDeferredValue(selectedDayIndex)

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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (currentUser?.name || '').split(' ')[0]

  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, onLeave: 0 })
  const [attendanceLists, setAttendanceLists] = useState({ present: [], absent: [], onLeave: [] })

  const activeEmps = useMemo(() => employees.filter(e => e.status !== 'Terminated'), [employees])
  const activeCount = useMemo(() => Math.max(1, activeEmps.length), [activeEmps])

  const weeklyTrendData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const result = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const dayName = days[d.getDay()]
      const logs = attendance?.dailyLogs?.[iso]
      
      let presentCount = 0
      let absentCount = 0
      let onLeaveCount = 0

      if (i === 0) {
        presentCount = todayStats.present
        absentCount = todayStats.absent
        onLeaveCount = todayStats.onLeave
      } else if (logs && Object.keys(logs).length > 0) {
        activeEmps.forEach(emp => {
          const log = logs[emp.id]
          if (log) {
            if (log.status === 'Present' || log.status === 'Late') presentCount++
            else if (log.status === 'On Leave') onLeaveCount++
            else absentCount++
          } else {
            if (emp.status === 'On Leave') onLeaveCount++
            else absentCount++
          }
        })
      } else {
        const seed = (d.getDate() * 5 + i * 2) % 3
        const leaveSeed = (d.getDate() + i) % 2
        onLeaveCount = Math.min(activeCount - 1, leaveSeed)
        absentCount = Math.min(activeCount - onLeaveCount - 1, seed)
        presentCount = Math.max(0, activeCount - absentCount - onLeaveCount)
      }

      const rate = Math.min(100, Math.round((presentCount / activeCount) * 100))
      result.push({
        day: dayName,
        isToday: i === 0,
        date: iso,
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        total: activeCount,
        rate: rate
      })
    }
    return result
  }, [attendance, activeEmps, activeCount, todayStats])

  const selectedDayData = useMemo(() => {
    const todayDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
    return weeklyTrendData[deferredSelectedDayIndex] || weeklyTrendData[weeklyTrendData.length - 1] || {
      day: todayDayName,
      isToday: true,
      date: new Date().toISOString().split('T')[0],
      present: todayStats.present,
      absent: todayStats.absent,
      onLeave: todayStats.onLeave,
      total: activeCount,
      rate: 100
    }
  }, [weeklyTrendData, deferredSelectedDayIndex, todayStats, activeCount])

  const selectedDayLists = useMemo(() => {
    const selectedDay = weeklyTrendData[deferredSelectedDayIndex] || weeklyTrendData[weeklyTrendData.length - 1]
    if (!selectedDay) return attendanceLists

    const iso = selectedDay.date
    const todayIso = new Date().toISOString().split('T')[0]
    if (iso === todayIso && attendanceLists.present.length > 0) {
      return attendanceLists
    }

    const logs = attendance?.dailyLogs?.[iso] || {}
    const pList = []
    const aList = []
    const lList = []

    activeEmps.forEach(emp => {
      const log = logs[emp.id]
      const designation = emp.designation && emp.designation.toLowerCase() !== 'teammate' ? emp.designation : (emp.role && emp.role.toLowerCase() !== 'teammate' ? emp.role : '')
      const entry = {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        role: designation,
        designation,
        time: log?.checkIn || null,
        status: log?.status || (emp.status === 'On Leave' ? 'On Leave' : 'Absent')
      }
      if (log) {
        if (log.status === 'Present' || log.status === 'Late') pList.push(entry)
        else if (log.status === 'On Leave') lList.push(entry)
        else aList.push(entry)
      } else {
        if (emp.status === 'On Leave') lList.push(entry)
        else aList.push(entry)
      }
    })

    return { present: pList, absent: aList, onLeave: lList }
  }, [deferredSelectedDayIndex, weeklyTrendData, attendance, activeEmps, attendanceLists])

  useEffect(() => {
    const todayIso = new Date().toISOString().split('T')[0]
    const todayLogs = attendance?.dailyLogs?.[todayIso] || attendance?.dailyLogs?.['2026-07-17'] || {}
    
    const presentList = []
    const absentList = []
    const onLeaveList = []

    activeEmps.forEach(emp => {
      const log = todayLogs[emp.id]
      const designation = emp.designation && emp.designation.toLowerCase() !== 'teammate' ? emp.designation : (emp.role && emp.role.toLowerCase() !== 'teammate' ? emp.role : '')
      const entry = { 
        id: emp.id, 
        name: emp.name, 
        avatar: emp.avatar, 
        role: designation, 
        designation, 
        time: log?.checkIn || null,
        status: log?.status || (emp.status === 'On Leave' ? 'On Leave' : 'Absent')
      }
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
  }, [activeEmps, attendance])

  const calculateUpcomingMilestones = (employeesList) => {
    const today = new Date()
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
  const inactiveCount = employees.filter(emp => emp.status === 'Terminated' || emp.status === 'Inactive').length

  const recentAnnouncements = announcements
    ? [...announcements]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
    : []

  const upcomingEvents = events
    ? [...events]
        .filter(evt => new Date(evt.date) >= new Date())
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
      {currentUser && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 lg:gap-6 items-stretch pt-2">
        
        {canViewAnnouncements && (
          <DashboardWidget
          id="w4"
          title="Announcements"
          icon={<Icon name="rss_feed" className="text-amber-500 shrink-0" size={28}/>}
          cardClass="col-span-full"
          action={<button onClick={() => setCurrentView && setCurrentView('announcements')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">View All</button>}
          contentClass="flex flex-col justify-start gap-2.5 pt-4"
          {...wProps}
        >
          {recentAnnouncements.length === 0 ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground py-4">No active announcements</p>
          ) : (
            recentAnnouncements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className="flex items-center gap-3.5 p-3 px-4 rounded-2xl liquid-widget-item cursor-pointer select-none active:scale-[0.99]"
                onClick={() => setCurrentView && setCurrentView('announcements')}
              >
                <Icon name="rss_feed" size={24} className="text-foreground shrink-0"/>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="m-0 text-fluid-xs font-bold text-foreground break-words ">{ann.title}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {getEmployeeName(ann.authorId)} &middot; {new Date(ann.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {ann.priority === 'Important' && (
                  <Badge variant="destructive" className="uppercase text-[10px] rounded-full px-2.5 py-0.5 shadow-xs">
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
            title="Attendance"
            icon={<Icon name="group" className="text-foreground shrink-0" size={28}/>}
            action={
              <div className="flex items-center gap-1.5 sm:gap-2">
                {attFilter && (
                  <button 
                    onClick={() => setAttFilter(null)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button 
                  onClick={() => setCurrentView && setCurrentView('attendance')} 
                  className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0"
                >
                  Roll Call
                </button>
              </div>
            }
            contentClass="flex flex-col justify-between pt-1"
            {...wProps}
          >
            {/* ================= 7-DAY DAY-WISE SELECTOR & BREAKDOWN ================= */}
            <div className="flex flex-col gap-3 py-1">
              {/* 1. Top: Full-Width 7-Day Day Selector Strip */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    LAST 7 DAYS
                  </span>
                  <span className="text-[11px] font-bold text-foreground font-mono">
                    {selectedDayData.isToday ? 'Today' : selectedDayData.date}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
                  {weeklyTrendData.map((item, idx) => {
                    const isSelected = selectedDayIndex === idx
                    const dayNum = item.date ? item.date.split('-')[2] : ''
                    return (
                      <button
                        key={item.date || idx}
                        type="button"
                        onClick={() => {
                          setSelectedDayIndex(idx)
                          setAttFilter(null)
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                          isSelected
                            ? 'selected-day-capsule font-extrabold scale-[1.04]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold leading-tight">
                          {item.day}
                        </span>
                        <span className="text-xs font-mono font-black leading-none mt-1">
                          {dayNum}
                        </span>
                        <span 
                          className={`size-1.5 rounded-full mt-1.5 day-dot ${
                            isSelected 
                              ? '' 
                              : item.present > 0 
                                ? 'bg-foreground' 
                                : 'bg-foreground/20'
                          }`} 
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Bottom: Selected Day Interactive Status Cards (Horizontal 3-Column Grid) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {/* Present Card */}
                <button
                  type="button"
                  onClick={() => setAttFilter(attFilter === 'present' ? null : 'present')}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden ${
                    attFilter === 'present'
                      ? 'bg-black/15 dark:bg-white/20 border-2 border-black/30 dark:border-white/40 shadow-xs scale-[1.02]'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon name="check_circle" size={16} className="text-foreground shrink-0" />
                    <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                      {selectedDayData.present}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Present</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedDayData.total > 0 ? `${Math.round((selectedDayData.present / selectedDayData.total) * 100)}%` : '0%'}
                  </span>
                </button>

                {/* Absent Card */}
                <button
                  type="button"
                  onClick={() => setAttFilter(attFilter === 'absent' ? null : 'absent')}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden ${
                    attFilter === 'absent'
                      ? 'bg-black/15 dark:bg-white/20 border-2 border-black/30 dark:border-white/40 shadow-xs scale-[1.02]'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon name="cancel" size={16} className="text-foreground/50 shrink-0" />
                    <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                      {selectedDayData.absent}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Absent</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedDayData.total > 0 ? `${Math.round((selectedDayData.absent / selectedDayData.total) * 100)}%` : '0%'}
                  </span>
                </button>

                {/* On Leave Card */}
                <button
                  type="button"
                  onClick={() => setAttFilter(attFilter === 'onLeave' ? null : 'onLeave')}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden ${
                    attFilter === 'onLeave'
                      ? 'bg-black/15 dark:bg-white/20 border-2 border-black/30 dark:border-white/40 shadow-xs scale-[1.02]'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon name="event_busy" size={16} className="text-foreground/75 shrink-0" />
                    <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                      {selectedDayData.onLeave}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">On Leave</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedDayData.total > 0 ? `${Math.round((selectedDayData.onLeave / selectedDayData.total) * 100)}%` : '0%'}
                  </span>
                </button>
              </div>
            </div>

            {/* Interactive Personnel List (Drill-Down on Filter) */}
            {attFilter && (
              <div className="mt-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/60 dark:border-white/8 flex flex-col gap-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-foreground capitalize flex items-center gap-1.5">
                    <Icon 
                      name={attFilter === 'present' ? 'check_circle' : attFilter === 'absent' ? 'cancel' : 'event_busy'} 
                      size={14} 
                      className="text-foreground shrink-0" 
                    />
                    {attFilter === 'present' ? 'Present' : attFilter === 'absent' ? 'Absent' : 'On Leave'} ({selectedDayLists[attFilter]?.length || 0}) • <span className="font-mono text-muted-foreground text-[11px]">{selectedDayData.isToday ? 'Today' : selectedDayData.day}</span>
                  </span>
                  <button 
                    onClick={() => setAttFilter(null)}
                    className="text-[11px] font-semibold text-foreground hover:underline cursor-pointer"
                  >
                    Hide
                  </button>
                </div>

                <VirtualizedList items={selectedDayLists[deferredAttFilter]} filter={deferredAttFilter} />
              </div>
            )}
          </DashboardWidget>
        )}

        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} setCurrentView={setCurrentView} cardClass="" />

<HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} />

        {/* Performance Tracker - Lazy loaded with Suspense */}
        <Suspense fallback={<WidgetSkeleton />}>
          <PerformanceTrackerWidget 
            efficiencyScore={efficiencyScore} 
            taskCompletionRate={taskCompletionRate} 
            attendanceRate={attendanceRate} 
            setCurrentView={setCurrentView} 
            {...wProps} 
          />
        </Suspense>

        {/* Tasks Widget - Lazy loaded with Suspense */}
        {canViewTasks && (
          <Suspense fallback={<WidgetSkeleton />}>
            <TasksWidget 
              tasks={tasks} 
              pendingTasksCount={pendingTasksCount} 
              taskCompletionRate={taskCompletionRate} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Milestones Widget - Lazy loaded with Suspense */}
        {canViewEmployees && (
          <Suspense fallback={<WidgetSkeleton />}>
            <MilestonesWidget 
              upcomingMilestones={upcomingMilestones} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Events Widget - Lazy loaded with Suspense */}
        {canViewCalendar && (
          <Suspense fallback={<WidgetSkeleton />}>
            <EventsWidget 
              upcomingEvents={upcomingEvents} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Documents Widget - Lazy loaded with Suspense */}
        {canViewDocuments && (
          <Suspense fallback={<WidgetSkeleton />}>
            <DocumentsWidget 
              recentDocuments={recentDocuments} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Payroll Widget - Lazy loaded with Suspense */}
        {canViewPayroll && (
          <Suspense fallback={<WidgetSkeleton />}>
            <PayrollWidget 
              currentPayrollMonth={currentPayrollMonth}
              paidCount={paidCount}
              pendingCount={pendingCount}
              totalPayrollCost={totalPayrollCost}
              settings={settings}
              currentPayrollData={currentPayrollData}
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Employee Directory Widget - Lazy loaded with Suspense */}
        {canViewEmployees && (
          <Suspense fallback={<WidgetSkeleton />}>
            <EmployeeDirectoryWidget 
              activeCount={activeCount} 
              inactiveCount={inactiveCount} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        {/* Assets Widget - Lazy loaded with Suspense */}
        {canViewAssets && (
          <Suspense fallback={<WidgetSkeleton />}>
            <AssetsWidget 
              assets={assets} 
              availableAssetsCount={availableAssetsCount} 
              setCurrentView={setCurrentView} 
              {...wProps} 
            />
          </Suspense>
        )}

        <div className="h-8 col-span-full"></div>
      </div>
    </div>
  )
}
