import React, { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, useMotionValue, useMotionTemplate } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import kormiisLogo from '../Assets/Kormiis Logo Final.svg'
import kormiisLogoDark from '../Assets/Kormiis Logo Dark.svg'
import kormiisMembershipLogo from '../Assets/Kormiis Logo Membership.svg'
import heroCharacters from '../Assets/hero-characters.png'
import { loginWithGoogle, getGoogleRedirectResult, createBusinessSpace, getCompanyForUser, getInviteByEmail, acceptInvite } from '../services/auth.js'
import { auth } from '../services/firebase.js'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { recordLoginActivity } from '../services/hr.js'


const MARKETING_PILLARS = [
  {
    icon: 'groups',
    title: 'Attendance that pays itself',
    desc: 'One-tap clock-in flows straight into automated payroll - no re-typing, no errors.'
  },
  {
    icon: 'account_balance_wallet',
    title: 'Every taka, tracked',
    desc: 'Salaries, expenses & company assets in real-time view, all in one place.'
  },
  {
    icon: 'forum',
    title: 'Teamwork without the chaos',
    desc: 'Announcements, events, tasks & documents - one home for the whole squad.'
  }
]

function MarketingSectionOne({ containerRef }) {
  const cards = [
    {
      title: "Smart Attendance Tracking",
      subtitle: "Clock in effortlessly with a single tap. Live attendance data flows straight into automated payroll.",
      iconName: "touch_app",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Quick tap to clock in & out</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Live location and time tracking</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">No manual entry for payroll</span></li>
        </ul>
      )
    },
    {
      title: "Built-in Task Management",
      subtitle: "Assign tasks, track progress in real-time, and hit your deadlines without switching to another app.",
      iconName: "task_alt",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Assign tasks to team members instantly</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Track who is doing what in real-time</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Set clear deadlines & get reminders</span></li>
        </ul>
      )
    },
    {
      title: "Smart Leave Management",
      subtitle: "Request time off, get instant approvals, and track leave balances without the email chaos.",
      iconName: "event_available",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Request time off from your phone</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Managers can approve with one click</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Track your remaining leave balance</span></li>
        </ul>
      )
    },
    {
      title: "Works on any device",
      subtitle: "Desktop, tablet, or mobile - Kormiis adapts to wherever you work.",
      iconName: "devices",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Perfect for remote and office teams</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Nothing to install, just open your browser</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Always synced across all your devices</span></li>
        </ul>
      )
    },
    {
      title: "Your data, Your Rules",
      subtitle: "Everything is stored in your own secure cloud database. We don't lock you in.",
      iconName: "cloud_done",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Data is saved securely to the cloud</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">You own your company data, not us</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Backed by bank-level cloud security</span></li>
        </ul>
      )
    },
    {
      title: "Zero Fees",
      subtitle: "No per-seat licenses. Kormiis is completely free to use.",
      iconName: "money_off",
      content: (
        <ul className="flex flex-col gap-3 w-full">
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">100% free for your entire team</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">No sneaky per-user license fees</span></li>
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon name="check_circle" className="text-foreground shrink-0 mt-0.5" size={16}/> <span className="flex-1 break-words">Premium features without the premium price</span></li>
        </ul>
      )
    }
  ]

  return (
    <section className="relative w-full py-12 lg:py-24 snap-start flex flex-col items-center">
      <div className="max-w-full mx-auto w-full flex flex-col items-center justify-center px-4 sm:px-8 shrink-0">
        <div className="w-full text-center mb-10 sm:mb-16">
          <h2 className="text-[clamp(2.5rem,6vw+0.5rem,6rem)] leading-[1.1] font-black tracking-tight mb-4 text-foreground">
            Why Choose <span className="text-[#FE4D01]">Kormiis?</span>
          </h2>
          <p className="text-fluid-xl text-muted-foreground font-medium max-w-3xl mx-auto">
            Everything a growing team needs — without the enterprise price tag or the setup headache.
          </p>
        </div>

        {/* Uniform Grid (Desktop & Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full max-w-6xl pb-24 mx-auto">
          {cards.map((card, i) => (
            <div 
              key={i} 
              className="w-full p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex shrink-0 items-center justify-center">
                  <Icon name={card.iconName} size={20}/>
                </div>
                <div className="text-fluid-sm font-bold leading-tight break-words text-foreground">{card.title}</div>
              </div>
              
              {/* Subheading */}
              <div className="py-3 border-b border-border">
                <div className="w-full bg-muted/40 p-3 rounded-xl border border-border/50">
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">{card.subtitle}</p>
                </div>
              </div>

              {/* Bullet Points */}
              <div className="w-full flex-1 min-w-0 pt-3 [&_ul]:gap-2 [&_li]:gap-2 [&_li]:text-xs sm:[&_li]:text-sm">
                {card.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


// FAQ content - each entry renders as its own split glass card
const FAQ_ITEMS = [
  {
    q: 'Can Kormiis read my company data?',
    a: 'No - data is stored in your own secure cloud database with strict access controls; only you and your team decide access.',
  },
  {
    q: "What's the catch if it's free?",
    a: 'No catch - free for a limited time for growing teams; no subscriptions, no card.',
  },
  {
    q: 'Is Kormiis really free?',
    a: 'Yes - creating a workspace is 100% free. No credit card, no trial clock, no hidden fees. You stay in full control of everything.',
  },
  {
    q: 'Where is my company data stored?',
    a: 'Everything lives in your own secure cloud database. Only you decide what is shared and who gets access.',
  },
  {
    q: 'How do teammates sign in?',
    a: 'Your HR admin adds teammates by work email. Each teammate signs in with their own Google account and is linked to the company automatically - no passwords to remember.',
  },
  {
    q: 'Can I use Kormiis on any device?',
    a: 'Yes. The app is fully responsive, so attendance, payroll, and asset tracking work smoothly on desktop, tablet, and mobile browsers.',
  },
  {
    q: 'How does attendance tracking work?',
    a: 'Teammates check in and out with one tap. Timesheets and approvals are generated automatically, ready to flow straight into payroll.',
  },
]

// Final section: FAQ - each question is its own split glass card (no single modal)
function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="min-h-dvh w-full flex flex-col items-center justify-center px-4 sm:px-6 py-16 snap-start">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-center mb-12">
        Frequently asked questions
      </h2>

      <div className="w-full max-w-3xl mx-auto">
        <div className="w-full grid grid-cols-1 gap-3 sm:gap-4">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className={`relative flex flex-col overflow-hidden rounded-2xl border bg-background shadow-sm transition-colors ${isOpen ? 'border-primary/40' : 'border-border'}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm sm:text-base font-semibold text-foreground leading-snug">{item.q}</span>
                  <Icon
                    name="expand_more"
                   
                    className={`shrink-0 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
 size={20}/>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                >
                  <p className="text-fluid text-muted-foreground leading-relaxed px-5 pb-5">{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function MarketingStackedSections({ containerRef }) {
  return (
    <div className="relative w-full z-0">
      <MarketingSectionOne containerRef={containerRef} />

    </div>
  )
}

function FooterSection({ themeMode, logoSrc }) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full bg-background pt-12 pb-6 mt-auto shrink-0 snap-start overflow-hidden">
      {/* Top Logo Section - Full Screen Width */}
      <div className="w-full flex justify-center pb-8 mb-8 px-[10px]">
        <img 
          src={kormiisLogo} 
          alt="Kormiis Logo" 
          className="block w-full h-auto object-contain" 
        />
      </div>

      {/* Copyright & Links */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6 sm:px-10 lg:px-16">
        <p className="text-fluid-sm text-muted-foreground">
          &copy; {currentYear} Kormiis. All rights reserved.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export default function Login({ onLogin, themeMode, toggleTheme, setThemeMode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    // Check if the event already fired before React mounted
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
      alert("App installation is not available right now. You might have already installed it, or your browser may not support it.");
      return;
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      window.deferredPWAInstallPrompt = null
    }
  }



  // Auto-typing hero word: Employee -> Team -> Squad -> Crew -> People -> loop
  const ROTATING_WORDS = ['Kormiis', 'Employees', 'Team', 'Squad', 'Crew', 'People']
  const [typed, setTyped] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex]
    let timeout

    if (isWaiting) {
      timeout = setTimeout(() => {
        setIsWaiting(false)
        setIsDeleting(true)
      }, 1600)
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
          setWordIndex(i => (i + 1) % ROTATING_WORDS.length)
        } else {
          setTyped(word.slice(0, typed.length - 1))
        }
      }, 45)
    }

    return () => clearTimeout(timeout)
  }, [typed, isDeleting, isWaiting, wordIndex])

  // Keep the topbar fixed on desktop/tablet; only mobile uses hide/show-on-scroll
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Cinematic Scroll Sequence - one full-viewport section per step:
  //   Section 1: Hero heading
  //   Sections 2-6: one subheading popup per section
  //   Section 7: Auth modal
  //   Section 8: FAQ
  // With 8 viewport sections, scrollYProgress maps as section index / 7.
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ container: containerRef })
  
  // Heading Parallax (Section 1 fades out as the first card section arrives)
  const headingOpacity = useTransform(scrollYProgress, [0, 0.05, 0.11], [1, 1, 0])
  const headingY = useTransform(scrollYProgress, [0, 0.05, 0.11], [0, 0, -80])

  // Scroll Indicator - fades out as you leave section 1, fades back in on return
  const scrollIndicatorRaw = useTransform(scrollYProgress, [0, 0.03, 0.12], [1, 1, 0])
  const scrollIndicatorOpacity = useSpring(scrollIndicatorRaw, { stiffness: 120, damping: 22, mass: 0.6 })
  
  // Ambient Orb Parallax (Cinematic Warp during transition)
  const orb1Scale = useTransform(scrollYProgress, [0, 0.15, 0.55], [1, 1, 1.8])
  const orb1X = useTransform(scrollYProgress, [0, 0.15, 0.55], ["0%", "0%", "40%"])
  const orb1Y = useTransform(scrollYProgress, [0, 0.15, 0.55], ["0%", "0%", "50%"])

  const orb2Scale = useTransform(scrollYProgress, [0, 0.15, 0.55], [1, 1, 2.2])
  const orb2X = useTransform(scrollYProgress, [0, 0.15, 0.55], ["0%", "0%", "-30%"])
  const orb2Y = useTransform(scrollYProgress, [0, 0.15, 0.55], ["0%", "0%", "-60%"])

  // Scroll-based Theme Switching
  // The landing page is always light: temporarily strip the dark class (and any
  // dark data-theme) so every section AND the portaled sign-in modal render
  // light, then restore the user's stored webapp theme on unmount.
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (hadDark) {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.setAttribute('data-theme', 'light')
      }
    }
  }, [])


  // Topbar visible only at the very top on all devices.
  // Hides the instant you start scrolling, shows again when back at the top.
  const [showTopbar, setShowTopbar] = useState(true)
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowTopbar(latest < 0.002)
  })

  // --- Error state ---
  const [error, setError] = useState('')

  // --- Two-path login: create a Business Space vs join an existing one ---
  const [loginMode, setLoginMode] = useState(null) // null | 'create' | 'join'
  const [pendingUser, setPendingUser] = useState(null) // Google user awaiting business space creation
  const [spaceName, setSpaceName] = useState('')
  const [showAlreadyInSpace, setShowAlreadyInSpace] = useState(false)
  const [alreadyUser, setAlreadyUser] = useState(null) // signed-in Google user who already belongs to a space
  const [loadingMode, setLoadingMode] = useState(null) // which login button is signing in ('create' | 'join')

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
    token: account.id // stable key material for local encrypted cache
  })

  // --- Complete admin sign in & enter dashboard ---
  const completeAdminLogin = (user, companyName) => {
    setIsLoading(true)
    recordLoginActivity(user?.uid, user?.uid)
    setTimeout(() => {
      setIsLoading(false)
      setLoadingMode(null)
      onLogin(adminSession({ id: user?.uid || 'local', name: user?.displayName || 'System Admin', email: user?.email || 'admin@company.com', companyName: companyName || 'Kormiis Ltd.' }))
    }, 300)
  }

  // --- Complete teammate sign in (auto-linked via email invite) ---
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

  // Single sign-in flow for both the button and the redirect-return path.
  // Path resolution:
  //   1. Already linked teammate   -> enter as teammate
  //   2. Invited by email          -> auto-link + enter as teammate
  //   3. Existing workspace owner  -> enter as admin
  //   4. New Google user:
  //        create -> show Business Space creation form (becomes owner)
  //        join   -> blocked: "not part of the team"
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

  // Someone already linked to a Business Space clicked "Create" - offer to switch to Join.
  const promptAlreadyInSpace = (user) => {
    setAlreadyUser(user)
    setShowAlreadyInSpace(true)
    setIsLoading(false)
    setLoadingMode(null)
  }

  const useJoinFromPopup = () => {
    const user = alreadyUser
    setShowAlreadyInSpace(false)
    setAlreadyUser(null)
    setError('')
    if (user) finishGoogleLogin(user, 'join')
  }

  // --- Create a Business Space (workspace owner / admin) ---
  const handleCreateBusinessSpace = async (e) => {
    e.preventDefault()
    if (!pendingUser) return
    if (!spaceName.trim()) {
      setError('Please enter a name for your Business Space.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const created = await createBusinessSpace(pendingUser, { name: spaceName })
      completeAdminLogin(pendingUser, created.companyName)
    } catch (err) {
      setError('Could not create your Business Space: ' + err.message)
      setIsLoading(false)
      setLoadingMode(null)
    }
  }

  // --- Google SSO (Firebase) ---
  const handleFirebaseGoogleLogin = async (mode) => {
    setError('')
    setIsLoading(true)
    setLoadingMode(mode)
    setLoginMode(mode)
    try {
      // Fast path: Firebase already has a signed-in Google session (persisted
      // from a previous login), so skip the popup round-trip entirely.
      let user = auth?.currentUser
      if (!user) {
        const result = await loginWithGoogle()
        if (result.mode === 'redirect') {
          // Redirecting to Google - login continues in getGoogleRedirectResult on return
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

  // Finish Google sign-in when redirected back from Google
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



  return (
    <div 
      ref={containerRef}
      className="force-light-mode h-dvh bg-background text-foreground relative overflow-y-auto overflow-x-hidden font-sans scroll-smooth snap-y snap-mandatory transition-colors duration-[1500ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
    >
      
      {/* Dynamic Warping Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          style={{ scale: orb1Scale, x: orb1X, y: orb1Y }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          style={{ scale: orb2Scale, x: orb2X, y: orb2Y }}
          className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-secondary/20 rounded-full blur-[150px]" 
        />
      </div>



      <header
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1400px] z-50 pointer-events-none transition-all duration-300 rounded-full glass-kormiis"
      >
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between pointer-events-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <img 
              src={kormiisLogo} 
              alt="Kormiis Logo" 
              className="block h-7 sm:h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain shrink-0 drop-shadow-sm" 
            />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="flex items-center justify-center w-10 h-10 text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group"
                title="Install App"
              >
                <Icon name="download" className="group-hover:scale-110 transition-transform" size={18}/> 
              </button>
            )}
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              className="glass-kormiis text-foreground font-bold text-sm sm:text-base px-5 sm:px-6 py-2.5 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 dark:hover:bg-white/10"
            >
              Start for free
            </button>
          </motion.div>
        </div>
      </header>

      {/* Scroll deck: one full-viewport section per step */}
      <div className="relative z-10">
        {/* Section 1: Hero Heading */}
        <section className="relative h-dvh w-full flex flex-col items-center pt-[80px] pb-[100px] px-4 sm:px-10 lg:px-16 snap-start overflow-hidden">
          <motion.div
            style={{ opacity: headingOpacity, y: headingY }}
            className="flex flex-col items-center justify-center w-full h-full gap-6 sm:gap-8 lg:gap-10"
          >
            {/* Headline */}
            <motion.h1 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="login-hero-title uppercase text-[clamp(2.5rem,6vw+0.5rem,6rem)] leading-[1.1] w-full font-black tracking-tight text-center shrink-0"
            >
              When{' '}
              <span className="text-primary relative inline-block align-baseline">
                {typed}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  className="inline-block w-[3px] h-[0.85em] bg-primary align-baseline ml-0.5"
                />
              </span>
              <br className="sm:hidden" /> Win,<br />
              Business<br className="sm:hidden" /> Follows.
            </motion.h1>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
              className="w-full max-w-7xl flex justify-center mix-blend-multiply dark:mix-blend-screen overflow-hidden"
              style={{ flexShrink: 1, minHeight: 0 }}
            >
              <img src={heroCharacters} alt="Team" className="w-full h-full object-contain max-h-[40vh] sm:max-h-[50vh] lg:max-h-[65vh]" />
            </motion.div>
          </motion.div>
            
          {/* Scroll Indicator (Absolute bottom edge of viewport) */}
          <motion.div
            style={{ opacity: scrollIndicatorOpacity }}
            className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 pointer-events-none"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#FE4D01]">Scroll</span>
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-10 h-10 rounded-full bg-[#FE4D01] flex items-center justify-center text-white shadow-[0_0_15px_rgba(254,77,1,0.4)]"
            >
              <Icon name="arrow_downward" size={24}/>
            </motion.div>
          </motion.div>
        </section>

        {/* What is Kormiis - Merged Section (Grid) */}
        <section className="relative z-10 w-full min-h-[50vh] sm:min-h-[70vh] flex flex-col items-center justify-center bg-background px-4 py-12 sm:py-24 snap-start overflow-hidden">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-2 gap-4 sm:gap-8 lg:gap-12 items-stretch">
            
            {/* Left Column: Text Content */}
            <div className="flex flex-col justify-center gap-4 sm:gap-6 lg:gap-8 text-left w-full mx-0">
              <motion.h2 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl sm:text-4xl lg:text-7xl font-black text-foreground tracking-tight leading-tight mt-0"
              >
                What is <br className="hidden lg:block" /><span className="text-primary">Kormiis</span>?
              </motion.h2>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs sm:text-base md:text-xl lg:text-2xl font-medium text-muted-foreground leading-snug sm:leading-relaxed space-y-2 sm:space-y-4 lg:space-y-6"
              >
                <p>
                  Kormiis is the <strong className="text-foreground">anti-enterprise</strong> HR Management Web App. Just everything your growing team needs.
                </p>
                <p>
                  No setup fees. No per-user licenses. No 3-month onboarding or subscription fee!
                </p>
                <p className="text-foreground font-semibold">
                  One central hub for your entire business. Secured automatically in the cloud.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.8 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="pt-2"
              >
                <span className="text-white font-black tracking-wide uppercase text-[10px] sm:text-xs lg:text-base inline-block px-3 py-1.5 sm:px-6 sm:py-3 bg-[#FE4D01] rounded-full shadow-md whitespace-nowrap">
                  Free for limited time.
                </span>
              </motion.div>
            </div>

            {/* Right Column: Slot Machine */}
            <div className="relative w-full h-auto min-h-0">
              <div className="absolute inset-0 w-full h-full flex justify-center gap-2 sm:gap-4 lg:gap-8 overflow-hidden rounded-xl sm:rounded-3xl">
                {/* Gradient masks for smooth fade in/out at top and bottom */}
                <div className="absolute inset-x-0 top-0 h-12 sm:h-24 lg:h-32 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none"></div>
                <div className="absolute inset-x-0 bottom-0 h-12 sm:h-24 lg:h-32 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none"></div>

                {/* Reel 1 (Scrolls Up, Always Visible) */}
                <div 
                  className="flex flex-col gap-2 sm:gap-4 lg:gap-6 pb-2 sm:pb-4 lg:pb-6 relative z-10 will-change-transform w-full sm:w-auto items-center animate-slot-up shrink-0 h-max"
                >
                  {[...Array(8)].flatMap(() => [
                    { label: "Attendance", icon: "schedule", color: "text-blue-500" },
                    { label: "Payroll", icon: "account_balance", color: "text-emerald-500" },
                    { label: "Expenses", icon: "wallet", color: "text-orange-500" },
                    { label: "Leave", icon: "calendar_month", color: "text-pink-500" },
                  ]).map((item, i) => (
                    <div key={`col1-${i}`} className="flex items-center justify-start gap-2 lg:gap-4 p-2 sm:p-3 lg:p-5 bg-card border border-border rounded-lg lg:rounded-2xl shadow-sm w-[130px] sm:w-32 lg:w-64 shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-md lg:rounded-xl bg-background border border-border flex items-center justify-center shadow-inner shrink-0">
                        <Icon name={item.icon} className={`${item.color} scale-75 sm:scale-100`} size={20}/>
                      </div>
                      <span className="block font-bold text-foreground text-[11px] sm:text-xs lg:text-base whitespace-nowrap truncate">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Reel 2 (Scrolls Down, Hidden on Mobile) */}
                <div 
                  className="hidden sm:flex flex-col gap-2 sm:gap-4 lg:gap-6 pb-2 sm:pb-4 lg:pb-6 relative z-10 will-change-transform animate-slot-down shrink-0 h-max"
                >
                  {[...Array(8)].flatMap(() => [
                    { label: "Assets", icon: "monitor", color: "text-purple-500" },
                    { label: "Documents", icon: "folder_open", color: "text-amber-500" },
                    { label: "Tasks", icon: "check_box", color: "text-teal-500" },
                    { label: "Feed", icon: "rss_feed", color: "text-indigo-500" },
                  ]).map((item, i) => (
                    <div key={`col2-${i}`} className="flex items-center justify-center sm:justify-start gap-2 lg:gap-4 p-2 sm:p-3 lg:p-5 bg-card border border-border rounded-lg lg:rounded-2xl shadow-sm w-12 sm:w-32 lg:w-64 shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-md lg:rounded-xl bg-background border border-border flex items-center justify-center shadow-inner shrink-0">
                        <Icon name={item.icon} className={`${item.color} scale-75 sm:scale-100`} size={20}/>
                      </div>
                      <span className="block font-bold text-foreground text-[11px] sm:text-xs lg:text-base whitespace-nowrap truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </section>

        {/* New Comparison Section (Old Way vs Kormiis) */}
        <section className="relative z-10 w-full py-16 sm:py-24 bg-background snap-start flex flex-col items-center justify-center min-h-[50vh] overflow-hidden">
          <div className="w-full text-center mb-12 sm:mb-16 px-4">
            <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
              Say Goodbye to <span className="text-red-500">Manual Work</span>.
            </h2>
            <p className="text-muted-foreground mt-4 text-fluid-lg font-medium">
              See why growing teams are making the switch to Kormiis.
            </p>
          </div>

          {/* Chaos vs Control Comparison Table */}
          <div className="max-w-4xl mx-auto w-full px-4 relative z-20">
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-2 border-b border-border">
                <div className="p-6 sm:p-8 bg-red-500/5 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 shadow-sm">
                    <Icon name="warning" size={24}/>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-foreground">The Old Way</h3>
                  <p className="text-fluid-sm text-muted-foreground mt-1 font-medium">Chaos & scattered tools</p>
                </div>
                <div className="p-6 sm:p-8 bg-[#FE4D01] text-white text-center border-l border-[#FE4D01]/20 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 opacity-50"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white mb-4 shadow-sm">
                      <Icon name="check_circle" size={24}/>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white">The Kormiis Way</h3>
                    <p className="text-fluid-sm text-white/80 mt-1 font-medium">Everything in one place</p>
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {/* Row 1 */}
                <div className="grid grid-cols-2 group">
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
                    <Icon name="close" className="text-red-500 shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium opacity-80 leading-snug">Buddy punching & tracking attendance in WhatsApp</span>
                  </div>
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-[#FE4D01] group-hover:brightness-95 transition-all border-l border-[#FE4D01]/20 relative">
                    <Icon name="check" className="text-white shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium text-white/95 leading-snug">One-tap smart attendance with live GPS locations</span>
                  </div>
                </div>
                
                {/* Row 2 */}
                <div className="grid grid-cols-2 group">
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
                    <Icon name="close" className="text-red-500 shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium opacity-80 leading-snug">Weekends wasted re-typing paper sheets into Excel</span>
                  </div>
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-[#FE4D01] group-hover:brightness-95 transition-all border-l border-[#FE4D01]/20 relative">
                    <Icon name="check" className="text-white shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium text-white/95 leading-snug">Automated payroll math that exports instantly</span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-2 group">
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
                    <Icon name="close" className="text-red-500 shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium opacity-80 leading-snug">Leave requests in emails & lost expense receipts</span>
                  </div>
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-[#FE4D01] group-hover:brightness-95 transition-all border-l border-[#FE4D01]/20 relative">
                    <Icon name="check" className="text-white shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium text-white/95 leading-snug">Everything secured directly in your company cloud</span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-2 group">
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-red-500/5 group-hover:bg-red-500/10 transition-colors">
                    <Icon name="close" className="text-red-500 shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-medium opacity-80 leading-snug">Expensive $10/user monthly enterprise software fees</span>
                  </div>
                  <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4 bg-[#FE4D01] group-hover:brightness-95 transition-all border-l border-[#FE4D01]/20 relative">
                    <Icon name="star" className="text-white shrink-0 mt-0.5" size={20}/>
                    <span className="text-sm sm:text-base font-bold text-white leading-snug">100% Free forever. No sneaky per-seat fees.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 & 3: Marketing Highlights (Stacked with Blur Transition) */}
        <MarketingStackedSections containerRef={containerRef} />
      </div>

      {/* Auth Modal (Triggered by Start for free) */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="p-8 sm:p-10 sm:max-w-[420px]">
          {/* Subtle Glows inside Modal */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

          <DialogHeader className="mb-6 relative z-10 flex flex-col items-center">
            <DialogTitle className="sr-only">Sign in to Kormiis</DialogTitle>
            <div className="flex flex-col items-center justify-center gap-3">
              <img src={kormiisLogo} alt="Kormiis" className="h-8 dark:hidden block" />
              <img src={kormiisLogoDark} alt="Kormiis" className="h-8 hidden dark:block" />
              <p className="text-sm text-[#000000] font-medium text-center">
                Join for free. No credit card is required.
              </p>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-6 relative z-10">
            {error && (
              <div className="p-4 text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl flex items-center gap-2 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {loginMode === 'create' && pendingUser ? (
              <form onSubmit={handleCreateBusinessSpace} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="space-name" className="block text-sm font-semibold text-foreground mb-1.5">
                    Business Space Name
                  </label>
                  <Input
                    id="space-name"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="e.g. Kormiis Ltd."
                    className="bg-white/50 border-white/40 text-foreground placeholder:text-foreground/40 shadow-sm h-12 rounded-xl backdrop-blur-md"
                    autoFocus
                  />
                  <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                    This becomes your company profile. You'll be the workspace owner (admin).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
                >
                  {isLoading ? 'Creating...' : 'Create Business Space'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode(null); setPendingUser(null); setSpaceName(''); setError('') }}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground transition py-2 font-medium"
                >
                  Back to options
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3.5">
                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('join')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white/50 rounded-full text-sm font-bold text-foreground hover:bg-white/70 transition disabled:opacity-50 shadow-sm backdrop-blur-md"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span className="whitespace-nowrap">{loadingMode === 'join' ? 'Signing in...' : 'Join your business space'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('create')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white rounded-full text-sm font-bold text-black hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span className="whitespace-nowrap">{loadingMode === 'create' ? 'Signing in...' : 'Create your business space'}</span>
                </button>

                <p className="text-center text-balance text-[13px] text-[#000000] mt-4 leading-relaxed">
                  New? Create a Business Space for your company. Teammates join via email invite and sign in with their Google account.
                </p>
              </div>
            )}
          </div>
          <div className="w-full h-px bg-black relative z-10 mt-6" />
          <DialogFooter className="relative z-10 sm:justify-center mt-4 border-none pt-0">
            <p className="text-center text-balance text-[12px] text-[#000000] w-full leading-relaxed">
              By continuing, you agree to the Terms of Services and Privacy Policy.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section 8: FAQ */}
      <FaqSection />

      {/* Footer */}
      <FooterSection themeMode={themeMode} logoSrc={kormiisLogo} />

      {/* Already-in-a-Business-Space popup */}
      <Dialog open={showAlreadyInSpace} onOpenChange={(open) => { if (!open) setShowAlreadyInSpace(false) }}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Already part of a Business Space</DialogTitle>
            <DialogDescription>
              This Google account is already linked to a Business Space. Use the "Join a Business Space" tab to sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="info" className="shrink-0 mt-0.5 text-muted-foreground" size={16}/>
            <span>You can only belong to one workspace at a time.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setShowAlreadyInSpace(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={useJoinFromPopup}>
              Use Join a Business Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
