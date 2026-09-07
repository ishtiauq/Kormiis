import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { DashboardWidget } from '../Dashboard.jsx'

export const PerformanceTrackerWidget = memo(({ efficiencyScore, taskCompletionRate, attendanceRate, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="perf-widget"
    title="Performance Tracker"
    icon={<Icon name="insights" className="text-primary shrink-0" size={22}/>}
    action={<button onClick={() => setCurrentView && setCurrentView('performance')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Details</button>}
    {...wProps}
  >
    <div className="flex flex-col gap-4 justify-center h-full pt-1">
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-end">
          <span className="text-xs font-semibold text-muted-foreground">
            Workforce Efficiency
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">{efficiencyScore}%</span>
        </div>
        <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${efficiencyScore}%` }}></div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-end">
          <span className="text-xs font-semibold text-muted-foreground">
            Task Completion
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">{taskCompletionRate}%</span>
        </div>
        <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-end">
          <span className="text-xs font-semibold text-muted-foreground">
            Attendance Rate
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">{attendanceRate}%</span>
        </div>
        <div className="w-full bg-black/[0.06] dark:bg-white/10 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }}></div>
        </div>
      </div>
    </div>
  </DashboardWidget>
))

PerformanceTrackerWidget.displayName = 'PerformanceTrackerWidget'