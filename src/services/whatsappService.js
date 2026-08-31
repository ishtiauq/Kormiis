/**
 * Free WhatsApp Notification Service for Kormiis HR
 * 
 * Supports:
 *  1. Automated Self-Hosted Gateway (Node.js microservice endpoint e.g., http://localhost:3001/api/send-whatsapp)
 *  2. Instant 1-Click Direct WhatsApp Links (https://wa.me/) for zero-server instant dispatch
 */

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
 * Template Generators for HR Events
 */

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

/**
 * Dispatch WhatsApp notification via automated gateway (or return fallback)
 */
export async function sendWhatsAppNotification({
  gatewayUrl,
  phone,
  message,
  companyName
}) {
  const cleanPhone = formatWhatsAppPhone(phone)
  const fallbackUrl = getWhatsAppDirectLink(cleanPhone, message)
  
  if (!cleanPhone) {
    return {
      success: false,
      error: 'Invalid or missing phone number.',
      fallbackUrl: null
    }
  }

  // If a gateway URL is configured, attempt automated REST dispatch
  if (gatewayUrl && gatewayUrl.trim()) {
    try {
      const endpoint = `${gatewayUrl.trim().replace(/\/+$/, '')}/api/send-whatsapp`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          message,
          companyName
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        return {
          success: true,
          mode: 'gateway',
          data,
          fallbackUrl
        }
      }

      console.warn('[WhatsApp Gateway Error]', data?.error || res.statusText)
      return {
        success: false,
        mode: 'gateway_failed',
        error: data?.error || `Gateway returned status ${res.status}`,
        fallbackUrl
      }
    } catch (err) {
      console.warn('[WhatsApp Gateway Network Error]', err.message)
      return {
        success: false,
        mode: 'network_error',
        error: err.message || 'Cannot reach WhatsApp gateway server.',
        fallbackUrl
      }
    }
  }

  // No gateway configured, return direct fallback
  return {
    success: false,
    mode: 'direct_only',
    error: 'No automated gateway server URL configured. Use 1-Click WhatsApp instead.',
    fallbackUrl
  }
}

/**
 * Send test ping to verify configuration
 */
export async function sendTestWhatsAppPing({
  gatewayUrl,
  phone,
  companyName = 'Kormiis Ltd.',
  adminName = 'Admin'
}) {
  const message = generateTestMessage({ companyName, adminName })
  return await sendWhatsAppNotification({
    gatewayUrl,
    phone,
    message,
    companyName
  })
}
