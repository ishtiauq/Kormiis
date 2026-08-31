# Payroll Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-card Payroll settings (Currency + Split Viz + Components List with sliders) with a cleaner two-card layout: Currency + Salary Structure with donut chart and type toggle buttons.

**Architecture:** Single-task change to `renderSettingsContent` in `src/components/Settings.jsx`. Replace the `case 'payroll'` return JSX. Keep all state, handlers, and derived values unchanged. Add a donut chart using recharts (already a dependency). Remove the slider, sample gross input, and type dropdown.

**Tech Stack:** React, recharts (PieChart), inline styles.

## Global Constraints

- Keep all existing state variables, handlers, and derived values unchanged
- Use recharts `PieChart` + `Pie` for the donut chart (already in package.json dependencies)
- Import `PieChart, Pie, Cell, ResponsiveContainer` from recharts
- Use existing `SEG_COLORS` and `getSegmentColor` for chart coloring
- Only modify the `case 'payroll'` return JSX inside `renderSettingsContent`

---

### Task 1: Redesign Payroll Settings Section

**Files:**
- Modify: `src/components/Settings.jsx` — only the `case 'payroll'` return block in `renderSettingsContent` (currently lines 165-266)

- [ ] **Step 1: Add recharts import**

Add to the import at the top of `src/components/Settings.jsx` (line 2):
```jsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
```

- [ ] **Step 2: Replace the `case 'payroll'` return block**

Replace the entire `case 'payroll': return (...)` block (currently starting at line 165) with:

```jsx
case 'payroll': return (
  <div className="payroll-settings-grid">
    {/* Currency Setup */}
    <div style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h4 className="title-medium" style={{ margin: 0, color: 'var(--md-bw-on-surface)' }}>Currency Setup</h4>
      <p className="body-small" style={{ color: 'var(--md-bw-on-surface-variant)', margin: 0 }}>Select the currency symbol applied globally across dashboards and receipts.</p>
      <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
        <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...pSel }}>
          <option value="$">$ (USD)</option>
          <option value="৳">৳ (BDT)</option>
          <option value="€">€ (EUR)</option>
          <option value="£">£ (GBP)</option>
          <option value="₹">₹ (INR)</option>
          <option value="¥">¥ (JPY)</option>
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--md-bw-on-surface-variant)' }} />
      </div>
    </div>

    {/* Salary Structure */}
    <div style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 className="title-medium" style={{ margin: 0, color: 'var(--md-bw-on-surface)' }}>Salary Structure</h4>
        <button onClick={handleAddComponent} className="btn btn-outlined" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12px' }}>
          <Plus size={14} /> Add Component
        </button>
      </div>

      {isOver100 && (
        <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '100px', color: 'var(--md-bw-on-surface)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <Info size={16} /> Component total exceeds 100%. Please adjust before saving.
        </div>
      )}

      {/* Donut Chart */}
      {salaryStructure.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={salaryStructure.map(item => ({ ...item, value: item.percentage }))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {salaryStructure.map((item, index) => (
                  <Cell key={item.id} fill={getSegmentColor(item, index)} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Component List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {salaryStructure.length === 0 ? (
          <span className="body-medium" style={{ color: 'var(--md-bw-on-surface-variant)', textAlign: 'center', padding: '20px 0' }}>
            No salary components configured. Click "Add Component" to get started.
          </span>
        ) : (
          salaryStructure.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
              background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)',
            }}>
              <input type="text" value={item.name} onChange={e => handleComponentChange(item.id, 'name', e.target.value)}
                placeholder="Component name"
                style={{ flex: 1, minWidth: '120px', ...pInp, padding: '8px 12px', fontSize: '13px' }} />

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => handleComponentChange(item.id, 'type', 'earning')}
                  style={{
                    padding: '6px 12px', borderRadius: '100px', border: '1px solid',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: item.type === 'earning' ? '#0062E6' : 'transparent',
                    color: item.type === 'earning' ? '#fff' : 'var(--md-bw-on-surface-variant)',
                    borderColor: item.type === 'earning' ? '#0062E6' : 'var(--glass-border)',
                  }}>Earning</button>
                <button onClick={() => handleComponentChange(item.id, 'type', 'deduction')}
                  style={{
                    padding: '6px 12px', borderRadius: '100px', border: '1px solid',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: item.type === 'deduction' ? '#dc3545' : 'transparent',
                    color: item.type === 'deduction' ? '#fff' : 'var(--md-bw-on-surface-variant)',
                    borderColor: item.type === 'deduction' ? '#dc3545' : 'var(--glass-border)',
                  }}>Deduction</button>
              </div>

              <div style={{ position: 'relative', width: '70px', flexShrink: 0 }}>
                <input type="number" min="0" max="100" value={item.percentage}
                  onChange={e => handleComponentChange(item.id, 'percentage', Number(e.target.value))}
                  style={{ ...pInp, padding: '8px 10px', fontSize: '13px', textAlign: 'center', paddingRight: '20px' }} />
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--md-bw-on-surface-variant)', pointerEvents: 'none' }}>%</span>
              </div>

              <button onClick={() => handleRemoveComponent(item.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--md-bw-on-surface-variant)', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Net Earning Ratio */}
      {salaryStructure.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <span className="body-medium" style={{ color: 'var(--md-bw-on-surface)', fontWeight: 600 }}>Net Earning Ratio</span>
          <span className="body-medium" style={{
            color: netPayPercent >= 0 ? 'var(--md-bw-on-surface)' : '#dc3545',
            fontVariantNumeric: 'tabular-nums', fontWeight: 700,
          }}>{netPayPercent}%</span>
        </div>
      )}
    </div>
  </div>
)
```

- [ ] **Step 3: Verify the file compiles**

Run: `cmd /c "npm run dev"` in the project root.
Expected: Vite starts without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings.jsx
git commit -m "refactor: redesign payroll settings with donut chart and type toggles"
```
