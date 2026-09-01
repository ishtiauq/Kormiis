import React, { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import { AiQuantumGlyph } from '../ai/AiExpandableFab.jsx'
import NavigationDock from './NavigationDock.jsx'
import { sendChatMessage } from '../../services/aiAgent.js'
import { CATEGORY_META } from '../../services/pushNotifications.js'
import { getRelativeTime } from '../../services/date.js'

const springPhysics = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.5
}

const NOTIF_ICONS = {
  leaves: 'event_busy',
  leave: 'event_busy',
  attendance: 'schedule',
  payroll: 'payments',
  tasks: 'assignment',
  'my-tasks': 'assignment',
  assets: 'inventory_2',
  'my-assets': 'inventory_2',
  announcements: 'campaign',
  calendar: 'event',
  events: 'event',
  system: 'notifications',
  notice: 'info'
}

const AI_QUICK_CHIPS = [
  'Attendance summary today',
  'Total payroll breakdown',
  'Draft company announcement',
  'Who is on leave today?'
]

export const MobileResponsiveBottomBar = memo(({
  visibleNavItems = [],
  currentView = 'dashboard',
  setCurrentView,
  isDark = true,
  onOpenAi,
  isAiOpen = false,
  onOpenNotifications,
  isNotificationsOpen = false,
  notifications = [],
  markNotificationsRead,
  clearNotifications,
  unreadCount: propUnreadCount,
  onProfileClick,
  user,
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
  addToast,
  isScrollingDown = false,
  prefix = 'bottom'
}) => {
  // 'menu' | 'notifications' | 'ai' | null
  const [expandedSection, setExpandedSection] = useState(null)
  const [notificationTab, setNotificationTab] = useState('all')
  const menuContainerRef = useRef(null)
  const messagesEndRef = useRef(null)

  const sessionsStorageKey = `kormiis_ai_sessions_${user?.id || user?.uid || 'admin'}`
  const createInitialSession = (name) => ({
    id: `session-${Date.now()}`,
    title: 'New Conversation',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'welcome',
        role: 'model',
        text: `Hello ${name ? name.split(' ')[0] : 'there'}! 👋 I am your Kormiis AI assistant. How can I help you with HR, attendance, or workspace tasks?`,
        timestamp: new Date().toISOString()
      }
    ]
  })

  // Multi-session State (Persisted in localStorage, shared with desktop)
  const [aiSessions, setAiSessions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(sessionsStorageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
            if (valid.length > 0) {
              return [createInitialSession(user?.name), ...valid]
            }
          }
        } catch (e) {
          console.error('Failed to parse AI sessions', e)
        }
      }
    }
    return [createInitialSession(user?.name)]
  })

  const [activeSessionId, setActiveSessionId] = useState(() => aiSessions[0]?.id || `session-${Date.now()}`)
  const [showAiHistory, setShowAiHistory] = useState(false)
  const [historySearch, setHistorySearch] = useState('')

  // Active Session and its messages
  const activeSession = aiSessions.find(s => s.id === activeSessionId) || aiSessions[0]
  const aiMessages = activeSession?.messages || []

  // Persist only meaningful conversations to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userSessions = aiSessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
      try {
        localStorage.setItem(sessionsStorageKey, JSON.stringify(userSessions.slice(0, 30)))
      } catch (e) {
        console.error('Failed to save AI sessions', e)
      }
    }
  }, [aiSessions, sessionsStorageKey])

  const setAiMessages = (updater) => {
    setAiSessions(prev => {
      return prev.map(s => {
        if (s.id === activeSessionId) {
          const newMsgs = typeof updater === 'function' ? updater(s.messages) : updater
          const firstUser = newMsgs.find(m => m.role === 'user')
          const newTitle = firstUser 
            ? (firstUser.text.slice(0, 34) + (firstUser.text.length > 34 ? '...' : '')) 
            : s.title
          return {
            ...s,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: newMsgs
          }
        }
        return s
      })
    })
  }

  // Embedded AI State
  const [aiInput, setAiInput] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)
  const fileInputRef = useRef(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isAiListening, setIsAiListening] = useState(false)

  const isExpanded = expandedSection !== null
  const isMenuExpanded = expandedSection === 'menu'
  const isNotifExpanded = expandedSection === 'notifications'
  const isAiExpanded = expandedSection === 'ai'

  const actualUnreadCount = propUnreadCount ?? (notifications ? notifications.filter(n => !n.read).length : 0)
  const filteredNotifications = notificationTab === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications

  const aiHistorySessions = aiSessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
  const filteredHistorySessions = aiHistorySessions.filter(s => {
    if (!historySearch.trim()) return true
    const term = historySearch.toLowerCase()
    return (s.title && s.title.toLowerCase().includes(term)) || s.messages.some(m => m.text?.toLowerCase().includes(term))
  })

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setExpandedSection(null)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [isExpanded])

  // Close on Escape key
  useEffect(() => {
    if (!isExpanded) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setExpandedSection(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  // Auto-scroll AI messages
  useEffect(() => {
    if (isAiExpanded && !showAiHistory && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [aiMessages, isAiExpanded, isAiLoading, showAiHistory])

  const handleSelectTab = (tabId) => {
    if (setCurrentView) setCurrentView(tabId)
    setExpandedSection(null)
  }

  const handleToggleMenu = () => {
    setExpandedSection(prev => prev === 'menu' ? null : 'menu')
  }

  const handleToggleNotifications = () => {
    setExpandedSection(prev => prev === 'notifications' ? null : 'notifications')
  }

  const handleToggleAi = () => {
    setExpandedSection(prev => prev === 'ai' ? null : 'ai')
  }

  // Handle File Selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      if (addToast) addToast('File size must be under 10MB', 'warning')
      return
    }

    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result
        })
      }
    } catch (err) {
      if (addToast) addToast('Could not process file', 'error')
    }
  }

  // Handle New Chat
  const handleNewChat = () => {
    const newSession = createInitialSession(user?.name)
    setAiSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setShowAiHistory(false)
    setAttachedFile(null)
    if (addToast) addToast('Started new AI conversation', 'info')
  }

  // Handle Select Session from History
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId)
    setShowAiHistory(false)
    setAttachedFile(null)
  }

  // Handle Delete Session
  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation()
    setAiSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId)
      if (remaining.length === 0) {
        const initial = createInitialSession(user?.name)
        setActiveSessionId(initial.id)
        return [initial]
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id)
      }
      return remaining
    })
    if (addToast) addToast('Deleted conversation from history', 'info')
  }

  // Handle Clear All History
  const handleClearAllHistory = () => {
    const initial = createInitialSession(user?.name)
    setAiSessions([initial])
    setActiveSessionId(initial.id)
    setShowAiHistory(false)
    setAttachedFile(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(sessionsStorageKey)
    }
    if (addToast) addToast('All conversation history cleared', 'info')
  }

  // Send AI Message
  const handleSendAiMessage = async (customPrompt) => {
    const textToSend = customPrompt || aiInput.trim()
    if ((!textToSend && !attachedFile) || isAiLoading) return

    const fileToSend = attachedFile
    setAttachedFile(null)

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend || `[Attached File: ${fileToSend?.name}]`,
      fileData: fileToSend,
      timestamp: new Date().toISOString()
    }

    setAiMessages(prev => [...prev, userMsg])
    setAiInput('')
    setIsAiLoading(true)

    try {
      const historyForAi = aiMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, text: m.text }))

      const promptWithFile = fileToSend 
        ? `${textToSend ? textToSend + '\n\n' : ''}[User attached file: ${fileToSend.name} (${Math.round(fileToSend.size / 1024)} KB)]`
        : textToSend

      const result = await sendChatMessage(promptWithFile, historyForAi, {
        employees,
        setEmployees,
        payroll,
        setPayroll,
        attendance,
        setAttendance,
        expenses,
        setExpenses,
        announcements,
        setAnnouncements,
        tasks,
        setTasks,
        settings,
        currentUser: user,
        addToast,
        setCurrentView: (view) => {
          if (setCurrentView) setCurrentView(view)
          setExpandedSection(null)
        }
      })

      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: result.text || "I've completed your request.",
        timestamp: new Date().toISOString()
      }

      setAiMessages(prev => [...prev, modelMsg])
    } catch (err) {
      console.error('AI error', err)
      setAiMessages(prev => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          text: "I encountered an issue processing your request. Please try again.",
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsAiLoading(false)
    }
  }

  // Voice Input Toggle
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      if (addToast) addToast('Voice recognition is not supported in this browser', 'warning')
      return
    }

    if (isAiListening) {
      setIsAiListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsAiListening(true)
      recognition.onend = () => setIsAiListening(false)
      recognition.onerror = () => setIsAiListening(false)

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript
        if (transcript) {
          setAiInput(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.start()
    } catch (e) {
      console.error('Speech error', e)
      setIsAiListening(false)
    }
  }

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'HR Manager' || user?.isWorkspaceOwner

  const navigateToView = (viewTarget, notifId) => {
    if (viewTarget && setCurrentView) {
      let mapped = viewTarget
      if (!isManagerOrAdmin) {
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
      setCurrentView(mapped)
    }
    if (markNotificationsRead && notifId) {
      markNotificationsRead(notifId)
    }
    setExpandedSection(null)
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

  return (
    <div 
      ref={menuContainerRef}
      className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end pointer-events-none px-3 sm:px-4 pb-3.5 sm:pb-4 transition-transform duration-300 ${
        isScrollingDown && !isExpanded && !isNotificationsOpen && !isAiOpen
          ? 'translate-y-full opacity-0' 
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* ======================================================== */}
      {/* 1. TABLET & IPAD (>= 640px and <= 1368px): Full Navigation Dock */}
      {/* ======================================================== */}
      <div className="hidden sm:block pointer-events-auto max-w-fit shadow-none">
        <NavigationDock
          visibleNavItems={visibleNavItems}
          currentView={currentView}
          setCurrentView={setCurrentView}
          isDark={isDark}
          prefix={`${prefix}-tablet`}
          className="!border-black/10 dark:!border-white/10 !bg-transparent backdrop-blur-2xl"
        />
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE HANDSETS (< 640px): Accordion Bottom Bar */}
      {/* ======================================================== */}
      <div className="sm:hidden w-full flex flex-col items-center pointer-events-auto">
        
        {/* Backdrop Click Catcher (Zero visual dark overlay) */}
        {isExpanded && (
          <div
            onClick={() => setExpandedSection(null)}
            className="fixed inset-0 z-30 bg-transparent pointer-events-auto"
            aria-hidden="true"
          />
        )}

        {/* Unified Accordion Card: Expands upwards on Menu, AI, or Notification click */}
        <motion.div
          layout
          transition={{
            layout: {
              type: "spring",
              stiffness: 440,
              damping: 34,
              mass: 0.6
            },
            borderRadius: { duration: 0.18, ease: [0.32, 0.72, 0, 1] }
          }}
          className={`relative z-40 w-full max-w-[345px] xs:max-w-[370px] glass-kormiis border border-black/10 dark:border-white/14 shadow-none flex flex-col overflow-hidden px-3.5 ${
            isExpanded 
              ? 'rounded-[28px] pt-3 pb-1' 
              : 'rounded-full py-0'
          }`}
          style={{
            background: 'transparent',
            backgroundColor: 'transparent',
            backdropFilter: 'saturate(190%) blur(32px)',
            WebkitBackdropFilter: 'saturate(190%) blur(32px)',
            boxShadow: 'none',
            transformOrigin: 'bottom center'
          }}
        >
          {/* ==================================================== */}
          {/* EXPANDABLE ACCORDION SECTION (Top-to-Bottom Collapse / Bottom-to-Top Reveal) */}
          {/* ==================================================== */}
          <AnimatePresence initial={false} mode="wait">
            {isExpanded && (
              <motion.div
                key={`accordion-panel-${expandedSection}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                    y: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  height: 0, 
                  transition: {
                    height: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
                    opacity: { duration: 0.12, ease: 'easeOut' }
                  }
                }}
                className="w-full flex flex-col overflow-hidden"
              >
                {/* 1. MENU MODE */}
                {isMenuExpanded && (
                  <div className="w-full flex flex-col overflow-hidden pb-1">
                    {/* 3x3 Grid of Navigation Items (No Box, Standalone Icon on Top, Name Underneath) */}
                    <div 
                      className="grid grid-cols-3 gap-y-3.5 gap-x-1 max-h-[50vh] overflow-y-auto no-scrollbar pt-0.5 pb-2 px-0.5" 
                      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      {visibleNavItems.filter(item => item.id !== 'profile').map((item) => {
                        const isActive = currentView === item.id;
                        return (
                          <motion.button
                            key={`mob-item-${item.id}`}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            whileTap={{ scale: 0.88 }}
                            transition={{ scale: { duration: 0.12 } }}
                            className="flex flex-col items-center justify-center text-center p-1.5 rounded-2xl cursor-pointer bg-transparent border-0 !border-none shadow-none outline-none gap-1 transition-all select-none"
                            style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                          >
                            {/* Standalone Icon on Top (Zero background box) */}
                            <span 
                              className={`flex items-center justify-center transition-transform ${
                                isActive ? 'text-primary scale-110' : 'text-foreground/75 hover:text-foreground'
                              }`}
                              style={isActive ? { color: '#FE3501' } : undefined}
                            >
                              {item.icon}
                            </span>
                            
                            {/* Menu Name Underneath (No truncation, full name displayed) */}
                            <span 
                              className={`text-[11px] leading-tight text-center whitespace-normal break-words w-full px-0.5 transition-colors ${
                                isActive ? 'text-primary font-bold' : 'text-foreground/75 font-medium'
                              }`}
                              style={isActive ? { color: '#FE3501' } : undefined}
                            >
                              {item.label}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. NOTIFICATIONS MODE (Desktop-grade full rich UI) */}
                {isNotifExpanded && (
                  <div className="w-full flex flex-col overflow-hidden pb-1">
                    {/* Header Row with Title, Badge, and Mark Read */}
                    <div className="flex items-center justify-between pt-1 pb-3 mb-2 px-1 border-none shrink-0">
                      <div className="flex items-center gap-2.5">
                        <Icon name="notifications" size={22} className="text-foreground shrink-0" />
                        <h3 className="text-[15px] font-black tracking-tight text-foreground m-0 leading-tight">
                          Notifications
                        </h3>
                        {actualUnreadCount > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                            {actualUnreadCount}
                          </span>
                        )}
                      </div>

                      {actualUnreadCount > 0 && markNotificationsRead && (
                        <button
                          type="button"
                          onClick={() => markNotificationsRead()}
                          className="apple-glass-btn text-[11px] font-bold px-2.5 py-1 rounded-full text-foreground/80 hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Icon name="done_all" size={13} />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>

                    {/* Segmented Filter Tabs (All / Unread) - High Contrast & Crystal Clear */}
                    <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/[0.06] rounded-2xl border border-black/8 dark:border-white/10 mb-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setNotificationTab('all')}
                        className={`flex-1 h-8 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          notificationTab === 'all'
                            ? 'bg-white text-neutral-900 dark:bg-white/20 dark:text-white shadow-xs border border-black/10 dark:border-white/15'
                            : 'bg-transparent text-muted-foreground hover:text-foreground border border-transparent'
                        }`}
                      >
                        <span>All</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          notificationTab === 'all'
                            ? 'bg-black/10 dark:bg-white/20 text-neutral-900 dark:text-white'
                            : 'bg-black/5 dark:bg-white/10 text-muted-foreground'
                        }`}>
                          {notifications.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotificationTab('unread')}
                        className={`flex-1 h-8 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          notificationTab === 'unread'
                            ? 'bg-white text-neutral-900 dark:bg-white/20 dark:text-white shadow-xs border border-black/10 dark:border-white/15'
                            : 'bg-transparent text-muted-foreground hover:text-foreground border border-transparent'
                        }`}
                      >
                        <span>Unread</span>
                        {actualUnreadCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            notificationTab === 'unread'
                              ? 'bg-destructive text-white'
                              : 'bg-destructive/15 text-destructive'
                          }`}>
                            {actualUnreadCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Notifications List - Generous Vertical Length */}
                    <div 
                      className="flex flex-col gap-2 max-h-[62vh] min-h-[300px] xs:min-h-[360px] overflow-y-auto no-scrollbar py-0.5 px-0.5"
                      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      {filteredNotifications.length === 0 ? (
                        <div className="py-14 px-4 text-center flex flex-col items-center justify-center gap-1.5">
                          <Icon name="notifications_off" size={32} className="text-foreground/40 mb-0.5" />
                          <p className="text-xs font-semibold text-foreground m-0">No Notifications</p>
                          <p className="text-[11px] text-muted-foreground m-0">
                            {notificationTab === 'unread' ? 'No unread notifications right now.' : 'You have no notifications.'}
                          </p>
                        </div>
                      ) : (
                        filteredNotifications.map((n) => {
                          const meta = CATEGORY_META[n.category] || CATEGORY_META[n.view] || CATEGORY_META.notice || CATEGORY_META.system
                          const isUnread = !n.read

                          return (
                            <div
                              key={n.id}
                              onClick={() => navigateToView(n.view, n.id)}
                              className={`p-3 rounded-2xl transition-all duration-200 cursor-pointer border relative select-none flex items-start gap-2.5 active:scale-[0.99] ${
                                isUnread 
                                  ? 'bg-primary/[0.07] dark:bg-primary/[0.14] border-primary/25 shadow-xs' 
                                  : 'bg-black/2 dark:bg-white/4 border-black/5 dark:border-white/6 hover:bg-black/4 dark:hover:bg-white/8'
                              }`}
                            >
                              {/* Category Icon */}
                              <Icon 
                                name={meta.icon} 
                                size={22} 
                                className="shrink-0 text-foreground/80 mt-0.5" 
                              />

                              {/* Content Body */}
                              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span 
                                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                                    style={{ background: `${meta.color}15`, color: meta.color }}
                                  >
                                    {meta.label || 'Notice'}
                                  </span>
                                  {isUnread && (
                                    <span className="flex items-center gap-1 text-[9.5px] font-bold text-primary">
                                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                                      NEW
                                    </span>
                                  )}
                                </div>

                                {n.title && n.title !== (n.text || n.message) && (
                                  <h4 className="text-[12px] font-bold m-0 mt-1 leading-snug text-foreground break-words">
                                    {n.title}
                                  </h4>
                                )}

                                <p className={`text-[11px] m-0 mt-0.5 leading-relaxed text-foreground/85 dark:text-foreground/90 break-words ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                                  {n.text || n.message}
                                </p>

                                {/* Meta timestamp & Quick Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.06]">
                                  <div className="flex items-center gap-1 text-[9.5px] font-medium text-muted-foreground">
                                    <Icon name="schedule" size={11} className="opacity-70" />
                                    <span>{getRelativeTime(n.timestamp || n.time) || n.time || 'Just now'}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {isManagerOrAdmin && (n.category === 'leave' || n.category === 'leaves') && (n.title?.toLowerCase().includes('request') || (n.text || n.message)?.toLowerCase().includes('request')) && (
                                      <>
                                        <button 
                                          type="button" 
                                          onClick={(e) => handleQuickAction(e, n, 'approve_leave')} 
                                          className="h-6 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        >
                                          <Icon name="check" size={11} /><span>Approve</span>
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={(e) => handleQuickAction(e, n, 'reject_leave')} 
                                          className="h-6 px-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        >
                                          <Icon name="close" size={11} /><span>Reject</span>
                                        </button>
                                      </>
                                    )}

                                    {isManagerOrAdmin && (n.category === 'expense' || n.category === 'expenses') && ((n.title?.toLowerCase().includes('submitted') || (n.text || n.message)?.toLowerCase().includes('claim') || (n.text || n.message)?.toLowerCase().includes('submitted'))) && (
                                      <>
                                        <button 
                                          type="button" 
                                          onClick={(e) => handleQuickAction(e, n, 'approve_expense')} 
                                          className="h-6 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        >
                                          <Icon name="check" size={11} /><span>Approve</span>
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={(e) => handleQuickAction(e, n, 'reject_expense')} 
                                          className="h-6 px-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        >
                                          <Icon name="close" size={11} /><span>Reject</span>
                                        </button>
                                      </>
                                    )}

                                    {(n.category === 'task' || n.category === 'tasks') && !(n.text || n.message)?.toLowerCase().includes('completed') && (
                                      <button 
                                        type="button" 
                                        onClick={(e) => handleQuickAction(e, n, 'complete_task')} 
                                        className="h-6 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                      >
                                        <Icon name="check_circle" size={11} /><span>Done</span>
                                      </button>
                                    )}

                                    {n.view && (
                                      <button 
                                        type="button" 
                                        onClick={(e) => handleQuickAction(e, n, 'view')} 
                                        className="h-6 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/25 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                      >
                                        <span>Open</span><Icon name="arrow_forward" size={10} />
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

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-black/8 dark:border-white/10 shrink-0 px-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (clearNotifications) clearNotifications(); }}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1 active:scale-95 bg-transparent border-none p-0"
                      >
                        <Icon name="delete_sweep" size={14} />
                        <span>Clear All</span>
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {filteredNotifications.length} {filteredNotifications.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. AI MODE (Desktop-grade full chat with History and New Conversation) */}
                {isAiExpanded && (
                  <div className="w-full flex flex-col overflow-hidden pb-1">
                    {/* AI Header with generous breathing space & desktop-grade controls */}
                    <div className="flex items-center justify-between pt-1 pb-3 mb-2 px-1 border-none shrink-0">
                      <div className="flex items-center gap-2.5">
                        {showAiHistory ? (
                          <Icon name="history" size={22} className="text-foreground shrink-0" />
                        ) : (
                          <AiQuantumGlyph size={22} />
                        )}
                        <h3 className="text-[15px] font-black tracking-tight text-foreground m-0 leading-tight">
                          {showAiHistory ? 'Chat History' : 'Kormiis AI'}
                        </h3>
                        {showAiHistory && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-muted-foreground ml-0.5">
                            {aiHistorySessions.length}
                          </span>
                        )}
                      </div>

                      {/* Header Actions: New Conversation & History buttons */}
                      <div className="flex items-center gap-1.5">
                        {showAiHistory ? (
                          <button
                            type="button"
                            onClick={() => setShowAiHistory(false)}
                            title="Back to conversation"
                            className="apple-glass-btn size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-transform active:scale-90"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleNewChat}
                              title="New conversation"
                              className="apple-glass-btn size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-transform active:scale-90"
                            >
                              <Icon name="add" size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAiHistory(true)}
                              title="Chat history"
                              className="apple-glass-btn size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-transform active:scale-90 relative"
                            >
                              <Icon name="history" size={17} />
                              {aiHistorySessions.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ==================================================== */}
                    {/* A. CHAT HISTORY VIEW */}
                    {/* ==================================================== */}
                    {showAiHistory ? (
                      <div className="flex flex-col max-h-[66vh] min-h-[350px] xs:min-h-[400px] overflow-hidden">
                        {/* Search History — Styled like Employee Directory Search Bar */}
                        <div className="relative mb-2.5 shrink-0 px-0.5 flex items-center">
                          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" size={18} />
                          <input
                            type="text"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Search conversation history..."
                            className="!pl-10.5 pr-9 h-11 rounded-2xl bg-white/90 dark:bg-white/[0.08] border border-black/15 dark:border-white/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground w-full outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                          />
                          {historySearch && (
                            <button
                              type="button"
                              onClick={() => setHistorySearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer bg-black/5 dark:bg-white/10 hover:bg-black/10 border-none transition-colors"
                              title="Clear search"
                            >
                              <Icon name="close" size={12} />
                            </button>
                          )}
                        </div>

                        {/* Sessions List */}
                        <div 
                          className="flex-1 overflow-y-auto no-scrollbar py-1 space-y-1.5 px-0.5"
                          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        >
                          {filteredHistorySessions.length === 0 ? (
                            <div className="py-14 text-center flex flex-col items-center justify-center gap-1.5">
                              <Icon name="history" size={32} className="text-foreground/35 mb-1" />
                              <p className="text-xs font-bold text-foreground m-0">No Conversations Found</p>
                              <p className="text-[11px] text-muted-foreground m-0">
                                {historySearch ? 'No match for your search.' : 'You have no saved past conversations.'}
                              </p>
                            </div>
                          ) : (
                            filteredHistorySessions.map((session) => {
                              const isActive = session.id === activeSessionId
                              const lastMsg = session.messages[session.messages.length - 1]
                              return (
                                <div
                                  key={session.id}
                                  onClick={() => handleSelectSession(session.id)}
                                  className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-2 border select-none ${
                                    isActive
                                      ? 'bg-primary/10 border-primary/25'
                                      : 'bg-black/2 dark:bg-white/4 border-black/5 dark:border-white/6 hover:bg-black/4 dark:hover:bg-white/8'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-foreground truncate m-0">
                                      {session.title || 'Conversation'}
                                    </h4>
                                    {lastMsg && (
                                      <p className="text-[10.5px] text-muted-foreground line-clamp-1 m-0 mt-0.5">
                                        {lastMsg.text}
                                      </p>
                                    )}
                                    <span className="text-[9px] text-muted-foreground/70 block mt-1">
                                      {getRelativeTime(session.updatedAt) || 'Recently'}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    title="Delete conversation"
                                    className="size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border-none bg-transparent cursor-pointer shrink-0"
                                  >
                                    <Icon name="delete" size={14} />
                                  </button>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Clear All History Footer */}
                        {aiHistorySessions.length > 0 && (
                          <div className="pt-2 mt-1 border-t border-black/8 dark:border-white/10 flex items-center justify-between shrink-0 px-1">
                            <button
                              type="button"
                              onClick={handleClearAllHistory}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1 active:scale-95 bg-transparent border-none p-0"
                            >
                              <Icon name="delete_sweep" size={14} />
                              <span>Clear All History</span>
                            </button>
                            <span className="text-[10px] text-muted-foreground">
                              {aiHistorySessions.length} {aiHistorySessions.length === 1 ? 'chat' : 'chats'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ==================================================== */
                      /* B. ACTIVE CHAT VIEW */
                      /* ==================================================== */
                      <>
                        {/* Quick Action Chips (When only 1 welcome message is present) */}
                        {aiMessages.length <= 1 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5 px-0.5 shrink-0">
                            {AI_QUICK_CHIPS.map((chip, idx) => (
                              <button
                                key={`chip-${idx}`}
                                type="button"
                                onClick={() => handleSendAiMessage(chip)}
                                className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/12 text-foreground/80 hover:text-foreground border border-black/5 dark:border-white/8 cursor-pointer transition-all active:scale-95"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* AI Chat Messages Stream - Extra Generous Vertical Length */}
                        <div 
                          className="flex flex-col gap-2.5 max-h-[66vh] min-h-[350px] xs:min-h-[400px] overflow-y-auto no-scrollbar py-1.5 px-0.5 mb-2.5"
                          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        >
                          {aiMessages.map((m) => {
                            const isUser = m.role === 'user'
                            return (
                              <div
                                key={m.id}
                                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                              >
                                <div
                                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                                    isUser
                                      ? 'bg-primary text-white rounded-br-xs font-medium'
                                      : 'bg-black/4 dark:bg-white/6 text-foreground border border-black/5 dark:border-white/8 rounded-bl-xs'
                                  }`}
                                  style={isUser ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', color: '#ffffff' } : undefined}
                                >
                                  {m.fileData && (
                                    <div className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl mb-1.5 text-[11px] font-semibold ${
                                      isUser 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-black/5 dark:bg-white/10 text-foreground'
                                    }`}>
                                      <Icon name="attach_file" size={14} className="shrink-0" />
                                      <span className="truncate max-w-[160px]">{m.fileData.name}</span>
                                    </div>
                                  )}
                                  <p className="m-0 whitespace-pre-wrap">{m.text}</p>
                                </div>
                              </div>
                            )
                          })}

                          {/* Typing Indicator */}
                          {isAiLoading && (
                            <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-black/4 dark:bg-white/6 max-w-[80px]">
                              <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                            </div>
                          )}

                          <div ref={messagesEndRef} />
                        </div>

                        {/* File Attachment Chip */}
                        {attachedFile && (
                          <div className="flex items-center justify-between p-2 px-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/12 text-xs text-foreground mb-1.5 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon name="attach_file" size={15} className="text-foreground shrink-0" />
                              <span className="font-semibold text-[11px] truncate max-w-[180px]">{attachedFile.name}</span>
                              <span className="text-[9.5px] text-muted-foreground shrink-0">({Math.round(attachedFile.size / 1024)} KB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachedFile(null)}
                              className="size-5 rounded-full flex items-center justify-center hover:bg-foreground/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all border-none bg-transparent"
                            >
                              <Icon name="close" size={12} />
                            </button>
                          </div>
                        )}

                        {/* AI Input Form - File Upload + Proper Spacing & Touch-Optimized Layout */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            handleSendAiMessage()
                          }}
                          className="relative flex items-center bg-black/5 dark:bg-white/[0.08] rounded-2xl px-3 py-1.5 min-h-[48px] border border-black/10 dark:border-white/12 shrink-0 mb-1.5 gap-2"
                        >
                          {/* File Upload Button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload file or receipt"
                            className="size-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors border-none text-muted-foreground hover:text-foreground bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 shrink-0"
                          >
                            <Icon name="attach_file" size={18} />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.csv,.pdf,image/png,image/jpeg,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                          />

                          {/* Input Text Box */}
                          <input
                            type="text"
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            placeholder={attachedFile ? `Ask about ${attachedFile.name}...` : "Ask Kormiis AI anything..."}
                            disabled={isAiLoading}
                            className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/75 py-1 leading-normal min-w-0"
                          />

                          {/* Action Buttons Group with Crisp Spacing */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Voice Button */}
                            <button
                              type="button"
                              onClick={handleToggleVoice}
                              title="Voice input"
                              className={`size-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors border-none ${
                                isAiListening 
                                  ? 'bg-destructive text-white animate-pulse' 
                                  : 'text-muted-foreground hover:text-foreground bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10'
                              }`}
                            >
                              <Icon name="mic" size={18} />
                            </button>

                            {/* Send Button */}
                            <button
                              type="submit"
                              disabled={(!aiInput.trim() && !attachedFile) || isAiLoading}
                              className="size-8 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all border-none shrink-0"
                              style={{ background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)' }}
                            >
                              <Icon name="arrow_upward" size={18} />
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {/* Separator Line right above the bottom 4 icons */}
                <div className="w-full h-px bg-black/10 dark:bg-white/10 mt-1 mb-1 shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================== */}
          {/* STATIC 4-ICON DOCK ROW (Always fixed 56px height, zero shift) */}
          {/* ==================================================== */}
          <div className="w-full h-14 flex items-center justify-between shrink-0 select-none">
            {/* 1. Menu Icon Button */}
            <motion.button
              type="button"
              aria-label={isMenuExpanded ? "Close menu" : "Open all modules"}
              onClick={handleToggleMenu}
              whileTap={{ scale: 0.90 }}
              transition={{ scale: { duration: 0.12 } }}
              className={`relative size-11 rounded-full flex items-center justify-center cursor-pointer ${
                isMenuExpanded
                  ? 'bg-primary text-white font-bold shadow-none'
                  : 'text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8'
              }`}
              style={isMenuExpanded ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', color: '#ffffff' } : undefined}
            >
              <Icon 
                name="grid_view" 
                size={23}
                className={isMenuExpanded ? 'text-white' : ''}
              />
            </motion.button>

            {/* 2. AI Icon Button (Accordion Trigger) */}
            <motion.button
              type="button"
              aria-label="Open Kormiis AI"
              onClick={handleToggleAi}
              whileTap={{ scale: 0.90 }}
              transition={{ scale: { duration: 0.12 } }}
              className={`relative size-11 rounded-full flex items-center justify-center cursor-pointer ${
                isAiExpanded
                  ? 'bg-primary text-white font-bold shadow-none'
                  : 'text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8'
              }`}
              style={isAiExpanded ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', color: '#ffffff' } : undefined}
            >
              <AiQuantumGlyph size={23} />
            </motion.button>

            {/* 3. Notification Icon Button (Accordion Trigger) */}
            <motion.button
              type="button"
              aria-label="Notifications"
              onClick={handleToggleNotifications}
              whileTap={{ scale: 0.90 }}
              transition={{ scale: { duration: 0.12 } }}
              className={`relative size-11 rounded-full flex items-center justify-center cursor-pointer ${
                isNotifExpanded
                  ? 'bg-primary text-white font-bold shadow-none'
                  : 'text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8'
              }`}
              style={isNotifExpanded ? { background: 'linear-gradient(135deg, #FE3501 0%, #e62f00 100%)', color: '#ffffff' } : undefined}
            >
              <Icon name={actualUnreadCount > 0 ? "notifications_active" : "notifications"} size={23} />
              {actualUnreadCount > 0 && !isNotifExpanded && (
                <span className="absolute top-2.5 right-2.5 flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-destructive"></span>
                </span>
              )}
            </motion.button>

            {/* 4. Profile Icon Button */}
            <motion.button
              type="button"
              aria-label="My Profile"
              onClick={() => {
                setExpandedSection(null)
                if (onProfileClick) {
                  onProfileClick()
                } else if (setCurrentView) {
                  setCurrentView('profile')
                }
              }}
              whileTap={{ scale: 0.90 }}
              transition={{ scale: { duration: 0.12 } }}
              className={`relative size-11 rounded-full flex items-center justify-center cursor-pointer ${
                currentView === 'profile'
                  ? 'ring-2 ring-primary text-primary'
                  : 'text-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8'
              }`}
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name || "User"} 
                  className={`size-8 rounded-full object-cover select-none ${currentView === 'profile' ? 'ring-2 ring-primary' : ''}`} 
                />
              ) : (
                <Icon name="person" size={23} />
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
})

MobileResponsiveBottomBar.displayName = 'MobileResponsiveBottomBar'
export default MobileResponsiveBottomBar
