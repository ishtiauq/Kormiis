import { useEffect, useState, useMemo } from 'react'
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

const DashboardWidget = ({ 
  id, title, icon, action, 
  useAccordion, expandedWidgets, toggleWidget,
  cardClass = '',
  contentClass = '',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 h-full ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 shrink-0 rounded-2xl bg-black/[0.04] dark:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center [&_.msr]:!text-foreground">
            {icon}
          </div>
          <CardTitle className="text-fluid-lg font-bold tracking-tight text-foreground m-0 leading-snug truncate">{title}</CardTitle>
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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (currentUser?.name || '').split(' ')[0]
  const canViewAssets = hasPermission ? hasPermission('assets') : true

  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, onLeave: 0 })
  const [attendanceLists, setAttendanceLists] = useState({ present: [], absent: [], onLeave: [] })
  const [attFilter, setAttFilter] = useState(null)
  const [attTab, setAttTab] = useState('donut') // 'donut' | 'trend'

  const weeklyTrendData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const activeEmps = employees.filter(e => e.status !== 'Terminated')
    const activeCount = Math.max(1, activeEmps.length)
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
  }, [attendance, employees, todayStats])

  const [selectedDayIndex, setSelectedDayIndex] = useState(6) // default: Today (last item)

  const selectedDayData = useMemo(() => {
    const todayDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
    return weeklyTrendData[selectedDayIndex] || weeklyTrendData[weeklyTrendData.length - 1] || {
      day: todayDayName,
      isToday: true,
      date: new Date().toISOString().split('T')[0],
      present: todayStats.present,
      absent: todayStats.absent,
      onLeave: todayStats.onLeave,
      total: employees.filter(e => e.status !== 'Terminated').length,
      rate: 100
    }
  }, [weeklyTrendData, selectedDayIndex, todayStats, employees])

  const selectedDayLists = useMemo(() => {
    const selectedDay = weeklyTrendData[selectedDayIndex] || weeklyTrendData[weeklyTrendData.length - 1]
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

    employees.forEach(emp => {
      if (emp.status === 'Terminated') return
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
  }, [selectedDayIndex, weeklyTrendData, attendance, employees, attendanceLists])

  useEffect(() => {
    const todayIso = new Date().toISOString().split('T')[0]
    const todayLogs = attendance?.dailyLogs?.[todayIso] || attendance?.dailyLogs?.['2026-07-17'] || {}
    
    const presentList = []
    const absentList = []
    const onLeaveList = []

    employees.forEach(emp => {
      if (emp.status === 'Terminated') return
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

      <div className="flex items-end justify-between flex-wrap gap-3 pt-1">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-fluid-2xl font-black tracking-tight text-foreground m-0 leading-none">Dashboard</h1>
          <p className="text-fluid-sm font-medium text-muted-foreground m-0">
            {greeting}{firstName ? `, ${firstName}` : ''} — here's today at a glance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        
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
                  <p className="m-0 text-fluid-xs font-bold text-foreground truncate">{ann.title}</p>
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

                <div className="max-h-36 overflow-y-auto pr-1 flex flex-col divide-y divide-border/40 dark:divide-white/6">
                  {selectedDayLists[attFilter]?.length === 0 ? (
                    <p className="text-center py-3 text-xs text-muted-foreground">No teammates in this category for {selectedDayData.isToday ? 'Today' : selectedDayData.day}.</p>
                  ) : (
                    selectedDayLists[attFilter].map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="size-7 rounded-xl border border-white/40 dark:border-white/10 shrink-0">
                            {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary rounded-xl text-[10px] font-bold">
                              {emp.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate">{emp.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{emp.role || 'Teammate'}</span>
                          </div>
                        </div>
                        {emp.time ? (
                          <span className="text-[11px] font-mono font-bold text-foreground bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
                            {emp.time}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0">
                            {emp.status || (attFilter === 'absent' ? 'Absent' : 'Leave')}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </DashboardWidget>
        )}

        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} setCurrentView={setCurrentView} cardClass="" />

        <HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} />

        <DashboardWidget
          id="perf-widget"
          title="Performance Tracker"
          icon={<Icon name="insights" className="text-purple-500 shrink-0" size={28}/>}
          action={<button onClick={() => setCurrentView && setCurrentView('performance')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Details</button>}
          {...wProps}
        >
          <div className="flex flex-col gap-4 justify-center h-full pt-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-purple-500" />
                  Workforce Efficiency
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">{efficiencyScore}%</span>
              </div>
              <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500" style={{ width: `${efficiencyScore}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Task Completion
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">{taskCompletionRate}%</span>
              </div>
              <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Attendance Rate
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">{attendanceRate}%</span>
              </div>
              <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }}></div>
              </div>
            </div>
          </div>
        </DashboardWidget>

      {canViewTasks && (
        <DashboardWidget
          id="tasks-widget"
          title="Tasks Overview"
          icon={<Icon name="check_box" className="text-foreground shrink-0" size={28}/>}
          {...wProps}
          action={
            <button onClick={() => setCurrentView('tasks')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-foreground hover:text-foreground cursor-pointer">
              View All
            </button>
          }
        >
          <div className="flex flex-col h-full justify-between gap-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-fluid-xl font-black text-foreground tabular-nums">{pendingTasksCount}</span>
                <span className="text-xs font-medium text-muted-foreground ml-2">Pending Tasks</span>
              </div>
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-black/10 dark:border-white/12 text-foreground bg-black/[0.04] dark:bg-white/[0.06]">
                Active
              </Badge>
            </div>
            
            <div className="flex flex-col gap-2">
              {tasks.filter(t => t.status !== 'Done').slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 px-3 rounded-2xl liquid-widget-item cursor-pointer">
                  <div className="size-2 rounded-full bg-foreground shrink-0" />
                  <p className="text-fluid-sm font-medium text-foreground truncate flex-1 m-0">{t.title}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0 rounded-full px-2 py-0.5 border-black/10 dark:border-white/10">{t.status}</Badge>
                </div>
              ))}
              {pendingTasksCount === 0 && (
                <div className="text-center py-4 flex flex-col items-center justify-center">
                  <Icon name="verified" className="text-foreground/80 mb-2 shrink-0" size={44}/>
                  <p className="text-fluid-xs text-muted-foreground m-0 font-medium">No pending tasks! All caught up.</p>
                </div>
              )}
            </div>
          </div>
        </DashboardWidget>
      )}

        {canViewEmployees && (
          <DashboardWidget
          id="w8"
          title="Upcoming Milestones"
          icon={<Icon name="workspace_premium" className="text-amber-500 shrink-0" size={28}/>}
          action={<button onClick={() => setCurrentView && setCurrentView('employees')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Directory</button>}
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
                <div key={i} className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl liquid-widget-item">
                  <Avatar className="size-8 shrink-0 rounded-xl ring-2 ring-primary/20">
                    {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary rounded-xl font-bold"><Icon name="person" size={16}/></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <p className="m-0 text-fluid-xs font-bold text-foreground truncate">{milestone.empName}</p>
                    <p className="m-0 text-[11px] font-medium text-muted-foreground truncate">{milestone.label}</p>
                  </div>
                  <Badge variant="default" className="uppercase text-[10px] rounded-full px-2.5 py-0.5 shadow-xs font-bold">
                    {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
        )}

        {canViewCalendar && (
          <DashboardWidget
          id="w6"
          title="Upcoming Events"
          icon={<Icon name="calendar_month" className="text-emerald-500 shrink-0" size={28}/>}
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
                className="flex items-center gap-3 p-3 px-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all cursor-pointer select-none active:scale-[0.99] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none"
                onClick={() => setCurrentView && setCurrentView('calendar')}
              >
                <Icon name="calendar_month" style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} className="shrink-0" size={24}/>
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
          icon={<Icon name="description" className="text-blue-500 shrink-0" size={28}/>}
          {...wProps}
          action={
            <button onClick={() => setCurrentView('documents')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full text-blue-500 hover:text-blue-600 cursor-pointer">
              View All
            </button>
          }
        >
          <div className="flex flex-col h-full gap-2.5">
            {recentDocuments.length > 0 ? recentDocuments.map((doc, i) => (
              <div key={i} className="flex flex-col gap-1 p-2.5 px-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
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
          icon={<Icon name="account_balance" className="text-emerald-500 shrink-0" size={28}/>}
          action={currentPayrollMonth && <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full text-xs font-semibold">{currentPayrollMonth}</Badge>}
          contentClass="flex flex-col justify-between pt-4"
          {...wProps}
        >
          {!currentPayrollMonth ? (
            <p className="text-center my-auto text-fluid-xs text-muted-foreground">No payroll data found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Paid</span>
                  <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{paidCount}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">Pending</span>
                  <span className="text-fluid-xl font-black tabular-nums text-foreground mt-0.5 block">{pendingCount}</span>
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
          icon={<Icon name="group" className="text-blue-500 shrink-0" size={28}/>}
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
          icon={<Icon name="devices_other" className="text-teal-500 shrink-0" size={28}/>}
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
            
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none">
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
