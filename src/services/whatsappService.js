/**
 * Kormiis HR — Free WhatsApp Notification Service (Tier 1, 1-Click wa.me)
 *
 * No Blaze, no Cloud Functions, no Meta API tokens required.
 *
 * How it works:
 *   - HR events call `queueWhatsAppMessages({ items })` exactly as before.
 *   - Instead of writing to a Firestore outbox that a Cloud Function sends,
 *     we persist a small pending queue (localStorage) and raise a window event
 *     that the global <WhatsAppQueueModal /> listens for.
 *   - The modal walks the HR user through each recipient one-by-one with a real
 *     user gesture (window.open to wa.me), so browser popup blockers and
 *     WhatsApp spam-rate-limiters are never triggered.
 *   - Every delivery attempt is appended to `companies/{id}/snapshots/wa_log`
 *     (Option A) so HR keeps a delivery log at zero cost.
 *   - Opt-in gate: recipients who have not messaged the company WhatsApp number
 *     yet are flagged and handed a one-tap wa.me "START" link instead of being
 *     blasted — keeps WhatsApp ban risk effectively zero.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Window event raised whenever a WhatsApp queue is ready to be sent.
export const WA_QUEUE_EVENT = 'kormiis:wa-queue'

// localStorage keys
const WA_PENDING_KEY = 'kormiis_wa_pending'

// Events that only HR/Admin may trigger from the client.
const EVENT_REQUIRES_ADMIN = {
  leave: true,
  payroll: true,
  announcement: true,
  shift_swap: true,
  overtime: true,
  task: true,
  attendance: true,
  custom: true,
}

// ---------------------------------------------------------------------------
// Phone helpers
// ---------------------------------------------------------------------------

/**
 * Format and normalize phone number for WhatsApp (E.164 without leading + or 0)
 * Defaults to Bangladesh (+880) if no country code provided, but works globally.
 */
export function formatWhatsAppPhone(phone, defaultCountryCode = '880') {
  if (!phone) return ''

  // Remove spaces, hyphens, brackets, and +
  let cleaned = String(phone).replace(/[^\d]/g, '')

  // If it starts with 0 (e.g. 01712345678), replace leading 0 with default country code
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = defaultCountryCode + cleaned.substring(1)
  }

  return cleaned
}

/**
 * Generate 1-Click direct WhatsApp Web/Mobile URL
 */
export function getWhatsAppDirectLink(phone, message) {
  const cleanPhone = formatWhatsAppPhone(phone)
  if (!cleanPhone) return ''
  const encodedText = encodeURIComponent(message || '')
  return `https://wa.me/${cleanPhone}?text=${encodedText}`
}

/**
 * Open WhatsApp directly in a new browser tab/window
 */
export function openWhatsAppDirect(phone, message) {
  const url = getWhatsAppDirectLink(phone, message)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/**
 * Link a customer (employee) directly to the company's WhatsApp number with a
 * pre-filled "START" message — this is how employees opt in. Provide the
 * company's WhatsApp Business phone number.
 */
export function getWhatsAppOptInLink(businessPhone, companyName = '') {
  const cleanPhone = formatWhatsAppPhone(businessPhone)
  if (!cleanPhone) return ''
  const text = encodeURIComponent(
    companyName
      ? `START — I'd like to receive HR updates from ${companyName} on WhatsApp.`
      : 'START'
  )
  return `https://wa.me/${cleanPhone}?text=${text}`
}

// ---------------------------------------------------------------------------
// Template Generators for HR Events
// ---------------------------------------------------------------------------

export function generateLeaveStatusMessage({
  employeeName,
  companyName = 'Kormiis HR',
  leaveType = 'Leave',
  startDate,
  endDate,
  status = 'Approved',
  reason,
  remarks
}) {
  const isApproved = status.toLowerCase() === 'approved'
  const emoji = isApproved ? '✅' : '❌'
  
  return `*${emoji} Leave Request ${status.toUpperCase()}*

Hello *${employeeName || 'Team Member'}*,
Your leave request has been *${status}* by the management at *${companyName}*.

📋 *Details:*
• *Type:* ${leaveType}
• *Duration:* ${startDate}${endDate && endDate !== startDate ? ` to ${endDate}` : ''}
${reason ? `• *Reason:* ${reason}\n` : ''}${remarks ? `• *Admin Note:* ${remarks}\n` : ''}
You can review your updated leave balance on your *Kormiis Employee Portal*.

_This is an automated notification from ${companyName}._`
}

export function generatePayrollSlipMessage({
  employeeName,
  companyName = 'Kormiis HR',
  monthYear,
  netSalary,
  basic,
  allowances,
  deductions,
  currency = 'BDT'
}) {
  return `*💰 Salary Statement for ${monthYear || 'This Month'}*

Hello *${employeeName || 'Team Member'}*,
Your monthly payroll has been processed and disbursed by *${companyName}*.

🧾 *Earnings Breakdown:*
${basic ? `• *Basic Salary:* ${currency} ${Number(basic).toLocaleString()}\n` : ''}${allowances ? `• *Allowances/Bonus:* +${currency} ${Number(allowances).toLocaleString()}\n` : ''}${deductions ? `• *Deductions:* -${currency} ${Number(deductions).toLocaleString()}\n` : ''}
*💵 Net Take-Home:* *${currency} ${Number(netSalary || 0).toLocaleString()}*

You can download your official PDF pay-slip anytime from your *Kormiis Portal*.

_Thank you for your hard work! ✨_`
}

export function generateAnnouncementMessage({
  companyName = 'Kormiis HR',
  title,
  category = 'General',
  content,
  publishedBy
}) {
  return `*📢 Notice: ${title}*

*${companyName}* has posted a new announcement under _#${category}_:

"${content ? (content.length > 300 ? content.substring(0, 300) + '...' : content) : ''}"

${publishedBy ? `_Posted by: ${publishedBy}_\n` : ''}
Log in to *Kormiis HR* to view the full announcement and discuss. 🚀`
}

export function generateAttendanceAlertMessage({
  employeeName,
  companyName = 'Kormiis HR',
  date,
  type = 'Check-in Reminder',
  message
}) {
  return `*⏰ Attendance Alert: ${type}*

Hello *${employeeName || 'Team Member'}*,
${message || `This is a reminder regarding your attendance for ${date || 'today'}.`}

Please make sure to log your attendance in the *Kormiis App*.

_– ${companyName} HR Operations_`
}

export function generateShiftSwapMessage({
  employeeName,
  companyName = 'Kormiis HR',
  date,
  status = 'Approved',
  reason
}) {
  const emoji = status.toLowerCase() === 'approved' ? '✅' : '❌'
  return `*${emoji} Shift Swap ${status.toUpperCase()}*

Hello *${employeeName || 'Team Member'}*,
Your shift swap request for *${date || 'the requested date'}* has been *${status}* by HR at *${companyName}*.

${reason ? `📝 *Reason:* ${reason}\n` : ''}
_This is an automated notification from ${companyName}._`
}

export function generateOvertimeMessage({
  employeeName,
  companyName = 'Kormiis HR',
  date,
  hours,
  status = 'Approved',
  reason
}) {
  const emoji = status.toLowerCase() === 'approved' ? '✅' : '❌'
  return `*${emoji} Overtime ${status.toUpperCase()}*

Hello *${employeeName || 'Team Member'}*,
Your overtime claim for *${date || 'the requested date'}* (${hours || ''}h) has been *${status}* at *${companyName}*.

${reason ? `📝 *Reason:* ${reason}\n` : ''}
_This is an automated notification from ${companyName}._`
}

export function generateTaskAssignedMessage({
  employeeName,
  companyName = 'Kormiis HR',
  taskTitle,
  dueDate,
  priority = 'Medium',
  assignedBy
}) {
  return `*📋 New Task Assigned*

Hello *${employeeName || 'Team Member'}*,
You have been assigned a new task at *${companyName}*:

• *Task:* "${taskTitle || 'Untitled Task'}"
${priority ? `• *Priority:* ${priority}\n` : ''}${dueDate ? `• *Due:* ${dueDate}\n` : ''}
${assignedBy ? `_Assigned by: ${assignedBy}_\n` : ''}
Please log in to your *Kormiis Portal* to start working on it.`
}

export function generateTestMessage({
  companyName = 'Kormiis HR',
  adminName = 'Admin'
}) {
  const timestamp = new Date().toLocaleString()
  return `*🎉 WhatsApp Integration Verified!*

Hello *${adminName}*,
Your WhatsApp notification system for *${companyName}* is configured and operational!

📅 *Timestamp:* ${timestamp}
✨ *Status:* Active & Connected

Automated updates for Leaves, Payroll, and Announcements will now be dispatched seamlessly.`
}

// ---------------------------------------------------------------------------
// Local state helpers
// ---------------------------------------------------------------------------

function getLocalUser() {
  try {
    return JSON.parse(localStorage.getItem('kormiis_user')) || null
  } catch {
    return null
  }
}

function getCompanyUid(user) {
  if (user?.companyUid) return user.companyUid
  if (user?.uid) return user.uid
  const local = getLocalUser()
  return local?.companyUid || local?.uid || ''
}

// ---------------------------------------------------------------------------
// Opt-in gate (snapshots/wa_optins) — keeps ban risk at zero
// ---------------------------------------------------------------------------

async function readWaOptins(companyUid) {
  try {
    const { fetchTableFromFirestore } = await import('./bridge.js')
    const optins = await fetchTableFromFirestore(companyUid, 'wa_optins')
    return optins && typeof optins === 'object' ? optins : {}
  } catch (e) {
    console.warn('[WhatsApp] Could not read opt-ins:', e)
    return {}
  }
}

function isOptedIn(optins, phone) {
  const record = optins[phone]
  return !!(record && (record.optedIn === true || record.optedIn === 'true'))
}

// ---------------------------------------------------------------------------
// Delivery log (Option A — snapshots/wa_log, zero server cost)
// ---------------------------------------------------------------------------

/**
 * Append one delivery-log entry to companies/{companyId}/snapshots/wa_log.
 * Uses the existing snapshots/{document=**} rule (admin/member write allowed).
 */
export async function logWhatsAppDelivery(companyUid, entry) {
  if (!companyUid) return { success: false, error: 'No workspace linked.' }
  try {
    const { fetchTableFromFirestore, writeToTable } = await import('./bridge.js')
    const current = (await fetchTableFromFirestore(companyUid, 'wa_log')) || []
    const list = Array.isArray(current) ? current : []
    const record = {
      id: entry.id || `wa-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      phone: entry.phone || '',
      employeeName: entry.employeeName || '',
      event: entry.event || 'custom',
      message: entry.message || '',
      status: entry.status || 'opened',
      sentAt: new Date().toISOString(),
      createdBy: entry.createdBy || '',
      createdByRole: entry.createdByRole || '',
    }
    await writeToTable(companyUid, 'wa_log', [record, ...list].slice(0, 200))
    return { success: true, id: record.id }
  } catch (e) {
    console.warn('[WhatsApp Log Error]', e)
    return { success: false, error: e.message }
  }
}

/**
 * Read the delivery log from the snapshots/wa_log table.
 */
export async function fetchWhatsAppLog(companyUid) {
  if (!companyUid) return { success: false, error: 'No workspace linked.' }
  try {
    const { fetchTableFromFirestore } = await import('./bridge.js')
    const list = (await fetchTableFromFirestore(companyUid, 'wa_log')) || []
    return { success: true, data: { list: Array.isArray(list) ? list : [], stats: {} } }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * Read the opt-in registry (snapshots/wa_optins) — who has opened the free
 * window by messaging the company number at least once.
 */
export async function fetchWhatsAppOptins(companyUid) {
  if (!companyUid) return { success: false, error: 'No workspace linked.' }
  const optins = await readWaOptins(companyUid)
  return { success: true, data: { optins, count: Object.keys(optins).length } }
}

// ---------------------------------------------------------------------------
// Queue + dispatch (Tier 1 — 1-Click wa.me wizard)
// ---------------------------------------------------------------------------

/**
 * Queue one or more WhatsApp messages for the 1-Click delivery wizard.
 * No Firestore outbox write, no Cloud Function. Raises `WA_QUEUE_EVENT` that
 * the global <WhatsAppQueueModal /> handles.
 *
 * items: [{ phone, employeeName, event, message }]
 */
export async function queueWhatsAppMessages({ companyUid, user, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'No messages to queue.' }
  }

  const local = user || getLocalUser()
  const cUid = companyUid || getCompanyUid(local)
  if (!cUid) {
    return { success: false, error: 'Not connected to a workspace.' }
  }

  const isAdminUser = ['Admin', 'HR'].includes(local?.role) || (local?.uid && local?.uid === cUid)
  const role = isAdminUser ? 'Admin' : (local?.role || 'Teammate')

  // Gate against events only HR/Admin may trigger.
  const unauthorized = items.filter(
    (item) => EVENT_REQUIRES_ADMIN[item.event] !== false && !isAdminUser
  )
  if (unauthorized.length) {
    return { success: false, error: 'Only HR/Admin can trigger WhatsApp notifications.' }
  }

  const optins = await readWaOptins(cUid)

  const validItems = []
  for (const item of items) {
    const phone = formatWhatsAppPhone(item.phone)
    if (!phone) continue
    validItems.push({
      phone,
      employeeName: item.employeeName || '',
      event: item.event || 'custom',
      message: item.message,
      link: getWhatsAppDirectLink(phone, item.message),
      optedIn: isOptedIn(optins, phone),
      createdBy: local?.uid || local?.id || '',
      createdByRole: role,
    })
  }

  if (validItems.length === 0) {
    return { success: false, error: 'No valid phone numbers to notify.' }
  }

  const queue = {
    queueId: `waq-${Date.now()}`,
    createdAt: new Date().toISOString(),
    companyUid: cUid,
    items: validItems,
    total: validItems.length,
  }

  // Persist so a page refresh can resume the wizard.
  try {
    localStorage.setItem(WA_PENDING_KEY, JSON.stringify(queue))
  } catch {
    // storage full — still dispatch in-memory
  }

  // Notify the global wizard modal.
  try {
    window.dispatchEvent(new CustomEvent(WA_QUEUE_EVENT, { detail: queue }))
  } catch {
    // no-op when dispatched in non-DOM environments
  }

  return {
    success: true,
    queued: validItems.length,
    failed: 0,
    queueId: queue.queueId,
    total: validItems.length,
    notOptedIn: validItems.filter((i) => !i.optedIn).length,
    results: validItems.map((i) => ({ ...i, success: true })),
  }
}

/**
 * Resume a previously persisted queue after a page refresh.
 */
export function getPendingWhatsAppQueue() {
  try {
    const raw = localStorage.getItem(WA_PENDING_KEY)
    if (!raw) return null
    const queue = JSON.parse(raw)
    return queue && Array.isArray(queue.items) ? queue : null
  } catch {
    return null
  }
}

export function clearPendingWhatsAppQueue() {
  try {
    localStorage.removeItem(WA_PENDING_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Legacy stubs — kept so old references fail gracefully instead of crashing
// ---------------------------------------------------------------------------

export async function sendWhatsAppNotification() {
  return {
    success: false,
    mode: 'legacy',
    error: 'Legacy gateway dispatch removed. Use queueWhatsAppMessages instead.',
  }
}

export async function sendTestWhatsAppPing() {
  return {
    success: false,
    mode: 'legacy',
    error: 'Legacy gateway dispatch removed. Use the Settings Test button instead.',
  }
}