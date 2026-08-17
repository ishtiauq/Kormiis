import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'Kormiis Monogram Logo 192.png', 'Kormiis Monogram Logo 512.png', 'screenshot-desktop.jpg', 'screenshot-mobile.jpg'],
      devOptions: {
        enabled: false
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
  server: {
    watch: {
      usePolling: true,
    },
  },
})