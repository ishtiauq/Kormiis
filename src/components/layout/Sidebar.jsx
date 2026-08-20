import { useState, useEffect, useRef, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import TooltipPopover from '../TooltipPopover.jsx'
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

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

  // On mobile screens (<768px), do not render desktop floating sidebar (mobile uses bottom dock/sheet)
  if (!isDesktopOrTablet) {
    return null
  }

  const isDark = Boolean(isDarkMode)
  const top4Items = visibleNavItems.slice(0, 4)
  const isAnyOtherActive = !top4Items.some(item => item.id === currentView)

  // Width of the widest menu label (matches text-sm/500/20px) so the expanded
  // sidebar hugs the longest menu tab exactly.
  const expandedWidth = useMemo(() => {
    if (typeof document === 'undefined' || !visibleNavItems?.length) return 240
    const probe = document.createElement('span')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;font-family:inherit'
    let max = 0
    for (const item of visibleNavItems) {
      probe.textContent = item.label || ''
      document.body.appendChild(probe)
      max = Math.max(max, probe.offsetWidth)
      probe.remove()
    }
    // label + icon(22) + gap(12) + item px(24) + aside p(20) + border(2)
    return Math.max(160, Math.min(max + 82, 262))
  }, [visibleNavItems])

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleBarTouchOrClick}
      aria-label="Floating navigation sidebar"
      className={`hidden md:flex flex-col fixed left-3 md:left-5 top-1/2 -translate-y-1/2 z-50 glass-kormiis text-sidebar-foreground rounded-3xl border border-white/30 dark:border-white/14 shadow-2xl transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
        isOpen
          ? 'h-[calc(100vh-4rem)] max-h-[660px] p-3 pt-3.5 pb-3 shadow-2xl'
          : 'w-[54px] h-auto py-3 px-1.5 cursor-pointer shadow-xl'
      }`}
      style={{ width: isOpen ? `${expandedWidth}px` : undefined }}
    >
      {/* NAVIGATION ITEMS */}
      <nav 
        aria-label="Main navigation" 
        className={`sidebar-nav-scroll flex-1 flex flex-col gap-1.5 items-center ${
          isOpen ? 'overflow-y-auto py-1.5 pr-0.5' : 'overflow-hidden justify-center py-1'
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
                  ? 'active bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary font-semibold border border-primary/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-md' 
                  : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-white/20 dark:hover:bg-white/[0.08] hover:border-white/15 dark:hover:border-white/10 border border-transparent font-medium active:scale-[0.98]'
                } flex items-center rounded-2xl cursor-pointer box-border transition-all duration-200 relative no-underline shrink-0 select-none ${
                  isOpen ? 'gap-3 px-3 h-10 w-full' : 'justify-center size-10'
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
                <span 
                  className="text-sm font-medium leading-5 whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-300"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    maxWidth: isOpen ? '180px' : '0px'
                  }}
                >
                  {item.label}
                </span>
              </div>
            </TooltipPopover>
          )
        })}

        {/* Resting state hint: 3 dots indicator when collapsed */}
        {!isOpen && (
          <div className="size-10 flex flex-col items-center justify-center gap-1 opacity-60">
            <span className={`size-1 rounded-full ${isAnyOtherActive ? 'bg-primary ring-2 ring-primary/40' : 'bg-sidebar-foreground/40'}`} />
            <span className="size-1 rounded-full bg-sidebar-foreground/40" />
            <span className="size-1 rounded-full bg-sidebar-foreground/40" />
          </div>
        )}
      </nav>

      {/* EXPANDED FOOTER: LOGOUT ONLY */}
      <div 
        className={`shrink-0 flex flex-col border-t border-white/12 dark:border-white/8 transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-16 pt-2 mt-1 opacity-100' : 'max-h-0 opacity-0 pointer-events-none p-0 m-0 border-none'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            if (handleLogout) handleLogout();
          }}
          className="w-full flex items-center justify-center gap-2 px-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs active:scale-[0.97] transition-all cursor-pointer h-9.5 box-border shadow-sm"
        >
          <Icon name="logout" size={16}/>
          <span className="font-semibold text-xs">Logout</span>
        </button>
      </div>

      {/* Scoped scrollbar & icon styles */}
      <style>{`
        aside .msr {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0 !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        aside [data-active="true"] .msr {
          font-variation-settings: "FILL" 1, "wght" 600, "GRAD" 0 !important;
          transform: scale(1.08);
        }

        .sidebar-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s ease;
        }
        .sidebar-nav-scroll:hover {
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
        }
        .dark .sidebar-nav-scroll:hover {
          scrollbar-color: hsl(0 0% 30%) transparent;
        }

        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 9999px;
          transition: background 0.3s ease;
        }
        .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
        }
        .dark .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  )
}
