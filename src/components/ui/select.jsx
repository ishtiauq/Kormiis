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
      <AriaButton className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-transparent px-4 py-2.5 text-xs sm:text-sm shadow-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
        <SelectValue className="text-left break-words">
          {({ defaultChildren, isPlaceholder }) =>
            isPlaceholder ? <span className="text-muted-foreground font-normal text-xs sm:text-sm">{placeholder || 'Select...'}</span> : defaultChildren
          }
        </SelectValue>
        <Icon name="keyboard_arrow_down" className="shrink-0 text-muted-foreground opacity-50" size={16}/>
      </AriaButton>
      <AriaPopover 
        UNSTABLE_portalContainer={typeof window !== 'undefined' ? document.body : undefined}
        className="z-[9999] w-[--trigger-width] rounded-2xl border border-border glass-popover p-1.5 text-popover-foreground shadow-2xl overflow-hidden"
      >
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
      "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-xs sm:text-sm text-foreground outline-none hover:bg-white/15 dark:hover:bg-white/10 data-[selected]:bg-primary data-[selected]:text-primary-foreground transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </AriaListBoxItem>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectItem }
