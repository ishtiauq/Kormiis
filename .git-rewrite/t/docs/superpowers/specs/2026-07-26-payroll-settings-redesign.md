# Payroll Settings Redesign

## Overview

Redesign the Payroll Settings section in `Settings.jsx` (inside `renderSettingsContent`). Replace the current three-card layout (Currency + Split Visualization + Components List with sliders) with a cleaner two-card layout: Currency + Salary Structure with donut chart.

## Current State

Three cards in `case 'payroll'`:
1. **Currency Setup** — dropdown for currency
2. **Split Visualization** — horizontal stacked bar + component list with percentages + sample gross input + net earning ratio
3. **Components List** — each component has name, type dropdown, slider, percentage input, delete

## Target State

### Card 1: Currency Setup (unchanged)
- Label + `<select>` dropdown.
- Same code as current.

### Card 2: Salary Structure (replaces both old cards)
- **Header**: "Salary Structure" on left, "Add Component" button on right.
- **Warning banner**: if total components > 100%, show warning (same as current).
- **Component rows**: an array of component cards, each containing:
  - Name input (text, compact, flex: 1)
  - Type toggle — two small buttons side by side: "Earning" (blue when active) / "Deduction" (red when active). Only one active at a time. Replaces the dropdown.
  - Percentage input (number, compact 65px width). No slider.
  - Delete button (Trash2 icon).
- **Donut chart**: using recharts `<PieChart>` + `<Pie>` with `innerRadius` to create a donut. Earnings segments in blue tones, deductions in red tones. Shows at-a-glance breakdown.
- **Net Earning Ratio**: displayed below the donut chart as summary text.

### Removed
- Sample gross input (not needed in settings)
- Custom range slider (replaced with simple number input)
- Type dropdown (replaced with Earning/Deduction toggle buttons)
- Horizontal stacked bar (replaced with donut chart)

### Data Flow
- `salaryStructure` state array (unchanged): `[{ id, name, percentage, type }]`
- `handleComponentChange(id, field, value)` — unchanged
- `handleAddComponent` — unchanged
- `handleRemoveComponent(id)` — unchanged
- `earningsSum`, `deductionsSum`, `netPayPercent`, `totalComponents`, `isOver100` — unchanged
- `SEG_COLORS` — unchanged
- `getSegmentColor` — unchanged

### Files Changed
- `src/components/Settings.jsx` — only the `case 'payroll'` section in `renderSettingsContent`

### What Stays the Same
- All state variables, handlers, and derived values
- Currency settings behavior
- Save/reset logic
- The rest of the Settings page
