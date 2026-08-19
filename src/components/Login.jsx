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
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Rotating typing words for headline
  const ROTATING_WORDS = ['KORMIIS', 'TEAM', 'SQUAD', 'PEOPLE']
  const [typed, setTyped] = useState('KORMIIS')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)

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

  // Set dark theme and ensure natural scrolling on landing page
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')

    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlHeight = document.documentElement.style.height
    const prevBodyHeight = document.body.style.height

    document.documentElement.style.overflowY = 'auto'
    document.documentElement.style.overflowX = 'clip'
    document.documentElement.style.height = 'auto'
    document.body.style.overflowY = 'auto'
    document.body.style.overflowX = 'clip'
    document.body.style.height = 'auto'

    return () => {
      if (!hadDark) {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.height = prevHtmlHeight
      document.body.style.height = prevBodyHeight
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
    setAuthModalOpen(true)
  }

  return (
    <div className="dark force-dark-mode min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-primary selection:text-white">
      
      {/* Top-Left Brand Logo (Compact on mobile, standard on tablet/desktop) */}
      <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8 z-30 pointer-events-auto">
        <a href="#" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src={kormiisWhiteLogo} 
            alt="Kormiis Logo" 
            className="h-5 sm:h-7 md:h-8 w-auto object-contain drop-shadow-md" 
          />
        </a>
      </div>

      {/* Responsive Floating Nav Bar: Bottom Dock on Mobile & Tablet/iPad, Top Center on Desktop */}
      <div className="fixed bottom-4 sm:bottom-5 lg:bottom-auto lg:top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-max max-w-[calc(100vw-2rem)]">
        <nav className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full glass-kormiis shadow-2xl text-white">
          {/* Install App Button */}
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title="Install App as PWA"
          >
            <Icon name="download" size={15} />
            <span>Install App</span>
          </button>

          {/* Start for Free CTA */}
          <button
            onClick={() => openAuthModal('up')}
            className="bg-primary text-primary-foreground px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-primary/25 hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer"
          >
            <span>Start for free</span>
            <Icon name="arrow_forward" size={15} />
          </button>
        </nav>
      </div>

      {/* 2. Main Hero Showcase Section (Strict 100dvh full viewport height across all devices) */}
      <main className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col justify-between items-center pt-20 sm:pt-24 md:pt-28 lg:pt-28 xl:pt-32 pb-0 text-center overflow-hidden shrink-0 isolate">
        
        {/* HERO SECTION CANVAS AMBIENT BACKDROP GLOW (Subtle, Velvet & Ultra-Diffused) */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden select-none">
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] sm:w-[750px] lg:w-[1050px] h-[300px] sm:h-[450px] lg:h-[600px] bg-gradient-to-b from-primary/18 via-orange-500/10 to-transparent blur-[120px] sm:blur-[180px] lg:blur-[220px] rounded-full" />
        </div>

        {/* Fluid Container: Couples Headline & Image with Dynamic Gap */}
        <div className="w-full flex-1 min-h-0 flex flex-col justify-between items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-[clamp(0.25rem,1.5vh,1.25rem)] z-10">
          
          {/* Top Content Block: Bold Fluid Responsive Headline (3-lines on mobile, 2-lines on desktop) + Subtitle */}
          <div className="flex flex-col items-center justify-center text-center shrink-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
            <h1 className="text-fluid-display-xl font-black tracking-tight text-white leading-[1.1] text-center w-full uppercase">
              <span>MANAGE YOUR</span>
              <br className="sm:hidden" />{' '}
              <span className="text-primary relative inline-block">
                {typed || '\u00A0'}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                  className="inline-block w-[3px] sm:w-[5px] h-[0.82em] bg-primary align-baseline ml-1"
                />
              </span>
              <br />
              <span>WITH EASE</span>
            </h1>
            <div className="mt-2 sm:mt-2.5 lg:mt-[clamp(0.4rem,1.2vh,1rem)] flex items-center justify-center">
              <div className="inline-flex items-center justify-center px-4 sm:px-5.5 py-1.5 sm:py-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <p className="text-fluid-xs sm:text-fluid-sm font-semibold tracking-wide text-center leading-snug">
                  The only HRM app you need for your workspace.
                </p>
              </div>
            </div>
          </div>

          {/* Hero Artwork Image Container with Infinite Background Feature Streams & Character Foreground */}
          <div className="relative w-full flex-1 min-h-0 flex items-center sm:items-end justify-center z-0 pb-0 -translate-y-3 sm:-translate-y-4 md:-translate-y-5 lg:translate-y-0">
            
            {/* Aspect-Ratio Synchronized Character & Marquee Wrapper */}
            <div className="relative h-full aspect-[2502/1682] max-h-[42vh] sm:max-h-[48vh] md:max-h-[52vh] lg:max-h-[56vh] max-w-[88vw] sm:max-w-[80vw] md:max-w-[74vw] lg:max-w-full flex items-end justify-center">

            {/* BACKGROUND CONTINUOUS MARQUEE STREAM: Responsive alignment with head */}
            <div className="absolute top-[-3%] sm:top-[-1%] md:top-[1%] lg:top-[-8%] left-1/2 -translate-x-1/2 w-screen flex flex-col gap-1.5 sm:gap-3.5 z-0 pointer-events-none marquee-mask select-none">
              
              {/* Stream Row 1: Smooth Infinite Loop Scrolling Left */}
              <div className="w-full overflow-hidden flex">
                <div className="animate-marquee-left flex items-center gap-2 sm:gap-4.5">
                  {[...HERO_FEATURE_ROWS[0], ...HERO_FEATURE_ROWS[0]].map((item, idx) => (
                    <div 
                      key={`row1-${idx}`}
                      className={`relative flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2.5 rounded-full bg-gradient-to-r ${item.pillBg} shadow-2xl backdrop-blur-2xl shrink-0 overflow-hidden`}
                    >
                      {/* Top Edge Specular Rim Light */}
                      <div className={`absolute top-0 inset-x-2 h-[1px] sm:h-[1.5px] bg-gradient-to-r ${item.rimLight} pointer-events-none rounded-full blur-[0.2px] z-20`} />
                      <div className={`absolute top-0 inset-x-4 h-1.5 sm:h-2.5 bg-gradient-to-b ${item.rimLight} opacity-20 pointer-events-none blur-sm z-10`} />

                      {/* 3D Embossed Glossy Icon Container */}
                      <div className={`relative size-5.5 sm:size-8.5 rounded-md sm:rounded-xl bg-gradient-to-br ${item.iconGrad} flex items-center justify-center text-white shadow-lg ${item.iconShadow} shrink-0 overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/25 pointer-events-none" />
                        <Icon 
                          name={item.icon} 
                          size={undefined} 
                          className="!text-[12px] sm:!text-[17px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] relative z-10" 
                        />
                      </div>

                      {/* Feature Title */}
                      <span className="text-[10px] sm:text-sm font-bold text-white tracking-tight whitespace-nowrap drop-shadow-sm">
                        {item.label}
                      </span>

                      {/* Micro-Tag Pill */}
                      <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${item.tagBg} whitespace-nowrap shadow-xs`}>
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stream Row 2: Smooth Infinite Loop Scrolling Right */}
              <div className="w-full overflow-hidden flex">
                <div className="animate-marquee-right flex items-center gap-2 sm:gap-4.5">
                  {[...HERO_FEATURE_ROWS[1], ...HERO_FEATURE_ROWS[1]].map((item, idx) => (
                    <div 
                      key={`row2-${idx}`}
                      className={`relative flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2.5 rounded-full bg-gradient-to-r ${item.pillBg} shadow-2xl backdrop-blur-2xl shrink-0 overflow-hidden`}
                    >
                      {/* Top Edge Specular Rim Light */}
                      <div className={`absolute top-0 inset-x-2 h-[1px] sm:h-[1.5px] bg-gradient-to-r ${item.rimLight} pointer-events-none rounded-full blur-[0.2px] z-20`} />
                      <div className={`absolute top-0 inset-x-4 h-1.5 sm:h-2.5 bg-gradient-to-b ${item.rimLight} opacity-20 pointer-events-none blur-sm z-10`} />

                      {/* 3D Embossed Glossy Icon Container */}
                      <div className={`relative size-5.5 sm:size-8.5 rounded-md sm:rounded-xl bg-gradient-to-br ${item.iconGrad} flex items-center justify-center text-white shadow-lg ${item.iconShadow} shrink-0 overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/25 pointer-events-none" />
                        <Icon 
                          name={item.icon} 
                          size={undefined} 
                          className="!text-[12px] sm:!text-[17px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] relative z-10" 
                        />
                      </div>

                      {/* Feature Title */}
                      <span className="text-[10px] sm:text-sm font-bold text-white tracking-tight whitespace-nowrap drop-shadow-sm">
                        {item.label}
                      </span>

                      {/* Micro-Tag Pill */}
                      <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${item.tagBg} whitespace-nowrap shadow-xs`}>
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* FOREGROUND: Main Character Artwork (Strict 100% fit of aspect container) */}
            <img 
              src="/Hero%20Assets.png" 
              alt="Manage your Team with Ease" 
              className="relative z-10 w-full h-full object-contain object-bottom drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none pointer-events-none"
            />

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
        <DialogContent className="max-w-md w-full glass-kormiis-modal rounded-[28px] p-5 sm:p-7 md:p-8 shadow-2xl text-white">
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
                    <Icon name="corporate_fare" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      id="space-name"
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      placeholder="e.g. Acme Studio"
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
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
                    <Icon name="mail" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Work Email or Phone"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="lock" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 pr-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-white/50 hover:text-white p-1 transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                    </button>
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
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <form onSubmit={(e) => { e.preventDefault(); setLoginMode('create'); setPendingUser(null); handleCreateBusinessSpace(e) }} className="flex flex-col gap-2.5 w-full">
                  <div className="relative flex items-center">
                    <Icon name="mail" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Work Email"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="lock" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 pr-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-white/50 hover:text-white p-1 transition-colors cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Icon name="corporate_fare" size={18} className="absolute left-3.5 text-white/50 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Company / Business Name"
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm pl-10 bg-black/40 border-white/15 text-white placeholder:text-white/40 focus:border-primary/80 focus:bg-black/60 transition-colors backdrop-blur-sm"
                    />
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

