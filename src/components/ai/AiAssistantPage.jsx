import React, { useState, useEffect, useRef, useMemo } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { sendChatMessage, fileToBase64, checkLocalScopeGuardrail } from '../../services/aiAgent.js'

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

export default function AiAssistantPage({
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
  setActiveTab,
  addToast
}) {
  const navigate = setCurrentView || setActiveTab
  const userName = currentUser?.name 
    ? currentUser.name.split(' ')[0] 
    : currentUser?.displayName 
    ? currentUser.displayName.split(' ')[0] 
    : currentUser?.email 
    ? currentUser.email.split('@')[0] 
    : 'there'
  const sessionsStorageKey = `kormiis_ai_sessions_${currentUser?.id || 'admin'}`

  // Multi-session State (Only stores conversations with user messages)
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

  const [showHistoryView, setShowHistoryView] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
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

  // Active Session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]
  const messages = activeSession?.messages || []

  // Persist only meaningful conversations to localStorage
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

  const handleNewChat = () => {
    const hasUserMessage = activeSession?.messages?.some(m => m.role === 'user')
    if (!hasUserMessage) {
      setShowHistoryView(false)
      return
    }
    const cleanSessions = sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
    const newSession = createInitialSession(userName)
    setSessions([newSession, ...cleanSessions])
    setActiveSessionId(newSession.id)
    setShowHistoryView(false)
    if (addToast) addToast('Started a new conversation', 'info')
  }

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId)
    setShowHistoryView(false)
  }

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

  const handleClearAllHistory = () => {
    const fresh = createInitialSession(userName)
    setSessions([fresh])
    setActiveSessionId(fresh.id)
    setShowHistoryView(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(sessionsStorageKey)
      } catch (e) {}
    }
    if (addToast) addToast('All conversation history cleared', 'info')
  }

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

  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    if (prevMsgCountRef.current === 0) {
      setTimeout(() => scrollToBottom(false), 50)
    } else if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'user' || isAtBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 50)
      }
    }
    prevMsgCountRef.current = messages.length
  }, [messages.length])

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript))
          setIsRecording(false)
        }

        recognition.onerror = () => {
          setIsRecording(false)
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current = recognition
      }
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
      const history = newMessages.slice(-8).map(m => ({
        role: m.role,
        text: m.text
      }))

      const response = await sendChatMessage({
        messages: newMessages,
        context,
        fileData: attachedFile
      })

      setMessagesForActiveSession(prev => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: response.text,
          pendingActions: response.functionCalls?.map((fc, idx) => ({
            actionId: `action-${Date.now()}-${idx}`,
            name: fc.name,
            args: fc.args,
            status: 'pending'
          })) || response.actions || [],
          timestamp: new Date().toISOString()
        }
      ])
    } catch (err) {
      setMessagesForActiveSession(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'model',
          text: `⚠️ I encountered an error: ${err.message || 'Unable to connect to AI engine.'}`,
          isError: true,
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteAction = async (messageId, actionId, actionName, args) => {
    try {
      if (actionName === 'add_employee' && setEmployees) {
        const newEmp = {
          id: `EMP-${Date.now().toString().slice(-4)}`,
          name: args.name || 'New Employee',
          department: args.department || 'General',
          position: args.position || 'Staff',
          salary: Number(args.salary) || 0,
          status: 'Active',
          joinDate: new Date().toISOString().split('T')[0],
          email: args.email || `${(args.name || 'employee').toLowerCase().replace(/\s+/g, '.')}@company.com`
        }
        await setEmployees(prev => [newEmp, ...(prev || [])])
        if (addToast) addToast(`Added employee ${newEmp.name} successfully!`, 'success')
      } else if (actionName === 'create_announcement' && setAnnouncements) {
        const newAnn = {
          id: `ann-${Date.now()}`,
          title: args.title || 'Company Announcement',
          content: args.content || '',
          priority: args.priority || 'Normal',
          category: args.category || 'General',
          date: new Date().toISOString(),
          author: currentUser?.name || 'HR Team'
        }
        await setAnnouncements(prev => [newAnn, ...(prev || [])])
        if (addToast) addToast(`Published announcement: "${newAnn.title}"`, 'success')
      } else if (actionName === 'add_expense' && setExpenses) {
        const newExp = {
          id: `exp-${Date.now()}`,
          employeeName: args.employeeName || currentUser?.name || 'Staff',
          category: args.category || 'Travel',
          amount: Number(args.amount) || 0,
          description: args.description || 'Expense claim',
          date: new Date().toISOString().split('T')[0],
          status: 'Approved'
        }
        await setExpenses(prev => [newExp, ...(prev || [])])
        if (addToast) addToast(`Logged expense of ৳${newExp.amount} successfully!`, 'success')
      } else if (actionName === 'navigate_to_view' && navigate) {
        navigate(args.viewName)
        if (addToast) addToast(`Navigated to ${args.viewName}`, 'info')
      }

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

  const historySessions = useMemo(() => {
    return sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    if (!historySearch.trim()) return historySessions
    const term = historySearch.toLowerCase()
    return historySessions.filter(s => s.title.toLowerCase().includes(term) || s.messages.some(m => m.text?.toLowerCase().includes(term)))
  }, [historySessions, historySearch])

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start pb-20 sm:pb-8 pt-1 animate-in fade-in duration-200 max-w-[1000px] mx-auto">
      {/* FULL-PAGE AI CHAT WORKSPACE CONTAINER */}
      <div className="w-full h-[calc(100dvh_-_130px)] sm:h-[calc(100dvh_-_140px)] md:h-[calc(100vh_-_140px)] flex flex-col rounded-[24px] sm:rounded-[32px] glass-kormiis border border-white/35 dark:border-white/16 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.30)] overflow-hidden backdrop-blur-3xl relative">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/80 dark:border-white/12 shrink-0 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="size-8 sm:size-9 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow-xs shrink-0">
              <Icon name={showHistoryView ? "history" : "auto_awesome"} size={18} className="text-white dark:text-neutral-900" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-foreground m-0 leading-tight">
                {showHistoryView ? 'Chat History' : 'Kormiis AI'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground m-0 leading-tight mt-0.5 font-medium">
                {showHistoryView 
                  ? `${historySessions.length} conversation${historySessions.length !== 1 ? 's' : ''} saved`
                  : (activeSession?.title || 'Active Conversation')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!showHistoryView ? (
              <>
                <button
                  type="button"
                  onClick={handleNewChat}
                  aria-label="New chat"
                  className="apple-glass-btn h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold text-foreground border border-white/35 dark:border-white/15 active:scale-95 transition-all cursor-pointer"
                  title="Start a new conversation"
                >
                  <Icon name="add" size={16} />
                  <span className="hidden xs:inline">New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryView(true)}
                  aria-label="View history"
                  className="apple-glass-btn h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold text-foreground border border-white/35 dark:border-white/15 active:scale-95 transition-all cursor-pointer"
                  title="Past conversations"
                >
                  <Icon name="history" size={16} />
                  <span className="hidden xs:inline">History</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowHistoryView(false)}
                aria-label="Back to conversation"
                className="apple-glass-btn size-8 rounded-xl flex items-center justify-center text-foreground border border-white/35 dark:border-white/15 active:scale-95 transition-all cursor-pointer"
                title="Back to conversation"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY: SWITCHES BETWEEN HISTORY VIEW AND ACTIVE CHAT FEED */}
        {showHistoryView ? (
          /* FULL-VIEW CHAT HISTORY */
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Search & New Chat Action Bar */}
            <div className="p-3 sm:p-4 border-b border-border/50 dark:border-white/10 space-y-2.5 bg-white/15 dark:bg-white/[0.02]">
              <button
                onClick={handleNewChat}
                className="apple-glass-btn w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-foreground border border-white/40 dark:border-white/18 shadow-sm active:scale-98 cursor-pointer select-none group"
              >
                <Icon name="add" size={16} className="text-foreground group-hover:rotate-90 transition-transform duration-300" />
                <span>Start New Conversation</span>
              </button>

              <div className="relative">
                <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search past conversations..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-black/10 dark:border-white/12 bg-white/50 dark:bg-white/[0.05] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 backdrop-blur-md shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.03)]"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div ref={historyScrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 overscroll-contain chat-scrollbar">
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
                      className={`group relative p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 shadow-xs backdrop-blur-md ${
                        isActive
                          ? 'bg-foreground/12 dark:bg-white/15 border-foreground/30 dark:border-white/25 text-foreground font-semibold shadow-xs'
                          : 'border-white/40 dark:border-white/10 bg-white/35 hover:bg-white/60 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-foreground'
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
                        className="size-7 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-all shrink-0"
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
              <div className="p-3 border-t border-border/50 dark:border-white/10 bg-white/20 dark:bg-white/[0.02] backdrop-blur-md shrink-0">
                <button
                  onClick={handleClearAllHistory}
                  className="w-full h-8.5 rounded-xl border border-destructive/30 hover:bg-destructive/10 text-destructive text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  <Icon name="delete_sweep" size={15} />
                  <span>Clear All Conversation History</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CHAT FEED & INPUT VIEW */
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200 relative">
            {/* CHAT MESSAGES FEED */}
            <div 
              ref={chatScrollContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain chat-scrollbar"
            >
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Author Label Above Chatbox */}
                  <div className={`flex items-center gap-1.5 px-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'user' ? (
                      <span className="text-[11px] font-bold tracking-tight text-foreground/80">
                        You
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="size-4 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
                          <Icon name="auto_awesome" size={10} className="text-white dark:text-neutral-900" />
                        </div>
                        <span className="text-[11px] font-black tracking-tight text-foreground">
                          Kormiis AI
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed relative backdrop-blur-xl saturate-[1.4] ${
                      msg.role === 'user'
                        ? 'rounded-tr-xs bg-white/90 dark:bg-white/[0.14] border border-white/70 dark:border-white/18 text-foreground shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.60)]'
                        : msg.isError
                        ? 'rounded-tl-xs bg-destructive/15 border border-destructive/30 text-destructive'
                        : 'rounded-tl-xs bg-white/70 dark:bg-white/[0.07] border border-white/50 dark:border-white/12 text-foreground shadow-[0_2px_10px_-2px_rgba(0,0,0,0.04),inset_0_1px_1px_0_rgba(255,255,255,0.40)]'
                    }`}
                  >
                    {/* Attached File Preview inside Message */}
                    {msg.fileData && (
                      <div className="mb-2.5 p-2 rounded-xl bg-black/[0.04] dark:bg-white/10 flex items-center gap-2 text-xs">
                        <Icon name="attachment" size={16} />
                        <span className=" break-words font-semibold">{msg.fileData.name}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Quick Action Suggestion Pills inside the Welcome Bubble */}
                    {index === 0 && msg.role === 'model' && (
                      <div className="mt-3 pt-2.5 border-t border-border/40 dark:border-white/10 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground w-full block mb-0.5 uppercase tracking-wider">
                          Suggested actions:
                        </span>
                        {QUICK_ACTIONS.map(qa => (
                          <button
                            key={qa.label}
                            onClick={() => handleSend(qa.prompt)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl border border-white/40 dark:border-white/15 bg-white/60 dark:bg-white/[0.08] hover:bg-white/90 dark:hover:bg-white/[0.18] text-[11px] font-semibold text-foreground/90 hover:text-foreground cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                          >
                            <span>{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    {msg.timestamp && (
                      <div className={`text-[10px] mt-1.5 font-medium text-muted-foreground ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* ACTION CONFIRMATION CARDS */}
                  {msg.pendingActions?.map(action => (
                    <div
                      key={action.actionId}
                      className="w-full max-w-[95%] sm:max-w-[85%] rounded-2xl p-4 glass-card border border-white/30 dark:border-white/15 bg-white/40 dark:bg-white/[0.04] shadow-md space-y-3 animate-in fade-in duration-300"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Proposed Action: {action.name.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {action.status === 'executed' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                            <Icon name="check" size={12} /> Applied
                          </span>
                        )}
                        {action.status === 'cancelled' && (
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Cancelled
                          </span>
                        )}
                      </div>

                      {/* Action Arguments Summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(action.args || {}).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block break-words ">
                              {k}
                            </span>
                            <span className="font-semibold text-foreground break-words block mt-0.5">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      {action.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleCancelAction(msg.id, action.actionId)}
                            className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer active:scale-95 transition-all"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleExecuteAction(msg.id, action.actionId, action.name, action.args)}
                            className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
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
                <div className="flex items-center gap-2 p-3 rounded-2xl glass-card text-xs text-muted-foreground w-fit animate-pulse">
                  <Icon name="auto_awesome" size={16} className="text-foreground animate-spin" />
                  <span>Kormiis AI is thinking and preparing actions...</span>
                </div>
              )}
            </div>

            {/* JUMP TO LATEST MESSAGES FLOATING BUTTON (CENTERED MONOGLASS PILL) */}
            {showScrollBottomBtn && (
              <div className="absolute bottom-[66px] sm:bottom-[70px] left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  aria-label="Scroll to latest messages"
                  className="apple-glass-btn h-8 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-foreground border border-white/45 dark:border-white/20 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.25)] backdrop-blur-xl bg-white/70 dark:bg-white/[0.10] hover:bg-white/90 dark:hover:bg-white/[0.18] active:scale-95 transition-all hover:scale-105 cursor-pointer select-none group"
                  title="Jump to latest message"
                >
                  <Icon name="arrow_downward" size={15} className="text-foreground transition-transform duration-200 group-hover:translate-y-0.5" />
                  <span>Latest</span>
                </button>
              </div>
            )}

            {/* INPUT & ATTACHMENT DOCK */}
            <div className="p-2.5 sm:p-3.5 border-t border-border/60 dark:border-white/10 bg-white/30 dark:bg-white/[0.04] shrink-0 space-y-2">
              {/* File Attachment Chip */}
              {attachedFile && (
                <div className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-foreground/10 border border-foreground/20 text-xs text-foreground">
                  <div className="flex items-center gap-2 break-words ">
                    <Icon name="attach_file" size={14} className="text-foreground shrink-0" />
                    <span className=" break-words font-semibold text-[11px]">{attachedFile.name}</span>
                    <span className="text-[9px] text-muted-foreground">({Math.round(attachedFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="size-4.5 rounded-full flex items-center justify-center hover:bg-foreground/15 text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="flex items-center gap-1.5"
              >
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload document, excel sheet, or receipt"
                  className="apple-glass-btn size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
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
                  className={`apple-glass-btn size-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse border-rose-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Speak voice command"
                >
                  <Icon name={isRecording ? 'mic' : 'mic_none'} size={18} />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder={isRecording ? 'Listening to voice...' : 'Ask AI to add employee, update payroll, log expense...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 h-9.5 px-3.5 rounded-xl border border-black/10 dark:border-white/12 bg-white/70 dark:bg-white/[0.07] text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground"
                />

                {/* Send Button (MonoGlass Liquid Glass Button) */}
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  aria-label="Send command"
                  className="apple-glass-btn size-9.5 rounded-xl flex items-center justify-center cursor-pointer text-foreground active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 border border-white/35 dark:border-white/15 shadow-xs hover:scale-102"
                  title="Send command (Enter)"
                >
                  <Icon name="send" size={17} className="text-foreground" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
