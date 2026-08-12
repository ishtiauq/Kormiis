import React from "react"
import { Dialog as AriaDialog, Modal as AriaModal, ModalOverlay as AriaModalOverlay, DialogTrigger as AriaDialogTrigger } from "react-aria-components"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const AlertDialog = ({ open, onOpenChange, children, ...props }) => (
  <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange} {...props}>
    {children}
  </AriaDialogTrigger>
)

const AlertDialogTrigger = AriaDialogTrigger

const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AriaModalOverlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-all duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0 flex items-center justify-center p-4",
      className
    )}
    {...props}
  />
))
AlertDialogOverlay.displayName = "AlertDialogOverlay"

const AlertDialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AlertDialogOverlay>
    <AriaModal
      ref={ref}
      className={cn(
        "w-full max-w-md flex flex-col overflow-hidden rounded-[28px] border-none glass-kormiis-modal text-card-foreground transition-all duration-200 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95 p-0 relative",
        className
      )}
      {...props}
    >
      {/* Top Animated Gradient Bar */}
      <div className="w-full h-1.5 bg-gradient-to-r from-orange-500 via-rose-500 to-blue-500 animate-pulse z-30 shrink-0" />
      <AriaDialog className="outline-none focus:outline-none flex flex-col w-full h-full p-6 sm:p-7 gap-4 overflow-y-auto">
        {children}
      </AriaDialog>
    </AriaModal>
  </AlertDialogOverlay>
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border/40 mt-1", className)} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-bold tracking-tight text-foreground leading-none flex items-center gap-2", className)} {...props} />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-fluid-sm text-muted-foreground leading-relaxed", className)} {...props} />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = ({ className, style, ...props }) => (
  <Button
    className={cn("rounded-full font-semibold !bg-red-600 hover:!bg-red-700 !text-white shadow-sm border-none px-5", className)}
    style={{ backgroundColor: '#dc2626', color: '#ffffff', ...style }}
    {...props}
  />
)

const AlertDialogCancel = ({ className, ...props }) => (
  <Button variant="outline" className={cn("rounded-full font-semibold px-5", className)} {...props} />
)

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
