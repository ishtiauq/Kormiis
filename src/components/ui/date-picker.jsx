import React from 'react'
import { DatePicker as AriaDatePicker, Group, DateInput, DateSegment, Dialog, Popover as AriaPopover, Button as AriaButton } from 'react-aria-components'
import Icon from "./Icon.jsx"
import { Calendar } from './calendar'
import { parseDate } from '@internationalized/date'
import { cn } from '@/lib/utils'

export function DatePicker({ label, value, onChange, className, required, ...props }) {
  // Safe parsing of YYYY-MM-DD
  let parsedValue = null
  try {
    if (typeof value === 'string' && value.length === 10) {
      parsedValue = parseDate(value)
    }
  } catch(e) {}
  
  return (
    <AriaDatePicker 
      className={cn("flex flex-col gap-1.5 w-full", className)}
      value={parsedValue}
      onChange={(date) => onChange ? onChange({ target: { value: date ? date.toString() : '' } }) : null}
      isRequired={required}
      {...props}
    >
      {label && <label className="text-xs font-semibold text-foreground">{label}</label>}
      <Group className="flex h-10 w-full items-center rounded-xl border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all cursor-text">
        <DateInput className="flex flex-1 items-center px-3 gap-0.5 outline-none bg-transparent h-full">
          {segment => (
            <DateSegment segment={segment} className="px-0.5 tabular-nums focus:bg-primary focus:text-primary-foreground rounded-sm outline-none caret-transparent" />
          )}
        </DateInput>
        <AriaButton className="pr-3 pl-2 h-full flex items-center justify-center outline-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <Icon name="calendar_month" size={16}/>
        </AriaButton>
      </Group>
      <AriaPopover className="z-50 animate-in fade-in-0 zoom-in-95 origin-top rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl p-0 overflow-hidden" offset={8}>
        <Dialog className="outline-none flex flex-col rounded-2xl p-4 bg-popover text-popover-foreground border-none">
          <Calendar />
        </Dialog>
      </AriaPopover>
    </AriaDatePicker>
  )
}
