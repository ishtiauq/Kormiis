# Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current landing-style login page with a modern split-panel auth experience featuring HR Manager (Google Drive) and Employee (password) tabs.

**Architecture:** Single Login.jsx component with embedded `<style>` tag. Both auth paths live inside this component via tab switching. App.jsx routing simplified since EmployeeLogin.jsx is no longer needed as a separate route. All existing login logic (OAuth flow, employee validation from localStorage) is preserved.

**Tech Stack:** React, lucide-react, Google OAuth (GIS), localStorage for auth flags and employee records.

## Global Constraints

- Both auth paths must work: HR Manager (Google Drive OAuth + trust modal) and Employee (email/password)
- Trust modal must appear on first Drive connect click only (localStorage flag)
- Employee login validates against `hr_pulse_employees_plain` in localStorage
- All existing OAuth logic (triggerOAuth, fetchUserProfile, simulated fallback) preserved
- No external images for brand panel graphic — use CSS-only abstract shapes
- EmployeeLogin.jsx component becomes unused but should be left as-is (no deletion)

---

### Task 1: Update App.jsx — Remove EmployeeLogin routing

**Files:**
- Modify: `src/App.jsx:136, 1429-1433`

**Interfaces:**
- Consumes: none
- Produces: Login now receives only `onLogin` prop (no `onEmployeeLogin`)

- [ ] **Step 1: Remove `showEmployeeLogin` state**

```jsx
// Remove line 136:
// const [showEmployeeLogin, setShowEmployeeLogin] = useState(false)
```

- [ ] **Step 2: Replace the login rendering block**

Replace:
```jsx
  if (!user) {
    if (showEmployeeLogin) {
      return <EmployeeLogin onLogin={handleLogin} onBack={() => setShowEmployeeLogin(false)} />
    }
    return <Login onLogin={handleLogin} onEmployeeLogin={() => setShowEmployeeLogin(true)} />
  }
```

With:
```jsx
  if (!user) {
    return <Login onLogin={handleLogin} />
  }
```

- [ ] **Step 3: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "login: remove EmployeeLogin routing, Login handles both auth paths"
```

---

### Task 2: Rewrite Login.jsx — Split-panel layout + Brand panel

**Files:**
- Modify: `src/components/Login.jsx` (complete rewrite)

**Interfaces:**
- Consumes: `onLogin` prop from App.jsx
- Produces: rendered split-panel layout with brand panel (left) and auth card placeholder (right)

- [ ] **Step 1: Write the new Login component shell**

Replace the entire `Login.jsx` with:

```jsx
import { useState } from 'react'
import { Activity, Shield, Cloud, Lock, ArrowRight, HelpCircle, ChevronDown, ChevronUp, LogIn, Eye, EyeOff } from 'lucide-react'
import { fetchUserProfile } from '../services/googleDrive.js'

export default function Login({ onLogin }) {
  const [authTab, setAuthTab] = useState('manager') // 'manager' | 'employee'
  const [isLoading, setIsLoading] = useState(false)
  const [showIntermediateModal, setShowIntermediateModal] = useState(false)
  const [showAccordion, setShowAccordion] = useState(false)

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
              alert("Failed to fetch Google profile details: " + err.message)
            }
          } else {
            setIsLoading(false)
          }
        },
        error_callback: (err) => {
          setIsLoading(false)
          alert("Authorization error: " + err.message)
        }
      })
      client.requestAccessToken({ prompt: 'consent' })
    } catch (e) {
      setIsLoading(false)
      alert("Error initializing Google Login client: " + e.message)
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
      const employee = employees.find(e => e.email === email && e.password === password)
      if (!employee) {
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
    <div className="login-split">
      {/* Brand Panel */}
      <div className="login-brand">
        <div className="login-brand-header">
          <div className="login-logo-box">
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <span className="login-brand-title">HR Pulse</span>
            <span className="login-brand-tagline">DRIVE-BASED HRM</span>
          </div>
        </div>
        <div className="login-brand-center">
          <h1 className="login-hero">Your HR Data,<br />Your Drive</h1>
          <p className="login-hero-sub">Private, offline-first HR management — powered by your Google Drive.</p>
        </div>
        <div className="login-brand-graphic">
          <div className="brand-shape brand-shape-1" />
          <div className="brand-shape brand-shape-2" />
          <div className="brand-shape brand-shape-3" />
        </div>
      </div>

      {/* Auth Panel */}
      <div className="login-auth">
        <div className="login-auth-card">
          {/* Tabs */}
          <div className="login-tabs">
            <button className={`login-tab ${authTab === 'manager' ? 'active' : ''}`} onClick={() => setAuthTab('manager')}>HR Manager</button>
            <button className={`login-tab ${authTab === 'employee' ? 'active' : ''}`} onClick={() => setAuthTab('employee')}>Employee</button>
          </div>

          {/* Tab content rendered eagerly — conditionally visible */}
          <div style={{ display: authTab === 'manager' ? 'block' : 'none' }}>
            {/* HR Manager content will be added in Task 3 */}
          </div>
          <div style={{ display: authTab === 'employee' ? 'block' : 'none' }}>
            {/* Employee content will be added in Task 4 */}
          </div>
        </div>
      </div>

      <style>{`
        .login-split {
          display: flex; height: 100vh; width: 100%; font-family: var(--font-sans, 'Roboto', sans-serif);
          background: var(--bg-primary);
        }
        .login-brand {
          flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
          padding: 48px; position: relative; overflow: hidden;
          background: linear-gradient(-45deg, #0f0f1a, #1a1a2e, #16213e, #0f3460);
        }
        .login-brand-header {
          position: absolute; top: 32px; left: 48px; display: flex; align-items: center; gap: 10px; z-index: 2;
        }
        .login-logo-box {
          width: 40px; height: 40px; background: var(--accent-primary, #e85d4a);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(232, 93, 74, 0.35);
        }
        .login-brand-title {
          font-size: 1.15rem; font-weight: 800; color: #fff; display: block; line-height: 1.1;
        }
        .login-brand-tagline {
          font-size: 0.6rem; font-weight: 700; color: var(--accent-primary, #e85d4a);
          letter-spacing: 0.1em; display: block;
        }
        .login-brand-center {
          text-align: center; z-index: 2; position: relative;
        }
        .login-hero {
          font-size: 2.8rem; font-weight: 800; color: #fff; line-height: 1.15;
          letter-spacing: -0.02em; margin: 0 0 16px;
          font-family: var(--font-display, 'Roboto', sans-serif);
        }
        .login-hero-sub {
          font-size: 1rem; color: rgba(255,255,255,0.6); margin: 0; max-width: 320px; line-height: 1.5;
        }
        .login-brand-graphic {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
        }
        .brand-shape {
          position: absolute; border-radius: 50%; opacity: 0.07;
        }
        .brand-shape-1 {
          width: 400px; height: 400px; background: #4a9eff; top: -100px; right: -100px;
        }
        .brand-shape-2 {
          width: 300px; height: 300px; background: #7c3aed; bottom: -80px; left: -80px;
        }
        .brand-shape-3 {
          width: 200px; height: 200px; background: #06b6d4; top: 50%; left: 50%; transform: translate(-50%, -50%);
        }

        .login-auth {
          flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px;
          background: var(--bg-primary, #f5f5f7); position: relative;
        }
        .login-auth-card {
          width: 100%; max-width: 420px;
          background: var(--glass-bg, rgba(255,255,255,0.45));
          backdrop-filter: var(--glass-blur, blur(24px) saturate(180%));
          -webkit-backdrop-filter: var(--glass-blur, blur(24px) saturate(180%));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
          border-radius: 20px; padding: 32px;
          box-shadow: var(--glass-shadow, 0 8px 32px rgba(0,0,0,0.04));
        }
        .login-tabs {
          display: flex; background: var(--glass-bg, rgba(0,0,0,0.04)); border-radius: 12px; padding: 4px; margin-bottom: 28px;
        }
        .login-tab {
          flex: 1; padding: 10px 16px; border: none; border-radius: 10px; cursor: pointer;
          font: 600 14px var(--font-sans, 'Roboto', sans-serif); transition: all 0.2s;
          background: transparent; color: var(--md-bw-on-surface-variant, #666);
        }
        .login-tab.active {
          background: var(--color-accent, #e85d4a); color: #fff;
          box-shadow: 0 2px 8px rgba(232, 93, 74, 0.3);
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds (may see chunk size warning, that's OK)

- [ ] **Step 3: Commit**

```bash
git add src/components/Login.jsx
git commit -m "login: split-panel layout with brand panel and auth card shell"
```

---

### Task 3: Add HR Manager tab content

**Files:**
- Modify: `src/components/Login.jsx` (HR Manager tab section inside the `display: block` div)

- [ ] **Step 1: Add HR Manager content block**

Inside the `<div style={{ display: authTab === 'manager' ? 'block' : 'none' }}>`, add:

```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
  <button onClick={handleConnectClick} className="login-drive-btn" disabled={isLoading}>
    {isLoading ? (
      <span>Connecting Drive...</span>
    ) : (
      <>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.143 2.5-.97 3.514v2.923h6.39c3.74-3.437 5.725-8.508 5.725-14.294z"/><path fill="currentColor" d="M12 24c3.24 0 5.97-1.08 7.96-2.92l-6.39-2.923c-1.78 1.19-4.06 1.9-6.57 1.9-5.053 0-9.336-3.415-10.865-8.01H1.61v3.023C3.606 20.015 7.55 24 12 24z"/><path fill="currentColor" d="M1.135 12.077a14.364 14.364 0 0 1 0-4.154V4.9H1.61A23.953 23.953 0 0 0 0 12c0 2.502.39 4.903 1.135 7.177l6.388-3.023c-.382-1.144-.388-2.933 0-4.077z"/><path fill="currentColor" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.23 0 12 0 7.55 0 3.606 3.985 1.61 7.9H8.025C9.554 3.305 13.837 4.75 12 4.75z"/></svg>
        <span style={{ fontWeight: 600 }}>Connect Google Drive</span>
      </>
    )}
  </button>

  <p className="login-trust-line">
    <Shield size={14} />
    We only create a private <strong>HR-Pulse-DB</strong> folder in your Drive. We never access your personal files.
  </p>
</div>
```

And add the associated CSS inside the `<style>` tag:

```css
.login-drive-btn {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  width: 100%; padding: 16px; border: none; border-radius: 14px;
  background: var(--color-accent, #e85d4a); color: #fff;
  font: 600 1rem var(--font-sans, 'Roboto', sans-serif); cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  box-shadow: 0 4px 12px var(--color-accent-glow, rgba(232,93,74,0.25));
}
.login-drive-btn:hover { transform: translateY(-1px); background: var(--color-accent-hover, #d04a3a); }
.login-drive-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.login-trust-line {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  font-size: 0.78rem; color: var(--md-bw-on-surface-variant, #888); margin: 0; text-align: center;
  line-height: 1.4;
}
.login-trust-line strong { color: var(--md-bw-on-surface, #222); }
```

- [ ] **Step 2: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Login.jsx
git commit -m "login: add HR Manager tab with Google Drive connect button"
```

---

### Task 4: Add Employee tab content

**Files:**
- Modify: `src/components/Login.jsx` (Employee tab section)

- [ ] **Step 1: Add Employee login form**

Inside the `<div style={{ display: authTab === 'employee' ? 'block' : 'none' }}>`, add:

```jsx
<form onSubmit={handleEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  {error && (
    <div className="login-error">{error}</div>
  )}

  <div>
    <label className="login-label">Email Address</label>
    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
      placeholder="you@company.com" required className="login-input" />
  </div>

  <div>
    <label className="login-label">Password</label>
    <div style={{ position: 'relative' }}>
      <input type={showPassword ? 'text' : 'password'} value={password}
        onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
        required className="login-input" style={{ paddingRight: '44px' }} />
      <button type="button" onClick={() => setShowPassword(!showPassword)}
        className="login-eye-btn">
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>

  <button type="submit" disabled={isLoading} className="login-drive-btn" style={{ marginTop: '8px' }}>
    {isLoading ? 'Signing in...' : 'Sign In'}
    {!isLoading && <LogIn size={16} />}
  </button>

  <p className="login-trust-line" style={{ marginTop: 0 }}>
    <Users size={14} />
    Sign in with the credentials provided by your HR department.
  </p>
</form>
```

And add CSS:

```css
.login-label {
  display: block; margin-bottom: 6px;
  font: 500 13px var(--font-sans, 'Roboto', sans-serif);
  color: var(--md-bw-on-surface-variant, #666);
}
.login-input {
  width: 100%; padding: 12px 16px; border-radius: 10px; box-sizing: border-box;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
  background: var(--color-md-sys-surface, #fff);
  color: var(--md-bw-on-surface, #222);
  font: 400 14px var(--font-sans, 'Roboto', sans-serif); outline: none;
  transition: border-color 0.2s;
}
.login-input:focus { border-color: var(--color-accent, #e85d4a); }
.login-eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--md-bw-on-surface-variant, #888); padding: 4px; display: flex;
}
.login-error {
  padding: 12px 16px; border-radius: 8px;
  background: rgba(224, 32, 20, 0.08); border: 1px solid rgba(224, 32, 20, 0.2);
  color: #E02014; font-size: 0.88rem;
}
```

Also import `Users` at the top of Login.jsx (add to the lucide-react import line).

- [ ] **Step 2: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Login.jsx
git commit -m "login: add Employee tab with email/password form"
```

---

### Task 5: Add trust modal

**Files:**
- Modify: `src/components/Login.jsx` (add modal before closing `</div>` of the component)

- [ ] **Step 1: Add trust modal JSX**

After the login-auth-card div and before `</div>` of login-auth, or at the root level of the returned JSX (before closing `</div>` of login-split), add:

```jsx
{showIntermediateModal && (
  <div className="login-modal-overlay">
    <div className="login-modal">
      <h2 className="login-modal-title">Just one thing before we connect...</h2>
      <p className="login-modal-desc">HR Pulse needs permission to create a private app folder in your Google Drive.</p>

      <div className="login-modal-illustration">
        <Cloud size={38} style={{ color: 'var(--accent-primary, #e85d4a)' }} />
      </div>

      <ul className="login-modal-perms">
        <li><span className="perm-check">✅</span> Create and manage files in a hidden app folder</li>
        <li><span className="perm-cross">❌</span> We do NOT access your photos, documents, or spreadsheets</li>
        <li><span className="perm-cross">❌</span> We do NOT share your data with third parties</li>
      </ul>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={handleConfirmAuthorize} className="login-drive-btn" style={{ justifyContent: 'center' }}>
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
```

And add CSS:

```css
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
  font-size: 1.4rem; font-weight: 800; color: var(--md-bw-on-surface, #222); margin: 0;
}
.login-modal-desc {
  font-size: 0.92rem; color: var(--md-bw-on-surface-variant, #666); margin: 0; line-height: 1.5;
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
  font-size: 0.88rem; color: var(--md-bw-on-surface-variant, #666); line-height: 1.4;
}
.perm-check { font-size: 1rem; }
.perm-cross { font-size: 1rem; }
.login-learn-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 12px; border-radius: 12px; cursor: pointer;
  background: transparent; border: 1px solid var(--glass-border, rgba(255,255,255,0.55));
  color: var(--md-bw-on-surface-variant, #666);
  font: 600 0.9rem var(--font-sans, 'Roboto', sans-serif); transition: background 0.2s;
}
.login-learn-btn:hover { background: var(--glass-bg, rgba(0,0,0,0.03)); }
.login-modal-accordion {
  padding: 16px; background: var(--bg-primary, #f5f5f7);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.55)); border-radius: 12px;
  animation: loginExpandDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.login-modal-accordion h4 { margin: 0 0 6px; font-size: 0.85rem; font-weight: 700; color: var(--md-bw-on-surface, #222); }
.login-modal-accordion p { margin: 0; font-size: 0.8rem; color: var(--md-bw-on-surface-variant, #666); line-height: 1.45; }
.login-modal-footer {
  font-size: 0.72rem; color: var(--md-bw-on-surface-variant, #999); text-align: center;
  border-top: 1px solid var(--glass-border, rgba(255,255,255,0.55)); padding-top: 16px;
}

@keyframes loginOverlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes loginModalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes loginExpandDown { from { opacity: 0; transform: translateY(-8px); max-height: 0; overflow: hidden; } to { opacity: 1; transform: translateY(0); max-height: 200px; } }
```

- [ ] **Step 2: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Login.jsx
git commit -m "login: add trust modal for Google Drive authorization"
```

---

### Task 6: Auth card footer + mobile breakpoints

**Files:**
- Modify: `src/components/Login.jsx`

- [ ] **Step 1: Add auth card footer with expandable accordion**

Inside the `.login-auth-card` div, after the closing `</div>` of the last tab content div, add:

```jsx
<div className="login-card-footer">
  <button className="login-footer-learn" onClick={() => setShowAccordion(prev => !prev)}>
    <HelpCircle size={14} />
    What is HR Pulse?
    {showAccordion ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
  </button>

  {showAccordion && (
    <div className="login-footer-accordion">
      HR Pulse is a private, offline-first HR management system. Your employee data, payroll, and attendance records are stored exclusively in a hidden folder inside <strong>your own Google Drive</strong> — we have zero access to your data.
    </div>
  )}

  <p className="login-footer-free">Free forever. No credit card required.</p>
</div>
```

And add CSS:

```css
.login-card-footer {
  margin-top: 28px; padding-top: 20px;
  border-top: 1px solid var(--glass-border, rgba(255,255,255,0.55));
  display: flex; flex-direction: column; gap: 12px; align-items: center;
}
.login-footer-learn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font: 500 0.82rem var(--font-sans, 'Roboto', sans-serif);
  color: var(--md-bw-on-surface-variant, #888); padding: 4px 8px;
  transition: color 0.2s;
}
.login-footer-learn:hover { color: var(--md-bw-on-surface, #222); }
.login-footer-accordion {
  padding: 14px 16px; background: var(--glass-bg, rgba(0,0,0,0.02));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.55)); border-radius: 12px;
  font-size: 0.8rem; color: var(--md-bw-on-surface-variant, #666); line-height: 1.5;
  text-align: center;
  animation: loginExpandDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.login-footer-free {
  margin: 0; font-size: 0.75rem; color: var(--md-bw-on-surface-variant, #999);
  text-align: center;
}
```

- [ ] **Step 2: Add mobile breakpoint CSS**

Before the closing `</style>` tag, add:

```css
@media (max-width: 768px) {
  .login-split { flex-direction: column; }
  .login-brand { padding: 20px; min-height: auto; justify-content: flex-start; }
  .login-brand-header { position: static; margin-bottom: 16px; }
  .login-brand-center { display: none; }
  .login-brand-graphic { display: none; }
  .login-auth { padding: 24px; align-items: flex-start; }
  .login-auth-card { padding: 24px; }
}
```

- [ ] **Step 3: Build and verify**

Run: `node_modules\.bin\vite.cmd build 2>&1`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/Login.jsx
git commit -m "login: add auth card footer, expandable accordion, mobile breakpoints"
```

---

### Task 7: Final build verification + polish

**Files:**
- Verify: `src/components/Login.jsx` (full file correctness)
- Verify: `src/App.jsx` (no leftover EmployeeLogin references)
- Verify: `node_modules\.bin\vite.cmd build 2>&1`

- [ ] **Step 1: Run production build**

```bash
node_modules\.bin\vite.cmd build 2>&1
```

Expected: builds successfully with no errors

- [ ] **Step 2: Check App.jsx for stale imports**

Run: `Select-String -Pattern "EmployeeLogin" src/App.jsx`
Expected: no matches (EmployeeLogin import and usage were removed)

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "login: final build verification and polish"
```
