import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DashboardWidget } from '../Dashboard.jsx'

export const MilestonesWidget = memo(({ upcomingMilestones, setCurrentView, ...wProps }) => (
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
              <p className="m-0 text-fluid-xs font-bold text-foreground break-words ">{milestone.empName}</p>
              <p className="m-0 text-[11px] font-medium text-muted-foreground break-words ">{milestone.label}</p>
            </div>
            <Badge variant="default" className="uppercase text-[10px] rounded-full px-2.5 py-0.5 shadow-xs font-bold">
              {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
            </Badge>
          </div>
        ))}
      </div>
    )}
  </DashboardWidget>
))

MilestonesWidget.displayName = 'MilestonesWidget'