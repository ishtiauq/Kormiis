import { useState, useEffect } from 'react'
import { clearLocalCache } from '../services/db.js'
import { createBackup } from '../services/googleDrive.js'
import { User, History, Moon, Sun, Trash2, HardDrive, LayoutDashboard, Settings as SettingsIcon, FileText } from 'lucide-react'
import { useConfirm } from './useConfirm'

export function useCommandPalette({ user, employees, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId }) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)

  const { confirm, ConfirmDialog } = useConfirm()
  const [recentActions, setRecentActions] = useState(() => {
    const saved = localStorage.getItem('hr_pulse_recent_actions')
    return saved ? JSON.parse(saved) : [
      { id: 'page-employees', type: 'page', label: 'Go to Employees', view: 'employees' },
      { id: 'page-attendance', type: 'page', label: 'Go to Attendance & Leaves', view: 'attendance' }
    ]
  })

  useEffect(() => {
    localStorage.setItem('hr_pulse_recent_actions', JSON.stringify(recentActions))
  }, [recentActions])

  const trackRecentAction = (action) => {
    setRecentActions(prev => {
      const filtered = prev.filter(a => a.id !== action.id)
      const next = [action, ...filtered].slice(0, 5)
      return next
    })
  }

  const getFilteredItems = () => {
    const query = commandSearch.toLowerCase().trim()
    const pages = [
      { id: 'page-dashboard', category: 'Pages', label: 'Go to Dashboard', action: () => setCurrentView('dashboard'), keywords: 'dashboard home main' },
      { id: 'page-employees', category: 'Pages', label: 'Go to Employees', action: () => setCurrentView('employees'), keywords: 'employees staff members directory profile' },
      { id: 'page-payroll', category: 'Pages', label: 'Go to Payroll', action: () => setCurrentView('payroll'), keywords: 'payroll salary pay compensation' },
      { id: 'page-attendance', category: 'Pages', label: 'Go to Attendance & Leaves', action: () => setCurrentView('attendance'), keywords: 'attendance leaves roster schedule timeoff vacation' },
      { id: 'page-announcements', category: 'Pages', label: 'Go to Announcements', action: () => setCurrentView('announcements'), keywords: 'announcements news posts updates' },
      { id: 'page-calendar', category: 'Pages', label: 'Go to Calendar', action: () => setCurrentView('calendar'), keywords: 'calendar events meetings holidays schedule' },
      { id: 'page-documents', category: 'Pages', label: 'Go to Documents', action: () => setCurrentView('documents'), keywords: 'documents files upload download manager' },
      { id: 'page-assets', category: 'Pages', label: 'Go to Assets', action: () => setCurrentView('assets'), keywords: 'assets inventory devices macbook laptop' },
      { id: 'page-expenses', category: 'Pages', label: 'Go to Expenses', action: () => setCurrentView('expenses'), keywords: 'expenses claims reimbursements money' },
      { id: 'page-settings', category: 'Pages', label: 'Go to Settings', action: () => setCurrentView('settings'), keywords: 'settings admin config role audit' },
      { id: 'page-drive', category: 'Pages', label: 'Go to Google Drive Sync', action: () => setCurrentView('drive'), keywords: 'drive sync backup restore cloud' }
    ]

    const recent = recentActions.map((act) => {
      let actionFn = () => {}
      if (act.type === 'page') {
        actionFn = () => setCurrentView(act.view)
      } else if (act.type === 'action') {
        if (act.id === 'action-darkmode') actionFn = toggleTheme
        if (act.id === 'action-clearcache') actionFn = async () => {
          const ok = await confirm('Unsynced offline changes will be lost, and the app will reload.', 'Clear Cache?', { destructive: true, confirmText: 'Clear' })
          if (!ok) return
          clearLocalCache().then(() => window.location.reload())
        }
        if (act.id === 'action-backup') actionFn = () => {
          if (user?.token) createBackup(user.token).then(() => addToast('Backup created', 'success'))
        }
      } else if (act.type === 'employee') {
        actionFn = () => {
          setSelectedEmployeeId(act.employeeId)
          setCurrentView('employees')
        }
      }
      return {
        ...act,
        category: 'Recent Actions',
        action: actionFn
      }
    })

    const emps = (employees || []).map(emp => ({
      id: `emp-${emp.id}`,
      category: 'Employees',
      label: `${emp.name} (${emp.role} - ${emp.department})`,
      employeeId: emp.id,
      action: () => {
        setSelectedEmployeeId(emp.id)
        setCurrentView('employees')
      },
      keywords: `${emp.name} ${emp.role} ${emp.department} ${emp.id}`
    }))

    const quickActions = [
      { id: 'action-darkmode', category: 'Actions', label: 'Toggle Theme', action: toggleTheme, keywords: 'dark light mode theme appearance toggle system' },
      { id: 'action-clearcache', category: 'Actions', label: 'Clear Local Cache & Resync', action: async () => {
        const ok = await confirm('Unsynced offline changes will be lost, and the app will reload.', 'Clear Cache?', { destructive: true, confirmText: 'Clear' })
        if (!ok) return
        clearLocalCache().then(() => window.location.reload())
      }, keywords: 'clear cache reset clean reload' },
      { id: 'action-backup', category: 'Actions', label: 'Trigger Drive Backup', action: () => {
        if (user?.token) {
          addToast('Creating backup...', 'info')
          createBackup(user.token).then(() => addToast('Backup created successfully', 'success'))
        } else {
          addToast('Drive connection required for backup', 'warning')
        }
      }, keywords: 'backup save snapshot archive drive' }
    ]

    if (!query) {
      return [
        ...pages,
        ...recent,
        ...emps.slice(0, 5)
      ]
    }

    const allItems = [
      ...pages,
      ...quickActions,
      ...emps
    ]

    return allItems.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(query)
      const matchKeywords = item.keywords ? item.keywords.toLowerCase().includes(query) : false
      return matchLabel || matchKeywords
    })
  }

  const filteredItems = getFilteredItems()

  const selectPaletteItem = (index) => {
    const selectedItem = filteredItems[index]
    if (selectedItem) {
      selectedItem.action()
      trackRecentAction({
        id: selectedItem.id,
        type: selectedItem.category === 'Pages' ? 'page' : (selectedItem.category === 'Employees' ? 'employee' : 'action'),
        label: selectedItem.label,
        view: selectedItem.id.replace('page-', ''),
        employeeId: selectedItem.employeeId
      })
      setShowCommandPalette(false)
      setCommandSearch('')
      setPaletteIndex(0)
    }
  }

  const getCategoryIcon = (category, id) => {
    if (category === 'Employees') return <User size={16} />
    if (category === 'Recent Actions') return <History size={16} />
    if (id.includes('darkmode')) return themeMode === 'light' ? <Moon size={16} /> : <Sun size={16} />
    if (id.includes('clearcache')) return <Trash2 size={16} />
    if (id.includes('backup')) return <HardDrive size={16} />
    if (id.includes('dashboard')) return <LayoutDashboard size={16} />
    if (id.includes('settings')) return <SettingsIcon size={16} />
    if (id.includes('drive')) return <HardDrive size={16} />
    if (id.includes('employees')) return <User size={16} />
    return <FileText size={16} />
  }

  return {
    showCommandPalette, setShowCommandPalette,
    commandSearch, setCommandSearch,
    paletteIndex, setPaletteIndex,
    filteredItems, selectPaletteItem,
    getCategoryIcon,
    ConfirmDialog
  }
}
