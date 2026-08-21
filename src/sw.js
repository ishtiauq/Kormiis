import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Push Notification Listener (Receives payload when app is closed / in background)
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'You have a new update in Kormiis' }
  }

  const title = data.title || 'Kormiis HR'
  const options = {
    body: data.body || 'New notification received',
    icon: data.icon || '/Kormiis Monogram Logo 192.png',
    badge: data.badge || '/Kormiis Monogram Logo 192.png',
    vibrate: [150, 50, 150],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open' }
    ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification Click Handler (Focuses existing app tab or opens new window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (targetUrl && 'navigate' in client && !client.url.includes(targetUrl)) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})