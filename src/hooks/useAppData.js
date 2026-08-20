import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { validateDatabase } from '../services/validator.js'
import { encryptJson, decryptJson } from '../services/crypto.js'
import { EMPLOYEES_STORAGE_KEY, timestampArrayChanges, getDeviceInfo } from '../utils/helpers.js'
import { subscribeToTable, writeToTable, fetchTableFromFirestore } from '../services/bridge.js'
import { initPushSync, broadcast, updateBadge, notifyOnHidden } from '../services/pushNotifications.js'

export default function useAppData({ user, addToast }) {
  /* ─── DB state ─── */
  const [isSyncing, setIsSyncing] = useState(false)
  const [dbStatus, setDbStatus] = useState('healthy')
  const [dataIntegrityIssues, setDataIntegrityIssues] = useState([])
  const [showCorruptionModal, setShowCorruptionModal] = useState(false)
  const [isAppLoading, setIsAppLoading] = useState(true)
  const syncRef = useRef(null)
  const syncedForUser = useRef(null)

  const [pendingProfileEdits, setPendingProfileEdits] = useState([])
  const [auditLogs, setAuditLogs] = useState([
    { id: 'audit-1', timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'System', action: 'CREATE', entity: 'System', details: 'Initialized audit logging.', ip: 'N/A' }
  ])

  /* ─── Data state initialisers ─── */
  const loadSaved = (key) => {
    const saved = localStorage.getItem(key)
    if (saved) { try { return JSON.parse(saved) } catch (e) { console.error(`parse ${key}:`, e) } }
    return null
  }

  const [employees, setEmployeesRaw] = useState(() => {
    const plain = localStorage.getItem(EMPLOYEES_STORAGE_KEY + '_plain')
    if (plain) { try { const p = JSON.parse(plain); if (Array.isArray(p) && p.length > 0) return p } catch (e) {} }
    return []
  })
  const [payroll, setPayrollRaw] = useState(() => loadSaved('kormiis_payroll') || {})
  const [attendance, setAttendanceRaw] = useState(() => loadSaved('kormiis_attendance') || { leaves: [], dailyLogs: {}, balances: {} })
  const [expenses, setExpensesRaw] = useState(() => loadSaved('kormiis_expenses') || [])
  const [events, setEvents] = useState(() => loadSaved('kormiis_events') || [])
  const [documents, setDocuments] = useState(() => loadSaved('kormiis_documents') || [])
  const [roster, setRoster] = useState(() => loadSaved('kormiis_roster') || [])
  const [shiftSwaps, setShiftSwaps] = useState(() => loadSaved('kormiis_shift_swaps') || [])
  const [overtimeClaims, setOvertimeClaims] = useState(() => loadSaved('kormiis_overtime_claims') || [])
  const [announcements, setAnnouncements] = useState(() => {
    const saved = loadSaved('kormiis_announcements')
    if (saved) return saved
    return []
  })
  const [tasks, setTasks] = useState(() => loadSaved('kormiis_tasks') || [])
  const [notes, setNotesRaw] = useState(() => loadSaved('kormiis_notes') || [])
  const [assets, setAssets] = useState(() => loadSaved('kormiis_assets') || [])
  const [assetRequests, setAssetRequests] = useState(() => loadSaved('kormiis_asset_requests') || [])
  const [assetCategories, setAssetCategories] = useState(() => loadSaved('kormiis_asset_categories') || ['Laptop', 'Phone', 'Monitor', 'Peripherals', 'Access Card'])
  const [settings, setSettingsRaw] = useState(() => loadSaved('kormiis_settings') || { currency: '৳', officeLocation: { lat: 23.8103, lng: 90.4125, radius: 100 }, salaryStructure: [{ id: 'basic', name: 'Basic Salary', percentage: 50, type: 'earning' }, { id: 'hra', name: 'House Rent Allowance (HRA)', percentage: 25, type: 'earning' }, { id: 'medical', name: 'Medical Allowance', percentage: 10, type: 'earning' }, { id: 'conveyance', name: 'Conveyance Allowance', percentage: 10, type: 'earning' }, { id: 'pf', name: 'Provident Fund (PF)', percentage: 5, type: 'deduction' }], company: { name: 'Kormiis Ltd.', email: 'hr@kormiis.io', website: 'www.kormiis.io', logo: '', logoX: 0, logoY: 0, logoZoom: 1 }, shiftTemplates: [{ id: 'st-1', name: 'Morning Shift', start: '09:00', end: '18:00', break: 60 }, { id: 'st-2', name: 'Night Shift', start: '22:00', end: '07:00', break: 60 }], overtimeRules: { multiplierWeekday: 1.5, multiplierWeekend: 2.0 }, notifications: { syncAlerts: true, emailDigests: false } })
  const [syncLogs, setSyncLogs] = useState(() => loadSaved('kormiis_sync_logs') || [])

  /* ─── Notifications ─── */
  const [allNotifications, setAllNotifications] = useState(() => {
    const saved = localStorage.getItem('kormiis_notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        return Array.isArray(parsed) ? parsed.filter(n => (n.timestamp || Date.now()) > sevenDaysAgo) : []
      } catch (e) {
        return []
      }
    }
    return []
  })
  const [showNotifications, setShowNotifications] = useState(false)

  // Visible notifications for the current logged-in user:
  // Rule 1: User's OWN activities NEVER show in their own notification panel
  // Rule 2: All workspace events from OTHER users appear in real-time
  // Rule 3: Targeted notifications only appear for intended recipient(s) or Admin/HR
  const visibleNotifications = useMemo(() => {
    const currentId = user?.id || user?.employeeId || user?.uid
    const currentEmail = user?.email?.toLowerCase()
    const currentRole = user?.role || (user?.isEmployee ? 'Teammate' : 'Admin')

    return (allNotifications || []).filter(notif => {
      // 1. Filter out own activities (never show to the actor)
      if (notif.actorId && (notif.actorId === currentId || (currentEmail && notif.actorEmail && notif.actorEmail.toLowerCase() === currentEmail))) {
        return false
      }

      // 2. Targeted employees filter (e.g. task assigned to specific person)
      if (Array.isArray(notif.targetEmployeeIds) && notif.targetEmployeeIds.length > 0) {
        const isTargeted = notif.targetEmployeeIds.includes(currentId)
        const isAdminOrOwner = currentRole === 'Admin' || user?.isWorkspaceOwner
        if (!isTargeted && !isAdminOrOwner) return false
      }

      if (notif.targetId && notif.targetId !== currentId && currentRole !== 'Admin') {
        return false
      }

      // 3. Targeted roles filter (e.g. ['Admin', 'HR'])
      if (Array.isArray(notif.targetRoles) && notif.targetRoles.length > 0) {
        if (!notif.targetRoles.includes(currentRole)) return false
      }

      return true
    })
  }, [allNotifications, user])

  const notificationsRef = useRef(visibleNotifications)
  useEffect(() => { notificationsRef.current = visibleNotifications }, [visibleNotifications])

  useEffect(() => {
    localStorage.setItem('kormiis_notifications', JSON.stringify(allNotifications))
  }, [allNotifications])

  useEffect(() => {
    const unread = visibleNotifications.filter(n => !n.read).length
    initPushSync(() => unread)
    updateBadge(unread)
  }, [visibleNotifications])

  const addAuditLog = (action, entity, details) => {
    const newLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'Admin',
      action,
      entity,
      details,
      ip: 'N/A'
    }
    setAuditLogs(prev => [newLog, ...prev])
  }

  const hasPermission = (resource) => {
    const currentRole = user?.role || 'Teammate'
    if (currentRole === 'Admin') return true
    
    // For Teammates, base permissions + custom permissions
    if (currentRole === 'Teammate') {
      const basePerms = ['dashboard', 'attendance', 'leaves', 'expenses', 'calendar', 'tasks', 'profile', 'notes', 'gigs', 'performance']
      const customPerms = user?.permissions || []
      return basePerms.includes(resource) || customPerms.includes(resource)
    }
    return false
  }

  const addNotification = (text, view = null, opts = {}) => {
    const currentActorId = opts.actorId || user?.id || user?.employeeId || user?.uid || user?.email || 'system'
    const currentActorName = opts.actorName || user?.name || 'Someone'
    const currentActorEmail = opts.actorEmail || user?.email || ''
    const category = opts.category || (typeof view === 'string' && view !== 'dashboard' ? view : 'system')
    
    const notif = {
      id: opts.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      title: opts.title || text,
      category,
      read: false,
      timestamp: opts.timestamp || Date.now(),
      time: 'Just now',
      view: view || opts.view || null,
      actorId: currentActorId,
      actorName: currentActorName,
      actorEmail: currentActorEmail,
      targetEmployeeIds: opts.targetEmployeeIds || null,
      targetId: opts.targetId || null,
      targetRoles: opts.targetRoles || null,
    }

    setAllNotifications(prev => {
      const next = [notif, ...(prev || []).filter(n => n.id !== notif.id)].slice(0, 100)
      if (adminUid) {
        writeToTable(adminUid, 'notifications', next).catch(e => console.error('Notification write error:', e))
      }
      return next
    })

    // If current device user is not the actor, trigger hidden push notification
    if (currentActorId !== (user?.id || user?.employeeId || user?.uid)) {
      notifyOnHidden(notif, settings?.notifications?.pushEnabled)
    }
  }

  const markNotificationsRead = (id = null) => {
    setAllNotifications(prev => {
      const next = id
        ? prev.map(n => n.id === id ? { ...n, read: true } : n)
        : prev.map(n => ({ ...n, read: true }))
      if (adminUid) {
        writeToTable(adminUid, 'notifications', next).catch(e => console.error(e))
      }
      return next
    })
  }

  const clearNotifications = () => {
    setAllNotifications(prev => {
      const visibleIds = new Set(visibleNotifications.map(n => n.id))
      const next = prev.filter(n => !visibleIds.has(n.id))
      if (adminUid) {
        writeToTable(adminUid, 'notifications', next).catch(e => console.error(e))
      }
      return next
    })
  }

  /* ─── addLog ─── */
  const addLog = (action, details, status = 'success') => {
    const newLog = { id: `log-${Date.now()}`, action, status, timestamp: 'Just now', details }
    setSyncLogs(prev => [newLog, ...prev.slice(0, 4)])
  }

  /* ─── Encrypted employee loading ─── */
  useEffect(() => {
    if (!user) return
    const loadEmployeesFromStorage = async () => {
      const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      if (!saved) return
      try {
        const keyMaterial = user?.token || 'kormiis-local-fallback-key'
        const parsed = await decryptJson(saved, keyMaterial)
        if (Array.isArray(parsed)) {
          setEmployeesRaw(parsed)
          localStorage.setItem(EMPLOYEES_STORAGE_KEY + '_plain', JSON.stringify(parsed))
        }
      } catch (e) { console.error('Failed to decrypt saved employees:', e) }
    }
    loadEmployeesFromStorage()
  }, [user?.token, user])

  /* ─── Employee persistence (encrypted) ─── */
  const didPersistEmployees = useRef(false)
  useEffect(() => {
    if (!didPersistEmployees.current) { didPersistEmployees.current = true; return }
    const persistEmployees = async () => {
      try {
        const keyMaterial = user?.token || 'kormiis-local-fallback-key'
        const encrypted = await encryptJson(employees, keyMaterial)
        localStorage.setItem(EMPLOYEES_STORAGE_KEY, encrypted)
        localStorage.setItem(EMPLOYEES_STORAGE_KEY + '_plain', JSON.stringify(employees))
      } catch (e) { console.error('Failed to encrypt employees for storage:', e) }
    }
    persistEmployees()
  }, [employees, user?.token])

  /* ─── Persistence effects ─── */
  const persistStates = [
    { key: 'kormiis_payroll', val: payroll },
    { key: 'kormiis_attendance', val: attendance },
    { key: 'kormiis_expenses', val: expenses },
    { key: 'kormiis_sync_logs', val: syncLogs },
    { key: 'kormiis_announcements', val: announcements },
    { key: 'kormiis_assets', val: assets },
    { key: 'kormiis_asset_requests', val: assetRequests },
    { key: 'kormiis_asset_categories', val: assetCategories },
    { key: 'kormiis_events', val: events },
    { key: 'kormiis_documents', val: documents },
    { key: 'kormiis_notes', val: notes },
  ]
  persistStates.forEach(({ key, val }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { localStorage.setItem(key, JSON.stringify(val)) }, [val])
  })

  /* ─── Firebase Real-Time Subscriptions ─── */
  const adminUid = user?.isEmployee ? user.adminUid : user?.uid;
  useEffect(() => {
    if (!adminUid) return;

    const applyUpdate = (setter, tableName, data, lastUpdated) => {
      if (data) {
        // Freshness guard: if this Firestore snapshot is older than the last
        // local edit for this table, it is stale (e.g. a delete that was still
        // in flight when the page refreshed). Skip it so deleted items are not
        // resurrected.
        const localEdit = Number(localStorage.getItem(`kormiis_${tableName}_updatedAt`) || 0);
        const fbMs = lastUpdated
          ? (typeof lastUpdated.toMillis === 'function' ? lastUpdated.toMillis() : new Date(lastUpdated).getTime())
          : 0;
        if (fbMs && localEdit && fbMs < localEdit) return;

        setter(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            return data;
          }
          return prev;
        });
      }
    };

    const unsubEmployees = subscribeToTable(adminUid, 'employees', (data, lastUpdated) => applyUpdate(setEmployeesRaw, 'employees', data, lastUpdated));
    const unsubPayroll = subscribeToTable(adminUid, 'payroll', (data, lastUpdated) => applyUpdate(setPayrollRaw, 'payroll', data, lastUpdated));
    const unsubSettings = subscribeToTable(adminUid, 'settings', (data, lastUpdated) => applyUpdate(setSettingsRaw, 'settings', data, lastUpdated));
    const unsubTasks = subscribeToTable(adminUid, 'tasks', (data, lastUpdated) => applyUpdate(setTasks, 'tasks', data, lastUpdated));
    const unsubNotes = subscribeToTable(adminUid, 'notes', (data, lastUpdated) => applyUpdate(setNotesRaw, 'notes', data, lastUpdated));
    const unsubExpenses = subscribeToTable(adminUid, 'expenses', (data, lastUpdated) => applyUpdate(setExpensesRaw, 'expenses', data, lastUpdated));
    const unsubEvents = subscribeToTable(adminUid, 'events', (data, lastUpdated) => applyUpdate(setEvents, 'events', data, lastUpdated));
    const unsubDocuments = subscribeToTable(adminUid, 'documents', (data, lastUpdated) => applyUpdate(setDocuments, 'documents', data, lastUpdated));
    const unsubRoster = subscribeToTable(adminUid, 'roster', (data, lastUpdated) => applyUpdate(setRoster, 'roster', data, lastUpdated));
    const unsubShiftSwaps = subscribeToTable(adminUid, 'shift_swaps', (data, lastUpdated) => applyUpdate(setShiftSwaps, 'shift_swaps', data, lastUpdated));
    const unsubOvertime = subscribeToTable(adminUid, 'overtime_claims', (data, lastUpdated) => applyUpdate(setOvertimeClaims, 'overtime_claims', data, lastUpdated));
    const unsubAnnouncements = subscribeToTable(adminUid, 'announcements', (data, lastUpdated) => applyUpdate(setAnnouncements, 'announcements', data, lastUpdated));
    const unsubAssets = subscribeToTable(adminUid, 'assets', (data, lastUpdated) => applyUpdate(setAssets, 'assets', data, lastUpdated));
    const unsubAssetRequests = subscribeToTable(adminUid, 'asset_requests', (data, lastUpdated) => applyUpdate(setAssetRequests, 'asset_requests', data, lastUpdated));
    const unsubAssetCategories = subscribeToTable(adminUid, 'asset_categories', (data, lastUpdated) => applyUpdate(setAssetCategories, 'asset_categories', data, lastUpdated));
    const unsubNotifications = subscribeToTable(adminUid, 'notifications', (data, lastUpdated) => applyUpdate(setAllNotifications, 'notifications', data, lastUpdated));

    const handleAttUpdate = (key, data, lastUpdated) => {
      if(data) {
        const tn = key === 'leaves' ? 'leave_requests' : key === 'balances' ? 'leave_balances' : 'attendance_logs';
        const localEdit = Number(localStorage.getItem(`kormiis_${tn}_updatedAt`) || 0);
        const fbMs = lastUpdated
          ? (typeof lastUpdated.toMillis === 'function' ? lastUpdated.toMillis() : new Date(lastUpdated).getTime())
          : 0;
        if (fbMs && localEdit && fbMs < localEdit) return;

        setAttendanceRaw(prev => {
          if (JSON.stringify(prev[key]) !== JSON.stringify(data)) {
            const next = { ...prev, [key]: data };
            return next;
          }
          return prev;
        });
      }
    };
    const unsubLeaves = subscribeToTable(adminUid, 'leave_requests', (data, lastUpdated) => handleAttUpdate('leaves', data, lastUpdated));
    const unsubBalances = subscribeToTable(adminUid, 'leave_balances', (data, lastUpdated) => handleAttUpdate('balances', data, lastUpdated));
    const unsubLogs = subscribeToTable(adminUid, 'attendance_logs', (data, lastUpdated) => handleAttUpdate('dailyLogs', data, lastUpdated));

    return () => {
      unsubEmployees(); unsubPayroll(); unsubSettings(); unsubTasks(); unsubNotes(); unsubExpenses(); unsubEvents();
      unsubDocuments(); unsubRoster(); unsubShiftSwaps(); unsubOvertime(); unsubAnnouncements(); unsubAssets();
      unsubAssetRequests(); unsubAssetCategories(); unsubNotifications(); unsubLeaves(); unsubBalances(); unsubLogs();
    };
  }, [adminUid, user]);

  /* ─── Birthday / Work anniversary auto-post ─── */
  useEffect(() => {
    if (!employees || employees.length === 0) return
    const today = new Date()
    const currentMonthDay = `${today.getMonth() + 1}-${today.getDate()}`
    const currentYear = today.getFullYear()
    let newPosts = []

    employees.forEach(emp => {
      if (emp.dob) {
        const dobDate = new Date(emp.dob)
        const dobMonthDay = `${dobDate.getMonth() + 1}-${dobDate.getDate()}`
        if (dobMonthDay === currentMonthDay) {
          const existing = announcements.find(a => a.category === 'Birthday' && a.content.includes(emp.name) && a.date.startsWith(currentYear.toString()))
          if (!existing) {
            newPosts.push({
              id: `ann-bday-${emp.id}-${currentYear}`,
              title: `\u{1F389} Happy Birthday, ${emp.name}!`,
              content: `Let's all wish a fantastic birthday to ${emp.name} from the ${emp.department} team! Have a great day! \u{1F382}\u{1F388}`,
              authorId: 'system', date: new Date().toISOString(),
              category: 'Achievement/Birthday/Work Anniversary',
              priority: 'Normal', audience: 'all', attachments: [],
              reactions: { '\u{1F44D}': 0, '\u2764\uFE0F': 0, '\u{1F389}': 0 },
              comments: [], readBy: [], poll: null
            })
          }
        }
      }
      if (emp.joiningDate) {
        const joinDate = new Date(emp.joiningDate)
        const joinMonthDay = `${joinDate.getMonth() + 1}-${joinDate.getDate()}`
        const years = currentYear - joinDate.getFullYear()
        if (joinMonthDay === currentMonthDay && years > 0) {
          const existing = announcements.find(a => a.category === 'Anniversary' && a.content.includes(emp.name) && a.date.startsWith(currentYear.toString()))
          if (!existing) {
            newPosts.push({
              id: `ann-work-${emp.id}-${currentYear}`,
              title: `\u{1F31F} Happy Work Anniversary, ${emp.name}!`,
              content: `Congratulations to ${emp.name} for completing ${years} year${years > 1 ? 's' : ''} with us! Thank you for your hard work and dedication! \u{1F3C6}`,
              authorId: 'system', date: new Date().toISOString(),
              category: 'Achievement/Birthday/Work Anniversary',
              priority: 'Normal', audience: 'all', attachments: [],
              reactions: { '\u{1F44D}': 0, '\u2764\uFE0F': 0, '\u{1F389}': 0 },
              comments: [], readBy: [], poll: null
            })
          }
        }
      }
    })
    if (newPosts.length > 0) handleSetAnnouncements(prev => [...newPosts, ...prev])
  }, [employees])

  /* ─── Firestore load effect (source of truth) ─── */
  useEffect(() => {
    const syncDatabase = async () => {
      if (!user) { setIsAppLoading(false); return }
      const ownerId = user.isEmployee ? user.adminUid : user.uid
      if (!ownerId) { setIsAppLoading(false); return }

      const readLocal = (key) => {
        const raw = localStorage.getItem(key)
        if (raw) { try { return JSON.parse(raw) } catch (e) {} }
        return null
      }

      // Load a table from Firestore. If missing, fall back to the local cache
      // and migrate it up to Firestore once.
      const loadTable = async (tableName, localKey) => {
        let data = await fetchTableFromFirestore(ownerId, tableName)
        if (data != null) return data
        const localData = readLocal(localKey)
        if (localData != null) {
          await writeToTable(ownerId, tableName, localData).catch(e => console.error(`Migration push ${tableName}:`, e))
          return localData
        }
        return null
      }

      try {
        setIsSyncing(true)
        setDbStatus('healthy')

        // Employees (decrypted local storage)
        let empData = await fetchTableFromFirestore(ownerId, 'employees')
        if (empData == null) {
          const plainStr = localStorage.getItem(EMPLOYEES_STORAGE_KEY + '_plain')
          let savedEmp = null
          if (plainStr) { try { savedEmp = JSON.parse(plainStr) } catch (e) {} }
          if (!savedEmp) {
            const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
            if (saved) { try { const keyMaterial = user?.token || 'kormiis-local-fallback-key'; savedEmp = await decryptJson(saved, keyMaterial) } catch (e) {} }
          }
          if (Array.isArray(savedEmp)) {
            empData = savedEmp
            await writeToTable(ownerId, 'employees', empData).catch(e => console.error('Migration push employees:', e))
          }
        }
        setEmployeesRaw(empData || [])

        let payrollData = await loadTable('payroll', 'kormiis_payroll')
        if (!payrollData) payrollData = {}
        if (Array.isArray(payrollData)) payrollData = { '2026-07': payrollData }
        setPayrollRaw(payrollData)

        const defaultSettings = { currency: '৳', salaryStructure: [{ id: 'basic', name: 'Basic Salary', percentage: 50, type: 'earning' }, { id: 'hra', name: 'House Rent Allowance (HRA)', percentage: 25, type: 'earning' }, { id: 'medical', name: 'Medical Allowance', percentage: 10, type: 'earning' }, { id: 'conveyance', name: 'Conveyance Allowance', percentage: 10, type: 'earning' }, { id: 'pf', name: 'Provident Fund (PF)', percentage: 5, type: 'deduction' }], company: { name: 'Kormiis Ltd.', email: 'hr@kormiis.io', website: 'www.kormiis.io' }, notifications: { syncAlerts: true, emailDigests: false } }
        let settingsData = await loadTable('settings', 'kormiis_settings')
        if (!settingsData) settingsData = defaultSettings
        setSettingsRaw(settingsData)

        if (!user.isEmployee && user.uid) {
          const currentDevice = getDeviceInfo()
          const adminDevices = settingsData.adminDevices || []
          const existingDevice = adminDevices.find(d => d.deviceId === currentDevice.deviceId)
          if (!existingDevice) {
            settingsData.adminDevices = [...adminDevices, currentDevice]
            await writeToTable(ownerId, 'settings', settingsData).catch(e => console.error(e))
          } else {
            settingsData.adminDevices = adminDevices.map(d => d.deviceId === currentDevice.deviceId ? { ...d, lastLogin: currentDevice.lastLogin } : d)
            await writeToTable(ownerId, 'settings', settingsData).catch(e => console.error(e))
          }
        }

        let leavesData = await loadTable('leave_requests', null)
        let balancesData = await loadTable('leave_balances', null)
        let logsData = await loadTable('attendance_logs', null)
        if (leavesData == null || balancesData == null || logsData == null) {
          const savedAtt = readLocal('kormiis_attendance')
          if (savedAtt) {
            leavesData = leavesData ?? savedAtt.leaves ?? []
            balancesData = balancesData ?? savedAtt.balances ?? {}
            logsData = logsData ?? savedAtt.dailyLogs ?? {}
          }
          if (leavesData == null) leavesData = []
          if (balancesData == null) balancesData = {}
          if (logsData == null) logsData = {}
        }
        setAttendanceRaw({ leaves: leavesData, balances: balancesData, dailyLogs: logsData })

        let tasksData = await loadTable('tasks', 'kormiis_tasks')
        setTasks(tasksData || [])

        let notesData = await loadTable('notes', 'kormiis_notes')
        setNotesRaw(notesData || [])

        let expensesData = await loadTable('expenses', 'kormiis_expenses')
        setExpensesRaw(expensesData || [])

        // Shared tables — load from Firestore so a newly-joined employee on a
        // fresh device sees ALL company activity (announcements, events, docs,
        // assets, etc.), and so pre-existing local-only data is migrated up.
        let announcementsData = await loadTable('announcements', 'kormiis_announcements')
        setAnnouncements(announcementsData || [])

        let eventsData = await loadTable('events', 'kormiis_events')
        setEvents(eventsData || [])

        let documentsData = await loadTable('documents', 'kormiis_documents')
        setDocuments(documentsData || [])

        let assetsData = await loadTable('assets', 'kormiis_assets')
        setAssets(assetsData || [])

        let assetRequestsData = await loadTable('asset_requests', 'kormiis_asset_requests')
        setAssetRequests(assetRequestsData || [])

        let assetCategoriesData = await loadTable('asset_categories', 'kormiis_asset_categories')
        setAssetCategories(assetCategoriesData || ['Laptop', 'Phone', 'Monitor', 'Peripherals', 'Access Card'])

        let rosterData = await loadTable('roster', 'kormiis_roster')
        setRoster(rosterData || [])

        let shiftSwapsData = await loadTable('shift_swaps', 'kormiis_shift_swaps')
        setShiftSwaps(shiftSwapsData || [])

        let overtimeClaimsData = await loadTable('overtime_claims', 'kormiis_overtime_claims')
        setOvertimeClaims(overtimeClaimsData || [])

        let notifsData = await loadTable('notifications', 'kormiis_notifications')
        if (Array.isArray(notifsData)) {
          setAllNotifications(notifsData)
        }

        const issues = validateDatabase(empData || [], logsData || {}, leavesData || [], payrollData || {}, expensesData || [])
        setDataIntegrityIssues(issues)
        if (issues.length > 0) {
          setDbStatus('corruption')
          addLog('Data Integrity Warning', `${issues.length} corruption issues detected in the database.`, 'warning')
          addToast('Data integrity issues found. Check console for details.', 'warning')
        }

        setIsSyncing(false)
        addLog('Database Synced', 'Loaded from Firestore.', 'success')
      } catch (err) {
        setIsSyncing(false)
        setIsAppLoading(false)
        setDbStatus('corruption')
        addLog('Sync Failed', 'Could not load database: ' + err.message, 'danger')
        console.error(err)
      }
    }
    syncRef.current = syncDatabase
    const userKey = user?.id || user?.employeeId || 'user'
    if (syncedForUser.current === userKey) return
    syncedForUser.current = userKey
    syncDatabase()
  }, [user])

  /* ─── handleSet* functions ─── */
  const handleSetEmployees = (updater) => {
    setEmployeesRaw((prev) => {
      const next = timestampArrayChanges(prev, typeof updater === 'function' ? updater(prev) : updater)
      if (adminUid) {
        writeToTable(adminUid, 'employees', next).catch(e => console.error(e));
      }
      return next
    })
  }

  const handleSetPayroll = (updater) => {
    setPayrollRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (adminUid) writeToTable(adminUid, 'payroll', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetSettings = (updater) => {
    setSettingsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('kormiis_settings', JSON.stringify(next))
      if (adminUid) writeToTable(adminUid, 'settings', next).catch(e => console.error(e));
      return next
    })
  }

  const handleAutoRepairDatabase = async () => {
    if (!user) return
    try {
      setIsSyncing(true)
      addLog('Repairing DB', 'Running comprehensive deduplication and logical constraint repairs...')
      
      // 1. Employees
      let empData = await fetchTableFromFirestore(adminUid, 'employees') || []
      const uniqueEmps = []
      const seenIds = new Set()
      const seenEmails = new Set()
      empData.forEach(emp => { 
        if (!seenIds.has(emp.id) && (!emp.email || !seenEmails.has(emp.email))) { 
          seenIds.add(emp.id)
          if (emp.email) seenEmails.add(emp.email)
          uniqueEmps.push(emp) 
        } 
      })

      // 2. Leaves
      let leavesData = await fetchTableFromFirestore(adminUid, 'leave_requests') || []
      const approvedLeavesByEmp = {}
      const fixedLeaves = leavesData.filter(leave => {
        if (!seenIds.has(leave.employeeId)) return false // Remove orphaned
        
        if (leave.status === 'Approved') {
          const start = new Date(leave.startDate).getTime()
          const end = new Date(leave.endDate).getTime()
          let hasOverlap = false
          if (approvedLeavesByEmp[leave.employeeId]) {
            approvedLeavesByEmp[leave.employeeId].forEach(existingLeave => {
              if (start <= existingLeave.end && end >= existingLeave.start) {
                hasOverlap = true
              }
            })
          }
          if (hasOverlap) {
            // Demote overlapping approved leave to rejected to resolve conflict
            leave.status = 'Rejected'
          } else {
            if (!approvedLeavesByEmp[leave.employeeId]) approvedLeavesByEmp[leave.employeeId] = []
            approvedLeavesByEmp[leave.employeeId].push({ start, end })
          }
        }
        return true
      })

      // 3. Attendance Logs
      let logsData = await fetchTableFromFirestore(adminUid, 'attendance_logs') || {}
      const fixedLogs = { ...logsData }
      Object.keys(fixedLogs).forEach(date => {
        if (fixedLogs[date] && typeof fixedLogs[date] === 'object') {
          Object.keys(fixedLogs[date]).forEach(empId => {
            if (!seenIds.has(empId)) delete fixedLogs[date][empId]
          })
        }
      })

      // 4. Payroll
      let payrollData = await fetchTableFromFirestore(adminUid, 'payroll') || {}
      const fixedPayroll = { ...payrollData }
      Object.keys(fixedPayroll).forEach(month => {
        if (Array.isArray(fixedPayroll[month])) {
          fixedPayroll[month] = fixedPayroll[month]
            .filter(record => seenIds.has(record.employeeId))
            .map(record => ({ ...record, grossSalary: Math.max(0, record.grossSalary || 0) }))
        }
      })

      // 5. Expenses
      let expensesData = await fetchTableFromFirestore(adminUid, 'expenses') || []
      const fixedExpenses = expensesData
        .filter(exp => seenIds.has(exp.employeeId))
        .map(exp => ({ ...exp, amount: Math.max(0, exp.amount || 0) }))

      // 6. Performance Scores & Burnout Risks
      let scoresData = await fetchTableFromFirestore(adminUid, 'performance_scores') || []
      const fixedScores = Array.isArray(scoresData) ? scoresData.filter(s => seenIds.has(s.employeeId)) : []

      let risksData = await fetchTableFromFirestore(adminUid, 'burnout_risks') || []
      const fixedRisks = Array.isArray(risksData) ? risksData.filter(r => seenIds.has(r.employeeId)) : []

      // 7. Leave Balances & Skills
      let balancesData = await fetchTableFromFirestore(adminUid, 'leave_balances') || {}
      const fixedBalances = { ...balancesData }
      Object.keys(fixedBalances).forEach(empId => {
        if (!seenIds.has(empId)) delete fixedBalances[empId]
      })

      let skillsData = await fetchTableFromFirestore(adminUid, 'employee_skills') || {}
      const fixedSkills = { ...skillsData }
      Object.keys(fixedSkills).forEach(empId => {
        if (!seenIds.has(empId)) delete fixedSkills[empId]
      })

      let contribsData = await fetchTableFromFirestore(adminUid, 'gig_contributions') || []
      const fixedContribs = Array.isArray(contribsData) ? contribsData.filter(c => seenIds.has(c.employeeId)) : []

      // 8. Tasks & Assets (Unassign deleted employees)
      let tasksData = await fetchTableFromFirestore(adminUid, 'tasks') || []
      const fixedTasks = Array.isArray(tasksData) ? tasksData.map(t => {
        if (t.assigneeId && !seenIds.has(t.assigneeId)) {
          return { ...t, assignee: 'Unassigned', assigneeId: null, assigneeEmail: null }
        }
        return t
      }) : []

      let assetsData = await fetchTableFromFirestore(adminUid, 'assets') || []
      const fixedAssets = Array.isArray(assetsData) ? assetsData.map(a => {
        if (a.assignedTo && !seenIds.has(a.assignedTo)) {
          return { ...a, assignedTo: null, assignedToEmail: null, status: 'Available' }
        }
        return a
      }) : []

      // 9. Notifications
      let notifsData = await fetchTableFromFirestore(adminUid, 'notifications') || []
      const fixedNotifs = Array.isArray(notifsData) ? notifsData.filter(n => {
        if (n.employeeId && !seenIds.has(n.employeeId)) return false
        if (n.actorId && !seenIds.has(n.actorId)) return false
        if (n.targetEmployeeId && !seenIds.has(n.targetEmployeeId)) return false
        return true
      }) : []

      // Save fixed data
      await Promise.all([
        writeToTable(adminUid, 'employees', uniqueEmps),
        writeToTable(adminUid, 'leave_requests', fixedLeaves),
        writeToTable(adminUid, 'attendance_logs', fixedLogs),
        writeToTable(adminUid, 'leave_balances', fixedBalances),
        writeToTable(adminUid, 'payroll', fixedPayroll),
        writeToTable(adminUid, 'expenses', fixedExpenses),
        writeToTable(adminUid, 'performance_scores', fixedScores),
        writeToTable(adminUid, 'burnout_risks', fixedRisks),
        writeToTable(adminUid, 'employee_skills', fixedSkills),
        writeToTable(adminUid, 'gig_contributions', fixedContribs),
        writeToTable(adminUid, 'tasks', fixedTasks),
        writeToTable(adminUid, 'assets', fixedAssets),
        writeToTable(adminUid, 'notifications', fixedNotifs)
      ])

      // Update state
      setEmployeesRaw(uniqueEmps)
      setAttendanceRaw(prev => ({ ...prev, leaves: fixedLeaves, balances: fixedBalances, dailyLogs: fixedLogs }))
      setPayrollRaw(fixedPayroll)
      setExpensesRaw(fixedExpenses)
      setTasksRaw(fixedTasks)
      setAssetsRaw(fixedAssets)
      setNotifications(fixedNotifs)

      // Re-validate
      const remainingIssues = validateDatabase(uniqueEmps, fixedLogs, fixedLeaves, fixedPayroll, fixedExpenses)
      setDataIntegrityIssues(remainingIssues)
      
      if (remainingIssues.length === 0) {
        setDbStatus('healthy')
        addToast('Database successfully repaired!', 'success')
        addLog('Repair Success', 'Removed corrupted and orphaned records. Database is healthy.', 'success')
        setShowCorruptionModal(false)
      } else { 
        addToast('Database partially repaired, remaining issues exist.', 'warning') 
      }
    } catch (e) { addToast('Repair failed: ' + e.message, 'error') }
    finally { setIsSyncing(false) }
  }

  const handleSetAttendance = (updater) => {
    setAttendanceRaw((prev) => {
      const rawNext = typeof updater === 'function' ? updater(prev) : updater
      const next = { ...rawNext, leaves: timestampArrayChanges(prev.leaves, rawNext.leaves) }
      
      if (adminUid) {
        writeToTable(adminUid, 'leave_requests', next.leaves).catch(e => console.error(e));
        writeToTable(adminUid, 'leave_balances', next.balances).catch(e => console.error(e));
        writeToTable(adminUid, 'attendance_logs', next.dailyLogs).catch(e => console.error(e));
      }
      return next
    })
  }

  const handleSetExpenses = (updater) => {
    setExpensesRaw((prev) => {
      const next = timestampArrayChanges(prev, typeof updater === 'function' ? updater(prev) : updater)
      if (adminUid) writeToTable(adminUid, 'expenses', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetEvents = (updater) => {
    setEvents((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (adminUid) writeToTable(adminUid, 'events', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetTasks = (updater) => {
    setTasks((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('kormiis_tasks', JSON.stringify(next))
      localStorage.setItem('kormiis_tasks_updatedAt', String(Date.now()))
      if (adminUid) writeToTable(adminUid, 'tasks', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetNotes = (updater) => {
    setNotesRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('kormiis_notes', JSON.stringify(next))
      localStorage.setItem('kormiis_notes_updatedAt', String(Date.now()))
      if (adminUid) writeToTable(adminUid, 'notes', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetDocuments = (updater) => {
    setDocuments((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (adminUid) writeToTable(adminUid, 'documents', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSetAnnouncements = (updater) => {
    setAnnouncements((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('kormiis_announcements', JSON.stringify(next))
      localStorage.setItem('kormiis_announcements_updatedAt', String(Date.now()))
      if (adminUid) writeToTable(adminUid, 'announcements', next).catch(e => console.error(e));
      return next
    })
  }

  const handleSync = () => { 
    addToast('Retrying sync...', 'info');
    setTimeout(() => {
      if (syncRef.current && !isSyncing) syncRef.current()
    }, 0);
  }

  return {
    /* DB */
    adminUid,
    isSyncing, setIsSyncing,
    dbStatus, setDbStatus,
    dataIntegrityIssues, setDataIntegrityIssues,
    showCorruptionModal, setShowCorruptionModal,
    isAppLoading, setIsAppLoading,

    /* UI */


    pendingProfileEdits, setPendingProfileEdits,
    auditLogs,
    notifications: visibleNotifications, showNotifications, setShowNotifications,

    /* Data */
    employees, payroll, attendance, expenses, events, documents, tasks, notes,
    roster, setRoster, shiftSwaps, setShiftSwaps,
    overtimeClaims, setOvertimeClaims,
    announcements, setAnnouncements: handleSetAnnouncements,
    assets, setAssets, assetRequests, setAssetRequests, assetCategories, setAssetCategories,
    settings: (() => {
      if (!settings) return settings;
      const mojibakeMap = { 'Ã Â§Â³': '৳', 'Ã¢â€šÂ¬': '€', 'Ã‚Â£': '£', 'Ã¢â€šÂ¹': '₹', 'Ã‚Â¥': '¥' }
      if (mojibakeMap[settings.currency]) return { ...settings, currency: mojibakeMap[settings.currency] }
      return settings;
    })(), 
    syncLogs,

    /* Functions */
    handleSetEmployees, handleSetPayroll, handleSetSettings, handleSetTasks, handleSetNotes,
    handleSetAttendance, handleSetExpenses, handleSetEvents, handleSetDocuments,
    handleAutoRepairDatabase, handleSync,
    addLog, addAuditLog, hasPermission,
    addNotification, markNotificationsRead, clearNotifications,
  }
}
