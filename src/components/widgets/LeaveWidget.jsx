import { memo, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'

export const LeaveWidget = memo(({
  currentUser,
  attendance,
  settings,
  setCurrentView,
  cardClass = '',
  ...wProps
}) => {
  const empId = currentUser?.employeeId || currentUser?.id

  // Leave policies & balances (remaining vs total quota)
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3 }
  const myBalance = attendance?.balances?.[empId] || defaultPolicies

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

  // Total remaining and total quota
  const totalRemaining = leaveItems.reduce((acc, curr) => acc + curr.remaining, 0)
  const totalQuota = leaveItems.reduce((acc, curr) => acc + curr.quota, 0)

  // Recent leave requests submitted by this employee
  const recentLeaves = useMemo(() => {
    const list = Array.isArray(attendance?.leaves) ? attendance.leaves : []
    return list
      .filter(l => l && (l.employeeId === empId || l.employeeId === currentUser?.id))
      .slice(0, 2)
  }, [attendance?.leaves, empId, currentUser?.id])

  return (
    <DashboardWidget
      id="leave-widget"
      title="Leaves & Balances"
      icon={<Icon name="event_busy" className="text-blue-500 shrink-0" size={22}/>}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setCurrentView && setCurrentView('leave')}
            className="apple-glass-btn text-xs font-semibold px-3 h-7 rounded-full text-primary hover:text-primary/90 flex items-center gap-1 cursor-pointer"
          >
            <Icon name="add" size={14} />
            <span>Apply</span>
          </button>
        </div>
      }
      cardClass={cardClass}
      contentClass="flex flex-col justify-between p-3 sm:p-4 gap-3.5"
      {...wProps}
    >
      {/* 1. Header Overview: Total remaining vs total allocated */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Icon name="beach_access" size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground">Available Time Off</span>
            <span className="text-[11px] font-medium text-muted-foreground">Annual quota balance</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-fluid-xl font-black text-foreground tabular-nums">{totalRemaining}</span>
          <span className="text-xs font-bold text-muted-foreground">/ {totalQuota}d</span>
        </div>
      </div>

      {/* 2. Leave Policy Quota Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {leaveItems.map((item) => (
          <div
            key={item.type}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center"
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
            <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">
              {item.remaining > 0 ? `${item.remaining} left` : 'Exhausted'}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Recent Leave Activity or Status */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Recent Requests
        </span>
        {recentLeaves.length === 0 ? (
          <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-muted/20 border border-border/30 text-fluid-xs text-muted-foreground">
            <span>No pending or recent leave requests.</span>
            <Icon name="verified" size={15} className="text-emerald-500/80 shrink-0" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {recentLeaves.map((l, i) => (
              <div key={l.id || i} className="flex items-center justify-between p-2 px-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 text-fluid-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-foreground truncate">{l.leaveType || l.type || 'Leave'}</span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono">({l.startDate} to {l.endDate})</span>
                </div>
                <Badge
                  variant={l.status === 'Approved' ? 'secondary' : l.status === 'Rejected' ? 'destructive' : 'outline'}
                  className={`text-[10px] rounded-full px-2 py-0.5 font-semibold capitalize shrink-0 ${
                    l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''
                  }`}
                >
                  {l.status || 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardWidget>
  )
})

LeaveWidget.displayName = 'LeaveWidget'
