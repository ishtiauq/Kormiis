import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { useModal } from '../services/useModal.js'
import AdSlot from './AdSlot.jsx'
import { formatDate } from '../services/date.js'
import { provisionEmployeeAccount, revokeInvite } from '../services/auth.js'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectItem } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import defaultAvatar from '../Assets/default-avatar.svg'



export default function Employees({ employees, setEmployees, addLog, addAuditLog, pendingProfileEdits, setPendingProfileEdits, addToast, selectedEmployeeId, setSelectedEmployeeId, isSidebarCollapsed, adminUid, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [viewingEmployee, setViewingEmployee] = useState(null)
  const [imageErrors, setImageErrors] = useState({})
  const [expandedCardId, setExpandedCardId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandedDepts, setExpandedDepts] = useState({})
  const [showDeptManager, setShowDeptManager] = useState(false)
  const [deptManagerState, setDeptManagerState] = useState({ editing: null, deleteConfirm: null })
  const [removedDepts, setRemovedDepts] = useState([])
  useModal(() => setViewingEmployee(null))

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setViewingEmployee(null)
    }
    if (viewingEmployee) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingEmployee])

  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find(e => e.id === selectedEmployeeId)
      if (emp) {
        setViewingEmployee(emp)
      }
      setSelectedEmployeeId(null)
    }
  }, [selectedEmployeeId, employees, setSelectedEmployeeId])

  useEffect(() => {
    if (!showAddForm) return
    const handleEsc = (e) => { if (e.key === 'Escape') handleCloseForm() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showAddForm])

  const getAvatarFallback = (name) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa']
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const color = colors[hash % colors.length]
    return { initials, color }
  }

  // Form states
  const [newEmpId, setNewEmpId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Teammate')
  const [newDesignation, setNewDesignation] = useState('')
  const [newPermissions, setNewPermissions] = useState([])
  const [newDept, setNewDept] = useState('Engineering')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newStatus, setNewStatus] = useState('Active')
  const [newDob, setNewDob] = useState('')
  const [newJoiningDate, setNewJoiningDate] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNidPassportId, setNewNidPassportId] = useState('')

  // Dynamic department states
  const [isCustomDept, setIsCustomDept] = useState(false)
  const [customDept, setCustomDept] = useState('')

  // Compute dynamic departments list from default + current employees
  const defaultDepts = ['Engineering', 'Design', 'Human Resources']
  const activeDepts = Array.from(new Set([...defaultDepts, ...employees.map(emp => emp.department)]))
    .filter(d => !removedDepts.includes(d))
  const filterDepartments = ['All', ...activeDepts]

  // Image Drag Handlers removed — profile photo upload is no longer used; a
  // default initials avatar is generated for every employee instead.

  const handleCopyInviteLink = () => {
    const companyId = adminUid || currentUser?.uid;
    if (!companyId) {
      addToast('Error: Company ID not found. Ensure you are logged in correctly.', 'danger');
      return;
    }
    const inviteLink = `${window.location.origin}?company=${companyId}`;
    navigator.clipboard.writeText(inviteLink);
    addToast('Invite link copied to clipboard!', 'success');
  };

  const handleOpenAddForm = () => {
    const generatedId = `EMP-${Math.floor(100 + Math.random() * 900)}`
    setNewEmpId(generatedId)
    setNewPassword('')
    setNewPhone('')
    setShowAddForm(true)
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!newEmpId || !newName || !newRole || (!newEmail && !newPhone) || !newDesignation) {
      if (!newEmail && !newPhone) {
        addToast('Please provide at least a Work Email or Phone Number.', 'warning')
      }
      return
    }

    const finalDept = isCustomDept ? customDept.trim() : newDept
    if (!finalDept) return

    // Prevent duplicate ID for new employees
    if (!editingEmployee && employees.some(emp => emp.id === newEmpId)) {
      alert(`An employee with ID "${newEmpId}" already exists. Please choose a unique ID.`)
      return
    }

    if (editingEmployee) {
      // The teammate manages their own login password (self-service in their
      // profile). The Firebase sign-in email can't be changed from the client
      // SDK, so an admin edit only updates the directory record here.
      if (newEmail && newEmail !== editingEmployee.email) {
        addToast('Email updated in the directory. The sign-in email is unchanged —  reset it in the Firebase console if needed.', 'warning')
      }

      // Update employee list
      setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? {
        ...emp,
        id: newEmpId,
        name: newName,
        role: newRole,
        designation: newDesignation,
        permissions: newPermissions,
        department: finalDept,
        status: newStatus,
        email: newEmail,
        phone: newPhone,
        dob: newDob,
        joiningDate: newJoiningDate,
        nidPassportId: newNidPassportId
      } : emp))
      
      addLog('Updated employee profile', `Saved edits for ${newName} (${newEmpId})`)
      if (addAuditLog) addAuditLog('UPDATE', 'Employee', `Updated employee profile for ${newName} (${newEmpId})`)
    } else {
      const authIdentifier = newEmail.trim() || newPhone.trim()
      if (!authIdentifier) {
        addToast('An email or phone number is required so the teammate can sign in.', 'warning')
        return
      }

      // Invite the teammate by email/phone
      let uid = null
      const companyUid = adminUid || currentUser?.uid
      try {
        const result = await provisionEmployeeAccount({
          email: authIdentifier,
          password: newPassword,
          name: newName,
          role: newRole,
          companyUid,
          employeeId: newEmpId,
          department: finalDept,
          avatar: ''
        })
        uid = result.uid
      } catch (err) {
        addToast('Failed to create login account: ' + err.message, 'danger')
        return
      }

      // Add new employee
      const newEmp = {
        id: newEmpId,
        name: newName,
        role: newRole,
        designation: newDesignation,
        permissions: newPermissions,
        department: finalDept,
        status: newStatus,
        email: newEmail,
        phone: newPhone,
        uid,
        avatar: defaultAvatar,
        dob: newDob,
        joiningDate: newJoiningDate,
        nidPassportId: newNidPassportId
      }
      setEmployees(prev => [...prev, newEmp])
      addLog('Added new employee', `Saved ${newName} (${newEmpId})`)
      if (addAuditLog) addAuditLog('CREATE', 'Employee', `Created new employee profile for ${newName} (${newEmpId})`)
    }

    // Reset Form
    handleCloseForm()
  }

  const handleCloseForm = () => {
    setNewEmpId('')
    setNewName('')
    setNewRole('Teammate')
    setNewDesignation('')
    setNewPermissions([])
    setNewDept('Engineering')
    setNewEmail('')
    setNewPhone('')
    setNewStatus('Active')
    setNewDob('')
    setNewJoiningDate('')
    setNewNidPassportId('')
    setIsCustomDept(false)
    setCustomDept('')
    setEditingEmployee(null)
    setShowAddForm(false)
  }

  const handleDeleteEmployee = async (id, name) => {
    const emp = employees.find(e => e.id === id)
    setEmployees(prev => prev.filter(emp => emp.id !== id))
    addLog('Deleted employee record', `Removed ${name} (${id})`)
    if (addAuditLog) addAuditLog('DELETE', 'Employee', `Deleted employee profile for ${name} (${id})`)
    if (emp?.email) {
      await revokeInvite(emp.email)
      addLog('Access revoked', `Teammate invite for ${name} (${emp.email}) is no longer valid.`)
    }
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size > 0 && [...prev].every(id => filteredEmployees.some(emp => emp.id === id))) {
        return new Set()
      }
      return new Set(filteredEmployees.map(emp => emp.id))
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkDelete = () => {
    const count = selectedIds.size
    if (count === 0) return
    setConfirmDelete(() => () => {
      const deletedNames = employees.filter(emp => selectedIds.has(emp.id)).map(emp => emp.name).join(', ')
      setEmployees(prev => prev.filter(emp => !selectedIds.has(emp.id)))
      addLog('Bulk deleted employees', `Removed ${count} employees: ${deletedNames}`)
      if (addAuditLog) addAuditLog('DELETE_MANY', 'Employee', `Bulk deleted ${count} employee records`)
      clearSelection()
      setConfirmDelete(null)
    })
  }

  const handleDownloadSelected = () => {
    const count = selectedIds.size
    if (count === 0) return
    const selected = employees.filter(emp => selectedIds.has(emp.id))
    const headers = ['ID', 'Name', 'Role', 'Department', 'Email', 'Phone', 'Status', 'DOB', 'Joining Date']
    const csvRows = [headers.join(',')]
    selected.forEach(emp => {
      csvRows.push([
        emp.id,
        `"${(emp.name || '').replace(/"/g, '""')}"`,
        `"${(emp.role || '').replace(/"/g, '""')}"`,
        `"${(emp.department || '').replace(/"/g, '""')}"`,
        emp.email || '',
        emp.phone || '',
        emp.status || '',
        emp.dob || '',
        emp.joiningDate || ''
      ].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected_employees_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addLog('Downloaded employee data', `Exported ${count} employee records as CSV`)
    clearSelection()
  }

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    const term = debouncedSearchTerm.toLowerCase()
    const matchesSearch = (emp.name && emp.name.toLowerCase().includes(term)) || 
                          (emp.role && emp.role.toLowerCase().includes(term)) ||
                          (emp.id && emp.id.toLowerCase().includes(term)) ||
                          (emp.email && emp.email.toLowerCase().includes(term)) ||
                          (emp.phone && emp.phone.includes(debouncedSearchTerm))
    const matchesDept = deptFilter === 'All' || emp.department === deptFilter
    return matchesSearch && matchesDept
  })

  const toggleDept = (key) => setExpandedDepts(prev => ({ ...prev, [key]: !prev[key] }))

  const departmentGroups = (deptFilter === 'All' ? activeDepts : activeDepts.filter(d => d === deptFilter))
    .map(dept => ({ key: dept, items: filteredEmployees.filter(emp => emp.department === dept) }))
    .filter(g => g.items.length > 0 || g.key === deptFilter)

  const handleSaveDeptEdit = (oldName, newName) => {
    const name = (newName || '').trim()
    if (!name) return addToast('Department name is required', 'warning')
    if (oldName === name) { setDeptManagerState({ editing: null, deleteConfirm: null }); return }
    if (activeDepts.includes(name)) return addToast('Department already exists', 'warning')
    setEmployees(prev => prev.map(emp => emp.department === oldName ? { ...emp, department: name } : emp))
    setRemovedDepts(prev => prev.map(d => d === oldName ? name : d))
    setDeptFilter(prev => prev === oldName ? name : prev)
    setExpandedDepts(prev => {
      const next = { ...prev }
      delete next[oldName]
      if (prev[oldName]) next[name] = true
      return next
    })
    setDeptManagerState({ editing: null, deleteConfirm: null })
    addToast(`Department renamed to "${name}"`, 'success')
    addLog('Renamed department', `Department "${oldName}" renamed to "${name}"`)
  }

  const handleDeleteDept = (deptName) => {
    setEmployees(prev => prev.map(emp => emp.department === deptName ? { ...emp, department: 'Uncategorized' } : emp))
    setRemovedDepts(prev => [...prev, deptName])
    setDeptFilter(prev => prev === deptName ? 'All' : prev)
    setDeptManagerState({ editing: null, deleteConfirm: null })
    addToast(`Department "${deptName}" deleted. Employees moved to Uncategorized.`, 'info')
    addLog('Deleted department', `Department "${deptName}" deleted, employees moved to Uncategorized`, 'warning')
  }

  const handleApproveProfileEdit = (editId) => {
    const editReq = pendingProfileEdits.find(e => e.id === editId)
    if (!editReq) return

    setEmployees(prev => prev.map(emp => {
      if (emp.id === editReq.employeeId) {
        return {
          ...emp,
          personalEmail: editReq.changes.personalEmail || emp.personalEmail,
          phone: editReq.changes.phone || emp.phone,
          address: editReq.changes.address || emp.address,
          emergencyContact: editReq.changes.emergencyContact || emp.emergencyContact
        }
      }
      return emp
    }))

    setPendingProfileEdits(prev => prev.filter(e => e.id !== editId))
    addLog('Profile Edit Approved', `Approved profile updates for ${editReq.employeeId}`, 'success')
    addToast('Profile updates approved and applied.', 'success')
  }

  const handleRejectProfileEdit = (editId) => {
    const editReq = pendingProfileEdits.find(e => e.id === editId)
    if (!editReq) return

    setPendingProfileEdits(prev => prev.filter(e => e.id !== editId))
    addLog('Profile Edit Rejected', `Rejected profile updates for ${editReq.employeeId}`, 'warning')
    addToast('Profile updates rejected.', 'info')
  }

  const expectedHeaders = ['id', 'name', 'email', 'department', 'role', 'status', 'dob', 'joiningDate', 'avatar', 'password']

  const validateCSVRow = (row) => {
    if (!row.name || !row.name.trim()) return 'Name is required'
    if (!row.email || !row.email.trim()) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(row.email.trim())) return `Invalid email format: ${row.email}`
    return null
  }

  const sanitizeCell = (value) => {
    if (typeof value !== 'string') return value
    return value.replace(/^[=+\-@\t\r]/, '')
  }

  const DEMO_CSV = `id,name,email,department,role,status,dob,joiningDate,avatar,password
EMP-101,Rafiqul Islam,rafiqul@kormiis.com,Engineering,Teammate,Active,1995-03-12,2024-01-15,,
EMP-102,Tasnim Akter,tasnim@kormiis.com,Design,Teammate,Active,1997-07-24,2024-02-01,,
EMP-103,Shakil Hossain,shakil@kormiis.com,Human Resources,HR Officer,Active,1992-11-05,2023-09-10,,`

  const handleDownloadDemoCSV = () => {
    const blob = new Blob([DEMO_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'demo_employees_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('Demo CSV downloaded. Fill in the rows and re-upload via Import CSV.', 'info')
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      
      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if(!open) setConfirmDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">Are you sure you want to delete the selected employee(s)? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if(confirmDelete) confirmDelete(); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient"><Icon name="group" className="text-foreground" size={20}/>Employees</h1>
      </div>

      {/* Pending Profile Updates Queue */}
      {pendingProfileEdits && pendingProfileEdits.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Icon name="error" className="h-5 w-5" size={20}/>
              Pending Profile Update Requests ({pendingProfileEdits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pendingProfileEdits.map(editReq => {
              const emp = employees.find(e => e.id === editReq.employeeId)
              return (
                <div key={editReq.id} className="flex justify-between items-center p-3 rounded-lg bg-background border border-border shadow-sm flex-wrap gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm">{emp ? emp.name : 'Unknown Employee'}</strong>
                      <span className="text-xs text-muted-foreground">ID: {editReq.employeeId}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap text-xs">
                      {Object.entries(editReq.changes).map(([key, val]) => (
                        val ? (
                          <Badge variant="outline" key={key} className="bg-muted/50 font-normal">
                            <strong className="mr-1 font-medium">{key}: </strong> {val}
                          </Badge>
                        ) : null
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleApproveProfileEdit(editReq.id)}>
                      <Icon name="check" className="mr-1 h-3.5 w-3.5" size={14}/> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleRejectProfileEdit(editReq.id)}>
                      <Icon name="close" className="mr-1 h-3.5 w-3.5" size={14}/> Reject
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20">
          <Icon name="check" className="h-4 w-4 shrink-0" size={16}/>
          <span className="flex-1">{selectedIds.size} selected</span>
          <Button size="sm" variant="destructive" className="h-8" onClick={handleBulkDelete}>
            <Icon name="delete" className="mr-1 h-3.5 w-3.5" size={14}/> Delete ({selectedIds.size})
          </Button>
          <Button size="sm" variant="default" className="h-8" onClick={handleDownloadSelected}>
            <Icon name="download" className="mr-1 h-3.5 w-3.5" size={14}/> Download CSV
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-full" onClick={clearSelection}>
            <Icon name="close" className="h-4 w-4" size={16}/>
          </Button>
        </div>
      )}

      {/* Directory Grid */}
      <Card className="shadow-xs border-border bg-card overflow-hidden">
        {/* Card header: search + actions */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-muted/20">
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" size={16}/>
            <Input type="text" placeholder="Search by name, role, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-background border-input shadow-sm w-full" />
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="hidden sm:flex items-center gap-2 pr-3 sm:pr-4 border-r border-border shrink-0">
              <input
                type="checkbox"
                checked={filteredEmployees.length > 0 && selectedIds.size === filteredEmployees.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
              />
              <span className="text-sm font-medium whitespace-nowrap">Select All</span>
            </div>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    const csvText = event.target.result;
                    try {
                      const lines = csvText.split('\\n').filter(line => line.trim());
                      if (lines.length < 2) {
                        addToast('CSV file must have a header row and at least one data row.', 'warning');
                        return;
                      }
                      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
                      const validHeaders = expectedHeaders.filter(h => rawHeaders.includes(h));
                      if (validHeaders.length === 0) {
                        addToast('CSV headers must include at least one of: ' + expectedHeaders.join(', '), 'warning');
                        return;
                      }
                      const imported = [];
                      const errors = [];
                      for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(c => sanitizeCell(c.trim().replace(/^["']|["']$/g, '')));
                        const row = {};
                        rawHeaders.forEach((header, index) => {
                          row[header] = cols[index] || '';
                        });
                        const error = validateCSVRow(row);
                        if (error) {
                          errors.push(`Row ${i + 1}: ${error}`);
                          continue;
                        }
                        if (row.email) {
                          try {
                            const companyUid = adminUid || currentUser?.uid
                            const prov = await provisionEmployeeAccount({
                              email: row.email,
                              name: row.name,
                              role: row.role || 'Teammate',
                              companyUid,
                              employeeId: row.id,
                              department: row.department || '',
                              avatar: row.avatar || ''
                            })
                            row.uid = prov.uid || ''
                          } catch (provErr) {
                            errors.push(`Row ${i + 1}: invite not sent (${provErr.message})`)
                            continue
                          }
                          delete row.password;
                        }
                        row.avatar = row.avatar || defaultAvatar;
                        row.updated_at = new Date().toISOString();
                        imported.push(row);
                      }
                      if (errors.length > 0) {
                        addToast(`Skipped ${errors.length} invalid row(s)`, 'warning');
                      }
                      if (imported.length > 0) {
                        setEmployees(prev => {
                          const existingIds = new Set(prev.map(e => e.id));
                          const filteredImport = imported.filter(e => !existingIds.has(e.id));
                          return [...prev, ...filteredImport];
                        });
                        addToast(`Successfully imported ${imported.length} employees.`, 'success');
                      }
                    } catch (err) {
                      addToast('Failed to parse CSV file: ' + err.message, 'danger');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
            <Button variant="outline" onClick={handleCopyInviteLink} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="link" className="mr-2 h-4 w-4 text-primary" size={16}/> Invite Link
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('csv-file-input').click()} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="table_chart" className="mr-2 h-4 w-4" size={16}/> Import CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadDemoCSV} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="file_download" className="mr-2 h-4 w-4 text-primary" size={16}/> Demo CSV
            </Button>
            <Button onClick={handleOpenAddForm} className="shadow-sm shadow-primary/20 flex-1 sm:flex-none">
              <Icon name="add" className="mr-2 h-4 w-4" size={16}/> Add Employee
            </Button>
          </div>
        </div>

        {/* Accordion header row */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            onClick={() => {
              const allOpen = Object.keys(expandedDepts).length > 0 && activeDepts.every(d => !!expandedDepts[d])
              setExpandedDepts(activeDepts.reduce((acc, d) => ({ ...acc, [d]: !allOpen }), {}))
            }}
          >
            <Icon name="group" className="text-primary" size={18}/>
            All Employees
            <Badge variant="secondary" className="text-xs shrink-0">{filteredEmployees.length}</Badge>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setShowDeptManager(true)} className="rounded-full h-8 px-3 text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Icon name="tune" size={14}/> Manage Department
          </Button>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Icon name="group" className="h-16 w-16 mb-4 text-muted-foreground/50" size={64}/>
            <h3 className="text-xl font-medium text-foreground mb-4">No employees found</h3>
            <Button variant="outline" onClick={() => {setSearchTerm(''); setDeptFilter('All')}}>Clear Filters</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {departmentGroups.map(group => {
              const isOpen = !!expandedDepts[group.key]
              return (
                <div key={group.key}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => toggleDept(group.key)}
                  >
                    <Icon name={isOpen ? 'expand_more' : 'chevron_right'} className="text-muted-foreground shrink-0 transition-transform" size={20}/>
                    <span className="p-1.5 bg-primary/10 rounded-md text-primary flex items-center justify-center">
                      <Icon name="apartment" size={16}/>
                    </span>
                    <span className="flex-1 font-semibold text-foreground truncate">{group.key}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{group.items.length}</Badge>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 animate-fade-in">
                      {group.items.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 border border-border border-dashed rounded-lg">
                          No employees in this department.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
                          {group.items.map(emp => {
                            const isExpanded = expandedCardId === emp.id
                            return (
                              <Card key={emp.id} className="relative group glass-card overflow-visible hover:-translate-y-0.5 hover:shadow-2xl hover:border-primary/40 transition-all duration-400 cursor-pointer" onClick={() => setViewingEmployee(emp)}>

                {/* Selection Checkbox */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-3 left-3 z-10 p-1 rounded-full bg-background/80 backdrop-blur border shadow-sm transition-opacity ${selectedIds.has(emp.id) ? 'opacity-100 border-primary' : 'opacity-0 group-hover:opacity-100 border-border'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={(e) => toggleSelect(emp.id, e)}
                    className="w-4 h-4 cursor-pointer m-0 block accent-primary"
                  />
                </div>

                <CardContent className="p-0">

                  {/* Header */}
                  <div className="p-3.5 pb-3 flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar className={`h-11 w-11 border-2 shadow-sm transition-all duration-300 ${emp.status !== 'Active' ? 'grayscale opacity-70' : ''}`}>
                        {!imageErrors[emp.id] && (
                          <AvatarImage src={emp.avatar || defaultAvatar} alt={emp.name} style={{ transform: `translate(${emp.photoX || 0}px, ${emp.photoY || 0}px) scale(${emp.photoZoom || 1})`, transformOrigin: 'center' }} onError={() => setImageErrors(prev => ({...prev, [emp.id]: true}))} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {getAvatarFallback(emp.name).initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${emp.status === 'Active' ? 'bg-green-500' : emp.status === 'On Leave' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm leading-tight truncate">{emp.name}</h4>
                      <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">{emp.designation || emp.role}</p>
                      <span className={`inline-flex items-center px-1.5 py-0 mt-1 rounded-full text-[10px] font-semibold border ${emp.status === 'Active' ? 'bg-green-500/10 text-green-700 border-green-500/20' : emp.status === 'On Leave' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'}`}>
                        {emp.status}
                      </span>
                    </div>

                    {/* Quick contact actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {emp.email && (
                        <a
                          href={`mailto:${emp.email}`}
                          onClick={(e) => e.stopPropagation()}
                          title={`Email ${emp.name}`}
                          className="liquid-icon-btn size-7 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-90 transition-all cursor-pointer"
                        >
                          <Icon name="mail" size={14}/>
                        </a>
                      )}
                      {emp.phone && (
                        <a
                          href={`tel:${emp.phone.replace(/[\s-]/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          title={`Call ${emp.name}`}
                          className="liquid-icon-btn size-7 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-90 transition-all cursor-pointer"
                        >
                          <Icon name="call" size={14}/>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Chips: department + employee id */}
                  <div className="px-3.5 pb-3 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border/70 text-[11px] font-medium text-muted-foreground">
                      <Icon name="apartment" size={12} className="text-primary/70"/> {emp.department}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border/70 text-[11px] font-medium text-muted-foreground font-mono">
                      <Icon name="badge" size={12} className="text-primary/70"/> {emp.id}
                    </span>
                  </div>

                  {/* Expanded panel */}
                  <div className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="mx-3 mb-2.5 rounded-xl border border-border/70 bg-muted/30 p-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        {emp.email && (
                          <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 break-all hover:text-primary transition-colors">
                            <Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" size={14}/> {emp.email}
                          </a>
                        )}
                        {emp.phone && (
                          <a href={`tel:${emp.phone.replace(/[\s-]/g, '')}`} className="flex items-center gap-1.5 break-all hover:text-primary transition-colors">
                            <Icon name="call" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" size={14}/> {emp.phone}
                          </a>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Icon name="cake" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" size={14}/>
                          <span>DOB: {emp.dob ? formatDate(emp.dob) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon name="calendar_month" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" size={14}/>
                          <span>Joined: {emp.joiningDate ? formatDate(emp.joiningDate) : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs font-medium bg-background hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEmployee(emp); setNewEmpId(emp.id); setNewName(emp.name); setNewRole(emp.role || 'Teammate'); setNewDesignation(emp.designation || emp.role || ''); setNewPermissions(emp.permissions || []); setNewDept(emp.department); setNewEmail(emp.email || ''); setNewPhone(emp.phone || ''); setNewStatus(emp.status); setNewDob(emp.dob || ''); setNewJoiningDate(emp.joiningDate || ''); setNewNidPassportId(emp.nidPassportId || ''); setIsCustomDept(false); setCustomDept(''); setShowAddForm(true);
                          }}
                        >
                          <Icon name="edit" className="mr-1.5 h-3.5 w-3.5" size={14}/> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(() => () => {
                              handleDeleteEmployee(emp.id, emp.name);
                              setConfirmDelete(null);
                            });
                          }}
                        >
                          <Icon name="delete" className="mr-1.5 h-3.5 w-3.5" size={14}/> Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expand Toggle — sleek icon button at the bottom of the card */}
                  <div className="flex justify-center py-1 border-t border-border/60">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardId(prev => prev === emp.id ? null : emp.id);
                      }}
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      title={isExpanded ? 'Collapse details' : 'Expand details'}
                      className="liquid-icon-btn size-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer active:scale-90"
                    >
                      <Icon name="keyboard_arrow_down" className={`h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={14}/>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Employee Detail Modal */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => { if(!open) setViewingEmployee(null) }}>
        <DialogContent className="sm:max-w-md">
          {viewingEmployee && (
            <>
              <div className="flex flex-col items-center pt-4 pb-2">
                <Avatar className="h-24 w-24 mb-4 border-2 border-primary/20 shadow-sm text-2xl">
                  {!imageErrors[viewingEmployee.id] && (
                    <AvatarImage src={viewingEmployee.avatar || defaultAvatar} alt={viewingEmployee.name} style={{ transform: `translate(${viewingEmployee.photoX || 0}px, ${viewingEmployee.photoY || 0}px) scale(${viewingEmployee.photoZoom || 1})`, transformOrigin: 'center' }} onError={() => setImageErrors(prev => ({...prev, [viewingEmployee.id]: true}))} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {getAvatarFallback(viewingEmployee.name).initials}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-foreground text-center">{viewingEmployee.name}</h3>
                <p className="text-fluid-sm text-muted-foreground text-center mt-1">{viewingEmployee.designation || viewingEmployee.role}</p>
                <Badge variant={viewingEmployee.status === 'Active' ? 'default' : 'secondary'} className="mt-3">
                  {viewingEmployee.status}
                </Badge>
              </div>
              
              <div className="grid gap-3 py-4 px-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Employee ID</span>
                  <span className="col-span-2 text-sm font-semibold font-sans">{viewingEmployee.id}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Department</span>
                  <span className="col-span-2 text-sm">{viewingEmployee.department}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Work Email</span>
                  <span className="col-span-2 text-sm break-all text-primary">
                    {viewingEmployee.email ? (
                      <a href={`mailto:${viewingEmployee.email}`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-4">
                        <Icon name="mail" className="h-3.5 w-3.5 shrink-0" size={14}/>{viewingEmployee.email}
                      </a>
                    ) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Phone Number</span>
                  <span className="col-span-2 text-sm font-sans">
                    {viewingEmployee.phone ? (
                      <a href={`tel:${viewingEmployee.phone.replace(/[\s-]/g, '')}`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-4">
                        <Icon name="call" className="h-3.5 w-3.5 shrink-0" size={14}/>{viewingEmployee.phone}
                      </a>
                    ) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Joined Date</span>
                  <span className="col-span-2 text-sm">{viewingEmployee.joiningDate ? formatDate(viewingEmployee.joiningDate) : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">NID / Passport ID</span>
                  <span className="col-span-2 text-sm font-sans">{viewingEmployee.nidPassportId || '-'}</span>
                </div>
              </div>

              <DialogFooter className="sm:justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setViewingEmployee(null)}>Close</Button>
                <Button onClick={() => {
                  setViewingEmployee(null);
                  setEditingEmployee(viewingEmployee);
                  setNewEmpId(viewingEmployee.id);
                  setNewName(viewingEmployee.name);
                  setNewRole(viewingEmployee.role || 'Teammate');
                  setNewDesignation(viewingEmployee.designation || viewingEmployee.role || '');
                  setNewPermissions(viewingEmployee.permissions || []);
                  setNewDept(viewingEmployee.department);
                  setNewEmail(viewingEmployee.email || '');
                  setNewPhone(viewingEmployee.phone || '');
                  setNewStatus(viewingEmployee.status);
                  setNewDob(viewingEmployee.dob || '');
                  setNewJoiningDate(viewingEmployee.joiningDate || '');
                  setNewNidPassportId(viewingEmployee.nidPassportId || '');
                  setIsCustomDept(false);
                  setCustomDept('');
                  setShowAddForm(true);
                }}>
                  <Icon name="edit" className="mr-2 h-4 w-4" size={16}/> Edit Record
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEmployee ? <Icon name="edit" className="h-5 w-5 text-primary" size={20}/> : <Icon name="person_add" className="h-5 w-5 text-primary" size={20}/>}
              {editingEmployee ? 'Edit Employee Profile' : 'New Employee Record'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEmployee} className="flex flex-col gap-6 py-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Employee ID</label>
                <Input required value={newEmpId} onChange={(e) => setNewEmpId(e.target.value.trim().toUpperCase())} className="font-sans" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input required value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Job Title</label>
                <Input required value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">System Access Role</label>
                <Select value={newRole} onChange={(val) => { setNewRole(val); if(val === 'Admin') setNewPermissions([]); }}>
                  <SelectItem id="Teammate">Teammate</SelectItem>
                  <SelectItem id="Admin">Admin</SelectItem>
                </Select>
              </div>

              {newRole === 'Teammate' && (
                <div className="flex flex-col gap-2 md:col-span-2 mt-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-bold text-foreground">Special Access Permissions</label>
                  <p className="text-fluid-xs text-muted-foreground mb-3">Teammates can only see basic modules (Dashboard, Tasks, Calendar, Expenses). Select below to give them extra access to Admin modules.</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('payroll')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'payroll'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'payroll'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Payroll Module
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('employees')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'employees'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'employees'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Employee Directory
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('approve_expenses')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'approve_expenses'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'approve_expenses'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Expense Approver
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('approve_leaves')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'approve_leaves'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'approve_leaves'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Leave Approver
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('manage_attendance')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'manage_attendance'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'manage_attendance'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Manage Attendance & Leaves
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newPermissions.includes('assets')} 
                        onChange={(e) => {
                          if (e.target.checked) setNewPermissions(prev => [...prev, 'assets'])
                          else setNewPermissions(prev => prev.filter(p => p !== 'assets'))
                        }} 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      Asset Management
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Select label="Department" value={isCustomDept ? 'NEW' : newDept} onChange={(val) => {
                    if (val === 'NEW') { setIsCustomDept(true); } 
                    else { setIsCustomDept(false); setNewDept(val); }
                  }}>
                  {activeDepts.map(d => <SelectItem key={d} id={d}>{d}</SelectItem>)}
                  <SelectItem id="NEW">+ Add New Department...</SelectItem>
                </Select>
                {isCustomDept && (
                  <Input required placeholder="New dept name..." value={customDept} onChange={(e) => setCustomDept(e.target.value)} className="mt-1" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Work Email</label>
                <Input 
                  type="email" 
                  placeholder="e.g. employee@company.com" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  type="tel" 
                  placeholder="e.g. +8801700000000 or 017..." 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)} 
                />
              </div>

              {!editingEmployee && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Temporary Password</label>
                  <Input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              )}

              <DatePicker label="Date of Birth" value={newDob} onChange={(e) => setNewDob(e.target.value)} />

              <DatePicker label="Joining Date" value={newJoiningDate} onChange={(e) => setNewJoiningDate(e.target.value)} />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">NID / Passport ID</label>
                <Input
                  placeholder="e.g. 1994123456789 or P1234567"
                  value={newNidPassportId}
                  onChange={(e) => setNewNidPassportId(e.target.value)}
                />
              </div>

              <Select label="Employment Status" value={newStatus} onChange={setNewStatus}>
                <SelectItem id="Active">Active</SelectItem>
                <SelectItem id="On Leave">On Leave</SelectItem>
                <SelectItem id="Inactive">Inactive</SelectItem>
              </Select>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="w-full bg-muted/50 px-3 py-2.5 rounded-md text-[11px] text-muted-foreground text-left leading-relaxed mb-4">
                The teammate signs in using their Work Email or Phone Number with their password, or their Google account.
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
                <Button type="submit">{editingEmployee ? 'Save Changes' : 'Create Record'}</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AdSlot type="horizontal" className="mt-8" />

      {showDeptManager && (
        <DepartmentManagerModal
          departments={activeDepts}
          employees={employees}
          onClose={() => setShowDeptManager(false)}
          onEdit={handleSaveDeptEdit}
          onDelete={handleDeleteDept}
          managerState={deptManagerState}
          setManagerState={setDeptManagerState}
        />
      )}
    </div>
  )
}

function DepartmentManagerModal({ departments, employees, onClose, onEdit, onDelete, managerState, setManagerState }) {
  useModal(onClose)
  const [editValue, setEditValue] = useState('')

  const openEdit = (dept) => {
    setManagerState({ editing: dept, deleteConfirm: null })
    setEditValue(dept)
  }

  const submitEdit = () => {
    onEdit(managerState.editing, editValue)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-4 mb-4 space-y-0">
          <DialogTitle>Manage Departments</DialogTitle>
          <button className="rounded-full p-2 hover:bg-muted transition-colors" onClick={onClose}>
            <Icon name="close" size={16}/>
          </button>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.82rem] font-semibold text-muted-foreground">Departments</label>
            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
              {(departments || []).map(dept => (
                <div key={dept} className="flex items-center gap-2 p-2 px-3 rounded-lg bg-muted/30 border border-border">
                  <span className="flex-1 text-[0.9rem] font-medium text-foreground">{dept}</span>
                  <span className="text-[11px] text-muted-foreground">{employees.filter(e => e.department === dept).length} employee(s)</span>
                  <Button variant="ghost" size="icon-xs" aria-label="Edit department" onClick={() => openEdit(dept)}>
                    <Icon name="edit" size={14}/>
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label="Delete department" onClick={() => setManagerState({ editing: null, deleteConfirm: dept })}>
                    <Icon name="delete" className="text-destructive" size={14}/>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {managerState.editing && (
            <div className="border-t border-border pt-4">
              <h3 className="m-0 mb-3 text-[0.95rem] font-semibold text-foreground">Edit Department</h3>
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  aria-label="Department name"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitEdit() } }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setManagerState({ editing: null, deleteConfirm: null })}>Cancel</Button>
                  <Button variant="default" size="sm" className="flex items-center gap-1.5" onClick={submitEdit}>
                    <Icon name="check" size={14}/> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {managerState.deleteConfirm && (
            <div className="border-t border-border pt-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <Icon name="warning" className="text-destructive mt-0.5 shrink-0" size={16}/>
                <p className="text-fluid-sm text-foreground">
                  Delete "<strong>{managerState.deleteConfirm}</strong>"? Employees in this department will be moved to <strong>Uncategorized</strong>.
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-3">
                <Button variant="secondary" size="sm" onClick={() => setManagerState({ editing: null, deleteConfirm: null })}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(managerState.deleteConfirm)}>Delete</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
