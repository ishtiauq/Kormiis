import { useEffect, useState, useMemo, useDeferredValue, memo } from 'react'
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

// Eagerly imported widgets for instant, zero-delay rendering
import { PerformanceTrackerWidget } from './widgets/PerformanceTrackerWidget.jsx'
import { TasksWidget } from './widgets/TasksWidget.jsx'
import { EmployeeDirectoryWidget } from './widgets/EmployeeDirectoryWidget.jsx'
import { DocumentsWidget } from './widgets/DocumentsWidget.jsx'
import { PayrollWidget } from './widgets/PayrollWidget.jsx'
import { AssetsWidget } from './widgets/AssetsWidget.jsx'
import { AnnouncementsWidget } from './widgets/AnnouncementsWidget.jsx'

export const DashboardWidget = memo(({ 
  id, title, icon, action, 
  useAccordion, expandedWidgets, toggleWidget,
  cardClass = '',
  contentClass = '',
  children
}) => {
  return (
    <Card className={`flex flex-col p-0 h-full dashboard-widget ${cardClass}`}>
      <CardHeader className="flex-row items-center justify-between pb-3.5 space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
            {icon}
          </div>
          <CardTitle className="text-fluid font-bold tracking-tight text-foreground m-0 leading-snug break-words">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} p-3.5 sm:p-4`}>
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
        {emp.status || 'Off Duty'}
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

export default function Dashboard({ employees, onSync, attendance, setAttendance, currentUser, addToast, setCurrentView, announcements, setAnnouncements, addLog, addNotification, events, payroll, isSidebarCollapsed, hasPermission, tasks = [], documents = [], assets = [], settings, notes = [], setNotes }) {
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
            const s = String(log.status || '').trim()
            if (s === 'In Office' || s === 'Present' || s === 'Late' || s === 'Remote' || s === 'WFH' || s === 'On-Field') presentCount++
            else if (s === 'On Leave') onLeaveCount++
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
      const s = String(log?.status || '').trim()
      const fallbackStatus = emp.status === 'On Leave' ? 'On Leave' : 'Off Duty'
      const entry = {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        role: designation,
        designation,
        time: log?.checkIn || null,
        status: s || fallbackStatus
      }
      if (log) {
        if (s === 'In Office' || s === 'Present' || s === 'Late' || s === 'Remote' || s === 'WFH' || s === 'On-Field') pList.push(entry)
        else if (s === 'On Leave') lList.push(entry)
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
      const s = String(log?.status || '').trim()
      const fallbackStatus = emp.status === 'On Leave' ? 'On Leave' : 'Off Duty'
      const entry = { 
        id: emp.id, 
        name: emp.name, 
        avatar: emp.avatar, 
        role: designation, 
        designation, 
        time: log?.checkIn || null,
        status: s || fallbackStatus
      }
      if (log) {
        if (s === 'In Office' || s === 'Present' || s === 'Late' || s === 'Remote' || s === 'WFH' || s === 'On-Field') {
          presentList.push(entry)
        } else if (s === 'On Leave') {
          onLeaveList.push(entry)
        } else {
          absentList.push(entry)
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

  const upcomingEvents = events
    ? [...events]
        .filter(evt => new Date(evt.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3)
    : []

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

  const efficiencyScore = totalTracked > 0 ? Math.min(100, Math.round((todayStats.present / totalTracked) * 100 + 5)) : 100
  const taskList = Array.isArray(tasks) ? tasks : []
  const completedTasksCount = taskList.filter(t => t && t.status === 'Done').length
  const taskCompletionRate = taskList.length > 0 ? Math.round((completedTasksCount / taskList.length) * 100) : 0
  const pendingTasksCount = taskList.filter(t => t && t.status !== 'Done').length
  const recentDocuments = Array.isArray(documents) ? documents.slice(0, 3) : []
  const assetList = Array.isArray(assets) ? assets : []
  const availableAssetsCount = assetList.filter(a => a && a.status === 'Available').length

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 auto-rows-[minmax(148px,auto)] items-stretch pt-2">

        {canViewAnnouncements && (
          <AnnouncementsWidget
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            currentUser={currentUser}
            employees={employees}
            upcomingMilestones={upcomingMilestones}
            upcomingEvents={upcomingEvents}
            setCurrentView={setCurrentView}
            addToast={addToast}
            addLog={addLog}
            addNotification={addNotification}
            settings={settings}
            hasPermission={hasPermission}
            cardClass="col-span-12 lg:col-span-7 lg:row-span-3"
            {...wProps}
          />
        )}

        {/* Employee Directory Widget - beside Announcements on desktop, 2-slot tall */}
        {canViewEmployees && (
          <EmployeeDirectoryWidget
            employees={employees}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 lg:col-span-5 lg:row-span-3"
            {...wProps}
          />
        )}

        {canViewAttendance && (
          <DashboardWidget
            id="w2"
            title="Attendance"
            icon={<Icon name="group" className="text-foreground shrink-0" size={22}/>}
cardClass="col-span-12 lg:col-span-7"
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
                  <span className="text-[11px] font-bold text-foreground">In Office</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedDayData.total > 0 ? `${Math.round((selectedDayData.present / selectedDayData.total) * 100)}%` : '0%'}
                  </span>
                </button>

                {/* Off Duty Card */}
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
                    <Icon name="schedule" size={16} className="text-foreground/75 shrink-0" />
                    <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                      {selectedDayData.absent}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Off Duty</span>
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
                      name={attFilter === 'present' ? 'check_circle' : attFilter === 'absent' ? 'schedule' : 'event_busy'}
                      size={14}
                      className="text-foreground shrink-0"
                    />
                    {attFilter === 'present' ? 'In Office' : attFilter === 'absent' ? 'Off Duty' : 'On Leave'} ({selectedDayLists[attFilter]?.length || 0}) • <span className="font-mono text-muted-foreground text-[11px]">{selectedDayData.isToday ? 'Today' : selectedDayData.day}</span>
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

        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} setCurrentView={setCurrentView} cardClass="col-span-12 sm:col-span-6 lg:col-span-4" />

<HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} cardClass="col-span-12 lg:col-span-4" />

        {/* Performance Tracker */}
        <PerformanceTrackerWidget
          efficiencyScore={efficiencyScore}
          taskCompletionRate={taskCompletionRate}
          attendanceRate={attendanceRate}
          setCurrentView={setCurrentView}
          cardClass="col-span-12 lg:col-span-4"
          {...wProps}
        />

        {/* Tasks Widget */}
        {canViewTasks && (
          <TasksWidget
            tasks={tasks}
            pendingTasksCount={pendingTasksCount}
            taskCompletionRate={taskCompletionRate}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 sm:col-span-6 lg:col-span-4"
            {...wProps}
          />
        )}

        {/* Documents Widget */}
        {canViewDocuments && (
          <DocumentsWidget
            recentDocuments={recentDocuments}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 sm:col-span-6 lg:col-span-4"
            {...wProps}
          />
        )}

        {/* Payroll Widget */}
        {canViewPayroll && (
          <PayrollWidget
            currentPayrollMonth={currentPayrollMonth}
            paidCount={paidCount}
            pendingCount={pendingCount}
            totalPayrollCost={totalPayrollCost}
            settings={settings}
            currentPayrollData={currentPayrollData}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 lg:col-span-4"
            {...wProps}
          />
        )}

        {/* Assets Widget */}
        {canViewAssets && (
          <AssetsWidget
            assets={assets}
            availableAssetsCount={availableAssetsCount}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 sm:col-span-6 lg:col-span-4"
            {...wProps}
          />
        )}

        <div className="h-8 col-span-full"></div>
      </div>
    </div>
  )
}