# Attendance & Leaves Restructure

> **Date**: 2026-07-26
> **Status**: Draft
> **Goal**: Decompose the monolithic 883-line Attendance.jsx into focused hooks + components, unify HR admin and employee portal under shared logic, add leave balance visibility for admin.

## Architecture

### Hooks-driven separation

Each domain gets its own hook file under `src/hooks/`. Hooks receive their state setter from App.jsx (preserving Google Drive sync) and return `{ data, handlers }`.

```
src/
  hooks/
    useAttendanceLogs.js   — daily check-in/out, status management
    useLeaves.js           — leave CRUD, leave balances
    useRoster.js           — roster planning
    useShiftSwaps.js       — shift swap requests & approval
    useOvertime.js         — overtime claims & approval
  services/
    attendance.js          — utility functions (parseMin, fmtH, toLocal, getMon, addDays, helpers now in Attendance.jsx)
  components/
    attendance/
      AttendancePage.jsx   — top-level admin Attendance page (tabs, layout)
      ClockWidget.jsx      — admin ClockWidget (employee selector, check-in/out)
      DailyLogs.jsx        — admin daily attendance table (date picker, per-employee logs)
      LeaveRequests.jsx    — admin pending + history leave table with approve/reject
      LeaveBalanceCard.jsx — NEW: per-employee leave balance summary (admin view)
      RosterPlanner.jsx    — weekly roster table with shift assignment
      ShiftSwaps.jsx       — pending shift swaps with approve/reject
      OvertimeClaims.jsx   — pending overtime with approve/reject
```

**Employee portal** imports the same hooks but renders its own thin `AttendanceView` and `LeaveView` components (still inside EmployeePortal.jsx or extracted — to be decided during implementation).

### Data Model (unchanged)

The attendance data model stays identical to preserve localStorage and Drive data:

```js
attendance = {
  dailyLogs: { 'YYYY-MM-DD': { 'EMP-101': { checkIn, checkOut, hours, status } } },
  leaves: [{ id, employeeId, leaveType, startDate, endDate, days, reason, receipt, receiptName, status }],
  balances: { 'EMP-101': { sick: { used, limit }, casual: { used, limit }, annual: { used, limit } } }
}
roster = [{ employeeId, date, templateId }]
shiftSwaps = [{ id, requesterId, targetId, date, reason, status }]
overtimeClaims = [{ id, employeeId, date, hours, reason, status }]
shiftTemplates = [{ id, name, start, end, break, color }]  // from settings
```

### Hook APIs

Each hook receives the state setter from App.jsx (`handleSetAttendance`, `setRoster`, `setShiftSwaps`, `setOvertimeClaims`) and returns data + action handlers.

| Hook | State it consumes | State it sets | Returns |
|---|---|---|---|
| `useAttendanceLogs(attendance, setAttendance, addToast)` | `attendance.dailyLogs` | via `setAttendance` | `{ logs, setLog, markAll, selectedDate, setSelectedDate, showDatePicker, setShowDatePicker, ... }` |
| `useLeaves(attendance, setAttendance, employees, addToast)` | `attendance.leaves`, `attendance.balances` | via `setAttendance` | `{ leaves, pendingLeaves, historyLeaves, balances, approveLeave, rejectLeave, pendingCount }` |
| `useRoster(roster, setRoster, shiftTemplates, employees, weekStart, setWeekStart)` | `roster` | via `setRoster` | `{ weekDates, assign, copyPrevWeek, goBack, goNext, openRosterEmp, setOpenRosterEmp, ... }` |
| `useShiftSwaps(shiftSwaps, setShiftSwaps, roster, setRoster, addToast)` | `shiftSwaps`, `roster` | via `setShiftSwaps`, `setRoster` | `{ pendingSwaps, approveSwap, rejectSwap }` |
| `useOvertime(overtimeClaims, setOvertimeClaims, addToast)` | `overtimeClaims` | via `setOvertimeClaims` | `{ pendingOvertime, historyOvertime, approveOvertime, rejectOvertime }` |

### Component breakdown

#### AttendancePage.jsx (admin)
Same tab structure as current Attendance.jsx with tabs: Daily Logs, Leave Requests, Roster, Overtime. Renders sub-components.

#### ClockWidget.jsx (admin)
Same UI — live clock, employee selector dropdown, Check In / Check Out buttons, current status display. No changes.

#### DailyLogs.jsx (admin)
Same UI — date picker with custom calendar, employee rows with in/out inputs, clickable status pill with dropdown, Mark All Present, Save button. Extracted one-to-one.

#### LeaveRequests.jsx (admin)
Same UI — pending section with approve/reject, history section. Extracted one-to-one.
**New**: Shows leave balance summary per employee (or in a section). Balances come from `attendance.balances`.

#### LeaveBalanceCard.jsx (admin, NEW)
A card or table section showing each employee's leave balances (Sick used/limit, Casual used/limit, Annual used/limit). Displayed within the Leave Requests tab.

#### RosterPlanner.jsx (admin)
Same weekly table UI with shift assignment dropdowns, Copy Prev Week, navigation arrows. Extracted one-to-one.

#### ShiftSwaps.jsx (admin)
Same pending swaps with approve/reject. Extracted one-to-one.

#### OvertimeClaims.jsx (admin)
Same pending claims with approve/reject + history. Extracted one-to-one.

#### EmployeePortal views
The existing `AttendanceView` and `LeaveView` inside EmployeePortal.jsx remain but can optionally import hooks like `useLeaves` and `useAttendanceLogs` for the employee-side check-in and leave application flow. Their UIs stay the same.

### services/attendance.js
Moves utility functions out of Attendance.jsx into a shared service:
- `parseMin(t)` — parse "09:00 AM" → minutes
- `fmtH(m)` — minutes → "9.0" hours string
- `toLocal(d)` — Date → "YYYY-MM-DD"
- `getMon(offset)` — get Monday of week
- `addDays(s, n)` — date string + days
- `z(v)` — zero-pad
- `PILL_STYLES`, `tabChip`, `pill`, `selStyle` — style constants

## Error Handling
- All hooks pass through existing addToast for feedback
- No new error states — existing UI patterns (empty state illustrations, inline feedback) reused

## Testing
- No formal test framework exists in the project — manual verification after implementation
- Build must pass clean (`vite build`)
- LSP diagnostics clean on all changed files

## What stays the same
- All data model shapes
- All state in App.jsx with Google Drive sync via handleSetAttendance
- FileId tracking, bgSyncCallback, and table sync patterns
- All UI styling (glass cards, color schemes, layouts)
- Employee portal integration (prop passing to EmployeePortal)
