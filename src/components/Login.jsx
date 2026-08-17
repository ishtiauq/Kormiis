import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import kormiisWhiteLogo from '../Assets/Kormiis white Logo.svg'
import { 
  loginWithGoogle, 
  getGoogleRedirectResult, 
  createBusinessSpace, 
  getCompanyForUser, 
  getInviteByEmail, 
  acceptInvite, 
  loginWithEmail, 
  registerWithEmail 
} from '../services/auth.js'
import { auth } from '../services/firebase.js'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { recordLoginActivity } from '../services/hr.js'

// Landing Page Header & Footer
import LandingHeader from './landing/LandingHeader.jsx'
import LandingFooter from './landing/LandingFooter.jsx'

export default function Login({ onLogin, themeMode, toggleTheme, setThemeMode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [authTab, setAuthTab] = useState('in') // 'in' (Sign in) | 'up' (Sign up)
  const [loginMode, setLoginMode] = useState(null) // null | 'create' | 'join'
  const [pendingUser, setPendingUser] = useState(null) // Google user awaiting business space creation
  const [spaceName, setSpaceName] = useState('')
  const [showAlreadyInSpace, setShowAlreadyInSpace] = useState(false)
  const [alreadyUser, setAlreadyUser] = useState(null)
  const [loadingMode, setLoadingMode] = useState(null)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [legalModal, setLegalModal] = useState(null) // 'privacy' | 'terms' | null

  // Rotating typing words for headline
  const ROTATING_WORDS = ['Kormiis', 'Team', 'Employees', 'Squad', 'People']
  const [typed, setTyped] = useState('Kormiis')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)

  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex]
    let timeout

    if (isWaiting) {
      timeout = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, 1800)
    } else if (!isDeleting) {
      timeout = setTimeout(() => {
        const next = word.slice(0, typed.length + 1)
        setTyped(next)
        if (next === word) setIsWaiting(true)
      }, 110)
    } else {
      timeout = setTimeout(() => {
        if (typed.length <= 1) {
          setIsDeleting(false)
          setTyped('')
          setWordIndex((i) => (i + 1) % ROTATING_WORDS.length)
        } else {
          setTyped(word.slice(0, typed.length - 1))
        }
      }, 50)
    }

    return () => clearTimeout(timeout)
  }, [typed, isDeleting, isWaiting, wordIndex])

  const loginCardRef = useRef(null)

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (window.deferredPWAInstallPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt)
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      window.deferredPWAInstallPrompt = e
      setDeferredPrompt(e)
    }

    const handleCustomEvent = () => {
      if (window.deferredPWAInstallPrompt) {
        setDeferredPrompt(window.deferredPWAInstallPrompt)
      }
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('pwa-installable', handleCustomEvent)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('pwa-installable', handleCustomEvent)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("App installation is not available right now. You might have already installed it, or your browser may not support it.")
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      window.deferredPWAInstallPrompt = null
    }
  }

  // Set dark theme on landing page
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
    return () => {
      if (!hadDark) {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    }
  }, [])

  const adminSession = (account) => ({
    id: account.id,
    uid: account.id,
    name: account.name,
    email: account.email,
    role: 'Admin',
    companyName: account.companyName,
    avatar: '',
    isWorkspaceOwner: true,
    adminAccountId: account.id,
    token: account.id
  })

  const completeAdminLogin = (user, companyName) => {
    setIsLoading(true)
    recordLoginActivity(user?.uid, user?.uid)
    setTimeout(() => {
      setIsLoading(false)
      setLoadingMode(null)
      onLogin(adminSession({
        id: user?.uid || 'local',
        name: user?.displayName || 'System Admin',
        email: user?.email || 'admin@company.com',
        companyName: companyName || 'Kormiis Ltd.'
      }))
    }, 300)
  }

  const completeTeammateLogin = (company, user) => {
    const employeeUser = {
      name: company.fullName || company.name || user.displayName || user.email,
      email: user.email,
      role: company.role || 'Teammate',
      department: company.department || '',
      avatar: company.avatar || '',
      isEmployee: true,
      id: company.employeeId,
      employeeId: company.employeeId,
      adminUid: company.companyUid,
      uid: user.uid,
      token: ''
    }
    recordLoginActivity(company.companyUid, user.uid)
    setLoadingMode(null)
    onLogin(employeeUser)
  }

  const finishGoogleLogin = async (user, mode) => {
    if (!user) return
    const company = await getCompanyForUser(user.uid)

    if (company?.companyUid && company.companyUid !== user.uid) {
      if (mode === 'create') {
        promptAlreadyInSpace(user)
        return
      }
      completeTeammateLogin(company, user)
      return
    }

    const invite = user.email ? await getInviteByEmail(user.email) : null
    if (invite?.companyUid) {
      if (mode === 'create') {
        promptAlreadyInSpace(user)
        return
      }
      try {
        await acceptInvite(user, invite)
        completeTeammateLogin(invite, user)
      } catch (err) {
        setError('Could not join your company: ' + err.message)
        setIsLoading(false)
        setLoadingMode(null)
      }
      return
    }

    if (company) {
      if (mode === 'create') {
        promptAlreadyInSpace(user)
        return
      }
      completeAdminLogin(user, company.companyName)
      return
    }

    if (mode === 'create') {
      setPendingUser(user)
      setIsLoading(false)
      setLoadingMode(null)
      return
    }

    setError('You are not part of the team yet. Ask your admin to add your email, or create your own Business Space.')
    setIsLoading(false)
    setLoadingMode(null)
  }

  const promptAlreadyInSpace = (user) => {
    setAlreadyUser(user)
    setShowAlreadyInSpace(true)
    setIsLoading(false)
    setLoadingMode(null)
  }

  const switchAuthTab = (tab) => {
    setAuthTab(tab)
    setLoginMode(null)
    setPendingUser(null)
    setSpaceName('')
    setEmailOrPhone('')
    setPassword('')
    setError('')
  }

  const useJoinFromPopup = () => {
    const user = alreadyUser
    setShowAlreadyInSpace(false)
    setAlreadyUser(null)
    setError('')
    if (user) finishGoogleLogin(user, 'join')
  }

  const handleCreateBusinessSpace = async (e) => {
    e.preventDefault()
    if (!spaceName.trim()) {
      setError('Please enter a name for your Business Space.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      let activeUser = pendingUser
      if (!activeUser) {
        if (!emailOrPhone || !password) {
          setError('Please provide Email/Phone and Password.')
          setIsLoading(false)
          return
        }
        activeUser = await registerWithEmail(emailOrPhone, password)
      }
      const created = await createBusinessSpace(activeUser, { name: spaceName })
      completeAdminLogin(activeUser, created.companyName)
    } catch (err) {
      setError('Could not create your Business Space: ' + err.message)
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    if (!emailOrPhone || !password) {
      setError('Please provide Email/Phone and Password.')
      return
    }
    setIsLoading(true)
    setLoadingMode('join')
    setError('')
    try {
      const user = await loginWithEmail(emailOrPhone, password)
      await finishGoogleLogin(user, 'join')
    } catch (err) {
      setError('Login failed: ' + err.message)
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  const handleFirebaseGoogleLogin = async (mode) => {
    setError('')
    setIsLoading(true)
    setLoadingMode(mode)
    setLoginMode(mode)
    try {
      let user = auth?.currentUser
      if (!user) {
        const result = await loginWithGoogle()
        if (result.mode === 'redirect') {
          sessionStorage.setItem('kormiis_login_mode', mode)
          return
        }
        user = result.user
      }
      await finishGoogleLogin(user, mode)
    } catch (err) {
      setError('Google Login failed: ' + err.message)
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const finishGoogleRedirect = async () => {
      try {
        const user = await getGoogleRedirectResult()
        if (cancelled || !user) return
        const mode = sessionStorage.getItem('kormiis_login_mode') || 'join'
        sessionStorage.removeItem('kormiis_login_mode')
        await finishGoogleLogin(user, mode)
      } catch (err) {
        if (!cancelled) {
          setError('Google Login failed: ' + err.message)
          setIsLoading(false)
          setLoadingMode(null)
        }
      }
    }
    finishGoogleRedirect()
    return () => { cancelled = true }
  }, [])

  const openAuthModal = (tab = 'in') => {
    switchAuthTab(tab)
    if (loginCardRef.current) {
      loginCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="dark force-dark-mode min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-primary selection:text-white">
      
      {/* 1. Header */}
      <LandingHeader
        onOpenAuth={openAuthModal}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
      />

      {/* 2. Main Hero & Login Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-6xl mx-auto w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          
          {/* Left Column: Manage your team Headline directly above image */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-[#bbbbbb] mb-3.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Smart Workforce & Operations</span>
            </div>

            {/* Bold Headline directly above image with typing animation */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-fluid-xl font-black tracking-tight text-white leading-tight">
                Manage your{' '}
                <span className="text-primary relative inline-block">
                  {typed || '\u00A0'}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    className="inline-block w-[3px] sm:w-[4px] h-[0.82em] bg-primary align-baseline ml-1"
                  />
                </span>{' '}
                with Ease
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-[#bbbbbb] mt-2.5 leading-relaxed max-w-xl">
                The modern all-in-one workspace for live attendance, automated payroll, shift schedules, and daily squad operations.
              </p>

              {/* Feature Micro-Chips */}
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-[#888888]">
                <div className="flex items-center gap-1.5">
                  <Icon name="check_circle" size={14} className="text-primary" />
                  <span>Real-time GPS Punch Clock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="check_circle" size={14} className="text-primary" />
                  <span>Automated Payroll & Slips</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="check_circle" size={14} className="text-primary" />
                  <span>1-Click Team Invites</span>
                </div>
              </div>
            </div>

            {/* Clean Image with NO background container */}
            <div className="w-full flex items-center justify-center pt-2">
              <img 
                src="/Hero%20Assets.png" 
                alt="Manage your Team with Ease" 
                className="w-full h-auto max-h-[460px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Right Column: Login Modal / Card */}
          <div ref={loginCardRef} className="lg:col-span-5 w-full flex justify-center">
            <div className="w-full max-w-[420px] bg-[#09090b] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
              
              {/* Card Brand Header */}
              <div className="flex flex-col items-center justify-center gap-1.5 mb-5 text-center">
                <img src={kormiisWhiteLogo} alt="Kormiis" className="h-7 sm:h-8 object-contain" />
                <p className="text-xs text-[#bbbbbb] font-medium">
                  Free for your whole squad. No credit card required.
                </p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="flex items-center p-1 rounded-full bg-[#141416] border border-white/10 mb-5">
                <button
                  type="button"
                  onClick={() => switchAuthTab('in')}
                  className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                    authTab === 'in' ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#bbbbbb] hover:text-white'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthTab('up')}
                  className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                    authTab === 'up' ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#bbbbbb] hover:text-white'
                  }`}
                >
                  Sign up
                </button>
              </div>

              {/* Form & Error Handling */}
              <div className="flex flex-col gap-3.5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-xs font-medium bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-start gap-2"
                  >
                    <Icon name="warning" size={16} className="text-destructive shrink-0 mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}

                {loginMode === 'create' && pendingUser ? (
                  <form onSubmit={handleCreateBusinessSpace} className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="space-name" className="block text-xs font-bold text-white mb-1.5">
                        Business Space Name
                      </label>
                      <div className="relative flex items-center">
                        <Icon name="corporate_fare" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          id="space-name"
                          value={spaceName}
                          onChange={(e) => setSpaceName(e.target.value)}
                          placeholder="e.g. Acme Studio"
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-[#bbbbbb] mt-1.5 leading-relaxed">
                        This becomes your company profile. You'll be the workspace owner (admin).
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Icon name="progress_activity" size={16} className="animate-spin" />
                          <span>Creating Workspace...</span>
                        </>
                      ) : (
                        <span>Create Business Space</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMode(null); setPendingUser(null); setSpaceName(''); setError('') }}
                      disabled={isLoading}
                      className="text-xs text-[#bbbbbb] hover:text-white transition py-1 font-medium text-center"
                    >
                      ← Back to options
                    </button>
                  </form>
                ) : authTab === 'in' ? (
                  <div className="flex flex-col gap-3">
                    <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2.5 w-full">
                      <div className="relative flex items-center">
                        <Icon name="mail" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Work Email or Phone"
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        />
                      </div>
                      <div className="relative flex items-center">
                        <Icon name="lock" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 pr-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#888888] hover:text-white p-1 transition-colors"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-primary rounded-full text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 shadow-sm mt-1 flex items-center justify-center gap-2"
                      >
                        {isLoading && loadingMode === 'join' ? (
                          <>
                            <Icon name="progress_activity" size={16} className="animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <span>Sign in</span>
                        )}
                      </button>
                    </form>

                    <div className="flex items-center gap-3 my-0.5 opacity-40">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-[10px] font-bold text-[#bbbbbb] tracking-wider">OR</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFirebaseGoogleLogin('join')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#141416] border border-white/10 rounded-full text-xs sm:text-sm font-bold text-white hover:bg-[#1f1f23] active:scale-[0.99] transition disabled:opacity-50 shadow-sm"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <form onSubmit={(e) => { e.preventDefault(); setLoginMode('create'); setPendingUser(null); handleCreateBusinessSpace(e) }} className="flex flex-col gap-2.5 w-full">
                      <div className="relative flex items-center">
                        <Icon name="mail" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Work Email"
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        />
                      </div>
                      <div className="relative flex items-center">
                        <Icon name="lock" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 pr-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#888888] hover:text-white p-1 transition-colors"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <Icon name="corporate_fare" size={18} className="absolute left-3.5 text-[#888888] pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Company / Business Name"
                          value={spaceName}
                          onChange={(e) => setSpaceName(e.target.value)}
                          className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-[#141416] border-white/10 text-white placeholder:text-[#666666] focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-primary rounded-full text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 shadow-sm mt-1 flex items-center justify-center gap-2"
                      >
                        {isLoading && loadingMode === 'create' ? (
                          <>
                            <Icon name="progress_activity" size={16} className="animate-spin" />
                            <span>Creating Workspace...</span>
                          </>
                        ) : (
                          <span>Create Business Space</span>
                        )}
                      </button>
                    </form>

                    <div className="flex items-center gap-3 my-0.5 opacity-40">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-[10px] font-bold text-[#bbbbbb] tracking-wider">OR</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFirebaseGoogleLogin('create')}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#141416] border border-white/10 rounded-full text-xs sm:text-sm font-bold text-white hover:bg-[#1f1f23] active:scale-[0.99] transition disabled:opacity-50 shadow-sm"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                      <span>Sign up with Google</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="text-[11px] text-[#bbbbbb] leading-relaxed">
                  By continuing, you agree to our{' '}
                  <button 
                    type="button" 
                    onClick={() => setLegalModal('terms')}
                    className="underline hover:text-white transition-colors"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button 
                    type="button" 
                    onClick={() => setLegalModal('privacy')}
                    className="underline hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </button>.
                </p>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* 3. Footer */}
      <LandingFooter 
        onOpenAuth={openAuthModal} 
        onOpenLegal={(type) => setLegalModal(type)}
      />

      {/* Already in a Business Space Popup */}
      <Dialog open={showAlreadyInSpace} onOpenChange={(open) => { if (!open) setShowAlreadyInSpace(false) }}>
        <DialogContent className="max-w-[420px] rounded-2xl bg-[#09090b] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Already Part of a Business Space</DialogTitle>
            <DialogDescription className="text-xs text-[#bbbbbb]">
              This account is already linked to a Business Space. Sign in to enter your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-xl bg-[#141416] border border-white/10 text-xs text-[#bbbbbb] flex items-start gap-2">
            <Icon name="info" className="shrink-0 mt-0.5 text-primary" size={16} />
            <span>You can only belong to one workspace at a time.</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full text-xs border-white/10 text-white hover:bg-[#141416]" onClick={() => setShowAlreadyInSpace(false)}>
              Cancel
            </Button>
            <Button className="rounded-full text-xs bg-primary text-white hover:opacity-90" onClick={useJoinFromPopup}>
              Sign In to Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal & Policies Dialog Modal */}
      <Dialog open={!!legalModal} onOpenChange={(open) => { if (!open) setLegalModal(null) }}>
        <DialogContent className="max-w-[540px] rounded-2xl bg-[#09090b] border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-white">
              {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#bbbbbb]">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 text-xs sm:text-sm text-[#bbbbbb] space-y-4 leading-relaxed">
            {legalModal === 'privacy' ? (
              <>
                <p>
                  At <strong>Kormiis</strong>, we are committed to protecting your privacy. This Privacy Policy explains how your information is collected, used, and safeguarded when using our workforce management software.
                </p>
                <div>
                  <h4 className="text-white font-bold mb-1">1. Information We Collect</h4>
                  <p>We collect essential account details (name, work email, company name) and attendance records (time punches, verified GPS coordinates for check-ins) necessary to provide team scheduling and payroll services.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">2. Data Security & Storage</h4>
                  <p>Your team's data is securely stored and encrypted via modern cloud architecture. We do not sell or rent personal information to third parties.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">3. Your Rights</h4>
                  <p>Admins and users may export, correct, or delete their profile information directly from their Workspace Settings at any time.</p>
                </div>
              </>
            ) : (
              <>
                <p>
                  Welcome to <strong>Kormiis</strong>. By signing in or creating a Business Space, you agree to these Terms of Service.
                </p>
                <div>
                  <h4 className="text-white font-bold mb-1">1. Account & Workspace Integrity</h4>
                  <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur within your Business Space.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">2. Acceptable Use</h4>
                  <p>You agree to use Kormiis only for lawful business operations, team coordination, time tracking, and HR operations in compliance with applicable local labor laws.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">3. Service Availability</h4>
                  <p>We continuously optimize for 99.9% uptime. Automated backups ensure your team data remains safe and accessible.</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="rounded-full text-xs font-bold bg-primary text-white hover:opacity-90 px-5" 
              onClick={() => setLegalModal(null)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

