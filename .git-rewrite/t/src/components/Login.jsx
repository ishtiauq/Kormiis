import { useState } from 'react'
import { Shield, Cloud, ArrowRight, HelpCircle, ChevronDown, ChevronUp, LogIn, Eye, EyeOff, Users, Zap, Sun, Moon, Monitor } from 'lucide-react'
import { fetchUserProfile } from '../services/googleDrive.js'
import { verifyPassword } from '../services/crypto.js'

export default function Login({ onLogin, themeMode, toggleTheme }) {
  const [authTab, setAuthTab] = useState('manager') // 'manager' | 'employee'
  const [isLoading, setIsLoading] = useState(false)
  const [showIntermediateModal, setShowIntermediateModal] = useState(false)
  const [showAccordion, setShowAccordion] = useState(false)
  const [faqOpenIndex, setFaqOpenIndex] = useState(null)

  // --- Employee state ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // --- Existing OAuth logic (preserved verbatim) ---
  const triggerOAuth = () => {
    setIsLoading(true)
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.warn("Google Client Library not detected. Falling back to simulated login.");
      setTimeout(() => {
        setIsLoading(false)
        const simulatedUser = {
          name: 'Ishtiauq Ahmed (Simulated)',
          email: 'ishtiauq@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          role: 'HR Manager',
          isSimulated: true,
          token: 'mock-token-12345'
        }
        onLogin(simulatedUser)
      }, 1200)
      return
    }
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const profile = await fetchUserProfile(tokenResponse.access_token)
              const googleUser = {
                name: profile.name,
                email: profile.email,
                avatar: profile.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                role: 'HR Manager',
                token: tokenResponse.access_token
              }
              setIsLoading(false)
              onLogin(googleUser)
            } catch (err) {
              setIsLoading(false)
              setError("Failed to fetch Google profile details: " + err.message)
            }
          } else {
            setIsLoading(false)
          }
        },
        error_callback: (err) => {
          setIsLoading(false)
          setError("Authorization error: " + err.message)
        }
      })
      client.requestAccessToken({ prompt: 'consent' })
    } catch (e) {
      setIsLoading(false)
      setError("Error initializing Google Login client: " + e.message)
    }
  }

  const handleConnectClick = () => {
    const shown = localStorage.getItem('hr_pulse_auth_modal_shown')
    if (shown === 'true') {
      triggerOAuth()
    } else {
      setShowIntermediateModal(true)
    }
  }

  const handleConfirmAuthorize = () => {
    localStorage.setItem('hr_pulse_auth_modal_shown', 'true')
    setShowIntermediateModal(false)
    triggerOAuth()
  }

  // --- Employee login logic (moved from EmployeeLogin.jsx) ---
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const storedEmployees = localStorage.getItem('hr_pulse_employees_plain')
      if (!storedEmployees) {
        setError('No employee data found. Please contact your HR department.')
        setIsLoading(false)
        return
      }
      const employees = JSON.parse(storedEmployees)
      const employee = employees.find(e => e.email === email)
      if (!employee) {
        setError('Invalid email or password.')
        setIsLoading(false)
        return
      }
      const valid = await verifyPassword(password, employee.passwordHash || employee.password)
      if (!valid) {
        setError('Invalid email or password.')
        setIsLoading(false)
        return
      }
      const hrToken = localStorage.getItem('hr_pulse_hr_token')
      const employeeUser = {
        name: employee.name,
        email: employee.email,
        role: employee.role || 'Employee',
        department: employee.department,
        avatar: employee.avatar || '',
        isEmployee: true,
        employeeId: employee.id,
        token: hrToken || ''
      }
      onLogin(employeeUser)
    } catch (err) {
      setError('Login failed: ' + err.message)
      setIsLoading(false)
    }
  }

  // --- Render ---
  return (
    <div className="login-page">
      {/* Topbar */}
      <header className="login-topbar">
        <div className="login-topbar-left">
          <div className="login-topbar-logo">
            <span className="login-topbar-logo-icon">HP</span>
          </div>
          <span className="login-topbar-brand">HR Pulse</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} title={`Theme: ${themeMode}`} aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-[var(--md-bw-on-surface-variant)] cursor-pointer">
            {themeMode === 'system' ? <Monitor size={16} /> : themeMode === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="login-topbar-badge">
            <Zap size={12} />
            Free for limited time
          </div>
        </div>
      </header>

      {/* Auth Panel */}
      <div className="login-auth">
          <div className="login-auth-card p-6 sm:p-8 lg:p-10">
          {/* Tabs */}
          <div className="login-tabs" role="tablist">
            <button role="tab" aria-selected={authTab === 'manager'} className={`login-tab ${authTab === 'manager' ? 'active' : ''}`} onClick={() => setAuthTab('manager')}>HR Manager</button>
            <button role="tab" aria-selected={authTab === 'employee'} className={`login-tab ${authTab === 'employee' ? 'active' : ''}`} onClick={() => setAuthTab('employee')}>Employee</button>
          </div>

          {/* Tab content rendered eagerly — conditionally visible */}
            <div style={{ display: authTab === 'manager' ? 'block' : 'none' }}>
              <div className="flex flex-col gap-5">
                {error && (
                  <div className="login-error">{error}</div>
                )}
                <button onClick={handleConnectClick} className="login-drive-btn px-5 py-2.5 sm:px-6 sm:py-3" disabled={isLoading}>
                {isLoading ? (
                  <span>Connecting Drive...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="currentColor"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="currentColor"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l-12.85 22.2z" fill="currentColor"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="currentColor"/><path d="m59.8 53h-27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h24.5c1.6 0 3.15-.45 4.5-1.2z" fill="currentColor"/><path d="m73.4 26.5-12.2-21.1c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.4 28.4 11.6-19.6 1.35-2.35c.8-1.35 1.2-2.85 1.2-4.4 0-1.55-.4-3.05-1.2-4.45z" fill="currentColor"/></svg>
                    <span className="font-semibold">Connect Google Drive</span>
                  </>
                )}
              </button>

            </div>
          </div>
          <div style={{ display: authTab === 'employee' ? 'block' : 'none' }}>
            <form onSubmit={handleEmployeeSubmit} aria-label="Employee login form" className="flex flex-col gap-16">
              {error && (
                <div className="login-error">{error}</div>
              )}

              <div>
                <label className="login-label" htmlFor="login-email">Email Address</label>
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required className="login-input px-3 sm:px-4 py-2 sm:py-2.5" />
              </div>

              <div>
                <label className="login-label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <input id="login-password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                    required className="login-input px-3 sm:px-4 py-2 sm:py-2.5 pr-11" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-btn" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="login-drive-btn px-5 py-2.5 sm:px-6 sm:py-3 mt-2" aria-label="Log in">
                {isLoading ? 'Signing in...' : 'Sign In'}
                {!isLoading && <LogIn size={16} />}
              </button>

              <p className="login-trust-line mt-0">
                <Users size={14} />
                Sign in with the credentials provided by your HR department.
              </p>
            </form>
          </div>
        </div>
      </div>

      {showIntermediateModal && (
        <div className="login-modal-overlay">
          <div className="login-modal">
            <h2 className="login-modal-title">Just one thing before we connect...</h2>
            <p className="login-modal-desc">HR Pulse needs permission to create a private app folder in your Google Drive.</p>

            <div className="login-modal-illustration">
              <Cloud size={38} className="text-[#444]" />
            </div>

            <ul className="login-modal-perms">
              <li><span className="perm-check">✅</span> Create and manage files in a hidden app folder</li>
              <li><span className="perm-cross">❌</span> We do NOT access your photos, documents, or spreadsheets</li>
              <li><span className="perm-cross">❌</span> We do NOT share your data with third parties</li>
            </ul>

            <div className="flex flex-col gap-2.5">
              <button onClick={handleConfirmAuthorize} className="login-drive-btn px-5 py-2.5 sm:px-6 sm:py-3 justify-center">
                Authorize Google Drive <ArrowRight size={16} />
              </button>
              <button onClick={() => setShowAccordion(prev => !prev)} className="login-learn-btn">
                <HelpCircle size={16} /> Learn More {showAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showAccordion && (
              <div className="login-modal-accordion">
                <h4>What is drive.appdata scope?</h4>
                <p>It is a private, isolated storage area inside your Google Drive account designed only for specific apps. Files stored here are completely hidden from your main Drive directory and other applications. This ensures that only HR Pulse can read and modify the files, keeping your payroll and directories strictly private.</p>
              </div>
            )}

            <div className="login-modal-footer">You can disconnect anytime from Settings → Google Drive Sync.</div>
          </div>
        </div>
      )}

      <div className="login-faq">
        <h2 className="login-faq-title">Frequently Asked Questions</h2>
        <div className="login-faq-list">
          {[
            { q: 'What is HR Pulse?', a: 'HR Pulse is a private, offline-first HR management system. Your employee data, payroll, and attendance records are stored exclusively in a hidden folder inside your own Google Drive.' },
            { q: 'How does Google Drive integration work?', a: 'When you connect your Google Drive, HR Pulse creates a private app folder (drive.appdata) that is hidden from your main Drive view. Only HR Pulse can read and write to this folder.' },
            { q: 'Is my data secure?', a: 'Yes. Your data never leaves your Google Drive storage. We have zero access to your files. The app runs entirely offline-first in your browser.' },
            { q: 'Is HR Pulse really free?', a: 'Yes. HR Pulse is free for a limited time with no credit card required. All features are included at no cost.' },
          ].map((faq, i) => (
            <div key={i} className="login-faq-item">
              <button className="login-faq-question" onClick={() => setFaqOpenIndex(faqOpenIndex === i ? null : i)}>
                {faq.q}
                {faqOpenIndex === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {faqOpenIndex === i && (
                <div className="login-faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="login-footer">
        <div className="login-footer-inner">
          <div className="login-footer-logo">
            <span className="login-footer-logo-icon">HP</span>
            <span className="login-footer-logo-text">HR Pulse</span>
          </div>
          <p className="login-footer-desc">Private, offline-first HR management. Your data stays in your Drive.</p>
          <div className="login-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="login-footer-bottom">
          <span>&copy; {new Date().getFullYear()} HR Pulse. All rights reserved.</span>
        </div>
      </footer>

      <style>{`
        .login-page {
          min-height: 100vh; display: flex; flex-direction: column;
          font-family: var(--font-sans, 'Roboto', sans-serif);
          background: var(--bg-primary, #f5f5f7);
        }
        .login-topbar {
          height: 56px; min-height: 56px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 20px; position: fixed;
          top: 16px; left: 50%; transform: translateX(-50%);
          z-index: 100; margin: 0; overflow: hidden;
          width: calc(100% - 40px); max-width: 700px; border-radius: 100px; box-sizing: border-box;
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.3);
          background: linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.15), rgba(255,255,255,0.4));
          background-size: 200% 200%;
          animation: liquidTopbar 8s ease-in-out infinite;
        }
        .login-topbar::before {
          content: ''; position: absolute; inset: 0;
          border-radius: 100px; pointer-events: none;
          background: radial-gradient(ellipse at 30% 120%, rgba(255,255,255,0.35) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% -20%, rgba(255,255,255,0.2) 0%, transparent 50%);
        }
        @keyframes liquidTopbar {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }
        [data-theme="dark"] .login-topbar, .dark .login-topbar {
          background: linear-gradient(135deg, rgba(40,40,50,0.6), rgba(25,25,35,0.4), rgba(35,35,45,0.55));
          background-size: 200% 200%;
          animation: liquidTopbar 8s ease-in-out infinite;
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        [data-theme="dark"] .login-topbar::before, .dark .login-topbar::before {
          background: radial-gradient(ellipse at 30% 120%, rgba(255,255,255,0.08) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% -20%, rgba(255,255,255,0.05) 0%, transparent 50%);
        }
        [data-theme="dark"] .login-topbar-brand, .dark .login-topbar-brand {
          color: rgba(255,255,255,0.9);
        }
        .login-topbar-left {
          display: flex; align-items: center; gap: 10px;
        }
        .login-topbar-logo {
          width: 28px; height: 28px;
          background: var(--md-bw-primary, #222);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .login-topbar-logo-icon {
          color: var(--md-bw-on-primary, #fff);
          font: 700 var(--fs-label-small)/1 'Roboto', sans-serif;
        }
        .login-topbar-brand {
          font: 700 var(--fs-title-large)/1.33 'Roboto', sans-serif;
          color: var(--md-bw-on-surface, #222);
          letter-spacing: -0.01em; white-space: nowrap;
        }
        .login-topbar-badge {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 100px;
          background: #e02014;
          border: 1px solid rgba(224,32,20,0.3);
          color: #fff; font-size: var(--fs-label-small); font-weight: 700;
          white-space: nowrap; letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .login-auth {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 24px 48px;
          background: transparent; position: relative;
        }
        .login-auth-card {
          width: 100%; max-width: 420px;
          background: var(--glass-bg, rgba(255,255,255,0.45));
          backdrop-filter: var(--glass-blur, blur(24px) saturate(180%));
          -webkit-backdrop-filter: var(--glass-blur, blur(24px) saturate(180%));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
          border-radius: 20px;
          box-shadow: var(--glass-shadow, 0 8px 32px rgba(0,0,0,0.04));
        }
        .login-page :where(.login-auth-card, .login-input, .login-modal, .login-modal-illustration, .login-modal-accordion, .login-learn-btn, .login-faq-item) {
          border-color: rgba(0,0,0,0.08);
        }
        .login-tabs {
          display: flex; background: var(--glass-bg, rgba(0,0,0,0.04)); border-radius: 12px; padding: 4px; margin-bottom: 28px;
        }
        .login-tab {
          flex: 1; padding: 16px; border: none; border-radius: 14px; cursor: pointer;
          font: 600 var(--fs-body-large) var(--font-sans, 'Roboto', sans-serif); transition: all 0.2s;
          background: transparent; color: var(--md-bw-on-surface-variant, #666);
        }
        .login-tab.active {
          background: #1a1a1a; color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .login-drive-btn {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          width: 100%; border: none; border-radius: 14px;
          background: #0062E6; color: #fff; position: relative; overflow: hidden;
          font: 600 var(--fs-body-large) var(--font-sans, 'Roboto', sans-serif); cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          box-shadow: 0 4px 16px rgba(0,98,230,0.3);
        }
        .login-drive-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: btnShine 3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes btnShine {
          0% { background-position: 200% 0; }
          60% { background-position: -200% 0; }
          100% { background-position: -200% 0; }
        }
        .login-drive-btn:hover { transform: translateY(-1px); background: #0055cc; }
        .login-drive-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        [data-theme="dark"] .login-tab.active, .dark .login-tab.active {
          background: #fff; color: #111;
        }
        [data-theme="dark"] .login-drive-btn, .dark .login-drive-btn {
          background: #0062E6; color: #fff;
        }
        [data-theme="dark"] .login-drive-btn:hover, .dark .login-drive-btn:hover {
          background: #0055cc;
        }

        .login-trust-line {
          display: flex; align-items: center; gap: 8px; justify-content: center;
          font-size: var(--fs-label-small); color: var(--md-bw-on-surface-variant, #888); margin: 0; text-align: center;
          line-height: 1.4;
        }
        .login-trust-line strong { color: var(--md-bw-on-surface, #222); }

        .login-label {
          display: block; margin-bottom: 6px;
          font: 500 var(--fs-label-medium) var(--font-sans, 'Roboto', sans-serif);
          color: var(--md-bw-on-surface-variant, #666);
        }
        .login-input {
          width: 100%; border-radius: 10px; box-sizing: border-box;
          border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
          background: var(--color-md-sys-surface, #fff);
          color: var(--md-bw-on-surface, #222);
          font: 400 var(--fs-body-medium) var(--font-sans, 'Roboto', sans-serif); outline: none;
          transition: border-color 0.2s;
        }
        .login-input:focus { border-color: #555; }
        .login-eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--md-bw-on-surface-variant, #888); padding: 4px; display: flex;
        }
        .login-modal-overlay {
          position: fixed; inset: 0; z-index: 10005;
          display: flex; align-items: center; justify-content: center;
          background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: loginOverlayFadeIn 0.3s ease-out forwards;
        }
        .login-modal {
          max-width: 480px; width: 90%; padding: 32px; border-radius: 20px;
          background: var(--color-md-sys-surface, #fff);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
          animation: loginModalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          display: flex; flex-direction: column; gap: 20px;
        }
        .login-modal-title {
          font-size: var(--fs-headline-small); font-weight: 800; color: var(--md-bw-on-surface, #222); margin: 0;
        }
        .login-modal-desc {
          font-size: var(--fs-body-medium); color: var(--md-bw-on-surface-variant, #666); margin: 0; line-height: 1.5;
        }
        .login-modal-illustration {
          display: flex; justify-content: center; align-items: center;
          padding: 24px; background: var(--bg-primary, #f5f5f7);
          border-radius: 12px; border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
        }
        .login-modal-perms {
          list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;
        }
        .login-modal-perms li {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: var(--fs-body-medium); color: var(--md-bw-on-surface-variant, #666); line-height: 1.4;
        }
        .perm-check { font-size: 1rem; }
        .perm-cross { font-size: 1rem; }
        .login-learn-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          width: 100%; padding: 12px; border-radius: 12px; cursor: pointer;
          background: transparent; border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
          color: var(--md-bw-on-surface-variant, #666);
          font: 600 var(--fs-label-large) var(--font-sans, 'Roboto', sans-serif); transition: background 0.2s;
        }
        .login-learn-btn:hover { background: var(--glass-bg, rgba(0,0,0,0.03)); }
        .login-modal-accordion {
          padding: 16px; background: var(--bg-primary, #f5f5f7);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.55)); border-radius: 12px;
          animation: loginExpandDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-modal-accordion h4 { margin: 0 0 6px; font-size: var(--fs-label-large); font-weight: 700; color: var(--md-bw-on-surface, #222); }
        .login-modal-accordion p { margin: 0; font-size: var(--fs-body-small); color: var(--md-bw-on-surface-variant, #666); line-height: 1.45; }
        .login-modal-footer {
          font-size: var(--fs-label-small); color: var(--md-bw-on-surface-variant, #999); text-align: center;
          border-top: 1px solid var(--glass-border, rgba(255,255,255,0.55)); padding-top: 16px;
        }

        @keyframes loginOverlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes loginModalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes loginExpandDown { from { opacity: 0; transform: translateY(-8px); max-height: 0; overflow: hidden; } to { opacity: 1; transform: translateY(0); max-height: 200px; } }

        .login-error {
          padding: 12px 16px; border-radius: 8px;
          background: rgba(224, 32, 20, 0.08); border: 1px solid rgba(224, 32, 20, 0.2);
          color: #E02014; font-size: var(--fs-body-medium);
        }

                .login-footer-free {
          margin-top: 16px; padding: 16px;
          font-size: var(--fs-body-medium); font-weight: 700;
          color: #fff; text-align: center;
          background: #e02014;
          border-radius: 10px;
          width: 100%; max-width: 420px; box-sizing: border-box;
        }

        .login-faq {
          width: 100%; max-width: 960px; margin: 0 auto; padding: 64px 24px 80px;
          box-sizing: border-box;
        }
        .login-faq-title {
          font-size: var(--fs-headline-medium); font-weight: 800; text-align: center;
          margin: 0 0 32px; color: var(--md-bw-on-surface, #222);
        }
        .login-faq-list {
          display: flex; flex-direction: column; gap: 12px;
        }
        .login-faq-item {
          border: 1px solid var(--glass-border, rgba(0,0,0,0.08));
          border-radius: 14px; overflow: hidden;
          background: var(--glass-bg, rgba(255,255,255,0.4));
        }
        .login-faq-question {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 16px 20px; border: none; cursor: pointer;
          font: 600 var(--fs-label-large) var(--font-sans, 'Roboto', sans-serif);
          color: var(--md-bw-on-surface, #222);
          background: transparent; transition: background 0.2s;
        }
        .login-faq-question:hover { background: rgba(0,0,0,0.02); }
        .login-faq-answer {
          padding: 0 20px 16px;
          font-size: var(--fs-body-medium); color: var(--md-bw-on-surface-variant, #666);
          line-height: 1.6; animation: loginExpandDown 0.25s ease-out forwards;
        }

        .login-footer {
          background: var(--glass-bg, rgba(255,255,255,0.4));
          backdrop-filter: var(--glass-blur, blur(20px));
          border-top: 1px solid var(--glass-border, rgba(0,0,0,0.06));
          padding: 48px 24px 0; margin-top: 40px;
        }
        [data-theme="dark"] .login-footer, .dark .login-footer {
          border-top-color: rgba(255,255,255,0.06);
        }
        [data-theme="dark"] .login-footer-links a, .dark .login-footer-links a {
          color: rgba(255,255,255,0.4);
        }
        [data-theme="dark"] .login-footer-links a:hover, .dark .login-footer-links a:hover {
          color: rgba(255,255,255,0.8);
        }
        [data-theme="dark"] .login-footer-bottom, .dark .login-footer-bottom {
          border-top-color: rgba(255,255,255,0.06);
        }
        .login-footer-inner {
          max-width: 960px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          text-align: center;
        }
        .login-footer-logo {
          display: flex; align-items: center; gap: 10px;
        }
        .login-footer-logo-icon {
          width: 28px; height: 28px;
          background: var(--md-bw-primary, #222);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          color: var(--md-bw-on-primary, #fff);
          font: 700 var(--fs-label-small)/1 'Roboto', sans-serif;
        }
        .login-footer-logo-text {
          font: 700 var(--fs-title-large)/1.33 'Roboto', sans-serif;
          color: var(--md-bw-on-surface, #222);
        }
        .login-footer-desc {
          font-size: var(--fs-body-medium); color: var(--md-bw-on-surface-variant, #999);
          line-height: 1.6; margin: 0; max-width: 360px;
        }
        .login-footer-links {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
        }
        .login-footer-links a {
          font-size: var(--fs-label-medium); color: var(--md-bw-on-surface-variant, #999);
          text-decoration: none; transition: color 0.15s;
        }
        .login-footer-links a:hover { color: var(--md-bw-primary, #222); }
        .login-footer-bottom {
          max-width: 960px; margin: 0 auto;
          padding: 20px 0; margin-top: 36px;
          border-top: 1px solid var(--glass-border, rgba(0,0,0,0.06));
          font-size: var(--fs-label-small); color: var(--md-bw-on-surface-variant, #999);
          text-align: center;
        }

        @media (max-width: 768px) {
          .login-topbar { top: 8px; width: calc(100% - 16px); border-radius: 14px; height: 48px; min-height: 48px; padding: 0 14px; }
          .login-topbar-badge { font-size: var(--fs-label-small); padding: 4px 10px; }
          .login-auth { padding: 80px 12px 24px; }
          .login-auth-card { border-radius: 16px; }
          .login-footer-free { font-size: var(--fs-label-medium); padding: 14px; }
          .login-tabs { gap: 4px; }
          .login-tab { font-size: var(--fs-body-medium); padding: 14px; }
          .login-faq { padding: 32px 12px 48px; }
          .login-faq-title { font-size: var(--fs-title-large); margin-bottom: 20px; }
          .login-faq-question { padding: 14px 16px; font-size: var(--fs-body-medium); }
          .login-faq-answer { padding: 0 16px 14px; font-size: var(--fs-label-medium); }
          .login-footer { padding: 32px 12px 0; margin-top: 24px; }
          .login-footer-bottom { margin-top: 24px; padding: 16px 0; }
        }
      `}</style>
    </div>
  )
}
