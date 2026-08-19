import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/20 text-primary hover:bg-primary/30 shadow-xs",
        secondary:
          "glass-badge text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive",
        outline: "border-white/40 dark:border-white/15 bg-white/20 dark:bg-white/5 text-foreground backdrop-blur-xs",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
