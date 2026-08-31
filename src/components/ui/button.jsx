import { cva } from "class-variance-authority";
import { Button as ButtonPrimitive, Link as LinkPrimitive } from "react-aria-components";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "glass-kormiis group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap outline-none select-none transition-all duration-300 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white border border-white/20 hover:brightness-105 active:brightness-95",
        outline:
          "border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10",
        secondary:
          "border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10",
        ghost:
          "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/10 text-foreground",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 active:bg-rose-500/30",
        link: "bg-transparent border-transparent text-primary underline-offset-4 hover:underline",
        glass: "border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10",
      },
      size: {
        default:
          "h-10 min-h-[44px] gap-2 px-4 rounded-2xl text-sm",
        xs: "h-6.5 min-h-[26px] gap-1 px-2.5 text-xs rounded-xl [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8.5 min-h-[34px] gap-1.5 px-3 text-xs rounded-xl",
        lg: "h-12 min-h-[48px] gap-2.5 px-6 text-base rounded-full",
        icon: "size-10 min-w-[44px] min-h-[44px] liquid-icon-btn rounded-full",
        "icon-xs": "size-6.5 min-w-[26px] min-h-[26px] liquid-icon-btn rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8.5 min-w-[34px] min-h-[34px] liquid-icon-btn rounded-full",
        "icon-lg": "size-12 min-w-[48px] min-h-[48px] liquid-icon-btn rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, LinkButton, buttonVariants }
