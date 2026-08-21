/**
 * Vercel Serverless Function: /api/send-email
 * Proxies email sending to Resend REST API securely to avoid browser CORS restrictions
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { apiKey, from, to, subject, html, text } = body

    const token = apiKey || process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY
    if (!token) {
      return res.status(400).json({ message: 'Resend API Key is required.' })
    }

    const recipients = Array.isArray(to) ? to : [to]
    if (!recipients.length || !recipients[0]) {
      return res.status(400).json({ message: 'Recipient email is required.' })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Kormiis <onboarding@resend.dev>',
        to: recipients,
        subject: subject || 'Notification from Kormiis HR',
        html,
        text: text || subject,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Send Email Error:', error)
    return res.status(500).json({ message: error.message || 'Internal server error dispatching email.' })
  }
}
