import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'resend-dev-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/send-email', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            res.end()
            return
          }
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const token = parsed.apiKey || process.env.VITE_RESEND_API_KEY
                const response = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token?.trim()}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: parsed.from || 'Kormiis <onboarding@resend.dev>',
                    to: Array.isArray(parsed.to) ? parsed.to : [parsed.to],
                    subject: parsed.subject,
                    html: parsed.html,
                    text: parsed.text,
                  }),
                })
                const data = await response.json()
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.statusCode = response.status
                res.end(JSON.stringify(data))
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(JSON.stringify({ message: e.message }))
              }
            })
          }
        })
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,jpg,jpeg,webp,woff2,ico}'],
        globIgnores: ['**/Hero Assets.png', '**/screenshot-*.jpg'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'Kormiis',
        short_name: 'Kormiis',
        description: 'Kormiis',
        theme_color: '#F8F9FA',
        icons: [
          {
            src: 'logo.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'Kormiis Monogram Logo 192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'Kormiis Monogram Logo 512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-desktop.jpg',
            sizes: '1024x1024',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Desktop Dashboard'
          },
          {
            src: 'screenshot-mobile.jpg',
            sizes: '1024x1024',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Mobile Dashboard'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/firestore') || id.includes('firebase/storage') || id.includes('webchannel-wrapper')) {
              return 'vendor-firestore'
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
          }
        }
      }
    }
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
})