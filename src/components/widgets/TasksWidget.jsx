import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'

export const TasksWidget = memo(({ tasks, pendingTasksCount, taskCompletionRate, setCurrentView, ...wProps }) => (
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
            <p className="text-fluid-sm font-medium text-foreground break-words flex-1 m-0">{t.title}</p>
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
))

TasksWidget.displayName = 'TasksWidget'