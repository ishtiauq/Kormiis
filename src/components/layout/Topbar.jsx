import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import { CATEGORY_META } from "../../services/pushNotifications.js"
import { Button } from "@/components/ui/button"
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'
import { Badge } from "@/components/ui/badge"
import { getRelativeTime } from '../../services/date.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import AiCoPilotModal from '../ai/AiCoPilotModal.jsx'
import { AiQuantumGlyph } from '../ai/AiExpandableFab.jsx'
import TooltipPopover from '../TooltipPopover.jsx'

export default function Topbar({ 
  isDarkMode, 
  toggleSidebar, 
  themeMode, 
  toggleTheme, 
  handleSync, 
  isSyncing, 
  dataIntegrityIssues = [], 
  showCorruptionModal, 
  setShowCorruptionModal, 
  handleAutoRepairDatabase, 
  setShowNotifications, 
  markNotificationsRead, 
  unreadCount, 
  showNotifications, 
  notifications = [], 
  clearNotifications, 
  onProfileClick, 
  handleLogout, 
  showThemeToggle = true, 
  user, 
  setCurrentView,
  onOpenSearch,
  onOpenAi,
  isAiOpen = false,
  employees = [],
  setEmployees,
  payroll = {},
  setPayroll,
  attendance,
  setAttendance,
  expenses = [],
  setExpenses,
  announcements = [],
  setAnnouncements,
  tasks = [],
  setTasks,
  settings = {},
  aiModalAction,
  addToast,
  visibleNavItems = [],
  currentView
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const buttonRef = useRef(null)
  const [notificationTab, setNotificationTab] = useState('all')
  const [expandedIntegrity, setExpandedIntegrity] = useState(false)
  const filteredNotifications = notificationTab === 'unread' ? notifications.filter(n => !n.read) : notifications
  const hasIntegrityIssues = dataIntegrityIssues && dataIntegrityIssues.length > 0
  const totalUnreadCount = unreadCount + (hasIntegrityIssues ? 1 : 0)
  const totalItemCount = filteredNotifications.length + (hasIntegrityIssues ? 1 : 0)
  const isDark = isDarkMode ?? (themeMode === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')))
  const isManagerOrAdmin = user?.role === 'Admin' || user?.isWorkspaceOwner || user?.role === 'Manager' || user?.role === 'HR'

  const navigateToView = (viewTarget, notifId = null) => {
    if (!viewTarget) return
    const isAdmin = user?.role === 'Admin' || user?.isWorkspaceOwner
    let mapped = viewTarget
    if (!isAdmin) {
      if (viewTarget === 'leaves') mapped = 'leave'
      else if (viewTarget === 'tasks') mapped = 'my-tasks'
      else if (viewTarget === 'assets') mapped = 'my-assets'
      else if (viewTarget === 'calendar') mapped = 'events'
    } else {
      if (viewTarget === 'leave') mapped = 'leaves'
      else if (viewTarget === 'my-tasks') mapped = 'tasks'
      else if (viewTarget === 'my-assets') mapped = 'assets'
      else if (viewTarget === 'events') mapped = 'calendar'
    }

    if (setCurrentView) setCurrentView(mapped)
    if (notifId && markNotificationsRead) markNotificationsRead(notifId)
    setShowNotifications(false)
  }

  const handleQuickAction = (e, notif, actionType) => {
    e.stopPropagation()

    if (actionType === 'view') {
      navigateToView(notif.view, notif.id)
      return
    }

    if (actionType === 'approve_leave' && setAttendance) {
      setAttendance(prev => {
        const leaves = prev?.leaves || []
        const targetLeave = leaves.find(l => (l.id === notif.leaveId || l.employeeId === notif.actorId || l.employeeId === notif.targetId) && l.status === 'Pending') || leaves.find(l => l.status === 'Pending')
        if (targetLeave) {
          return {
            ...prev,
            leaves: leaves.map(l => l.id === targetLeave.id ? { ...l, status: 'Approved' } : l)
          }
        }
        return prev
      })
      addToast?.('Leave request approved.', 'success')
      if (markNotificationsRead) markNotificationsRead(notif.id)
      return
    }

    if (actionType === 'reject_leave' && setAttendance) {
      setAttendance(prev => {
        const leaves = prev?.leaves || []
        const targetLeave = leaves.find(l => (l.id === notif.leaveId || l.employeeId === notif.actorId || l.employeeId === notif.targetId) && l.status === 'Pending') || leaves.find(l => l.status === 'Pending')
        if (targetLeave) {
          return {
            ...prev,
            leaves: leaves.map(l => l.id === targetLeave.id ? { ...l, status: 'Rejected' } : l)
          }
        }
        return prev
      })
      addToast?.('Leave request rejected.', 'info')
      if (markNotificationsRead) markNotificationsRead(notif.id)
      return
    }

    if (actionType === 'approve_expense' && setExpenses) {
      setExpenses(prev => {
        const exps = prev || []
        const targetExp = exps.find(exp => (exp.id === notif.expenseId || exp.employeeId === notif.actorId) && exp.status === 'Pending') || exps.find(e => e.status === 'Pending')
        if (targetExp) {
          return exps.map(e => e.id === targetExp.id ? { ...e, status: 'Approved', approvedBy: user?.role || 'Admin', actionDate: new Date().toISOString() } : e)
        }
        return prev
      })
      addToast?.('Expense claim approved.', 'success')
      if (markNotificationsRead) markNotificationsRead(notif.id)
      return
    }

    if (actionType === 'reject_expense' && setExpenses) {
      setExpenses(prev => {
        const exps = prev || []
        const targetExp = exps.find(exp => (exp.id === notif.expenseId || exp.employeeId === notif.actorId) && exp.status === 'Pending') || exps.find(e => e.status === 'Pending')
        if (targetExp) {
          return exps.map(e => e.id === targetExp.id ? { ...e, status: 'Rejected', rejectedBy: user?.role || 'Admin', actionDate: new Date().toISOString() } : e)
        }
        return prev
      })
      addToast?.('Expense claim rejected.', 'info')
      if (markNotificationsRead) markNotificationsRead(notif.id)
      return
    }

    if (actionType === 'complete_task' && setTasks) {
      setTasks(prev => {
        const taskList = prev || []
        const targetTask = taskList.find(t => t.id === notif.taskId) || taskList.find(t => notif.text?.includes(t.title) && t.status !== 'Done')
        if (targetTask) {
          return taskList.map(t => t.id === targetTask.id ? { ...t, status: 'Done' } : t)
        }
        return prev
      })
      addToast?.('Task marked as completed.', 'success')
      if (markNotificationsRead) markNotificationsRead(notif.id)
      return
    }

    // Default: navigate to view
    navigateToView(notif.view, notif.id)
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => setIsMobile(window.innerWidth < 1024), 150)
    }
    window.addEventListener('resize', handleResize)
    return () => { clearTimeout(resizeTimer); window.removeEventListener('resize', handleResize) }
  }, [])

  const topbarRef = useRef(null)
  const isAiOpenRef = useRef(isAiOpen)
  const showNotifRef = useRef(showNotifications)
  isAiOpenRef.current = isAiOpen
  showNotifRef.current = showNotifications

  useEffect(() => {
    if (!isAiOpen && !showNotifications) return
    const handleOutside = (e) => {
      if (topbarRef.current && topbarRef.current.contains(e.target)) return
      if (e.target.closest('[data-ai-fab]') || e.target.closest('[data-ai-panel]') || e.target.closest('.bottom-bar')) return
      if (isAiOpenRef.current && onOpenAi) onOpenAi()
      if (showNotifRef.current) setShowNotifications(false)
    }
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return
      if (isAiOpenRef.current && onOpenAi) onOpenAi()
      if (showNotifRef.current) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isAiOpen, showNotifications])

  const renderDataIntegrityCard = () => {
    if (!hasIntegrityIssues) return null

    return (
      <div 
        className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/[0.07] dark:bg-rose-500/[0.14] border border-rose-500/25 dark:border-rose-500/35 shadow-sm flex flex-col gap-2.5 mb-2.5 relative overflow-hidden backdrop-blur-md transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-8.5 rounded-xl flex items-center justify-center bg-destructive/15 text-destructive shrink-0 shadow-inner">
              <Icon name="warning" size={19} />
            </div>
            <div>
              <h4 className="text-fluid-sm font-bold text-foreground m-0 leading-tight">Data Integrity Alert</h4>
              <span className="text-[11px] text-muted-foreground font-medium">Database Consistency Discrepancy</span>
            </div>
          </div>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
            {dataIntegrityIssues.length} {dataIntegrityIssues.length === 1 ? 'Issue' : 'Issues'}
          </Badge>
        </div>

        <p className="text-fluid-xs text-foreground/90 leading-relaxed m-0">
          {dataIntegrityIssues.length} database discrepancies detected (e.g. orphaned records or conflicting logs). Auto-repair will safely clean and sync corrupted data.
        </p>

        {/* Issue list preview */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-white/90 dark:bg-black/40 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
          {dataIntegrityIssues.slice(0, expandedIntegrity ? dataIntegrityIssues.length : 2).map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2 text-foreground/85">
              <Icon name="error_outline" size={14} className="text-destructive shrink-0 mt-0.5" />
              <span className="text-[11px] leading-tight break-words">{issue}</span>
            </div>
          ))}
          {dataIntegrityIssues.length > 2 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setExpandedIntegrity(prev => !prev); }}
              className="text-[11px] font-bold text-primary hover:underline text-left mt-0.5 cursor-pointer border-none bg-transparent p-0"
            >
              {expandedIntegrity ? 'Show less' : `+${dataIntegrityIssues.length - 2} more issues`}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (handleAutoRepairDatabase) handleAutoRepairDatabase();
            }}
            disabled={isSyncing}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold text-xs h-8.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            <Icon name={isSyncing ? "sync" : "build_circle"} size={15} className={isSyncing ? "animate-spin" :""} />
            <span>{isSyncing ? 'Repairing...' : 'Auto-Repair Database'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (setShowCorruptionModal) setShowCorruptionModal(true);
              setShowNotifications(false);
            }}
            className="apple-glass-btn text-xs font-semibold h-8.5 px-3.5 rounded-xl hover:text-foreground cursor-pointer shrink-0"
          >
            Details
          </button>
        </div>
      </div>
    )
  }

  // Render navigation dock helper (Optimized micro-spacing to fit all icons at once with Apple fluid spring physics)
  const renderNavigationDock = (isFullWidthRow = false, prefix = 'desktop') => {
    if (!visibleNavItems || visibleNavItems.length === 0) return null
    return (
      <div className={`w-fit max-w-full h-10.5 sm:h-11 md:h-11.5 glass-kormiis rounded-full p-1 flex items-center justify-center border border-black/8 dark:border-white/8 menu-bar-dock shadow-none ${isFullWidthRow ? 'mx-auto' : ''}`}>
        <nav 
          aria-label="Main page navigation" 
          className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 overflow-x-auto no-scrollbar scrollbar-none select-none scroll-smooth h-full max-w-full menu-bar-dock px-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {visibleNavItems.filter(item => item.id !== 'profile').map(item => {
            const isActive = currentView === item.id;
            return (
              <TooltipPopover key={item.id} label={item.label} isCollapsed={!isActive} isDarkMode={isDark} side="bottom">
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
  }

  return (
    <div ref={topbarRef} className="relative w-full flex flex-col items-center pointer-events-auto">
      {/* Row 1: Unified Top Navigation Header (Logo Left, Inline Menu on XL+ screens, Actions Right) */}
      <header 
        aria-label="Top navigation bar" 
        className="relative z-10 pointer-events-auto w-full h-20 sm:h-22 md:h-24 px-4 sm:px-6 md:px-8 flex items-center justify-between pt-3 sm:pt-4 md:pt-5 pb-2.5 sm:pb-3 md:pb-3.5 gap-2 sm:gap-4 text-foreground bg-transparent !bg-transparent border-none !border-none shadow-none backdrop-blur-[32px] backdrop-saturate-[190%]"
        style={{ background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', backdropFilter: 'saturate(190%) blur(32px)', WebkitBackdropFilter: 'saturate(190%) blur(32px)' }}
      >
        
        {/* 1. Leftmost: Brand Logo (Containerless Pure Standalone) & Quick Integrity Alert */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 h-[48px] sm:h-[54px]">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (setCurrentView) setCurrentView('dashboard');
            }}
            className="flex items-center justify-center cursor-pointer outline-none no-underline border-none bg-transparent p-0 m-0 shadow-none select-none h-full transition-transform active:scale-95"
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
            title="Kormiis Dashboard"
          >
            <img
              src={isDark ? kormiisWhiteLogo : kormiisLogo}
              alt="Kormiis Logo"
              className="h-7 sm:h-8 md:h-8.5 w-auto max-w-[120px] sm:max-w-[140px] md:max-w-[150px] object-contain shrink-0 select-none block"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', filter: 'none' }}
            />
          </a>

          {/* Data Integrity / Auto-Repair Alert (if discrepancies exist) */}
          {hasIntegrityIssues && (
            <button
              onClick={() => setShowCorruptionModal && setShowCorruptionModal(true)}
              className="flex items-center gap-1 px-3 h-9 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all cursor-pointer animate-pulse shrink-0"
              title={`${dataIntegrityIssues.length} data discrepancies detected`}
            >
              <Icon name="warning" size={15} />
              <span className="hidden sm:inline">{dataIntegrityIssues.length}</span>
            </button>
          )}
        </div>

        {/* 2. Center: Centered Menu Bar Dock (Desktop lg+ only; completely hidden on mobile & tablet) */}
        {!isMobile && (
          <div className="hidden lg:flex flex-1 items-center justify-center min-w-0 px-2 sm:px-3 md:px-4">
            {renderNavigationDock(false, 'desktop')}
          </div>
        )}

        {/* 3. Rightmost: Actions Group (Containerless Standalone Icons, Ultra-Compact gap-[1.6px]) */}
        <div className="flex items-center gap-[1.6px] shrink-0 h-[48px] sm:h-[54px]">
          {/* Kormiis AI Trigger (Desktop/Tablet - plain icon, expands to orange pill + label when active like menu bar) */}
          <div className="hidden lg:flex items-center justify-center">
            <TooltipPopover label="Open Kormiis AI (Ctrl+Space)" side="bottom">
              <motion.button
                layout
                data-ai-trigger="true"
                onClick={() => { if (onOpenAi) onOpenAi() }}
                aria-label="Open Kormiis AI"
                aria-expanded={isAiOpen}
                whileTap={{ scale: 0.94 }}
                transition={{ layout: { type: 'spring', stiffness: 440, damping: 32, mass: 0.7 } }}
                className={`relative flex items-center rounded-full select-none cursor-pointer border-0 !border-none outline-none transition-colors duration-150 ${
                  isAiOpen
                    ? 'px-3 sm:px-3.5 h-9 sm:h-9.5 gap-1.5 text-white font-bold z-10'
                    : 'size-9 sm:size-10 justify-center text-foreground/75 hover:text-foreground p-0'
                }`}
                style={isAiOpen ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', color: '#ffffff', border: 'none', outline: 'none' } : { background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
              >
                <span className={`relative z-10 shrink-0 flex items-center justify-center ${isAiOpen ? 'text-white scale-105' : ''}`}>
                  <AiQuantumGlyph size={24} />
                </span>

                <AnimatePresence initial={false}>
                  {isAiOpen && (
                    <motion.span
                      key="ai-active-label"
                      initial={{ opacity: 0, width: 0, filter: 'blur(3px)', x: -3 }}
                      animate={{ opacity: 1, width: 'auto', filter: 'blur(0px)', x: 0 }}
                      exit={{ opacity: 0, width: 0, filter: 'blur(3px)', x: -3 }}
                      transition={{ type: 'spring', stiffness: 440, damping: 30, mass: 0.65 }}
                      className="relative z-10 text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden inline-block leading-none !text-white"
                    >
                      Kormiis AI
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipPopover>
          </div>

          {showThemeToggle && (
            <TooltipPopover label={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} side="bottom">
              <button
                onClick={toggleTheme}
                aria-label="Toggle light/dark theme"
                className="size-9 sm:size-10 bg-transparent border-none shadow-none outline-none text-foreground/75 hover:text-foreground shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-all p-0"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              >
                {themeMode === 'light' ? <Icon name="light_mode" size={24} /> : <Icon name="dark_mode" size={24} />}
              </button>
            </TooltipPopover>
          )}

          {/* Notifications Trigger (Containerless - Desktop only, shown in bottom bar on mobile/tablet) */}
          <div className="relative hidden lg:flex items-center justify-center">
            <TooltipPopover label="Notifications" side="bottom">
              <button
                ref={buttonRef}
                onClick={() => { 
                  if (isAiOpen && onOpenAi) onOpenAi()
                  setShowNotifications(prev => !prev); 
                  if (markNotificationsRead) markNotificationsRead();
                }}
                aria-label="Notifications"
                className="size-9 sm:size-10 bg-transparent border-none shadow-none outline-none text-foreground/75 hover:text-foreground relative shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-all p-0"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                id="notification-trigger"
              >
                <Icon name="notifications_active" size={24} />
                {totalUnreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                  </span>
                )}
              </button>
            </TooltipPopover>
          </div>

          {/* User Profile Trigger Button (Containerless) */}
          {user && (
            <TooltipPopover label={user?.name ? `${user.name} (Profile)` : "My Profile"} side="bottom">
              <button
                onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
                aria-label="Open Profile"
                className={`size-9 sm:size-10 bg-transparent border-none shadow-none outline-none shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-all p-0 ${
                  currentView === 'profile' ? 'text-primary ring-2 ring-primary/40 rounded-full' : 'text-foreground/75 hover:text-foreground'
                }`}
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 object-cover rounded-full select-none" />
                ) : (
                  <Icon name="person" size={25} />
                )}
              </button>
            </TooltipPopover>
          )}
        </div>
      </header>

      {/* Floating Notification Popover / Dropdown — absolute floating overlay */}
      {showNotifications && (
        <div 
          data-notif-panel 
          className="pointer-events-auto z-50 absolute top-[calc(100%+12px)] sm:top-[calc(100%+16px)] right-2 sm:right-4 md:right-6 w-[94vw] sm:w-[480px] max-w-lg glass-kormiis rounded-[28px] border border-black/8 dark:border-white/8 shadow-none animate-in slide-in-from-top-2 fade-in duration-200"
        >
          {/* Topmost Right Close Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}
            title="Close notifications"
            aria-label="Close notifications"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 rounded-full size-8 apple-glass-btn text-foreground/70 hover:text-foreground flex items-center justify-center cursor-pointer transition-all active:scale-90"
          >
            <Icon name="close" size={18} />
          </button>

          <div className="flex flex-col max-h-[min(65vh,540px)] overflow-y-auto p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2.5 space-y-0 shrink-0 pr-10">
              <div className="flex items-center gap-2">
                <Icon name="notifications" size={24} className="text-foreground shrink-0" />
                <h2 className="text-fluid-lg font-black tracking-tight text-foreground m-0 leading-tight">Notifications</h2>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (markNotificationsRead) markNotificationsRead(); }}
                    title="Mark all as read"
                    className="apple-glass-btn text-xs font-semibold px-2.5 py-1 rounded-full text-foreground/80 hover:text-foreground flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Icon name="done_all" size={14} />
                    <span className="hidden min-[400px]:inline">Mark Read</span>
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Tab Filter Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 dark:bg-white/[0.05] rounded-2xl border border-border/60 dark:border-white/[0.08] mb-3 shrink-0">
              <button 
                onClick={() => setNotificationTab('all')}
                className={`flex-1 h-7.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  notificationTab === 'all' 
                    ? 'bg-white text-foreground shadow-xs border border-border/50 dark:bg-white/20 dark:border-white/10' 
                    : 'text-muted-foreground hover:text-foreground bg-transparent'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${notificationTab === 'all' ? 'bg-black/[0.06] dark:bg-white/20 text-foreground' : 'bg-black/[0.04] dark:bg-white/10 text-muted-foreground'}`}>
                  {notifications.length + (hasIntegrityIssues ? 1 : 0)}
                </span>
              </button>
              <button 
                onClick={() => setNotificationTab('unread')}
                className={`flex-1 h-7.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  notificationTab === 'unread' 
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground bg-transparent'
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${notificationTab === 'unread' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-destructive/15 text-destructive'}`}>
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
              {renderDataIntegrityCard()}

              {filteredNotifications.length === 0 && !hasIntegrityIssues ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
                  <Icon name="notifications_off" size={36} className="text-foreground/40 dark:text-foreground/50 mb-0.5" />
                  <p className="text-fluid-sm font-bold text-foreground m-0">No Notifications</p>
                  <p className="text-fluid-xs font-normal text-muted-foreground max-w-[220px] m-0 leading-relaxed">
                    {notificationTab === 'unread' ? 'No unread notifications right now.' : 'You have no new notifications right now.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(n => {
                  const meta = CATEGORY_META[n.category] || CATEGORY_META[n.view] || CATEGORY_META.notice || CATEGORY_META.system
                  const isUnread = !n.read

                  return (
                    <div 
                      role="listitem" 
                      key={n.id} 
                      onClick={() => navigateToView(n.view, n.id)}
                      className={`group p-3 sm:p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border relative select-none flex items-start gap-3 active:scale-[0.99] ${
                        isUnread 
                          ? 'bg-primary/[0.07] dark:bg-primary/[0.14] hover:bg-primary/[0.11] dark:hover:bg-primary/[0.20] border-primary/25 shadow-xs' 
                          : 'bg-white/60 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none'
                      }`}
                    >
                      <Icon name={meta.icon} size={26} className="shrink-0 text-foreground transition-transform group-hover:scale-105 mt-0.5" />

                      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span 
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{ background: `${meta.color}15`, color: meta.color }}
                          >
                            {meta.label || 'Notice'}
                          </span>
                          {isUnread && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                              NEW
                            </span>
                          )}
                        </div>

                        {n.title && n.title !== n.text && (
                          <p className="text-fluid-sm font-bold m-0 mt-1 leading-snug text-foreground break-words">{n.title}</p>
                        )}

                        <p className={`text-fluid-xs m-0 mt-0.5 leading-relaxed text-foreground/85 dark:text-foreground/90 break-words ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                          {n.text}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                            <Icon name="schedule" size={12} className="opacity-70" />
                            <span>{getRelativeTime(n.timestamp || n.time) || n.time || 'Just now'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {isManagerOrAdmin && (n.category === 'leave' || n.category === 'leaves') && (n.title?.toLowerCase().includes('request') || n.text?.toLowerCase().includes('request')) && (
                              <>
                                <button type="button" onClick={(e) => handleQuickAction(e, n, 'approve_leave')} className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                  <Icon name="check" size={12} /><span>Approve</span>
                                </button>
                                <button type="button" onClick={(e) => handleQuickAction(e, n, 'reject_leave')} className="h-6.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                  <Icon name="close" size={12} /><span>Reject</span>
                                </button>
                              </>
                            )}

                            {isManagerOrAdmin && (n.category === 'expense' || n.category === 'expenses') && (n.title?.toLowerCase().includes('submitted') || n.text?.toLowerCase().includes('claim') || n.text?.toLowerCase().includes('submitted')) && (
                              <>
                                <button type="button" onClick={(e) => handleQuickAction(e, n, 'approve_expense')} className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                  <Icon name="check" size={12} /><span>Approve</span>
                                </button>
                                <button type="button" onClick={(e) => handleQuickAction(e, n, 'reject_expense')} className="h-6.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                  <Icon name="close" size={12} /><span>Reject</span>
                                </button>
                              </>
                            )}

                            {(n.category === 'task' || n.category === 'tasks') && !n.text?.toLowerCase().includes('completed') && (
                              <button type="button" onClick={(e) => handleQuickAction(e, n, 'complete_task')} className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                <Icon name="check_circle" size={12} /><span>Mark Done</span>
                              </button>
                            )}

                            {n.view && (
                              <button type="button" onClick={(e) => handleQuickAction(e, n, 'view')} className="h-6.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold border border-primary/25 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs">
                                <span>Open</span><Icon name="arrow_forward" size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-row items-center justify-between pt-3 mt-3 border-t border-border/80 dark:border-white/12 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); if(clearNotifications) clearNotifications(); }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Icon name="delete_sweep" size={16} />
                <span>Clear All</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }}
                className="liquid-glass-btn h-8 px-4.5 rounded-full text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corruption / Data Integrity Modal */}
      {showCorruptionModal !== undefined && (
        <Dialog open={showCorruptionModal} onOpenChange={setShowCorruptionModal}>
          <DialogContent className="max-w-md bg-card border-destructive/20 shadow-2xl p-0 overflow-hidden sm:rounded-[24px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600 z-10" />
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2.5 text-foreground">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 text-destructive shrink-0">
                  <Icon name="warning" size={22} />
                </div>
                Data Integrity Issues
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-2">
              <p className="text-fluid-sm text-muted-foreground leading-relaxed mb-4">
                We found {dataIntegrityIssues?.length || 0} discrepancies in your data. Clicking <strong>Auto-Repair</strong> will automatically clean up orphaned records, fix incorrect values, and rebuild your local cache to match the cloud database.
              </p>
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 mb-4">
                {(dataIntegrityIssues || []).map((issue, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-foreground">
                    <Icon name="error_outline" size={16} className="text-destructive shrink-0 mt-0.5" />
                    <span className="leading-tight font-medium text-xs sm:text-sm">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="p-4 px-6 bg-muted/10 pb-6 flex justify-end gap-3 mt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowCorruptionModal(false)} className="rounded-full font-semibold">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => { if(handleAutoRepairDatabase) handleAutoRepairDatabase(); }} 
                disabled={isSyncing}
                className="rounded-full shadow-lg shadow-destructive/20 font-bold px-6"
              >
                {isSyncing ? 'Repairing...' : 'Auto-Repair Database'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
