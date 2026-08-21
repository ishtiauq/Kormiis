import { useState, useRef, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { useModal } from '../services/useModal.js'
import AdSlot from './AdSlot.jsx'
import { formatDateTime } from '../services/date.js'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { requestPushPermission, getPushPermission, registerPushSubscription } from "../services/pushNotifications.js"
import { sendTestEmail } from "../services/emailService.js"

export default function Settings({ settings, setSettings, addLog, addToast, auditLogs, themeMode, toggleTheme, employees, setEmployees, currentUser }) {
  // Accordion open states
  const [openSections, setOpenSections] = useState(() => {
    const saved = localStorage.getItem('kormiis_settings_open_sections')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return { company: true, payroll: false, expenses: false, notifications: false, security: false, audit: false }
  })

  const toggleSection = (id) => {
    setOpenSections(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('kormiis_settings_open_sections', JSON.stringify(next))
      return next
    })
  }

  const expandAll = () => {
    const next = { company: true, payroll: true, expenses: true, notifications: true, security: true, audit: true }
    setOpenSections(next)
    localStorage.setItem('kormiis_settings_open_sections', JSON.stringify(next))
  }

  const collapseAll = () => {
    const next = {}
    setOpenSections(next)
    localStorage.setItem('kormiis_settings_open_sections', JSON.stringify(next))
  }

  const [auditFilterDate, setAuditFilterDate] = useState('')
  const [auditFilterAction, setAuditFilterAction] = useState('All')

  // Handle device sessions
  const userDevices = currentUser?.isEmployee 
    ? (employees?.find(e => e.id === currentUser?.id)?.devices || [])
    : (settings?.adminDevices || [])

  const handleToggleDevice = (deviceId, currentStatus) => {
    if (currentUser?.isEmployee) {
      if (!setEmployees) return
      const updatedEmployees = (employees || []).map(emp => {
        if (emp.id === currentUser.id) {
          const updatedDevices = (emp.devices || []).map(d => 
            d.deviceId === deviceId ? { ...d, isBlocked: !currentStatus } : d
          )
          return { ...emp, devices: updatedDevices }
        }
        return emp
      })
      setEmployees(updatedEmployees)
      if (addToast) addToast(currentStatus ? 'Device access restored.' : 'Device access revoked.', 'success')
      if (addLog) addLog('Device Access Updated', `${currentStatus ? 'Restored' : 'Revoked'} access for device ${deviceId}`, 'info')
    } else {
      if (!setSettings) return
      const updatedDevices = (settings?.adminDevices || []).map(d => 
        d.deviceId === deviceId ? { ...d, isBlocked: !currentStatus } : d
      )
      setSettings(prev => ({ ...prev, adminDevices: updatedDevices }))
      if (addToast) addToast(currentStatus ? 'Device access restored.' : 'Device access revoked.', 'success')
      if (addLog) addLog('Device Access Updated', `${currentStatus ? 'Restored' : 'Revoked'} access for device ${deviceId}`, 'info')
    }
  }

  const [currency, setCurrency] = useState(settings.currency || '৳')
  const [salaryStructure, setSalaryStructure] = useState(settings.salaryStructure || [])
  const [expensePolicies, setExpensePolicies] = useState(settings.expensePolicies || { Travel: 500, Meals: 50, 'Office Supplies': 100, Medical: 200, Other: 50 })
  const [companyName, setCompanyName] = useState(settings.company?.name || 'Kormiis Ltd.')
  const [companyEmail, setCompanyEmail] = useState(settings.company?.email || 'hr@kormiis.io')
  const [companyPhone, setCompanyPhone] = useState(settings.company?.phone || '+880 1700-000000')
  const [companyWebsite, setCompanyWebsite] = useState(settings.company?.website || 'kormiis.vercel.app')
  const [logo, setLogo] = useState(settings.company?.logo || '')
  const [logoX, setLogoX] = useState(settings.company?.logoX || 0)
  const [logoY, setLogoY] = useState(settings.company?.logoY || 0)
  const [logoZoom, setLogoZoom] = useState(settings.company?.logoZoom || 1)

  const [showLogoModal, setShowLogoModal] = useState(false)
  useModal(() => setShowLogoModal(false))
  const [dragStart, setDragStart] = useState(null)
  const fileInputRef = useRef(null)
  const [syncAlerts, setSyncAlerts] = useState(settings.notifications?.syncAlerts ?? true)
  const [emailDigests, setEmailDigests] = useState(settings.notifications?.emailDigests ?? false)
  const [pushEnabled, setPushEnabled] = useState(settings.notifications?.pushEnabled ?? false)
  const [pushPermission, setPushPermission] = useState(() => getPushPermission())
  const [resendApiKey, setResendApiKey] = useState(settings.company?.resendApiKey || '')
  const [resendFromEmail, setResendFromEmail] = useState(settings.company?.resendFromEmail || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  useModal(() => setShowResetModal(false))
  const [componentToDelete, setComponentToDelete] = useState(null)
  useModal(() => setComponentToDelete(null))

  const [showAddComponentModal, setShowAddComponentModal] = useState(false)
  const [newCompName, setNewCompName] = useState('')
  const [newCompType, setNewCompType] = useState('earning')
  const [newCompPercent, setNewCompPercent] = useState('')
  useModal(() => setShowAddComponentModal(false))

  useEffect(() => {
    if (settings.currency && settings.currency !== currency) setCurrency(settings.currency)
    if (settings.salaryStructure) setSalaryStructure(settings.salaryStructure)
    if (settings.expensePolicies) setExpensePolicies(settings.expensePolicies)
    if (settings.company?.name) setCompanyName(settings.company.name)
    if (settings.company?.email) setCompanyEmail(settings.company.email)
    if (settings.company?.phone) setCompanyPhone(settings.company.phone)
    if (settings.company?.website) setCompanyWebsite(settings.company.website)
    if (settings.company?.logo) setLogo(settings.company.logo)
    if (settings.company?.logoX !== undefined) setLogoX(settings.company.logoX)
    if (settings.company?.logoY !== undefined) setLogoY(settings.company.logoY)
    if (settings.company?.logoZoom !== undefined) setLogoZoom(settings.company.logoZoom)
    if (settings.company?.resendApiKey !== undefined) setResendApiKey(settings.company.resendApiKey)
    if (settings.company?.resendFromEmail !== undefined) setResendFromEmail(settings.company.resendFromEmail)
    if (settings.notifications) {
      if (settings.notifications.syncAlerts !== undefined) setSyncAlerts(settings.notifications.syncAlerts)
      if (settings.notifications.emailDigests !== undefined) setEmailDigests(settings.notifications.emailDigests)
      if (settings.notifications.pushEnabled !== undefined) setPushEnabled(settings.notifications.pushEnabled)
    }
  }, [settings])

  const earningsSum = salaryStructure.filter(s => s.type === 'earning').reduce((a, c) => a + c.percentage, 0)
  const deductionsSum = salaryStructure.filter(s => s.type === 'deduction').reduce((a, c) => a + c.percentage, 0)
  const netPayPercent = earningsSum - deductionsSum
  const isOver100 = earningsSum > 100

  const handleComponentChange = (id, field, value) => {
    setSalaryStructure(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const saveNewComponent = () => {
    if (!newCompName.trim() || !newCompPercent) return
    setSalaryStructure(prev => [...prev, { id: `comp-${Date.now()}`, name: newCompName, percentage: Number(newCompPercent), type: newCompType }])
    setShowAddComponentModal(false)
  }

  const handleRemoveComponent = (id) => {
    setSalaryStructure(prev => prev.filter(item => item.id !== id))
  }

  const handleTogglePushNotifications = async (targetState) => {
    if (targetState) {
      // Turning ON
      let perm = pushPermission
      if (perm !== 'granted') {
        perm = await requestPushPermission()
        setPushPermission(perm)
      }
      if (perm === 'granted') {
        setPushEnabled(true)
        const updated = {
          ...settings,
          notifications: { ...settings?.notifications, syncAlerts, emailDigests, pushEnabled: true }
        }
        setSettings(updated)
        if (currentUser) {
          registerPushSubscription(currentUser, currentUser.companyUid || currentUser.uid).catch(() => {})
        }
        if (addToast) addToast('Push notifications turned ON for this device!', 'success')
      } else {
        if (addToast) addToast('Notification permission was not allowed in your browser.', 'warning')
      }
    } else {
      // Turning OFF
      setPushEnabled(false)
      const updated = {
        ...settings,
        notifications: { ...settings?.notifications, syncAlerts, emailDigests, pushEnabled: false }
      }
      setSettings(updated)
      if (addToast) addToast('Push notifications turned OFF on this device.', 'info')
    }
  }

  const handleSendTestEmail = async () => {
    const key = resendApiKey?.trim()
    if (!key) {
      if (addToast) addToast('Please enter your Resend API Key first.', 'warning')
      return
    }
    const targetEmail = companyEmail || currentUser?.email
    if (!targetEmail) {
      if (addToast) addToast('No recipient email available to send test email.', 'warning')
      return
    }
    setIsTestingEmail(true)
    try {
      const res = await sendTestEmail({
        apiKey: key,
        fromEmail: resendFromEmail?.trim(),
        recipientEmail: targetEmail,
        companyName,
      })
      if (res.success) {
        if (addToast) addToast(`Verification email successfully dispatched to ${targetEmail}!`, 'success')
      } else {
        if (addToast) addToast(`Resend Error: ${res.error}`, 'danger')
      }
    } catch (e) {
      if (addToast) addToast(`Dispatch failed: ${e.message}`, 'danger')
    } finally {
      setIsTestingEmail(false)
    }
  }

  const handleSave = () => {
    setIsSaving(true)
    Promise.resolve().then(() => {
      setSettings({
        ...settings,
        currency, salaryStructure, expensePolicies,
        company: { 
          ...settings?.company, 
          name: companyName, 
          email: companyEmail, 
          phone: companyPhone, 
          website: companyWebsite, 
          logo, logoX, logoY, logoZoom,
          resendApiKey: resendApiKey?.trim() || '',
          resendFromEmail: resendFromEmail?.trim() || ''
        },
        notifications: { syncAlerts, emailDigests, pushEnabled }
      })
      addLog?.('Settings Updated', 'Saved system settings and synced configurations', 'success')
      setIsSaving(false)
      if (addToast) addToast("Settings saved successfully!", "success")
    })
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => { setLogo(reader.result); setLogoX(0); setLogoY(0); setLogoZoom(1); setShowLogoModal(true) }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => fileInputRef.current?.click()

  const handlePointerDown = (e) => {
    e.preventDefault()
    setDragStart({ x: e.clientX - logoX, y: e.clientY - logoY })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => { if (dragStart) { setLogoX(e.clientX - dragStart.x); setLogoY(e.clientY - dragStart.y) } }
  const handlePointerUp = () => setDragStart(null)
  const handleRemoveLogo = () => { setLogo(''); setLogoX(0); setLogoY(0); setLogoZoom(1); setShowLogoModal(false) }

  const handleExportCSV = () => {
    const filteredAudit = (auditLogs || []).filter(l => {
      if (auditFilterAction !== 'All' && l.action !== auditFilterAction) return false
      if (auditFilterDate && !l.timestamp.startsWith(auditFilterDate)) return false
      return true
    })
    if (!filteredAudit.length) return
    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Details', 'IP Address']
    const rows = filteredAudit.map(log => [formatDateTime(log.timestamp), log.user, log.action, log.entity, log.details, log.ip].map(f => `"${f}"`).join(','))
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n')
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    if (addToast) addToast("Audit logs exported to CSV", "success")
  }

  const allSectionsOpen = openSections.company && openSections.payroll && openSections.expenses && openSections.notifications && openSections.security && openSections.audit

  const renderActionFooter = (disabled = false) => (
    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/50 dark:border-white/8 mt-2">
      <Button 
        variant="outline" 
        onClick={() => setShowResetModal(true)}
        className="h-10 rounded-2xl text-xs font-semibold px-4 border-border/80 dark:border-white/12"
      >
        <Icon name="refresh" size={16} className="mr-1.5 text-muted-foreground"/>
        Reset
      </Button>

      <Button 
        onClick={handleSave} 
        disabled={isSaving || disabled}
        className="h-10 rounded-2xl font-bold px-6 shadow-sm transition-all active:scale-95"
      >
        {isSaving ? <Icon name="monitoring" className="mr-2 h-4 w-4 animate-spin" size={16}/> : <Icon name="save" className="mr-2 h-4 w-4" size={16}/>}
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-14 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon name="settings" className="text-foreground shrink-0" size={36}/>
        <h1 className="text-fluid-xl font-extrabold tracking-tight text-foreground">
          Settings
        </h1>
      </div>

      <div className="border-t border-border/80 dark:border-white/12" />

      {/* Accordion Stream */}
      <div className="flex flex-col gap-2.5 sm:gap-3">

        {/* 1. Company Profile Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.company 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('company')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="apartment" className="text-primary shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">Company Profile</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.company ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.company && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-6 animate-in fade-in-50 duration-200">
              {/* Logo Uploader */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/40 dark:border-white/8">
                <div 
                  role="button" 
                  tabIndex={0} 
                  onClick={() => { if (logo) setShowLogoModal(true); else triggerFileInput() }}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/60 transition-all bg-card/60 relative group shrink-0 shadow-sm"
                >
                  {logo ? (
                    <img src={logo} alt="Company Logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" style={{ transform: `scale(${logoZoom}) translate(${logoX}px, ${logoY}px)` }} />
                  ) : (
                    <Icon name="upload" className="text-muted-foreground group-hover:text-primary transition-colors" size={24}/>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Company Brand Logo</span>
                  <p className="text-fluid-xs text-muted-foreground">Recommended format: Square SVG or PNG with transparent background.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={triggerFileInput} className="h-9 rounded-xl text-xs font-bold gap-1.5 border-border/80 dark:border-white/12">
                      <Icon name="upload" size={15}/> {logo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    {logo && (
                      <Button variant="ghost" size="sm" onClick={() => setShowLogoModal(true)} className="h-9 rounded-xl text-xs font-bold gap-1.5 text-primary">
                        <Icon name="crop" size={15}/> Crop & Adjust
                      </Button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Legal Entity Name</label>
                  <div className="relative flex items-center">
                    <Icon name="apartment" size={18} className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none"/>
                    <Input 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      placeholder="Kormiis Ltd." 
                      className="!pl-10.5 h-11 rounded-2xl" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Official Mobile / Phone</label>
                  <div className="relative flex items-center">
                    <Icon name="call" size={18} className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none"/>
                    <Input 
                      type="tel" 
                      value={companyPhone} 
                      onChange={e => setCompanyPhone(e.target.value)} 
                      placeholder="+880 1700-000000" 
                      className="!pl-10.5 h-11 rounded-2xl" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">HR Support Email</label>
                  <div className="relative flex items-center">
                    <Icon name="mail" size={18} className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none"/>
                    <Input 
                      type="email" 
                      value={companyEmail} 
                      onChange={e => setCompanyEmail(e.target.value)} 
                      placeholder="hr@kormiis.io" 
                      className="!pl-10.5 h-11 rounded-2xl" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Website URL</label>
                  <div className="relative flex items-center">
                    <Icon name="language" size={18} className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none"/>
                    <Input 
                      value={companyWebsite} 
                      onChange={e => setCompanyWebsite(e.target.value)} 
                      placeholder="kormiis.vercel.app" 
                      className="!pl-10.5 h-11 rounded-2xl" 
                    />
                  </div>
                </div>
              </div>

              {renderActionFooter()}
            </div>
          )}
        </div>

        {/* 2. Payroll & Currency Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.payroll 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('payroll')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="account_balance" className="text-emerald-500 shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">Payroll & Currency</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.payroll ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.payroll && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-6 animate-in fade-in-50 duration-200">
              {/* Currency Selector */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/40 dark:border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Global Workspace Currency</h4>
                  <p className="text-fluid-xs text-muted-foreground">Select currency symbol applied across payroll, invoices, and expense reimbursement claims.</p>
                </div>
                <div className="w-full sm:w-[220px] shrink-0">
                  <Select value={currency} onChange={setCurrency} placeholder="$ (USD)">
                    <SelectItem id="$">$ (USD)</SelectItem>
                    <SelectItem id="৳">৳ (BDT)</SelectItem>
                    <SelectItem id="€">€ (EUR)</SelectItem>
                    <SelectItem id="£">£ (GBP)</SelectItem>
                    <SelectItem id="₹">₹ (INR)</SelectItem>
                    <SelectItem id="¥">¥ (JPY)</SelectItem>
                    <SelectItem id="د.إ">د.إ (AED)</SelectItem>
                    <SelectItem id="﷼">﷼ (SAR)</SelectItem>
                    <SelectItem id="S$">S$ (SGD)</SelectItem>
                    <SelectItem id="C$">C$ (CAD)</SelectItem>
                    <SelectItem id="A$">A$ (AUD)</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Salary Structure Card */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Salary Breakdown Structure</h4>
                    <p className="text-fluid-xs text-muted-foreground">Configure base earnings, allowances, and statutory deduction percentages.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setNewCompName(''); setNewCompType('earning'); setNewCompPercent(''); setShowAddComponentModal(true) }}
                    className="h-10 rounded-2xl font-bold px-4 border-border/80 dark:border-white/12 gap-1.5 self-start sm:self-auto"
                  >
                    <Icon name="add" size={16}/> Add Component
                  </Button>
                </div>

                {isOver100 && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/25 flex items-center gap-2.5 text-xs font-semibold">
                    <Icon name="warning" size={18}/>
                    <span>Total breakdown cannot exceed 100% of Gross Salary. Current total: {totalPercentage}%</span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  {salaryStructure.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border/80 dark:border-white/12 rounded-2xl">
                      No components defined yet. Click "Add Component" above.
                    </div>
                  ) : (
                    salaryStructure.map(item => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/40 dark:border-white/8 hover:border-primary/30 transition-all flex-wrap sm:flex-nowrap"
                      >
                        <div className="flex-1 min-w-[150px]">
                          <Input 
                            value={item.name} 
                            onChange={e => handleComponentChange(item.id, 'name', e.target.value)} 
                            placeholder="Component Name" 
                            className="h-10 rounded-xl font-medium" 
                          />
                        </div>

                        <div className="flex rounded-xl p-1 bg-black/5 dark:bg-white/5 border border-border/40 dark:border-white/8 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleComponentChange(item.id, 'type', 'earning')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              item.type === 'earning' 
                                ? 'bg-primary text-primary-foreground shadow-xs' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Earning
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComponentChange(item.id, 'type', 'deduction')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              item.type === 'deduction' 
                                ? 'bg-destructive text-destructive-foreground shadow-xs' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Deduction
                          </button>
                        </div>

                        <div className="relative w-[85px] shrink-0">
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={item.percentage} 
                            onChange={e => handleComponentChange(item.id, 'percentage', Number(e.target.value))} 
                            className="pr-6 text-center h-10 rounded-xl font-bold tabular-nums" 
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" 
                          onClick={() => setComponentToDelete(item.id)}
                        >
                          <Icon name="delete" size={16}/>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {renderActionFooter(isOver100)}
            </div>
          )}
        </div>

        {/* 3. Expense Policies Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.expenses 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('expenses')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="wallet" className="text-indigo-500 shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">Expense Policies</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.expenses ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.expenses && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in-50 duration-200">
              <p className="text-fluid-xs text-muted-foreground mb-2">Set maximum reimbursement limits per claim for each expense category.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(expensePolicies).map(cat => (
                  <div key={cat} className="flex flex-col gap-2 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/40 dark:border-white/8">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat} Limit ({currency})</label>
                    <Input 
                      type="number" 
                      value={expensePolicies[cat]} 
                      onChange={e => setExpensePolicies(prev => ({ ...prev, [cat]: Number(e.target.value) }))} 
                      className="h-11 rounded-2xl font-bold tabular-nums text-foreground"
                    />
                  </div>
                ))}
              </div>

              {renderActionFooter()}
            </div>
          )}
        </div>

        {/* 4. Notifications Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.notifications 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('notifications')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="notifications_active" className="text-purple-500 shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">Notifications & Alerts</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.notifications ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.notifications && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-6 animate-in fade-in-50 duration-200">
              <div className="flex flex-col divide-y divide-border/50 dark:divide-white/8">
                <div className="py-3.5 first:pt-0 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-foreground">Real-time Cloud Sync Alerts</span>
                    <span className="text-fluid-xs text-muted-foreground">Displays toast notifications when offline queue finishes syncing to Cloud.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={syncAlerts} 
                    onChange={e => setSyncAlerts(e.target.checked)} 
                    className="h-5 w-5 rounded-lg accent-primary cursor-pointer shrink-0 ml-4" 
                  />
                </div>

                <div className="py-3.5 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-foreground">Monthly Payroll Email Digest</span>
                    <span className="text-fluid-xs text-muted-foreground">Sends an automated copy of finalized monthly statements to HR inbox.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emailDigests} 
                    onChange={e => setEmailDigests(e.target.checked)} 
                    className="h-5 w-5 rounded-lg accent-primary cursor-pointer shrink-0 ml-4" 
                  />
                </div>

              </div>

              {/* Push Notifications Card with Direct On / Off Toggle */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 dark:border-white/10 flex flex-col gap-3.5 mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">Browser Push Notifications</span>
                      {pushEnabled && pushPermission === 'granted' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active (ON)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/40">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50"></span>
                          Disabled (OFF)
                        </span>
                      )}
                    </div>
                    <span className="text-fluid-xs text-muted-foreground">
                      {pushEnabled && pushPermission === 'granted'
                        ? 'Web push alerts are currently active and delivering notifications to this device.'
                        : 'Turn on to receive instant system banners for announcements, task assignments, and shift changes.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant={pushEnabled && pushPermission === 'granted' ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleTogglePushNotifications(!pushEnabled || pushPermission !== 'granted')}
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        pushEnabled && pushPermission === 'granted'
                          ? 'border-border/80 text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                          : 'bg-primary text-primary-foreground hover:brightness-105'
                      }`}
                    >
                      <Icon 
                        name={pushEnabled && pushPermission === 'granted' ? "notifications_off" : "notifications_active"} 
                        size={15} 
                        className="mr-1.5" 
                      />
                      {pushEnabled && pushPermission === 'granted' ? 'Turn Off' : 'Turn On'}
                    </Button>
                  </div>
                </div>

                {/* Permission Details */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 dark:bg-white/5 border border-border/40 dark:border-white/8 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Browser Permission:</span>
                    <span className={`font-semibold ${pushPermission === 'granted' ? 'text-emerald-500' : pushPermission === 'denied' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {pushPermission === 'granted' ? 'Granted' : pushPermission === 'denied' ? 'Blocked by Browser' : 'Not Allowed Yet'}
                    </span>
                  </div>
                  {pushPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await requestPushPermission()
                        setPushPermission(res)
                        if (res === 'granted') {
                          handleTogglePushNotifications(true)
                        }
                      }}
                      className="text-primary hover:underline font-bold text-xs"
                    >
                      Request Permission
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Resend Email Integration Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 dark:border-white/10 flex flex-col gap-4 mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon name="mail" size={20} className="text-primary" />
                        <span className="font-bold text-sm text-foreground">Automated Emails (Resend Integration)</span>
                      </div>
                      {resendApiKey ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/40">
                          Optional / Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-fluid-xs text-muted-foreground">
                      Automatically delivers employee onboarding invitations, temporary login passwords, and payroll slips to employee inboxes.
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTestingEmail || !resendApiKey}
                    onClick={handleSendTestEmail}
                    className="h-9 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 gap-1.5"
                  >
                    {isTestingEmail ? (
                      <Icon name="monitoring" className="animate-spin" size={14} />
                    ) : (
                      <Icon name="send" size={14} />
                    )}
                    {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40 dark:border-white/8">
                  {/* Resend API Key Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Resend API Key</span>
                      <a 
                        href="https://resend.com/api-keys" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary text-[11px] font-semibold hover:underline"
                      >
                        Get Free Key (3,000 emails/mo) ↗
                      </a>
                    </label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={resendApiKey}
                        onChange={e => setResendApiKey(e.target.value)}
                        placeholder="re_123456789_abcdef..."
                        className="h-10 text-xs font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        tabIndex={-1}
                      >
                        <Icon name={showApiKey ? "visibility_off" : "visibility"} size={16} />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Enter your API key from resend.com dashboard.
                    </span>
                  </div>

                  {/* Sender Email / Domain */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Sender Email / Domain (From)
                    </label>
                    <Input
                      type="text"
                      value={resendFromEmail}
                      onChange={e => setResendFromEmail(e.target.value)}
                      placeholder="onboarding@resend.dev or hr@yourcompany.com"
                      className="h-10 text-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Default is <code className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[10px]">onboarding@resend.dev</code> (or your verified domain).
                    </span>
                  </div>
                </div>
              </div>

              {renderActionFooter()}
            </div>
          )}
        </div>

        {/* 5. Security & Sessions Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.security 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('security')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="verified_user" className="text-emerald-500 shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">Security & Sessions</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.security ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.security && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in-50 duration-200">
              {userDevices.length === 0 ? (
                <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 dark:border-white/10 flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <Icon name="laptop_mac" className="text-primary shrink-0" size={32}/>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Current Active Session</span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">Active Now</Badge>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Current Device</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Primary Workspace Login • System Authenticated
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                userDevices.map(device => {
                  const currentDeviceId = localStorage.getItem('kormiis_device_id')
                  const isCurrent = device.deviceId === currentDeviceId
                  const isMobile = device.label?.includes('iOS') || device.label?.includes('Android') || device.label?.includes('Mobile')
                  return (
                    <div 
                      key={device.deviceId} 
                      className={`p-4 rounded-2xl border transition-all flex justify-between items-center gap-4 flex-wrap ${
                        device.isBlocked 
                          ? 'bg-destructive/5 border-destructive/20 opacity-80' 
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-border/60 dark:border-white/10 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon name={isMobile ? 'smartphone' : 'computer'} className={`shrink-0 ${device.isBlocked ? 'text-destructive' : 'text-primary'}`} size={32}/>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{device.label || 'Web Browser'}</span>
                            {isCurrent && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase font-bold">
                                Current Device
                              </Badge>
                            )}
                            <Badge 
                              variant={device.isBlocked ? "destructive" : "outline"} 
                              className={`text-[11px] ${
                                device.isBlocked 
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {device.isBlocked ? "Access Revoked" : "Active Session"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                            <span>Last Active: {device.lastLogin ? new Date(device.lastLogin).toLocaleString() : 'Recently'}</span>
                            {device.ip && <span>• IP: {device.ip}</span>}
                            {device.location && <span>• {device.location}</span>}
                          </div>
                        </div>
                      </div>

                      {!isCurrent && (
                        <Button 
                          variant={device.isBlocked ? "default" : "outline"} 
                          size="sm"
                          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                            device.isBlocked 
                              ? 'shadow-sm' 
                              : 'text-destructive border-destructive/30 hover:bg-destructive/10'
                          }`}
                          onClick={() => handleToggleDevice(device.deviceId, device.isBlocked)}
                        >
                          <Icon name={device.isBlocked ? "lock_open" : "block"} size={14} className="mr-1.5"/>
                          {device.isBlocked ? "Restore Access" : "Revoke Access"}
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* 6. Audit Logs Accordion */}
        <div className={`glass-kormiis border rounded-3xl transition-all duration-300 overflow-hidden shadow-sm ${
          openSections.audit 
            ? 'border-primary/40 dark:border-white/20 ring-1 ring-primary/20' 
            : 'border-border/80 dark:border-white/10 hover:border-primary/30'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('audit')}
            className="w-full py-2.5 px-4 sm:px-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer select-none border-0 outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Icon name="list" className="text-blue-500 shrink-0" size={32}/>
              <h3 className="font-bold text-fluid text-foreground tracking-tight">System Audit Logs</h3>
            </div>

            <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${
              openSections.audit ? 'rotate-180 bg-primary/10 text-primary' : 'rotate-0 bg-black/5 dark:bg-white/5 text-muted-foreground'
            }`}>
              <Icon name="expand_more" size={18}/>
            </div>
          </button>

          {openSections.audit && (
            <div className="border-t border-border/60 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in-50 duration-200">
              <div className="flex flex-wrap items-end justify-between gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/60 dark:border-white/10">
                <div className="flex flex-wrap items-end gap-3 flex-1">
                  <div className="flex-1 min-w-[140px]">
                    <DatePicker label="Filter Date" value={auditFilterDate} onChange={e => setAuditFilterDate(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Select label="Action Type" value={auditFilterAction} onChange={setAuditFilterAction}>
                      <SelectItem id="All">All Operations</SelectItem>
                      <SelectItem id="CREATE">CREATE</SelectItem>
                      <SelectItem id="UPDATE">UPDATE</SelectItem>
                      <SelectItem id="DELETE">DELETE</SelectItem>
                    </Select>
                  </div>
                  <Button variant="ghost" onClick={() => { setAuditFilterDate(''); setAuditFilterAction('All') }} className="h-11 rounded-2xl text-xs font-semibold">
                    Clear
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-11 rounded-2xl font-bold px-4 gap-1.5 border-border/80 dark:border-white/12">
                  <Icon name="download" size={16}/> Export CSV
                </Button>
              </div>

              <div className="rounded-2xl border border-border/80 dark:border-white/10 overflow-hidden mt-2">
                <Table>
                  <TableHeader className="bg-muted/40 dark:bg-white/5">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditLogs || []).filter(l => {
                      if (auditFilterAction !== 'All' && l.action !== auditFilterAction) return false
                      if (auditFilterDate && !l.timestamp.startsWith(auditFilterDate)) return false
                      return true
                    }).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit logs found matching criteria.</TableCell></TableRow>
                    ) : (
                      (auditLogs || []).filter(l => {
                        if (auditFilterAction !== 'All' && l.action !== auditFilterAction) return false
                        if (auditFilterDate && !l.timestamp.startsWith(auditFilterDate)) return false
                        return true
                      }).map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-sans text-xs">{formatDateTime(log.timestamp)}</TableCell>
                          <TableCell className="font-bold text-sm">{log.user}</TableCell>
                          <TableCell>
                            <Badge variant={log.action === 'CREATE' ? 'default' : log.action === 'UPDATE' ? 'secondary' : log.action === 'DELETE' ? 'destructive' : 'outline'} className="text-[10px]">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.entity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] break-words">{log.details}</TableCell>
                          <TableCell className="font-sans text-xs text-muted-foreground">{log.ip}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

      </div>

      <AdSlot type="horizontal" className="mt-4" />

      {/* Logo Editor Modal */}
      <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
        <DialogContent className="sm:max-w-md bg-card dark:bg-[#12131c]/90 rounded-3xl p-6 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-fluid-lg font-bold">Crop & Adjust Brand Logo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-5 py-4">
            <p className="text-fluid-xs text-muted-foreground text-center">Drag inside the preview to reposition, and use the zoom slider below.</p>
            <div role="img" aria-label="Logo preview" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp}
              className="w-36 h-36 rounded-3xl bg-muted/40 dark:bg-white/5 border border-border/80 dark:border-white/12 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing touch-none shadow-inner">
              {logo ? <img src={logo} alt="" draggable="false" className="w-full h-full object-cover pointer-events-none" style={{ transform: `scale(${logoZoom}) translate(${logoX}px, ${logoY}px)` }} />
                : <Icon name="monitoring" className="h-8 w-8 text-muted-foreground/50" size={32}/>}
            </div>
            <div className="w-full flex items-center gap-3 px-2">
              <span className="text-xs font-bold text-muted-foreground">Zoom</span>
              <input type="range" min="0.5" max="3" step="0.05" value={logoZoom} onChange={e => setLogoZoom(parseFloat(e.target.value))} className="flex-1 accent-primary" />
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 h-11 rounded-2xl font-bold" onClick={triggerFileInput}>
                <Icon name="upload" className="mr-2 h-4 w-4" size={16}/> Replace
              </Button>
              <Button variant="outline" className="flex-1 h-11 rounded-2xl font-bold text-destructive hover:bg-destructive/10 border-destructive/30" onClick={handleRemoveLogo}>
                <Icon name="delete" className="mr-2 h-4 w-4" size={16}/> Remove
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-11 rounded-2xl font-bold shadow-md" onClick={() => setShowLogoModal(false)}>
              <Icon name="check" className="mr-2 h-4 w-4" size={16}/> Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Modal */}
      <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
        <AlertDialogContent className="rounded-3xl p-6 bg-card dark:bg-[#12131c]/90 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-fluid-lg font-bold">Reset Settings to Defaults?</AlertDialogTitle>
            <AlertDialogDescription className="text-fluid-xs text-muted-foreground">
              This will restore company profile, salary structure, and policies back to factory configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-2xl font-bold" onClick={() => setShowResetModal(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-2xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowResetModal(false); if (addToast) addToast('Settings reset to defaults', 'info') }}>Reset Defaults</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Component Modal */}
      <Dialog open={showAddComponentModal} onOpenChange={setShowAddComponentModal}>
        <DialogContent className="sm:max-w-md bg-card dark:bg-[#12131c]/90 rounded-3xl p-6 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-fluid-lg font-bold">Add Salary Component</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Component Name</label>
              <Input placeholder="e.g. House Rent Allowance" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} className="h-11 rounded-2xl font-semibold"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
              <Select value={newCompType} onChange={setNewCompType}>
                <SelectItem id="earning">Earning (+)</SelectItem>
                <SelectItem id="deduction">Deduction (-)</SelectItem>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Percentage (%)</label>
              <Input type="number" min="0" max="100" placeholder="e.g. 15" value={newCompPercent} onChange={(e) => setNewCompPercent(e.target.value)} className="h-11 rounded-2xl font-bold tabular-nums"/>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 rounded-2xl font-bold" onClick={() => setShowAddComponentModal(false)}>Cancel</Button>
            <Button className="h-11 rounded-2xl font-bold shadow-md" onClick={saveNewComponent} disabled={!newCompName.trim() || !newCompPercent}>Add Component</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Component Alert */}
      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-card dark:bg-[#12131c]/90 border border-border/80 dark:border-white/12 shadow-2xl backdrop-blur-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-fluid-lg font-bold">Delete Salary Component?</AlertDialogTitle>
            <AlertDialogDescription className="text-fluid-xs text-muted-foreground">This action cannot be undone. It will remove this percentage breakdown item from payroll calculations.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-2xl font-bold" onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-2xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (componentToDelete) {
                handleRemoveComponent(componentToDelete)
                setComponentToDelete(null)
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
