import { useState, useEffect } from 'react'
import { clearLocalCache } from '../services/db.js'
import Icon from "@/components/ui/Icon.jsx"
import { useConfirm } from './useConfirm'

export function useCommandPalette({ employees, themeMode, toggleTheme, setCurrentView, addToast, setSelectedEmployeeId, onLoadDemoData, onClearDemoData }) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)

  const { confirm, ConfirmDialog } = useConfirm()
  const [recentActions, setRecentActions] = useState(() => {
    const saved = localStorage.getItem('kormiis_recent_actions')
    return saved ? JSON.parse(saved) : [
      { id: 'page-employees', type: 'page', label: 'Go to Team', view: 'employees' },
      { id: 'page-attendance', type: 'page', label: 'Go to Attendance', view: 'attendance' },
      { id: 'page-leaves', type: 'page', label: 'Go to Leaves', view: 'leaves' }
    ]
  })

  useEffect(() => {
    localStorage.setItem('kormiis_recent_actions', JSON.stringify(recentActions))
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
      { id: 'page-employees', category: 'Pages', label: 'Go to Team', action: () => setCurrentView('employees'), keywords: 'team employees staff members directory profile' },
      { id: 'page-payroll', category: 'Pages', label: 'Go to Payroll', action: () => setCurrentView('payroll'), keywords: 'payroll salary pay compensation' },
      { id: 'page-attendance', category: 'Pages', label: 'Go to Attendance', action: () => setCurrentView('attendance'), keywords: 'attendance daily logs roster schedule overtime clock in out' },
      { id: 'page-leaves', category: 'Pages', label: 'Go to Leaves', action: () => setCurrentView('leaves'), keywords: 'leaves time off vacation leave requests balance' },
      { id: 'page-announcements', category: 'Pages', label: 'Go to Announcements', action: () => setCurrentView('announcements'), keywords: 'announcements news posts updates' },
      { id: 'page-calendar', category: 'Pages', label: 'Go to Events', action: () => setCurrentView('calendar'), keywords: 'calendar events meetings holidays schedule' },
      { id: 'page-documents', category: 'Pages', label: 'Go to Documents', action: () => setCurrentView('documents'), keywords: 'documents files upload download manager' },
      { id: 'page-assets', category: 'Pages', label: 'Go to Assets', action: () => setCurrentView('assets'), keywords: 'assets inventory devices macbook laptop' },
      { id: 'page-expenses', category: 'Pages', label: 'Go to Expenses', action: () => setCurrentView('expenses'), keywords: 'expenses claims reimbursements money' },
      { id: 'page-settings', category: 'Pages', label: 'Go to Settings', action: () => setCurrentView('settings'), keywords: 'settings admin config role audit' }
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
        if (act.id === 'action-loaddemo') actionFn = () => { if (onLoadDemoData) onLoadDemoData() }
        if (act.id === 'action-cleardemo') actionFn = () => { if (onClearDemoData) onClearDemoData() }
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
      category: 'Team Members',
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
      { id: 'action-loaddemo', category: 'Actions', label: 'Load Full Demo Data (All Modules & Widgets)', action: () => { if (onLoadDemoData) onLoadDemoData() }, keywords: 'demo mock sample seed test data widgets populate' },
      { id: 'action-cleardemo', category: 'Actions', label: 'Remove All Demo Data (Clear Workspace)', action: () => { if (onClearDemoData) onClearDemoData() }, keywords: 'remove clear clean delete demo data reset empty' },
      { id: 'action-clearcache', category: 'Actions', label: 'Clear Local Cache & Resync', action: async () => {
        const ok = await confirm('Unsynced offline changes will be lost, and the app will reload.', 'Clear Cache?', { destructive: true, confirmText: 'Clear' })
        if (!ok) return
        clearLocalCache().then(() => window.location.reload())
      }, keywords: 'clear cache reset clean reload' }
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
    if (category === 'Employees') return <Icon name="person" size={16}/>
    if (category === 'Recent Actions') return <Icon name="history" size={16}/>
    if (id.includes('darkmode')) return themeMode === 'light' ? <Icon name="dark_mode" size={16}/> : <Icon name="light_mode" size={16}/>
    if (id.includes('clearcache')) return <Icon name="delete" size={16}/>
    if (id.includes('dashboard')) return <Icon name="dashboard" size={16}/>
    if (id.includes('settings')) return <Icon name="settings" size={16}/>
    if (id.includes('employees')) return <Icon name="person" size={16}/>
    return <Icon name="description" size={16}/>
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
