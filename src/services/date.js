// Normalises the many shapes a date can arrive in (ISO string, date-only
// string, Date, epoch number, Firestore Timestamp) into a Date instance.
function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    return new Date(value.includes('T') ? value : `${value}T00:00:00`)
  }
  return new Date(value)
}

function validDate(value) {
  const d = toDate(value)
  return d && !isNaN(d.getTime()) ? d : null
}

export function formatDate(dateStr) {
  const d = validDate(dateStr)
  if (!d) return '--'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  const d = validDate(dateStr)
  if (!d) return '--'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function formatDateWithWeekday(dateStr) {
  const d = validDate(dateStr)
  if (!d) return '--'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDateTime(dateStr) {
  const d = validDate(dateStr)
  if (!d) return '--'
  return d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatMonthYear(dateStr) {
  const d = validDate(dateStr)
  if (!d) return '--'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function getRelativeTime(dateStr) {
  const d = validDate(dateStr)
  if (!d) return ''
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}
