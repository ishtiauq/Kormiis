import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import AiCoPilotModal from './AiCoPilotModal.jsx'

export function AiQuantumGlyph({ size = 20, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="monoglass-glyph-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Precision Apple-Intelligence Geometric Neural Aperture */}
      <path
        d="M12 2.2C12 7.6 7.6 12 2.2 12C7.6 12 12 16.4 12 21.8C12 16.4 16.4 12 21.8 12C16.4 12 12 7.6 12 2.2Z"
        fill="url(#monoglass-glyph-grad)"
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" className="opacity-90" />
      <circle cx="12" cy="5" r="1.1" fill="currentColor" className="opacity-80" />
      <circle cx="12" cy="19" r="1.1" fill="currentColor" className="opacity-80" />
      <circle cx="5" cy="12" r="1.1" fill="currentColor" className="opacity-80" />
      <circle cx="19" cy="12" r="1.1" fill="currentColor" className="opacity-80" />
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
  const containerRef = useRef(null)

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
    <div
      ref={containerRef}
      data-ai-fab
      className="fixed bottom-6 right-4 sm:right-6 z-[60] pointer-events-none flex flex-col items-end justify-end select-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          /* EXPANDED FLOATING MODAL — CRISP SPRING BLOOM FROM BOTTOM-RIGHT */
          <motion.div
            key="ai-expanded-modal"
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
        ) : (
          /* COLLAPSED FLOATING PILL BUTTON — PURE NEUTRAL MONOGLASS BUTTON */
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
            className="pointer-events-auto flex items-center"
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
                <span className="text-xs font-black tracking-tight text-foreground flex items-center gap-1.5 leading-none">
                  <span>Kormiis AI</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground font-extrabold uppercase tracking-wider border border-black/10 dark:border-white/20">
                    Pro
                  </span>
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
  )
}
