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
  const [newStatus, setNewStatus] = useState('Active')
  const [newDob, setNewDob] = useState('')
  const [newJoiningDate, setNewJoiningDate] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newCvFileName, setNewCvFileName] = useState('')
  const [newNidFileName, setNewNidFileName] = useState('')
  const [newAvatar, setNewAvatar] = useState('')
  
  // Repositioning states
  const [photoX, setPhotoX] = useState(0)
  const [photoY, setPhotoY] = useState(0)
  const [photoZoom, setPhotoZoom] = useState(1)
  const [dragStart, setDragStart] = useState(null)

  // Dynamic department states
  const [isCustomDept, setIsCustomDept] = useState(false)
  const [customDept, setCustomDept] = useState('')

  // Compute dynamic departments list from default + current employees
  const defaultDepts = ['Engineering', 'Design', 'Human Resources']
  const activeDepts = Array.from(new Set([...defaultDepts, ...employees.map(emp => emp.department)]))
    .filter(d => !removedDepts.includes(d))
  const filterDepartments = ['All', ...activeDepts]

  // Image Drag Handlers
  const handlePointerDown = (e) => {
    e.preventDefault()
    setDragStart({ x: e.clientX - photoX, y: e.clientY - photoY })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragStart) return
    setPhotoX(e.clientX - dragStart.x)
    setPhotoY(e.clientY - dragStart.y)
  }

  const handlePointerUp = (e) => {
    if (dragStart) {
      setDragStart(null)
    }
  }

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
    setNewAvatar('')
    setPhotoX(0)
    setPhotoY(0)
    setPhotoZoom(1)
    setShowAddForm(true)
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!newEmpId || !newName || !newRole || !newEmail || !newDesignation) return

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
        addToast('Email updated in the directory. The sign-in email is unchanged — reset it in the Firebase console if needed.', 'warning')
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
        dob: newDob,
        joiningDate: newJoiningDate,
        cvFileName: newCvFileName,
        nidFileName: newNidFileName,
        avatar: newAvatar || emp.avatar,
        photoX: photoX,
        photoY: photoY,
        photoZoom: photoZoom
      } : emp))
      
      addLog('Updated employee profile', `Saved edits for ${newName} (${newEmpId})`)
      if (addAuditLog) addAuditLog('UPDATE', 'Employee', `Updated employee profile for ${newName} (${newEmpId})`)
      if (newCvFileName) {
        addLog('CV Uploaded', `Uploaded CV (${newCvFileName}) for ${newName}`)
      }
      if (newNidFileName) {
        addLog('Identity Uploaded', `Uploaded ID/Passport (${newNidFileName}) for ${newName}`)
      }
    } else {
      if (!newEmail) {
        addToast('An email is required so the teammate can be invited to sign in.', 'warning')
        return
      }

      // Invite the teammate by email — they sign in with their own Google account
      let uid = null
      const companyUid = adminUid || currentUser?.uid
      try {
        const result = await provisionEmployeeAccount({
          email: newEmail,
          name: newName,
          role: newRole,
          companyUid,
          employeeId: newEmpId,
          department: finalDept,
          avatar: newAvatar || ''
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
        uid,
        avatar: newAvatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&q=80&w=200`,
        dob: newDob,
        joiningDate: newJoiningDate,
        cvFileName: newCvFileName,
        nidFileName: newNidFileName,
        photoX: photoX,
        photoY: photoY,
        photoZoom: photoZoom
      }
      setEmployees(prev => [...prev, newEmp])
      addLog('Added new employee', `Saved ${newName} (${newEmpId})`)
      if (addAuditLog) addAuditLog('CREATE', 'Employee', `Created new employee profile for ${newName} (${newEmpId})`)
      if (newCvFileName) {
        addLog('CV Uploaded', `Synced CV (${newCvFileName}) to employee directory`)
      }
      if (newNidFileName) {
        addLog('Identity Uploaded', `Synced ID/Passport (${newNidFileName}) to employee directory`)
      }
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
    setNewStatus('Active')
    setNewDob('')
    setNewJoiningDate('')
    setNewCvFileName('')
    setNewNidFileName('')
    setNewAvatar('')
    setPhotoX(0)
    setPhotoY(0)
    setPhotoZoom(1)
    setDragStart(null)
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
    const headers = ['ID', 'Name', 'Role', 'Department', 'Email', 'Status', 'DOB', 'Joining Date']
    const csvRows = [headers.join(',')]
    selected.forEach(emp => {
      csvRows.push([
        emp.id,
        `"${(emp.name || '').replace(/"/g, '""')}"`,
        `"${(emp.role || '').replace(/"/g, '""')}"`,
        `"${(emp.department || '').replace(/"/g, '""')}"`,
        emp.email || '',
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
    const matchesSearch = emp.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                           emp.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           emp.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient"><Icon name="group" size={20} className="text-foreground" />Employees</h1>
      </div>

      {/* Pending Profile Updates Queue */}
      {pendingProfileEdits && pendingProfileEdits.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Icon name="error" size={20} className="h-5 w-5" />
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
                      <Icon name="check" size={14} className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleRejectProfileEdit(editReq.id)}>
                      <Icon name="close" size={14} className="mr-1 h-3.5 w-3.5" /> Reject
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
          <Icon name="check" size={16} className="h-4 w-4 shrink-0" />
          <span className="flex-1">{selectedIds.size} selected</span>
          <Button size="sm" variant="destructive" className="h-8" onClick={handleBulkDelete}>
            <Icon name="delete" size={14} className="mr-1 h-3.5 w-3.5" /> Delete ({selectedIds.size})
          </Button>
          <Button size="sm" variant="default" className="h-8" onClick={handleDownloadSelected}>
            <Icon name="download" size={14} className="mr-1 h-3.5 w-3.5" /> Download CSV
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-full" onClick={clearSelection}>
            <Icon name="close" size={16} className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Directory Grid */}
      <Card className="shadow-xs border-border bg-card overflow-hidden">
        {/* Card header: search + actions */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-muted/20">
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        row.avatar = row.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`;
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
              <Icon name="link" size={16} className="mr-2 h-4 w-4 text-primary" /> Invite Link
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('csv-file-input').click()} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="table_chart" size={16} className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={handleOpenAddForm} className="shadow-sm shadow-primary/20 flex-1 sm:flex-none">
              <Icon name="add" size={16} className="mr-2 h-4 w-4" /> Add Employee
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
            <Icon name="group" size={18} className="text-primary" />
            All Employees
            <Badge variant="secondary" className="text-xs shrink-0">{filteredEmployees.length}</Badge>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setShowDeptManager(true)} className="rounded-full h-8 px-3 text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Icon name="tune" size={14} /> Manage Department
          </Button>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Icon name="group" size={64} className="h-16 w-16 mb-4 text-muted-foreground/50" />
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
                    <Icon name={isOpen ? 'expand_more' : 'chevron_right'} size={20} className="text-muted-foreground shrink-0 transition-transform" />
                    <span className="p-1.5 bg-primary/10 rounded-md text-primary flex items-center justify-center">
                      <Icon name="apartment" size={16} />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                          {group.items.map(emp => {
                            const isExpanded = expandedCardId === emp.id
                            return (
                              <Card key={emp.id} className="relative overflow-visible group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setViewingEmployee(emp)}>
                
                {/* Selection Checkbox */}
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className={`absolute top-3 left-3 z-10 p-1 rounded bg-background border shadow-sm transition-opacity ${selectedIds.has(emp.id) ? 'opacity-100 border-primary' : 'opacity-0 group-hover:opacity-100 border-border'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={(e) => toggleSelect(emp.id, e)}
                    className="w-4 h-4 cursor-pointer m-0 block"
                  />
                </div>

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className={`h-12 w-12 border shadow-sm transition-all duration-300 ${emp.status !== 'Active' ? 'grayscale opacity-70' : ''}`}>
                        {emp.avatar && !imageErrors[emp.id] && (
                          <AvatarImage src={emp.avatar} alt={emp.name} style={{ transform: `translate(${emp.photoX || 0}px, ${emp.photoY || 0}px) scale(${emp.photoZoom || 1})`, transformOrigin: 'center' }} onError={() => setImageErrors(prev => ({...prev, [emp.id]: true}))} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Icon name="person" size={20} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h4 className="font-bold text-base break-words leading-none mb-0.5">{emp.name}</h4>
                        <span className="text-sm font-medium text-muted-foreground break-words">{emp.designation || emp.role}</span>
                      </div>
                    </div>
                    
                    <Badge variant={emp.status === 'Active' ? 'default' : emp.status === 'On Leave' ? 'secondary' : 'destructive'} className={`shrink-0 text-[10px] h-5 ${emp.status==='Active'?'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20':''}`}>
                      {emp.status}
                    </Badge>
                  </div>
                  {/* Expanded Content */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[350px] opacity-100 mt-4 pt-4 border-t border-border' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-col gap-4">
                      
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Icon name="apartment" size={16} className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
                          <span className="break-words">{emp.department}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Icon name="mail" size={16} className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
                          <span className="break-all">{emp.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex-1 min-w-[85px] flex flex-col justify-center p-2.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-muted-foreground font-medium mb-0.5">Emp ID</span>
                          <span className="font-semibold text-foreground break-words">{emp.id}</span>
                        </div>
                        <div className="flex-1 min-w-[85px] flex flex-col justify-center p-2.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-muted-foreground font-medium mb-0.5">Joined</span>
                          <span className="font-semibold text-foreground break-words">{emp.joiningDate ? formatDate(emp.joiningDate) : 'N/A'}</span>
                        </div>
                        <div className="flex-1 min-w-[85px] flex flex-col justify-center p-2.5 rounded-lg bg-muted/40 border border-border/50">
                          <span className="text-muted-foreground font-medium mb-0.5">DOB</span>
                          <span className="font-semibold text-foreground break-words">{emp.dob ? formatDate(emp.dob) : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 text-xs font-medium bg-background hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            setEditingEmployee(emp); setNewEmpId(emp.id); setNewName(emp.name); setNewRole(emp.role || 'Teammate'); setNewDesignation(emp.designation || emp.role || ''); setNewPermissions(emp.permissions || []); setNewDept(emp.department); setNewEmail(emp.email); setNewStatus(emp.status); setNewDob(emp.dob || ''); setNewJoiningDate(emp.joiningDate || ''); setNewCvFileName(emp.cvFileName || ''); setNewNidFileName(emp.nidFileName || ''); setNewAvatar(emp.avatar || ''); setPhotoX(emp.photoX || 0); setPhotoY(emp.photoY || 0); setPhotoZoom(emp.photoZoom || 1); setIsCustomDept(false); setCustomDept(''); setShowAddForm(true);
                          }}
                        >
                          <Icon name="edit" size={14} className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmDelete(() => () => {
                              handleDeleteEmployee(emp.id, emp.name);
                              setConfirmDelete(null);
                            }); 
                          }}
                        >
                          <Icon name="delete" size={14} className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                      
                    </div>
                  </div>

                  {/* Expand Toggle — always at the bottom of the card */}
                  <div className="flex justify-center mt-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-full hover:bg-muted/50 rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardId(prev => prev === emp.id ? null : emp.id);
                      }}
                    >
                      <Icon name="keyboard_arrow_down" size={16} className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </Button>
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
                  <AvatarImage src={viewingEmployee.avatar} alt={viewingEmployee.name} style={{ transform: `translate(${viewingEmployee.photoX || 0}px, ${viewingEmployee.photoY || 0}px) scale(${viewingEmployee.photoZoom || 1})`, transformOrigin: 'center' }} onError={() => setImageErrors(prev => ({...prev, [viewingEmployee.id]: true}))} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Icon name="person" size={40} />
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-foreground text-center">{viewingEmployee.name}</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">{viewingEmployee.designation || viewingEmployee.role}</p>
                <Badge variant={viewingEmployee.status === 'Active' ? 'default' : 'secondary'} className="mt-3">
                  {viewingEmployee.status}
                </Badge>
              </div>
              
              <div className="grid gap-4 py-4 px-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Employee ID</span>
                  <span className="col-span-2 text-sm font-semibold font-sans">{viewingEmployee.id}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Department</span>
                  <span className="col-span-2 text-sm">{viewingEmployee.department}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Email Address</span>
                  <span className="col-span-2 text-sm break-all text-primary">{viewingEmployee.email}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground text-right">Joined Date</span>
                  <span className="col-span-2 text-sm">{viewingEmployee.joiningDate ? formatDate(viewingEmployee.joiningDate) : 'N/A'}</span>
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
                  setNewEmail(viewingEmployee.email);
                  setNewStatus(viewingEmployee.status);
                  setNewDob(viewingEmployee.dob || '');
                  setNewJoiningDate(viewingEmployee.joiningDate || '');
                  setNewCvFileName(viewingEmployee.cvFileName || '');
                  setNewNidFileName(viewingEmployee.nidFileName || '');
                  setNewAvatar(viewingEmployee.avatar || '');
                  setPhotoX(viewingEmployee.photoX || 0);
                  setPhotoY(viewingEmployee.photoY || 0);
                  setPhotoZoom(viewingEmployee.photoZoom || 1);
                  setIsCustomDept(false);
                  setCustomDept('');
                  setShowAddForm(true);
                }}>
                  <Icon name="edit" size={16} className="mr-2 h-4 w-4" /> Edit Profile
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
              {editingEmployee ? <Icon name="edit" size={20} className="h-5 w-5 text-primary" /> : <Icon name="person_add" size={20} className="h-5 w-5 text-primary" />}
              {editingEmployee ? 'Edit Employee Profile' : 'New Employee Record'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEmployee} className="flex flex-col gap-6 py-4">
            
            {/* HD Profile Photo Upload */}
            <div className="p-4 rounded-xl border border-dashed bg-muted/20">
              <label className="text-sm font-medium mb-3 block">Profile Photo & Framing</label>
              <div className="flex gap-4 items-center">
                <div 
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className="overflow-hidden relative h-20 w-20 rounded-full border-2 border-primary/20 bg-muted/50 cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                >
                  {newAvatar ? (
                    <img
                      src={newAvatar}
                      alt="Preview"
                      onPointerDown={handlePointerDown}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      style={{
                        transform: `translate(${photoX}px, ${photoY}px) scale(${photoZoom})`,
                        transformOrigin: 'center',
                        pointerEvents: 'auto'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center">No Image</div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => document.getElementById('photo-file-input').click()}
                  >
                    {newAvatar ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <input
                    id="photo-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setNewAvatar(event.target.result);
                          setPhotoX(0); setPhotoY(0); setPhotoZoom(1);
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">Drag image inside frame to adjust.</span>
                </div>
              </div>

              {newAvatar && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Zoom</span>
                    <span>{Math.round(photoZoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="3" step="0.02" 
                    value={photoZoom} onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>

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
                  <p className="text-xs text-muted-foreground mb-3">Teammates can only see basic modules (Dashboard, Tasks, Calendar, Expenses). Select below to give them extra access to Admin modules.</p>
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
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                The teammate signs in with their own Google account using this email — they are linked to your workspace automatically.
              </div>

              <DatePicker label="Date of Birth" value={newDob} onChange={(e) => setNewDob(e.target.value)} />

              <DatePicker label="Joining Date" value={newJoiningDate} onChange={(e) => setNewJoiningDate(e.target.value)} />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Upload CV</label>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => document.getElementById('cv-file-input').click()}>
                  <Icon name="table_chart" size={16} className="mr-2 h-4 w-4 text-muted-foreground" />
                  {newCvFileName ? (newCvFileName.length > 15 ? newCvFileName.substring(0, 15) + '...' : newCvFileName) : 'Upload Document'}
                </Button>
                <input id="cv-file-input" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files && setNewCvFileName(e.target.files[0].name)} />
              </div>

              <Select label="Employment Status" value={newStatus} onChange={setNewStatus}>
                <SelectItem id="Active">Active</SelectItem>
                <SelectItem id="On Leave">On Leave</SelectItem>
                <SelectItem id="Inactive">Inactive</SelectItem>
              </Select>
            </div>

            <DialogFooter className="mt-4 border-t pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit">{editingEmployee ? 'Save Changes' : 'Create Record'}</Button>
            </DialogFooter>
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
            <Icon name="close" size={16} />
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
                    <Icon name="edit" size={14} />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label="Delete department" onClick={() => setManagerState({ editing: null, deleteConfirm: dept })}>
                    <Icon name="delete" size={14} className="text-destructive" />
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
                    <Icon name="check" size={14} /> Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {managerState.deleteConfirm && (
            <div className="border-t border-border pt-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <Icon name="warning" size={16} className="text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
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
