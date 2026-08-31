# Asset Management Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the 614-line Assets.jsx into a dashboard-overview + child-views architecture with proper CSS classes, responsive design, and no inline styles.

**Architecture:** Single parent `Assets.jsx` with internal sub-components: AssetDashboard, AssetInventory, AssetAssignments, AssetRequests, AssetMaintenance. Navigation via `activeView` state. Props unchanged from current implementation.

**Tech Stack:** React 19, Tailwind CSS v4, lucide-react, jsPDF, existing M3+Glass CSS classes from index.css

**Spec:** `docs/superpowers/specs/2026-07-27-asset-management-redesign.md`

## Global Constraints

- CSS classes ONLY — no inline `style={{...}}` props. Use `.btn-filled`, `.btn-tonal`, `.btn-outlined`, `.btn-text` for buttons (not `btn-primary`/`btn-secondary` which have no CSS). Use `.glass-card` for cards, `.table-responsive` for tables, `.badge-*` for status badges, `.form-input` for inputs, `.modal-overlay`/`.modal-content` for modals.
- No changes to App.jsx — all props flow unchanged
- Use existing `.dash-grid-3`, `.dash-grid-2` CSS grid classes for responsive layouts
- All touch targets ≥ 44px on mobile
- Existing fluid typography (`clamp()`) handles font sizing

---

### Task 1: Assets.jsx — Parent Shell with Sub-View Navigation

**Files:**
- Modify: `src/components/Assets.jsx` (complete rewrite)

**Interfaces:**
- Consumes: Props from App.jsx: `{ employees, assets, setAssets, assetRequests, setAssetRequests, addLog, addToast, currentUser, simulatedRole }`
- Produces: Parent shell with `activeView` state, breadcrumb nav, and section rendering

- [ ] **Step 1: Write the new Assets.jsx shell**

Replace the entire file with:

```jsx
import { useState, useRef, useEffect } from 'react'
import { Monitor, ArrowLeft, Box, CheckCircle, BadgeCheck, Wrench, AlertTriangle, LayoutDashboard, Package, FileSignature, MessageSquare, PenTool } from 'lucide-react'
import AdSlot from './AdSlot'
import { useModal } from '../services/useModal.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '../services/date.js'

export default function Assets({ employees, assets, setAssets, assetRequests, setAssetRequests, addLog, addToast, currentUser, simulatedRole }) {
  const [activeView, setActiveView] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    const expiring = (assets || []).filter(a => {
      if (!a.warrantyExpiry) return false
      const exp = new Date(a.warrantyExpiry)
      return exp > today && exp <= thirtyDaysFromNow
    })
    setAlerts(expiring)
  }, [assets])

  // --- Modal states (all from original Assets.jsx, unchanged) ---
  const [showAddModal, setShowAddModal] = useState(false)
  useModal(() => setShowAddModal(false))
  const [newAsset, setNewAsset] = useState({ name: '', category: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', warrantyExpiry: '', usefulLife: 36, condition: 'New' })

  const handleAddAsset = (e) => {
    e.preventDefault()
    const asset = {
      ...newAsset,
      id: `AST-${Date.now()}`,
      purchasePrice: parseFloat(newAsset.purchasePrice) || 0,
      usefulLife: parseInt(newAsset.usefulLife) || 36,
      status: 'Available',
      assignedTo: null,
      assignmentDate: null,
      maintenanceLogs: []
    }
    setAssets(prev => [asset, ...prev])
    setShowAddModal(false)
    addToast('Asset added to inventory', 'success')
    setNewAsset({ name: '', category: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', warrantyExpiry: '', usefulLife: 36, condition: 'New' })
  }

  // --- CSV Import ---
  const fileInputRef = useRef(null)
  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click() }

  const handleImportCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const rows = text.split('\n')
      const headers = rows[0].split(',').map(h => h.trim())
      const importedAssets = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row.trim()) continue
        const cols = row.split(',').map(c => c.trim())
        if (cols.length >= 6) {
          importedAssets.push({
            id: `AST-${Date.now()}-${i}`,
            name: cols[0],
            category: cols[1],
            serialNumber: cols[2],
            purchaseDate: cols[3],
            purchasePrice: parseFloat(cols[4]) || 0,
            warrantyExpiry: cols[5],
            usefulLife: parseInt(cols[6]) || 36,
            status: 'Available',
            assignedTo: null,
            assignmentDate: null,
            condition: 'New',
            maintenanceLogs: []
          })
        }
      }
      if (importedAssets.length > 0) {
        setAssets(prev => [...importedAssets, ...prev])
        addToast(`Successfully imported ${importedAssets.length} assets`, 'success')
      } else {
        addToast('No valid data found in CSV.', 'error')
      }
      e.target.value = null
    }
    reader.readAsText(file)
  }

  // --- Assignment Logic ---
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignForm, setAssignForm] = useState({ employeeId: '', notes: 'Good condition' })
  useModal(() => setShowAssignModal(false))

  const handleAssignAsset = (e) => {
    e.preventDefault()
    if (!assignForm.employeeId) return addToast('Select an employee', 'warning')
    setAssets(prev => prev.map(a => {
      if (a.id === assignTarget.id) {
        return {
          ...a,
          status: 'Assigned',
          assignedTo: assignForm.employeeId,
          assignmentDate: new Date().toISOString().split('T')[0],
          condition: assignForm.notes
        }
      }
      return a
    }))
    setShowAssignModal(false)
    addToast('Asset assigned successfully', 'success')
    generateAgreementPDF(assignTarget, employees.find(emp => emp.id === assignForm.employeeId), assignForm.notes)
  }

  const generateAgreementPDF = (asset, employee, notes = 'Good condition') => {
    try {
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text('Asset Assignment Agreement', 20, 20)
      doc.setFontSize(12)
      doc.text(`Date: ${formatDate(new Date().toISOString().split('T')[0])}`, 20, 30)
      doc.text(`Employee Name: ${employee.name} (${employee.department})`, 20, 40)
      doc.text('This document confirms the assignment of the following company property:', 20, 55)
      autoTable(doc, {
        startY: 60,
        head: [['Asset ID', 'Name', 'Category', 'Serial Number', 'Condition']],
        body: [[asset.id, asset.name, asset.category, asset.serialNumber, notes]]
      })
      const finalY = (doc.lastAutoTable?.finalY ?? 90) + 20
      doc.text('Terms and Conditions:', 20, finalY)
      doc.setFontSize(10)
      doc.text('1. The asset remains the property of HR Pulse Ltd.', 20, finalY + 10)
      doc.text('2. The employee agrees to keep the asset in good condition.', 20, finalY + 20)
      doc.text('3. The employee must return the asset upon termination of employment.', 20, finalY + 30)
      doc.text('Employee Signature: _______________________', 20, finalY + 60)
      doc.text('Date: ________________', 120, finalY + 60)
      doc.text('HR Signature: _______________________', 20, finalY + 80)
      doc.text('Date: ________________', 120, finalY + 80)
      doc.save(`Asset_Agreement_${employee.id}_${asset.id}.pdf`)
      addToast('Agreement PDF generated', 'info')
    } catch (e) {
      console.error(e)
      addToast('Error generating PDF', 'error')
    }
  }

  const handleReturnAsset = (id) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: 'Available', assignedTo: null, assignmentDate: null }
      }
      return a
    }))
    addToast('Asset returned to inventory', 'success')
  }

  // --- Requests Logic ---
  const handleRequestAction = (reqId, action) => {
    setAssetRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: action } : r))
    addToast(`Request ${action.toLowerCase()}`, 'info')
  }

  // --- Maintenance & Depreciation ---
  const [selectedAssetForMaint, setSelectedAssetForMaint] = useState(null)
  const [maintForm, setMaintForm] = useState({ date: '', issue: '', cost: '', vendor: '' })

  const handleAddMaintenance = (e) => {
    e.preventDefault()
    setAssets(prev => prev.map(a => {
      if (a.id === selectedAssetForMaint.id) {
        return {
          ...a,
          status: 'Under Repair',
          maintenanceLogs: [...(a.maintenanceLogs || []), { id: `maint-${Date.now()}`, date: maintForm.date, issue: maintForm.issue, cost: parseFloat(maintForm.cost) || 0, vendor: maintForm.vendor, status: 'In Progress' }]
        }
      }
      return a
    }))
    setMaintForm({ date: '', issue: '', cost: '', vendor: '' })
    setSelectedAssetForMaint(null)
    addToast('Maintenance log added, asset marked as Under Repair', 'success')
  }

  const calculateBookValue = (asset) => {
    if (!asset.purchasePrice || !asset.purchaseDate || !asset.usefulLife) return asset.purchasePrice || 0
    const purchaseDate = new Date(asset.purchaseDate)
    const today = new Date()
    const monthsElapsed = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth())
    if (monthsElapsed >= asset.usefulLife) return 0
    const monthlyDepreciation = asset.purchasePrice / asset.usefulLife
    const bookValue = asset.purchasePrice - (monthlyDepreciation * monthsElapsed)
    return Math.max(0, bookValue).toFixed(2)
  }

  const filteredAssets = (assets || []).filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.serialNumber.toLowerCase().includes(search.toLowerCase())
    const matchesCat = filterCategory === 'All' ? true : a.category === filterCategory
    return matchesSearch && matchesCat
  })

  const stats = {
    total: assets?.length || 0,
    available: assets?.filter(a => a.status === 'Available').length || 0,
    assigned: assets?.filter(a => a.status === 'Assigned').length || 0,
    underRepair: assets?.filter(a => a.status === 'Under Repair').length || 0,
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <AssetDashboard ... />
      case 'inventory': return <AssetInventory ... />
      case 'assignments': return <AssetAssignments ... />
      case 'requests': return <AssetRequests ... />
      case 'maintenance': return <AssetMaintenance ... />
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Monitor size={28} className="page-title-icon" />
          Asset Management
        </h1>
      </div>

      {activeView !== 'dashboard' && (
        <button className="btn-text" onClick={() => setActiveView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      )}

      {alerts.length > 0 && activeView === 'dashboard' && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--accent-warning)', color: '#fff' }}>
          <AlertTriangle size={20} />
          <span><strong>Alert:</strong> {alerts.length} asset(s) have warranties expiring within 30 days</span>
        </div>
      )}

      {renderView()}
      <AdSlot />
    </div>
  )
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "refactor(assets): add parent shell with sub-view navigation"
```

---

### Task 2: AssetDashboard Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AssetDashboard function before the parent export)

**Interfaces:**
- Consumes: `{ stats, alerts, setActiveView, addLog, assets, employees }`

- [ ] **Step 1: Write the AssetDashboard component**

Add before the parent `export default function Assets`:

```jsx
function AssetDashboard({ stats, alerts, setActiveView, assets, employees }) {
  const quickActions = [
    { id: 'inventory', label: 'View Inventory', icon: <Package size={24} />, desc: 'Browse all assets' },
    { id: 'assignments', label: 'Assign Assets', icon: <FileSignature size={24} />, desc: 'Manage assignments' },
    { id: 'requests', label: 'Pending Requests', icon: <MessageSquare size={24} />, desc: 'Approve or reject' },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={24} />, desc: 'Log repairs & depreciation' },
  ]

  const categories = [
    { label: 'Laptops', key: 'Laptop' },
    { label: 'Phones', key: 'Phone' },
    { label: 'Monitors', key: 'Monitor' },
    { label: 'Peripherals', key: 'Peripherals' },
    { label: 'Access Cards', key: 'Access Card' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stat Cards */}
      <div className="dash-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Assets</div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(52,199,89,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#34c759" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.available}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Available</div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(0,122,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeCheck size={24} color="#007aff" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.assigned}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned</div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,149,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={24} color="#ff9500" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.underRepair}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Under Repair</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {quickActions.map(action => (
          <button key={action.id} className="btn-tonal" onClick={() => setActiveView(action.id)}
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'center' }}>
            {action.icon}
            <div style={{ fontWeight: 600 }}>{action.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{action.desc}</div>
          </button>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>Category Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map(cat => {
            const count = assets.filter(a => a.category === cat.key).length
            const max = Math.max(assets.length, 1)
            const pct = (count / max) * 100
            return (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: 100, fontSize: '0.85rem' }}>{cat.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: 'var(--accent-primary)', opacity: 0.7 }} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire the component into parent's `renderView`**

In the parent Assets component, update `renderView`:

```jsx
const renderView = () => {
  switch (activeView) {
    case 'dashboard':
      return <AssetDashboard stats={stats} alerts={alerts} setActiveView={setActiveView} assets={assets} employees={employees} />
    case 'inventory': return <AssetInventory ... />
    // ... etc
  }
}
```

- [ ] **Step 3: Build to verify**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): add AssetDashboard with stats and quick actions"
```

---

### Task 3: AssetInventory Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AssetInventory function)

**Interfaces:**
- Consumes: `{ filteredAssets, search, setSearch, filterCategory, setFilterCategory, alerts, handleAddAsset, newAsset, setNewAsset, showAddModal, setShowAddModal, triggerFileInput, fileInputRef, handleImportCSV, addToast }`

- [ ] **Step 1: Write AssetInventory component**

```jsx
function AssetInventory({ filteredAssets, search, setSearch, filterCategory, setFilterCategory, alerts, showAddModal, setShowAddModal, newAsset, setNewAsset, handleAddAsset, triggerFileInput, fileInputRef, handleImportCSV, addToast }) {
  const [detailAsset, setDetailAsset] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search & Action Bar */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div className="search-bar" style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" className="form-input" placeholder="Search by name or serial..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
          </div>
          <select className="form-input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
            <option value="All">All Categories</option>
            <option value="Laptop">Laptops</option>
            <option value="Phone">Phones</option>
            <option value="Monitor">Monitors</option>
            <option value="Peripherals">Peripherals</option>
            <option value="Access Card">Access Cards</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-tonal" onClick={triggerFileInput}><Upload size={16} /> Import CSV</button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" style={{ display: 'none' }} />
          <button className="btn-filled" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add Asset</button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table-responsive w-full table-striped">
          <thead>
            <tr>
              <th>ID / Serial</th>
              <th>Name</th>
              <th>Category</th>
              <th>Purchase Info</th>
              <th>Warranty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset.id} onClick={() => setDetailAsset(asset)} style={{ cursor: 'pointer' }}>
                <td data-label="ID / Serial">
                  <div style={{ fontWeight: 600 }}>{asset.id}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SN: {asset.serialNumber}</div>
                </td>
                <td data-label="Name">{asset.name}</td>
                <td data-label="Category">{asset.category}</td>
                <td data-label="Purchase">
                  <div>${asset.purchasePrice}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.purchaseDate}</div>
                </td>
                <td data-label="Warranty">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {asset.warrantyExpiry}
                    {alerts.find(a => a.id === asset.id) && <AlertTriangle size={14} color="var(--accent-warning)" />}
                  </div>
                </td>
                <td data-label="Status">
                  <span className={`badge ${
                    asset.status === 'Available' ? 'badge-success' :
                    asset.status === 'Assigned' ? 'badge-info' :
                    asset.status === 'Under Repair' ? 'badge-warning' : 'badge-danger'
                  }`}>{asset.status}</span>
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No assets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detailAsset && (
        <DetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write DetailModal sub-component**

```jsx
function DetailModal({ asset, onClose }) {
  useModal(onClose)
  const calculateBookValue = (asset) => {
    if (!asset.purchasePrice || !asset.purchaseDate || !asset.usefulLife) return asset.purchasePrice || 0
    const purchaseDate = new Date(asset.purchaseDate)
    const today = new Date()
    const monthsElapsed = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth())
    if (monthsElapsed >= asset.usefulLife) return 0
    const monthlyDepreciation = asset.purchasePrice / asset.usefulLife
    const bookValue = asset.purchasePrice - (monthlyDepreciation * monthsElapsed)
    return Math.max(0, bookValue).toFixed(2)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ marginTop: 0 }}>{asset.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Asset ID</div><div style={{ fontWeight: 600 }}>{asset.id}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Serial Number</div><div style={{ fontWeight: 600 }}>{asset.serialNumber}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</div><div>{asset.category}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</div><span className={`badge ${asset.status === 'Available' ? 'badge-success' : asset.status === 'Assigned' ? 'badge-info' : 'badge-warning'}`}>{asset.status}</span></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Purchase Price</div><div>${asset.purchasePrice}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Book Value</div><div style={{ color: 'var(--accent-success)', fontWeight: 600 }}>${calculateBookValue(asset)}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Purchase Date</div><div>{asset.purchaseDate}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Warranty Expiry</div><div>{asset.warrantyExpiry}</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Useful Life</div><div>{asset.usefulLife} months</div></div>
          <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Condition</div><div>{asset.condition}</div></div>
        </div>
        {asset.maintenanceLogs?.length > 0 && (
          <div>
            <h3 style={{ margin: '16px 0 8px 0', fontSize: '0.95rem' }}>Maintenance History</h3>
            {asset.maintenanceLogs.map(log => (
              <div key={log.id} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '6px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{log.date} - {log.vendor}</span>
                  <span style={{ color: 'var(--accent-danger)' }}>${log.cost}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{log.issue}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn-tonal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire into parent `renderView` and verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): add AssetInventory with search, filter, detail modal"
```

---

### Task 4: AssetAssignments Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AssetAssignments function, AssignAssetModal)

- [ ] **Step 1: Write AssetAssignments and AssignAssetModal**

```jsx
function AssetAssignments({ assets, employees, assignForm, setAssignForm, setAssignTarget, showAssignModal, setShowAssignModal, handleAssignAsset, handleReturnAsset, generateAgreementPDF }) {
  const [filterStatus, setFilterStatus] = useState('All')
  const assignableAssets = assets.filter(a => filterStatus === 'All' ? (a.status === 'Available' || a.status === 'Assigned') : a.status === filterStatus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filter Pills */}
      <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', gap: '8px' }}>
        {['All', 'Available', 'Assigned'].map(s => (
          <button key={s} className={s === filterStatus ? 'btn-filled' : 'btn-tonal'} style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => setFilterStatus(s)}>{s}</button>
        ))}
      </div>

      <div className="table-container">
        <table className="table-responsive w-full table-striped">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Status / Assignee</th>
              <th>Assignment Date</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignableAssets.map(asset => {
              const emp = asset.assignedTo ? employees.find(e => e.id === asset.assignedTo) : null
              return (
                <tr key={asset.id}>
                  <td data-label="Asset">
                    <div style={{ fontWeight: 600 }}>{asset.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.id}</div>
                  </td>
                  <td data-label="Status / Assignee">
                    {asset.status === 'Assigned' && emp ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {emp.avatar ? <img src={emp.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)' }} />}
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.department}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="badge badge-success">Available</span>
                    )}
                  </td>
                  <td data-label="Assignment Date">{asset.assignmentDate || '-'}</td>
                  <td data-label="Condition">{asset.condition || '-'}</td>
                  <td data-label="Actions">
                    {asset.status === 'Available' ? (
                      <button className="btn-filled" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setAssignTarget(asset); setShowAssignModal(true) }}>Assign</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-tonal" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => generateAgreementPDF(asset, emp, asset.condition)}><FileSignature size={14} /> PDF</button>
                        <button className="btn-tonal" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-warning)' }} onClick={() => handleReturnAsset(asset.id)}>Return</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignAssetModal showAssignModal={showAssignModal} setShowAssignModal={setShowAssignModal} assignTarget={assignTarget} assignForm={assignForm} setAssignForm={setAssignForm} handleAssignAsset={handleAssignAsset} employees={employees} />
      )}
    </div>
  )
}

function AssignAssetModal({ showAssignModal, setShowAssignModal, assignTarget, assignForm, setAssignForm, handleAssignAsset, employees }) {
  useModal(() => setShowAssignModal(false))

  return (
    <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Assign Asset: {assignTarget?.name}</h2>
        <form onSubmit={handleAssignAsset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Select Employee</label>
            <select className="form-input" required value={assignForm.employeeId} onChange={e => setAssignForm(p => ({...p, employeeId: e.target.value}))}>
              <option value="">-- Choose Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Condition Notes</label>
            <input type="text" className="form-input" value={assignForm.notes} onChange={e => setAssignForm(p => ({...p, notes: e.target.value}))} />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Agreement PDF will be auto-generated on assignment.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn-tonal" onClick={() => setShowAssignModal(false)}>Cancel</button>
            <button type="submit" className="btn-filled">Assign & Generate PDF</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into parent `renderView` and verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): add AssetAssignments with assign/return/PDF"
```

---

### Task 5: AssetRequests Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AssetRequests function)

- [ ] **Step 1: Write AssetRequests component**

```jsx
function AssetRequests({ assetRequests, employees, handleRequestAction }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {assetRequests.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No pending asset requests.</div>
      ) : (
        assetRequests.map(req => {
          const emp = employees.find(e => e.id === req.employeeId) || { name: 'Unknown' }
          return (
            <div key={req.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{emp.name}</span>
                  <span>requested a</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{req.category}</span>
                  <span className={`badge ${req.urgency === 'High' ? 'badge-danger' : req.urgency === 'Medium' ? 'badge-warning' : 'badge-info'}`}>{req.urgency}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>"{req.justification}"</div>
              </div>
              {req.status === 'Pending' ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn-filled" style={{ fontSize: '0.85rem' }} onClick={() => handleRequestAction(req.id, 'Approved')}>Approve & Assign</button>
                  <button className="btn-tonal" style={{ fontSize: '0.85rem', color: 'var(--accent-danger)' }} onClick={() => handleRequestAction(req.id, 'Rejected')}>Reject</button>
                </div>
              ) : (
                <span className={`badge ${req.status === 'Approved' ? 'badge-success' : 'badge-danger'}`}>{req.status}</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire into parent `renderView` and verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): add AssetRequests with approve/reject"
```

---

### Task 6: AssetMaintenance Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AssetMaintenance function)

- [ ] **Step 1: Write AssetMaintenance component**

```jsx
function AssetMaintenance({ assets, selectedAssetForMaint, setSelectedAssetForMaint, maintForm, setMaintForm, handleAddMaintenance, calculateBookValue }) {
  return (
    <div className="dash-grid-2" style={{ gap: '24px' }}>
      {/* Asset Selection Panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Select Asset</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
          {assets.map(asset => (
            <div key={asset.id}
              className={selectedAssetForMaint?.id === asset.id ? 'card-filled' : 'card-outlined'}
              onClick={() => setSelectedAssetForMaint(asset)}
              style={{ padding: '12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{asset.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.id}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.8rem' }}>
                <span className={`badge ${asset.status === 'Under Repair' ? 'badge-warning' : asset.status === 'Assigned' ? 'badge-info' : 'badge-success'}`}>{asset.status}</span>
                <span style={{ color: 'var(--text-secondary)' }}>Purchased: {asset.purchaseDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {selectedAssetForMaint ? (
          <>
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <TrendingDown size={20} color="var(--accent-primary)" /> Depreciation & Value
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Purchase Price</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>${selectedAssetForMaint.purchasePrice}</div></div>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Book Value</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-success)' }}>${calculateBookValue(selectedAssetForMaint)}</div></div>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Useful Life</div><div>{selectedAssetForMaint.usefulLife} months</div></div>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Condition</div><div>{selectedAssetForMaint.condition}</div></div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <PenTool size={20} color="var(--accent-warning)" /> Log Maintenance
              </h3>
              <form onSubmit={handleAddMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="date" required className="form-input" value={maintForm.date} onChange={e => setMaintForm(p => ({...p, date: e.target.value}))} />
                  <input type="number" required placeholder="Repair Cost ($)" className="form-input" value={maintForm.cost} onChange={e => setMaintForm(p => ({...p, cost: e.target.value}))} />
                </div>
                <input type="text" required placeholder="Vendor / Service Center" className="form-input" value={maintForm.vendor} onChange={e => setMaintForm(p => ({...p, vendor: e.target.value}))} />
                <textarea required rows={3} placeholder="Describe the issue..." className="form-input" value={maintForm.issue} onChange={e => setMaintForm(p => ({...p, issue: e.target.value}))} />
                <button type="submit" className="btn-filled" style={{ alignSelf: 'flex-start' }}>Log Repair</button>
              </form>

              {selectedAssetForMaint.maintenanceLogs?.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Repair History</h4>
                  {selectedAssetForMaint.maintenanceLogs.map(log => (
                    <div key={log.id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{log.date} - {log.vendor}</span>
                        <span style={{ color: 'var(--accent-danger)' }}>${log.cost}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{log.issue}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Select an asset to view depreciation and maintenance.
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into parent `renderView` and verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): add AssetMaintenance with depreciation and repair logging"
```

---

### Task 7: AddAssetModal Sub-Component

**Files:**
- Modify: `src/components/Assets.jsx` (add AddAssetModal function)

- [ ] **Step 1: Write AddAssetModal as a separate function**

```jsx
function AddAssetModal({ showAddModal, setShowAddModal, newAsset, setNewAsset, handleAddAsset }) {
  useModal(() => setShowAddModal(false))

  return (
    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Add New Asset</h2>
        <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Asset Name</label>
              <input type="text" className="form-input" required value={newAsset.name} onChange={e => setNewAsset(p => ({...p, name: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-input" value={newAsset.category} onChange={e => setNewAsset(p => ({...p, category: e.target.value}))}>
                <option>Laptop</option><option>Phone</option><option>Monitor</option><option>Peripherals</option><option>Access Card</option>
              </select>
            </div>
            <div className="form-group">
              <label>Serial Number / IMEI</label>
              <input type="text" className="form-input" required value={newAsset.serialNumber} onChange={e => setNewAsset(p => ({...p, serialNumber: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Purchase Date</label>
              <input type="date" className="form-input" required value={newAsset.purchaseDate} onChange={e => setNewAsset(p => ({...p, purchaseDate: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Purchase Price ($)</label>
              <input type="number" className="form-input" required value={newAsset.purchasePrice} onChange={e => setNewAsset(p => ({...p, purchasePrice: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Useful Life (Months)</label>
              <input type="number" className="form-input" required value={newAsset.usefulLife} onChange={e => setNewAsset(p => ({...p, usefulLife: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Warranty Expiry</label>
              <input type="date" className="form-input" required value={newAsset.warrantyExpiry} onChange={e => setNewAsset(p => ({...p, warrantyExpiry: e.target.value}))} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn-tonal" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button type="submit" className="btn-filled">Save Asset</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into parent `renderView` and verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/Assets.jsx
git commit -m "feat(assets): extract AddAssetModal into sub-component"
```

---

### Task 8: Responsive CSS Additions

**Files:**
- Modify: `src/index.css` (add responsive rules for new patterns)

- [ ] **Step 1: Add responsive rules for 4-column stat and action grids**

Add to `index.css` after `.dash-grid-2` definitions (~line 2541):

```css
/* Asset Dashboard */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.maintenance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

@media (max-width: 1024px) {
  .stats-grid, .actions-grid { grid-template-columns: 1fr 1fr; }
  .maintenance-grid { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  .stats-grid, .actions-grid { grid-template-columns: 1fr; }
}

/* Mobile modals */
@media (max-width: 767px) {
  .modal-content { max-width: 100vw !important; width: calc(100% - 32px) !important; margin: 16px; }
  .modal-content h2 { font-size: 1.1rem; }
}
```

- [ ] **Step 2: Update component JSX to use new CSS classes**

In AssetDashboard, replace inline `style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}` with `className="stats-grid"` and `className="actions-grid"`.

In AssetMaintenance, replace `className="dash-grid-2"` with `className="maintenance-grid"`.

- [ ] **Step 3: Verify build**

Run: `cmd.exe /c npx.cmd vite build 2>&1`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/Assets.jsx
git commit -m "style(assets): add responsive CSS classes for dashboard and maintenance grids"
```

---

### Task 9: Dev Server Verification

- [ ] **Step 1: Start dev server and verify all views render**

Start: `wmic process call create "cmd.exe /c node_modules\.bin\vite.cmd --host"` (or use WMI to start detached)

Check: Navigate to http://localhost:5173, switch to Assets view, verify dashboard, inventory, assignments, requests, and maintenance tabs all render without errors.

- [ ] **Step 2: Verify stat card calculations match actual data**

Check: Total = assets.length, Available = assets where status === 'Available', etc.

- [ ] **Step 3: Verify all business logic still works**

- Add asset via modal → appears in inventory
- Import CSV → assets added
- Assign asset → status changes, PDF generates
- Return asset → status back to Available
- Approve/reject request → status updates
- Log maintenance → asset marked Under Repair, log appears
