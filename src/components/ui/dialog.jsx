import React from "react"
import { Dialog as AriaDialog, Modal as AriaModal, ModalOverlay as AriaModalOverlay, DialogTrigger as AriaDialogTrigger } from "react-aria-components"
import { cn } from "@/lib/utils"

const DialogTrigger = AriaDialogTrigger

const Dialog = ({ open, onOpenChange, children, ...props }) => (
  <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange} {...props}>
    {children}
  </AriaDialogTrigger>
)

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AriaModalOverlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4",
      className
    )}
    isDismissable={true}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef(({ className, overlayClassName, children, ...props }, ref) => (
  <DialogOverlay className={overlayClassName}>
    <AriaModal
      ref={ref}
      className={cn(
        "w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden rounded-[28px] glass-kormiis-modal text-foreground shadow-2xl p-0",
        className
      )}
      {...props}
    >
      <AriaDialog className="outline-none focus:outline-none flex flex-col w-full h-full p-6 sm:p-8 overflow-y-auto">
        {children}
      </AriaDialog>
    </AriaModal>
  </DialogOverlay>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2 text-left pb-4 shrink-0 border-b border-border/80 dark:border-white/12", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-5 border-t border-border/80 dark:border-white/12 mt-2 shrink-0 pb-2 sm:pb-0", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-extrabold tracking-tight text-foreground leading-none", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground font-medium", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
