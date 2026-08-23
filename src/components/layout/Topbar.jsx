import Icon from "@/components/ui/Icon.jsx"
import { CATEGORY_META } from "../../services/pushNotifications.js"
import { Button } from "@/components/ui/button"
import kormiisLogo from '../../Assets/Kormiis Logo Final.svg'
import kormiisWhiteLogo from '../../Assets/Kormiis white Logo.svg'

import { useState, useEffect, useRef } from 'react'
import { Badge } from "@/components/ui/badge"
import { getRelativeTime } from '../../services/date.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import AiCoPilotModal from '../ai/AiCoPilotModal.jsx'

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
  addToast
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const buttonRef = useRef(null)
  const [modalPos, setModalPos] = useState({ top: 0, right: 0 })
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
      resizeTimer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150)
    }
    window.addEventListener('resize', handleResize)
    return () => { clearTimeout(resizeTimer); window.removeEventListener('resize', handleResize) }
  }, [])

  useEffect(() => {
    if (showNotifications && !isMobile && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const popoverWidth = Math.min(400, window.innerWidth - 24)
      const idealRight = window.innerWidth - rect.right - 8
      const safeRight = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, idealRight))
      setModalPos({
        top: rect.bottom + 10,
        right: safeRight,
        width: popoverWidth
      })
    }
  }, [showNotifications, isMobile])

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
            <Icon name={isSyncing ? "sync" : "build_circle"} size={15} className={isSyncing ? "animate-spin" : ""} />
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

  return (
    <>
      {/* Mobile: Liquid Glass Top Bar */}
      {isAiOpen ? (
        <header
          aria-label="Kormiis AI Co-Pilot"
          className="topbar pointer-events-auto w-[98%] min-[400px]:w-[94%] sm:w-[85%] max-w-3xl mx-auto h-[min(78vh,580px)] flex flex-col rounded-[28px] sm:rounded-[32px] glass-kormiis-modal text-foreground transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.50),0_0_20px_0_rgba(0,0,0,0.20)] overflow-hidden backdrop-blur-3xl border border-white/35 dark:border-white/16 relative"
        >
          <AiCoPilotModal
            isMorphMode={true}
            isOpen={true}
            onClose={() => onOpenAi && onOpenAi()}
            currentUser={user}
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
            initialAction={aiModalAction}
          />
        </header>
      ) : isMobile ? (
        <header aria-label="Top bar" className="topbar topbar-mobile-bar pointer-events-auto w-full h-14 px-4 flex items-center justify-between glass-apple text-foreground transition-all duration-300 rounded-none border-x-0 border-t-0 border-b border-border/80 dark:border-white/12">
          <div className="flex items-center shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('dashboard');
              }}
              className="flex items-center cursor-pointer transition-opacity hover:opacity-80 active:scale-95 outline-none no-underline border-none bg-transparent p-0 m-0 shadow-none"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
              title="Kormiis Dashboard"
            >
              <img
                src={isDark ? kormiisWhiteLogo : kormiisLogo}
                alt="Kormiis Logo"
                className="h-7 sm:h-8 w-auto max-w-[120px] object-contain shrink-0 drop-shadow-sm transition-opacity"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              />
            </a>
          </div>

          {/* Right: Actions Group (Theme, Notification, Profile) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                title={`Theme: ${themeMode}`}
                aria-label="Toggle light/dark theme"
                className="rounded-full size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                {themeMode === 'light' ? <Icon name="light_mode" size={18} /> : <Icon name="dark_mode" size={18} />}
              </button>
            )}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => {
                  setShowNotifications(prev => !prev);
                  if (markNotificationsRead) markNotificationsRead();
                }}
                title="Notifications"
                aria-label="Notifications"
                className="rounded-full size-9 text-foreground apple-glass-btn relative shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                id="notification-trigger"
              >
                <Icon name="notifications_active" size={18} />
                {totalUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                  </span>
                )}
              </button>
            </div>
            {user && (
              <button
                onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
                title={user?.name ? `${user.name} (My Profile)` : "My Profile"}
                aria-label="Open Profile"
                className="rounded-full size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                <Icon name="person" size={19} />
              </button>
            )}
          </div>
        </header>
      ) : (
        <header aria-label="Top bar" className="topbar pointer-events-auto w-[98%] min-[400px]:w-[94%] sm:w-[85%] max-w-3xl mx-auto h-14 sm:h-16 px-3 sm:px-4 md:px-5 flex items-center justify-between rounded-full glass-apple text-foreground transition-all duration-300">
          
          {/* Left: Brand Logo & Quick Search */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('dashboard');
              }}
              className="flex items-center cursor-pointer transition-opacity hover:opacity-80 active:scale-95 outline-none no-underline border-none bg-transparent p-0 m-0 shadow-none"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}
              title="Kormiis Dashboard"
            >
              <img
                src={isDark ? kormiisWhiteLogo : kormiisLogo}
                alt="Kormiis Logo"
                className="h-7 sm:h-8 md:h-9 w-auto max-w-[120px] sm:max-w-[140px] object-contain shrink-0 drop-shadow-sm transition-opacity"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              />
            </a>

            {/* Data Integrity / Auto-Repair Alert (if discrepancies exist) */}
            {hasIntegrityIssues && (
              <button
                onClick={() => setShowCorruptionModal && setShowCorruptionModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all cursor-pointer animate-pulse"
                title={`${dataIntegrityIssues.length} data discrepancies detected`}
              >
                <Icon name="warning" size={14} />
                <span className="hidden sm:inline">{dataIntegrityIssues.length}</span>
              </button>
            )}
          </div>

          {/* Right: Actions Group (AI, Theme, Notification, Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* AI Co-Pilot Trigger Button (Visible on Tablet/iPad & Desktop) */}
            {onOpenAi && (
              <button
                onClick={onOpenAi}
                title="Kormiis AI Co-Pilot"
                aria-label="Toggle Kormiis AI"
                className={`rounded-full size-9 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                  isAiOpen
                    ? 'bg-primary/20 text-primary border-primary/40 shadow-xs'
                    : 'text-foreground'
                }`}
              >
                <Icon name="auto_awesome" size={18} className={isAiOpen ? 'text-primary' : 'text-foreground'} />
              </button>
            )}

            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                title={`Switch Theme (Current: ${themeMode})`}
                aria-label="Toggle light/dark theme"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                {themeMode === 'light' ? <Icon name="light_mode" size={18} /> : <Icon name="dark_mode" size={18} />}
              </button>
            )}

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => { 
                  setShowNotifications(prev => !prev); 
                  if (markNotificationsRead) markNotificationsRead();
                }}
                title="Notifications"
                aria-label="Notifications"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn relative shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                id="notification-trigger"
              >
                <Icon name="notifications_active" size={18} />
                {totalUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                  </span>
                )}
              </button>
            </div>

            {/* User Profile Trigger Button */}
            {user && (
              <button
                onClick={onProfileClick || (() => setCurrentView && setCurrentView('profile'))}
                title={user?.name ? `${user.name} (My Profile)` : "My Profile"}
                aria-label="Open Profile"
                className="rounded-full size-9 sm:size-9 text-foreground apple-glass-btn shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              >
                <Icon name="person" size={19} />
              </button>
            )}
          </div>
        </header>
      )}

      {/* Notification Modal - Identical Liquid Glass architecture to other modals */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/80 dark:border-white/12 pb-3.5 mb-1 space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="size-8.5 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shrink-0 shadow-inner">
                <Icon name="notifications" size={19} />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-fluid-lg font-black tracking-tight text-foreground m-0 leading-tight">
                  Notifications
                </DialogTitle>
                <DialogDescription className="text-[11px] font-medium text-muted-foreground m-0 mt-0.5">
                  {totalUnreadCount > 0 ? `${totalUnreadCount} unread update${totalUnreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (markNotificationsRead) markNotificationsRead();
                  }}
                  title="Mark all as read"
                  className="apple-glass-btn text-xs font-semibold px-2.5 py-1 rounded-full text-foreground/80 hover:text-primary flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Icon name="done_all" size={14} />
                  <span className="hidden min-[400px]:inline">Mark Read</span>
                </button>
              )}
              <Badge variant="secondary" className="text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {totalItemCount} Total
              </Badge>
            </div>
          </DialogHeader>

          {/* Segmented Tab Filter Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 dark:bg-white/[0.05] rounded-2xl border border-border/60 dark:border-white/[0.08] my-1">
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
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground bg-transparent'
              }`}
            >
              <span>Unread</span>
              {totalUnreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${notificationTab === 'unread' ? 'bg-white/20 text-white' : 'bg-destructive/15 text-destructive'}`}>
                  {totalUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[50vh] sm:max-h-[420px] overflow-y-auto py-2 flex flex-col gap-2.5">
            {renderDataIntegrityCard()}

            {filteredNotifications.length === 0 && !hasIntegrityIssues ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2.5">
                <div className="size-13 rounded-2xl bg-primary/[0.08] dark:bg-primary/[0.15] flex items-center justify-center text-primary/70 mb-0.5">
                  <Icon name="notifications_off" size={26} />
                </div>
                <p className="text-fluid-sm font-bold text-foreground m-0">All caught up!</p>
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
                    {/* Category Icon */}
                    <Icon name={meta.icon} size={26} className="shrink-0 text-foreground transition-transform group-hover:scale-105 mt-0.5" />

                    {/* Content */}
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ 
                            background: `${meta.color}15`, 
                            color: meta.color 
                          }}
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
                        <p className="text-fluid-sm font-bold m-0 mt-1 leading-snug text-foreground break-words">
                          {n.title}
                        </p>
                      )}

                      <p className={`text-fluid-xs m-0 mt-0.5 leading-relaxed text-foreground/85 dark:text-foreground/90 break-words ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                        {n.text}
                      </p>

                      {/* Bottom row: Timestamp + Quick Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                          <Icon name="schedule" size={12} className="opacity-70" />
                          <span>{getRelativeTime(n.timestamp || n.time) || n.time || 'Just now'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          {/* Leave Quick Actions for Admin/HR */}
                          {isManagerOrAdmin && (n.category === 'leave' || n.category === 'leaves') && (n.title?.toLowerCase().includes('request') || n.text?.toLowerCase().includes('request')) && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleQuickAction(e, n, 'approve_leave')}
                                className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                              >
                                <Icon name="check" size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleQuickAction(e, n, 'reject_leave')}
                                className="h-6.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                              >
                                <Icon name="close" size={12} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Expense Quick Actions for Admin/HR */}
                          {isManagerOrAdmin && (n.category === 'expense' || n.category === 'expenses') && (n.title?.toLowerCase().includes('submitted') || n.text?.toLowerCase().includes('claim') || n.text?.toLowerCase().includes('submitted')) && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleQuickAction(e, n, 'approve_expense')}
                                className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                              >
                                <Icon name="check" size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleQuickAction(e, n, 'reject_expense')}
                                className="h-6.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                              >
                                <Icon name="close" size={12} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Task Quick Action */}
                          {(n.category === 'task' || n.category === 'tasks') && !n.text?.toLowerCase().includes('completed') && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAction(e, n, 'complete_task')}
                              className="h-6.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                            >
                              <Icon name="check_circle" size={12} />
                              <span>Mark Done</span>
                            </button>
                          )}

                          {/* View link button */}
                          {n.view && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAction(e, n, 'view')}
                              className="h-6.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold border border-primary/25 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                            >
                              <span>Open</span>
                              <Icon name="arrow_forward" size={11} />
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

          <DialogFooter className="flex flex-row items-center justify-between pt-4 mt-2 border-t border-border/80 dark:border-white/12">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}
