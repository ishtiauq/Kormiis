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
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-all duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0 flex items-center justify-center p-4",
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
        "w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground p-6 shadow-xl backdrop-blur-xl transition-all duration-200 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95",
        className
      )}
      {...props}
    >
      <AriaDialog className="outline-none focus:outline-none flex flex-col gap-4">
        {children}
      </AriaDialog>
    </AriaModal>
  </AlertDialogOverlay>
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1 text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3", className)} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-extrabold tracking-tight text-foreground leading-none", className)} {...props} />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = ({ className, variant = 'default', ...props }) => (
  <Button variant={variant} className={cn(className)} {...props} />
)

const AlertDialogCancel = ({ className, ...props }) => (
  <Button variant="outline" className={cn(className)} {...props} />
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
