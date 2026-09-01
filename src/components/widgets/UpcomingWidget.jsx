import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from '../../services/date.js'
import { DashboardWidget } from '../Dashboard.jsx'

export const UpcomingWidget = memo(({ upcomingMilestones = [], upcomingEvents = [], setCurrentView, ...wProps }) => {
  const totalCount = upcomingMilestones.length + upcomingEvents.length

  return (
    <DashboardWidget
      id="w8"
      title="Upcoming"
      icon={<Icon name="event_upcoming" className="text-amber-500 shrink-0" size={22}/>}
      action={
        <div className="flex items-center gap-1.5">
          {upcomingEvents.length > 0 && (
            <button onClick={() => setCurrentView && setCurrentView('calendar')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Events</button>
          )}
        </div>
      }
      contentClass="flex flex-col justify-start pt-4"
      {...wProps}
    >
      {totalCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
          <Icon name="event_available" className="text-muted-foreground/40 mb-2" size={34}/>
          <p className="m-0 text-fluid-xs font-medium text-muted-foreground max-w-[240px] leading-relaxed">No birthdays, work anniversaries or upcoming events in the next 30 days.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Milestones (Birthdays & Work Anniversaries) */}
          {upcomingMilestones.map((milestone, i) => (
            <div key={`ms-${i}`} className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl liquid-widget-item">
              <Avatar className="size-8 shrink-0 rounded-xl ring-2 ring-primary/20">
                {milestone.avatar ? <AvatarImage src={milestone.avatar} alt={milestone.empName} className="object-cover" /> : null}
                <AvatarFallback className="bg-primary/10 text-primary rounded-xl font-bold"><Icon name="person" size={16}/></AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <p className="m-0 text-fluid-xs font-bold text-foreground break-words ">{milestone.empName}</p>
                <p className="m-0 text-[11px] font-medium text-muted-foreground break-words ">{milestone.label}</p>
              </div>
              <Badge variant="default" className="uppercase text-[10px] rounded-full px-2.5 py-0.5 shadow-xs font-bold shrink-0">
                {milestone.daysRemaining === 0 ? 'Today' : `${milestone.daysRemaining}d`}
              </Badge>
            </div>
          ))}

          {/* Upcoming Events */}
          {upcomingEvents.map((evt, idx) => (
            <div
              key={`ev-${evt.id || idx}`}
              className="flex items-center gap-3 p-2.5 px-3.5 rounded-2xl liquid-widget-item border-black/[0.06] dark:border-white/[0.08] cursor-pointer select-none active:scale-[0.99]"
              onClick={() => setCurrentView && setCurrentView('calendar')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentView && setCurrentView('calendar') } }}
            >
              <Icon name="calendar_month" style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} className="shrink-0" size={22}/>
              <div className="flex-1 min-w-0 pr-2">
                <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{evt.title}</p>
                <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">
                  {formatDate(evt.date)}{evt.time ? ` at ${evt.time}` : ''}
                </p>
              </div>
              <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 rounded-full shrink-0">
                {evt.type}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  )
})

UpcomingWidget.displayName = 'UpcomingWidget'