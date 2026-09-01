import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  initialAction
}) {
  const [isMobileHandset, setIsMobileHandset] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 640 : false
  })
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 1368 : false
  })
  const containerRef = useRef(null)

  useEffect(() => {
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        setIsMobileHandset(window.innerWidth < 640)
        setIsMobileOrTablet(window.innerWidth <= 1368)
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

  // On mobile handsets (< 640px), AI is fully managed inside the mobile bottom bar accordion
  if (isMobileHandset) return null

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
            null
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
