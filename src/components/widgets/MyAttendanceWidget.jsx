import { memo, useMemo, useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'
import { toLocal, parseMin } from '../../services/attendance.js'

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

  // Current live time to update real-time worked duration every second
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Today's punch log for current employee (automatically resets on a new date)
  const todayLog = attendance?.dailyLogs?.[todayStr]?.[empId] || {
    status: 'Off Duty',
    checkIn: '--',
    checkOut: '--',
    hours: '0.0'
  }

  // Check today's roster schedule for Off Day
  const todayShift = useMemo(() => {
    if (!Array.isArray(roster) || !empId) return null
    return roster.find(r => r.employeeId === empId && r.date === todayStr)
  }, [roster, empId, todayStr])

  const isOffDay = todayShift?.templateId === 'Off' || todayLog?.status === 'Day Off' || todayLog?.status === 'Off'

  // Format time with 0 instead of '--'
  const displayCheckIn = todayLog.checkIn && todayLog.checkIn !== '--' ? todayLog.checkIn : '0'
  const displayCheckOut = todayLog.checkOut && todayLog.checkOut !== '--' ? todayLog.checkOut : '0'

  // Real-time worked timer calculation (shows 0h 00m instead of '--')
  const workedDurationStr = useMemo(() => {
    if (!todayLog || !todayLog.checkIn || todayLog.checkIn === '--' || todayLog.checkIn === '0') {
      return '0h 00m'
    }

    const startMins = parseMin(todayLog.checkIn)
    if (startMins === null) return '0h 00m'

    // If already clocked out, show the finalized worked duration from checkIn to checkOut
    if (todayLog.checkOut && todayLog.checkOut !== '--' && todayLog.checkOut !== '0') {
      const endMins = parseMin(todayLog.checkOut)
      if (endMins !== null) {
        let diff = endMins - startMins
        if (diff < 0) diff += 1440
        const h = Math.floor(diff / 60)
        const m = diff % 60
        return `${h}h ${String(m).padStart(2, '0')}m`
      }
      if (todayLog.hours && todayLog.hours !== '0.0') {
        return `${todayLog.hours} hrs`
      }
      return '0h 00m'
    }

    // Active working session: timer updates dynamically in real-time
    const currentMins = now.getHours() * 60 + now.getMinutes()
    let elapsedMins = currentMins - startMins
    if (elapsedMins < 0) elapsedMins += 1440
    const h = Math.floor(elapsedMins / 60)
    const m = elapsedMins % 60
    return `${h}h ${String(m).padStart(2, '0')}m`
  }, [todayLog, now])

  // Monthly stats calculation (current calendar month)
  const currentMonthPrefix = todayStr.slice(0, 7) // "YYYY-MM"
  const monthlyStats = useMemo(() => {
    let presentDays = 0
    let lateDays = 0
    let noShowDays = 0
    let totalWorkHours = 0
    const dailyLogs = attendance?.dailyLogs || {}

    Object.entries(dailyLogs).forEach(([dateStr, dayObj]) => {
      if (!dateStr.startsWith(currentMonthPrefix)) return
      const log = dayObj?.[empId]
      if (!log) return

      const rawStatus = String(log.status || '').trim()
      const isPresent = rawStatus === 'In Office' || rawStatus === 'Remote' || rawStatus === 'On-Field' || rawStatus === 'Present'
      const isLate = rawStatus === 'Late' || log.isLate === true
      const isNoShow = rawStatus === 'No-Show' || rawStatus === 'No Show'

      if (isPresent || isLate) {
        presentDays++
      }
      if (isLate) {
        lateDays++
      }
      if (isNoShow) {
        noShowDays++
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

    return {
      presentDays,
      lateDays,
      noShowDays,
      leavesCount,
      totalWorkHours: totalWorkHours.toFixed(1)
    }
  }, [attendance, empId, currentMonthPrefix])

  // Leave policies & balances (remaining vs total quota)
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3 }
  const myBalance = attendance?.leaveBalances?.[empId] || defaultPolicies

  const leaveItems = useMemo(() => {
    return Object.keys(defaultPolicies).map(type => {
      const quota = defaultPolicies[type] ?? 0
      const remaining = myBalance[type] ?? quota
      const taken = Math.max(0, quota - remaining)
      return {
        type,
        quota,
        remaining,
        taken
      }
    })
  }, [defaultPolicies, myBalance])

  const isWorking = todayLog.checkIn !== '--' && todayLog.checkOut === '--'

  return (
    <DashboardWidget
      id="w2-employee"
      title="Attendance"
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
        {/* 1. Today's Punch & Realtime Worked Duration Banner */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              isWorking 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : todayLog.checkOut && todayLog.checkOut !== '--' && todayLog.checkOut !== '0'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : isOffDay
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-muted text-muted-foreground border border-border/40'
            }`}>
              <Icon name={isWorking ? 'login' : todayLog.checkOut && todayLog.checkOut !== '--' && todayLog.checkOut !== '0' ? 'task_alt' : isOffDay ? 'weekend' : 'schedule'} size={20} />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="text-sm sm:text-base font-bold text-foreground">
                  Clock In: <span className="font-mono text-muted-foreground font-semibold">{displayCheckIn}</span>
                </span>
                <span className="text-muted-foreground text-sm font-bold">•</span>
                <span className="text-sm sm:text-base font-bold text-foreground">
                  Clock Out: <span className="font-mono text-muted-foreground font-semibold">{displayCheckOut}</span>
                </span>
              </div>
              {isOffDay && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                  <Icon name="event_available" size={14} />
                  Off Day (Scheduled in Roster)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <Icon 
              name="timer" 
              size={18} 
              className={isWorking ? "text-emerald-500 animate-pulse" : "text-primary"} 
            />
            <span className="text-base sm:text-lg font-black text-foreground font-mono tabular-nums">
              {workedDurationStr}
            </span>
          </div>
        </div>

        {/* 2. Monthly 5-Metric Grid (Present, Late, No-Show, Leave, Hours) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {/* Present Days */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="check_circle" size={15} className="text-emerald-500 shrink-0" />
              <span className="text-fluid font-black text-foreground tabular-nums">
                {monthlyStats.presentDays}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Present</span>
            <span className="text-[9px] text-muted-foreground font-semibold">This Month</span>
          </div>

          {/* Late Count */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="history_toggle_off" size={15} className="text-amber-500 shrink-0" />
              <span className="text-fluid font-black text-foreground tabular-nums">
                {monthlyStats.lateDays}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Late</span>
            <span className="text-[9px] text-muted-foreground font-semibold">Arrivals</span>
          </div>

          {/* No Show Count */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="cancel" size={15} className="text-rose-500 shrink-0" />
              <span className="text-fluid font-black text-foreground tabular-nums">
                {monthlyStats.noShowDays}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">No Show</span>
            <span className="text-[9px] text-muted-foreground font-semibold">Absences</span>
          </div>

          {/* Leaves Taken */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="event_busy" size={15} className="text-blue-500 shrink-0" />
              <span className="text-fluid font-black text-foreground tabular-nums">
                {monthlyStats.leavesCount}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Leave</span>
            <span className="text-[9px] text-muted-foreground font-semibold">Days Taken</span>
          </div>

          {/* Total Worked Hours */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="timer" size={15} className="text-primary shrink-0" />
              <span className="text-fluid font-black text-foreground tabular-nums font-mono">
                {monthlyStats.totalWorkHours}
              </span>
            </div>
            <span className="text-[11px] font-bold text-foreground">Hours</span>
            <span className="text-[9px] text-muted-foreground font-semibold">Total Work</span>
          </div>
        </div>

        {/* 3. Leave Balance Cards (matching the top metric box style) */}
        <div className="flex flex-col gap-2 pt-1 border-t border-black/8 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Leave Balances (Remaining / Total)
            </span>
            <button
              type="button"
              onClick={() => setCurrentView && setCurrentView('leave')}
              className="apple-glass-btn text-xs font-semibold px-2.5 py-1 rounded-xl text-primary hover:text-primary/90 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Icon name="add" size={13} />
              <span>Apply</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {leaveItems.map((item) => (
              <div
                key={item.type}
                className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center"
              >
                <div className="flex items-baseline gap-1 mb-0.5 font-mono">
                  <span className="text-fluid font-black text-foreground tabular-nums">
                    {item.remaining}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold">
                    / {item.quota}d
                  </span>
                </div>
                <span className="text-[11px] font-bold text-foreground truncate max-w-full">
                  {item.type}
                </span>
                <span className="text-[9px] text-muted-foreground font-semibold">
                  {item.remaining > 0 ? `${item.remaining} remaining` : 'Exhausted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
})

MyAttendanceWidget.displayName = 'MyAttendanceWidget'
