# Settings Page Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Settings.jsx from sidebar+content layout to grid of category cards + expandable settings panel below.

**Architecture:** Single-file change to `src/components/Settings.jsx`. Replace the left sidebar (220px) category menu with a 4x2 CSS grid of glassmorphism cards. The existing settings content sections (payroll, company, etc.) are moved into an expandable panel below the grid. Add `panelOpen` state for toggle behavior (click same category to close, click different to switch).

**Tech Stack:** React, inline styles (existing pattern), CSS grid.

## Global Constraints

- No component extraction — keep everything in Settings.jsx
- Match existing glassmorphism styling tokens (`--glass-bg`, `--glass-border`, `--glass-radius`, `--glass-shadow`, `card` style object)
- Preserve all settings form fields, state, handlers, and save/reset logic exactly
- Use existing `activeSubmenu` for tracking selected category, persisted to localStorage
- No new dependencies

---

### Task 1: Restructure Settings Layout

**Files:**
- Modify: `src/components/Settings.jsx:13-14` (add panelOpen state)
- Modify: `src/components/Settings.jsx:156-649` (replace sidebar+content with grid+panel)

- [ ] **Step 1: Add `panelOpen` state and update `setTab` for toggle behavior**

Change line 13-15 from:
```jsx
const [activeSubmenu, setActiveSubmenu] = useState(() => localStorage.getItem('hr_pulse_settings_tab') || 'payroll')

const setTab = (id) => { setActiveSubmenu(id); localStorage.setItem('hr_pulse_settings_tab', id) }
```

To:
```jsx
const [activeSubmenu, setActiveSubmenu] = useState(() => localStorage.getItem('hr_pulse_settings_tab') || null)
const [panelOpen, setPanelOpen] = useState(false)

const setTab = (id) => {
  if (activeSubmenu === id && panelOpen) {
    setPanelOpen(false)
  } else {
    setActiveSubmenu(id)
    setPanelOpen(true)
    localStorage.setItem('hr_pulse_settings_tab', id)
  }
}
```

- [ ] **Step 2: Replace sidebar + content wrapper with category grid + expandable panel**

Replace lines 169-650 — the flex container `<div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>` and everything inside it (sidebar at lines 170-192 + content at lines 194-649) — with two new sections:

**Section A — Category Cards Grid (replaces lines 170-192):**
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
  {menuItems.map(item => {
    const Icon = item.icon
    const isActive = activeSubmenu === item.id && panelOpen
    return (
      <button key={item.id} onClick={() => setTab(item.id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          padding: '20px 12px', borderRadius: '16px', border: '1px solid',
          borderColor: isActive ? 'var(--accent-primary, #0062E6)' : 'var(--glass-border)',
          background: isActive ? 'linear-gradient(135deg, rgba(0,98,230,0.08), rgba(0,58,140,0.04))' : 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
          cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none',
          color: isActive ? 'var(--accent-primary, #0062E6)' : 'var(--md-bw-on-surface-variant)',
          boxShadow: isActive ? '0 0 0 1px rgba(0,98,230,0.3), var(--glass-shadow)' : 'var(--glass-shadow)',
        }}>
        <Icon size={24} />
        <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center', lineHeight: '1.3' }}>{item.label}</span>
        {item.badge > 0 && (
          <span style={{ background: isActive ? 'var(--accent-primary, #0062E6)' : 'var(--md-bw-on-surface)', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '12px', fontWeight: 600, marginTop: '-4px' }}>{item.badge}</span>
        )}
      </button>
    )
  })}
</div>
```

**Section B — Expandable Settings Panel (replaces lines 194-649):**
Wrap all existing `{activeSubmenu === '...' && (...)}` sections inside an animated container:
```jsx
<div style={{
  overflow: 'hidden',
  transition: 'max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease, margin 0.35s ease',
  maxHeight: panelOpen ? '2000px' : '0px',
  opacity: panelOpen ? 1 : 0,
  marginTop: panelOpen ? '24px' : '0px',
}}>
  <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {activeSubmenu === 'payroll' && (/* same payroll JSX from lines 195-296 */)}
    {activeSubmenu === 'company' && (/* same company JSX from lines 298-341 */)}
    {activeSubmenu === 'notifications' && (/* same notifications JSX from lines 343-366 */)}
    {activeSubmenu === 'expenses' && (/* same expenses JSX from lines 368-385 */)}
    {activeSubmenu === 'rosters' && (/* same rosters JSX from lines 387-451 */)}
    {activeSubmenu === 'audit' && (/* same audit JSX from lines 453-549 */)}
    {activeSubmenu === 'security' && (/* same security JSX from lines 551-588 */)}
    {activeSubmenu === 'sync' && (/* same sync JSX from lines 590-648 */)}
  </div>
</div>
```

The content inside each `activeSubmenu` condition is copied verbatim from the existing file — no changes to any form fields, labels, inputs, tables, or interactions.

- [ ] **Step 3: Verify the file works**

Run: `npm run dev` (from project root)
Check: Settings page shows 4x2 grid of category cards. Click a card → panel slides open below. Click same card → panel slides closed. Click different card → panel switches content.

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings.jsx docs/superpowers/plans/2026-07-26-settings-reorganization.md
git commit -m "refactor: restructure settings page to grid + expandable panel"
```
