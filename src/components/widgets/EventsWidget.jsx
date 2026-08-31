import { memo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Badge } from "@/components/ui/badge"
import { formatDate } from '../../services/date.js'
import { DashboardWidget } from '../Dashboard.jsx'

export const EventsWidget = memo(({ upcomingEvents, setCurrentView, ...wProps }) => (
  <DashboardWidget
    id="w6"
    title="Upcoming Events"
    icon={<Icon name="calendar_month" className="text-emerald-500 shrink-0" size={28}/>}
    cardClass="md:col-span-2 lg:col-span-2"
    action={<button onClick={() => setCurrentView && setCurrentView('calendar')} className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer">Events</button>}
    contentClass="flex flex-col justify-start gap-2.5 pt-4"
    {...wProps}
  >
    {upcomingEvents.length === 0 ? (
      <p className="text-center my-auto text-fluid-xs text-muted-foreground">No upcoming events</p>
    ) : (
      upcomingEvents.map((evt, idx) => (
        <div
          key={evt.id || idx}
          className="flex items-center gap-3 p-3 px-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-all cursor-pointer select-none active:scale-[0.99] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none"
          onClick={() => setCurrentView && setCurrentView('calendar')}
        >
          <Icon name="calendar_month" style={{ color: evt.type === 'holiday' ? '#10b981' : evt.type === 'birthday' ? '#f59e0b' : '#3b82f6' }} className="shrink-0" size={24}/>
          <div className="flex-1 min-w-0 pr-2">
            <p className="m-0 text-fluid-xs font-bold text-foreground break-words">{evt.title}</p>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-muted-foreground break-words">
              {formatDate(evt.date)}{evt.time ? ` at ${evt.time}` : ''}
            </p>
          </div>
          <Badge variant="outline" className="capitalize text-[10px] px-2 py-0.5 rounded-full">
            {evt.type}
          </Badge>
        </div>
      ))
    )}
  </DashboardWidget>
))

EventsWidget.displayName = 'EventsWidget'