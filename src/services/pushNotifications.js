const CHANNEL = 'kormiis-notifications'
const APP_ICON = '/Kormiis Monogram Logo 192.png'

export const CATEGORY_META = {
  announcement: { label: 'Announcement', icon: 'campaign', color: '#f59e0b' },
  announcements: { label: 'Announcement', icon: 'campaign', color: '#f59e0b' },
  event: { label: 'Event', icon: 'event', color: '#8b5cf6' },
  calendar: { label: 'Event', icon: 'event', color: '#8b5cf6' },
  asset: { label: 'Asset', icon: 'laptop_mac', color: '#06b6d4' },
  assets: { label: 'Asset', icon: 'laptop_mac', color: '#06b6d4' },
  document: { label: 'Document', icon: 'folder_open', color: '#3b82f6' },
  documents: { label: 'Document', icon: 'folder_open', color: '#3b82f6' },
  task: { label: 'Task', icon: 'check_circle', color: '#10b981' },
  tasks: { label: 'Task', icon: 'check_circle', color: '#10b981' },
  leave: { label: 'Leave', icon: 'calendar_month', color: '#ec4899' },
  leaves: { label: 'Leave', icon: 'calendar_month', color: '#ec4899' },
  expense: { label: 'Expense', icon: 'wallet', color: '#f97316' },
  expenses: { label: 'Expense', icon: 'wallet', color: '#f97316' },
  attendance: { label: 'Attendance', icon: 'schedule', color: '#6366f1' },
  schedule: { label: 'Schedule', icon: 'schedule', color: '#6366f1' },
  payroll: { label: 'Payroll', icon: 'account_balance', color: '#14b8a6' },
  notice: { label: 'Notice', icon: 'info', color: '#64748b' },
  system: { label: 'Notice', icon: 'info', color: '#64748b' },
}

let channel = null

export function isPushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPushPermission() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestPushPermission() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

async function getSwRegistration() {
  if ('serviceWorker' in navigator && navigator.serviceWorker?.ready) {
    try { return await navigator.serviceWorker.ready } catch { return null }
  }
  return null
}

export async function registerPushSubscription(user, companyUid) {
  if (!isPushSupported() || Notification.permission !== 'granted') return null
  try {
    const swReg = await getSwRegistration()
    if (!swReg || !swReg.pushManager) return null

    let subscription = await swReg.pushManager.getSubscription()
    if (!subscription && swReg.pushManager.subscribe) {
      try {
        subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined
        })
      } catch (subErr) {
        // Fallback for browsers without VAPID key
      }
    }

    if (subscription && user?.uid && companyUid) {
      const { db, doc, setDoc, serverTimestamp } = await import('./firebase.js')
      if (db) {
        const subJson = subscription.toJSON()
        const subId = (user.uid || 'anon') + '_' + (btoa(subJson.endpoint || '').slice(-12).replace(/[^a-zA-Z0-9]/g, ''))
        await setDoc(doc(db, 'companies', companyUid, 'pushSubscriptions', subId), {
          uid: user.uid,
          endpoint: subJson.endpoint,
          keys: subJson.keys || {},
          platform: navigator.userAgent,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    }
    return subscription
  } catch (e) {
    console.warn('Push subscription registration notice:', e)
    return null
  }
}

export async function showSystemNotification({ title = 'Kormiis', body = '', icon = APP_ICON, url = '', tag }) {
  if (!isPushSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const options = { body, icon, badge: icon, tag, renotify: !!tag, data: { url } }
    const swReg = await getSwRegistration()
    if (swReg) {
      swReg.showNotification(title, options)
    } else if (typeof Notification === 'function') {
      const n = new Notification(title, options)
      n.onclick = () => {
        window.focus()
        if (url && window.__kormiisNavigate) window.__kormiisNavigate(url)
        n.close()
      }
    }
  } catch (e) {
    console.error('System notification failed:', e)
  }
}

let faviconLink = null

function applyFaviconBadge(count) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 64, 64)
  if (count > 0) {
    ctx.beginPath()
    ctx.arc(32, 32, 20, 0, 2 * Math.PI)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count > 99 ? '99' : String(count), 32, 33)
  }
  if (count <= 0) {
    faviconLink?.remove()
    faviconLink = null
    return
  }
  if (!faviconLink) {
    faviconLink = document.createElement('link')
    faviconLink.id = 'kormiis-badge-favicon'
    faviconLink.rel = 'icon'
    document.head.appendChild(faviconLink)
  }
  faviconLink.href = canvas.toDataURL('image/png')
}

export function updateBadge(count) {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    navigator.setAppBadge(count).catch(() => {})
  }
  applyFaviconBadge(count)
}

export function broadcast(msg) {
  if (!channel) return
  try { channel.postMessage(msg) } catch {}
}

export function initPushSync(getCount) {
  if (typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (e) => {
    const msg = e.data || {}
    if (msg.type === 'badge') updateBadge(msg.count)
    if (msg.type === 'request-badge') broadcast({ type: 'badge', count: getCount() })
  }
  broadcast({ type: 'request-badge' })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) broadcast({ type: 'request-badge' })
  })
}

export function notifyOnHidden(notif, pushEnabled) {
  if (!pushEnabled) return
  if (!document.hidden) return
  showSystemNotification({
    title: notif.title || 'Kormiis',
    body: notif.text,
    url: notif.view || '',
    tag: notif.category || 'system',
  })
}