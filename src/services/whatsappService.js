/**
 * Kormiis HR — Free WhatsApp Notification Service (Meta Cloud API, 24h window)
 *
 * Mode: "Free only".
 *   - The client queues messages by writing to the Firestore outbox:
 *       companies/{companyId}/wa_outbox/{msgId}
 *   - A Cloud Function sends them ONLY within the employee's free 24h window
 *     (after the employee has messaged the company's WhatsApp number).
 *     Out-of-window messages are parked and auto-send when the window reopens.
 *   - 1-Click wa.me links remain as an always-free manual fallback.
 */

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
 * pre-filled "START" message — this is how employees opt in / open the free
 * 24h window. Provide the company's WhatsApp Business phone number.
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
// Firestore outbox queue (Free 24h-window mode)
// ---------------------------------------------------------------------------

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

/**
 * Queue one or more WhatsApp messages for delivery within each recipient's
 * free 24h window. Messages are parked server-side until the window opens.
 *
 * items: [{ phone, employeeName, event, message }]
 */
export async function queueWhatsAppMessages({ companyUid, user, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'No messages to queue.' }
  }

  let db = null
  let collection = null
  let addDoc = null
  let serverTimestamp = null
  try {
    const fb = await import('./firebase.js')
    db = fb.db
    collection = fb.collection
    addDoc = fb.addDoc
    serverTimestamp = fb.serverTimestamp
  } catch (e) {
    return { success: false, error: 'Firebase not available: ' + e.message }
  }

  const local = user || getLocalUser()
  const cUid = companyUid || getCompanyUid(local)
  if (!db || !cUid) {
    return { success: false, error: 'Not connected to a workspace.' }
  }

  const isAdminUser = ['Admin', 'HR'].includes(local?.role) || (local?.uid && local?.uid === cUid)
  const role = isAdminUser ? 'Admin' : (local?.role || 'Teammate')

  const results = []
  for (const item of items) {
    const phone = formatWhatsAppPhone(item.phone)
    if (!phone) {
      results.push({ ...item, success: false, error: 'Invalid or missing phone number.' })
      continue
    }
    try {
      const docRef = await addDoc(collection(db, 'companies', cUid, 'wa_outbox'), {
        phone,
        employeeName: item.employeeName || '',
        event: item.event || 'custom',
        message: item.message,
        requiresAdmin: EVENT_REQUIRES_ADMIN[item.event] !== false,
        createdBy: local?.uid || local?.id || '',
        createdByRole: role,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      results.push({ ...item, success: true, id: docRef.id, phone })
    } catch (err) {
      console.warn('[WhatsApp Outbox Error]', err)
      results.push({ ...item, success: false, error: err.message, phone })
    }
  }

  const okCount = results.filter(r => r.success).length
  return {
    success: okCount > 0,
    queued: okCount,
    failed: results.length - okCount,
    results,
  }
}

// ---------------------------------------------------------------------------
// Cloud Function callers (config / test / delivery log)
// ---------------------------------------------------------------------------

let _waFns = null
async function getWaFns() {
  if (_waFns) return _waFns
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('./firebaseCore.js')
  const functions = getFunctions(app, 'asia-south1')
  _waFns = {
    getWhatsAppSetupInfo: httpsCallable(functions, 'getWhatsAppSetupInfo'),
    saveWhatsAppConfig: httpsCallable(functions, 'saveWhatsAppConfig'),
    verifyWhatsAppConfig: httpsCallable(functions, 'verifyWhatsAppConfig'),
    disconnectWhatsApp: httpsCallable(functions, 'disconnectWhatsApp'),
    testWhatsApp: httpsCallable(functions, 'testWhatsApp'),
    getWhatsAppLog: httpsCallable(functions, 'getWhatsAppLog'),
  }
  return _waFns
}

async function callWhatsAppFn(name, data) {
  const fns = await getWaFns()
  const res = await fns[name](data || {})
  return res.data
}

export async function getWhatsAppSetupInfo() {
  try {
    return { success: true, data: await callWhatsAppFn('getWhatsAppSetupInfo') }
  } catch (e) {
    return { success: false, error: (e.message || '').replace(/^.*\.googleapis\.com\//, '') }
  }
}

export async function saveWhatsAppConfig({ phoneNumberId, wabaId, accessToken, appSecret }) {
  try {
    const data = await callWhatsAppFn('saveWhatsAppConfig', {
      phoneNumberId: String(phoneNumberId || '').trim(),
      wabaId: String(wabaId || '').trim(),
      accessToken: String(accessToken || '').trim(),
      appSecret: String(appSecret || '').trim(),
    })
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e.message || 'Connection failed.').replace(/^.*\.googleapis\.com\//, '') }
  }
}

export async function verifyWhatsAppConfig() {
  try {
    return { success: true, data: await callWhatsAppFn('verifyWhatsAppConfig') }
  } catch (e) {
    return { success: false, error: (e.message || '').replace(/^.*\.googleapis\.com\//, '') }
  }
}

export async function disconnectWhatsApp() {
  try {
    return { success: true, data: await callWhatsAppFn('disconnectWhatsApp') }
  } catch (e) {
    return { success: false, error: (e.message || '').replace(/^.*\.googleapis\.com\//, '') }
  }
}

export async function testWhatsApp({ phone, adminName }) {
  try {
    const data = await callWhatsAppFn('testWhatsApp', { phone, adminName })
    return { success: !!data.ok, data }
  } catch (e) {
    return { success: false, error: (e.message || '').replace(/^.*\.googleapis\.com\//, '') }
  }
}

export async function fetchWhatsAppLog() {
  try {
    const data = await callWhatsAppFn('getWhatsAppLog')
    return { success: true, data }
  } catch (e) {
    return { success: false, error: (e.message || '').replace(/^.*\.googleapis\.com\//, '') }
  }
}

/**
 * Read the server-written WhatsApp status snapshot (connected state).
 */
export async function fetchWhatsAppStatus(companyUid) {
  try {
    const { fetchTableFromFirestore } = await import('./bridge.js')
    const status = await fetchTableFromFirestore(companyUid, 'wa_status')
    return { success: true, status }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * Subscribe to live updates of the WhatsApp status snapshot.
 * Returns an unsubscribe function.
 */
export async function subscribeWhatsAppStatus(companyUid, onData) {
  const { subscribeToTable } = await import('./bridge.js')
  if (!companyUid) return () => {}
  return subscribeToTable(companyUid, 'wa_status', onData)
}

// Backward-compatible legacy exports kept so the wa.me manual fallback paths
// still work where referenced.
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
    error: 'Legacy gateway dispatch removed. Use testWhatsApp instead.',
  }
}