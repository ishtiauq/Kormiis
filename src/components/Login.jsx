import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"
import kormiisLogo from '../Assets/Kormiis Logo Final.svg'
import kormiisLogoDark from '../Assets/Kormiis Logo Dark.svg'
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

// Landing Page Modular Sections
import LandingHeader from './landing/LandingHeader.jsx'
import LandingHero from './landing/LandingHero.jsx'
import InteractiveAppShowcase from './landing/InteractiveAppShowcase.jsx'
import FeaturePillars from './landing/FeaturePillars.jsx'
import ComparisonSection from './landing/ComparisonSection.jsx'
import SecurityCloudSection from './landing/SecurityCloudSection.jsx'
import FaqSection from './landing/FaqSection.jsx'
import CtaSection from './landing/CtaSection.jsx'
import LandingFooter from './landing/LandingFooter.jsx'

export default function Login({ onLogin, themeMode, toggleTheme, setThemeMode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authTab, setAuthTab] = useState('up') // 'up' (Sign up) | 'in' (Sign in)
  const [loginMode, setLoginMode] = useState(null) // null | 'create' | 'join'
  const [pendingUser, setPendingUser] = useState(null) // Google user awaiting business space creation
  const [spaceName, setSpaceName] = useState('')
  const [showAlreadyInSpace, setShowAlreadyInSpace] = useState(false)
  const [alreadyUser, setAlreadyUser] = useState(null)
  const [loadingMode, setLoadingMode] = useState(null)
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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

  // Preserve light mode on landing page
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

  const openAuthModal = (tab = 'up') => {
    setAuthTab(tab)
    setError('')
    setIsAuthModalOpen(true)
  }

  return (
    <div className="force-light-mode h-dvh bg-background text-foreground relative overflow-y-auto overflow-x-hidden font-sans scroll-smooth">
      
      {/* 1. Sticky Floating Header */}
      <LandingHeader
        onOpenAuth={openAuthModal}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
      />

      {/* 2. Hero Section with Parallax & Vector Monochrome Sketch */}
      <LandingHero
        onOpenAuth={openAuthModal}
      />

      {/* 3. Interactive App Showcase Simulator */}
      <InteractiveAppShowcase />

      {/* 4. Deep-Dive Feature Pillars with Sketches */}
      <FeaturePillars />

      {/* 5. Legacy vs Kormiis Comparison Matrix */}
      <ComparisonSection onOpenAuth={openAuthModal} />

      {/* 6. Cloud Architecture & Security Showcase */}
      <SecurityCloudSection />

      {/* 7. Interactive FAQ Accordion */}
      <FaqSection />

      {/* 8. Conversion CTA Banner */}
      <CtaSection onOpenAuth={openAuthModal} />

      {/* 9. Modern SaaS Footer */}
      <LandingFooter onOpenAuth={openAuthModal} />

      {/* Auth Modal (Sign In / Sign Up / Create Business Space) */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="p-6 sm:p-8 sm:max-w-[420px] rounded-3xl">
          <DialogHeader className="mb-4 relative z-10 flex flex-col items-center">
            <DialogTitle className="sr-only">Sign in to Kormiis</DialogTitle>
            <div className="flex flex-col items-center justify-center gap-2">
              <img src={kormiisLogo} alt="Kormiis" className="h-8 block dark:hidden object-contain" />
              <img src={kormiisLogoDark} alt="Kormiis" className="h-8 hidden dark:block object-contain" />
              <p className="text-xs text-muted-foreground font-medium text-center">
                Free for your whole squad. No credit card required.
              </p>
            </div>
          </DialogHeader>

          {/* Segmented Tab Switcher */}
          <div className="relative z-10 flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border mb-4">
            <button
              type="button"
              onClick={() => switchAuthTab('in')}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                authTab === 'in' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchAuthTab('up')}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                authTab === 'up' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="flex flex-col gap-4 relative z-10">
            {error && (
              <div className="p-3 text-xs font-medium bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2">
                <Icon name="warning" size={16} className="text-destructive shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loginMode === 'create' && pendingUser ? (
              <form onSubmit={handleCreateBusinessSpace} className="flex flex-col gap-3">
                <div>
                  <label htmlFor="space-name" className="block text-xs font-bold text-foreground mb-1">
                    Business Space Name
                  </label>
                  <Input
                    id="space-name"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="h-11 rounded-xl text-xs"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    This becomes your company profile. You'll be the workspace owner (admin).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition disabled:opacity-50 mt-1"
                >
                  {isLoading ? 'Creating Workspace...' : 'Create Business Space'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode(null); setPendingUser(null); setSpaceName(''); setError('') }}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground transition py-1 font-medium text-center"
                >
                  ← Back to options
                </button>
              </form>
            ) : authTab === 'in' ? (
              <div className="flex flex-col gap-3">
                <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2.5 w-full">
                  <Input
                    type="text"
                    placeholder="Email or Phone Number"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary rounded-full text-xs font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 shadow-sm mt-1"
                  >
                    {loadingMode === 'join' ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-1 opacity-50">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('join')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-card border border-border rounded-full text-xs font-bold text-foreground hover:bg-muted/70 transition disabled:opacity-50 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <form onSubmit={(e) => { e.preventDefault(); setLoginMode('create'); setPendingUser(null); handleCreateBusinessSpace(e) }} className="flex flex-col gap-2.5 w-full">
                  <Input
                    type="text"
                    placeholder="Work Email"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                  <Input
                    type="password"
                    placeholder="Create Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                  <Input
                    type="text"
                    placeholder="Company / Business Name"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary rounded-full text-xs font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 shadow-sm mt-1"
                  >
                    {loadingMode === 'create' ? 'Creating Workspace...' : 'Create Business Space'}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-1 opacity-50">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <button
                  type="button"
                  onClick={() => handleFirebaseGoogleLogin('create')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-card border border-border rounded-full text-xs font-bold text-foreground hover:bg-muted/70 transition disabled:opacity-50 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  <span>Sign up with Google</span>
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="relative z-10 sm:justify-center mt-3 border-none pt-0">
            <p className="text-center text-[11px] text-muted-foreground w-full leading-relaxed">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Already in a Business Space Popup */}
      <Dialog open={showAlreadyInSpace} onOpenChange={(open) => { if (!open) setShowAlreadyInSpace(false) }}>
        <DialogContent className="max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Already Part of a Business Space</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This account is already linked to a Business Space. Sign in to enter your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-2xl bg-muted border border-border text-xs text-foreground flex items-start gap-2">
            <Icon name="info" className="shrink-0 mt-0.5 text-muted-foreground" size={16} />
            <span>You can only belong to one workspace at a time.</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full text-xs" onClick={() => setShowAlreadyInSpace(false)}>
              Cancel
            </Button>
            <Button className="rounded-full text-xs" onClick={useJoinFromPopup}>
              Sign In to Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
