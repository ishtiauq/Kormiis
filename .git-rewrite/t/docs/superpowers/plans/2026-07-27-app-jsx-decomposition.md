# App.jsx Decomposition Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Decompose the 2168-line `App.jsx` into focused hooks, utilities, and layout components, reducing App.jsx to ~200 lines.

**Architecture:** Extract independent responsibilities into custom hooks (auth, theme, data state), move utility functions to a helpers file, and split the monolithic JSX return into dedicated layout components (Sidebar, Topbar, CommandPalette, ToastContainer). App.jsx becomes a thin orchestrator that wires hooks to layout components.

**Tech Stack:** React 19, custom hooks (no external state library), existing CSS classes

**Plan phases:**
1. Extract utilities + hooks
2. Extract layout UI components
3. Compose and clean up App.jsx

---

## File Map

### New files:
- `src/utils/helpers.js` — `timestampArrayChanges`, `allNavItems`
- `src/hooks/useTheme.js` — theme state + effect
- `src/hooks/useAuth.js` — user login/logout + sessionStorage
- `src/hooks/useToast.js` — toast state + addToast/removeToast
- `src/hooks/useCommandPalette.js` — command palette state + logic
- `src/hooks/useDataState.js` — all data states + handle setters (employees, payroll, attendance, etc.)
- `src/components/layout/Sidebar.jsx` — sidebar with nav, collapse, role, user, logout
- `src/components/layout/Topbar.jsx` — topbar with sync, theme, notifications
- `src/components/layout/CommandPalette.jsx` — command palette component
- `src/components/layout/ToastContainer.jsx` — toast notifications

### Modified files:
- `src/App.jsx` — reduced to ~200 lines, imports hooks + layout components

---

### Task 1: Extract helpers

**Files:**
- Create: `src/utils/helpers.js`
- Modify: `src/App.jsx` (remove lines 23-88)

**Interfaces:**
- Consumes: nothing
- Produces: `timestampArrayChanges(prev, next)` → array, `allNavItems` (array of nav item objects), `EMPLOYEES_STORAGE_KEY` constant

- [ ] **Step 1: Create `src/utils/helpers.js`**

```js
import { LayoutDashboard, Users, CreditCard, CalendarCheck, Receipt, Settings as SettingsIcon, HardDrive, FileText, Megaphone, CalendarDays, Monitor } from 'lucide-react'

import { createElement } from 'react'

export const EMPLOYEES_STORAGE_KEY = 'hr_pulse_employees'

export function timestampArrayChanges(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return next;
  const prevMap = new Map(prev.map(item => [item.id, item]));
  return next.map(item => {
    const prevItem = prevMap.get(item.id);
    if (!prevItem) {
      return { ...item, updated_at: new Date().toISOString() };
    }
    const cleanPrev = { ...prevItem, updated_at: undefined, _conflict: undefined };
    const cleanItem = { ...item, updated_at: undefined, _conflict: undefined };
    if (JSON.stringify(cleanPrev) !== JSON.stringify(cleanItem)) {
      return { ...item, updated_at: new Date().toISOString() };
    }
    return item;
  });
}

export const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: createElement(LayoutDashboard, { size: 18 }) },
  { id: 'announcements', label: 'Announcements', icon: createElement(Megaphone, { size: 18 }) },
  { id: 'calendar', label: 'Calendar', icon: createElement(CalendarDays, { size: 18 }) },
  { id: 'documents', label: 'Documents', icon: createElement(FileText, { size: 18 }) },
  { id: 'employees', label: 'Employees', icon: createElement(Users, { size: 18 }) },
  { id: 'payroll', label: 'Payroll', icon: createElement(CreditCard, { size: 18 }) },
  { id: 'attendance', label: 'Leaves & Attendance', icon: createElement(CalendarCheck, { size: 18 }) },
  { id: 'expenses', label: 'Expenses', icon: createElement(Receipt, { size: 18 }) },
  { id: 'assets', label: 'Assets', icon: createElement(Monitor, { size: 18 }) },
  { id: 'settings', label: 'Settings', icon: createElement(SettingsIcon, { size: 18 }) },
  { id: 'drive', label: 'Drive Sync', icon: createElement(Database, { size: 18 }) },
]
```

- [ ] **Step 2: Remove lines 23-88 from App.jsx**

Replace with:
```js
import { EMPLOYEES_STORAGE_KEY, timestampArrayChanges, allNavItems } from './utils/helpers.js'
```

- [ ] **Step 3: Verify build**

Run: `npx vite build` — expect: no errors

- [ ] **Step 4: Commit**

```bash
git add src/utils/helpers.js src/App.jsx
git commit -m "refactor: extract helpers + nav items to utils/helpers.js"
```

---

### Task 2: Merge crypto helpers into existing crypto.js

**Files:**
- Modify: `src/services/crypto.js` — add `deriveAesKey`, `encryptJson`, `decryptJson`
- Modify: `src/App.jsx` — remove lines 25-57, import from crypto.js

**Interfaces:**
- Consumes: nothing
- Produces: `deriveAesKey(material)`, `encryptJson(value, keyMaterial)`, `decryptJson(payload, keyMaterial)`

- [ ] **Step 1: Append crypto helpers to `src/services/crypto.js`**

```js
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export const deriveAesKey = async (material) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(material))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export const encryptJson = async (value, keyMaterial) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(keyMaterial)
  const plaintext = textEncoder.encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return JSON.stringify({
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext))
  })
}

export const decryptJson = async (payload, keyMaterial) => {
  const parsed = JSON.parse(payload)
  if (!parsed?.iv || !parsed?.data) return null
  const key = await deriveAesKey(keyMaterial)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
    key,
    fromBase64(parsed.data)
  )
  return JSON.parse(textDecoder.decode(new Uint8Array(decrypted)))
}
```

- [ ] **Step 2: Update App.jsx — replace lines 25-57 with import**

Remove lines 25-57 (textEncoder, textDecoder, toBase64, fromBase64, deriveAesKey, encryptJson, decryptJson). Update imports:
```js
import { encryptJson, decryptJson } from './services/crypto.js'
```

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 3: Extract useTheme hook

**Files:**
- Create: `src/hooks/useTheme.js`
- Modify: `src/App.jsx` (remove theme state + effects, use hook)

**Interfaces:**
- Consumes: nothing
- Produces: `{ themeMode, isDarkMode, toggleTheme }`

- [ ] **Step 1: Create `src/hooks/useTheme.js`**

```js
import { useState, useEffect } from 'react'

export function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('hr_pulse_theme') || 'system'
  })

  const isDarkMode = themeMode === 'system'
    ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    : themeMode === 'dark'

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'system') return 'light'
      if (prev === 'light') return 'dark'
      return 'system'
    })
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [isDarkMode])

  useEffect(() => {
    localStorage.setItem('hr_pulse_theme', themeMode)
  }, [themeMode])

  return { themeMode, isDarkMode, toggleTheme }
}
```

- [ ] **Step 2: Update App.jsx — remove lines 204-232, import useTheme**

Replace:
```js
const [themeMode, setThemeMode] = useState(...)
// ... theme effects (lines 204-232)
```
With:
```js
const { themeMode, isDarkMode, toggleTheme } = useTheme()
```

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 4: Extract useToast hook

**Files:**
- Create: `src/hooks/useToast.js`
- Modify: `src/App.jsx` (remove toast state + addToast/removeToast)

**Interfaces:**
- Consumes: nothing
- Produces: `{ toasts, addToast(message, type, action), removeToast(id) }`

- [ ] **Step 1: Create `src/hooks/useToast.js`**

```js
import { useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success', action = null) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-5), { id, message, type, action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}
```

- [ ] **Step 2: Update App.jsx — remove lines 176-187**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 5: Extract useAuth hook

**Files:**
- Create: `src/hooks/useAuth.js`
- Modify: `src/App.jsx` (remove user state + login/logout)

**Interfaces:**
- Consumes: nothing
- Produces: `{ user, setUser, handleLogin(userInfo), handleLogout() }`

- [ ] **Step 1: Create `src/hooks/useAuth.js`**

```js
import { useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hr_pulse_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    localStorage.setItem('hr_pulse_user', JSON.stringify(userInfo))
    if (!userInfo.isEmployee && userInfo.token) {
      sessionStorage.setItem('hr_pulse_hr_token', userInfo.token)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('hr_pulse_user')
    sessionStorage.removeItem('hr_pulse_hr_token')
  }

  return { user, setUser, handleLogin, handleLogout }
}
```

- [ ] **Step 2: Update App.jsx — remove user state (lines 91-94) + handleLogin (307-313) + handleLogout (315-322)**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 6: Extract useCommandPalette hook

**Files:**
- Create: `src/hooks/useCommandPalette.js`
- Modify: `src/App.jsx` (remove command palette state + getFilteredItems + selectPaletteItem + getCategoryIcon)

**Interfaces:**
- Consumes: `{ user, employees, recentActions, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId }`
- Produces: `{ showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem }`

This one has complex logic. Let me write the full hook.

- [ ] **Step 1: Create `src/hooks/useCommandPalette.js`**

```js
import { useState, useEffect } from 'react'
import { clearLocalCache } from '../services/db.js'
import { createBackup } from '../services/googleDrive.js'

export function useCommandPalette({ user, employees, recentActions, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId, hasPermission }) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)

  const getFilteredItems = () => {
    const query = commandSearch.toLowerCase().trim()
    const pages = [
      { id: 'page-dashboard', category: 'Pages', label: 'Go to Dashboard', action: () => setCurrentView('dashboard'), keywords: 'dashboard home main' },
      { id: 'page-employees', category: 'Pages', label: 'Go to Employees', action: () => setCurrentView('employees'), keywords: 'employees staff members directory profile' },
      { id: 'page-payroll', category: 'Pages', label: 'Go to Payroll', action: () => setCurrentView('payroll'), keywords: 'payroll salary pay compensation' },
      { id: 'page-attendance', category: 'Pages', label: 'Go to Attendance & Leaves', action: () => setCurrentView('attendance'), keywords: 'attendance leaves roster schedule timeoff vacation' },
      { id: 'page-announcements', category: 'Pages', label: 'Go to Announcements', action: () => setCurrentView('announcements'), keywords: 'announcements news posts updates' },
      { id: 'page-calendar', category: 'Pages', label: 'Go to Calendar', action: () => setCurrentView('calendar'), keywords: 'calendar events meetings holidays schedule' },
      { id: 'page-documents', category: 'Pages', label: 'Go to Documents', action: () => setCurrentView('documents'), keywords: 'documents files upload download manager' },
      { id: 'page-assets', category: 'Pages', label: 'Go to Assets', action: () => setCurrentView('assets'), keywords: 'assets inventory devices macbook laptop' },
      { id: 'page-expenses', category: 'Pages', label: 'Go to Expenses', action: () => setCurrentView('expenses'), keywords: 'expenses claims reimbursements money' },
      { id: 'page-settings', category: 'Pages', label: 'Go to Settings', action: () => setCurrentView('settings'), keywords: 'settings admin config role audit' },
      { id: 'page-drive', category: 'Pages', label: 'Go to Google Drive Sync', action: () => setCurrentView('drive'), keywords: 'drive sync backup restore cloud' }
    ]

    const recent = recentActions.map((act) => {
      let actionFn = () => {}
      if (act.type === 'page') {
        actionFn = () => setCurrentView(act.view)
      } else if (act.type === 'action') {
        if (act.id === 'action-darkmode') actionFn = toggleTheme
        else if (act.id === 'action-clearcache') actionFn = () => {
          clearLocalCache().then(() => window.location.reload())
        }
        else if (act.id === 'action-backup') actionFn = () => {
          if (user?.token) createBackup(user.token).then(() => addToast('Backup created', 'success'))
        }
      } else if (act.type === 'employee') {
        actionFn = () => {
          setSelectedEmployeeId(act.employeeId)
          setCurrentView('employees')
        }
      }
      return { ...act, category: 'Recent Actions', action: actionFn }
    })

    const emps = (employees || []).map(emp => ({
      id: `emp-${emp.id}`,
      category: 'Employees',
      label: `${emp.name} (${emp.role} - ${emp.department})`,
      employeeId: emp.id,
      action: () => {
        setSelectedEmployeeId(emp.id)
        setCurrentView('employees')
      },
      keywords: `${emp.name} ${emp.role} ${emp.department} ${emp.id}`
    }))

    const quickActions = [
      { id: 'action-darkmode', category: 'Actions', label: 'Toggle Theme', action: toggleTheme, keywords: 'dark light mode theme appearance toggle system' },
      { id: 'action-clearcache', category: 'Actions', label: 'Clear Local Cache & Resync', action: () => {
        clearLocalCache().then(() => window.location.reload())
      }, keywords: 'clear cache reset clean reload' },
      { id: 'action-backup', category: 'Actions', label: 'Trigger Drive Backup', action: () => {
        if (user?.token) {
          addToast('Creating backup...', 'info')
          createBackup(user.token).then(() => addToast('Backup created successfully', 'success'))
        } else {
          addToast('Drive connection required for backup', 'warning')
        }
      }, keywords: 'backup save snapshot archive drive' }
    ]

    if (!query) return [...pages, ...recent, ...emps.slice(0, 5)]

    const allItems = [...pages, ...quickActions, ...emps]
    return allItems.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(query)
      const matchKeywords = item.keywords ? item.keywords.toLowerCase().includes(query) : false
      return matchLabel || matchKeywords
    })
  }

  const filteredItems = getFilteredItems()

  const selectPaletteItem = (index) => {
    const selectedItem = filteredItems[index]
    if (selectedItem) {
      selectedItem.action()
      setShowCommandPalette(false)
      setCommandSearch('')
      setPaletteIndex(0)
    }
  }

  return {
    showCommandPalette, setShowCommandPalette,
    commandSearch, setCommandSearch,
    paletteIndex, setPaletteIndex,
    filteredItems, selectPaletteItem
  }
}
```

- [ ] **Step 2: Update App.jsx — replace command palette logic (lines 240-1594) with hook call**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 7: Extract Sidebar component

**Files:**
- Create: `src/components/layout/Sidebar.jsx`
- Modify: `src/App.jsx` (remove sidebar JSX lines 1604-1963)

**Interfaces:**
- Consumes: `{ visibleNavItems, isCollapsed, isDarkMode, currentView, setCurrentView, mobileMenuOpen, setMobileMenuOpen, toggleSidebar, user, simulatedRole, showRoleModal, setShowRoleModal, handleLogout }`
- Produces: `<Sidebar ... />`

- [ ] **Step 1: Create `src/components/layout/Sidebar.jsx`**

Copy the sidebar JSX from App.jsx (lines 1604-1963) into a proper component. Keep existing inline styles as-is (they'll be converted to Tailwind later). Import `TooltipPopover`.

```jsx
import TooltipPopover from '../TooltipPopover.jsx'

export default function Sidebar({
  visibleNavItems, isCollapsed, isDarkMode, currentView, setCurrentView,
  mobileMenuOpen, setMobileMenuOpen, toggleSidebar, user, simulatedRole,
  showRoleModal, setShowRoleModal, handleLogout
}) {
  // ... sidebar JSX
}
```

- [ ] **Step 2: Update App.jsx — replace sidebar JSX with `<Sidebar ... />`**

```jsx
<Sidebar
  visibleNavItems={visibleNavItems}
  isCollapsed={isCollapsed}
  isDarkMode={isDarkMode}
  currentView={currentView}
  setCurrentView={setCurrentView}
  mobileMenuOpen={mobileMenuOpen}
  setMobileMenuOpen={setMobileMenuOpen}
  toggleSidebar={toggleSidebar}
  user={user}
  simulatedRole={simulatedRole}
  showRoleModal={showRoleModal}
  setShowRoleModal={setShowRoleModal}
  handleLogout={handleLogout}
/>
```

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 8: Extract Topbar component

**Files:**
- Create: `src/components/layout/Topbar.jsx`
- Modify: `src/App.jsx` (remove topbar JSX lines 1968-2059)

**Interfaces:**
- Consumes: `{ isDarkMode, toggleSidebar, themeMode, toggleTheme, handleSync, isSyncing, driveConnected, syncConflicts, notifications, showNotifications, setShowNotifications, markNotificationsRead, unreadCount, mobileMenuOpen }`

- [ ] **Step 1: Create `src/components/layout/Topbar.jsx`**

- [ ] **Step 2: Update App.jsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 9: Extract ToastContainer component

**Files:**
- Create: `src/components/layout/ToastContainer.jsx`

**Interfaces:**
- Consumes: `{ toasts, removeToast }`

- [ ] **Step 1: Create `src/components/layout/ToastContainer.jsx`**

```jsx
export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="global-toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`global-toast ${toast.type}`}>
          <div className="global-toast-content">
            <span className="global-toast-type-dot" />
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.action && (
              <button className="global-toast-action"
                onClick={() => { toast.action.onClick(); removeToast(toast.id); }}>
                {toast.action.label}
              </button>
            )}
          </div>
          <div className="toast-progress">
            <div className="toast-progress-bar" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx — replace toast JSX**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 10: Extract CommandPalette component

**Files:**
- Create: `src/components/layout/CommandPalette.jsx`

**Interfaces:**
- Consumes: `{ showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem }`

- [ ] **Step 1: Create `src/components/layout/CommandPalette.jsx`**

Copy the command palette JSX from App.jsx (lines 2087-2166) into a proper component.

- [ ] **Step 2: Update App.jsx**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

---

### Task 11: Final App.jsx cleanup

**Files:**
- Modify: `src/App.jsx` — final pass to remove all extracted logic, ensure clean composition

**Expected App.jsx structure after all tasks:**

```jsx
import { useState, useEffect, useRef } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Employees from './components/Employees.jsx'
import DriveSync from './components/DriveSync.jsx'
import Login from './components/Login.jsx'
import Payroll from './components/Payroll.jsx'
import Settings from './components/Settings.jsx'
import Attendance from './components/Attendance.jsx'
import Expenses from './components/Expenses.jsx'
import Announcements from './components/Announcements.jsx'
import Assets from './components/Assets.jsx'
import Calendar from './components/Calendar.jsx'
import Documents from './components/Documents.jsx'
import EmployeePortal from './components/EmployeePortal.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import ToastContainer from './components/layout/ToastContainer.jsx'
import CommandPalette from './components/layout/CommandPalette.jsx'
import { readMeta, readTable, writeTable, flushPendingWrites, checkAndRunAutoBackup, createBackup } from './services/googleDrive.js'
import { clearLocalCache } from './services/db.js'
import { validateDatabase } from './services/validator.js'
import { encryptJson, decryptJson } from './services/crypto.js'
import { Search, User, History, Moon, Trash2, Sun, HardDrive, FileText, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react'
import { useModal } from './services/useModal.js'
import { useTheme } from './hooks/useTheme.js'
import { useToast } from './hooks/useToast.js'
import { useAuth } from './hooks/useAuth.js'
import { useCommandPalette } from './hooks/useCommandPalette.js'
import { EMPLOYEES_STORAGE_KEY, timestampArrayChanges, allNavItems } from './utils/helpers.js'

export default function App() {
  const { themeMode, isDarkMode, toggleTheme } = useTheme()
  const { user, setUser, handleLogin, handleLogout } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  // ... remaining state (currentView, sidebar, data, etc.)
  // ... remaining effects (drive sync, persistence, etc.)
  // ... handle setters

  const unreadCount = notifications.filter(n => !n.read).length

  if (!user) {
    return <Login onLogin={handleLogin} themeMode={themeMode} toggleTheme={toggleTheme} />
  }

  if (simulatedRole === 'Employee' || user.isEmployee) {
    return <EmployeePortal ... />
  }

  const visibleNavItems = allNavItems.filter(item => hasPermission(item.id))

  const { showCommandPalette, setShowCommandPalette, commandSearch, setCommandSearch, paletteIndex, setPaletteIndex, filteredItems, selectPaletteItem } = useCommandPalette({
    user, employees, recentActions, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId, hasPermission
  })

  return (
    <div className="dashboard-root app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', padding: '16px', gap: '16px', boxSizing: 'border-box' }}>
      {mobileMenuOpen && <div className="sidebar-overlay open" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar ... />
      <main className="content dashboard-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarGutter: 'stable' }}>
        <Topbar ... />
        {renderContent()}
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <CommandPalette ... />
    </div>
  )
}
```

- [ ] **Step 1: Remove all extracted sections from App.jsx**

- [ ] **Step 2: Ensure all prop passes are correct**

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Final commit**

---

## Execution choice

Once the plan is saved, two approaches:

1. **Subagent-Driven** — fresh subagent per task, review between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints
