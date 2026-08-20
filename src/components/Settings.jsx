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
import { requestPushPermission, showSystemNotification, getPushPermission } from "../services/pushNotifications.js"
import { sendTestPush, isFcmAvailable } from "../services/fcm.js"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

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
  const [companyWebsite, setCompanyWebsite] = useState(settings.company?.website || 'www.kormiis.io')
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
  const [isPushTesting, setIsPushTesting] = useState(false)
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

  const handleSave = () => {
    setIsSaving(true)
    Promise.resolve().then(() => {
      setSettings({
        ...settings,
        currency, salaryStructure, expensePolicies,
        company: { ...settings?.company, name: companyName, email: companyEmail, phone: companyPhone, website: companyWebsite, logo, logoX, logoY, logoZoom },
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
        className="h-10 rounded-2xl font-bold px-6 shadow-md shadow-primary/20 transition-all active:scale-95"
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
        <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
          <Icon name="settings" size={22}/>
        </div>
        <h1 className="text-fluid-xl font-extrabold tracking-tight headline-gradient">
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
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="apartment" size={22}/>
              </div>
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
                      placeholder="www.kormiis.io" 
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
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="account_balance" size={22}/>
              </div>
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
                    <SelectItem id="$">$ (USD - United States Dollar)</SelectItem>
                    <SelectItem id="৳">৳ (BDT - Bangladeshi Taka)</SelectItem>
                    <SelectItem id="€">€ (EUR - Euro)</SelectItem>
                    <SelectItem id="£">£ (GBP - British Pound)</SelectItem>
                    <SelectItem id="₹">₹ (INR - Indian Rupee)</SelectItem>
                    <SelectItem id="¥">¥ (JPY - Japanese Yen)</SelectItem>
                    <SelectItem id="AED">AED (United Arab Emirates Dirham)</SelectItem>
                    <SelectItem id="SAR">SAR (Saudi Riyal)</SelectItem>
                    <SelectItem id="SGD">SGD (Singapore Dollar)</SelectItem>
                    <SelectItem id="CAD">CAD (Canadian Dollar)</SelectItem>
                    <SelectItem id="AUD">AUD (Australian Dollar)</SelectItem>
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
              <div className="size-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="wallet" size={22}/>
              </div>
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
              <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="notifications_active" size={22}/>
              </div>
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
                    <span className="text-fluid-xs text-muted-foreground">Displays toast notifications when offline queue finishes syncing to Firestore.</span>
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

                <div className="py-3.5 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-foreground">Browser Push Notifications</span>
                    <span className="text-fluid-xs text-muted-foreground">Displays system-level banners for new announcements and clock-in reminders.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={pushEnabled} 
                    onChange={e => setPushEnabled(e.target.checked)} 
                    className="h-5 w-5 rounded-lg accent-primary cursor-pointer shrink-0 ml-4" 
                  />
                </div>
              </div>

              {/* Push Diagnostics */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border/40 dark:border-white/8 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground">Browser Permission: </span>
                    <span className={`text-xs font-semibold ${pushPermission === 'granted' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {pushPermission === 'granted' ? 'Granted' : 'Pending / Not Enabled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pushPermission !== 'granted' && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        const res = await requestPushPermission()
                        setPushPermission(res)
                        if (res === 'granted' && addToast) addToast('Push notifications enabled.', 'success')
                      }} className="h-9 rounded-xl text-xs font-bold">
                        Enable Permission
                      </Button>
                    )}
                    <Button variant="outline" size="sm" disabled={isPushTesting} onClick={async () => {
                      setIsPushTesting(true)
                      const fcmRes = await sendTestPush()
                      if (fcmRes.ok) {
                        if (addToast) addToast('Test push alert triggered.', 'success')
                      } else {
                        await showSystemNotification({ title: 'Kormiis Test Alert', body: 'Push notifications are working properly! 🎉', url: '' })
                        if (addToast) addToast('Test notification sent.', 'success')
                      }
                      setIsPushTesting(false)
                    }} className="h-9 rounded-xl text-xs font-bold gap-1.5">
                      <Icon name="send" size={14}/> Send Test Alert
                    </Button>
                  </div>
                </div>

                {pushEnabled && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 text-xs text-muted-foreground">
                    <Icon name={isFcmAvailable() ? 'cloud_done' : 'cloud_off'} size={16} className={isFcmAvailable() ? 'text-emerald-500' : 'text-amber-500'} />
                    <span>{isFcmAvailable() ? 'Firebase Cloud Messaging online.' : 'Web push channel active on this device.'}</span>
                  </div>
                )}
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
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="verified_user" size={22}/>
              </div>
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
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <Icon name="laptop_mac" size={22}/>
                    </div>
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
                        <div className={`p-2.5 rounded-2xl ${device.isBlocked ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          <Icon name={isMobile ? 'smartphone' : 'computer'} size={22}/>
                        </div>
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
              <div className="size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="list" size={22}/>
              </div>
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
