import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from '../services/date.js'
import { changeEmployeePassword, deleteCurrentUserAccount, scheduleWorkspaceDeletion, cancelWorkspaceDeletion } from '../services/auth.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function ProfileView({ 
  currentUser, 
  pendingProfileEdits, 
  setPendingProfileEdits, 
  addToast, 
  addLog, 
  settings, 
  setSettings, 
  employees = [], 
  setEmployees,
  handleLogout,
  announcements = [],
  setAnnouncements,
  addNotification
}) {
  const [activeTab, setActiveTab] = useState('personal') // 'personal' | 'work' | 'security'
  const [editMode, setEditMode] = useState(false)
  
  // Password change state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPwCurrent, setShowPwCurrent] = useState(false)
  const [showPwNew, setShowPwNew] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Account Deletion State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    personalEmail: currentUser?.personalEmail || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    emergencyContact: currentUser?.emergencyContact || ''
  })

  // Pending edits check
  const pendingEdit = pendingProfileEdits?.find(e => e.employeeId === (currentUser?.id || currentUser?.employeeId))
  const hasPending = !!pendingEdit

  // Name initials for avatar fallback
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length === 0) return 'U'
    return parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }

  const handleStartEdit = () => {
    setFormData({
      personalEmail: currentUser?.personalEmail || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      emergencyContact: currentUser?.emergencyContact || ''
    })
    setEditMode(true)
    setActiveTab('personal')
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setFormData({
      personalEmail: currentUser?.personalEmail || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      emergencyContact: currentUser?.emergencyContact || ''
    })
  }

  const handleSubmitProfileEdit = (e) => {
    e.preventDefault()
    const empId = currentUser?.id || currentUser?.employeeId
    if (!empId) {
      addToast?.('Could not identify current employee account.', 'danger')
      return
    }

    if (hasPending) {
      addToast?.('You already have a pending edit request under review.', 'warning')
      return
    }

    const newEdit = {
      id: `edit-${Date.now()}`,
      employeeId: empId,
      timestamp: new Date().toISOString(),
      changes: {
        personalEmail: formData.personalEmail.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        emergencyContact: formData.emergencyContact.trim()
      }
    }

    setPendingProfileEdits?.(prev => [...(prev || []), newEdit])
    setEditMode(false)
    addToast?.('Profile update submitted for HR review.', 'success')
    addLog?.('Profile Edit Requested', `${currentUser.name || 'Employee'} requested to update profile information.`, 'info')
  }

  const handleCancelPendingRequest = () => {
    const empId = currentUser?.id || currentUser?.employeeId
    setPendingProfileEdits?.(prev => (prev || []).filter(e => e.employeeId !== empId))
    addToast?.('Pending profile update request cancelled.', 'info')
    addLog?.('Profile Request Cancelled', `${currentUser.name || 'Employee'} cancelled their pending profile change request.`, 'info')
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwLoading(true)
    try {
      if (!pwCurrent) {
        addToast?.('Please enter your current password.', 'warning')
        return
      }
      if (pwNew.length < 6) {
        addToast?.('New password must be at least 6 characters long.', 'warning')
        return
      }
      if (pwNew !== pwConfirm) {
        addToast?.('New passwords do not match.', 'warning')
        return
      }
      await changeEmployeePassword(pwCurrent, pwNew)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      addToast?.('Password updated successfully.', 'success')
      addLog?.('Password Changed', `${currentUser.name || 'User'} updated their account password.`, 'info')
    } catch (err) {
      addToast?.('Failed to change password: ' + (err.message || 'Unknown error'), 'danger')
    } finally {
      setPwLoading(false)
    }
  }

  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    addToast?.(`${label} copied to clipboard!`, 'success')
  }

  const empId = currentUser?.id || currentUser?.employeeId || currentUser?.uid || 'N/A'
  const workEmail = currentUser?.email || currentUser?.workEmail || currentUser?.personalEmail || 'N/A'
  const companyId = currentUser?.companyUid || currentUser?.adminUid || currentUser?.uid || currentUser?.id

  // Determine admin roles
  const isCurrentAdmin = currentUser?.role === 'Admin' || currentUser?.isWorkspaceOwner || (currentUser?.companyUid && currentUser?.companyUid === currentUser?.uid)

  const otherAdmins = (employees || []).filter(e => {
    const isSelf = (e.id === empId || e.uid === currentUser?.uid || (currentUser?.email && e.email === currentUser?.email))
    return !isSelf && (e.role === 'Admin' || e.systemRole === 'Admin')
  })

  // Sole admin: current user is Admin and no other admins exist in the workspace
  const isSoleAdmin = isCurrentAdmin && otherAdmins.length === 0

  // Check if workspace deletion is currently pending
  const isDeletionPending = !!settings?.deletionStatus?.isPending
  const scheduledDate = settings?.deletionStatus?.scheduledDeletionDate

  const handleDeleteClick = () => {
    setDeleteConfirmText('')
    setDeleteModalOpen(true)
  }

  const handleExecuteDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      addToast?.('Please type DELETE to confirm.', 'warning')
      return
    }
    setIsDeleting(true)
    try {
      const uid = currentUser?.uid || currentUser?.id
      const companyUid = currentUser?.companyUid || currentUser?.uid
      const currentId = currentUser?.id || currentUser?.employeeId

      if (isSoleAdmin) {
        // Sole Admin: Schedule entire workspace for deletion in 7 days (1 week grace period)
        const targetScheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const targetDateFormatted = new Date(targetScheduledDate).toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })

        // 1. Update settings with deletion status
        const updatedSettings = {
          ...(settings || {}),
          deletionStatus: {
            isPending: true,
            scheduledDeletionDate: targetScheduledDate,
            requestedAt: new Date().toISOString(),
            requestedBy: {
              name: currentUser.name || 'Administrator',
              email: currentUser.email || '',
              uid: currentUser.uid || currentId
            }
          }
        }
        setSettings?.(updatedSettings)

        // 2. Post high-priority announcement to all employees
        const deletionAnnouncement = {
          id: `announcement-del-${Date.now()}`,
          title: '⚠️ Workspace Scheduled for Permanent Deletion in 7 Days',
          content: `The workspace administrator has scheduled this entire workspace for permanent deletion on ${targetDateFormatted} (in 7 days). All company data, member accounts, and records will be deleted on that date. Please export or backup any necessary documents before then.`,
          author: currentUser.name || 'Administrator',
          authorId: currentUser.uid || currentId,
          date: new Date().toISOString().split('T')[0],
          category: 'Company',
          pinned: true,
          urgent: true,
          target: 'all'
        }
        setAnnouncements?.(prev => [deletionAnnouncement, ...(prev || [])])

        // 3. Dispatch system notification to all employees
        addNotification?.(
          `⚠️ Workspace has been scheduled for permanent deletion in 7 days (on ${targetDateFormatted}).`, 
          'announcements', 
          { title: 'Workspace Deletion Scheduled', category: 'system' }
        )

        // 4. Save to Firestore
        await scheduleWorkspaceDeletion({
          companyUid,
          adminUid: uid,
          requestedBy: {
            name: currentUser.name || 'Administrator',
            email: currentUser.email || '',
            uid
          },
          scheduledDate: targetScheduledDate
        })

        addLog?.('Workspace Deletion Scheduled', `Administrator scheduled workspace deletion for ${targetDateFormatted} (1-week notice).`, 'warning')
        addToast?.(`Workspace scheduled for deletion on ${targetDateFormatted}. All employees have been notified.`, 'warning')

        setDeleteModalOpen(false)
      } else {
        // Multi-Admin (>1 Admin) or Regular Employee: Delete account IMMEDIATELY without notifying all employees
        if (setEmployees) {
          setEmployees(prev => (prev || []).filter(e => e.id !== currentId && e.uid !== uid && e.email !== currentUser?.email))
        }

        await deleteCurrentUserAccount({ uid, companyUid, employeeId: currentId })

        addLog?.('Account Deleted', `${currentUser.name || 'User'} (${currentUser.email || 'N/A'}) deleted their account.`, 'warning')
        addToast?.('Your account has been deleted successfully.', 'info')

        setDeleteModalOpen(false)
        if (handleLogout) {
          await handleLogout()
        }
      }
    } catch (err) {
      addToast?.('Failed to process deletion: ' + (err.message || 'Unknown error'), 'danger')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelScheduledDeletion = async () => {
    setIsCancellingDeletion(true)
    try {
      const companyUid = currentUser?.companyUid || currentUser?.uid
      const currentId = currentUser?.id || currentUser?.employeeId

      // 1. Clear deletion status from settings
      const updatedSettings = {
        ...(settings || {}),
        deletionStatus: null
      }
      setSettings?.(updatedSettings)

      // 2. Post cancellation announcement
      const cancelAnnouncement = {
        id: `announcement-cancel-${Date.now()}`,
        title: '✅ Workspace Deletion Cancelled',
        content: `The workspace administrator has cancelled the scheduled deletion. Workspace operations will continue normally.`,
        author: currentUser.name || 'Administrator',
        authorId: currentUser.uid || currentId,
        date: new Date().toISOString().split('T')[0],
        category: 'Company',
        pinned: false,
        target: 'all'
      }
      setAnnouncements?.(prev => [cancelAnnouncement, ...(prev || [])])

      // 3. Send notification
      addNotification?.('✅ Scheduled workspace deletion has been cancelled.', 'announcements', { title: 'Deletion Cancelled', category: 'system' })

      // 4. Update Firestore
      await cancelWorkspaceDeletion({ companyUid })

      addLog?.('Deletion Cancelled', 'Administrator cancelled scheduled workspace deletion.', 'info')
      addToast?.('Scheduled workspace deletion has been cancelled.', 'success')
    } catch (err) {
      addToast?.('Failed to cancel deletion: ' + (err.message || 'Unknown error'), 'danger')
    } finally {
      setIsCancellingDeletion(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[920px] mx-auto pb-12 w-full animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <Icon name="person" size={20}/>
            </div>
            My Profile
          </h1>
          <p className="text-fluid-xs sm:text-fluid-sm text-muted-foreground mt-1">
            Manage your personal profile, workplace credentials, and security settings.
          </p>
        </div>

        {!editMode && (
          <div className="flex items-center gap-2">
            {!hasPending ? (
              <Button 
                variant="outline" 
                onClick={handleStartEdit}
                className="rounded-2xl liquid-glass-btn h-11 px-5 font-medium flex items-center gap-2"
              >
                <Icon name="edit" size={18} />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Badge variant="warning" className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-xs">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                Pending HR Review
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Pending Update Alert Banner */}
      {hasPending && (
        <div className="glass-card rounded-3xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Icon name="pending_actions" size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                Pending Profile Updates
                <span className="text-xs font-normal text-muted-foreground">
                  ({pendingEdit?.timestamp ? formatDate(pendingEdit.timestamp) : 'Recently submitted'})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your submitted contact information changes are currently awaiting HR administrator approval.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelPendingRequest}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0 self-end sm:self-center h-8"
          >
            Cancel Request
          </Button>
        </div>
      )}

      {/* Hero Profile Glass Card */}
      <div className="glass-kormiis rounded-3xl p-6 sm:p-8 border border-white/25 dark:border-white/10 shadow-lg relative overflow-hidden">
        {/* Subtle Ambient Background Flare */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0 group">
            <Avatar className="size-22 sm:size-24 rounded-3xl border-2 border-white/40 dark:border-white/15 shadow-md ring-4 ring-primary/10">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-2xl sm:text-3xl rounded-3xl">
                {getInitials(currentUser?.name)}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center shadow-xs" 
              title="Active User"
            >
              <div className="size-2 rounded-full bg-white animate-ping opacity-75" />
            </div>
          </div>

          {/* User Details & Badges */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-fluid-xl sm:text-fluid-2xl font-bold tracking-tight text-foreground truncate">
                {currentUser?.name || 'User Profile'}
              </h2>
              <Badge variant="default" className="rounded-full px-3 py-0.5 text-xs font-semibold shadow-xs">
                {currentUser?.role || 'Teammate'}
              </Badge>
              {currentUser?.status && (
                <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                  {currentUser.status}
                </Badge>
              )}
            </div>

            <p className="text-fluid font-medium text-muted-foreground flex items-center gap-2">
              <Icon name="work" size={16} className="text-muted-foreground/80 shrink-0" />
              <span>{currentUser?.designation || currentUser?.role || 'Team Member'}</span>
              <span className="text-border dark:text-white/20">•</span>
              <span className="text-foreground/80">{currentUser?.department || 'General'}</span>
            </p>

            {/* Quick Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button 
                onClick={() => copyToClipboard(empId, 'Employee ID')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 text-fluid-xs font-medium text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs group"
                title="Click to copy Employee ID"
              >
                <Icon name="badge" size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{empId}</span>
                <Icon name="content_copy" size={12} className="text-muted-foreground/60 group-hover:text-foreground ml-0.5" />
              </button>

              {workEmail && workEmail !== 'N/A' && (
                <button 
                  onClick={() => copyToClipboard(workEmail, 'Email')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 text-fluid-xs font-medium text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs group"
                  title="Click to copy Email"
                >
                  <Icon name="mail" size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="truncate max-w-[200px]">{workEmail}</span>
                  <Icon name="content_copy" size={12} className="text-muted-foreground/60 group-hover:text-foreground ml-0.5" />
                </button>
              )}

              {(currentUser?.joiningDate || currentUser?.createdAt) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/30 dark:bg-white/5 border border-white/30 dark:border-white/10 text-fluid-xs font-medium text-muted-foreground">
                  <Icon name="calendar_today" size={14} />
                  <span>Joined {formatDate(currentUser.joiningDate || currentUser.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Section Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-card border border-white/30 dark:border-white/10 w-fit max-w-full overflow-x-auto shadow-xs">
        <button
          onClick={() => { setActiveTab('personal'); setEditMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-background dark:bg-white/15 text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5'
          }`}
        >
          <Icon name="contact_mail" size={16} />
          <span>Contact & Personal</span>
        </button>

        <button
          onClick={() => { setActiveTab('work'); setEditMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'work'
              ? 'bg-background dark:bg-white/15 text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5'
          }`}
        >
          <Icon name="domain" size={16} />
          <span>Work Details</span>
        </button>

        <button
          onClick={() => { setActiveTab('security'); setEditMode(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-background dark:bg-white/15 text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5'
          }`}
        >
          <Icon name="shield" size={16} />
          <span>Security & Login</span>
        </button>
      </div>

      {/* TAB 1: Personal & Contact Information */}
      {activeTab === 'personal' && (
        <Card className="glass-card rounded-3xl border border-white/30 dark:border-white/10 shadow-sm overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4 flex flex-row items-center justify-between border-b border-border/40 dark:border-white/5">
            <div>
              <CardTitle className="text-fluid-lg font-bold flex items-center gap-2">
                <Icon name="contact_phone" size={20} className="text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-fluid-xs text-muted-foreground mt-1">
                Your private contact info and emergency communication details.
              </CardDescription>
            </div>

            {!editMode && !hasPending && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStartEdit}
                className="rounded-xl text-xs font-medium gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Icon name="edit" size={15} />
                Edit
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-6">
            {editMode ? (
              <form onSubmit={handleSubmitProfileEdit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Personal Email
                    </label>
                    <div className="relative">
                      <Icon name="mail" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.personalEmail}
                        onChange={e => setFormData(p => ({ ...p, personalEmail: e.target.value }))}
                        className="h-11 !pl-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Icon name="call" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="tel"
                        placeholder="+880 1..."
                        value={formData.phone}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                        className="h-11 !pl-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Residential Address
                    </label>
                    <div className="relative">
                      <Icon name="home" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="House, Street, City, Country"
                        value={formData.address}
                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                        className="h-11 !pl-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Emergency Contact Info
                    </label>
                    <div className="relative">
                      <Icon name="emergency" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Name, Relationship & Phone number"
                        value={formData.emergencyContact}
                        onChange={e => setFormData(p => ({ ...p, emergencyContact: e.target.value }))}
                        className="h-11 !pl-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button 
                    type="submit" 
                    className="h-11 px-6 rounded-2xl font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                  >
                    <Icon name="send" size={18} />
                    Submit for Approval
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    className="h-11 px-5 rounded-2xl liquid-glass-btn"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon name="mail" size={15} className="text-primary" />
                    Personal Email
                  </div>
                  <div className="font-medium text-foreground text-sm break-all">
                    {currentUser?.personalEmail || <span className="text-muted-foreground italic">Not provided</span>}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon name="call" size={15} className="text-emerald-500" />
                    Phone Number
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {currentUser?.phone || <span className="text-muted-foreground italic">Not provided</span>}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon name="home" size={15} className="text-blue-500" />
                    Residential Address
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {currentUser?.address || <span className="text-muted-foreground italic">Not provided</span>}
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon name="contact_phone" size={15} className="text-amber-500" />
                    Emergency Contact
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {currentUser?.emergencyContact || <span className="text-muted-foreground italic">Not provided</span>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Work & Workplace Details */}
      {activeTab === 'work' && (
        <Card className="glass-card rounded-3xl border border-white/30 dark:border-white/10 shadow-sm overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4 border-b border-border/40 dark:border-white/5">
            <CardTitle className="text-fluid-lg font-bold flex items-center gap-2">
              <Icon name="domain" size={20} className="text-primary" />
              Work & Organization Details
            </CardTitle>
            <CardDescription className="text-fluid-xs text-muted-foreground mt-1">
              Official company role, departmental assignment, and workspace metadata.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="badge" size={15} className="text-primary" />
                  Full Name
                </div>
                <div className="font-semibold text-foreground text-sm">
                  {currentUser?.name || 'N/A'}
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="fingerprint" size={15} className="text-purple-500" />
                  Employee ID
                </div>
                <div className="font-mono font-medium text-foreground text-sm flex items-center justify-between">
                  <span>{empId}</span>
                  <button
                    onClick={() => copyToClipboard(empId, 'Employee ID')}
                    className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                    title="Copy ID"
                  >
                    <Icon name="content_copy" size={14} />
                  </button>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="apartment" size={15} className="text-blue-500" />
                  Department
                </div>
                <div className="font-semibold text-foreground text-sm">
                  {currentUser?.department || 'General'}
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="shield" size={15} className="text-emerald-500" />
                  Role & Permissions
                </div>
                <div className="font-semibold text-foreground text-sm">
                  {currentUser?.role || 'Teammate'}
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="work_outline" size={15} className="text-amber-500" />
                  Job Designation
                </div>
                <div className="font-medium text-foreground text-sm">
                  {currentUser?.designation || currentUser?.role || 'Employee'}
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon name="mail" size={15} className="text-primary" />
                  Sign-In / Work Email
                </div>
                <div className="font-medium text-foreground text-sm break-all">
                  {workEmail}
                </div>
              </div>

              {/* Workspace Identifier */}
              <div className="p-4.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 space-y-2 shadow-xs sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon name="corporate_fare" size={15} className="text-primary" />
                    Company Workspace ID
                  </div>
                  <button 
                    onClick={() => copyToClipboard(companyId, 'Workspace ID')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Icon name="content_copy" size={13} />
                    Copy ID
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-foreground font-semibold">
                    {companyId || 'N/A'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Organization reference ID for device authorization and workspace syncing.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Account Security & Password Change */}
      {activeTab === 'security' && (
        <>
          <Card className="glass-card rounded-3xl border border-white/30 dark:border-white/10 shadow-sm overflow-hidden">
            <CardHeader className="p-6 sm:p-8 pb-4 border-b border-border/40 dark:border-white/5">
              <CardTitle className="text-fluid-lg font-bold flex items-center gap-2">
                <Icon name="lock" size={20} className="text-primary" />
                Account Security
              </CardTitle>
              <CardDescription className="text-fluid-xs text-muted-foreground mt-1">
                Update your account password. Sign-in credentials are secured with end-to-end encryption.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-6">
              <form onSubmit={handleChangePassword} className="max-w-[560px] space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current Password
                  </label>
                  <div className="relative">
                    <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPwCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      value={pwCurrent}
                      onChange={e => setPwCurrent(e.target.value)}
                      required
                      className="h-11 !pl-11 pr-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwCurrent(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      tabIndex={-1}
                    >
                      <Icon name={showPwCurrent ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <Icon name="vpn_key" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPwNew ? 'text' : 'password'}
                      placeholder="Enter at least 6 characters"
                      value={pwNew}
                      onChange={e => setPwNew(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 !pl-11 pr-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwNew(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      tabIndex={-1}
                    >
                      <Icon name={showPwNew ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                  <p className="text-fluid-xs text-muted-foreground">
                    Must be at least 6 characters. Use letters, numbers, and symbols for better security.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Icon name="check_circle" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPwConfirm ? 'text' : 'password'}
                      placeholder="Re-type new password"
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 !pl-11 pr-11 rounded-2xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      tabIndex={-1}
                    >
                      <Icon name={showPwConfirm ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={pwLoading}
                    className="h-11 px-6 rounded-2xl font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                  >
                    {pwLoading ? (
                      <>
                        <Icon name="progress_activity" size={18} className="animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="lock_reset" size={18} />
                        <span>Update Password</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone: Account Deletion */}
          <Card className="glass-card rounded-3xl border border-destructive/25 shadow-sm overflow-hidden mt-6 bg-destructive/[0.02] dark:bg-destructive/[0.05]">
            <CardHeader className="p-6 sm:p-8 pb-4 border-b border-destructive/15">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-fluid-lg font-bold flex items-center gap-2 text-destructive">
                    <Icon name="delete_forever" size={20} className="text-destructive" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-fluid-xs text-muted-foreground mt-1">
                    Irreversible account and workspace management actions.
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Permanent
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-6">
              {isDeletionPending ? (
                /* Active Scheduled Deletion Banner */
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-amber-500/[0.1] border border-amber-500/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon name="schedule" size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <h4 className="text-fluid-sm font-bold text-foreground m-0">Workspace Deletion Pending</h4>
                    </div>
                    <p className="text-fluid-xs text-muted-foreground m-0 max-w-[540px]">
                      This workspace is scheduled for permanent deletion on <strong className="text-foreground">{scheduledDate ? new Date(scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'in 7 days'}</strong> (1-week notice period). All employees have been notified.
                    </p>
                  </div>
                  {isCurrentAdmin && (
                    <Button 
                      type="button" 
                      onClick={handleCancelScheduledDeletion}
                      disabled={isCancellingDeletion}
                      className="h-11 px-5 rounded-2xl font-bold shrink-0 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      {isCancellingDeletion ? (
                        <>
                          <Icon name="progress_activity" size={17} className="animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="undo" size={17} />
                          <span>Cancel Deletion</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                /* Delete Action Box */
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-destructive/[0.06] border border-destructive/20">
                  <div className="space-y-1">
                    <h4 className="text-fluid-sm font-bold text-foreground m-0">
                      {isSoleAdmin ? 'Schedule Workspace Deletion (1-Week Notice)' : 'Delete Account'}
                    </h4>
                    <p className="text-fluid-xs text-muted-foreground m-0 max-w-[520px]">
                      {isSoleAdmin 
                        ? 'You are the only Administrator. Deleting your account will schedule the entire workspace for permanent deletion in 7 days, and all employees will be notified with 1-week notice.' 
                        : isCurrentAdmin 
                          ? 'There are other administrators managing this workspace. Your admin account will be deleted immediately without deleting the workspace or notifying teammates.'
                          : 'Permanently delete your employee account and revoke access to this workspace.'}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteClick}
                    className="h-11 px-5 rounded-2xl font-bold shrink-0 shadow-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Icon name={isSoleAdmin ? "schedule" : "delete"} size={17} />
                    <span>{isSoleAdmin ? 'Schedule Deletion' : 'Delete Account'}</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Account Deletion Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="pb-3 border-b border-border/80 dark:border-white/12 space-y-0">
            <div className="flex items-center gap-2.5">
              <div className={`size-9 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isSoleAdmin 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                  : 'bg-destructive/15 text-destructive'
              }`}>
                <Icon name={isSoleAdmin ? "warning" : "delete_forever"} size={20} />
              </div>
              <div>
                <DialogTitle className={`text-fluid-base font-bold m-0 ${isSoleAdmin ? 'text-foreground' : 'text-destructive'}`}>
                  {isSoleAdmin ? 'Schedule Workspace Deletion' : 'Delete Account Permanently'}
                </DialogTitle>
                <DialogDescription className="text-fluid-xs text-muted-foreground m-0 mt-0.5">
                  {isSoleAdmin ? '7-day grace period notice' : 'This action is final and immediate'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 flex flex-col gap-3.5">
            <div className={`p-3.5 rounded-2xl border text-fluid-xs leading-relaxed flex items-start gap-2.5 ${
              isSoleAdmin 
                ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.14] border-amber-500/30 text-foreground' 
                : 'bg-destructive/[0.08] dark:bg-destructive/[0.14] border-destructive/30 text-foreground'
            }`}>
              <Icon 
                name={isSoleAdmin ? "info" : "error_outline"} 
                size={16} 
                className={`${isSoleAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'} shrink-0 mt-0.5`} 
              />
              <span>
                {isSoleAdmin ? (
                  <>
                    You are currently the <strong>only Administrator</strong>. Confirming this will schedule the <strong>entire workspace and all accounts for permanent deletion in 7 days</strong>. An announcement and notification will be sent to all employees so they can export their records.
                  </>
                ) : isCurrentAdmin ? (
                  <>
                    Other administrators exist in this workspace. Your administrator account will be <strong>deleted immediately</strong>. The workspace will remain active under the other administrators, and no notification will be sent to teammates.
                  </>
                ) : (
                  <>
                    Your employee account, profile details, and access to this workspace will be <strong>deleted immediately</strong>.
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">
                To confirm, please type <span className="font-mono font-black text-destructive px-1.5 py-0.5 rounded bg-destructive/10">DELETE</span> below:
              </label>
              <Input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoFocus
                className="h-11 rounded-2xl font-mono text-sm tracking-wider uppercase border-destructive/30 focus:border-destructive focus:ring-2 focus:ring-destructive/20"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/80 dark:border-white/12 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="h-10 rounded-2xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isSoleAdmin ? "default" : "destructive"}
              onClick={handleExecuteDeleteAccount}
              disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              className={`h-10 px-5 rounded-2xl font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 ${
                isSoleAdmin ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
              }`}
            >
              {isDeleting ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Icon name={isSoleAdmin ? "schedule" : "delete_forever"} size={16} />
                  <span>{isSoleAdmin ? 'Schedule Deletion (7 Days)' : 'Permanently Delete'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

