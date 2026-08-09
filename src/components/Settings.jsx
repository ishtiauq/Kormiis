import { useState, useRef, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { useModal } from '../services/useModal.js'
import AdSlot from './AdSlot.jsx'
import { formatDateTime } from '../services/date.js'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"



function LocationMarker({ position, setPosition }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && position.lat && position.lng) {
      map.flyTo(position, map.getZoom());
    }
  }, [position.lat, position.lng, map]);

  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return position === null ? null : (
    <Marker position={position}></Marker>
  )
}

export default function Settings({ settings, setSettings, addLog, addToast, auditLogs, themeMode, toggleTheme }) {
  const [activeSubmenu, setActiveSubmenu] = useState(() => localStorage.getItem('kormiis_settings_tab') || null)
  const [panelOpen, setPanelOpen] = useState(false)
  const setTab = (id) => {
    if (activeSubmenu === id && panelOpen) {
      setPanelOpen(false)
    } else {
      setActiveSubmenu(id)
      setPanelOpen(true)
      localStorage.setItem('kormiis_settings_tab', id)
    }
  }

  const [auditFilterDate, setAuditFilterDate] = useState('')
  const [auditFilterAction, setAuditFilterAction] = useState('All')

  const [activeSessions] = useState([]) // Sessions will be implemented with real backend auth

  const [currency, setCurrency] = useState(settings.currency || 'à§³')
  const [salaryStructure, setSalaryStructure] = useState(settings.salaryStructure || [])
  const [expensePolicies, setExpensePolicies] = useState(settings.expensePolicies || { Travel: 500, Meals: 50, 'Office Supplies': 100, Medical: 200, Other: 50 })
  const [leavePolicies, setLeavePolicies] = useState(settings.leavePolicies || { Annual: 14, Sick: 7, Casual: 3, Unpaid: 0 })
  const [companyName, setCompanyName] = useState(settings.company?.name || 'Kormiis Ltd.')
  const [companyEmail, setCompanyEmail] = useState(settings.company?.email || 'hr@kormiis.io')
  const [companyWebsite, setCompanyWebsite] = useState(settings.company?.website || 'www.kormiis.io')
  const [logo, setLogo] = useState(settings.company?.logo || '')
  const [logoX, setLogoX] = useState(settings.company?.logoX || 0)
  const [logoY, setLogoY] = useState(settings.company?.logoY || 0)
  const [logoZoom, setLogoZoom] = useState(settings.company?.logoZoom || 1)
  
  const [officeLocation, setOfficeLocation] = useState(settings.officeLocation || { lat: 23.8103, lng: 90.4125, radius: 100 })
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [isMapSearching, setIsMapSearching] = useState(false)

  const handleMapSearch = async (e) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    setIsMapSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setOfficeLocation({ ...officeLocation, lat, lng: lon });
      } else {
        if (addToast) addToast('Location not found. Try a different search term.', 'error');
      }
    } catch (err) {
      if (addToast) addToast('Error searching for location.', 'error');
    } finally {
      setIsMapSearching(false);
    }
  }

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
  const [leaveTypeToDelete, setLeaveTypeToDelete] = useState(null)
  useModal(() => setLeaveTypeToDelete(null))

  const [showAddComponentModal, setShowAddComponentModal] = useState(false)
  const [newCompName, setNewCompName] = useState('')
  const [newCompType, setNewCompType] = useState('earning')
  const [newCompPercent, setNewCompPercent] = useState('')
  useModal(() => setShowAddComponentModal(false))

  useEffect(() => {
    if (settings.currency && settings.currency !== currency) setCurrency(settings.currency)
    if (settings.salaryStructure) setSalaryStructure(settings.salaryStructure)
    if (settings.expensePolicies) setExpensePolicies(settings.expensePolicies)
    if (settings.leavePolicies) setLeavePolicies(settings.leavePolicies)
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
        currency, salaryStructure, expensePolicies, leavePolicies, shiftTemplates, overtimeRules, officeLocation,
        company: { ...settings.company, name: companyName, email: companyEmail, website: companyWebsite, logo, logoX, logoY, logoZoom },
        notifications: { syncAlerts, emailDigests }
      })
      addLog('Settings Updated', 'Saved system settings and synced configurations', 'success')
      setIsSaving(false)
      if (addToast) addToast("Settings saved successfully!", "success")
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
    { id: 'theme', icon: <Icon name="light_mode" size={20}/>, label: 'Appearance & Theme' },
    { id: 'payroll', icon: <Icon name="account_balance" size={20}/>, label: 'Payroll Settings' },
    { id: 'company', icon: <Icon name="apartment" size={20}/>, label: 'Company Profile' },
    { id: 'attendance', icon: <Icon name="pin_drop" size={20}/>, label: 'Attendance & Leaves' },
    { id: 'expenses', icon: <Icon name="wallet" size={20}/>, label: 'Expense Policies' },
    { id: 'rosters', icon: <Icon name="calendar_clock" size={20}/>, label: 'Rosters & Shifts' },
    { id: 'notifications', icon: <Icon name="notifications_active" size={20}/>, label: 'Notifications' },
    { id: 'audit', icon: <Icon name="list" size={20}/>, label: 'Audit Logs' },
    { id: 'security', icon: <Icon name="verified_user" size={20}/>, label: 'Security' },
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
      case 'theme': return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {themeMode === 'dark' ? <Icon name="dark_mode" className="h-5 w-5 text-muted-foreground" size={20}/> : <Icon name="light_mode" className="h-5 w-5 text-muted-foreground" size={20}/>}
                <CardTitle className="text-lg">Theme</CardTitle>
              </div>
              <CardDescription>Choose between light and dark mode for the entire application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex bg-muted rounded-lg p-1 max-w-[280px]">
                <button
                  onClick={() => { if (themeMode !== 'light') toggleTheme() }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all cursor-pointer border-0 ${themeMode === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon name="light_mode" size={16}/> Light
                </button>
                <button
                  onClick={() => { if (themeMode !== 'dark') toggleTheme() }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all cursor-pointer border-0 ${themeMode === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon name="dark_mode" size={16}/> Dark
                </button>
              </div>
              <p className="text-fluid-xs text-muted-foreground mt-3">Applies instantly across all portals.</p>
            </CardContent>
          </Card>
        </div>
      )
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
                  <SelectItem id="à§³">à§³ (BDT)</SelectItem>
                  <SelectItem id="â‚¬">â‚¬ (EUR)</SelectItem>
                  <SelectItem id="Â£">Â£ (GBP)</SelectItem>
                  <SelectItem id="â‚¹">â‚¹ (INR)</SelectItem>
                  <SelectItem id="Â¥">Â¥ (JPY)</SelectItem>
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
                <Icon name="add" className="mr-2 h-4 w-4" size={16}/> Add Component
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {isOver100 && (
                <div className="p-3 bg-red-100 text-red-900 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                  <Icon name="info" className="h-4 w-4" size={16}/> Component total exceeds 100%. Please adjust before saving.
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
                        <Icon name="delete" className="h-4 w-4" size={16}/>
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {salaryStructure.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-lg mt-2">
                  <span className="font-semibold text-sm">Net Earning Ratio</span>
                  <span className={`font-bold text-fluid-lg font-sans ${netPayPercent >= 0 ? 'text-foreground' : 'text-red-500'}`}>{netPayPercent}%</span>
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
              <Icon name="apartment" className="h-5 w-5 text-muted-foreground" size={20}/>
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
                    : <Icon name="upload" className="h-6 w-6 text-muted-foreground/50" size={24}/>}
                </div>
                <Button variant="outline" size="sm" onClick={triggerFileInput}>
                  <Icon name="upload" className="mr-2 h-4 w-4" size={16}/> Upload Logo
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Legal Entity Name</label>
                <div className="relative">
                  <Icon name="apartment" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" size={16}/>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Kormiis Ltd." className="pl-9" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">HR Support Email</label>
                <div className="relative">
                  <Icon name="mail" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" size={16}/>
                  <Input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="hr@kormiis.io" className="pl-9" />
                </div>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Company Website URL</label>
                <div className="relative">
                  <Icon name="language" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" size={16}/>
                  <Input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="www.kormiis.io" className="pl-9" />
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
              <Icon name="notifications_active" className="h-5 w-5 text-muted-foreground" size={20}/>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </div>
            <CardDescription>Enable alerts, sync logs alerts, or background notification parameters.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {[
              { label: 'Enable Real-time Sync Alerts', desc: 'Displays popups when data changes sync successfully.', val: syncAlerts, set: setSyncAlerts },
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
      case 'attendance': return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon name="pin_drop" className="h-5 w-5 text-muted-foreground" size={20}/>
                <CardTitle className="text-lg">Office Location Settings</CardTitle>
              </div>
              <CardDescription>Set the central GPS coordinates and check-in radius for your office.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Latitude</label>
                  <Input type="number" step="any" value={officeLocation.lat} onChange={e => setOfficeLocation({...officeLocation, lat: parseFloat(e.target.value)})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Longitude</label>
                  <Input type="number" step="any" value={officeLocation.lng} onChange={e => setOfficeLocation({...officeLocation, lng: parseFloat(e.target.value)})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Radius (meters)</label>
                  <Input type="number" value={officeLocation.radius} onChange={e => setOfficeLocation({...officeLocation, radius: parseInt(e.target.value, 10)})} />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Interactive Map Picker</label>
                
                <form onSubmit={handleMapSearch} className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" size={16}/>
                    <Input 
                      placeholder="Search for a city, building, or address..." 
                      className="pl-9"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isMapSearching} variant="secondary">
                    {isMapSearching ? <Icon name="monitoring" className="h-4 w-4 animate-spin" size={16}/> : 'Search'}
                  </Button>
                </form>

                <div className="h-[400px] w-full rounded-xl overflow-hidden border border-border shadow-sm z-0 relative" style={{ zIndex: 0 }}>
                  <MapContainer center={[officeLocation.lat, officeLocation.lng]} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker 
                      position={{lat: officeLocation.lat, lng: officeLocation.lng}} 
                      setPosition={(pos) => setOfficeLocation({...officeLocation, lat: pos.lat, lng: pos.lng})} 
                    />
                  </MapContainer>
                </div>
                <p className="text-fluid-xs text-muted-foreground mt-1 text-center">Click anywhere on the map to set your office location pin.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon name="calendar_clock" className="h-5 w-5 text-muted-foreground" size={20}/>
                <CardTitle className="text-lg">Leave Types & Balances</CardTitle>
              </div>
              <CardDescription>Determine what leaves the company provides and the default yearly allowance for each.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(leavePolicies).map(([type, days]) => (
                  <div key={type} className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border">
                    <Input 
                      className="flex-1 font-semibold" 
                      value={type} 
                      onChange={e => {
                        const newPolicies = { ...leavePolicies }
                        const oldDays = newPolicies[type]
                        delete newPolicies[type]
                        newPolicies[e.target.value] = oldDays
                        setLeavePolicies(newPolicies)
                      }}
                      placeholder="Leave Name (e.g. Annual)"
                    />
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        className="w-[100px]" 
                        value={days} 
                        onChange={e => setLeavePolicies({ ...leavePolicies, [type]: parseInt(e.target.value, 10) || 0 })}
                        placeholder="Days"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => setLeaveTypeToDelete(type)}
                    >
                      <Icon name="delete" className="h-4 w-4" size={16}/>
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-dashed border-2 hover:border-primary hover:text-primary transition-colors bg-transparent"
                  onClick={() => setLeavePolicies({ ...leavePolicies, [`New Leave ${Date.now()}`]: 0 })}
                >
                  <Icon name="add" className="mr-2 h-4 w-4" size={16}/> Add Leave Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
      case 'expenses': return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="wallet" className="h-5 w-5 text-muted-foreground" size={20}/>
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
                <Icon name="calendar_clock" className="h-5 w-5 text-muted-foreground" size={20}/>
                <CardTitle className="text-lg">Shift Templates</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShiftTemplates(prev => [...prev, { id: `st-${Date.now()}`, name: 'New Shift', start: '09:00', end: '17:00', break: 60, color: '#333333' }])}>
                <Icon name="add" className="mr-2 h-4 w-4" size={16}/> Add Shift
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
                    <Icon name="delete" className="h-4 w-4" size={16}/>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon name="monitoring" className="h-5 w-5 text-muted-foreground" size={20}/>
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
                <Icon name="list" className="h-5 w-5 text-muted-foreground" size={20}/>
                <CardTitle className="text-lg">Audit Logs</CardTitle>
              </div>
              <CardDescription>Review all system actions for compliance and security.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Icon name="download" className="mr-2 h-4 w-4" size={16}/> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/40 border border-border rounded-lg">
              <div className="flex-1 min-w-[140px] flex flex-col gap-2">
                <DatePicker label="Date" value={auditFilterDate} onChange={e => setAuditFilterDate(e.target.value)} />
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
                        <TableCell className="font-sans text-xs">{formatDateTime(log.timestamp)}</TableCell>
                        <TableCell className="font-medium text-sm">{log.user}</TableCell>
                        <TableCell>
                          <Badge variant={log.action === 'CREATE' ? 'default' : log.action === 'UPDATE' ? 'secondary' : log.action === 'DELETE' ? 'destructive' : 'outline'} className={`${log.action==='CREATE'?'bg-green-500 hover:bg-green-600':log.action==='UPDATE'?'bg-blue-500 text-white hover:bg-blue-600':''}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] break-words">{log.details}</TableCell>
                        <TableCell className="font-sans text-xs text-muted-foreground">{log.ip}</TableCell>
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
              <Icon name="verified_user" className="h-5 w-5 text-muted-foreground" size={20}/>
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
                      <span>{sess.location}</span><span>â€¢</span><span>{sess.time}</span><span>â€¢</span><span>{sess.ip}</span>
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
      default: return null
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="settings" className="text-foreground" size={20}/>
          Settings
        </h1>
      </div>
      <div className="border-t border-border border-headline" />

      <div className="flex flex-col gap-4">
        {menuItems.map(item => {
          const isActive = activeSubmenu === item.id && panelOpen
          return (
            <Card key={item.id} className={`overflow-hidden transition-all duration-200 shadow-xs border-border ${isActive ? 'ring-1 ring-primary/20' : ''}`}>
              <button 
                onClick={() => setTab(item.id)}
                className="w-full flex items-center justify-between p-4 md:p-5 bg-card hover:bg-muted/50 transition-colors border-0 outline-none cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                    {item.icon}
                  </div>
                  <span className={`font-semibold text-base transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <Badge variant={isActive ? 'default' : 'secondary'} className="ml-2">{item.badge}</Badge>
                  )}
                </div>
                <Icon name="keyboard_arrow_down" className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} size={20}/>
              </button>
              
              <div className={`grid transition-all duration-300 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="p-4 md:p-6 border-t border-border bg-muted/10 flex flex-col gap-6">
                    {isActive && renderSettingsContent(item.id)}
                    
                    {isActive && ['payroll', 'company', 'attendance', 'expenses', 'rosters', 'notifications'].includes(item.id) && (
                      <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border/50">
                        <Button variant="ghost" onClick={() => setShowResetModal(true)}>Reset Defaults</Button>
                        <Button onClick={handleSave} disabled={isSaving || (item.id === 'payroll' && isOver100)}>
                          {isSaving ? <Icon name="monitoring" className="mr-2 h-4 w-4 animate-spin" size={16}/> : <Icon name="save" className="mr-2 h-4 w-4" size={16}/>}
                          {isSaving ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </div>
                    )}
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
            <p className="text-fluid-sm text-muted-foreground text-center">Drag the image to reposition it, or use the slider below to zoom.</p>
            <div role="img" aria-label="Logo preview" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp}
              className="w-32 h-32 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing touch-none">
              {logo ? <img src={logo} alt="" draggable="false" className="w-full h-full object-cover pointer-events-none" style={{ transform: `scale(${logoZoom}) translate(${logoX}px, ${logoY}px)` }} />
                : <Icon name="monitoring" className="h-8 w-8 text-muted-foreground/50" size={32}/>}
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Zoom</span>
              <input type="range" min="0.5" max="3" step="0.05" value={logoZoom} onChange={e => setLogoZoom(parseFloat(e.target.value))} className="flex-1 accent-primary" />
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={triggerFileInput}>
                <Icon name="upload" className="mr-2 h-4 w-4" size={16}/> Replace
              </Button>
              <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200" onClick={handleRemoveLogo}>
                <Icon name="delete" className="mr-2 h-4 w-4" size={16}/> Remove
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setShowLogoModal(false)}>
              <Icon name="check" className="mr-2 h-4 w-4" size={16}/> Done
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
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Leave Type Modal */}
      <AlertDialog open={!!leaveTypeToDelete} onOpenChange={(open) => !open && setLeaveTypeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete the <strong>{leaveTypeToDelete}</strong> leave type? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaveTypeToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (leaveTypeToDelete) {
                const newPolicies = { ...leavePolicies }
                delete newPolicies[leaveTypeToDelete]
                setLeavePolicies(newPolicies)
                if (addToast) addToast(`Deleted ${leaveTypeToDelete} leave`, "success")
              }
              setLeaveTypeToDelete(null)
            }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
