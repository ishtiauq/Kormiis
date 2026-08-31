# Asset Management Page — Restructure & Redesign

## Overview

Restructure the single 614-line `Assets.jsx` component into a dashboard-overview + sub-view architecture. Redesign with proper CSS classes (removing inline styles) and full responsive/adaptive behavior across desktop, tablet, and mobile.

## Architecture

```
Assets.jsx (parent container, receives props from App.jsx)
├── AssetDashboard          — default view: stats, alerts, quick actions, activity
├── AssetInventory          — search/filter, responsive table, add/import, detail modal
├── AssetAssignments        — assign/return assets, PDF agreement generation
├── AssetRequests           — approve/reject employee equipment requests
├── AssetMaintenance        — depreciation calc, maintenance logging, repair history
└── Shared Modals
    ├── AddAssetModal       — form to add new asset to inventory
    └── AssignAssetModal    — employee selection + condition notes → auto PDF
```

## Navigation

- **`activeView` state**: `'dashboard' | 'inventory' | 'assignments' | 'requests' | 'maintenance'`
- Default view on mount: `'dashboard'`
- Sub-navigation breadcrumb pattern: `< Back to Dashboard` link on child views
- Quick action cards on dashboard link to each child view

## Component Designs

### AssetDashboard
- **4 stat cards** in a responsive grid: Total Assets, Available, Assigned, Under Repair
- **Warranty alert banner** — shown only when assets have warranties expiring within 30 days
- **Quick action cards** — 4 cards linking to Inventory, Assignments, Requests, Maintenance
- **Recent Activity** — last 5 audit log entries (from `addLog` prop)
- **Category Breakdown** — simple horizontal bar showing asset count per category

### AssetInventory
- **Search bar** (by name or serial) + **Category filter dropdown**
- **Action bar**: "Add Asset" button + "Import CSV" button
- **Responsive table** using `.table-responsive` CSS class (cards on mobile)
- Columns: ID/Serial, Name, Category, Purchase Info (price + date), Warranty (with expiry alert icon), Status badge
- **Row click** → detail modal with full asset info, maintenance history, book value
- **Empty state**: "No assets found in inventory" centered message

### AssetAssignments
- **Filter pills**: All | Available | Assigned
- **Table**: Asset Name, Status/Assignee (with avatar if assigned), Assignment Date, Condition, Actions
- **Actions**: "Assign" for available, "PDF" + "Return" for assigned
- **Assign modal**: Employee dropdown + condition notes → auto-generates PDF agreement
- **Return** sets asset status back to Available

### AssetRequests
- **Card-based layout** — each request in a `glass-card`
- Shows: employee name + avatar, requested category, urgency badge, justification
- Pending: "Approve & Assign" + "Reject" buttons
- Resolved: status badge only
- **Empty state**: "No pending asset requests"

### AssetMaintenance
- **2-column grid** on desktop → single column on mobile
- **Left panel**: Scrollable asset list with selection highlight
- **Right panel** (on asset select):
  - Depreciation card: Purchase Price, Book Value, Useful Life, Condition
  - Maintenance form: date, repair cost ($), vendor, issue description
  - Repair History: existing logs (date, vendor, cost, issue)
- **Empty state**: "Select an asset to view depreciation and maintenance"

### Shared Modals
- **AddAssetModal**: Form with fields — name, category, serial/IMEI, purchase date, purchase price, useful life, warranty expiry
- **AssignAssetModal**: Employee dropdown + condition notes + auto PDF generation notice
- Both use proper `modal-overlay` / `modal-content` CSS classes with escape-key close (via `useModal`)

## Responsive & Adaptive Strategy

| Breakpoint | Behavior |
|---|---|
| ≥1025px (Desktop) | Full sidebar, 4-column stat grid, 2-column maintenance, full tables |
| 768-1024px (Tablet) | Collapsed nav rail, 2×2 stat grid, tables scroll horizontally |
| <768px (Mobile) | Overlay sidebar drawer, bottom nav, `.table-responsive` converts tables to cards, stats stack 1 column, modals go full-screen with padding |

## Styling Changes

- **Remove ALL inline `style={{...}}`** — replace with existing CSS classes from `index.css`:
  - `glass-card`, `card-elevated`, `card-filled` for cards
  - `btn-primary`, `btn-secondary`, `btn-tonal`, `btn-text` for buttons
  - `form-input`, `form-group`, `search-bar` for forms
  - `badge`, `badge-success`, `badge-info`, `badge-warning`, `badge-danger` for statuses
  - `table-responsive`, `table-striped` for tables
  - `modal-overlay`, `modal-content` for modals
  - `dash-grid-3`, `dash-grid-2` for grids
  - `page-header`, `page-title`, `page-title-icon` for headers
- Use existing fluid typography (`clamp()`) from CSS custom properties
- Ensure all touch targets ≥44px on mobile

## Data Flow

- Props remain identical to current `Assets` component (no App.jsx changes)
- `assets`, `setAssets`, `assetRequests`, `setAssetRequests` — core state
- `employees` — for assignment and request employee lookups
- `addLog` — for activity tracking
- `addToast` — for notifications
- `currentUser` / `simulatedRole` — for permissions

No new state in App.jsx. All internal state stays within Assets.jsx.
