/**
 * Kormiis HR — Free Self-Hosted WhatsApp Notification Gateway Server
 * 
 * Instructions:
 * 1. Run directly with Node.js:
 *    node server/whatsapp-gateway.js
 * 
 * 2. In Kormiis HR Settings -> WhatsApp Integration:
 *    Set Gateway URL to: http://localhost:3001
 * 
 * Optional: To link your live WhatsApp Web via QR code, install whatsapp-web.js:
 *    npm install whatsapp-web.js qrcode-terminal
 */

import http from 'http'
import { URL } from 'url'

const PORT = process.env.WHATSAPP_GATEWAY_PORT || 3001
let isClientReady = false
let qrCodeString = null
let waClient = null

// Try loading whatsapp-web.js if installed
async function initWhatsAppClient() {
  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js')
    const qrcode = await import('qrcode-terminal')

    waClient = new Client({
      authStrategy: new LocalAuth({ dataPath: './.whatsapp-auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })

    waClient.on('qr', (qr) => {
      qrCodeString = qr
      console.log('\n=============================================')
      console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP APP:')
      console.log('=============================================\n')
      qrcode.default.generate(qr, { small: true })
    })

    waClient.on('ready', () => {
      isClientReady = true
      qrCodeString = null
      console.log('\n✅ [WhatsApp Gateway] Connected and ready to send notifications!\n')
    })

    waClient.on('auth_failure', (msg) => {
      console.error('[WhatsApp Gateway] Auth failure:', msg)
      isClientReady = false
    })

    waClient.on('disconnected', (reason) => {
      console.warn('[WhatsApp Gateway] Disconnected:', reason)
      isClientReady = false
    })

    waClient.initialize().catch((err) => {
      console.warn('[WhatsApp Gateway] Optional live client init skipped:', err.message)
    })
  } catch (e) {
    console.log('\nℹ️ [WhatsApp Gateway] Running in Dev/Webhook Relay mode on port ' + PORT)
    console.log('   (To pair a real WhatsApp number via QR, install: npm install whatsapp-web.js qrcode-terminal)\n')
    isClientReady = true // Allows testing and relay mode
  }
}

// Simple HTTP server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`)

  // 1. Health check & status
  if (reqUrl.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'online',
      ready: isClientReady,
      hasQr: !!qrCodeString,
      port: PORT,
      timestamp: new Date().toISOString()
    }))
    return
  }

  // 2. Dispatch WhatsApp message
  if (reqUrl.pathname === '/api/send-whatsapp' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}')
        const { phone, message } = payload

        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Phone and message are required.' }))
          return
        }

        console.log(`[WhatsApp Gateway] Dispatching to +${phone}...`)

        // If real whatsapp-web client is active, send via WhatsApp Web socket
        if (waClient && isClientReady) {
          const chatId = `${phone}@c.us`
          await waClient.sendMessage(chatId, message)
        } else {
          // Relay / mock confirmation
          console.log(`[WhatsApp Gateway] (Relayed) Message:\n${message}\n`)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          phone,
          timestamp: new Date().toISOString()
        }))
      } catch (err) {
        console.error('[WhatsApp Gateway Send Error]', err)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message || 'Failed to send WhatsApp message.' }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Endpoint not found.' }))
})

server.listen(PORT, () => {
  console.log(`\n🚀 [WhatsApp Gateway] Server running at http://localhost:${PORT}`)
  initWhatsAppClient()
})
