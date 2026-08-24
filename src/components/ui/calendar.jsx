import React from 'react'
import { Calendar as AriaCalendar, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading, Button as AriaButton } from 'react-aria-components'
import Icon from "./Icon.jsx"
import { cn } from '@/lib/utils'

export function Calendar({ className, ...props }) {
  return (
    <AriaCalendar className={cn("w-fit", className)} {...props}>
      <header className="flex items-center justify-between px-1 pb-4 w-full">
        <AriaButton slot="previous" className="flex items-center justify-center size-8 rounded-md bg-transparent hover:bg-muted text-muted-foreground outline-none focus-visible:ring-2 ring-ring transition-colors cursor-pointer">
          <Icon name="chevron_left" size={16}/>
        </AriaButton>
        <Heading className="text-sm font-semibold tracking-tight text-foreground" />
        <AriaButton slot="next" className="flex items-center justify-center size-8 rounded-md bg-transparent hover:bg-muted text-muted-foreground outline-none focus-visible:ring-2 ring-ring transition-colors cursor-pointer">
          <Icon name="chevron_right" size={16}/>
        </AriaButton>
      </header>
      <CalendarGrid className="w-full border-collapse space-y-1">
        <CalendarGridHeader>
          {day => <CalendarHeaderCell className="text-xs font-medium text-muted-foreground w-9 h-9">{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {date => (
            <CalendarCell 
              date={date}
              className={({ isSelected, isOutsideVisibleRange, isDisabled }) => 
                cn(
                  "w-9 h-9 outline-none flex items-center justify-center rounded-xl text-sm font-semibold cursor-pointer transition-colors focus-visible:ring-2 ring-ring ring-offset-background",
                  isSelected ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:bg-muted text-foreground",
                  isOutsideVisibleRange ? "text-muted-foreground/40 opacity-40" :"",
                  isDisabled ? "opacity-30 cursor-not-allowed" :""
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}
