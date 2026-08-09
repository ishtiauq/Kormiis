import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { changeEmployeePassword } from '../services/auth.js'

const getInitialsAvatar = (name) => {
  const parts = name.split(' ')
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]

  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = hash % 360

  return (
    <div className="flex items-center justify-center size-10 rounded-full font-bold text-base shrink-0" style={{
      background: `hsl(${h}, 70%, 80%)`, color: `hsl(${h}, 70%, 20%)`,
    }}>
      {initials.toUpperCase()}
    </div>
  )
}

export default function ProfileView({ currentUser, pendingProfileEdits, setPendingProfileEdits, addToast, addLog, settings, setSettings, employees, setEmployees }) {
  const [editMode, setEditMode] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [formData, setFormData] = useState({
    personalEmail: currentUser.personalEmail || '',
    phone: currentUser.phone || '',
    address: currentUser.address || '',
    emergencyContact: currentUser.emergencyContact || ''
  })

  const hasPending = pendingProfileEdits?.some(e => e.employeeId === currentUser.id)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (hasPending) return addToast('You already have a pending edit request.', 'warning')

    setPendingProfileEdits(prev => [...(prev || []), {
      id: `edit-${Date.now()}`,
      employeeId: currentUser.id,
      timestamp: new Date().toISOString(),
      changes: formData
    }])

    setEditMode(false)
    addToast('Profile update submitted for HR review.', 'success')
    addLog('Profile Edit Requested', `${currentUser.name} requested to update their profile info.`, 'info')
  }

  // Handle device toggling
  const userDevices = currentUser.isEmployee 
    ? (employees?.find(e => e.id === currentUser.id)?.devices || [])
    : (settings?.adminDevices || [])

  const handleToggleDevice = (deviceId, currentStatus) => {
    if (currentUser.isEmployee) {
      if (!setEmployees) return
      const updatedEmployees = employees.map(emp => {
        if (emp.id === currentUser.id) {
          const updatedDevices = (emp.devices || []).map(d => 
            d.deviceId === deviceId ? { ...d, isBlocked: !currentStatus } : d
          )
          return { ...emp, devices: updatedDevices }
        }
        return emp
      })
      setEmployees(updatedEmployees)
      addToast(currentStatus ? 'Device access restored.' : 'Device access revoked.', 'success')
    } else {
      if (!setSettings) return
      const updatedDevices = (settings.adminDevices || []).map(d => 
        d.deviceId === deviceId ? { ...d, isBlocked: !currentStatus } : d
      )
      setSettings({ ...settings, adminDevices: updatedDevices })
      addToast(currentStatus ? 'Device access restored.' : 'Device access revoked.', 'success')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwLoading(true)
    try {
      if (!pwCurrent) {
        addToast('Please enter your current password.', 'warning')
        return
      }
      if (pwNew.length < 6) {
        addToast('New password must be at least 6 characters.', 'warning')
        return
      }
      if (pwNew !== pwConfirm) {
        addToast('New passwords do not match.', 'warning')
        return
      }
      await changeEmployeePassword(pwCurrent, pwNew)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      addToast('Password changed successfully.', 'success')
      if (addLog) addLog('Password Changed', `${currentUser.name} changed their password.`, 'info')
    } catch (err) {
      addToast('Failed to change password: ' + err.message, 'danger')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[800px] mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="person" className="text-foreground" size={20}/>
          Profile
        </h1>
        {!editMode && !hasPending && (
          <Button variant="outline" onClick={() => setEditMode(true)}>Edit Details</Button>
        )}
      </div>
      <div className="border-t border-border border-headline" />

      {hasPending && (
        <div className="p-4 rounded-md flex gap-3 items-center bg-amber-500/10 border-l-4 border-l-amber-500 text-foreground">
          <Icon name="error" className="h-5 w-5 text-amber-500" size={20}/>
          <span className="text-sm font-medium">You have pending profile updates waiting for HR approval.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start">
          <div className="mx-auto sm:mx-0">
            {getInitialsAvatar(currentUser.name)}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
              <div className="font-medium text-fluid-lg">{currentUser.name}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Employee ID</label>
              <div className="font-medium text-fluid-lg">{currentUser.id || currentUser.employeeId || 'N/A'}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Department</label>
              <div className="font-medium text-fluid-lg">{currentUser.department || 'Management'}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
              <div className="font-medium text-fluid-lg">{currentUser.role}</div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Company ID</label>
              <div className="font-medium text-fluid-lg flex items-center gap-2">
                <span className="font-sans bg-muted px-2 py-0.5 rounded">{currentUser.adminUid || currentUser.uid || currentUser.id}</span>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                  navigator.clipboard.writeText(currentUser.adminUid || currentUser.uid || currentUser.id);
                  addToast('Company ID copied to clipboard!', 'success');
                }} aria-label="Copy Company ID">
                  <Icon name="content_copy" size={16}/>
                </Button>
                <p className="text-fluid-xs text-muted-foreground font-normal ml-2">Share this with employees to log in from other devices.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Personal Email</label>
                <Input type="email" value={formData.personalEmail} onChange={e => setFormData(p => ({...p, personalEmail: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Phone Number</label>
                <Input type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium leading-none">Address</label>
                <Input type="text" value={formData.address} onChange={e => setFormData(p => ({...p, address: e.target.value}))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium leading-none">Emergency Contact</label>
                <Input type="text" value={formData.emergencyContact} onChange={e => setFormData(p => ({...p, emergencyContact: e.target.value}))} />
              </div>
              <div className="sm:col-span-2 flex gap-3 mt-4">
                <Button type="submit">Submit for Approval</Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Personal Email</label>
                <div className="font-medium">{currentUser.personalEmail || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                <div className="font-medium">{currentUser.phone || '-'}</div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Address</label>
                <div className="font-medium">{currentUser.address || '-'}</div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Emergency Contact</label>
                <div className="font-medium">{currentUser.emergencyContact || '-'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentUser.isEmployee && currentUser.uid && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <p className="text-fluid-sm text-muted-foreground">Update the password you use to sign in. Your sign-in email is managed by your HR administrator.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Current Password</label>
                <Input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">New Password</label>
                <Input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Confirm New Password</label>
                <Input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex gap-3 mt-4">
                <Button type="submit" disabled={pwLoading}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices Section */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <p className="text-fluid-sm text-muted-foreground">Manage devices that are currently logged into your account.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {userDevices.length === 0 && (
              <p className="text-fluid-sm text-muted-foreground">No devices found.</p>
            )}
            {userDevices.map(device => {
              const currentDeviceId = localStorage.getItem('kormiis_device_id')
              const isCurrent = device.deviceId === currentDeviceId
              return (
                <div key={device.deviceId} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Icon name={device.label.includes('iOS') || device.label.includes('Android') ? 'smartphone' : 'computer'} size={20}/>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {device.label}
                        {isCurrent && <span className="text-[10px] uppercase font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">Current</span>}
                      </h4>
                      <p className="text-fluid-xs text-muted-foreground">
                        Last Active: {new Date(device.lastLogin).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {!isCurrent && (
                      <Button 
                        variant={device.isBlocked ? "default" : "destructive"} 
                        size="sm"
                        onClick={() => handleToggleDevice(device.deviceId, device.isBlocked)}
                      >
                        {device.isBlocked ? "Restore Access" : "Revoke Access"}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
