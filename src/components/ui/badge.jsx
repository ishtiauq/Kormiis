import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "border-black/20 dark:border-white/25 bg-black/15 dark:bg-white/20 text-foreground hover:bg-black/20 dark:hover:bg-white/25 shadow-xs",
        secondary:
          "glass-badge text-foreground",
        destructive:
          "border-black/25 dark:border-white/30 bg-black/20 dark:bg-white/25 text-foreground font-bold",
        outline: "border-black/15 dark:border-white/15 bg-transparent text-foreground backdrop-blur-xs",
        success:
          "border-black/15 dark:border-white/20 bg-black/10 dark:bg-white/15 text-foreground",
        warning:
          "border-black/15 dark:border-white/20 bg-black/10 dark:bg-white/15 text-foreground",
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
