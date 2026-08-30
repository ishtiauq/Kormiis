import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import AiCoPilotModal from './AiCoPilotModal.jsx'

export function AiQuantumGlyph({ size = 24, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Precision Apple Intelligence 3-Loop Optical Fluid Swirl (Harmonized 24px Optical Volume) */}
      <g transform="translate(12, 12)">
        {/* Primary Vertical Ribbon Loop */}
        <ellipse 
          cx="0" 
          cy="0" 
          rx="4.0" 
          ry="9.2" 
          transform="rotate(0)" 
          stroke="currentColor" 
          strokeWidth="1.9" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-95" 
        />
        {/* 60-degree Diagonal Ribbon Loop */}
        <ellipse 
          cx="0" 
          cy="0" 
          rx="4.0" 
          ry="9.2" 
          transform="rotate(60)" 
          stroke="currentColor" 
          strokeWidth="1.9" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-85" 
        />
        {/* 120-degree Diagonal Ribbon Loop */}
        <ellipse 
          cx="0" 
          cy="0" 
          rx="4.0" 
          ry="9.2" 
          transform="rotate(120)" 
          stroke="currentColor" 
          strokeWidth="1.9" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-85" 
        />
        {/* Quantum Aperture Core Focus */}
        <circle 
          cx="0" 
          cy="0" 
          r="1.6" 
          fill="currentColor" 
          className="opacity-95" 
        />
      </g>
    </svg>
  )
}

export default function AiExpandableFab({
  isOpen,
  onToggle,
  onClose,
  currentUser,
  employees = [],
  setEmployees,
  payroll = {},
  setPayroll,
  attendance = {},
  setAttendance,
  expenses = [],
  setExpenses,
  announcements = [],
  setAnnouncements,
  tasks = [],
  setTasks,
  settings = {},
  setCurrentView,
  addToast,
  initialAction,
  isDarkMode = false
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  })
  const containerRef = useRef(null)

  useEffect(() => {
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        setIsMobileOrTablet(window.innerWidth < 1024)
      }, 100)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Keyboard shortcut Ctrl + Space / Alt + A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.code === 'Space') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault()
        if (onToggle) onToggle()
      } else if (e.key === 'Escape' && isOpen) {
        if (onClose) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle, onClose])

  // Handle outside click when modal is open
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest?.('[data-ai-trigger]') &&
        !e.target.closest?.('#notification-trigger') &&
        !e.target.closest?.('[data-notif-panel]')
      ) {
        if (onClose) onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile & Tablet Backdrop Click Catcher (Zero visual overlay, identical to Menu Drawer) */}
      {isOpen && isMobileOrTablet && (
        <div
          className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
          onClick={onClose || onToggle}
          aria-hidden="true"
        />
      )}

      <div
        ref={containerRef}
        data-ai-fab
        className={
          isMobileOrTablet
            ? "fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-none flex flex-col items-center justify-end select-none"
            : "fixed bottom-6 right-4 sm:right-6 z-[60] pointer-events-none flex flex-col items-end justify-end select-none"
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            isMobileOrTablet ? (
              /* MOBILE & TABLET: REVEALS EXACTLY LIKE MENU DRAWER (SLIDE-UP BOTTOM SHEET) */
              <motion.div
                key="ai-expanded-drawer-mobile"
                data-ai-panel
                initial={{ y: '100%', opacity: 0.7 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ 
                  y: '100%', 
                  opacity: 0, 
                  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } 
                }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 30,
                  mass: 0.8
                }}
                className="pointer-events-auto w-full max-w-2xl h-[min(88vh,720px)] glass-mobile-drawer glass-kormiis rounded-t-[28px] sm:rounded-t-3xl rounded-b-none border-t border-x border-white/30 dark:border-white/14 shadow-2xl overflow-hidden flex flex-col backdrop-blur-3xl relative"
              >
                {/* Pull handle indicator matching Menu Drawer standard */}
                <div className="w-10 h-1 rounded-full bg-foreground/25 mx-auto mt-2.5 mb-1 shrink-0" />

                <AiCoPilotModal
                  isMorphMode={true}
                  isOpen={true}
                  onClose={onClose || onToggle}
                  currentUser={currentUser}
                  employees={employees}
                  setEmployees={setEmployees}
                  payroll={payroll}
                  setPayroll={setPayroll}
                  attendance={attendance}
                  setAttendance={setAttendance}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  announcements={announcements}
                  setAnnouncements={setAnnouncements}
                  tasks={tasks}
                  setTasks={setTasks}
                  settings={settings}
                  setCurrentView={setCurrentView}
                  addToast={addToast}
                  initialAction={initialAction}
                />
              </motion.div>
            ) : (
              /* DESKTOP: CRISP SPRING BLOOM FROM BOTTOM-RIGHT */
              <motion.div
                key="ai-expanded-modal-desktop"
                data-ai-panel
                initial={{
                  opacity: 0,
                  scale: 0.86,
                  y: 12,
                  x: 12
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  scale: 0.88,
                  y: 10,
                  x: 10,
                  transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] }
                }}
                transition={{
                  type: 'spring',
                  stiffness: 360,
                  damping: 28,
                  mass: 0.7
                }}
                style={{ transformOrigin: 'bottom right' }}
                className="pointer-events-auto w-[calc(100vw-2rem)] xs:w-[390px] sm:w-[450px] md:w-[470px] h-[min(82vh,620px)] sm:h-[min(76vh,640px)] glass-kormiis rounded-[28px] border border-white/45 dark:border-white/16 shadow-[0_28px_70px_-12px_rgba(0,0,0,0.45),inset_0_1px_1px_0_rgba(255,255,255,0.45)] overflow-hidden flex flex-col backdrop-blur-3xl relative"
              >
                <AiCoPilotModal
                  isMorphMode={true}
                  isOpen={true}
                  onClose={onClose || onToggle}
                  currentUser={currentUser}
                  employees={employees}
                  setEmployees={setEmployees}
                  payroll={payroll}
                  setPayroll={setPayroll}
                  attendance={attendance}
                  setAttendance={setAttendance}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  announcements={announcements}
                  setAnnouncements={setAnnouncements}
                  tasks={tasks}
                  setTasks={setTasks}
                  settings={settings}
                  setCurrentView={setCurrentView}
                  addToast={addToast}
                  initialAction={initialAction}
                />
              </motion.div>
            )
          ) : (
            /* COLLAPSED FLOATING PILL BUTTON — DESKTOP ONLY (HIDDEN ON MOBILE & TABLET) */
            <motion.div
              key="ai-collapsed-fab"
              initial={{
                opacity: 0,
                scale: 0.85
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                transition: { duration: 0.12, ease: 'easeIn' }
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                mass: 0.6
              }}
              style={{ transformOrigin: 'bottom right' }}
              className="hidden lg:flex pointer-events-auto items-center"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <button
                data-ai-trigger="true"
                onClick={onToggle}
                aria-label="Open Kormiis AI (Ctrl+Space)"
                className="group relative flex items-center gap-3 h-13 px-4.5 rounded-full glass-kormiis border border-white/45 dark:border-white/18 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.22),inset_0_1px_1.5px_0_rgba(255,255,255,0.45)] hover:shadow-[0_20px_45px_-6px_rgba(0,0,0,0.32),inset_0_1px_2px_0_rgba(255,255,255,0.60)] backdrop-blur-3xl cursor-pointer transition-all duration-300 active:scale-95 hover:scale-103 overflow-hidden select-none"
              >
                {/* Subtle Neutral Specular Highlight */}
                <div className="absolute inset-0 bg-white/[0.04] dark:bg-white/[0.04] opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Monochrome AI Glyph (Boxless, Direct Sizing) */}
                <div className="relative shrink-0 text-foreground flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-45">
                  <AiQuantumGlyph size={24} />
                </div>

                {/* Dynamic Typography Badge */}
                <div className="flex flex-col text-left pr-0.5 relative z-10">
                  <span className="text-xs font-black tracking-tight text-foreground leading-none">
                    Kormiis AI
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5 hidden xs:inline leading-none">
                    Ctrl+Space
                  </span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
