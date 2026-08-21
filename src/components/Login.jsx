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
  registerWithEmail,
  formatAuthError
} from '../services/auth.js'
import { auth } from '../services/firebaseCore.js'
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

// Landing Page Header & Footer
import LandingFooter from './landing/LandingFooter.jsx'

const HERO_FEATURE_ROWS = [
  // Row 1: Core Operations & Productivity
  [
    { 
      id: 'attendance', 
      label: 'Attendance & Leaves', 
      tag: 'GPS Punch', 
      icon: 'schedule', 
      iconGrad: 'from-emerald-400 via-teal-500 to-emerald-700',
      iconShadow: 'shadow-emerald-500/30',
      pillBg: 'from-emerald-950/90 via-[#0d221a]/90 to-[#081510]/95',
      tagBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/50',
      rimLight: 'from-transparent via-emerald-400/90 to-transparent',
    },
    { 
      id: 'payroll', 
      label: 'Automated Payroll', 
      tag: 'Auto Payslips', 
      icon: 'payments', 
      iconGrad: 'from-amber-400 via-orange-500 to-amber-700',
      iconShadow: 'shadow-amber-500/30',
      pillBg: 'from-amber-950/90 via-[#261705]/90 to-[#140b02]/95',
      tagBg: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/50',
      rimLight: 'from-transparent via-amber-400/90 to-transparent',
    },
    { 
      id: 'employees', 
      label: 'Employees & Squads', 
      tag: 'Team Directory', 
      icon: 'group', 
      iconGrad: 'from-blue-400 via-indigo-500 to-blue-700',
      iconShadow: 'shadow-blue-500/30',
      pillBg: 'from-blue-950/90 via-[#0a1832]/90 to-[#050e1f]/95',
      tagBg: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/50',
      rimLight: 'from-transparent via-sky-400/90 to-transparent',
    },
    { 
      id: 'tasks', 
      label: 'Task Management', 
      tag: 'Kanban Tasks', 
      icon: 'check_box', 
      iconGrad: 'from-purple-400 via-fuchsia-500 to-purple-700',
      iconShadow: 'shadow-purple-500/30',
      pillBg: 'from-purple-950/90 via-[#220c30]/90 to-[#13061c]/95',
      tagBg: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm shadow-purple-500/50',
      rimLight: 'from-transparent via-purple-400/90 to-transparent',
    },
    { 
      id: 'performance', 
      label: 'Performance Insights', 
      tag: 'KPI & Goals', 
      icon: 'insights', 
      iconGrad: 'from-rose-400 via-pink-500 to-rose-700',
      iconShadow: 'shadow-rose-500/30',
      pillBg: 'from-rose-950/90 via-[#290a16]/90 to-[#17050b]/95',
      tagBg: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-500/50',
      rimLight: 'from-transparent via-rose-400/90 to-transparent',
    },
    { 
      id: 'calendar', 
      label: 'Company Events', 
      tag: 'Holiday Sync', 
      icon: 'calendar_month', 
      iconGrad: 'from-cyan-400 via-sky-500 to-cyan-700',
      iconShadow: 'shadow-cyan-500/30',
      pillBg: 'from-cyan-950/90 via-[#06202b]/90 to-[#021017]/95',
      tagBg: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/50',
      rimLight: 'from-transparent via-cyan-400/90 to-transparent',
    },
    { 
      id: 'expenses', 
      label: 'Expense Claims', 
      tag: 'Receipt OCR', 
      icon: 'wallet', 
      iconGrad: 'from-lime-400 via-emerald-500 to-lime-700',
      iconShadow: 'shadow-lime-500/30',
      pillBg: 'from-lime-950/90 via-[#162408]/90 to-[#0c1404]/95',
      tagBg: 'bg-gradient-to-r from-lime-400 to-emerald-600 text-slate-950 shadow-sm shadow-lime-500/50 font-black',
      rimLight: 'from-transparent via-lime-400/90 to-transparent',
    },
    { 
      id: 'dashboard', 
      label: 'Live Dashboard', 
      tag: 'Realtime Pulse', 
      icon: 'dashboard', 
      iconGrad: 'from-red-400 via-rose-500 to-red-700',
      iconShadow: 'shadow-red-500/30',
      pillBg: 'from-red-950/90 via-[#26080e]/90 to-[#140306]/95',
      tagBg: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/50',
      rimLight: 'from-transparent via-red-400/90 to-transparent',
    },
  ],
  // Row 2: Collaboration, Well-being & Control
  [
    { 
      id: 'documents', 
      label: 'Smart Documents', 
      tag: 'Cloud Vault', 
      icon: 'folder_open', 
      iconGrad: 'from-indigo-400 via-violet-500 to-indigo-700',
      iconShadow: 'shadow-indigo-500/30',
      pillBg: 'from-indigo-950/90 via-[#141235]/90 to-[#09081e]/95',
      tagBg: 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/50',
      rimLight: 'from-transparent via-indigo-400/90 to-transparent',
    },
    { 
      id: 'assets', 
      label: 'Asset Tracking', 
      tag: 'Device Kits', 
      icon: 'devices_other', 
      iconGrad: 'from-teal-400 via-emerald-500 to-teal-700',
      iconShadow: 'shadow-teal-500/30',
      pillBg: 'from-teal-950/90 via-[#072422]/90 to-[#031413]/95',
      tagBg: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/50',
      rimLight: 'from-transparent via-teal-400/90 to-transparent',
    },
    { 
      id: 'announcements', 
      label: 'Team Broadcasts', 
      tag: 'Push Alerts', 
      icon: 'rss_feed', 
      iconGrad: 'from-orange-400 via-amber-500 to-orange-700',
      iconShadow: 'shadow-orange-500/30',
      pillBg: 'from-orange-950/90 via-[#271506]/90 to-[#150a02]/95',
      tagBg: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-500/50',
      rimLight: 'from-transparent via-orange-400/90 to-transparent',
    },
    { 
      id: 'gigs', 
      label: 'Help Hub & Support', 
      tag: '1-Click Help', 
      icon: 'handshake', 
      iconGrad: 'from-yellow-400 via-amber-500 to-yellow-700',
      iconShadow: 'shadow-yellow-500/30',
      pillBg: 'from-yellow-950/90 via-[#271d04]/90 to-[#140e01]/95',
      tagBg: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-sm shadow-yellow-500/50 font-black',
      rimLight: 'from-transparent via-yellow-400/90 to-transparent',
    },
    { 
      id: 'wellbeing', 
      label: 'Team Well-being', 
      tag: 'Mood Tracker', 
      icon: 'favorite', 
      iconGrad: 'from-pink-400 via-rose-500 to-pink-700',
      iconShadow: 'shadow-pink-500/30',
      pillBg: 'from-pink-950/90 via-[#2b0c22]/90 to-[#170512]/95',
      tagBg: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm shadow-pink-500/50',
      rimLight: 'from-transparent via-pink-400/90 to-transparent',
    },
    { 
      id: 'notes', 
      label: 'Smart Wiki & Notes', 
      tag: 'Rich Docs', 
      icon: 'sticky_note_2', 
      iconGrad: 'from-emerald-400 via-teal-500 to-emerald-700',
      iconShadow: 'shadow-emerald-500/30',
      pillBg: 'from-emerald-950/90 via-[#0d221a]/90 to-[#081510]/95',
      tagBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/50',
      rimLight: 'from-transparent via-emerald-400/90 to-transparent',
    },
    { 
      id: 'settings', 
      label: 'Security & Roles', 
      tag: 'RBAC Access', 
      icon: 'admin_panel_settings', 
      iconGrad: 'from-violet-400 via-purple-500 to-violet-700',
      iconShadow: 'shadow-violet-500/30',
      pillBg: 'from-violet-950/90 via-[#1f0d36]/90 to-[#10051e]/95',
      tagBg: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/50',
      rimLight: 'from-transparent via-violet-400/90 to-transparent',
    },
    { 
      id: 'geo', 
      label: 'GPS Geofence Clock', 
      tag: 'Radius Check', 
      icon: 'pin_drop', 
      iconGrad: 'from-red-400 via-rose-500 to-red-700',
      iconShadow: 'shadow-red-500/30',
      pillBg: 'from-red-950/90 via-[#26080e]/90 to-[#140306]/95',
      tagBg: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/50',
      rimLight: 'from-transparent via-red-400/90 to-transparent',
    },
  ]
]
const ALL_HERO_FEATURES = [...HERO_FEATURE_ROWS[0], ...HERO_FEATURE_ROWS[1]]

export default function Login({ onLogin, themeMode, toggleTheme, setThemeMode }) {
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Auth / onboarding state
  const [authTab, setAuthTab] = useState('in') // 'in' (Sign in) | 'up' (Sign up)
  const [loginMode, setLoginMode] = useState(null) // null | 'create' | 'join'
  const [pendingUser, setPendingUser] = useState(null) // Google user awaiting business space creation
  const [spaceName, setSpaceName] = useState('')
  const [showAlreadyInSpace, setShowAlreadyInSpace] = useState(false)
  const [alreadyUser, setAlreadyUser] = useState(null)
  const [loadingMode, setLoadingMode] = useState(null)
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('kormiis_remember_me') !== 'false'
    } catch {
      return true
    }
  })
  const [emailOrPhone, setEmailOrPhone] = useState(() => {
    try {
      const isRemembered = localStorage.getItem('kormiis_remember_me') !== 'false'
      return isRemembered ? (localStorage.getItem('kormiis_last_identifier') || '') : ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isPhoneInput = React.useMemo(() => {
    const trimmed = (emailOrPhone || '').trim()
    const digits = trimmed.replace(/[^\d]/g, '')
    return (/^\+?[0-9\s-]+$/.test(trimmed) && digits.length >= 3) || digits.startsWith('01')
  }, [emailOrPhone])

  const [showPassword, setShowPassword] = useState(false)
  const [legalModal, setLegalModal] = useState(null) // 'privacy' | 'terms' | null
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Rotating typing words for headline
  const ROTATING_WORDS = ['KORMIIS', 'TEAM', 'SQUAD', 'PEOPLE']
  const [typed, setTyped] = useState('KORMIIS')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = '/Hero%20Asset.webp'
    link.type = 'image/webp'
    link.fetchPriority = 'high'
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex % ROTATING_WORDS.length] || ROTATING_WORDS[0]
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

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const companyFromUrl = searchParams.get('company') || searchParams.get('workspace')
      if (companyFromUrl) {
        setAuthModalOpen(true)
        setAuthTab('in')
      }
    } catch {
      // ignore in environments without window.location.search
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install the app, use your browser menu (e.g. Chrome 3 dots -> Install App, or Safari -> Add to Home Screen).')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      window.deferredPWAInstallPrompt = null
    }
  }

// --- Auth Handlers ---

  const completeAdminLogin = (user, companyName) => {
    const adminObj = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Workspace Owner',
      companyName: companyName || 'My Workspace',
      companyUid: user.uid,
      role: 'Admin',
      department: 'Management',
    }
    setIsLoading(false)
    setLoadingMode(null)
    setPendingUser(null)
    setLoginMode(null)
    setAuthModalOpen(false)
    onLogin(adminObj)
  }

  const completeTeammateLogin = (user, linkage) => {
    const teammateObj = {
      uid: user.uid,
      email: user.email,
      name: linkage.fullName || user.displayName || user.email?.split('@')[0] || 'Teammate',
      companyName: linkage.companyName || 'My Workspace',
      companyUid: linkage.companyUid,
      employeeId: linkage.employeeId,
      role: linkage.role || 'Teammate',
      department: linkage.department || 'General',
      avatar: linkage.avatar || user.photoURL || '',
    }
    setIsLoading(false)
    setLoadingMode(null)
    setPendingUser(null)
    setLoginMode(null)
    setAuthModalOpen(false)
    onLogin(teammateObj)
  }

  const finishGoogleLogin = async (user, mode) => {
    try {
      let linkage = await getCompanyForUser(user.uid)
      
      // 1. If no direct company linkage found, check if an email invite exists
      if (!linkage?.companyUid && user.email) {
        try {
          const invite = await getInviteByEmail(user.email)
          if (invite?.companyUid) {
            await acceptInvite(user, invite)
            linkage = await getCompanyForUser(user.uid)
          }
        } catch (inviteErr) {
          console.warn('Error resolving invite for user:', inviteErr)
        }
      }

      // 2. If still not linked, check if user came via a ?company= invite link
      if (!linkage?.companyUid) {
        try {
          const searchParams = new URLSearchParams(window.location.search)
          const companyFromUrl = searchParams.get('company') || searchParams.get('workspace')
          if (companyFromUrl) {
            const autoInvite = {
              companyUid: companyFromUrl,
              role: 'Teammate',
              department: 'General',
              name: user.displayName || user.email?.split('@')[0] || 'Teammate',
              employeeId: '',
            }
            await acceptInvite(user, autoInvite)
            linkage = await getCompanyForUser(user.uid)
          }
        } catch (urlInviteErr) {
          console.warn('Error linking via company url param:', urlInviteErr)
        }
      }

      if (linkage?.companyUid) {
        if (linkage.companyUid === user.uid) {
          completeAdminLogin(user, linkage.companyName)
        } else {
          completeTeammateLogin(user, linkage)
        }
        return
      }

      if (mode === 'create') {
        setPendingUser(user)
        setLoginMode('create')
        setIsLoading(false)
        setLoadingMode(null)
        return
      }

      if (mode === 'join') {
        const adminObj = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Workspace Owner',
          companyName: 'My Workspace',
          companyUid: user.uid,
          role: 'Admin',
          department: 'Management',
        }
        setIsLoading(false)
        setLoadingMode(null)
        setAuthModalOpen(false)
        onLogin(adminObj)
        return
      }
    } catch (err) {
      setError('Error resolving your workspace: ' + err.message)
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  const switchAuthTab = (tab) => {
    setAuthTab(tab)
    setLoginMode(null)
    setPendingUser(null)
    setSpaceName('')
    if (tab === 'in' && rememberMe) {
      try {
        setEmailOrPhone(localStorage.getItem('kormiis_last_identifier') || '')
      } catch {
        setEmailOrPhone('')
      }
    } else {
      setEmailOrPhone('')
    }
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
      if (rememberMe) {
        localStorage.setItem('kormiis_last_identifier', emailOrPhone.trim())
        localStorage.setItem('kormiis_remember_me', 'true')
      } else {
        localStorage.removeItem('kormiis_last_identifier')
        localStorage.setItem('kormiis_remember_me', 'false')
      }
      let activeUser = pendingUser
      if (!activeUser) {
        if (!emailOrPhone.trim() || !password) {
          setError('Please provide Email/Phone and Password.')
          setIsLoading(false)
          return
        }
        activeUser = await registerWithEmail(emailOrPhone, password, rememberMe)
      }
      const created = await createBusinessSpace(activeUser, { name: spaceName })
      completeAdminLogin(activeUser, created.companyName)
    } catch (err) {
      setError(formatAuthError(err))
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    if (!emailOrPhone.trim() || !password) {
      setError('Please provide Email/Phone and Password.')
      return
    }
    setIsLoading(true)
    setLoadingMode('join')
    setError('')
    try {
      if (rememberMe) {
        localStorage.setItem('kormiis_last_identifier', emailOrPhone.trim())
        localStorage.setItem('kormiis_remember_me', 'true')
      } else {
        localStorage.removeItem('kormiis_last_identifier')
        localStorage.setItem('kormiis_remember_me', 'false')
      }
      const user = await loginWithEmail(emailOrPhone, password, rememberMe)
      await finishGoogleLogin(user, 'join')
    } catch (err) {
      setError(formatAuthError(err))
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
      localStorage.setItem('kormiis_remember_me', rememberMe ? 'true' : 'false')
      let user = auth?.currentUser
      if (!user) {
        const result = await loginWithGoogle(rememberMe)
        if (result.mode === 'redirect') {
          sessionStorage.setItem('kormiis_login_mode', mode)
          return
        }
        user = result.user
      }
      await finishGoogleLogin(user, mode)
    } catch (err) {
      setError(formatAuthError(err))
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
    setAuthModalOpen(true)
  }

  return (
    <div 
      ref={containerRef}
      className="dark force-dark-mode min-h-screen w-full text-foreground relative font-sans scroll-smooth transition-colors duration-[1500ms] ease-[cubic-bezier(0.4,0,0.2,1)] selection:bg-primary/30 overflow-x-hidden"
    >
      {/* 1A. Mobile Top-Left Brand Logo (Compact on mobile: sm:hidden) */}
      <motion.div 
        initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="sm:hidden absolute top-4 left-4 z-30 pointer-events-auto"
      >
        <a href="#" className="flex items-center hover:opacity-80 active:scale-95 transition-all">
          <img 
            src={kormiisWhiteLogo} 
            alt="Kormiis Logo" 
            className="h-5.5 w-auto object-contain drop-shadow-md" 
          />
        </a>
      </motion.div>

      {/* 1B. Desktop & Tablet Floating Apple Liquid Glass Top Navigation Bar (sm+ screens) */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 z-50 w-full pt-4 md:pt-5 px-4 sm:px-6 pointer-events-none transition-all duration-300">
        <motion.header 
          initial={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto max-w-6xl mx-auto h-14 sm:h-15 md:h-16 px-4 sm:px-6 flex items-center justify-between landing-glass-header text-white transition-all duration-300"
        >
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2 shrink-0 hover:opacity-85 active:scale-95 transition-all">
            <img 
              src={kormiisWhiteLogo} 
              alt="Kormiis Logo" 
              className="h-6 sm:h-7 md:h-8 w-auto object-contain drop-shadow-md" 
            />
          </a>

          {/* Right Action Group */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install App Button */}
            <button
              onClick={handleInstallClick}
              className="apple-glass-btn flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Install App as PWA"
            >
              <Icon name="download" size={15} />
              <span className="hidden md:inline">Install App</span>
              <span className="md:hidden">Install</span>
            </button>

            {/* Sign in Button */}
            <button
              onClick={() => openAuthModal('in')}
              className="apple-glass-btn flex items-center px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white/90 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              Sign in
            </button>

            {/* Start for Free CTA */}
            <button
              onClick={() => openAuthModal('up')}
              className="liquid-glass-btn bg-primary text-primary-foreground px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start for free</span>
              <Icon name="arrow_forward" size={15} />
            </button>
          </div>
        </motion.header>
      </div>

      {/* 1C. Mobile Floating Apple Liquid Glass Bottom Bar (visible on < sm screens) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.85, delay: 0.25, type: 'spring', damping: 20, stiffness: 260 }}
        style={{ left: '50%', x: '-50%' }}
        className="sm:hidden fixed bottom-4 z-40 pointer-events-auto w-max max-w-[calc(100vw-1.5rem)] landing-glass-bottom-bar h-12 px-2.5 flex items-center gap-1.5 rounded-full text-white transition-all duration-300"
      >
        <nav className="flex items-center gap-1.5 w-full">
          {/* Install App Button */}
          <button
            onClick={handleInstallClick}
            className="apple-glass-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Install App as PWA"
          >
            <Icon name="download" size={14} />
            <span>Install</span>
          </button>

          {/* Sign In Button */}
          <button
            onClick={() => openAuthModal('in')}
            className="apple-glass-btn flex items-center px-3.5 py-1.5 text-xs font-bold text-white/90 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            Sign in
          </button>

          {/* Start for Free CTA */}
          <button
            onClick={() => openAuthModal('up')}
            className="liquid-glass-btn bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Start for free</span>
            <Icon name="arrow_forward" size={14} />
          </button>
        </nav>
      </motion.div>

      {/* 2. Main Hero Showcase Section (Fluid responsive height across devices) */}
      <main className="relative w-full min-h-[100dvh] sm:h-[100dvh] lg:h-[100dvh] flex flex-col justify-between items-center pt-12 sm:pt-20 md:pt-24 lg:pt-28 xl:pt-32 pb-16 sm:pb-0 lg:pb-0 text-center shrink-0 isolate">

        {/* Fluid Container: Couples Headline & Image with Dynamic Gap */}
        <div className="w-full flex-1 min-h-0 flex flex-col justify-start lg:justify-between items-center gap-1 sm:gap-2 lg:gap-[clamp(0.25rem,1.5vh,1.25rem)] z-10">
          
          {/* Top Content Block: Bold Fluid Responsive Headline (3-lines on mobile, 2-lines on desktop) + Subtitle */}
          <motion.div 
            initial={{ opacity: 0, y: 32, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center text-center shrink-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full"
          >
            <h1 className="text-fluid-display-xl font-black tracking-tight leading-[1.1] text-center w-full uppercase">
              <span className="text-white landing-headline-text" style={{ color: '#ffffff' }}>MANAGE YOUR</span>
              <br className="sm:hidden" />{' '}
              <span className="landing-changeable-word relative inline-block text-[#FE3501]" style={{ color: '#FE3501' }}>
                {typed || '\u00A0'}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                  className="inline-block w-[3px] sm:w-[5px] h-[0.82em] align-baseline ml-1"
                  style={{ backgroundColor: '#FE3501' }}
                />
              </span>
              <br />
              <span className="text-white landing-headline-text" style={{ color: '#ffffff' }}>WITH EASE</span>
            </h1>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, type: 'spring', damping: 20, stiffness: 280 }}
              className="mt-2 sm:mt-2.5 lg:mt-[clamp(0.4rem,1.2vh,1rem)] flex items-center justify-center pointer-events-none select-none"
            >
              <div className="inline-flex items-center justify-center px-4 sm:px-5.5 py-1.5 sm:py-2 rounded-full bg-primary text-primary-foreground shadow-sm pointer-events-none select-none cursor-default">
                <p className="text-fluid-xs sm:text-fluid-sm font-semibold tracking-wide text-center leading-snug select-none">
                  The only HRM app you need for your workspace.
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Artwork Image Container with Infinite Background Feature Streams & Character Foreground */}
          <div className="relative w-full flex-1 min-h-0 flex items-end justify-center z-0 pb-0 translate-y-0">
            
            {/* 1. MOBILE & TABLET/IPAD ONLY: Single Vertical Infinite Marquee Stream behind character (< xl / up to iPad Pro 1024x1366) */}
            {/* Anchored at top-0 of this flex-1 section = EXACTLY flush with the bottom of the Subheading across all devices */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.0, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="xl:hidden absolute top-0 sm:top-0.5 bottom-[22%] sm:bottom-[16%] md:bottom-[14%] lg:bottom-[12%] left-1/2 -translate-x-1/2 w-max max-w-[94vw] flex justify-center z-0 pointer-events-none marquee-mask-vertical select-none overflow-hidden"
            >
              <div className="animate-marquee-vertical flex flex-col items-center gap-2 sm:gap-2.5 py-1">
                {[...ALL_HERO_FEATURES, ...ALL_HERO_FEATURES].map((item, idx) => (
                  <div 
                    key={`vert-${idx}`}
                    className={`relative w-[265px] xs:w-[285px] sm:w-[315px] md:w-[335px] flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-gradient-to-r ${item.pillBg} shadow-2xl backdrop-blur-2xl shrink-0 overflow-hidden border border-white/10`}
                  >
                    {/* Top Edge Specular Rim Light */}
                    <div className={`absolute top-0 inset-x-2 h-[1px] sm:h-[1.5px] bg-gradient-to-r ${item.rimLight} pointer-events-none rounded-full blur-[0.2px] z-20`} />
                    <div className={`absolute top-0 inset-x-4 h-1.5 sm:h-2 bg-gradient-to-b ${item.rimLight} opacity-20 pointer-events-none blur-sm z-10`} />

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon 
                        name={item.icon} 
                        size={22} 
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] shrink-0 text-white" 
                        style={{ color: '#ffffff' }}
                      />

                      {/* Feature Title */}
                      <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight whitespace-nowrap truncate drop-shadow-sm" style={{ color: '#ffffff' }}>
                        {item.label}
                      </span>
                    </div>

                    {/* Micro-Tag Pill */}
                    <span className={`text-[8px] sm:text-[9.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${item.tagBg} whitespace-nowrap shadow-xs shrink-0 text-white`} style={{ color: '#ffffff' }}>
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Aspect-Ratio Synchronized Character & Desktop Marquee Wrapper */}
            <div className="relative h-full aspect-[2502/1682] max-h-[46vh] sm:max-h-[52vh] md:max-h-[56vh] lg:max-h-[56vh] xl:max-h-[44vh] 2xl:max-h-[48vh] max-w-[90vw] sm:max-w-[86vw] md:max-w-[80vw] lg:max-w-[78vw] xl:max-w-full flex items-end justify-center z-10">

              {/* 2. DESKTOP & LAPTOP ONLY: Dual Horizontal Infinite Marquee Streams (xl:flex) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.0, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="hidden xl:flex absolute top-[-10%] 2xl:top-[-8%] left-1/2 -translate-x-1/2 w-screen flex-col gap-2.5 xl:gap-3.5 z-0 pointer-events-none marquee-mask select-none"
              >
                
                {/* Stream Row 1: Smooth Infinite Loop Scrolling Left */}
                <div className="w-full overflow-hidden flex">
                  <div className="animate-marquee-left flex items-center gap-4.5">
                    {[...HERO_FEATURE_ROWS[0], ...HERO_FEATURE_ROWS[0]].map((item, idx) => (
                      <div 
                        key={`row1-${idx}`}
                        className={`relative w-[295px] xl:w-[320px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-gradient-to-r ${item.pillBg} shadow-2xl backdrop-blur-2xl shrink-0 overflow-hidden border border-white/10`}
                      >
                        {/* Top Edge Specular Rim Light */}
                        <div className={`absolute top-0 inset-x-2 h-[1.5px] bg-gradient-to-r ${item.rimLight} pointer-events-none rounded-full blur-[0.2px] z-20`} />
                        <div className={`absolute top-0 inset-x-4 h-2.5 bg-gradient-to-b ${item.rimLight} opacity-20 pointer-events-none blur-sm z-10`} />

                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Icon 
                            name={item.icon} 
                            size={26} 
                            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] shrink-0 text-white" 
                            style={{ color: '#ffffff' }}
                          />

                          {/* Feature Title */}
                          <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap truncate drop-shadow-sm" style={{ color: '#ffffff' }}>
                            {item.label}
                          </span>
                        </div>

                        {/* Micro-Tag Pill */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.tagBg} whitespace-nowrap shadow-xs shrink-0 text-white`} style={{ color: '#ffffff' }}>
                          {item.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stream Row 2: Smooth Infinite Loop Scrolling Right */}
                <div className="w-full overflow-hidden flex">
                  <div className="animate-marquee-right flex items-center gap-4.5">
                    {[...HERO_FEATURE_ROWS[1], ...HERO_FEATURE_ROWS[1]].map((item, idx) => (
                      <div 
                        key={`row2-${idx}`}
                        className={`relative w-[295px] xl:w-[320px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-gradient-to-r ${item.pillBg} shadow-2xl backdrop-blur-2xl shrink-0 overflow-hidden border border-white/10`}
                      >
                        {/* Top Edge Specular Rim Light */}
                        <div className={`absolute top-0 inset-x-2 h-[1.5px] bg-gradient-to-r ${item.rimLight} pointer-events-none rounded-full blur-[0.2px] z-20`} />
                        <div className={`absolute top-0 inset-x-4 h-2.5 bg-gradient-to-b ${item.rimLight} opacity-20 pointer-events-none blur-sm z-10`} />

                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Icon 
                            name={item.icon} 
                            size={26} 
                            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] shrink-0 text-white" 
                            style={{ color: '#ffffff' }}
                          />

                          {/* Feature Title */}
                          <span className="text-sm font-bold text-white tracking-tight whitespace-nowrap truncate drop-shadow-sm" style={{ color: '#ffffff' }}>
                            {item.label}
                          </span>
                        </div>

                        {/* Micro-Tag Pill */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.tagBg} whitespace-nowrap shadow-xs shrink-0 text-white`} style={{ color: '#ffffff' }}>
                          {item.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>

            {/* FOREGROUND: Main Character Artwork (Strict 100% fit of aspect container) */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.94, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full h-full flex items-end justify-center pointer-events-none"
            >
              <picture className="w-full h-full flex items-end justify-center">
                <source srcSet="/Hero%20Asset.webp" type="image/webp" />
                <img 
                  src="/Hero%20Asset.webp" 
                  alt="Manage your Team with Ease" 
                  fetchPriority="high"
                  decoding="async"
                  className="relative z-10 w-full h-full object-contain object-bottom select-none pointer-events-none"
                />
              </picture>
            </motion.div>

          </div>

        </div>

        </div>

      </main>

      {/* 3. Footer (Accessible via scroll) */}
      <LandingFooter 
        onOpenLegal={(type) => setLegalModal(type)}
      />

      {/* Authentication & Workspace Access Dialog Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md w-full force-dark-mode glass-kormiis-modal rounded-[28px] p-5 sm:p-7 md:p-8 shadow-2xl text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Workspace Access</DialogTitle>
            <DialogDescription>Sign in or create a business space for your squad.</DialogDescription>
          </DialogHeader>

          {/* Card Brand Header */}
          <div className="flex flex-col items-center justify-center gap-1.5 mb-5 text-center">
            <img src={kormiisWhiteLogo} alt="Kormiis" className="h-7 sm:h-8 object-contain drop-shadow-md" />
            <p className="text-xs text-white/70 font-medium">
              Free for your whole squad. No credit card required.
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center p-1 rounded-full bg-white/[0.08] border border-white/12 mb-5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => switchAuthTab('in')}
              className={`flex-1 rounded-full py-2 text-xs font-bold transition-all cursor-pointer ${
                authTab === 'in' ? 'bg-white/20 text-white shadow-sm border border-white/20' : 'text-white/70 hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchAuthTab('up')}
              className={`flex-1 rounded-full py-2 text-xs font-bold transition-all cursor-pointer ${
                authTab === 'up' ? 'bg-white/20 text-white shadow-sm border border-white/20' : 'text-white/70 hover:text-white'
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
                    <Icon name="corporate_fare" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none" />
                    <Input
                      id="space-name"
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      placeholder="e.g. Acme Studio"
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">
                    This becomes your company profile. You'll be the workspace owner (admin).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 mt-1 flex items-center justify-center gap-2 cursor-pointer"
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
                  className="text-xs text-white/70 hover:text-white transition py-1 font-medium text-center cursor-pointer"
                >
                  ← Back to options
                </button>
              </form>
            ) : authTab === 'in' ? (
              <div className="flex flex-col gap-3">
                <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2.5 w-full">
                  <div className="relative flex items-center">
                    <Icon name={isPhoneInput ? "call" : "mail"} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none transition-all" />
                    <Input
                      type="text"
                      placeholder={isPhoneInput ? "Phone number (e.g. 017...)" : "Work Email or Phone"}
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 !pr-16 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                      autoFocus
                    />
                    {emailOrPhone.trim() && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-semibold text-white/50 bg-white/10 px-2 py-0.5 rounded-full pointer-events-none tracking-wider">
                        {isPhoneInput ? 'Phone' : 'Email'}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 !pr-10.5 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 transition-colors cursor-pointer z-10"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                    </button>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between px-1 py-0.5 select-none">
                    <label 
                      onClick={() => setRememberMe(prev => !prev)}
                      className="flex items-center gap-2.5 cursor-pointer group py-1"
                    >
                      <div className={`size-4.5 rounded-md flex items-center justify-center border transition-all duration-200 ${
                        rememberMe 
                          ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                          : 'bg-white/10 border-white/25 group-hover:border-white/40'
                      }`}>
                        {rememberMe && <Icon name="check" size={13} className="font-bold stroke-[3]" />}
                      </div>
                      <span className="text-[12px] font-medium text-white/80 group-hover:text-white transition-colors">
                        Remember me
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary rounded-full text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 shadow-sm mt-1 flex items-center justify-center gap-2 cursor-pointer"
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
                  <span className="text-[10px] font-bold text-white/70 tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('join')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/12 rounded-full text-xs sm:text-sm font-bold text-white active:scale-[0.99] transition disabled:opacity-50 shadow-sm cursor-pointer backdrop-blur-md"
                  title="Choose your Google Account"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span>Choose Google Account</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <form onSubmit={(e) => { e.preventDefault(); setLoginMode('create'); setPendingUser(null); handleCreateBusinessSpace(e) }} className="flex flex-col gap-2.5 w-full">
                  <div className="relative flex items-center">
                    <Icon name={isPhoneInput ? "call" : "mail"} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none transition-all" />
                    <Input
                      type="text"
                      placeholder={isPhoneInput ? "Mobile number" : "Work Email or Phone"}
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 !pr-16 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                      autoFocus
                    />
                    {emailOrPhone.trim() && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-semibold text-white/50 bg-white/10 px-2 py-0.5 rounded-full pointer-events-none tracking-wider">
                        {isPhoneInput ? 'Phone' : 'Email'}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 !pr-10.5 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 transition-colors cursor-pointer z-10"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="corporate_fare" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 z-10 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Company / Business Name"
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm !pl-10.5 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:border-primary focus:bg-black/60 transition-colors backdrop-blur-sm shadow-inner"
                    />
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between px-1 py-0.5 select-none">
                    <label 
                      onClick={() => setRememberMe(prev => !prev)}
                      className="flex items-center gap-2.5 cursor-pointer group py-1"
                    >
                      <div className={`size-4.5 rounded-md flex items-center justify-center border transition-all duration-200 ${
                        rememberMe 
                          ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                          : 'bg-white/10 border-white/25 group-hover:border-white/40'
                      }`}>
                        {rememberMe && <Icon name="check" size={13} className="font-bold stroke-[3]" />}
                      </div>
                      <span className="text-[12px] font-medium text-white/80 group-hover:text-white transition-colors">
                        Remember me
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary rounded-full text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 shadow-sm mt-1 flex items-center justify-center gap-2 cursor-pointer"
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
                  <span className="text-[10px] font-bold text-white/70 tracking-wider">OR</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('create')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/12 rounded-full text-xs sm:text-sm font-bold text-white active:scale-[0.99] transition disabled:opacity-50 shadow-sm cursor-pointer backdrop-blur-md"
                  title="Choose your Google Account"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span>Choose Google Account</span>
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
                className="underline hover:text-white transition-colors cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <span className="whitespace-nowrap">
                <button 
                  type="button" 
                  onClick={() => setLegalModal('privacy')}
                  className="underline hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </p>
          </div>

        </DialogContent>
      </Dialog>

      {/* Already in a Business Space Popup */}
      <Dialog open={showAlreadyInSpace} onOpenChange={(open) => { if (!open) setShowAlreadyInSpace(false) }}>
        <DialogContent className="max-w-[420px] force-dark-mode rounded-2xl bg-[#09090b] border-white/10 text-white">
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
        <DialogContent className="max-w-[540px] force-dark-mode rounded-2xl bg-[#09090b] border-white/10 text-white max-h-[85vh] overflow-y-auto">
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

