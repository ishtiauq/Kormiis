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
      "fixed inset-0 z-50 bg-black/50 transition-all duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0 flex items-center justify-center p-4",
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
        "w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-popover-foreground shadow-2xl transition-all duration-200 data-[entering]:animate-in data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:zoom-out-95 p-0",
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
  <div className={cn("flex flex-col space-y-1.5 text-left pb-4 shrink-0", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5 border-t border-border/50 mt-2 shrink-0 pb-2 sm:pb-0", className)} {...props} />
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
