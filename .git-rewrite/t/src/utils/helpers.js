import { LayoutDashboard, Users, Banknote, Clock, Receipt, Settings2, FolderOpen, Megaphone, CalendarDays, Laptop, CloudSync, CheckSquare } from 'lucide-react'

import { createElement } from 'react'

export const EMPLOYEES_STORAGE_KEY = 'hr_pulse_employees'

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
  { id: 'dashboard', label: 'Dashboard', icon: createElement(LayoutDashboard, { size: 18 }) },
  { id: 'tasks', label: 'Tasks', icon: createElement(CheckSquare, { size: 18 }) },
  { id: 'announcements', label: 'Announcements', icon: createElement(Megaphone, { size: 18 }) },
  { id: 'calendar', label: 'Calendar', icon: createElement(CalendarDays, { size: 18 }) },
  { id: 'documents', label: 'Documents', icon: createElement(FolderOpen, { size: 18 }) },
  { id: 'employees', label: 'Employees', icon: createElement(Users, { size: 18 }) },
  { id: 'payroll', label: 'Payroll', icon: createElement(Banknote, { size: 18 }) },
  { id: 'attendance', label: 'Leaves & Attendance', icon: createElement(Clock, { size: 18 }) },
  { id: 'expenses', label: 'Expenses', icon: createElement(Receipt, { size: 18 }) },
  { id: 'assets', label: 'Assets', icon: createElement(Laptop, { size: 18 }) },
  { id: 'settings', label: 'Settings', icon: createElement(Settings2, { size: 18 }) },
  { id: 'drive', label: 'Drive Sync', icon: createElement(CloudSync, { size: 18 }) },
]
