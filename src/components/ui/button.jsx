import { cva } from "class-variance-authority";
import { Button as ButtonPrimitive, Link as LinkPrimitive } from "react-aria-components";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "liquid-glass-btn group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap outline-none select-none transition-all duration-400 disabled:pointer-events-none disabled:opacity-40 disabled:grayscale aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[0_8px_24px_-4px_rgba(254,53,1,0.45)] hover:shadow-[0_12px_30px_-4px_rgba(254,53,1,0.6)]",
        outline:
          "border border-white/30 dark:border-white/15 bg-white/20 dark:bg-white/5 backdrop-blur-xl text-foreground hover:bg-white/30 dark:hover:bg-white/10",
        secondary:
          "apple-glass-btn text-foreground",
        ghost:
          "bg-transparent border-transparent hover:bg-white/15 dark:hover:bg-white/10 text-foreground",
        destructive:
          "border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "apple-glass-btn text-foreground",
      },
      size: {
        default:
          "h-10 min-h-[44px] gap-2 px-4 rounded-2xl text-sm",
        xs: "h-6 gap-1 px-2.5 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-xs rounded-xl",
        lg: "h-12 min-h-[48px] gap-2.5 px-6 text-base rounded-full",
        icon: "size-10 min-w-[44px] min-h-[44px] liquid-icon-btn rounded-full",
        "icon-xs": "size-6 liquid-icon-btn rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 liquid-icon-btn rounded-full",
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
