import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Firebase Cloud Messaging — background push (app closed / another tab).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  initializeApp(firebaseConfig)
  const messaging = getMessaging()

  onBackgroundMessage(messaging, (payload) => {
    const data = payload.data || {}
    const title = (payload.notification && payload.notification.title) || data.title || 'Kormiis'
    const body = (payload.notification && payload.notification.body) || data.body || 'You have a new notification'
    const url = data.url || '/'
    const icon = (payload.notification && payload.notification.icon) || '/Kormiis Monogram Logo 192.png'

    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/Kormiis Monogram Logo 192.png',
      tag: data.category || 'kormiis',
      renotify: true,
      data: { url },
    })
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          if ('focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return clients.openWindow(url)
      })
    )
  })
}

self.skipWaiting()
self.clientsClaim()