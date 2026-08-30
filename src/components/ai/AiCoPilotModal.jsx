import { useState, useEffect, useRef, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { AiQuantumGlyph } from './AiExpandableFab.jsx'
import { 
  sendChatMessage, 
  fileToBase64, 
  checkLocalScopeGuardrail 
} from '../../services/aiAgent.js'

const QUICK_ACTIONS = [
  { label: 'Add Employee', prompt: 'Add a new employee: Name, Department, Position, Salary' },
  { label: 'Calculate Payroll', prompt: 'Summarize our total salary breakdown and payment status for this month' },
  { label: 'Post Announcement', prompt: 'Draft and publish an important company announcement about upcoming events' },
  { label: 'Log Expense', prompt: 'Record a new office expense claim' },
  { label: 'Attendance Summary', prompt: 'Who is present, absent, or on leave today?' },
]

function getGreetingText(userName = 'there') {
  const hour = new Date().getHours()
  let timeGreeting = 'Hello'
  if (hour >= 5 && hour < 12) timeGreeting = 'Good morning'
  else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon'
  else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening'
  else timeGreeting = 'Hello'

  return `${timeGreeting}, ${userName}! 👋 I'm your Kormiis AI.

How can I assist you with HR operations, payroll, attendance, or workspace tasks today?`
}

function createInitialSession(userName = 'there') {
  const sessionId = `session-${Date.now()}`
  return {
    id: sessionId,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: getGreetingText(userName),
        timestamp: new Date().toISOString()
      }
    ]
  }
}

export default function AiCoPilotModal({
  isMorphMode = false,
  isOpen,
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
  onHistoryDrawerChange
}) {
  const userName = currentUser?.name 
    ? currentUser.name.split(' ')[0] 
    : currentUser?.displayName 
    ? currentUser.displayName.split(' ')[0] 
    : currentUser?.email 
    ? currentUser.email.split('@')[0] 
    : 'there'
  const sessionsStorageKey = `kormiis_ai_sessions_${currentUser?.id || 'admin'}`

  // Multi-session State (Only stores and persists conversations that have user messages)
  const [sessions, setSessions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(sessionsStorageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validSessions = parsed.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
            if (validSessions.length > 0) {
              return [createInitialSession(userName), ...validSessions]
            }
          }
        } catch (e) {
          console.error('Failed to parse AI sessions', e)
        }
      }
    }
    return [createInitialSession(userName)]
  })

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions[0]?.id || `session-${Date.now()}`
  })

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [historySearch, setHistorySearch] = useState('')

  useEffect(() => {
    if (onHistoryDrawerChange) {
      onHistoryDrawerChange(showHistoryDrawer)
    }
  }, [showHistoryDrawer, onHistoryDrawerChange])

  // Active Session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]
  const messages = activeSession?.messages || []

  // Persist only meaningful conversations (with at least 1 user message) to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userSessions = sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
      try {
        localStorage.setItem(sessionsStorageKey, JSON.stringify(userSessions.slice(0, 30)))
      } catch (e) {
        console.error('Failed to save AI sessions', e)
      }
    }
  }, [sessions, sessionsStorageKey])

  const setMessagesForActiveSession = (updater) => {
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === activeSessionId) {
          const newMessages = typeof updater === 'function' ? updater(session.messages) : updater
          let title = session.title
          // Auto-title session from first user message if still default
          if (title === 'New Conversation' || !title) {
            const firstUserMsg = newMessages.find(m => m.role === 'user')
            if (firstUserMsg && firstUserMsg.text) {
              title = firstUserMsg.text.slice(0, 32).trim() + (firstUserMsg.text.length > 32 ? '...' : '')
            }
          }
          return {
            ...session,
            title,
            updatedAt: new Date().toISOString(),
            messages: newMessages
          }
        }
        return session
      })
    })
  }

  // Create a brand new chat session
  const handleNewChat = () => {
    const hasUserMessage = activeSession?.messages?.some(m => m.role === 'user')
    if (!hasUserMessage) {
      // Current conversation is already clean and fresh, just stay on it
      setShowHistoryDrawer(false)
      return
    }
    // Retain only sessions with user messages, plus one new clean session
    const cleanSessions = sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
    const newSession = createInitialSession(userName)
    setSessions([newSession, ...cleanSessions])
    setActiveSessionId(newSession.id)
    setShowHistoryDrawer(false)
    if (addToast) addToast('Started a new conversation', 'info')
  }

  // React to initialAction (e.g. from top-right AI action bar buttons)
  useEffect(() => {
    if (!isOpen) {
      setShowHistoryDrawer(false)
      return
    }
    if (initialAction?.startsWith('open_history')) {
      setShowHistoryDrawer(true)
    } else {
      setShowHistoryDrawer(false)
      if (initialAction?.startsWith('new_chat')) {
        handleNewChat()
      }
    }
  }, [initialAction, isOpen])


  // Select an existing past session
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId)
    setShowHistoryDrawer(false)
  }

  // Delete a specific session
  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation()
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId)
      if (remaining.length === 0) {
        const fresh = createInitialSession(userName)
        setActiveSessionId(fresh.id)
        return [fresh]
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id)
      }
      return remaining
    })
    if (addToast) addToast('Deleted conversation from history', 'info')
  }

  // Clear all conversation history
  const handleClearAllHistory = () => {
    const fresh = createInitialSession(userName)
    setSessions([fresh])
    setActiveSessionId(fresh.id)
    setShowHistoryDrawer(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(sessionsStorageKey)
      } catch (e) {}
    }
    if (addToast) addToast('All conversation history cleared', 'info')
  }

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)

  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false)
  const isAtBottomRef = useRef(true)

  const chatScrollContainerRef = useRef(null)
  const historyScrollContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)
  const modalRef = useRef(null)

  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const atBottom = distanceFromBottom < 60
    isAtBottomRef.current = atBottom
    setShowScrollBottomBtn(!atBottom && messages.length > 2)
  }

  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }

  // Auto-scroll to bottom only when new messages arrive or initial open
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    if (isOpen) {
      if (prevMsgCountRef.current === 0) {
        setTimeout(() => scrollToBottom(false), 50)
      } else if (messages.length > prevMsgCountRef.current) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg?.role === 'user' || isAtBottomRef.current) {
          setTimeout(() => scrollToBottom(true), 50)
        }
      }
      prevMsgCountRef.current = messages.length
    } else {
      prevMsgCountRef.current = 0
      setShowScrollBottomBtn(false)
      isAtBottomRef.current = true
    }
  }, [messages.length, isOpen])

  // Handle outside click without background overlay
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (
        modalRef.current && 
        !modalRef.current.contains(e.target) && 
        !e.target.closest?.('[data-ai-trigger]') &&
        !e.target.closest?.('[data-ai-fab]') &&
        !e.target.closest?.('[data-ai-panel]')
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
        setIsRecording(false)
      }

      recognition.onerror = () => setIsRecording(false)
      recognition.onend = () => setIsRecording(false)

      recognitionRef.current = recognition
    }
  }, [])

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      if (addToast) addToast('Voice recognition is not supported in this browser.', 'warning')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (err) {
        setIsRecording(false)
      }
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      if (addToast) addToast('File size must be under 10MB', 'warning')
      return
    }

    try {
      const converted = await fileToBase64(file)
      setAttachedFile(converted)
    } catch (err) {
      if (addToast) addToast('Could not process file', 'error')
    }
  }

  // Workspace Context builder for Gemini
  const context = {
    currentUser,
    employees,
    settings,
    payroll,
    attendance,
    announcements,
    tasks,
    expenses
  }

  const handleSend = async (customPrompt = null) => {
    const textToSend = (customPrompt || input).trim()
    if (!textToSend && !attachedFile) return

    const userMessageId = `user-${Date.now()}`
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        text: textToSend,
        fileData: attachedFile,
        timestamp: new Date().toISOString()
      }
    ]

    setMessagesForActiveSession(newMessages)
    setInput('')
    setAttachedFile(null)

    // 🛡️ ZERO-TOKEN LOCAL GUARDRAIL: Check if request is completely off-topic (saves 100% quota!)
    const guardrail = checkLocalScopeGuardrail(textToSend, Boolean(attachedFile))
    if (!guardrail.isAllowed) {
      setMessagesForActiveSession(prev => [
        ...prev,
        {
          id: `guard-${Date.now()}`,
          role: 'model',
          text: guardrail.reason,
          timestamp: new Date().toISOString()
        }
      ])
      return
    }

    setIsLoading(true)

    try {
      const response = await sendChatMessage({
        messages: newMessages,
        context
      })

      const botMessageId = `bot-${Date.now()}`
      setMessagesForActiveSession(prev => [
        ...prev,
        {
          id: botMessageId,
          role: 'model',
          text: response.text || (response.functionCalls?.length ? 'I have prepared the action for your review:' : 'Action ready.'),
          functionCalls: response.functionCalls || [],
          pendingActions: response.functionCalls?.map((fc, idx) => ({
            actionId: `${botMessageId}-${idx}`,
            name: fc.name,
            args: fc.args,
            status: 'pending' // 'pending' | 'executed' | 'cancelled'
          })),
          timestamp: new Date().toISOString()
        }
      ])
    } catch (err) {
      setMessagesForActiveSession(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `⚠️ Error: ${err.message || 'Could not communicate with Gemini API. Please check network connection.'}`,
          isError: true,
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for external prompt sends
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend
  useEffect(() => {
    if (!isOpen) return
    const pending = window.__aiPendingPrompt
    if (pending) {
      window.__aiPendingPrompt = null
      setTimeout(() => handleSendRef.current?.(pending), 150)
    }
    const handleExternalPrompt = (e) => {
      const text = e.detail?.text
      if (text && handleSendRef.current) {
        handleSendRef.current(text)
      }
    }
    window.addEventListener('ai-send-prompt', handleExternalPrompt)
    return () => window.removeEventListener('ai-send-prompt', handleExternalPrompt)
  }, [isOpen])

  // Execute Approved Action from Action Card
  const handleExecuteAction = (messageId, actionId, actionName, args) => {
    try {
      if (actionName === 'create_employee') {
        const newEmp = {
          id: `emp-${Date.now()}`,
          name: args.name,
          email: args.email || `${args.name.toLowerCase().replace(/\s+/g, '')}@kormiis.io`,
          phone: args.phone || '',
          department: args.department || 'Engineering',
          position: args.position || 'Specialist',
          salary: Number(args.salary) || 50000,
          joinDate: args.joinDate || new Date().toISOString().split('T')[0],
          status: 'Active',
          role: args.role || 'Teammate'
        }
        if (setEmployees) setEmployees([...employees, newEmp])
        if (addToast) addToast(`Added employee ${newEmp.name}`, 'success')
      } else if (actionName === 'update_employee') {
        const target = employees.find(
          e => e.name?.toLowerCase().includes(args.employeeNameOrId?.toLowerCase()) || e.id === args.employeeNameOrId
        )
        if (target && setEmployees) {
          const updated = employees.map(e => {
            if (e.id === target.id) {
              return {
                ...e,
                ...(args.department && { department: args.department }),
                ...(args.position && { position: args.position }),
                ...(args.salary && { salary: Number(args.salary) }),
                ...(args.status && { status: args.status })
              }
            }
            return e
          })
          setEmployees(updated)
          if (addToast) addToast(`Updated details for ${target.name}`, 'success')
        }
      } else if (actionName === 'create_announcement') {
        const newAnn = {
          id: `ann-${Date.now()}`,
          title: args.title,
          content: args.content,
          date: new Date().toISOString(),
          priority: args.priority || 'Normal',
          authorId: currentUser?.id || 'admin'
        }
        if (setAnnouncements) setAnnouncements([newAnn, ...announcements])
        if (addToast) addToast(`Published announcement "${newAnn.title}"`, 'success')
      } else if (actionName === 'create_expense') {
        const newExp = {
          id: `exp-${Date.now()}`,
          category: args.category || 'General',
          amount: Number(args.amount) || 0,
          description: args.description || 'Expense entry',
          date: args.date || new Date().toISOString().split('T')[0],
          status: 'Approved',
          claimantId: currentUser?.id || 'admin'
        }
        if (setExpenses) setExpenses([newExp, ...expenses])
        if (addToast) addToast(`Logged expense of ${newExp.amount} for ${newExp.category}`, 'success')
      } else if (actionName === 'assign_task') {
        const newTask = {
          id: `task-${Date.now()}`,
          title: args.title,
          description: args.description || '',
          assignedTo: args.assignedToNameOrId || currentUser?.id || 'all',
          dueDate: args.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          priority: args.priority || 'Medium',
          status: 'Todo'
        }
        if (setTasks) setTasks([newTask, ...tasks])
        if (addToast) addToast(`Created task "${newTask.title}"`, 'success')
      } else if (actionName === 'navigate_view') {
        if (setCurrentView && args.view) {
          setCurrentView(args.view)
          if (addToast) addToast(`Navigated to ${args.view}`, 'info')
        }
      }

      // Mark action as executed in local UI state
      setMessagesForActiveSession(prev =>
        prev.map(msg => {
          if (msg.id === messageId && msg.pendingActions) {
            return {
              ...msg,
              pendingActions: msg.pendingActions.map(a =>
                a.actionId === actionId ? { ...a, status: 'executed' } : a
              )
            }
          }
          return msg
        })
      )
    } catch (err) {
      if (addToast) addToast(`Failed to execute action: ${err.message}`, 'error')
    }
  }

  const handleCancelAction = (messageId, actionId) => {
    setMessagesForActiveSession(prev =>
      prev.map(msg => {
        if (msg.id === messageId && msg.pendingActions) {
          return {
            ...msg,
            pendingActions: msg.pendingActions.map(a =>
              a.actionId === actionId ? { ...a, status: 'cancelled' } : a
            )
          }
        }
        return msg
      })
    )
  }

  // Only conversations with actual user messages count as history
  const historySessions = useMemo(() => {
    return sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    if (!historySearch.trim()) return historySessions
    const term = historySearch.toLowerCase()
    return historySessions.filter(s => s.title.toLowerCase().includes(term) || s.messages.some(m => m.text?.toLowerCase().includes(term)))
  }, [historySessions, historySearch])

  if (!isOpen) return null

  const modalInner = (
    <div 
      ref={modalRef}
      className={
        isMorphMode
          ? "w-full h-full flex flex-col overflow-hidden relative animate-in fade-in duration-200"
          : "pointer-events-auto w-full sm:w-[85%] sm:max-w-3xl mx-auto h-[min(82vh,620px)] sm:h-[min(72vh,560px)] flex flex-col rounded-t-[32px] sm:rounded-[28px] rounded-b-none sm:rounded-b-[28px] glass-mobile-drawer sm:glass-kormiis border-t sm:border border-white/35 dark:border-white/16 shadow-[0_-12px_40px_rgba(0,0,0,0.40)] sm:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.50),0_0_20px_0_rgba(0,0,0,0.20)] overflow-hidden backdrop-blur-3xl relative animate-in slide-in-from-bottom sm:slide-in-from-top-3 duration-300 sm:duration-200"
      }
    >
      {/* Mobile Drawer Pull Indicator Handle */}
      {!isMorphMode && (
        <div className="w-10 h-1 rounded-full bg-foreground/25 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
      )}

      {/* MODAL HEADER — SEAMLESS MONOGLASS HEADER */}
      <div className="flex items-center justify-between px-4.5 sm:px-5 py-3.5 sm:py-4 shrink-0 bg-transparent">
        <div className="flex items-center gap-2">
          {showHistoryDrawer ? (
            <Icon name="history" size={24} className="text-foreground shrink-0" />
          ) : (
            <AiQuantumGlyph size={24} className="shrink-0 text-foreground" />
          )}
          <div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground m-0 leading-tight">
              {showHistoryDrawer ? 'Chat History' : 'Kormiis AI'}
            </h2>
            {showHistoryDrawer && (
              <p className="text-[10px] text-muted-foreground m-0 leading-tight mt-0.5 font-medium">
                {historySessions.length} conversation{historySessions.length !== 1 ? 's' : ''} saved
              </p>
            )}
          </div>
        </div>

        {/* Header Action / Close Buttons */}
        <div className="flex items-center gap-1.5">
          {showHistoryDrawer ? (
            <button
              onClick={() => setShowHistoryDrawer(false)}
              aria-label="Back to chat"
              className="apple-glass-btn size-8 sm:size-8.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95 border border-white/35 dark:border-white/15"
              title="Back to conversation"
            >
              <Icon name="close" size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNewChat}
                aria-label="New chat"
                className="apple-glass-btn size-8 sm:size-8.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95 border border-white/35 dark:border-white/15"
                title="Start a new conversation"
              >
                <Icon name="add" size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(true)}
                aria-label="Chat history"
                className="apple-glass-btn size-8 sm:size-8.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95 border border-white/35 dark:border-white/15 relative"
                title="Past conversations"
              >
                <Icon name="history" size={16} />
                {historySessions.length > 0 && (
                  <span className="absolute -top-1 -right-1 size-3.5 bg-foreground text-background text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                    {historySessions.length > 9 ? '9+' : historySessions.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Kormiis AI"
                className="apple-glass-btn size-8 sm:size-8.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95 border border-white/35 dark:border-white/15"
                title="Close modal"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN BODY: SWITCHES BETWEEN HISTORY VIEW AND ACTIVE CHAT FEED */}
      {showHistoryDrawer ? (
        /* FULL-VIEW CHAT HISTORY */
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Search & New Chat Action Bar */}
          <div className="p-3.5 sm:p-4 space-y-2.5 bg-transparent">
            <button
              onClick={handleNewChat}
              className="apple-glass-btn w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-foreground bg-white/80 dark:bg-white/[0.12] hover:bg-white/95 dark:hover:bg-white/[0.22] border border-white/40 dark:border-white/18 shadow-xs active:scale-98 cursor-pointer select-none group"
            >
              <Icon name="add" size={16} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Start New Conversation</span>
            </button>

            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search past conversations..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-2xl border border-black/15 dark:border-white/15 bg-white/85 dark:bg-white/[0.08] text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div ref={historyScrollContainerRef} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 overscroll-contain chat-scrollbar">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-muted-foreground">
                <Icon name="search_off" size={28} className="mx-auto mb-2 opacity-50" />
                No past conversations found
              </div>
            ) : (
              filteredSessions.map(session => {
                const isActive = session.id === activeSessionId
                const lastMsg = session.messages[session.messages.length - 1]
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 shadow-xs backdrop-blur-xl ${
                      isActive
                        ? 'bg-black/10 dark:bg-white/15 border-foreground/30 text-foreground font-bold shadow-sm'
                        : 'border-white/35 dark:border-white/12 bg-white/60 hover:bg-white/85 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-foreground'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <Icon name="chat_bubble_outline" size={14} className={isActive ? 'text-foreground' : 'text-muted-foreground'} />
                        <p className="m-0 text-xs font-bold break-words text-foreground">
                          {session.title || 'Conversation'}
                        </p>
                      </div>
                      {lastMsg && (
                        <p className="m-0 mt-1 text-[11px] text-muted-foreground break-words leading-relaxed">
                          {lastMsg.text}
                        </p>
                      )}
                      <span className="text-[9px] text-muted-foreground/80 mt-1.5 block font-medium">
                        {new Date(session.updatedAt || session.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        &middot;{' '}
                        {new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Delete Session Button on Hover */}
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      aria-label="Delete chat"
                      className="size-7.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-all shrink-0"
                      title="Delete this conversation"
                    >
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Clear All History Footer */}
          {historySessions.length > 0 && (
            <div className="p-3.5 pb-22 sm:pb-3.5 shrink-0 bg-transparent">
              <button
                onClick={handleClearAllHistory}
                className="apple-glass-btn w-full h-9 rounded-xl border border-destructive/35 hover:bg-destructive/15 text-destructive text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-xs"
              >
                <Icon name="delete_sweep" size={15} />
                <span>Clear All Conversation History</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE CHAT FEED & INPUT VIEW — MONOGLASS DESIGN */
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 relative">
            {/* CHAT MESSAGES FEED */}
            <div 
              ref={chatScrollContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4.5 overscroll-contain chat-scrollbar"
            >
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  {/* Author Label Above Chatbox */}
                  <div className={`flex items-center gap-1.5 px-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'user' ? (
                      <span className="text-[11px] font-bold tracking-tight text-foreground/80">
                        You
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AiQuantumGlyph size={14} className="shrink-0 text-foreground" />
                        <span className="text-[11px] font-extrabold tracking-tight text-foreground">
                          Kormiis AI
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Bubble — MonoGlass Standard */}
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed relative backdrop-blur-2xl ${
                      msg.role === 'user'
                        ? 'rounded-tr-xs bg-neutral-900/90 text-white dark:bg-white/[0.16] dark:text-white border border-white/25 dark:border-white/20 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                        : msg.isError
                        ? 'rounded-tl-xs bg-destructive/15 border border-destructive/30 text-destructive shadow-xs'
                        : 'rounded-tl-xs glass-kormiis border border-white/40 dark:border-white/14 text-foreground shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                    }`}
                  >
                    {/* Attached File Preview inside Message */}
                    {msg.fileData && (
                      <div className="mb-2.5 p-2 rounded-xl bg-black/[0.06] dark:bg-white/10 flex items-center gap-2 text-xs border border-white/20">
                        <Icon name="attachment" size={16} />
                        <span className="break-words font-semibold">{msg.fileData.name}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Quick Action Suggestion Pills inside Welcome Bubble */}
                    {index === 0 && msg.role === 'model' && (
                      <div className="mt-3.5 pt-3 border-t border-border/60 dark:border-white/12 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground w-full block mb-1 uppercase tracking-wider">
                          Suggested quick actions:
                        </span>
                        {QUICK_ACTIONS.map(qa => (
                          <button
                            key={qa.label}
                            onClick={() => handleSend(qa.prompt)}
                            disabled={isLoading}
                            className="apple-glass-btn px-3 py-1.5 rounded-full border border-white/40 dark:border-white/16 bg-white/75 dark:bg-white/[0.10] hover:bg-white/95 dark:hover:bg-white/[0.20] hover:border-white/60 dark:hover:border-white/30 text-[11px] font-bold text-foreground cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                          >
                            <span>{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    {msg.timestamp && (
                      <div className={`text-[9.5px] mt-1.5 font-medium ${msg.role === 'user' ? 'text-white/75 text-right' : 'text-muted-foreground text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* ACTION CONFIRMATION CARDS — MONOGLASS GLASS CARD */}
                  {msg.pendingActions?.map(action => (
                    <div
                      key={action.actionId}
                      className="w-full max-w-[92%] sm:max-w-[85%] p-4.5 glass-kormiis rounded-[22px] border border-white/45 dark:border-white/16 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.35)] space-y-3.5 animate-in fade-in duration-300 backdrop-blur-2xl"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/70 dark:border-white/12 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">
                            Proposed Action: {action.name.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {action.status === 'executed' && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                            <Icon name="check" size={12} /> Applied
                          </span>
                        )}
                        {action.status === 'cancelled' && (
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                            Cancelled
                          </span>
                        )}
                      </div>

                      {/* Action Arguments Summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(action.args || {}).map(([k, v]) => (
                          <div key={k} className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block break-words">
                              {k}
                            </span>
                            <span className="font-semibold text-foreground break-words block mt-0.5">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons — MonoGlass Pure Glass Buttons */}
                      {action.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleCancelAction(msg.id, action.actionId)}
                            className="apple-glass-btn h-9 px-3.5 rounded-xl border border-white/35 dark:border-white/15 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 transition-all"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleExecuteAction(msg.id, action.actionId, action.name, action.args)}
                            className="apple-glass-btn h-9 px-4.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <Icon name="check" size={14} /> Approve & Apply
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Loading Indicator Bubble */}
              {isLoading && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full glass-kormiis border border-white/40 dark:border-white/16 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.40)] text-xs text-foreground font-semibold w-fit animate-pulse backdrop-blur-2xl">
                  <Icon name="sync" size={16} className="text-foreground animate-spin" />
                  <span>Kormiis AI is thinking and preparing actions...</span>
                </div>
              )}
            </div>

            {/* JUMP TO LATEST MESSAGES FLOATING BUTTON (CENTERED MONOGLASS PILL) */}
            {showScrollBottomBtn && (
              <div className="absolute bottom-[86px] sm:bottom-[70px] left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  aria-label="Scroll to latest messages"
                  className="apple-glass-btn h-8.5 px-4 rounded-full flex items-center gap-1.5 text-xs font-bold text-foreground border border-white/45 dark:border-white/20 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25)] backdrop-blur-2xl bg-white/75 dark:bg-white/[0.12] hover:bg-white/95 dark:hover:bg-white/[0.20] active:scale-95 transition-all hover:scale-103 cursor-pointer select-none group"
                  title="Jump to latest message"
                >
                  <Icon name="arrow_downward" size={15} className="text-foreground transition-transform duration-200 group-hover:translate-y-0.5" />
                  <span>Latest</span>
                </button>
              </div>
            )}

            {/* INPUT & ATTACHMENT DOCK — SEAMLESS MONOGLASS DOCK */}
            <div className="p-3 sm:p-4 pb-22 sm:pb-3.5 shrink-0 bg-transparent space-y-2.5">
              {/* File Attachment Chip */}
              {attachedFile && (
                <div className="flex items-center justify-between p-2 px-3 rounded-2xl bg-black/[0.04] dark:bg-white/10 border border-white/30 dark:border-white/14 text-xs text-foreground shadow-xs">
                  <div className="flex items-center gap-2 break-words">
                    <Icon name="attach_file" size={15} className="text-foreground shrink-0" />
                    <span className="break-words font-semibold text-[11px]">{attachedFile.name}</span>
                    <span className="text-[9px] text-muted-foreground font-medium">({Math.round(attachedFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="size-5 rounded-full flex items-center justify-center hover:bg-foreground/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              )}

              {/* Form Input Row */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-2"
              >
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload document, excel sheet, or receipt"
                  className="apple-glass-btn size-11 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0 border border-white/35 dark:border-white/15 active:scale-95 transition-all shadow-xs"
                  title="Upload file or receipt"
                >
                  <Icon name="upload_file" size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label="Voice input"
                  className={`apple-glass-btn size-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/35 dark:border-white/15 active:scale-95 shadow-xs ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse border-rose-400 shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Speak voice command"
                >
                  <Icon name={isRecording ? 'mic' : 'mic_none'} size={18} />
                </button>

                {/* Text Input — MonoGlass Input Standard */}
                <input
                  type="text"
                  placeholder={isRecording ? 'Listening to voice...' : 'Ask AI to add employee, update payroll, log expense...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 h-11 px-4 rounded-2xl border border-black/15 dark:border-white/15 bg-white/90 dark:bg-white/[0.08] text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-muted-foreground"
                />

                {/* Send Button — Pure MonoGlass Glass Button */}
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  aria-label="Send command"
                  className="apple-glass-btn size-11 rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all text-foreground bg-white/80 dark:bg-white/[0.12] hover:bg-white/95 dark:hover:bg-white/[0.22] border border-white/40 dark:border-white/18 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed shrink-0 hover:scale-103"
                  title="Send command (Enter)"
                >
                  <Icon name="send" size={18} className="text-foreground" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
  )

  if (isMorphMode) {
    return modalInner
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[59] bg-black/25 dark:bg-black/55 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end sm:items-center sm:justify-start sm:pt-[76px] md:pt-[84px] sm:px-4 md:px-6 bg-transparent animate-in fade-in duration-200">
        {modalInner}
      </div>
    </>
  )
}
