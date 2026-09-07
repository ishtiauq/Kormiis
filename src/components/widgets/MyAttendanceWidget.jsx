import { memo, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'
import { toLocal } from '../../services/attendance.js'
import { formatDateShort } from '../../services/date.js'

export const MyAttendanceWidget = memo(({
  currentUser,
  attendance,
  roster = [],
  shiftTemplates = [],
  settings,
  setCurrentView,
  cardClass = '',
  ...wProps
}) => {
  const empId = currentUser?.employeeId || currentUser?.id
  const todayStr = toLocal(new Date())

  // Today's log for current employee
  const todayLog = attendance?.dailyLogs?.[todayStr]?.[empId] || {
    status: 'Off Duty',
    checkIn: '--',
    checkOut: '--',
    hours: '0.0'
  }

  // Monthly stats calculation (current calendar month)
  const currentMonthPrefix = todayStr.slice(0, 7) // "YYYY-MM"
  const monthlyStats = useMemo(() => {
    let presentDays = 0
    let lateDays = 0
    let totalWorkHours = 0
    const dailyLogs = attendance?.dailyLogs || {}

    Object.entries(dailyLogs).forEach(([dateStr, dayObj]) => {
      if (!dateStr.startsWith(currentMonthPrefix)) return
      const log = dayObj?.[empId]
      if (!log) return

      const rawStatus = String(log.status || '').trim()
      const isPresent = rawStatus === 'In Office' || rawStatus === 'Remote' || rawStatus === 'On-Field' || rawStatus === 'Present'
      const isLate = rawStatus === 'Late' || log.isLate === true

      if (isPresent || isLate) {
        presentDays++
      }
      if (isLate) {
        lateDays++
      }
      const hrs = parseFloat(log.hours || 0)
      if (!isNaN(hrs) && hrs > 0) {
        totalWorkHours += hrs
      }
    })

    // Leaves taken in this month
    const leaves = Array.isArray(attendance?.leaves) ? attendance.leaves : []
    const approvedMyLeaves = leaves.filter(l => 
      l && l.employeeId === empId && l.status === 'Approved' &&
      (l.startDate?.startsWith(currentMonthPrefix) || l.endDate?.startsWith(currentMonthPrefix))
    )
    const leavesCount = approvedMyLeaves.reduce((sum, l) => sum + (Number(l.days) || 1), 0)

    // Current day of month as elapsed working baseline
    const dayOfMonth = new Date().getDate()
    const workingDaysPassed = Math.max(1, Math.min(dayOfMonth, 22))
    const attendanceRate = Math.min(100, Math.round((presentDays / workingDaysPassed) * 100))

    return {
      presentDays,
      lateDays,
      totalWorkHours: totalWorkHours.toFixed(1),
      leavesCount,
      attendanceRate
    }
  }, [attendance, empId, currentMonthPrefix])

  // Leave balance summary
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3 }
  const myBalance = attendance?.leaveBalances?.[empId] || defaultPolicies

  // Upcoming shift / schedule today
  const upcomingShift = useMemo(() => {
    if (!Array.isArray(roster) || !empId) return null
    const shift = roster.find(r => r.employeeId === empId && r.date === todayStr)
    if (!shift) return null
    const template = shiftTemplates?.find(t => t.id === shift.templateId)
    return {
      name: template?.name || 'Regular Shift',
      start: template?.start || '09:00',
      end: template?.end || '18:00',
      color: template?.color || '#3b82f6'
    }
  }, [roster, empId, todayStr, shiftTemplates])

  return (
    <DashboardWidget
      id="w2-employee"
      title="My Attendance"
      icon={<Icon name="schedule" className="text-foreground shrink-0" size={22} />}
      cardClass={`!h-auto min-h-0 ${cardClass}`}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setCurrentView && setCurrentView('attendance')}
            className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0"
          >
            My Logs
          </button>
        </div>
      }
      contentClass="flex flex-col justify-between pt-1 min-h-0"
      {...wProps}
    >
      <div className="flex flex-col gap-3 py-1">
        {/* 1. Today's Punch & Shift Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              todayLog.checkIn !== '--' 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-muted text-muted-foreground border border-border/40'
            }`}>
              <Icon name={todayLog.checkIn !== '--' ? 'login' : 'schedule'} size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                Today: {todayLog.status || 'Off Duty'}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono truncate">
                In: {todayLog.checkIn} • Out: {todayLog.checkOut}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pl-2">
            <span className="text-xs font-bold text-foreground font-mono">
              {todayLog.hours > 0 ? `${todayLog.hours} hrs` : '--'}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {upcomingShift ? `${upcomingShift.start} - ${upcomingShift.end}` : 'Standard Shift'}
            </span>
          </div>
        </div>

        {/* 2. Monthly 4-Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {/* Present Days */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="check_circle" size={16} className="text-emerald-500 shrink-0" />
              <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                {monthlyStats.presentDays}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Present</span>
            <span className="text-[10px] text-muted-foreground font-semibold">This Month</span>
          </div>

          {/* Late Count */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="history_toggle_off" size={16} className="text-amber-500 shrink-0" />
              <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                {monthlyStats.lateDays}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Late</span>
            <span className="text-[10px] text-muted-foreground font-semibold">Arrivals</span>
          </div>

          {/* Leaves Taken */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="event_busy" size={16} className="text-foreground/75 shrink-0" />
              <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums">
                {monthlyStats.leavesCount}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Leave</span>
            <span className="text-[10px] text-muted-foreground font-semibold">Days Taken</span>
          </div>

          {/* Total Worked Hours */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="timer" size={16} className="text-primary shrink-0" />
              <span className="text-fluid-lg sm:text-fluid-xl font-black text-foreground tabular-nums font-mono">
                {monthlyStats.totalWorkHours}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Hours</span>
            <span className="text-[10px] text-muted-foreground font-semibold">Total Work</span>
          </div>
        </div>

        {/* 3. Leave Balance Quick-Glance & Direct Action */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Leave Balances:
            </span>
            {Object.entries(myBalance).slice(0, 3).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-[11px] px-2 py-0.5 rounded-lg border-black/10 dark:border-white/12 font-medium">
                {type}: <span className="font-bold font-mono ml-1 text-foreground">{count}d</span>
              </Badge>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentView && setCurrentView('leave')}
            className="apple-glass-btn text-xs font-semibold px-3 py-1 rounded-xl text-primary hover:text-primary/90 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Icon name="add" size={14} />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </DashboardWidget>
  )
})

MyAttendanceWidget.displayName = 'MyAttendanceWidget'
