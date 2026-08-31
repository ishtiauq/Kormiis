# Responsive Spacing Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix padding, spacing, and responsiveness across all components in the HR Pulse webapp — sidebar, all view pages, modals, buttons, cards, and forms.

**Architecture:** Convert hardcoded inline px spacing to Tailwind responsive utility classes (e.g., `p-4 md:p-6`). Use consistent spacing scale: `p-4` (mobile) → `p-6` (tablet) → `p-8` (desktop) for content areas, `gap-4` (mobile) → `gap-6` (tablet) → `gap-8` (desktop) for section gaps. Standardize card padding to `p-5` (small), `p-6` (medium), `p-8` (large/forms). Standardize button padding to `px-4 py-2 sm:px-5 sm:py-2.5`.

**Tech Stack:** React 19, Tailwind CSS v4, Vite

## Global Constraints

- Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) — no inline `isMobile` window-width checks
- Replace inline `padding: 'Xpx'` with Tailwind classes
- Keep existing CSS class names (`glass-card`, `macos-card`, etc.) — only change inline styles and Tailwind classes on elements
- Do not change functional/behavioral code — only spacing/styling
- Build must succeed after each task
- No new files — modify existing files only

---

### Task 1: App Shell + Sidebar + Topbar (Layout Foundation)

**Files:**
- Modify: `src/App.jsx:130` (root layout padding/gap)
- Modify: `src/components/layout/Sidebar.jsx` (header, nav items, footer spacing)
- Modify: `src/components/layout/Topbar.jsx` (toolbar spacing)
- Modify: `src/components/TooltipPopover.jsx` (tooltip inner spacing)

**Interfaces:**
- Consumes: existing layout structure
- Produces: responsive layout foundation that all view components build on

- [ ] **Step 1: Fix App.jsx root layout**

Change:
```jsx
<div className="dashboard-root app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', padding: '16px', gap: '16px', boxSizing: 'border-box' }}>
```
To:
```jsx
<div className="dashboard-root app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', boxSizing: 'border-box' }}>
```
Remove padding/gap from root — move to individual layout areas. Content area will get its own padding.

Change main content area from:
```jsx
<main className="content dashboard-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarGutter: 'stable' }}>
```
To:
```jsx
<main className="content dashboard-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarGutter: 'stable', padding: '16px', gap: '16px' }}>
```

- [ ] **Step 2: Fix Sidebar.jsx — header wrapper padding**

Change sidebar header wrapper padding from hardcoded:
- `padding: isCollapsed ? '12px 8px' : '12px 16px'` → use Tailwind classes on elements instead
- Button padding: `padding: isCollapsed ? '0' : '10px 12px'` → `p-0` / `p-2.5` (collapsed: `p-0`, expanded: `p-2.5 px-3`)
- Button width: `width: isCollapsed ? '32px' : '100%'` → add class `w-full` when expanded
- Button height: `height: isCollapsed ? '32px' : '44px'` → `h-8` / `h-11`
- Header wrapper padding: keep the inline style for the collapse-aware padding
- But convert `padding: isCollapsed ? '12px 8px' : '12px 16px'` on the inner div to use classes: `p-3` (collapsed: `p-3 px-2`)
- Nav items gap: `gap-2.5` fine, but ensure consistent
- Nav area padding: `padding: isCollapsed ? '76px 8px 250px 8px' : '76px 12px 250px 12px'` → keep inline (unique compound value)
- Footer wrapper padding: `padding: isCollapsed ? '12px 8px' : '12px'` → keep inline (collapse-aware)
- User profile padding: `px-3 py-2.5` already Tailwind — good
- Role/logout button padding: `px-3 py-2.5` already Tailwind — good

- [ ] **Step 3: Fix Topbar.jsx**

Change:
```jsx
<header ... className="macos-toolbar topbar h-14 min-h-14 flex items-center justify-between px-5 sticky top-0 shrink-0 mx-auto w-full max-w-[700px] rounded-full z-10" style={{...}}>
```
To use responsive padding:
```jsx
<header ... className="macos-toolbar topbar h-14 min-h-14 flex items-center justify-between px-3 sm:px-4 md:px-5 sticky top-0 shrink-0 mx-auto w-full max-w-[700px] rounded-full z-10" style={{...}}>
```

Change left section gap from `gap-16` to responsive:
```jsx
<div className="left flex items-center gap-4 sm:gap-8 md:gap-16">
```

Change right section gap from `gap-16 ml-8` to responsive:
```jsx
<div className="right flex items-center gap-4 sm:gap-8 md:gap-16 ml-4 sm:ml-6 md:ml-8">
```

- [ ] **Step 4: Fix TooltipPopover.jsx**

Change tooltip inner padding from `px-3.5 py-2` to `px-3 py-1.5 sm:px-3.5 sm:py-2`:
```jsx
<div className="rounded-[10px] px-3 py-1.5 sm:px-3.5 sm:py-2 whitespace-nowrap text-[13px] font-medium leading-[18px] relative tracking-tight"
```

- [ ] **Step 5: Build and verify**

Run `npm run build` and confirm success.

---

### Task 2: Dashboard + Employees (Main Data Views)

**Files:**
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/components/Employees.jsx`

**Interfaces:**
- Consumes: Task 1 (responsive layout foundation)
- Produces: consistent card/button spacing in main data views

- [ ] **Step 1: Fix Dashboard.jsx**

Change outer wrapper:
```jsx
<div className="flex-1 flex flex-col gap-16">
```
To:
```jsx
<div className="flex-1 flex flex-col gap-6 sm:gap-8 lg:gap-10">
```

Change stat cards from `p-3.5` to `p-4 sm:p-5`:
- Lines 182, 221, 258: `p-3.5` → `p-4 sm:p-5`

Change announcement/payroll/events cards from `p-4` to `p-5 sm:p-6`:
- Lines 338, 370, 424, 479: `p-4` → `p-5 sm:p-6`

Change dropdown items from `px-4 py-2.5` to `px-3 sm:px-4 py-2 sm:py-2.5`

Change button badges from `py-[5px] px-3` to `py-1 sm:py-1.5 px-2 sm:px-3`

- [ ] **Step 2: Fix Employees.jsx**

Find outer wrapper — likely first significant div:
- Change any `p-4` or inline padding to `p-4 sm:p-6 lg:p-8`
- Fix search bar padding: `px-3.5 py-2.5` → keep or use `px-3 sm:px-4 py-2 sm:py-2.5`
- Fix employee card padding: ensure consistent `p-4 sm:p-5`
- Fix action buttons: ensure `px-4 py-2 sm:px-5 sm:py-2.5` pattern
- Fix table cell padding: `px-3 py-2` → `px-2 sm:px-3 py-1.5 sm:py-2`
- Fix modal/drawer padding: `padding: '24px'` → add `p-6 sm:p-8` class
- Fix form input padding: `px-3.5 py-2.5` → `px-3 sm:px-4 py-2 sm:py-2.5`

- [ ] **Step 3: Build and verify**

Run `npm run build` and confirm success.

---

### Task 3: Payroll + Expenses + Attendance (Financial/Ops Views)

**Files:**
- Modify: `src/components/Payroll.jsx`
- Modify: `src/components/Expenses.jsx`
- Modify: `src/components/Attendance.jsx` (may be wrapper for AttendancePage)

- [ ] **Step 1: Fix Payroll.jsx**

Change outer wrapper:
```jsx
<div className="animate-fade-in flex flex-col gap-[32px]">
```
To:
```jsx
<div className="animate-fade-in flex flex-col gap-6 sm:gap-8 lg:gap-10">
```

Fix summary cards: `p-4` → `p-5 sm:p-6`
Fix table items: `p-2.5 px-3` → `p-2 sm:p-2.5 px-2 sm:px-3`
Fix drawer padding: inline `padding: '24px'` → add `p-6 sm:p-8`
Fix empty state: inline `padding: '60px 20px'` → add `p-10 sm:p-12 lg:p-16`
Fix submit button padding: ensure `px-5 py-2.5 sm:px-6 sm:py-3`

- [ ] **Step 2: Fix Expenses.jsx**

Change outer wrapper gap: `gap-6` → `gap-4 sm:gap-6 lg:gap-8`
Fix form inputs: `px-3.5 py-2.5` → `px-3 sm:px-4 py-2 sm:py-2.5`
Fix submit button: `p-3.5` → `p-3 sm:p-3.5`
Fix glass cards: `p-6` → `p-5 sm:p-6 lg:p-8`
Fix receipt upload: inline `padding: '24px'` → add `p-6 sm:p-8`

- [ ] **Step 3: Fix Attendance.jsx**

Read current Attendance.jsx structure. Apply consistent spacing:
- Outer wrapper gap: `gap-6` → `gap-4 sm:gap-6 lg:gap-8`
- Fix ClockWidget buttons: inline `padding: '0 24px'` → Tailwind `px-4 sm:px-6`
- Fix any card padding to `p-5 sm:p-6`

- [ ] **Step 4: Build and verify**

Run `npm run build` and confirm success.

---

### Task 4: Calendar + Documents + Assets + Announcements (Secondary Views)

**Files:**
- Modify: `src/components/Calendar.jsx`
- Modify: `src/components/Documents.jsx`
- Modify: `src/components/Assets.jsx`
- Modify: `src/components/Announcements.jsx`

- [ ] **Step 1: Fix Calendar.jsx**

Change outer wrapper: `pb-10` → `pb-6 sm:pb-8 lg:pb-10` and add horizontal padding
Fix glass cards: `p-6` → `p-5 sm:p-6`
Fix event list items: `p-3 px-4` → `p-2 sm:p-3 px-3 sm:px-4`
Fix form inputs: `p-2.5 px-3` → `p-2 sm:p-2.5 px-2 sm:px-3`

- [ ] **Step 2: Fix Documents.jsx**

This has heavy `isMobile` inline checks — convert to Tailwind responsive classes:
- Outer wrapper: inline `padding: isMobile ? '0 4px 40px' : '0 0 40px 0'` → Tailwind `px-1 sm:px-0 pb-10`
- Empty state: inline `padding: isMobile ? '24px 16px' : '36px 24px'` → `p-6 sm:p-8 lg:p-10`
- Glass card: inline `padding: isMobile ? '48px 20px' : '64px 32px'` → `p-8 sm:p-10 lg:p-12`
- Category pills: inline `padding: '6px 14px'` → `px-2 sm:px-3 py-1 sm:py-1.5`
- Document list items: inline `padding: isMobile ? '14px' : '16px 20px'` → `p-3 sm:p-4 lg:p-5`

- [ ] **Step 3: Fix Assets.jsx**

Already fairly consistent — minor tweaks:
- Stat cards: `p-5` → `p-4 sm:p-5`
- Action buttons: `p-5` → `p-4 sm:p-5`
- Tab bar: `px-5 py-3` → `px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3`
- Table cells: `p-6` → `p-4 sm:p-5` (too large), `px-3 py-2` → `px-2 sm:px-3 py-1.5 sm:py-2`
- Empty states: `p-10` → `p-8 sm:p-10 lg:p-12`

- [ ] **Step 4: Fix Announcements.jsx**

Change outer wrapper gap: `gap-4` / `gap-5` → `gap-4 sm:gap-6`
Fix form card: `p-8 max-w-[800px] mx-auto` → `p-6 sm:p-8 lg:p-10 max-w-[800px] mx-auto`
Fix form inputs: `p-3`, `p-2.5`, `p-4` → standardize to `p-3 sm:p-3.5`
Fix post cards: `p-6` → `p-5 sm:p-6`
Fix empty state: `p-10` → `p-8 sm:p-10`

- [ ] **Step 5: Build and verify**

Run `npm run build` and confirm success.

---

### Task 5: Settings + DriveSync (Utility Views)

**Files:**
- Modify: `src/components/Settings.jsx`
- Modify: `src/components/DriveSync.jsx`

- [ ] **Step 1: Fix Settings.jsx**

Settings uses 100% inline styles with reusable objects (`pInp`, `pSel`, `card`, etc.). Convert these to Tailwind classes:
- Change `pInp` style obj from `{ padding: '10px 14px', borderRadius: '100px', ... }` → use `className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full"`
- Change `pSel` similarly
- Change `lbl` from `{ marginBottom: '6px' }` → use `className="mb-1 sm:mb-1.5"`
- Change `card` — keep glass variables but fix padding
- For each section wrapper, add `p-4 sm:p-6 lg:p-8` class

- [ ] **Step 2: Fix DriveSync.jsx**

Change outer wrapper gap from inline `gap: '32px'` to Tailwind `gap-6 sm:gap-8 lg:gap-10`
Fix connection card: inline `padding: '32px'` → `p-6 sm:p-8 lg:p-10`
Fix backups card: inline `padding: '32px'` → `p-6 sm:p-8 lg:p-10`

- [ ] **Step 3: Build and verify**

Run `npm run build` and confirm success.

---

### Task 6: EmployeePortal + Login + EmployeeLogin (Auth/Employee Views)

**Files:**
- Modify: `src/components/EmployeePortal.jsx`
- Modify: `src/components/Login.jsx`
- Modify: `src/components/EmployeeLogin.jsx`

- [ ] **Step 1: Fix EmployeePortal.jsx**

Change outer wrapper from inline `padding: isMobile ? '16px' : '32px'` to Tailwind `p-4 sm:p-6 lg:p-8`
Fix sidebar nav items: `p-3` → `p-2 sm:p-3`
Fix sub-view containers that use `flex flex-col gap-6 max-w-[1000px] mx-auto` → add `p-4 sm:p-6`
Bottom tab bar on mobile — ensure proper padding

- [ ] **Step 2: Fix Login.jsx**

Fix login card padding — ensure consistent `p-6 sm:p-8 lg:p-10` on the main card
Fix form inputs: standardize to `px-3 sm:px-4 py-2 sm:py-2.5`
Fix submit button: ensure `px-5 py-2.5 sm:px-6 sm:py-3`

- [ ] **Step 3: Fix EmployeeLogin.jsx**

Fix form card: inline `padding: 24px` → `p-6 sm:p-8` 
Fix welcome screen: CSS class `padding: 48px` — add responsive override
Fix button: `padding: 14px 24px` → Tailwind `px-5 sm:px-6 py-3 sm:py-3.5`

- [ ] **Step 4: Build and verify**

Run `npm run build` and confirm success.

---

### Task 7: Shared Components (Modals, CommandPalette, ToastContainer)

**Files:**
- Modify: `src/components/layout/CommandPalette.jsx`
- Modify: `src/components/layout/ToastContainer.jsx`
- (Modals exist inline in various components — fix as discovered)

- [ ] **Step 1: Fix CommandPalette.jsx**

Fix command item padding: `p-2 sm:p-3`
Fix search input padding: `px-3 py-2 sm:px-4 sm:py-2.5`
Fix command palette card padding: `p-3 sm:p-4`

- [ ] **Step 2: Fix ToastContainer.jsx**

Fix toast padding: `p-3 sm:p-4`
Fix toast gap/spacing between items: `gap-2 sm:gap-3`

- [ ] **Step 3: Build and verify**

Run `npm run build` and confirm success.

---

### Task 8: Final Pass — CSS Cleanup + Verification

**Files:**
- Modify: `src/index.css` (remove unused `content-container` if appropriate)
- Review all components

- [ ] **Step 1: Check for any remaining inline `padding:` hardcoded values**

Search project for remaining inline style padding patterns that weren't caught:
```bash
rg "padding:\s*'[0-9]+px" src/components --include='*.jsx'
```

- [ ] **Step 2: Build and full verify**

Run `npm run build` and confirm no errors.

- [ ] **Step 3: Quick commit**

```bash
git add -A
git commit -m "fix: responsive spacing overhaul — Tailwind-first, consistent padding/gap across all components"
```
