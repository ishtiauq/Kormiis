import { cn } from "@/lib/utils"

export default function Icon({ name, size = 20, className, style, ariaLabel, fill = false, ...props }) {
  const variationStyle = fill ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined
  return (
    <span
      className={cn("msr", className)}
      style={{ fontSize: size, ...variationStyle, ...style }}
      aria-hidden={ariaLabel ? undefined : "true"}
      aria-label={ariaLabel}
      {...props}
    >
      {name}
    </span>
  )
}
