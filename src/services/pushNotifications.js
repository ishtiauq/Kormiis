const CHANNEL = 'kormiis-notifications'
const APP_ICON = '/Kormiis Monogram Logo 192.png'

export const CATEGORY_META = {
  announcement: { icon: 'campaign', color: '#f59e0b' },
  event: { icon: 'event', color: '#8b5cf6' },
  asset: { icon: 'laptop_mac', color: '#06b6d4' },
  document: { icon: 'folder_open', color: '#3b82f6' },
  task: { icon: 'check_circle', color: '#10b981' },
  leave: { icon: 'calendar_month', color: '#ec4899' },
  expense: { icon: 'wallet', color: '#f97316' },
  payroll: { icon: 'account_balance', color: '#14b8a6' },
  sync: { icon: 'cloud_sync', color: '#6366f1' },
  system: { icon: 'info', color: '#94a3b8' },
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