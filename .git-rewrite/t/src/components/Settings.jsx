import { useState, useRef, useEffect } from 'react'
import { Save, Settings2, DollarSign, Sliders, Info, Percent, Building2, Bell, Globe, Mail, Plus, Trash2, Upload, Activity, X, ShieldCheck, List, FileSpreadsheet, Download, Receipt, CalendarClock, Check, ChevronDown } from 'lucide-react'
import { useModal } from '../services/useModal.js'
import AdSlot from './AdSlot.jsx'
import { formatDateTime } from '../services/date.js'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"



export default function Settings({ settings, setSettings, addLog, addToast, auditLogs, simulatedRole, syncConflicts, setSyncConflicts }) {
  const [activeSubmenu, setActiveSubmenu] = useState(() => localStorage.getItem('hr_pulse_settings_tab') || null)
  const [panelOpen, setPanelOpen] = useState(false)
  const setTab = (id) => {
    if (activeSubmenu === id && panelOpen) {
      setPanelOpen(false)
    } else {
      setActiveSubmenu(id)
      setPanelOpen(true)
      localStorage.setItem('hr_pulse_settings_tab', id)
    }
  }

  const [auditFilterDate, setAuditFilterDate] = useState('')
  const [auditFilterAction, setAuditFilterAction] = useState('All')

  const [activeSessions] = useState([]) // Sessions will be implemented with real backend auth

  const [currency, setCurrency] = useState(settings.currency || '৳')
  const [salaryStructure, setSalaryStructure] = useState(settings.salaryStructure || [])
  const [expensePolicies, setExpensePolicies] = useState(settings.expensePolicies || { Travel: 500, Meals: 50, 'Office Supplies': 100, Medical: 200, Other: 50 })
  const [companyName, setCompanyName] = useState(settings.company?.name || 'HR Pulse Ltd.')
  const [companyEmail, setCompanyEmail] = useState(settings.company?.email || 'hr@hrpulse.io')
  const [companyWebsite, setCompanyWebsite] = useState(settings.company?.website || 'www.hrpulse.io')
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
  const [shiftTemplates, setShiftTemplates] = useState(settings.shiftTemplates || [])
  const [overtimeRules, setOvertimeRules] = useState(settings.overtimeRules || { multiplierWeekday: 1.5, multiplierWeekend: 2.0 })
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
    if (settings.company?.website) setCompanyWebsite(settings.company.website)
    if (settings.company?.logo) setLogo(settings.company.logo)
    if (settings.company?.logoX !== undefined) setLogoX(settings.company.logoX)
    if (settings.company?.logoY !== undefined) setLogoY(settings.company.logoY)
    if (settings.company?.logoZoom !== undefined) setLogoZoom(settings.company.logoZoom)
    if (settings.notifications) {
      if (settings.notifications.syncAlerts !== undefined) setSyncAlerts(settings.notifications.syncAlerts)
      if (settings.notifications.emailDigests !== undefined) setEmailDigests(settings.notifications.emailDigests)
    }
    if (settings.shiftTemplates) setShiftTemplates(settings.shiftTemplates)
    if (settings.overtimeRules) setOvertimeRules(settings.overtimeRules)
  }, [settings])

  const earningsSum = salaryStructure.filter(s => s.type === 'earning').reduce((a, c) => a + c.percentage, 0)
  const deductionsSum = salaryStructure.filter(s => s.type === 'deduction').reduce((a, c) => a + c.percentage, 0)
  const netPayPercent = earningsSum - deductionsSum
  const totalComponents = earningsSum + deductionsSum
  const isOver100 = earningsSum > 100

  const handleComponentChange = (id, field, value) => {
    setSalaryStructure(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleAddComponent = () => {
    setNewCompName('')
    setNewCompType('earning')
    setNewCompPercent('')
    setShowAddComponentModal(true)
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
        currency, salaryStructure, expensePolicies, shiftTemplates, overtimeRules,
        company: { ...settings.company, name: companyName, email: companyEmail, website: companyWebsite, logo, logoX, logoY, logoZoom },
        notifications: { syncAlerts, emailDigests }
      })
      addLog('Settings Updated', 'Saved system settings and synced configurations with Google Drive', 'success')
      setIsSaving(false)
      if (addToast) addToast("Settings saved successfully and synced to Google Drive!", "success")
      else addLog('Settings Saved', 'Settings saved successfully', 'success')
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

  const menuItems = [
    { id: 'payroll', icon: Sliders, label: 'Payroll Settings' },
    { id: 'company', icon: Building2, label: 'Company Profile' },
    { id: 'expenses', icon: Receipt, label: 'Expense Policies' },
    { id: 'rosters', icon: CalendarClock, label: 'Rosters & Shifts' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'audit', icon: List, label: 'Audit Logs' },
    { id: 'security', icon: ShieldCheck, label: 'Security' },
    { id: 'sync', icon: Activity, label: 'Sync Conflicts', badge: syncConflicts?.length },
  ]

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

  const renderSettingsContent = (id) => {
    switch (id) {
      case 'payroll': return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Currency Setup</CardTitle>
              <CardDescription>Select the currency symbol applied globally across dashboards and receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-[260px]">
                <Select value={currency} onChange={setCurrency} placeholder="$ (USD)">
                  <SelectItem id="$">$ (USD)</SelectItem>
                  <SelectItem id="৳">৳ (BDT)</SelectItem>
                  <SelectItem id="€">€ (EUR)</SelectItem>
                  <SelectItem id="£">£ (GBP)</SelectItem>
                  <SelectItem id="₹">₹ (INR)</SelectItem>
                  <SelectItem id="¥">¥ (JPY)</SelectItem>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center space-y-0">
              <div>
                <CardTitle className="text-lg">Salary Structure</CardTitle>
                <CardDescription>Configure earning and deduction components for your payroll.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddComponent}>
                <Plus className="mr-2 h-4 w-4" /> Add Component
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {isOver100 && (
                <div className="p-3 bg-red-100 text-red-900 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4" /> Component total exceeds 100%. Please adjust before saving.
                </div>
              )}

              <div className="flex flex-col gap-3">
                {salaryStructure.length === 0 ? (
                  <span className="text-sm text-muted-foreground text-center py-4">No components configured.</span>
                ) : (
                  salaryStructure.map(item => (
                    <div key={item.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg">
                      <Input value={item.name} onChange={e => handleComponentChange(item.id, 'name', e.target.value)} placeholder="Component name" className="flex-1 min-w-[120px]" />
                      
                      <div className="flex bg-muted rounded-md p-1">
                        <button onClick={() => handleComponentChange(item.id, 'type', 'earning')}
                          className={`px-3 py-1 text-xs rounded-sm transition-all ${item.type === 'earning' ? 'bg-background shadow-sm text-blue-600 font-medium' : 'text-muted-foreground'}`}>Earning</button>
                        <button onClick={() => handleComponentChange(item.id, 'type', 'deduction')}
                          className={`px-3 py-1 text-xs rounded-sm transition-all ${item.type === 'deduction' ? 'bg-background shadow-sm text-red-600 font-medium' : 'text-muted-foreground'}`}>Deduction</button>
                      </div>

                      <div className="relative w-[80px]">
                        <Input type="number" min="0" max="100" value={item.percentage} onChange={e => handleComponentChange(item.id, 'percentage', Number(e.target.value))} className="pr-6 text-center" />
                        <span className="absolute right-2 top-2.5 text-xs text-muted-foreground pointer-events-none">%</span>
                      </div>

                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" onClick={() => setComponentToDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {salaryStructure.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-lg mt-2">
                  <span className="font-semibold text-sm">Net Earning Ratio</span>
                  <span className={`font-bold text-lg font-mono ${netPayPercent >= 0 ? 'text-foreground' : 'text-red-500'}`}>{netPayPercent}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
      case 'company': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Company Profile Settings</CardTitle>
            </div>
            <CardDescription>Manage public details used to brand generated documents.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Brand Logo</label>
              <div className="flex items-center gap-4">
                <div role="button" tabIndex={0} onClick={() => { if (logo) setShowLogoModal(true); else triggerFileInput() }}
                  className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden hover:bg-muted/50 transition-colors relative">
                  {logo ? <img src={logo} alt="" className="w-full h-full object-cover" style={{ transform: `scale(${logoZoom}) translate(${logoX}px, ${logoY}px)` }} />
                    : <Upload className="h-6 w-6 text-muted-foreground/50" />}
                </div>
                <Button variant="outline" size="sm" onClick={triggerFileInput}>
                  <Upload className="mr-2 h-4 w-4" /> Upload Logo
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Legal Entity Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="HR Pulse Ltd." className="pl-9" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">HR Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="hr@hrpulse.io" className="pl-9" />
                </div>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Company Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="www.hrpulse.io" className="pl-9" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
      case 'notifications': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </div>
            <CardDescription>Enable alerts, sync logs alerts, or background notification parameters.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {[
              { label: 'Enable Real-time Sync Alerts', desc: 'Displays popups when files successfully sync with Google Drive.', val: syncAlerts, set: setSyncAlerts },
              { label: 'Email Monthly Payout Digest', desc: 'Sends a copy of the payroll statements to the HR support inbox.', val: emailDigests, set: setEmailDigests },
            ].map((item, i) => (
              <div key={item.label} className={`py-4 flex justify-between items-center ${i === 0 ? 'border-b border-border' : ''}`}>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </div>
                <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0 ml-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      )
      case 'expenses': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Expense Policies</CardTitle>
            </div>
            <CardDescription>Set maximum reimbursement limits per category.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(expensePolicies).map(cat => (
                <div key={cat} className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">{cat}</label>
                  <Input type="number" value={expensePolicies[cat]} onChange={e => setExpensePolicies(prev => ({ ...prev, [cat]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )
      case 'rosters': return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center space-y-0">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Shift Templates</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShiftTemplates(prev => [...prev, { id: `st-${Date.now()}`, name: 'New Shift', start: '09:00', end: '17:00', break: 60, color: '#333333' }])}>
                <Plus className="mr-2 h-4 w-4" /> Add Shift
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {shiftTemplates.map(t => (
                <div key={t.id} className="flex flex-wrap gap-4 items-end p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="flex-1 min-w-[140px] flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Shift Name</label>
                    <Input value={t.name} onChange={e => setShiftTemplates(prev => prev.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} />
                  </div>
                  <div className="w-[100px] flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Start</label>
                    <Input type="time" value={t.start} onChange={e => setShiftTemplates(prev => prev.map(x => x.id === t.id ? { ...x, start: e.target.value } : x))} />
                  </div>
                  <div className="w-[100px] flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">End</label>
                    <Input type="time" value={t.end} onChange={e => setShiftTemplates(prev => prev.map(x => x.id === t.id ? { ...x, end: e.target.value } : x))} />
                  </div>
                  <div className="w-[80px] flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Break(m)</label>
                    <Input type="number" value={t.break} onChange={e => setShiftTemplates(prev => prev.map(x => x.id === t.id ? { ...x, break: parseInt(e.target.value) || 0 } : x))} />
                  </div>
                  <div className="w-[50px] flex flex-col gap-2">
                    <label className="text-xs font-medium text-transparent uppercase">C</label>
                    <input type="color" value={t.color} onChange={e => setShiftTemplates(prev => prev.map(x => x.id === t.id ? { ...x, color: e.target.value } : x))} className="h-10 w-full p-0 border-0 bg-transparent rounded cursor-pointer" />
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 mb-0.5" onClick={() => setShiftTemplates(prev => prev.filter(x => x.id !== t.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Overtime Rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Weekday Multiplier</label>
                  <Input type="number" step="0.1" value={overtimeRules.multiplierWeekday} onChange={e => setOvertimeRules(prev => ({ ...prev, multiplierWeekday: parseFloat(e.target.value) || 1 }))} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Weekend/Holiday Multiplier</label>
                  <Input type="number" step="0.1" value={overtimeRules.multiplierWeekend} onChange={e => setOvertimeRules(prev => ({ ...prev, multiplierWeekend: parseFloat(e.target.value) || 1 }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
      case 'audit': return (
        <Card>
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Audit Logs</CardTitle>
              </div>
              <CardDescription>Review all system actions for compliance and security.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/40 border border-border rounded-lg">
              <div className="flex-1 min-w-[140px] flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Date</label>
                <Input type="date" value={auditFilterDate} onChange={e => setAuditFilterDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[140px] flex flex-col gap-2">
                <Select label="ACTION TYPE" value={auditFilterAction} onChange={setAuditFilterAction}>
                  <SelectItem id="All">All Actions</SelectItem>
                  <SelectItem id="CREATE">CREATE</SelectItem>
                  <SelectItem id="UPDATE">UPDATE</SelectItem>
                  <SelectItem id="DELETE">DELETE</SelectItem>
                </Select>
              </div>
              <Button variant="ghost" onClick={() => { setAuditFilterDate(''); setAuditFilterAction('All') }}>Clear</Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden mt-2">
              <Table>
                <TableHeader className="bg-muted/50">
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
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No logs found for selected filters.</TableCell></TableRow>
                  ) : (
                    (auditLogs || []).filter(l => {
                      if (auditFilterAction !== 'All' && l.action !== auditFilterAction) return false
                      if (auditFilterDate && !l.timestamp.startsWith(auditFilterDate)) return false
                      return true
                    }).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell className="font-medium text-sm">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant={log.action === 'CREATE' ? 'default' : log.action === 'UPDATE' ? 'secondary' : log.action === 'DELETE' ? 'destructive' : 'outline'} className={`${log.action==='CREATE'?'bg-green-500 hover:bg-green-600':log.action==='UPDATE'?'bg-blue-500 text-white hover:bg-blue-600':''}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] break-words">{log.details}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
      case 'security': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Session Management</CardTitle>
            </div>
            <CardDescription>Review devices currently logged into your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {activeSessions.length === 0 ? (
               <div className="text-center text-muted-foreground py-8 border border-border rounded-lg border-dashed">No active sessions tracked locally.</div>
            ) : (
              activeSessions.map(sess => (
                <div key={sess.id} className="p-4 bg-muted/30 border border-border rounded-lg flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{sess.device}</span>
                      {sess.current && <Badge className="bg-green-500 hover:bg-green-600">This Device</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{sess.location}</span><span>•</span><span>{sess.time}</span><span>•</span><span>{sess.ip}</span>
                    </div>
                  </div>
                  {!sess.current && (
                    <Button variant="outline" size="sm" onClick={() => { if (addToast) addToast("Session terminated", "success") }}>Sign Out</Button>
                  )}
                </div>
              ))
            )}
            
            {activeSessions.length > 1 && (
              <div className="flex justify-end mt-2">
                <Button onClick={() => { if (addToast) addToast("All other devices signed out", "success") }}>
                  Sign out all other devices
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )
      case 'sync': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Sync Conflicts</CardTitle>
            </div>
            <CardDescription>Review and resolve data conflicts between local and remote databases.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Local Value</TableHead>
                    <TableHead>Remote Value</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!syncConflicts || syncConflicts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sync conflicts detected.</TableCell></TableRow>
                  ) : (
                    syncConflicts.map((conflict, i) => (
                      <TableRow key={`${conflict.file}-${conflict.recordId}`}>
                        <TableCell className="font-medium">{conflict.file}</TableCell>
                        <TableCell>{conflict.recordId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] break-words">{JSON.stringify(conflict.localValue)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] break-words">{JSON.stringify(conflict.remoteValue)}</TableCell>
                        <TableCell className="text-xs">{conflict.resolution}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" onClick={() => { setSyncConflicts(prev => prev.filter((_, idx) => idx !== i)); if (addToast) addToast("Conflict acknowledged", "success") }}>
                            Acknowledge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden flex flex-col gap-4">
              {!syncConflicts || syncConflicts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border border-border rounded-lg border-dashed">No sync conflicts detected.</div>
              ) : (
                syncConflicts.map((conflict, i) => (
                  <div key={`${conflict.file}-${conflict.recordId}-mobile`} className="flex flex-col gap-3 p-4 bg-muted/20 border border-border rounded-lg">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{conflict.file}</div>
                        <div className="text-xs text-muted-foreground">ID: {conflict.recordId}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase whitespace-nowrap">{conflict.resolution}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <div className="bg-background rounded-md p-2.5 border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Local Value</span>
                        <div className="text-xs break-words font-mono text-muted-foreground">{JSON.stringify(conflict.localValue)}</div>
                      </div>
                      <div className="bg-background rounded-md p-2.5 border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Remote Value</span>
                        <div className="text-xs break-words font-mono text-muted-foreground">{JSON.stringify(conflict.remoteValue)}</div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => { setSyncConflicts(prev => prev.filter((_, idx) => idx !== i)); if (addToast) addToast("Conflict acknowledged", "success") }}>
                      Acknowledge
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )
      default: return null
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Settings2 size={20} className="text-primary" />
          System Settings
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowResetModal(true)}>Reset Defaults</Button>
          <Button onClick={handleSave} disabled={isSaving || isOver100}>
            {isSaving ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
      <div className="border-t border-border" />

      <div className="flex flex-col gap-4">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = activeSubmenu === item.id && panelOpen
          return (
            <Card key={item.id} className={`overflow-hidden transition-all duration-200 shadow-xs border-border ${isActive ? 'ring-1 ring-primary/20' : ''}`}>
              <button 
                onClick={() => setTab(item.id)}
                className="w-full flex items-center justify-between p-4 md:p-5 bg-card hover:bg-muted/50 transition-colors border-0 outline-none cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`font-semibold text-base transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <Badge variant={isActive ? 'default' : 'secondary'} className="ml-2">{item.badge}</Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="p-4 md:p-6 border-t border-border bg-muted/10 flex flex-col gap-6">
                    {isActive && renderSettingsContent(item.id)}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <AdSlot type="horizontal" className="mt-4" />

      {/* Logo Editor Modal */}
      <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Brand Logo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <p className="text-sm text-muted-foreground text-center">Drag the image to reposition it, or use the slider below to zoom.</p>
            <div role="img" aria-label="Logo preview" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp}
              className="w-32 h-32 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing touch-none">
              {logo ? <img src={logo} alt="" draggable="false" className="w-full h-full object-cover pointer-events-none" style={{ transform: `scale(${logoZoom}) translate(${logoX}px, ${logoY}px)` }} />
                : <Activity className="h-8 w-8 text-muted-foreground/50" />}
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Zoom</span>
              <input type="range" min="0.5" max="3" step="0.05" value={logoZoom} onChange={e => setLogoZoom(parseFloat(e.target.value))} className="flex-1 accent-primary" />
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={triggerFileInput}>
                <Upload className="mr-2 h-4 w-4" /> Replace
              </Button>
              <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200" onClick={handleRemoveLogo}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setShowLogoModal(false)}>
              <Check className="mr-2 h-4 w-4" /> Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Modal */}
      <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Settings?</AlertDialogTitle>
            <AlertDialogDescription>This will reset all settings in the active tab to their default values.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetModal(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowResetModal(false); if (addToast) addToast('Settings reset to defaults', 'info') }}>Reset Defaults</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Component Modal */}
      <Dialog open={showAddComponentModal} onOpenChange={setShowAddComponentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Salary Component</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Component Name</label>
              <Input placeholder="e.g. House Rent" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Type</label>
              <Select value={newCompType} onChange={setNewCompType}>
                <SelectItem id="earning">Earning</SelectItem>
                <SelectItem id="deduction">Deduction</SelectItem>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Percentage (%)</label>
              <Input type="number" min="0" max="100" placeholder="e.g. 10" value={newCompPercent} onChange={(e) => setNewCompPercent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddComponentModal(false)}>Cancel</Button>
            <Button onClick={saveNewComponent} disabled={!newCompName.trim() || !newCompPercent}>Add Component</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Component Alert */}
      <AlertDialog open={!!componentToDelete} onOpenChange={(open) => !open && setComponentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently remove the salary component.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (componentToDelete) {
                handleRemoveComponent(componentToDelete)
                setComponentToDelete(null)
              }
            }} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
