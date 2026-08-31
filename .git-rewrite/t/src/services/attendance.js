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
