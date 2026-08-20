import Icon from "@/components/ui/Icon.jsx"

const getToastStyles = (type) => {
  switch (type) {
    case 'error':
    case 'danger':
      return {
        bg: 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-600/20',
        icon: 'error',
        iconColor: 'text-white'
      }
    case 'success':
      return {
        bg: 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/20',
        icon: 'check_circle',
        iconColor: 'text-white'
      }
    case 'warning':
      return {
        bg: 'bg-amber-600 text-white border-amber-700 shadow-lg shadow-amber-600/20',
        icon: 'warning',
        iconColor: 'text-white'
      }
    case 'info':
    default:
      return {
        bg: 'bg-card text-foreground border-border/80 shadow-xl backdrop-blur-xl',
        icon: 'info',
        iconColor: 'text-primary'
      }
  }
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 sm:left-auto z-[100] flex max-h-screen w-full flex-col p-4 sm:max-w-[420px] gap-2.5 pointer-events-none" aria-live="polite" aria-atomic="false">
      {toasts.map(toast => {
        const style = getToastStyles(toast.type)
        return (
          <div key={toast.id}
            className={`toast pointer-events-auto group relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-xl border p-4 pr-8 shadow-md transition-all ${style.bg}`}
            role="alert"
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <div className="flex items-start gap-3 flex-1 w-full">
              <Icon name={style.icon} className={`shrink-0 mt-0.5 ${style.iconColor}`} size={20}/>
              <p className="flex-1 text-fluid-sm font-semibold leading-snug">
                {toast.message}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {toast.action && (
                  <button onClick={() => { toast.action.onClick(); removeToast(toast.id) }}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold transition-colors hover:bg-white/20 pointer-events-auto">
                    {toast.action.label}
                  </button>
                )}
                <button onClick={() => removeToast(toast.id)}
                  className="absolute right-2 top-2 rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 pointer-events-auto cursor-pointer border-none bg-transparent text-current">
                  <Icon name="close" size={16}/>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
