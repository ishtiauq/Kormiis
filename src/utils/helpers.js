import { createElement } from 'react'
import Icon from '../components/ui/Icon.jsx'

export const EMPLOYEES_STORAGE_KEY = 'kormiis_employees'

export function timestampArrayChanges(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return next;
  const prevMap = new Map(prev.map(item => [item.id, item]));
  return next.map(item => {
    const prevItem = prevMap.get(item.id);
    if (!prevItem) {
      return { ...item, updated_at: new Date().toISOString() };
    }
    const cleanPrev = { ...prevItem, updated_at: undefined, _conflict: undefined };
    const cleanItem = { ...item, updated_at: undefined, _conflict: undefined };
    if (JSON.stringify(cleanPrev) !== JSON.stringify(cleanItem)) {
      return { ...item, updated_at: new Date().toISOString() };
    }
    return item;
  });
}

export const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: createElement(Icon, { name: 'dashboard', size: 18 }) },
  { id: 'tasks', label: 'Tasks', icon: createElement(Icon, { name: 'check_box', size: 18 }) },
  { id: 'announcements', label: 'Announcements', icon: createElement(Icon, { name: 'rss_feed', size: 18 }) },
  { id: 'documents', label: 'Documents', icon: createElement(Icon, { name: 'folder_open', size: 18 }) },
  { id: 'employees', label: 'Employees', icon: createElement(Icon, { name: 'group', size: 18 }) },
  { id: 'payroll', label: 'Payroll', icon: createElement(Icon, { name: 'account_balance', size: 18 }) },
  { id: 'attendance', label: 'Attendance', icon: createElement(Icon, { name: 'schedule', size: 18 }) },
  { id: 'assets', label: 'Assets', icon: createElement(Icon, { name: 'devices_other', size: 18 }) },
  { id: 'gigs', label: 'Help Hub', icon: createElement(Icon, { name: 'handshake', size: 18 }) },
  { id: 'performance', label: 'Performance', icon: createElement(Icon, { name: 'insights', size: 18 }) },
  { id: 'settings', label: 'Settings', icon: createElement(Icon, { name: 'settings', size: 18 }) },
  { id: 'profile', label: 'Profile', icon: createElement(Icon, { name: 'person', size: 18 }) },
]

export function getDeviceInfo() {
  let deviceId = localStorage.getItem('kormiis_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('kormiis_device_id', deviceId)
  }

  const ua = navigator.userAgent
  let browser = 'Unknown Browser'
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'

  let os = 'Unknown OS'
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'MacOS'
  else if (ua.includes('X11') || ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  return {
    deviceId,
    label: `${os} - ${browser}`,
    lastLogin: new Date().toISOString(),
    isBlocked: false
  }
}
