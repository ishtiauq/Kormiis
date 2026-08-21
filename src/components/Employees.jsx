import { useState, useEffect, useRef } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { useModal } from '../services/useModal.js'
import AdSlot from './AdSlot.jsx'
import { formatDate } from '../services/date.js'
import { provisionEmployeeAccount, revokeInvite } from '../services/auth.js'
import { cascadeDeleteEmployees } from '../services/cascadeDeleteEmployee.js'

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
  const [avatarUploadCardId, setAvatarUploadCardId] = useState(null)
  const cardFileInputRef = useRef(null)
  const formFileInputRef = useRef(null)
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
  const [newAvatar, setNewAvatar] = useState('')

  // Dynamic department states
  const [isCustomDept, setIsCustomDept] = useState(false)
  const [customDept, setCustomDept] = useState('')

  // Compute dynamic departments list from default + current employees
  const defaultDepts = ['Engineering', 'Design', 'Human Resources']
  const activeDepts = Array.from(new Set([...defaultDepts, ...employees.map(emp => emp.department)]))
    .filter(d => !removedDepts.includes(d))
  const filterDepartments = ['All', ...activeDepts]

  const processAvatarFile = (file, onSuccess) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      addToast('Please upload a valid image file (PNG, JPG, WEBP).', 'warning')
      return
    }
    const minSize = 5 * 1024 // 5 KB
    const maxSize = 500 * 1024 // 500 KB Max (Best practice for ultra-lite avatars)
    if (file.size < minSize) {
      addToast('Image is too small (Min: 5 KB). Recommended aspect ratio is 1:1 (Square).', 'warning')
      return
    }
    if (file.size > maxSize) {
      addToast('Image is too large (Max: 500 KB). Keep files under 500 KB to keep the app ultra-fast.', 'warning')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target.result
      const img = new Image()
      img.onload = () => {
        // Auto-center crop & compress to 256x256 WebP / JPEG (~15-30 KB ultra-light payload)
        try {
          const targetDim = 256
          const canvas = document.createElement('canvas')
          canvas.width = targetDim
          canvas.height = targetDim
          const ctx = canvas.getContext('2d')
          
          const minSide = Math.min(img.width, img.height)
          const sx = (img.width - minSide) / 2
          const sy = (img.height - minSide) / 2
          
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetDim, targetDim)
          
          const optimizedDataUrl = canvas.toDataURL('image/webp', 0.85) || canvas.toDataURL('image/jpeg', 0.85)
          onSuccess(optimizedDataUrl)
        } catch {
          onSuccess(result)
        }
      }
      img.onerror = () => {
        onSuccess(result)
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const fetchGmailAvatar = (email, onSuccess) => {
    if (!email || !email.includes('@')) {
      addToast('Please provide a valid email address first.', 'warning')
      return
    }
    const cleanEmail = email.trim().toLowerCase()
    const avatarUrl = `https://unavatar.io/${encodeURIComponent(cleanEmail)}`
    
    const testImg = new Image()
    testImg.onload = () => {
      onSuccess(avatarUrl)
      addToast('Google / Gmail avatar fetched successfully!', 'success')
    }
    testImg.onerror = () => {
      addToast(`No public Google avatar found for ${cleanEmail}. You can upload a custom photo.`, 'info')
    }
    testImg.src = avatarUrl
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
    setNewPhone('')
    setNewAvatar('')
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
        phone: newPhone,
        avatar: newAvatar || editingEmployee.avatar || defaultAvatar,
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
        phone: newPhone,
        uid,
        avatar: newAvatar || defaultAvatar,
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
    setNewAvatar('')
    setIsCustomDept(false)
    setCustomDept('')
    setEditingEmployee(null)
    setShowAddForm(false)
  }

  const handleOpenEditForm = (emp) => {
    setEditingEmployee(emp)
    setNewEmpId(emp.id || '')
    setNewName(emp.name || '')
    setNewRole(emp.role || 'Teammate')
    setNewDesignation(emp.designation || emp.role || '')
    setNewPermissions(emp.permissions || [])
    setNewDept(emp.department || 'Engineering')
    setNewEmail(emp.email || '')
    setNewPhone(emp.phone || '')
    setNewStatus(emp.status || 'Active')
    setNewDob(emp.dob || '')
    setNewJoiningDate(emp.joiningDate || '')
    setNewNidPassportId(emp.nidPassportId || '')
    setNewAvatar(emp.avatar || '')
    setIsCustomDept(false)
    setCustomDept('')
    setShowAddForm(true)
  }

  const handleDeleteEmployee = async (id, name) => {
    const emp = employees.find(e => e.id === id)
    setEmployees(prev => prev.filter(e => e.id !== id))
    addLog('Deleted employee record', `Removed ${name} (${id})`)
    if (addAuditLog) addAuditLog('DELETE', 'Employee', `Deleted employee profile for ${name} (${id})`)
    if (emp?.email) {
      await revokeInvite(emp.email)
      addLog('Access revoked', `Teammate invite for ${name} (${emp.email}) is no longer valid.`)
    }
    if (adminUid) {
      cascadeDeleteEmployees(adminUid, [id], emp?.email ? [emp.email] : []).catch(err => {
        console.error('Cascade employee cleanup error:', err)
      })
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
      const selectedEmps = employees.filter(emp => selectedIds.has(emp.id))
      const deletedIds = selectedEmps.map(emp => emp.id)
      const deletedEmails = selectedEmps.map(emp => emp.email).filter(Boolean)
      const deletedNames = selectedEmps.map(emp => emp.name).join(', ')

      setEmployees(prev => prev.filter(emp => !selectedIds.has(emp.id)))
      addLog('Bulk deleted employees', `Removed ${count} employees: ${deletedNames}`)
      if (addAuditLog) addAuditLog('DELETE_MANY', 'Employee', `Bulk deleted ${count} employee records`)

      if (adminUid && deletedIds.length) {
        cascadeDeleteEmployees(adminUid, deletedIds, deletedEmails).catch(err => {
          console.error('Cascade bulk employee cleanup error:', err)
        })
      }

      clearSelection()
      setConfirmDelete(null)
    })
  }

  const handleDownloadSelected = async () => {
    const count = selectedIds.size
    if (count === 0) return
    try {
      const XLSX = await import('xlsx')
      const selected = employees.filter(emp => selectedIds.has(emp.id))
      const exportData = selected.map(emp => ({
        'Employee ID': emp.id,
        'Full Name': emp.name || '',
        'Work Email': emp.email || '',
        'Department': emp.department || '',
        'Role / Designation': emp.role || emp.designation || '',
        'System Role': emp.systemRole || 'Teammate',
        'Status': emp.status || 'Active',
        'Phone': emp.phone || '',
        'Date of Birth': emp.dob || '',
        'Joining Date': emp.joiningDate || '',
        'Monthly Salary': emp.salary || '',
        'Address': emp.address || ''
      }))
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      ws['!cols'] = [
        { wch: 18 }, { wch: 26 }, { wch: 28 }, { wch: 20 },
        { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 26 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, "Selected Employees")
      XLSX.writeFile(wb, `Selected_Employees_${new Date().toISOString().slice(0, 10)}.xlsx`)
      addLog('Downloaded employee data', `Exported ${count} employee records as Excel`)
      addToast(`Exported ${count} employee record(s) to Excel.`, 'success')
      clearSelection()
    } catch (err) {
      console.error(err)
      addToast('Failed to export employees: ' + err.message, 'danger')
    }
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

  const handleDownloadDemoExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const templateData = [
        {
          "Employee ID (Optional)": "EMP-101",
          "Full Name (Required)": "Rafiqul Islam",
          "Work Email (Required)": "rafiqul@kormiis.com",
          "Department": "Engineering",
          "Role / Designation": "Full Stack Developer",
          "System Role": "Teammate",
          "Employment Status": "Active",
          "Phone Number": "+880 1712 345678",
          "Date of Birth (YYYY-MM-DD)": "1995-03-12",
          "Joining Date (YYYY-MM-DD)": "2024-01-15",
          "Monthly Salary": 75000,
          "Address": "Dhanmondi, Dhaka"
        },
        {
          "Employee ID (Optional)": "EMP-102",
          "Full Name (Required)": "Tasnim Akter",
          "Work Email (Required)": "tasnim@kormiis.com",
          "Department": "Design",
          "Role / Designation": "UI/UX Designer",
          "System Role": "Teammate",
          "Employment Status": "Active",
          "Phone Number": "+880 1812 987654",
          "Date of Birth (YYYY-MM-DD)": "1997-07-24",
          "Joining Date (YYYY-MM-DD)": "2024-02-01",
          "Monthly Salary": 65000,
          "Address": "Banani, Dhaka"
        },
        {
          "Employee ID (Optional)": "EMP-103",
          "Full Name (Required)": "Shakil Hossain",
          "Work Email (Required)": "shakil@kormiis.com",
          "Department": "Human Resources",
          "Role / Designation": "HR Executive",
          "System Role": "HR Officer",
          "Employment Status": "Active",
          "Phone Number": "+880 1912 112233",
          "Date of Birth (YYYY-MM-DD)": "1992-11-05",
          "Joining Date (YYYY-MM-DD)": "2023-09-10",
          "Monthly Salary": 55000,
          "Address": "Uttara, Dhaka"
        },
        {
          "Employee ID (Optional)": "EMP-104",
          "Full Name (Required)": "Nusrat Jahan",
          "Work Email (Required)": "nusrat@kormiis.com",
          "Department": "Marketing",
          "Role / Designation": "Content Strategist",
          "System Role": "Teammate",
          "Employment Status": "On Leave",
          "Phone Number": "+880 1612 445566",
          "Date of Birth (YYYY-MM-DD)": "1996-04-18",
          "Joining Date (YYYY-MM-DD)": "2023-11-20",
          "Monthly Salary": 60000,
          "Address": "Mirpur, Dhaka"
        }
      ]

      const guideData = [
        { "Column Name": "Full Name (Required)", "Mandatory": "YES", "Valid Format / Example": "Rafiqul Islam", "Notes / Instructions": "Official full name of the employee." },
        { "Column Name": "Work Email (Required)", "Mandatory": "YES", "Valid Format / Example": "rafiqul@kormiis.com", "Notes / Instructions": "Valid email address. Used for account creation and login invites." },
        { "Column Name": "Employee ID (Optional)", "Mandatory": "NO", "Valid Format / Example": "EMP-101 (or leave blank)", "Notes / Instructions": "Unique company ID. Auto-generated if left blank." },
        { "Column Name": "Department", "Mandatory": "NO", "Valid Format / Example": "Engineering / HR / Design / Marketing", "Notes / Instructions": "Department to organize the employee into groups." },
        { "Column Name": "Role / Designation", "Mandatory": "NO", "Valid Format / Example": "Senior Developer, UI Designer", "Notes / Instructions": "Designation displayed on employee profile cards." },
        { "Column Name": "System Role", "Mandatory": "NO", "Valid Format / Example": "Teammate | HR Officer | Manager", "Notes / Instructions": "Access permission level in the app (default: Teammate)." },
        { "Column Name": "Employment Status", "Mandatory": "NO", "Valid Format / Example": "Active | On Leave | Inactive", "Notes / Instructions": "Current status (default: Active)." },
        { "Column Name": "Phone Number", "Mandatory": "NO", "Valid Format / Example": "+880 1712 345678", "Notes / Instructions": "Contact phone number." },
        { "Column Name": "Date of Birth (YYYY-MM-DD)", "Mandatory": "NO", "Valid Format / Example": "1995-03-12", "Notes / Instructions": "Birth date (format: YYYY-MM-DD)." },
        { "Column Name": "Joining Date (YYYY-MM-DD)", "Mandatory": "NO", "Valid Format / Example": "2024-01-15", "Notes / Instructions": "Date of joining (format: YYYY-MM-DD)." },
        { "Column Name": "Monthly Salary", "Mandatory": "NO", "Valid Format / Example": "75000", "Notes / Instructions": "Monthly gross salary for payroll calculation." },
        { "Column Name": "Address", "Mandatory": "NO", "Valid Format / Example": "Dhaka, Bangladesh", "Notes / Instructions": "Current residential address." }
      ]

      const wb = XLSX.utils.book_new()
      const wsTemplate = XLSX.utils.json_to_sheet(templateData)
      const wsGuide = XLSX.utils.json_to_sheet(guideData)

      wsTemplate['!cols'] = [
        { wch: 22 }, // ID
        { wch: 26 }, // Name
        { wch: 28 }, // Email
        { wch: 20 }, // Department
        { wch: 24 }, // Role
        { wch: 16 }, // System Role
        { wch: 18 }, // Status
        { wch: 20 }, // Phone
        { wch: 26 }, // DOB
        { wch: 26 }, // Joining Date
        { wch: 18 }, // Salary
        { wch: 26 }  // Address
      ]

      wsGuide['!cols'] = [
        { wch: 28 },
        { wch: 14 },
        { wch: 38 },
        { wch: 65 }
      ]

      XLSX.utils.book_append_sheet(wb, wsTemplate, "Employees Template")
      XLSX.utils.book_append_sheet(wb, wsGuide, "Instructions & Guide")

      XLSX.writeFile(wb, "Kormiis_Employees_Import_Template.xlsx")
      addToast('Demo Excel template downloaded with sample data & field guide.', 'success')
      addLog('Downloaded template', 'Downloaded Demo Excel employee template')
    } catch (err) {
      console.error(err)
      addToast('Failed to download Excel template: ' + err.message, 'danger')
    }
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
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground"><Icon name="group" className="text-foreground" size={20}/>Employees</h1>
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
            <Icon name="download" className="mr-1 h-3.5 w-3.5" size={14}/> Download Excel
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-full" onClick={clearSelection}>
            <Icon name="close" className="h-4 w-4" size={16}/>
          </Button>
        </div>
      )}

      {/* Directory Grid */}
      <div className="rounded-3xl border border-border/80 bg-muted/20 overflow-hidden shadow-xs">
        {/* Card header: search + actions */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-muted/20">
          <div className="relative flex-1 w-full sm:w-auto sm:min-w-[280px] sm:max-w-md flex items-center">
            <Icon name="search" className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none" size={18}/>
            <Input type="text" placeholder="Search by name, role, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="!pl-10.5 h-11 rounded-2xl bg-background border-input shadow-xs w-full" />
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
              id="employee-file-input"
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                e.target.value = ''
                try {
                  const XLSX = await import('xlsx')
                  const data = await file.arrayBuffer()
                  const wb = XLSX.read(data, { type: 'array', cellDates: true })
                  const sheetName = wb.SheetNames.find(s => s.toLowerCase().includes('employee') || s.toLowerCase().includes('template') || s.toLowerCase().includes('data')) || wb.SheetNames[0]
                  const ws = wb.Sheets[sheetName]
                  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })

                  if (!rows || rows.length === 0) {
                    addToast('The uploaded spreadsheet has no data rows.', 'warning')
                    return
                  }

                  const getVal = (row, ...keys) => {
                    for (const k of keys) {
                      const matchedKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
                      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                        return String(row[matchedKey]).trim()
                      }
                    }
                    return ''
                  }

                  const imported = []
                  const errors = []

                  for (let i = 0; i < rows.length; i++) {
                    const rawRow = rows[i]
                    const name = getVal(rawRow, 'fullname', 'name', 'employeename', 'fullname(required)')
                    const email = getVal(rawRow, 'workemail', 'email', 'workemail(required)')
                    const id = getVal(rawRow, 'employeeid', 'id', 'empid', 'employeeid(optional)') || `EMP-${Date.now().toString().slice(-4)}${i + 1}`
                    const department = getVal(rawRow, 'department', 'dept') || 'General'
                    const role = getVal(rawRow, 'roledesignation', 'role', 'designation', 'jobtitle') || 'Teammate'
                    const systemRole = getVal(rawRow, 'systemrole', 'accessrole') || 'Teammate'
                    const status = getVal(rawRow, 'employmentstatus', 'status') || 'Active'
                    const phone = getVal(rawRow, 'phonenumber', 'phone', 'mobile', 'contact')
                    const dob = getVal(rawRow, 'dateofbirth', 'dob', 'dateofbirth(yyyymmdd)')
                    const joiningDate = getVal(rawRow, 'joiningdate', 'doj', 'joiningdate(yyyymmdd)')
                    const salary = getVal(rawRow, 'monthlysalary', 'salary')
                    const address = getVal(rawRow, 'address', 'location')

                    const row = {
                      id: sanitizeCell(id),
                      name: sanitizeCell(name),
                      email: sanitizeCell(email),
                      department: sanitizeCell(department),
                      role: sanitizeCell(role),
                      systemRole: sanitizeCell(systemRole),
                      status: ['Active', 'On Leave', 'Inactive'].includes(status) ? status : 'Active',
                      phone: sanitizeCell(phone),
                      dob: sanitizeCell(dob),
                      joiningDate: sanitizeCell(joiningDate),
                      salary: salary ? Number(salary) : undefined,
                      address: sanitizeCell(address),
                      avatar: defaultAvatar,
                      updated_at: new Date().toISOString()
                    }

                    const error = validateCSVRow(row)
                    if (error) {
                      errors.push(`Row ${i + 2}: ${error}`)
                      continue
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
                        errors.push(`Row ${i + 2}: invite not sent (${provErr.message})`)
                        continue
                      }
                    }

                    imported.push(row)
                  }

                  if (errors.length > 0) {
                    addToast(`Skipped ${errors.length} invalid row(s)`, 'warning')
                  }

                  if (imported.length > 0) {
                    setEmployees(prev => {
                      const existingIds = new Set(prev.map(e => e.id))
                      const filteredImport = imported.filter(e => !existingIds.has(e.id))
                      return [...prev, ...filteredImport]
                    })
                    addToast(`Successfully imported ${imported.length} employee(s) from spreadsheet.`, 'success')
                    addLog('Imported employees', `Imported ${imported.length} employee records from spreadsheet`)
                  }
                } catch (err) {
                  console.error(err)
                  addToast('Failed to parse Excel/CSV file: ' + err.message, 'danger')
                }
              }}
            />
            <input 
              type="file"
              ref={cardFileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file || !avatarUploadCardId) return
                e.target.value = ''
                processAvatarFile(file, (dataUrl) => {
                  setEmployees(prev => prev.map(emp => emp.id === avatarUploadCardId ? { ...emp, avatar: dataUrl } : emp))
                  setImageErrors(prev => ({ ...prev, [avatarUploadCardId]: false }))
                  addToast('Profile photo updated successfully!', 'success')
                  addLog('Updated profile photo', `Updated photo for ${avatarUploadCardId}`)
                })
              }}
            />
            <Button variant="outline" onClick={handleCopyInviteLink} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="link" className="mr-2 h-4 w-4 text-primary" size={16}/> Invite Link
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('employee-file-input').click()} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="table_chart" className="mr-2 h-4 w-4 text-primary" size={16}/> Import Excel / CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadDemoExcel} className="shadow-sm flex-1 sm:flex-none">
              <Icon name="table_view" className="mr-2 h-4 w-4 text-emerald-500" size={16}/> Demo Excel
            </Button>
            <Button onClick={handleOpenAddForm} className="shadow-sm flex-1 sm:flex-none">
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
                    <Icon name="apartment" className="text-primary shrink-0" size={22}/>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                          {group.items.map(emp => {
                            const isExpanded = expandedCardId === emp.id
                            return (
                              <div 
                                key={emp.id} 
                                className="relative group rounded-3xl p-5 sm:p-6 glass-card text-foreground border border-white/30 dark:border-white/12 shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between overflow-hidden isolate"
                              >
                                {/* 1. Top Header: Checkbox & Quick Action Glass Icon Buttons */}
                                <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
                                  {/* Apple Circular Checkbox */}
                                  <div
                                    onClick={(e) => toggleSelect(emp.id, e)}
                                    className={`size-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                                      selectedIds.has(emp.id)
                                        ? 'bg-primary border-primary text-primary-foreground shadow-xs scale-105'
                                        : 'border-border/80 dark:border-white/20 bg-background/50 group-hover:border-primary/50 hover:bg-background/80'
                                    }`}
                                    title={selectedIds.has(emp.id) ? "Deselect" : "Select"}
                                  >
                                    {selectedIds.has(emp.id) && (
                                      <Icon name="check" size={14} className="stroke-[3]" />
                                    )}
                                  </div>

                                  {/* Quick Contact & Action Buttons */}
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {emp.email && (
                                      <a
                                        href={`mailto:${emp.email}`}
                                        title={`Email ${emp.name}`}
                                        className="liquid-icon-btn size-7.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-primary/20 hover:text-primary active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-foreground shadow-xs cursor-pointer"
                                      >
                                        <Icon name="mail" size={13} />
                                      </a>
                                    )}
                                    {emp.phone && (
                                      <a
                                        href={`tel:${emp.phone.replace(/[\s-]/g, '')}`}
                                        title={`Call ${emp.name}`}
                                        className="liquid-icon-btn size-7.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-primary/20 hover:text-primary active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-foreground shadow-xs cursor-pointer"
                                      >
                                        <Icon name="call" size={13} />
                                      </a>
                                    )}
                                    <button
                                      title={`Edit ${emp.name}`}
                                      onClick={() => handleOpenEditForm(emp)}
                                      className="liquid-icon-btn size-7.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-primary/20 hover:text-primary active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-foreground shadow-xs cursor-pointer"
                                    >
                                      <Icon name="edit" size={13} />
                                    </button>
                                    <button
                                      title={`Delete ${emp.name}`}
                                      onClick={() => {
                                        setConfirmDelete(() => () => {
                                          handleDeleteEmployee(emp.id, emp.name);
                                          setConfirmDelete(null);
                                        });
                                      }}
                                      className="liquid-icon-btn size-7.5 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-destructive/20 hover:text-destructive active:scale-90 border border-black/10 dark:border-white/10 transition-all text-muted-foreground hover:text-destructive shadow-xs cursor-pointer"
                                    >
                                      <Icon name="delete" size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* 2. Hero Section: Profile Avatar on Left, Name & Designation on Right */}
                                <div className="flex items-center gap-3.5 my-2 relative z-10">
                                  {/* Left: Avatar with Glowing Status Dot & Upload Overlay */}
                                  <div className="relative shrink-0 group/avatar">
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setAvatarUploadCardId(emp.id)
                                        cardFileInputRef.current?.click()
                                      }}
                                      title="Click to Upload Photo (Max: 500 KB, 1:1 Ratio)"
                                      className="relative cursor-pointer"
                                    >
                                      <Avatar className={`size-15 rounded-full border-2 border-border/60 dark:border-white/15 shadow-md ring-2 ring-primary/20 dark:ring-white/10 ring-offset-2 ring-offset-card transition-all duration-300 group-hover/avatar:scale-105 ${emp.status !== 'Active' ? 'grayscale opacity-75' : ''}`}>
                                        {!imageErrors[emp.id] && (
                                          <AvatarImage 
                                            src={emp.avatar || defaultAvatar} 
                                            alt={emp.name} 
                                            style={{ transform: `translate(${emp.photoX || 0}px, ${emp.photoY || 0}px) scale(${emp.photoZoom || 1})`, transformOrigin: 'center' }} 
                                            onError={() => setImageErrors(prev => ({...prev, [emp.id]: true}))} 
                                          />
                                        )}
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary text-base font-black">
                                          {getAvatarFallback(emp.name).initials}
                                        </AvatarFallback>
                                      </Avatar>

                                      {/* Hover Camera Upload Overlay */}
                                      <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-[2px] opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-all text-white">
                                        <Icon name="photo_camera" size={15}/>
                                        <span className="text-[8px] font-bold tracking-tight">Upload</span>
                                      </div>
                                    </div>

                                    {/* Glowing Status Indicator */}
                                    <span 
                                      className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card ${
                                        emp.status === 'Active' 
                                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)]' 
                                          : emp.status === 'On Leave' 
                                          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.85)]' 
                                          : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]'
                                      }`} 
                                    />
                                  </div>

                                  {/* Right: Name & Designation */}
                                  <div className="flex flex-col min-w-0 flex-1 text-left justify-center">
                                    <h4 className="font-bold text-fluid-lg text-foreground tracking-tight truncate group-hover:text-primary transition-colors leading-tight">
                                      {emp.name}
                                    </h4>
                                    <p className="text-fluid-xs font-semibold text-muted-foreground truncate mt-1">
                                      {emp.designation && emp.designation.toLowerCase() !== 'teammate' ? emp.designation : (emp.role && emp.role.toLowerCase() !== 'teammate' ? emp.role : '')}
                                    </p>
                                  </div>
                                </div>

                                {/* 3. Info Capsules: Department & Employee ID */}
                                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3.5 border-t border-border/80 dark:border-white/12 relative z-10">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 min-w-0 shadow-xs">
                                    <Icon name="apartment" size={13} className="text-primary shrink-0" />
                                    <span className="text-[11px] font-medium text-foreground/90 truncate">
                                      {emp.department}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 min-w-0 font-mono shadow-xs">
                                    <Icon name="badge" size={13} className="text-primary shrink-0" />
                                    <span className="text-[11px] font-medium text-muted-foreground truncate">
                                      {emp.id}
                                    </span>
                                  </div>
                                </div>

                                {/* 4. Collapsible Drawer (Details: Email, Phone, DOB, Joining Date) */}
                                <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] ${isExpanded ? 'max-h-[220px] opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
                                  <div className="rounded-2xl border border-border/80 dark:border-white/12 bg-black/5 dark:bg-white/5 p-3 flex flex-col gap-1.5 text-fluid-xs text-muted-foreground">
                                    {emp.email && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Icon name="mail" size={13} className="text-primary/80 shrink-0" />
                                        <span className="truncate">{emp.email}</span>
                                      </div>
                                    )}
                                    {emp.phone && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Icon name="call" size={13} className="text-primary/80 shrink-0" />
                                        <span className="truncate">{emp.phone}</span>
                                      </div>
                                    )}
                                    {emp.dob && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Icon name="cake" size={13} className="text-primary/80 shrink-0" />
                                        <span className="truncate">DOB: {formatDate(emp.dob)}</span>
                                      </div>
                                    )}
                                    {emp.joiningDate && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Icon name="calendar_month" size={13} className="text-primary/80 shrink-0" />
                                        <span className="truncate">Joined: {formatDate(emp.joiningDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 5. Card Footer: Ultra-Slim Grabber Bar Chevron Toggle Button */}
                                <div className="mt-2 pt-1.5 border-t border-border/60 dark:border-white/10 flex items-center justify-center relative z-10">
                                  <button
                                    onClick={() => setExpandedCardId(prev => prev === emp.id ? null : emp.id)}
                                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                                    className="liquid-icon-btn group/btn w-full h-3.5 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.99] border border-black/5 dark:border-white/8 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  >
                                    <Icon 
                                      name="keyboard_arrow_down" 
                                      size={12} 
                                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'group-hover/btn:translate-y-0.5'}`} 
                                    />
                                  </button>
                                </div>
                              </div>
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
      </div>

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
                <p className="text-fluid-sm text-muted-foreground text-center mt-1">
                  {viewingEmployee.designation && viewingEmployee.designation.toLowerCase() !== 'teammate' ? viewingEmployee.designation : (viewingEmployee.role && viewingEmployee.role.toLowerCase() !== 'teammate' ? viewingEmployee.role : '')}
                </p>
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
            
            {/* Profile Photo Uploader with Auto Gmail Sync */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/80">
              <div className="relative group/formavatar shrink-0">
                <Avatar className="size-20 rounded-full border-2 border-primary/30 shadow-md ring-2 ring-primary/15 ring-offset-2 ring-offset-card">
                  {newAvatar ? (
                    <AvatarImage src={newAvatar} alt={newName || 'Avatar'} />
                  ) : (
                    <AvatarImage src={defaultAvatar} alt="Default" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary text-xl font-black">
                    {newName ? getAvatarFallback(newName).initials : <Icon name="person" size={28}/>}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => formFileInputRef.current?.click()}
                  title="Upload Photo"
                  className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Icon name="photo_camera" size={14}/>
                </button>
              </div>

              <div className="flex flex-col flex-1 text-center sm:text-left gap-1.5">
                <span className="text-sm font-semibold text-foreground">Employee Profile Photo</span>
                <p className="text-fluid-xs text-muted-foreground">
                  Recommended: <strong className="text-foreground">1:1 Square Ratio</strong> • File Size: <strong className="text-foreground">Max 500 KB</strong> (Auto-optimized to ~25 KB WebP/JPEG)
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <input
                    type="file"
                    ref={formFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      e.target.value = ''
                      processAvatarFile(file, (dataUrl) => {
                        setNewAvatar(dataUrl)
                        addToast('Photo loaded and optimized to ultra-lite WebP (1:1 Ratio)!', 'success')
                      })
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => formFileInputRef.current?.click()}
                    className="h-8 text-xs rounded-full"
                  >
                    <Icon name="upload" className="mr-1.5 h-3.5 w-3.5" size={14}/> Upload Image
                  </Button>

                  {newEmail && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        fetchGmailAvatar(newEmail, (avatarUrl) => {
                          setNewAvatar(avatarUrl)
                        })
                      }}
                      className="h-8 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <Icon name="sync" className="mr-1.5 h-3.5 w-3.5" size={14}/> Auto-fetch Gmail Photo
                    </Button>
                  )}

                  {newAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewAvatar('')}
                      className="h-8 text-xs rounded-full text-muted-foreground hover:text-destructive"
                    >
                      Reset Photo
                    </Button>
                  )}
                </div>
              </div>
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
