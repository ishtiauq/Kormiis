# Settings Page Reorganization

## Overview

Reorganize the Settings page layout from a sidebar+content split to a grid of category cards + expandable settings panel below. No functionality changes — only layout and interaction changes.

## Current State

- `src/components/Settings.jsx` (~703 lines) renders a left sidebar (220px) with 8 category menu items and a right content area that switches based on `activeSubmenu` state.
- Categories: payroll, company, expenses, rosters, notifications, audit, security, sync.
- Each category's settings content is rendered inline via a `switch` on `activeSubmenu`.

## Target State

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  System Settings                     [Reset] [Save]     │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Payroll  │ │ Company  │ │ Expense  │ │ Rosters  │   │
│ │ Settings │ │ Profile  │ │ Policies │ │ & Shifts │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Notific- │ │ Audit    │ │ Security │ │ Sync     │   │
│ │ ations   │ │ Logs     │ │          │ │ Conflicts│   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ Category settings panel (active category content)    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ... settings form fields ...                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Grid of Category Cards

- 4x2 grid (2 rows of 4) of glassmorphism cards.
- Each card shows: icon (same as current), category label.
- Active card has a highlighted/accent state.
- Cards use the app's existing glassmorphism styling (`--glass-bg`, `--glass-border`, `--glass-shadow`).

### Expandable Settings Panel

- Appears below the grid when a category card is clicked.
- Slides open with animation.
- Displays the same settings content currently rendered in the right content area.
- Only one panel open at a time.
- Clicking the same category toggles the panel closed.
- Clicking a different category switches the panel content.
- Panel uses existing `card` style (glassmorphism).

### Interactions

| Action | Result |
|---|---|
| Click category card | Panel slides open below grid with that category's settings |
| Click another category | Panel content switches to new category |
| Click same category | Panel slides closed (toggle) |
| Reset/Save buttons | Unchanged behavior |

### State Changes

- `activeSubmenu` state remains the same (used to track which category is active, persisted to `localStorage`).
- Add a separate `panelOpen` boolean state (or derive from `activeSubmenu` being non-null).
- Toggle logic: click same → close; click different → switch.

### Files Changed

| File | Change |
|---|---|
| `src/components/Settings.jsx` | Major restructure: remove sidebar layout, add grid markup, add panel with slide animation, rewire interaction logic. All settings section content stays inline. |

### What Stays the Same

- All settings form fields, inputs, toggles, tables — identical content.
- State management, localStorage persistence, save/reset handlers.
- Styling tokens and glassmorphism theme.
- Props passed from App.jsx (unchanged interface).

### What Changes

- Layout: sidebar → grid
- Interaction: click sidebar item → click category card with panel toggle
- Visual: category cards instead of text menu items

## Implementation Notes

- Settings.jsx should remain a single file per user preference (no component extraction).
- CSS can use inline styles (existing pattern) or Tailwind classes.
- Panel animation: CSS transition on max-height or transform.
- Grid: CSS grid with `repeat(4, 1fr)` for the cards, responsive breakpoints.
