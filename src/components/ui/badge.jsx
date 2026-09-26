import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "border-border bg-[#f5f5f7] dark:bg-[#2c2c2e] text-foreground hover:bg-[#ececef] dark:hover:bg-[#333338] shadow-xs",
        secondary:
          "glass-badge text-foreground",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400 dark:bg-red-500/20 dark:border-red-500/35 font-bold",
        outline: "border-border bg-card text-foreground",
        success:
          "border-border bg-[#f5f5f7] dark:bg-[#2c2c2e] text-foreground",
        warning:
          "border-border bg-[#f5f5f7] dark:bg-[#2c2c2e] text-foreground",
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
