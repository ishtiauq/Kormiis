/**
 * Resend Email Integration Service
 * Dispatches transactional emails (invites, credential delivery, digests) via Resend API
 */

export async function sendResendEmail({ apiKey, from, to, subject, html, text }) {
  if (!apiKey) {
    console.warn('[Resend] API key missing. Email not sent.')
    return { success: false, error: 'Resend API key is not configured.' }
  }

  const recipients = Array.isArray(to) ? to : [to]
  if (!recipients.length || !recipients[0]) {
    return { success: false, error: 'No recipient email address provided.' }
  }

  const sender = from || 'Kormiis <onboarding@resend.dev>'

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        from: sender,
        to: recipients,
        subject,
        html,
        text: text || subject,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[Resend Error]', data)
      return { success: false, error: data?.message || data?.error || 'Failed to dispatch email via Resend.' }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[Resend Network Error]', err)
    return { success: false, error: err.message || 'Network error communicating with Resend.' }
  }
}

/**
 * Generate Apple Liquid Glass styled HTML template for Employee Onboarding Invite
 */
export function generateInviteEmailHtml({ companyName = 'Kormiis Ltd.', employeeName, email, inviteLink, temporaryPassword }) {
  const currentYear = new Date().getFullYear()
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);" cellpadding="0" cellspacing="0">
          
          <!-- Header Accent Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #FE3501 0%, #ff5e36 100%); padding: 36px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to ${companyName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your workspace portal is ready for you</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #334155;">
                Hello <strong>${employeeName || 'there'}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #475569;">
                You have been invited to join the <strong>${companyName}</strong> team workspace on Kormiis HR. You can now access your attendance, shift schedules, leave requests, and payroll statements.
              </p>

              <!-- Credentials Box -->
              <table width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 28px;" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px;">Your Login Credentials</div>
                    <div style="font-size: 14px; margin-bottom: 8px; color: #1e293b;">
                      <strong>Work Email:</strong> <span style="color: #2563eb;">${email}</span>
                    </div>
                    ${temporaryPassword ? `
                    <div style="font-size: 14px; color: #1e293b;">
                      <strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a;">${temporaryPassword}</code>
                    </div>
                    ` : `
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                      You can log in directly using your <strong>Google Account</strong> or existing password.
                    </div>
                    `}
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteLink || 'https://kormiis.vercel.app'}" target="_blank" style="display: inline-block; background-color: #FE3501; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 14px; box-shadow: 0 4px 14px rgba(254,53,1,0.35);">
                  Accept Invite & Sign In →
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center; margin: 0;">
                If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${inviteLink || 'https://kormiis.vercel.app'}" style="color: #64748b; word-break: break-all;">${inviteLink || 'https://kormiis.vercel.app'}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © ${currentYear} ${companyName}. Powered by Kormiis HR OS.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Dispatch Employee Workspace Invitation
 */
export async function sendEmployeeInviteEmail({ apiKey, fromEmail, companyName, employee, inviteLink, temporaryPassword }) {
  if (!apiKey || !employee?.email) return { success: false, error: 'API key or employee email is missing.' }

  const subject = `Welcome to ${companyName || 'the Team'}! Your workspace invite is ready`
  const html = generateInviteEmailHtml({
    companyName,
    employeeName: employee.name || employee.fullName,
    email: employee.email,
    inviteLink,
    temporaryPassword,
  })

  return await sendResendEmail({
    apiKey,
    from: fromEmail || (companyName ? `${companyName} <onboarding@resend.dev>` : 'Kormiis HR <onboarding@resend.dev>'),
    to: employee.email,
    subject,
    html,
  })
}

/**
 * Dispatch Test Verification Email
 */
export async function sendTestEmail({ apiKey, fromEmail, recipientEmail, companyName = 'Kormiis Ltd.' }) {
  if (!apiKey || !recipientEmail) return { success: false, error: 'API key or recipient email is missing.' }

  const subject = `[Test] Resend Email Integration Verified for ${companyName}`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 30px; background-color: #f8fafc; color: #1e293b;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="color: #FE3501; font-weight: 800; font-size: 22px; margin-bottom: 12px;">🎉 Resend Integration Working!</div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Congratulations! Your <strong>Resend</strong> transactional email API is successfully configured for <strong>${companyName}</strong>.
        </p>
        <p style="font-size: 13px; color: #64748b;">
          New employees will now automatically receive automated onboarding invitations and temporary login passwords directly in their inbox.
        </p>
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          Sent from Kormiis HR Pulse System
        </div>
      </div>
    </div>
  `

  return await sendResendEmail({
    apiKey,
    from: fromEmail || (companyName ? `${companyName} <onboarding@resend.dev>` : 'Kormiis HR <onboarding@resend.dev>'),
    to: recipientEmail,
    subject,
    html,
  })
}
