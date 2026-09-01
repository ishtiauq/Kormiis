import { useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon.jsx'

export default function ToastContainer({ toasts = [], removeToast }) {
  const containerRef = useRef(null)

  // Dismiss toast when clicking anywhere outside
  useEffect(() => {
    if (!toasts || toasts.length === 0) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Dismiss all toasts on outside click
        toasts.forEach(t => removeToast?.(t.id))
      }
    }

    // Delay slightly so the event that triggered the toast does not immediately dismiss it
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleClickOutside, true)
      window.addEventListener('click', handleClickOutside, true)
    }, 80)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', handleClickOutside, true)
      window.removeEventListener('click', handleClickOutside, true)
    }
  }, [toasts, removeToast])

  if (!toasts || toasts.length === 0) return null

  return (
    <div 
      ref={containerRef}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2.5 max-w-[94vw] sm:max-w-lg w-full pointer-events-none transition-all duration-300 px-3"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => {
        const type = toast.type || 'info'
        const isDanger = type === 'danger' || type === 'error'
        const isSuccess = type === 'success'
        const isWarning = type === 'warning'

        const iconName = isDanger 
          ? 'error' 
          : isSuccess 
            ? 'check_circle' 
            : isWarning 
              ? 'warning' 
              : 'info'

        const iconColor = isDanger
          ? 'text-rose-500'
          : isSuccess
            ? 'text-emerald-500'
            : isWarning
              ? 'text-amber-500'
              : 'text-primary'

        const badgeBorder = isDanger
          ? 'border-rose-500/35'
          : isSuccess
            ? 'border-emerald-500/35'
            : isWarning
              ? 'border-amber-500/35'
              : 'border-black/15 dark:border-white/20'

        return (
          <div
            key={toast.id}
            className={`glass-kormiis pointer-events-auto w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border ${badgeBorder} !bg-transparent flex items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 select-none shadow-none isolate`}
            style={{
              background: 'transparent !important',
              backgroundColor: 'transparent !important',
              backdropFilter: 'saturate(190%) blur(32px)',
              WebkitBackdropFilter: 'saturate(190%) blur(32px)',
            }}
          >
            {/* Left Type Icon */}
            <div className="shrink-0 flex items-center justify-center pt-0.5 sm:pt-0">
              <Icon name={iconName} size={20} className={iconColor} />
            </div>

            {/* Center Content Message */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-fluid text-foreground font-semibold leading-snug break-words">
                {toast.message}
              </p>
              {toast.action && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toast.action.onClick?.()
                    removeToast?.(toast.id)
                  }}
                  className="mt-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Right: Explicit Cross / Close Button (✕) */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeToast?.(toast.id)
              }}
              title="Close notification"
              aria-label="Close notification"
              className="shrink-0 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-black/10 dark:hover:border-white/10"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

