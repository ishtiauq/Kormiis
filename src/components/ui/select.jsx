import React from "react"
import { Select as AriaSelect, Label as AriaLabel, Button as AriaButton, SelectValue, Popover as AriaPopover, ListBox as AriaListBox, ListBoxItem as AriaListBoxItem } from "react-aria-components"
import Icon from "./Icon.jsx"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, label, error, placeholder, children, value, onValueChange, onChange, ...props }, ref) => {
  return (
    <AriaSelect 
      ref={ref}
      selectedKey={value !== undefined ? value : null} 
      onSelectionChange={onValueChange || onChange} 
      className={cn("flex flex-col gap-1.5", className)} 
      {...props}
    >
      {label && <AriaLabel className="text-xs font-bold text-foreground">{label}</AriaLabel>}
      <AriaButton className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
        <SelectValue className="text-left break-words">
          {({ defaultChildren, isPlaceholder }) =>
            isPlaceholder ? <span className="text-muted-foreground font-normal text-xs sm:text-sm">{placeholder || 'Select...'}</span> : defaultChildren
          }
        </SelectValue>
        <Icon name="keyboard_arrow_down" className="shrink-0 text-muted-foreground opacity-50" size={16}/>
      </AriaButton>
      <AriaPopover className="z-50 w-[--trigger-width] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
        <AriaListBox className="outline-none max-h-60 overflow-y-auto">
          {children}
        </AriaListBox>
      </AriaPopover>
    </AriaSelect>
  )
})
Select.displayName = "Select"

const SelectItem = React.forwardRef(({ className, children, value, id, textValue, ...props }, ref) => (
  <AriaListBoxItem
    ref={ref}
    id={value || id}
    textValue={textValue || (typeof children === 'string' ? children : undefined)}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none hover:bg-accent hover:text-accent-foreground data-[selected]:bg-accent data-[selected]:text-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </AriaListBoxItem>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectItem }
