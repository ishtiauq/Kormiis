import { useState, useMemo, memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { formatDateShort } from '../services/date.js'
import { normalizeAttendanceStatus, addDays } from '../services/attendance.js'
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
      <CardHeader className="flex-row items-center justify-between px-3.5 sm:px-4 pt-3.5 pb-2.5 space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
            {icon}
          </div>
          <CardTitle className="text-fluid font-bold tracking-tight text-foreground m-0 leading-snug break-words">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className={`flex-1 ${contentClass} p-2.5 sm:p-3`}>
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
        <span className="text-[10px] text-muted-foreground break-words ">{emp.sub || emp.role || 'Teammate'}</span>
      </div>
    </div>
    {emp.time ? (
      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
        emp.isLate
          ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25'
          : 'text-foreground bg-emerald-500/10 border-emerald-500/20'
      }`}>
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

const VirtualizedList = memo(({ items, filter, className = 'max-h-36' }) => {
  if (!items?.length) return (
    <p className="text-center py-3 text-xs text-muted-foreground">
      No teammates in this category.
    </p>
  )
  
  return (
    <div className={`${className} overflow-y-auto pr-1 flex flex-col divide-y divide-border/40 dark:divide-white/6`}>
      {items.map((emp) => (
        <EmployeeRow key={emp.id} emp={emp} />
      ))}
    </div>
  )
})

VirtualizedList.displayName = 'VirtualizedList'

export default function Dashboard({ employees, onSync, attendance, setAttendance, currentUser, addToast, setCurrentView, announcements, setAnnouncements, addLog, addNotification, events, setEvents, payroll, isSidebarCollapsed, hasPermission, tasks = [], documents = [], assets = [], settings, notes = [], setNotes, roster = [] }) {
  const [expandedWidgets, setExpandedWidgets] = useState([])
  const [attDialog, setAttDialog] = useState(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(6)

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

  const activeEmps = useMemo(() => employees.filter(e => e.status !== 'Terminated'), [employees])

  const weekDays = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      out.push({ day: days[d.getDay()], date: d.toISOString().split('T')[0], isToday: i === 0 })
    }
    return out
  }, [])

  const selectedDay = weekDays[selectedDayIndex] || weekDays[6]
  const selectedIso = selectedDay.date
  const isTodaySelected = selectedIso === weekDays[6].date
  const selectedDayLabel = isTodaySelected ? 'Today' : formatDateShort(selectedIso)

  const rosterForDay = useMemo(
    () => (Array.isArray(roster) ? roster.filter(r => r && r.date === selectedIso) : []),
    [roster, selectedIso]
  )

  const leavesOnDay = useMemo(() => {
    const ls = Array.isArray(attendance?.leaves) ? attendance.leaves : []
    return ls.filter(l => l && l.status === 'Approved' && l.startDate && l.endDate && l.startDate <= selectedIso && l.endDate >= selectedIso)
  }, [attendance, selectedIso])

  const leaveIdsOnDay = useMemo(() => new Set(leavesOnDay.map(l => l.employeeId)), [leavesOnDay])

  const expectedIds = useMemo(() => {
    if (rosterForDay.length === 0) return new Set()
    const activeIds = new Set(activeEmps.map(e => e.id))
    return new Set(
      rosterForDay
        .filter(r => r.templateId !== 'Off' && activeIds.has(r.employeeId) && !leaveIdsOnDay.has(r.employeeId))
        .map(r => r.employeeId)
    )
  }, [rosterForDay, activeEmps, leaveIdsOnDay])

  const hasRoster = rosterForDay.length > 0
  const expectedCount = expectedIds.size

  const dayEntries = useMemo(() => {
    const entries = new Map()
    const dayLogs = attendance?.dailyLogs?.[selectedIso] || {}
    activeEmps.forEach(emp => {
      const log = dayLogs[emp.id]
      const designation = emp.designation && emp.designation.toLowerCase() !== 'teammate' ? emp.designation : (emp.role && emp.role.toLowerCase() !== 'teammate' ? emp.role : '')
      const rawS = String(log?.status || '').trim()
      const normS = normalizeAttendanceStatus(rawS)
      const isLate = rawS === 'Late' || log?.isLate === true
      const arrived = normS === 'In Office' || normS === 'Remote' || normS === 'On-Field'
      const isLeave = normS === 'On Leave' || emp.status === 'On Leave' || leaveIdsOnDay.has(emp.id)
      entries.set(emp.id, {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        role: designation,
        designation,
        time: log?.checkIn || null,
        isLate,
        arrived,
        isLeave,
        sub: null,
        status: isLate ? 'Late' : (normS || (emp.status === 'On Leave' ? 'On Leave' : 'Off Duty'))
      })
    })
    return entries
  }, [activeEmps, attendance, selectedIso, leaveIdsOnDay])

  const buckets = useMemo(() => {
    const inOffice = []
    const noShow = []
    const offDuty = []
    const onLeave = []
    dayEntries.forEach(entry => {
      if (entry.isLeave) {
        const leave = leavesOnDay.find(l => l.employeeId === entry.id)
        const days = Number(leave?.days) || 1
        onLeave.push({
          ...entry,
          sub: leave ? `${leave.type || leave.leaveType || 'Leave'} • ${days} day${days > 1 ? 's' : ''} • back ${formatDateShort(addDays(leave.endDate, 1))}` : null
        })
      } else if (entry.arrived) {
        inOffice.push(entry)
      } else if (expectedIds.has(entry.id)) {
        noShow.push(entry)
      } else {
        offDuty.push(entry)
      }
    })
    return { inOffice, noShow, offDuty, onLeave }
  }, [dayEntries, leavesOnDay, expectedIds])

  const arrivedCount = buckets.inOffice.length
  const noShowCount = buckets.noShow.length
  const offDutyCount = buckets.offDuty.length
  const onLeaveCount = buckets.onLeave.length
  const lateCount = useMemo(() => {
    let c = 0
    dayEntries.forEach(e => { if (e.isLate) c++ })
    return c
  }, [dayEntries])

  const rate = expectedCount > 0 ? Math.round((arrivedCount / expectedCount) * 100) : 0
  const totalTracked = arrivedCount + noShowCount + offDutyCount + onLeaveCount
  const attendanceRate = hasRoster ? rate : (totalTracked > 0 ? Math.round((arrivedCount / totalTracked) * 100) : 0)
  const efficiencyScore = totalTracked > 0 ? Math.min(100, Math.round((arrivedCount / totalTracked) * 100 + 5)) : 100

  const perDayArrived = useMemo(() => {
    const counts = {}
    weekDays.forEach(d => {
      const logs = attendance?.dailyLogs?.[d.date] || {}
      let c = 0
      activeEmps.forEach(emp => {
        const log = logs[emp.id]
        if (!log) return
        const normS = normalizeAttendanceStatus(String(log.status || '').trim())
        if (normS === 'In Office' || normS === 'Remote' || normS === 'On-Field') c++
      })
      counts[d.date] = c
    })
    return counts
  }, [weekDays, attendance, activeEmps])

  const filteredList = attDialog ? buckets[attDialog] || [] : []

  const attDialogMeta = {
    inOffice: { title: 'In Office', icon: 'check_circle' },
    noShow: { title: 'No-Show', icon: 'cancel' },
    offDuty: { title: 'Off Duty', icon: 'schedule' },
    onLeave: { title: 'On Leave', icon: 'event_busy' }
  }

  const pendingLeaves = useMemo(() => {
    const leaves = Array.isArray(attendance?.leaves) ? attendance.leaves : []
    return leaves
      .filter(l => l && l.status === 'Pending')
      .map(l => {
        const emp = employees.find(e => e.id === l.employeeId)
        return {
          ...l,
          type: l.type || l.leaveType || 'Leave',
          name: l.employeeName || emp?.name || 'Team member'
        }
      })
      .sort((a, b) => new Date(a.startDate || a.appliedOn || 0) - new Date(b.startDate || b.appliedOn || 0))
  }, [attendance, employees])

  const pendingPreview = pendingLeaves.slice(0, 2).map(l => `${l.name} — ${l.type}`).join(' • ')

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

        {/* Column 1: Catch Up (Announcements, Notice & Events) */}
        {canViewAnnouncements && (
          <AnnouncementsWidget
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            currentUser={currentUser}
            employees={employees}
            upcomingMilestones={upcomingMilestones}
            upcomingEvents={upcomingEvents}
            events={events}
            setEvents={setEvents}
            setCurrentView={setCurrentView}
            addToast={addToast}
            addLog={addLog}
            addNotification={addNotification}
            settings={settings}
            hasPermission={hasPermission}
            cardClass="col-span-12 lg:col-span-4 h-full"
            {...wProps}
          />
        )}

        {/* Column 2: Middle Stacked Column — Attendance (top) & Performance Tracker (bottom) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 sm:gap-5 lg:gap-6 justify-between">
          {canViewAttendance && (
            <DashboardWidget
              id="w2"
              title="Attendance"
              icon={<Icon name="group" className="text-foreground shrink-0" size={22}/>}
              cardClass="!h-auto min-h-0"
              action={
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setCurrentView && setCurrentView('attendance')}
                    className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0"
                  >
                    Roll Call
                  </button>
                </div>
              }
              contentClass="flex flex-col justify-between pt-1 min-h-0"
              {...wProps}
            >
              {/* ================= 7-DAY TREND + TODAY BREAKDOWN ================= */}
              <div className="flex flex-col gap-3 py-1">
                {/* 1. Top: 7-Day Interactive Day Selector */}
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Last 7 Days
                    </span>
                    <span className="text-[11px] font-bold text-foreground font-mono">
                      {selectedDayLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
                    {weekDays.map((item, idx) => {
                      const isSelected = selectedDayIndex === idx
                      const dayNum = item.date ? item.date.split('-')[2] : ''
                      return (
                        <button
                          key={item.date || idx}
                          type="button"
                          onClick={() => {
                            setSelectedDayIndex(idx)
                            setAttDialog(null)
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
                            className={`size-1.5 rounded-full mt-1.5 ${
                              isSelected
                                ? ''
                                : perDayArrived[item.date] > 0
                                  ? 'bg-emerald-500/80'
                                  : 'bg-foreground/20'
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Present Rate Progress Bar */}
                <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                      {selectedDayLabel} • {hasRoster ? `${rate}% present` : 'No roster'}
                    </span>
                    {lateCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shrink-0">
                        <Icon name="schedule" size={12} className="shrink-0" />
                        {lateCount} late
                      </span>
                    )}
                  </div>

                  {hasRoster ? (
                    <>
                      <div className="h-2.5 rounded-full bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/80 transition-all duration-500"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>{arrivedCount} of {expectedCount} expected</span>
                        <span className="font-bold text-foreground tabular-nums">{rate}%</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      No roster for this day — assign shifts to track presence.
                    </p>
                  )}
                </div>

                {/* 3. Today Status Cards (4-Column Grid) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  {/* In Office Card */}
                  <button
                    type="button"
                    onClick={() => setAttDialog('inOffice')}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="check_circle" size={16} className="text-foreground shrink-0" />
                      <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                        {arrivedCount}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">In Office</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {hasRoster ? `${rate}% of roster` : '—'}
                    </span>
                  </button>

                  {/* No-Show Card */}
                  <button
                    type="button"
                    onClick={() => setAttDialog('noShow')}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden bg-rose-500/[0.05] dark:bg-rose-500/[0.08] border border-rose-500/15 dark:border-rose-500/20 hover:bg-rose-500/[0.1] dark:hover:bg-rose-500/[0.14]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="cancel" size={16} className="text-rose-500/90 shrink-0" />
                      <span className="text-fluid-lg sm:text-fluid-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {noShowCount}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">No-Show</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {hasRoster && expectedCount > 0 ? `${Math.round((noShowCount / expectedCount) * 100)}% of roster` : '—'}
                    </span>
                  </button>

                  {/* Off Duty Card */}
                  <button
                    type="button"
                    onClick={() => setAttDialog('offDuty')}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="schedule" size={16} className="text-foreground/75 shrink-0" />
                      <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                        {offDutyCount}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">Off Duty</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Not on roster
                    </span>
                  </button>

                  {/* On Leave Card */}
                  <button
                    type="button"
                    onClick={() => setAttDialog('onLeave')}
                    className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer select-none text-center relative overflow-hidden bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="event_busy" size={16} className="text-foreground/75 shrink-0" />
                      <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                        {onLeaveCount}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">On Leave</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Approved
                    </span>
                  </button>
                </div>

                {/* 3. Pending Leave Banner */}
                {pendingLeaves.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentView && setCurrentView('leaves')}
                    className="flex items-center gap-2.5 w-full p-3 rounded-2xl bg-amber-500/[0.08] dark:bg-amber-500/[0.1] border border-amber-500/25 hover:bg-amber-500/[0.14] transition-all cursor-pointer text-left"
                  >
                    <span className="shrink-0 size-8 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/25">
                      <Icon name="event_busy" size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-foreground">
                        {pendingLeaves.length} pending leave{pendingLeaves.length > 1 ? 's' : ''}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {pendingPreview}
                      </span>
                    </span>
                    <Icon name="chevron_right" size={16} className="text-muted-foreground shrink-0" />
                  </button>
                )}
              </div>
            </DashboardWidget>
          )}

          {/* Performance Tracker (stacked beneath Attendance) */}
          <PerformanceTrackerWidget
            efficiencyScore={efficiencyScore}
            taskCompletionRate={taskCompletionRate}
            attendanceRate={attendanceRate}
            setCurrentView={setCurrentView}
            cardClass="!h-auto min-h-0"
            {...wProps}
          />
        </div>

        {/* Column 3: Team Directory Widget */}
        {canViewEmployees && (
          <EmployeeDirectoryWidget
            employees={employees}
            setCurrentView={setCurrentView}
            cardClass="col-span-12 lg:col-span-4 h-full"
            {...wProps}
          />
        )}

        <DailyChecklistWidget notes={notes} setNotes={setNotes} ownerId={currentUser?.id || currentUser?.uid || ''} setCurrentView={setCurrentView} cardClass="col-span-12 sm:col-span-6 lg:col-span-4" />

        <HrOverview adminUid={currentUser?.uid} currentUser={currentUser} setCurrentView={setCurrentView} addToast={addToast} cardClass="col-span-12 lg:col-span-4" />

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

      {/* Attendance Category Popup */}
      <Dialog open={attDialog !== null} onOpenChange={(open) => { if (!open) setAttDialog(null) }}>
        <DialogContent className="max-w-sm relative">
          <button
            type="button"
            onClick={() => setAttDialog(null)}
            aria-label="Close attendance popup"
            className="absolute top-4 right-4 size-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/10 transition-colors cursor-pointer z-10"
          >
            <Icon name="close" size={18} className="shrink-0" />
          </button>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon
                name={attDialog ? attDialogMeta[attDialog]?.icon || 'group' : 'group'}
                size={18}
                className="text-foreground shrink-0"
              />
              {attDialog ? attDialogMeta[attDialog]?.title || 'Attendance' : 'Attendance'}
              <span className="text-muted-foreground font-semibold">
                ({filteredList.length})
              </span>
            </DialogTitle>
            <DialogDescription>{selectedDayLabel} • {arrivedCount} present</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {filteredList.length > 0 ? (
              <VirtualizedList items={filteredList} className="max-h-[55vh]" />
            ) : (
              <p className="text-center py-8 text-xs text-muted-foreground">
                No one in this category today.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}