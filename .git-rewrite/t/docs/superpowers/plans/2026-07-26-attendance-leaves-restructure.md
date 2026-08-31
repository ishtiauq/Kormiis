# Attendance & Leaves Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the monolithic 883-line Attendance.jsx into focused hooks + extracted components with no change to UI or behavior.

**Architecture:** Utility functions move to `src/services/attendance.js`; per-domain logic moves to `src/hooks/use*.js`; each admin sub-component extracts to `src/components/attendance/*.jsx`; the original `Attendance.jsx` becomes a thin wrapper.

**Tech Stack:** React (no router), lucide-react, no TypeScript

## Global Constraints

- Zero UI/UX change — all extracted components must look and behave identical to current rendering
- Data model shapes must remain exactly as they are (dailyLogs, leaves, balances, roster, shiftSwaps, overtimeClaims)
- All state stays in App.jsx; hooks receive setters as parameters (same as current `handleSetAttendance` pattern)
- `vite build` must pass clean at every task boundary
- LSP diagnostics must be clean on all changed files

---

### Task 1: Create `src/services/attendance.js`

**Files:**
- Create: `src/services/attendance.js`

**Interfaces:**
- Consumes: nothing
- Produces: utility functions consumed by all hooks and components

- [ ] **Step 1: Create the file** with all utility functions moved from `src/components/Attendance.jsx`

```js
const z = (v) => v < 10 ? `0${v}` : `${v}`

export const toLocal = (d) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`

export const getMon = (offset) => {
  const n = new Date()
  const d = n.getDay()
  const mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - d + (d === 0 ? -6 : 1) + offset * 7)
  return toLocal(mon)
}

export const addDays = (s, n) => {
  const d = new Date(s + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toLocal(d)
}

export const parseMin = (t) => {
  if (!t || t === '--') return null
  const s = t.trim().toUpperCase()
  const pm = s.includes('PM')
  const am = s.includes('AM')
  const p = s.replace(/\s*(AM|PM)\s*/, '').split(':')
  const h = parseInt(p[0], 10)
  const m = parseInt(p[1], 10) || 0
  if (isNaN(h)) return null
  let h24 = h
  if (pm && h !== 12) h24 = h + 12
  if (am && h === 12) h24 = 0
  return h24 * 60 + m
}

export const fmtH = (m) => m === null ? '0.0' : (m / 60).toFixed(1)

export const PILL_STYLES = {
  Present: { bg: '#28a745', color: '#fff' },
  Absent: { bg: '#dc3545', color: '#fff' },
  'On Leave': { bg: '#ffc107', color: '#121212' },
  WFH: { bg: '#007aff', color: '#fff' },
}

export const tabChip = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: '100px',
  border: isActive ? 'none' : '1px solid var(--glass-border)',
  background: isActive ? 'linear-gradient(135deg, #0062E6 0%, #003A8C 100%)' : 'rgba(0,0,0,0.05)',
  color: isActive ? '#fff' : 'var(--md-bw-on-surface-variant)',
  cursor: 'pointer', font: "500 13px 'Roboto'",
  transition: 'all 0.2s ease', outline: 'none', minHeight: '32px'
})

export const pill = (bg, color) => ({
  height: '24px', padding: '0 10px', fontSize: '11px', fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', borderRadius: '20px',
  backgroundColor: bg, color, letterSpacing: '0.03em', whiteSpace: 'nowrap'
})

export const selStyle = {
  padding: '0 28px 0 12px', height: '32px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
  border: '1px solid var(--glass-border)', outline: 'none', cursor: 'pointer',
  appearance: 'none', background: 'var(--glass-bg)', color: 'var(--md-bw-on-surface)',
}

export const cell = { padding: '0 16px' }

export const thStyle = { padding: '0 16px', height: '48px', textAlign: 'left', borderBottom: '1.5px solid var(--glass-border)', textTransform: 'uppercase', fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em', color: 'var(--md-bw-on-surface)', whiteSpace: 'nowrap' }
```

- [ ] **Step 2: Run LSP diagnostics** to verify no errors

```bash
npx eslint src/services/attendance.js || true
```

---

### Task 2: Create all 5 hooks

**Files:**
- Create: `src/hooks/useAttendanceLogs.js`
- Create: `src/hooks/useLeaves.js`
- Create: `src/hooks/useRoster.js`
- Create: `src/hooks/useShiftSwaps.js`
- Create: `src/hooks/useOvertime.js`

**Interfaces:**
- Consumes: `attendance`/`roster`/`shiftTemplates`/`overtimeClaims` state objects, state setter functions, `addToast`
- Produces: Data + handlers consumed by extracted components

#### useAttendanceLogs.js

```js
import { useState, useEffect, useCallback } from 'react'
import { toLocal, parseMin, fmtH } from '../services/attendance.js'

export function useAttendanceLogs(attendance, setAttendance, addToast) {
  const [selectedDate, setSelectedDate] = useState(() => toLocal(new Date()))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [openStatusEmp, setOpenStatusEmp] = useState(null)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  const closeAll = useCallback(() => { setShowDatePicker(false); setOpenStatusEmp(null) }, [])

  useEffect(() => {
    if (!showDatePicker && openStatusEmp === null) return
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [showDatePicker, openStatusEmp, closeAll])

  const logs = attendance?.dailyLogs?.[selectedDate] || {}

  const setLog = (empId, upd) => {
    const cur = logs[empId] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
    const next = { ...cur, ...upd }
    if (next.checkIn !== '--' && next.checkOut !== '--') {
      const a = parseMin(next.checkIn), b = parseMin(next.checkOut)
      if (a !== null && b !== null) {
        let d = b - a; if (d < 0) d += 1440
        next.hours = fmtH(d)
        if (cur.status === 'Absent' || cur.status === '--') next.status = 'Present'
      }
    }
    setAttendance(prev => ({ ...prev, dailyLogs: { ...prev.dailyLogs, [selectedDate]: { ...logs, [empId]: next } } }))
  }

  const markAll = () => {
    // Depends on employees — passed as param or imported. Will be passed via component.
  }

  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calFirstDow = new Date(calYear, calMonth, 1).getDay()
  const calGrid = []
  for (let i = 0; i < calFirstDow; i++) calGrid.push(null)
  for (let d = 1; d <= calDaysInMonth; d++) calGrid.push(d)
  while (calGrid.length % 7 !== 0) calGrid.push(null)

  const selNum = parseInt(selectedDate.split('-')[2], 10)
  const selMonth = parseInt(selectedDate.split('-')[1], 10) - 1
  const selYear = parseInt(selectedDate.split('-')[0], 10)

  return {
    selectedDate, setSelectedDate, showDatePicker, setShowDatePicker,
    calYear, setCalYear, calMonth, setCalMonth,
    logs, setLog, markAll, openStatusEmp, setOpenStatusEmp,
    calDaysInMonth, calFirstDow, calGrid, selNum, selMonth, selYear,
    closeAll
  }
}
```

#### useLeaves.js

```js
import { useState } from 'react'

export function useLeaves(attendance, setAttendance, addToast) {
  const leaves = attendance.leaves || []
  const balances = attendance.balances || {}
  const pendingLeaves = leaves.filter(l => l.status === 'Pending')
  const historyLeaves = leaves.filter(l => l.status !== 'Pending')

  const approveLeave = (id) => {
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Approved' } : l) }))
    addToast('Leave request approved.', 'success')
  }

  const rejectLeave = (id) => {
    setAttendance(prev => ({ ...prev, leaves: (prev.leaves || []).map(l => l.id === id ? { ...l, status: 'Rejected' } : l) }))
    addToast('Leave request rejected.', 'info')
  }

  return { leaves, pendingLeaves, historyLeaves, balances, approveLeave, rejectLeave, pendingCount: pendingLeaves.length }
}
```

#### useRoster.js

```js
import { useState, useEffect, useCallback } from 'react'
import { getMon, addDays } from '../services/attendance.js'

export function useRoster(roster, setRoster, shiftTemplates, employees) {
  const [weekStart, setWeekStart] = useState(() => getMon(0))
  const [openRosterEmp, setOpenRosterEmp] = useState(null)
  const [openRosterDate, setOpenRosterDate] = useState(null)

  const closeAll = useCallback(() => { setOpenRosterEmp(null); setOpenRosterDate(null) }, [])

  useEffect(() => {
    if (openRosterEmp === null) return
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [openRosterEmp, closeAll])

  const goBack = () => setWeekStart(addDays(weekStart, -7))
  const goNext = () => setWeekStart(addDays(weekStart, 7))

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // assign and copyPrevWeek need addToast — passed at call site
  const assign = (empId, dateStr, templateId) => {
    setRoster(prev => [...prev.filter(r => !(r.employeeId === empId && r.date === dateStr)), { employeeId: empId, date: dateStr, templateId }])
  }

  const copyPrevWeek = () => {
    const prevStart = addDays(weekStart, -7)
    const prevDates = Array.from({ length: 7 }, (_, i) => addDays(prevStart, i))
    const curSet = new Set(weekDates)
    const entries = []
    employees.forEach(emp => {
      for (let i = 0; i < 7; i++) {
        const p = (roster || []).find(r => r.employeeId === emp.id && r.date === prevDates[i])
        if (p) entries.push({ employeeId: emp.id, date: weekDates[i], templateId: p.templateId })
      }
    })
    return { entries, curSet } // caller handles setRoster + toast
  }

  return {
    weekStart, setWeekStart,
    weekDates, labels, assign, copyPrevWeek, goBack, goNext,
    openRosterEmp, setOpenRosterEmp, openRosterDate, setOpenRosterDate,
    closeAll
  }
}
```

#### useShiftSwaps.js

```js
import { useState } from 'react'

export function useShiftSwaps(shiftSwaps, setShiftSwaps, roster, setRoster, addToast) {
  const pendingSwaps = (shiftSwaps || []).filter(s => s.status === 'Pending')

  const approveSwap = (id) => {
    const swap = (shiftSwaps || []).find(s => s.id === id)
    if (!swap) return
    setRoster(prev => {
      const nr = [...prev]
      const ri = nr.findIndex(r => r.employeeId === swap.requesterId && r.date === swap.date)
      const ti = nr.findIndex(r => r.employeeId === swap.targetId && r.date === swap.date)
      const rs = ri >= 0 ? nr[ri].templateId : 'Off'
      const ts = ti >= 0 ? nr[ti].templateId : 'Off'
      if (ri >= 0) nr[ri].templateId = ts; else nr.push({ employeeId: swap.requesterId, date: swap.date, templateId: ts })
      if (ti >= 0) nr[ti].templateId = rs; else nr.push({ employeeId: swap.targetId, date: swap.date, templateId: rs })
      return nr
    })
    setShiftSwaps(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved' } : s))
    addToast('Shift swap approved and applied.', 'success')
  }

  const rejectSwap = (id) => {
    setShiftSwaps(prev => prev.map(s => s.id === id ? { ...s, status: 'Rejected' } : s))
    addToast('Shift swap rejected.', 'info')
  }

  return { pendingSwaps, approveSwap, rejectSwap }
}
```

#### useOvertime.js

```js
export function useOvertime(overtimeClaims, setOvertimeClaims, addToast) {
  const pendingOvertime = (overtimeClaims || []).filter(c => c.status === 'Pending')
  const historyOvertime = (overtimeClaims || []).filter(c => c.status !== 'Pending')

  const approveOvertime = (id) => {
    setOvertimeClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'Approved' } : c))
    addToast('Overtime claim approved.', 'success')
  }

  const rejectOvertime = (id) => {
    setOvertimeClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'Rejected' } : c))
    addToast('Overtime claim rejected.', 'info')
  }

  return { pendingOvertime, historyOvertime, approveOvertime, rejectOvertime }
}
```

- [ ] **Step 1: Create `src/hooks/useAttendanceLogs.js`**
- [ ] **Step 2: Create `src/hooks/useLeaves.js`**
- [ ] **Step 3: Create `src/hooks/useRoster.js`**
- [ ] **Step 4: Create `src/hooks/useShiftSwaps.js`**
- [ ] **Step 5: Create `src/hooks/useOvertime.js`**
- [ ] **Step 6: Run `vite build` to confirm compiles clean**

---

### Task 3: Create admin sub-components

**Files:**
- Create: `src/components/attendance/` directory
- Create: `src/components/attendance/ClockWidget.jsx`
- Create: `src/components/attendance/DailyLogs.jsx`
- Create: `src/components/attendance/LeaveRequests.jsx`
- Create: `src/components/attendance/LeaveBalanceCard.jsx`
- Create: `src/components/attendance/RosterPlanner.jsx`
- Create: `src/components/attendance/ShiftSwaps.jsx`
- Create: `src/components/attendance/OvertimeClaims.jsx`

**Interfaces:**
- Consumes: hook return values + employees/addToast/addLog etc.
- Produces: standalone components rendered by AttendancePage

Each component is a direct extraction of the existing sub-component function from Attendance.jsx, with imports updated to use the new services/hooks. The function signatures change from taking raw state+setters to taking hook return values.

#### ClockWidget.jsx
Extract the existing `function ClockWidget({ employees, attendance, setAttendance, addToast })` one-to-one.
- Only change: import `{ toLocal, parseMin, fmtH }` from `../services/attendance.js` instead of using the file-scoped constants.

#### DailyLogs.jsx
Extract `function DailyAttendance({ employees, attendance, setAttendance, addToast })` one-to-one.
- State management (selectedDate, showDatePicker, openStatusEmp, calYear, calMonth) stays local via `useAttendanceLogs` hook.
- Imports `{ toLocal, parseMin, fmtH, PILL_STYLES, cell, thStyle, pill }` from `../services/attendance.js`
- Imports `{ formatDateShort }` from `../../services/date.js`
- Accepts `{ employees, attendance, setAttendance, addToast }` and internally calls `useAttendanceLogs`

#### LeaveRequests.jsx
Extract `function LeaveRequests({ employees, attendance, setAttendance, addToast })` one-to-one.
- Uses `useLeaves` hook internally.
- Imports `{ cell, thStyle, pill, formatDateShort }`
- Imports `{ Check, X, CalendarDays }` from lucide-react
- Shows pending + history sections, same approve/reject buttons.

#### LeaveBalanceCard.jsx (NEW)
- Shows a table of each employee's leave balances (Sick, Casual, Annual: used/limit).
- Props: `{ employees, balances }`
- Uses the same glass-card styling as other components.
- Simple stateless component.

```jsx
export default function LeaveBalanceCard({ employees, balances }) {
  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 className="title-medium" style={{ margin: 0, color: 'var(--md-bw-on-surface)' }}>Leave Balances</h3>
      <div className="payroll-table-header-wrap">
        <table className="payroll-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1.5px solid var(--glass-border)', fontWeight: 600, fontSize: '12px', color: 'var(--md-bw-on-surface-variant)', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1.5px solid var(--glass-border)', fontWeight: 600, fontSize: '12px', color: 'var(--md-bw-on-surface-variant)', textTransform: 'uppercase' }}>Sick</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1.5px solid var(--glass-border)', fontWeight: 600, fontSize: '12px', color: 'var(--md-bw-on-surface-variant)', textTransform: 'uppercase' }}>Casual</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1.5px solid var(--glass-border)', fontWeight: 600, fontSize: '12px', color: 'var(--md-bw-on-surface-variant)', textTransform: 'uppercase' }}>Annual</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const b = balances[emp.id] || {}
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--md-bw-on-surface)', fontWeight: 500, fontSize: '13px' }}>{emp.name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--md-bw-on-surface-variant)' }}>{b.sick?.used || 0}/{b.sick?.limit || 14}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--md-bw-on-surface-variant)' }}>{b.casual?.used || 0}/{b.casual?.limit || 10}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--md-bw-on-surface-variant)' }}>{b.annual?.used || 0}/{b.annual?.limit || 20}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

#### RosterPlanner.jsx
Extract `function RosterPlanner({ employees, roster, setRoster, shiftTemplates, addToast })` one-to-one.
- Uses `useRoster` hook internally.
- `assign` now calls a wrapper that also checks rest hours (8h gap validation) before calling the hook's `assign`.
- `copyPrevWeek` logic stays: calls hook's `copyPrevWeek`, then does setRoster + addToast.

#### ShiftSwaps.jsx
Extract `function ShiftSwaps({ employees, shiftSwaps, setShiftSwaps, roster, setRoster, addToast })` one-to-one.
- Uses `useShiftSwaps` hook internally.

#### OvertimeClaims.jsx
Extract `function OvertimeClaims({ employees, overtimeClaims, setOvertimeClaims, addToast })` one-to-one.
- Uses `useOvertime` hook internally.

- [ ] **Step 1: Create `src/components/attendance/` directory**
- [ ] **Step 2: Create ClockWidget.jsx** — extract from Attendance.jsx lines 101-231
- [ ] **Step 3: Create DailyLogs.jsx** — extract from Attendance.jsx lines 233-448
- [ ] **Step 4: Create LeaveRequests.jsx** — extract from Attendance.jsx lines 451-557
- [ ] **Step 5: Create LeaveBalanceCard.jsx** — new component
- [ ] **Step 6: Create RosterPlanner.jsx** — extract from Attendance.jsx lines 559-732
- [ ] **Step 7: Create ShiftSwaps.jsx** — extract from Attendance.jsx lines 734-791
- [ ] **Step 8: Create OvertimeClaims.jsx** — extract from Attendance.jsx lines 793-883
- [ ] **Step 9: Run `vite build` to confirm compiles clean**

---

### Task 4: Create AttendancePage.jsx and rewrite Attendance.jsx

**Files:**
- Create: `src/components/attendance/AttendancePage.jsx`
- Modify: `src/components/Attendance.jsx` — complete rewrite

**Interfaces:**
- AttendancePage renders the tab structure + all sub-components
- Attendance.jsx re-exports AttendancePage with same props

#### AttendancePage.jsx

```jsx
import { useState } from 'react'
import { Clock, CalendarDays, ArrowUpDown, Cpu } from 'lucide-react'
import { tabChip } from '../services/attendance.js'
import ClockWidget from './ClockWidget.jsx'
import DailyLogs from './DailyLogs.jsx'
import LeaveRequests from './LeaveRequests.jsx'
import LeaveBalanceCard from './LeaveBalanceCard.jsx'
import RosterPlanner from './RosterPlanner.jsx'
import ShiftSwaps from './ShiftSwaps.jsx'
import OvertimeClaims from './OvertimeClaims.jsx'

export default function AttendancePage({ employees, attendance, setAttendance, roster, setRoster, shiftSwaps, setShiftSwaps, shiftTemplates, overtimeClaims, setOvertimeClaims, addLog, addToast, addNotification, simulatedRole, addAuditLog }) {
  const [tab, setTab] = useState('daily')
  const tabs = [
    { id: 'daily', label: 'Daily Logs', icon: Clock },
    { id: 'leave', label: 'Leave Requests', icon: CalendarDays },
    { id: 'roster', label: 'Roster', icon: ArrowUpDown },
    { id: 'overtime', label: 'Overtime', icon: Cpu },
  ]
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 className="headline-small" style={{ margin: 0, color: 'var(--md-bw-on-surface)' }}>Attendance & Leaves</h1>
      <ClockWidget employees={employees} attendance={attendance} setAttendance={setAttendance} addToast={addToast} />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={tabChip(tab === t.id)}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>
      {tab === 'daily' && <DailyLogs employees={employees} attendance={attendance} setAttendance={setAttendance} addToast={addToast} />}
      {tab === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <LeaveRequests employees={employees} attendance={attendance} setAttendance={setAttendance} addToast={addToast} />
          <LeaveBalanceCard employees={employees} balances={attendance.balances || {}} />
        </div>
      )}
      {tab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RosterPlanner employees={employees} roster={roster} setRoster={setRoster} shiftTemplates={shiftTemplates} addToast={addToast} />
          <ShiftSwaps employees={employees} shiftSwaps={shiftSwaps} setShiftSwaps={setShiftSwaps} roster={roster} setRoster={setRoster} addToast={addToast} />
        </div>
      )}
      {tab === 'overtime' && <OvertimeClaims employees={employees} overtimeClaims={overtimeClaims} setOvertimeClaims={setOvertimeClaims} addToast={addToast} />}
    </div>
  )
}
```

#### Attendance.jsx rewrite
Replace the entire file content with:

```jsx
import AttendancePage from './attendance/AttendancePage.jsx'
export default AttendancePage
```

This preserves the import path `from './components/Attendance.jsx'` used in App.jsx.

- [ ] **Step 1: Create `src/components/attendance/AttendancePage.jsx`** with the tab structure
- [ ] **Step 2: Rewrite `src/components/Attendance.jsx`** to re-export AttendancePage
- [ ] **Step 3: Run `vite build`** to confirm compiles clean

---

### Task 5: Update EmployeePortal.jsx to use shared hooks (optional refinement)

**Files:**
- Modify: `src/components/EmployeePortal.jsx`

**Changes:**
- `AttendanceView` (line 392) currently has inline roster/swap/overtime logic. Optionally import `useRoster`, `useShiftSwaps`, `useOvertime` hooks to share logic with admin.
- `LeaveView` (line 620) can optionally import `useLeaves` for leave data.
- These are optional refinements — the existing inline logic already works. Only do if the refactoring is clean.

- [ ] **Step 1: Evaluate** if AttendanceView/LeaveView can cleanly use shared hooks
- [ ] **Step 2: Apply** hook imports if clean (no required UI changes)

---

### Task 6: Final verification

- [ ] **Step 1: Run `vite build`** — must pass with exit code 0
- [ ] **Step 2: Run LSP diagnostics** on all changed files

```bash
npx eslint src/services/attendance.js src/hooks/*.js src/components/attendance/*.jsx src/components/Attendance.jsx || true
```

- [ ] **Step 3: Manual smoke test** — load the app, navigate to Attendance & Leaves, verify:
  - Clock widget renders and shows current time
  - Daily logs tab shows employee table with check-in/out inputs
  - Leave Requests tab shows pending requests with approve/reject
  - Leave balances table appears under Leave Requests
  - Roster tab shows weekly planner
  - Overtime tab shows claims
  - Tabs switch correctly
