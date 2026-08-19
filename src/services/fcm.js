import { getToken, onMessage, deleteToken } from 'firebase/messaging'
import { messaging, functions, httpsCallable, FCM_VAPID_KEY } from './firebase.js'
import { showSystemNotification } from './pushNotifications.js'

const TOKEN_KEY = 'kormiis_fcm_token'

let fcmReady = false
export function isFcmAvailable() {
  return Boolean(messaging && FCM_VAPID_KEY && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator)
}

export function getCachedFcmToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export async function getFcmToken() {
  if (!isFcmAvailable()) return ''
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return ''
    const reg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    })
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      return token
    }
    return ''
  } catch (e) {
    console.error('FCM getToken failed:', e)
    return ''
  }
}

export async function clearFcmToken() {
  const token = getCachedFcmToken()
  if (token) {
    try { await deleteToken(messaging) } catch {}
  }
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}

function callable(name) {
  if (!functions) return null
  try { return httpsCallable(functions, name) } catch { return null }
}

export async function registerDeviceToken(token) {
  const fn = callable('registerDeviceToken')
  if (!fn) return { ok: false, reason: 'no-backend' }
  try {
    await fn({ token })
    return { ok: true }
  } catch (e) {
    console.error('registerDeviceToken failed:', e)
    return { ok: false, reason: (e && e.code) || 'error' }
  }
}

export async function unregisterDeviceToken(token) {
  const fn = callable('unregisterDeviceToken')
  if (!fn) return
  try { await fn({ token }) } catch {}
}

export async function sendPush({ title, body, url, category, employeeIds }) {
  const fn = callable('sendPush')
  if (!fn) return { ok: false, reason: 'no-backend' }
  try {
    const res = await fn({ title, body, url, category, employeeIds })
    return { ok: true, ...(res.data || {}) }
  } catch (e) {
    console.error('sendPush failed:', e)
    return { ok: false, reason: (e && e.code) || 'error' }
  }
}

export async function sendTestPush() {
  const fn = callable('sendTestPush')
  if (!fn) return { ok: false, reason: 'no-backend' }
  try {
    const res = await fn({})
    return { ok: true, ...(res.data || {}) }
  } catch (e) {
    return { ok: false, reason: (e && e.code) || 'error' }
  }
}

export function onForegroundPush(handler) {
  if (!messaging) return () => {}
  try {
    return onMessage(messaging, (payload) => {
      const data = payload.data || {}
      const title = (payload.notification && payload.notification.title) || data.title || 'Kormiis'
      const body = (payload.notification && payload.notification.body) || data.body || ''
      const url = data.url || '/'
      const category = data.category || 'system'
      handler({ title, body, url, category })
    })
  } catch (e) {
    console.error('FCM onMessage failed:', e)
    return () => {}
  }
}

export async function ensurePushSetup({ enabled, onMessage }) {
  if (!enabled) {
    const token = getCachedFcmToken()
    if (token) {
      await unregisterDeviceToken(token)
      await clearFcmToken()
    }
    return { token: '', unsubscribe: null }
  }
  if (!isFcmAvailable()) return { token: '', unsubscribe: null }

  const token = getCachedFcmToken() || await getFcmToken()
  if (!token) return { token: '', unsubscribe: null }
  await registerDeviceToken(token)
  let unsubscribe = null
  if (onMessage) unsubscribe = onForegroundPush(onMessage)
  return { token, unsubscribe }
}