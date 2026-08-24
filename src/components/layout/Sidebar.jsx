import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import TooltipPopover from '../TooltipPopover.jsx'

export default function Sidebar({
  visibleNavItems = [], 
  isDarkMode, 
  currentView, 
  setCurrentView,
  user, 
  handleLogout
}) {
  const [isOpen, setIsOpen] = useState(false)
  const sidebarRef = useRef(null)
  const navRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const [isDesktopOrTablet, setIsDesktopOrTablet] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  )

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopOrTablet(window.innerWidth >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Desktop Hover handlers
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 180)
  }

  // Tablet/iPad Tap/Touch to open when collapsed
  const handleBarTouchOrClick = () => {
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  // Tablet/iPad & Desktop Outside Tap/Click detection to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Expanded width hugs the widest menu label (bare-minimum chrome around it)
  const [maxLabelWidth, setMaxLabelWidth] = useState(0)
  const measurerRef = useRef(null)

  const measureLabels = () => {
    if (measurerRef.current) {
      setMaxLabelWidth(Math.ceil(measurerRef.current.getBoundingClientRect().width))
    }
  }

  useLayoutEffect(() => {
    measureLabels()
    if (document.fonts?.ready) document.fonts.ready.then(measureLabels)
    window.addEventListener('resize', measureLabels)
    return () => window.removeEventListener('resize', measureLabels)
  }, [visibleNavItems])

  // px-2.5 x2 (20) + icon 22 + gap 10 + row borders 2 + sidebar p-1.5 x2 (12)
  // + aside glass border 2 + scrollbar up to 12 + rounding safety 14
  const EXPANDED_CHROME_PX = 84
  const expandedWidth = maxLabelWidth > 0 ? maxLabelWidth + EXPANDED_CHROME_PX : 176

  // On mobile screens (<768px), do not render desktop floating sidebar (mobile uses bottom dock/sheet)
  if (!isDesktopOrTablet) {
    return null
  }

  const isDark = Boolean(isDarkMode)
  const top4Items = visibleNavItems.slice(0, 4)
  const isAnyOtherActive = !top4Items.some(item => item.id === currentView)

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleBarTouchOrClick}
      aria-label="Floating navigation sidebar"
      className={`hidden md:flex flex-col fixed left-3 sm:left-4 z-50 glass-kormiis text-sidebar-foreground shadow-2xl transition-[width,height,max-height,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
        isOpen
          ? 'h-[min(calc(100vh_-_5rem),510px)] p-1.5 pt-2 pb-1.5 rounded-3xl shadow-2xl'
          : 'p-1.5 py-3 rounded-2xl sm:rounded-3xl shadow-xl'
      }`}
      style={{
        top: '50%',
        transform: 'translateY(-50%)',
        isolation: 'isolate',
        width: isOpen ? `${expandedWidth}px` : '48px',
      }}
    >
      {/* NAVIGATION ITEMS */}
      <nav 
        ref={navRef}
        aria-label="Main navigation" 
        className={`sidebar-nav-scroll flex-1 w-full flex flex-col gap-2 items-center cursor-default ${
          isOpen 
            ? 'overflow-y-auto overflow-x-hidden select-none overscroll-contain pr-1' 
            : 'overflow-hidden justify-center'
        }`}
      >
        {(isOpen ? visibleNavItems.filter(item => item.id !== 'profile') : top4Items).map(item => {
          const isActive = currentView === item.id;

          return (
            <TooltipPopover 
              key={item.id} 
              label={item.label} 
              isCollapsed={!isOpen} 
              isDarkMode={isDark}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={item.label}
                className={`${isActive 
                  ? 'nav-capsule-active font-semibold' 
                  : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-white/20 dark:hover:bg-white/[0.08] hover:border-white/15 dark:hover:border-white/10 border border-transparent font-medium active:scale-[0.98]'
                 } flex items-center cursor-pointer box-border transition-[background-color,border-color,color,transform] duration-200 relative no-underline shrink-0 select-none overflow-hidden ${
                   isOpen ? 'gap-2.5 px-2.5 h-10 w-full rounded-2xl' : 'justify-center size-8 rounded-xl sm:rounded-2xl'
                 }`}
                data-active={isActive ? 'true' : 'false'}
                data-label={item.label}
                onClick={(e) => { 
                  e.stopPropagation();
                  if (setCurrentView) setCurrentView(item.id);
                  if (window.matchMedia('(hover: none)').matches) {
                    setIsOpen(false);
                  }
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    if (setCurrentView) setCurrentView(item.id);
                    setIsOpen(false);
                  }
                }}
              >
                {/* Icon */}
                <div className="size-5.5 flex items-center justify-center rounded-xl shrink-0">
                  {item.icon}
                </div>
                
                {/* Label (Revealed on hover / tap expansion) */}
                {isOpen && (
                  <span className="flex-1 min-w-0 break-words text-sm font-medium leading-5 whitespace-nowrap text-left">
                    {item.label}
                  </span>
                )}
              </div>
            </TooltipPopover>
          )
        })}

        {/* Resting state hint: 3 dots indicator when collapsed */}
        {!isOpen && (
          <div className="size-8 flex flex-col items-center justify-center gap-1 opacity-60">
            <span className={`size-1 rounded-full ${isAnyOtherActive ? 'bg-primary ring-2 ring-primary/40' : 'bg-sidebar-foreground/40'}`} />
            <span className="size-1 rounded-full bg-sidebar-foreground/40" />
            <span className="size-1 rounded-full bg-sidebar-foreground/40" />
          </div>
        )}
      </nav>

      {/* EXPANDED FOOTER: LOGOUT ONLY */}
      <div 
        className={`shrink-0 w-full flex flex-col border-t border-white/12 dark:border-white/8 transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-16 pt-1.5 mt-0.5 opacity-100' : 'max-h-0 opacity-0 pointer-events-none p-0 m-0 border-none'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            if (handleLogout) handleLogout();
          }}
          className="sidebar-logout-btn w-full flex items-center justify-center gap-2 px-3 rounded-2xl bg-red-600 hover:bg-red-700 !text-white font-semibold text-xs active:scale-[0.97] transition-all cursor-pointer h-9.5 box-border shadow-sm"
          style={{ color: '#ffffff' }}
        >
          <Icon name="logout" size={16} className="!text-white text-white" style={{ color: '#ffffff' }}/>
          <span className="font-semibold text-xs !text-white text-white" style={{ color: '#ffffff' }}>Logout</span>
        </button>
      </div>

      {/* Hidden measurer: widest label dictates expanded width */}
      <div
        ref={measurerRef}
        aria-hidden="true"
        className="absolute -left-[9999px] top-0 w-max invisible pointer-events-none"
      >
        {visibleNavItems.map((item) => (
          <span key={item.id} className="block whitespace-nowrap text-sm font-medium leading-5">
            {item.label}
          </span>
        ))}
      </div>

      {/* Scoped icon & scrollbar styles */}
      <style>{`
        aside .msr {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0 !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        aside [data-active="true"] .msr {
          font-variation-settings: "FILL" 1, "wght" 600, "GRAD" 0 !important;
          transform: scale(1.08);
        }

        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 4px;
          background: transparent !important;
        }

        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent !important;
        }

        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: transparent !important;
          border-radius: 9999px;
          border: none !important;
          transition: none !important;
        }

        .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          transition: none !important;
        }

        .dark .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: #475569 !important;
          transition: none !important;
        }

        .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }

        .dark .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b !important;
        }

        .sidebar-nav-scroll::-webkit-scrollbar-button,
        .sidebar-nav-scroll::-webkit-scrollbar-button:single-button,
        .sidebar-nav-scroll::-webkit-scrollbar-button:vertical:decrement,
        .sidebar-nav-scroll::-webkit-scrollbar-button:vertical:increment,
        .sidebar-nav-scroll::-webkit-scrollbar-button:start,
        .sidebar-nav-scroll::-webkit-scrollbar-button:end {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
          max-width: 0px !important;
          max-height: 0px !important;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </aside>
  )
}
