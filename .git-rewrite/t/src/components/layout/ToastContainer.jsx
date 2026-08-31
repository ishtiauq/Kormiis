import { X, Bell } from 'lucide-react'

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none" aria-live="polite" aria-atomic="false">
      {toasts.map(toast => (
        <div key={toast.id}
          className="pointer-events-auto rounded-xl border border-border shadow-lg bg-card text-card-foreground overflow-hidden"
          role="alert"
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="flex items-start gap-3 p-3 sm:p-4">
            <Bell size={18} className="shrink-0 mt-0.5 text-muted-foreground" />
            <p className="flex-1 text-xs sm:text-sm font-medium text-foreground m-0 leading-relaxed">
              {toast.message}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {toast.action && (
                <button onClick={() => { toast.action.onClick(); removeToast(toast.id) }}
                  className="text-xs font-semibold text-foreground underline underline-offset-2 hover:no-underline cursor-pointer border-none bg-transparent p-0">
                  {toast.action.label}
                </button>
              )}
              <button onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer border-none bg-transparent">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="h-0.5 w-full bg-muted/50" aria-hidden="true">
            <div className="h-full bg-muted-foreground/30"
              style={{ animation: 'shrink 4s linear' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
