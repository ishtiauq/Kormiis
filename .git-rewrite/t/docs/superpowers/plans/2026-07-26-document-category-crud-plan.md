# Document Category CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline add/edit/delete of document categories inside the category filter bar.

**Architecture:** All changes in `src/components/Documents.jsx`. Move `CATEGORIES` from module-level `const` to component `useState`. Add hover-reveal edit/delete icons on each category button, a "+" add button, and a small modal for name + color editing.

**Tech Stack:** React (useState), inline JSX styles, Lucide icons (Pencil, Plus, Trash2)

## Global Constraints

- `CATEGORIES` moves from `const` to `useState` — all references update accordingly
- "Other" category (id: `other`) is protected — cannot be deleted, no edit/delete icons shown
- "All" button is not a category — no edit/delete icons
- New category IDs use `cat-${Date.now()}` format
- New categories auto-assign `File` icon
- Deleting a category with documents → reassign those docs to first available category, then delete
- Color picker uses 6 predefined swatches

---

### Task 1: Move CATEGORIES to useState & Add Category Modal State

**Files:**
- Modify: `src/components/Documents.jsx:7-13` (remove const CATEGORIES)
- Modify: `src/components/Documents.jsx:32-50` (add useState + modal state)

**Interfaces:**
- Consumes: existing component props (`documents`, `setDocuments`, etc.)
- Produces: `categories` state array, `showCategoryModal`, `editingCategory` state, `setCategories` setter

- [ ] **Step 1: Replace const CATEGORIES with useState**

Replace lines 7-13:

```js
const CATEGORIES = [
  { id: 'hr-docs', label: 'HR Documents', icon: Folder, color: '#3b82f6' },
  { id: 'policies', label: 'Policies', icon: FileText, color: '#10b981' },
  { id: 'forms', label: 'Forms', icon: FileText, color: '#8b5cf6' },
  { id: 'training', label: 'Training', icon: FileArchive, color: '#ec4899' },
  { id: 'other', label: 'Other', icon: File, color: '#64748b' },
]
```

With (inside component, after other useState calls):

```js
const defaultCategories = [
  { id: 'hr-docs', label: 'HR Documents', icon: Folder, color: '#3b82f6' },
  { id: 'policies', label: 'Policies', icon: FileText, color: '#10b981' },
  { id: 'forms', label: 'Forms', icon: FileText, color: '#8b5cf6' },
  { id: 'training', label: 'Training', icon: FileArchive, color: '#ec4899' },
  { id: 'other', label: 'Other', icon: File, color: '#64748b' },
]
const [categories, setCategories] = useState(defaultCategories)
```

- [ ] **Step 2: Add category modal state**

After line 38 (`const fileInputRef = useRef(null)`), add:

```js
const [showCategoryModal, setShowCategoryModal] = useState(false)
const [editingCategory, setEditingCategory] = useState(null)
const [catFormName, setCatFormName] = useState('')
const [catFormColor, setCatFormColor] = useState('#3b82f6')
```

- [ ] **Step 3: Remove CATEGORIES import from getFileIcon area**

`getFileIcon` function stays as-is (it's for file types, not categories). The `getCategoryInfo` function (line 119) needs CATEGORIES replaced with `categories`:

Change:
```js
const getCategoryInfo = (catId) => CATEGORIES.find(c => c.id === catId) || CATEGORIES[CATEGORIES.length - 1]
```
To:
```js
const getCategoryInfo = (catId) => categories.find(c => c.id === catId) || categories[categories.length - 1]
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Documents.jsx
git commit -m "feat: move categories to useState, add modal state"
```

---

### Task 2: Add "+" Button & Category Add/Edit Modal UI

**Files:**
- Modify: `src/components/Documents.jsx` (category bar + new modal)

**Interfaces:**
- Consumes: `categories`, `showCategoryModal`, `editingCategory`, `catFormName`, `catFormColor` state from Task 1
- Produces: category add/edit modal with save handler

- [ ] **Step 1: Add "+" button at end of category bar**

In the category bar div (currently line 186-200), after the `CATEGORIES.map(...)` closure and before the closing `</div>`, add:

```jsx
{categories.length > 0 && (
  <button onClick={() => {
    setEditingCategory(null)
    setCatFormName('')
    setCatFormColor('#3b82f6')
    setShowCategoryModal(true)
  }}
    style={{
      padding: '6px 12px', borderRadius: '20px', background: 'transparent',
      color: 'var(--md-bw-on-surface)', fontWeight: 600, fontSize: '0.85rem',
      cursor: 'pointer', border: '1px dashed var(--md-bw-outline)',
      display: 'flex', alignItems: 'center', gap: '4px',
      transition: 'border-color var(--transition-fast), color var(--transition-fast)'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--md-bw-outline)'; e.currentTarget.style.color = 'var(--md-bw-on-surface)' }}>
    <Plus size={14} /> Add
  </button>
)}
```

- [ ] **Step 2: Add the category modal (before the closing `</div>` of the main container)**

Following the pattern of the Upload modal (line 274-395), add a category modal:

```jsx
{showCategoryModal && (
  <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: isMobile ? '12px' : '20px'
    }}>
    <div className="modal-container"
      style={{ maxWidth: isMobile ? '100%' : '420px', width: '100%', padding: 0, borderRadius: isMobile ? '12px' : '14px', background: theme.bg, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'modalFadeIn 0.2s ease', margin: isMobile ? '10px' : '0' }}
      onClick={e => e.stopPropagation()}>
      <div className="modal-header" style={{ padding: isMobile ? '16px' : '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: theme.text }}>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
        <button className="modal-close" onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: '4px' }}><X size={20} /></button>
      </div>
      <div style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.secondary }}>Category Name *</label>
          <input type="text" required value={catFormName} onChange={e => setCatFormName(e.target.value)} placeholder="e.g. Payroll"
            style={{
              padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`,
              background: theme.inputBg, color: theme.text, fontSize: '0.95rem',
              outline: 'none', transition: 'border-color var(--transition-fast)'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = theme.border} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: theme.secondary }}>Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['#3b82f6','#10b981','#8b5cf6','#ec4899','#64748b','#f59e0b'].map(color => (
              <button key={color} type="button" onClick={() => setCatFormColor(color)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: color,
                  border: catFormColor === color ? '3px solid var(--md-bw-primary)' : `2px solid ${color}`,
                  cursor: 'pointer', outline: catFormColor === color ? `2px solid ${color}` : 'none',
                  outlineOffset: '2px', transition: 'transform var(--transition-fast)',
                  transform: catFormColor === color ? 'scale(1.15)' : 'scale(1)'
                }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSaveCategory}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {editingCategory ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add handleSaveCategory function**

After `handleDelete` (line 117), add:

```js
const handleSaveCategory = () => {
  if (!catFormName.trim()) return addToast('Category name is required', 'warning')
  if (editingCategory) {
    setCategories(prev => prev.map(c =>
      c.id === editingCategory.id ? { ...c, label: catFormName.trim(), color: catFormColor } : c
    ))
    addToast('Category updated', 'success')
  } else {
    const newCat = {
      id: `cat-${Date.now()}`,
      label: catFormName.trim(),
      icon: File,
      color: catFormColor,
    }
    setCategories(prev => [...prev, newCat])
    addToast('Category added', 'success')
  }
  setShowCategoryModal(false)
}
```

- [ ] **Step 4: Add Plus icon to import**

Change line 3:
```js
import { FileText, Search, Upload, Download, Trash2, Folder, X, FileSpreadsheet, FileImage, FileArchive, File } from 'lucide-react'
```
To:
```js
import { FileText, Search, Upload, Download, Trash2, Folder, X, FileSpreadsheet, FileImage, FileArchive, File, Plus, Pencil } from 'lucide-react'
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Documents.jsx
git commit -m "feat: add category add/edit modal with color picker"
```

---

### Task 3: Hover-Reveal Edit/Delete Icons on Category Buttons + Delete Handler

**Files:**
- Modify: `src/components/Documents.jsx` (category buttons, delete logic)

**Interfaces:**
- Consumes: `categories`, `setCategories`, `documents`, `setDocuments` state
- Consumes: `getCategoryInfo` helper from Task 1

- [ ] **Step 1: Add edit/delete icons on hover to each category button**

Replace the category button rendering inside `CATEGORIES.map(...)` (now `categories.map(...)`):

```jsx
{categories.map(cat => {
  const isActive = selectedCategory === cat.id
  const isProtected = cat.id === 'other'
  return (
    <div key={cat.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button onClick={() => setSelectedCategory(cat.id)}
        style={{
          padding: '6px 14px', borderRadius: '20px', background: isActive ? cat.color : 'var(--md-bw-surface-variant)',
          color: isActive ? '#fff' : 'var(--md-bw-on-surface)', fontWeight: 600, fontSize: '0.8rem',
          cursor: 'pointer', border: isActive ? 'none' : '1px solid var(--md-bw-outline)',
          paddingRight: (!isProtected && !isActive) ? '28px' : '14px',
          transition: 'border-color var(--transition-fast), background var(--transition-fast)'
        }}>
        {cat.label}
      </button>
      {!isProtected && !isActive && (
        <span style={{
          position: 'absolute', right: '6px', display: 'flex', gap: '1px',
          opacity: 0, transition: 'opacity 0.15s'
        }} className="category-actions"
          onMouseEnter={() => {
            const el = document.querySelector(`.category-actions`)
            // Using inline style via parent hover approach — see note
          }}>
          <button onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setCatFormName(cat.label); setCatFormColor(cat.color); setShowCategoryModal(true) }}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--md-bw-on-surface)', display: 'flex', alignItems: 'center', lineHeight: 1, fontSize: '10px' }}>
            <Pencil size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', lineHeight: 1, fontSize: '10px' }}>
            <Trash2 size={10} />
          </button>
        </span>
      )}
    </div>
  )
})}
```

Wait, hover-reveal with inline styles is tricky. A cleaner approach: use the parent div's `onMouseEnter`/`onMouseLeave` to toggle visibility of the actions span via a `hoveredCategory` state.

Better approach: add `hoveredCategory` state and use it:

```js
const [hoveredCategory, setHoveredCategory] = useState(null)
```

Then:

```jsx
{categories.map(cat => {
  const isActive = selectedCategory === cat.id
  const isProtected = cat.id === 'other'
  const showActions = hoveredCategory === cat.id && !isActive && !isProtected
  return (
    <div key={cat.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setHoveredCategory(cat.id)}
      onMouseLeave={() => setHoveredCategory(null)}>
      <button onClick={() => setSelectedCategory(cat.id)}
        style={{
          padding: '6px 14px', borderRadius: '20px', background: isActive ? cat.color : 'var(--md-bw-surface-variant)',
          color: isActive ? '#fff' : 'var(--md-bw-on-surface)', fontWeight: 600, fontSize: '0.8rem',
          cursor: 'pointer', border: isActive ? 'none' : '1px solid var(--md-bw-outline)',
          paddingRight: showActions ? '32px' : '14px',
          transition: 'border-color var(--transition-fast), background var(--transition-fast)'
        }}>
        {cat.label}
      </button>
      {showActions && (
        <span style={{ position: 'absolute', right: '8px', display: 'flex', gap: '2px', alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setCatFormName(cat.label); setCatFormColor(cat.color); setShowCategoryModal(true) }}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--md-bw-on-surface)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <Pencil size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <Trash2 size={10} />
          </button>
        </span>
      )}
    </div>
  )
})}
```

- [ ] **Step 2: Add handleDeleteCategory function**

After `handleSaveCategory`, add:

```js
const handleDeleteCategory = (catId) => {
  const docsInCategory = documents.filter(d => d.category === catId)
  if (docsInCategory.length > 0) {
    if (!window.confirm(`"${getCategoryInfo(catId)?.label}" category has ${docsInCategory.length} document(s). Moving them to the first available category. Delete anyway?`)) return
    const remaining = categories.filter(c => c.id !== catId)
    const fallback = remaining.length > 0 ? remaining[0].id : 'other'
    setDocuments(prev => prev.map(d =>
      d.category === catId ? { ...d, category: fallback } : d
    ))
  } else {
    if (!window.confirm(`Delete "${getCategoryInfo(catId)?.label}" category?`)) return
  }
  setCategories(prev => prev.filter(c => c.id !== catId))
  if (selectedCategory === catId) setSelectedCategory('all')
  addToast('Category deleted', 'info')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Documents.jsx
git commit -m "feat: add hover-reveal edit/delete icons and delete handler"
```

---

### Task 4: Rename all CATEGORIES references & Verify

**Files:**
- Modify: `src/components/Documents.jsx` (renaming references)

- [ ] **Step 1: Replace all remaining CATEGORIES references with categories**

Search for `CATEGORIES` in the file (4 references in Upload modal and 1 in `getCategoryInfo` — already done in Task 1. Verify the Upload modal lines 318 and 319 use `categories` not `CATEGORIES`):

The Upload modal at line 318 should now read:
```jsx
{categories.map(cat => {
```

And the `filteredDocs` loop is already fine — it uses `selectedCategory`.

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: clean build (chunk size warning is pre-existing).

- [ ] **Step 3: Commit**

```bash
git add src/components/Documents.jsx
git commit -m "fix: rename CATEGORIES references, verify build"
```
