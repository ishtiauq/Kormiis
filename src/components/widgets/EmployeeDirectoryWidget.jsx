import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'

export const EmployeeDirectoryWidget = memo(({ activeCount, inactiveCount, setCurrentView, ...wProps }) => (
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
))

EmployeeDirectoryWidget.displayName = 'EmployeeDirectoryWidget'