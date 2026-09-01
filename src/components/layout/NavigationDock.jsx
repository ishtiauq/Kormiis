import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TooltipPopover from '../TooltipPopover.jsx'

export const NavigationDock = memo(({
  visibleNavItems = [],
  currentView = 'dashboard',
  setCurrentView,
  isDark = true,
  isFullWidthRow = false,
  prefix = 'dock',
  className = ''
}) => {
  if (!visibleNavItems || visibleNavItems.length === 0) return null

  return (
    <div className={`w-fit max-w-full h-10.5 sm:h-11 md:h-11.5 glass-kormiis rounded-full p-1 flex items-center justify-center border border-black/8 dark:border-white/10 menu-bar-dock shadow-none ${isFullWidthRow ? 'mx-auto' : ''} ${className}`}>
      <nav 
        aria-label="Main page navigation" 
        className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 overflow-x-auto no-scrollbar scrollbar-none select-none scroll-smooth h-full max-w-full menu-bar-dock px-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {visibleNavItems.filter(item => item.id !== 'profile').map(item => {
          const isActive = currentView === item.id;
          return (
            <TooltipPopover key={item.id} label={item.label} isCollapsed={!isActive} isDarkMode={isDark} side="top">
              <motion.button
                type="button"
                layout
                aria-label={item.label}
                onClick={() => {
                  if (setCurrentView) setCurrentView(item.id);
                }}
                whileTap={{ scale: 0.94 }}
                whileHover={!isActive ? { scale: 1.05 } : undefined}
                transition={{
                  layout: { type: "spring", stiffness: 440, damping: 32, mass: 0.7 },
                  scale: { duration: 0.15 }
                }}
                className={`relative h-8 sm:h-8.5 rounded-full flex items-center justify-center shrink-0 cursor-pointer select-none border-0 !border-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-150 ${
                  isActive
                    ? 'nav-capsule-active px-3 sm:px-3.5 gap-1.5 font-bold z-10 !text-white'
                    : 'w-8 sm:w-8.5 text-foreground/65 hover:text-foreground hover:bg-white/20 dark:hover:bg-white/8 bg-transparent p-0'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', backgroundColor: '#FE3501', color: '#ffffff', border: 'none', outline: 'none' } : { background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
              >
                {/* Gliding morphing pill indicator (Brand Color) */}
                {isActive && (
                  <motion.div
                    layoutId={`${prefix}-active-nav-pill`}
                    className="absolute inset-0 rounded-full nav-capsule-active z-0 pointer-events-none !border-none"
                    style={{ border: 'none', outline: 'none' }}
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 32,
                      mass: 0.75
                    }}
                  />
                )}

                {/* Icon */}
                <span 
                  className={`relative z-10 shrink-0 flex items-center justify-center transition-all duration-200 ${
                    isActive ? '!text-white scale-105' : 'text-foreground/75'
                  }`}
                >
                  {item.icon}
                </span>

                {/* Smooth spring expanding label */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {isActive && (
                    <motion.span
                      key={`nav-label-${item.id}`}
                      initial={{ opacity: 0, width: 0, filter: 'blur(3px)', x: -3 }}
                      animate={{ opacity: 1, width: 'auto', filter: 'blur(0px)', x: 0 }}
                      exit={{ opacity: 0, width: 0, filter: 'blur(3px)', x: -3 }}
                      transition={{
                        type: "spring",
                        stiffness: 440,
                        damping: 30,
                        mass: 0.65
                      }}
                      className="relative z-10 text-[12px] sm:text-xs md:text-sm font-semibold tracking-tight whitespace-nowrap overflow-hidden inline-block leading-none !text-white"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipPopover>
          );
        })}
      </nav>
    </div>
  )
})

NavigationDock.displayName = 'NavigationDock'
export default NavigationDock
