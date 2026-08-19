import React from "react"
import { TextField as AriaTextField, Input as AriaInput, Label as AriaLabel, FieldError as AriaFieldError } from "react-aria-components"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

const TextField = ({ className, label, error, ...props }) => {
  return (
    <AriaTextField className={cn("flex flex-col gap-2", className)} {...props}>
      {label && <AriaLabel className="text-xs font-semibold text-foreground tracking-wide">{label}</AriaLabel>}
      <AriaInput className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground disabled:opacity-50" />
      {error && <AriaFieldError className="text-[11px] font-semibold text-destructive mt-0.5">{error}</AriaFieldError>}
    </AriaTextField>
  )
}

export { Input, TextField }
