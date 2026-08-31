import { useState, useEffect } from 'react'
import { Home, Calendar as CalendarIcon, FileText, User as UserIcon, Plus, Send, Download, CheckCircle2, XCircle, Clock, AlertCircle, User, Megaphone, MessageSquare, Heart, ThumbsUp, PartyPopper, Monitor, Sun, Moon, AlertTriangle, Upload, CheckSquare, CalendarDays } from 'lucide-react'
import { useModal } from '../services/useModal.js'
import { formatDate, formatDateShort, formatDateTime, formatMonthYear, formatDateWithWeekday } from '../services/date.js'
import { Select, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import Tasks from './Tasks.jsx'
import Calendar from './Calendar.jsx'

// Dummy profile image generation based on initials
const getInitialsAvatar = (name) => {
  const parts = name.split(' ')
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]
  
  // Deterministic color
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

export default function EmployeePortal({ 
  currentUser,
  themeMode,
  toggleTheme,
  employees, 
  attendance, 
  payroll, 
  expenses, 
  addLog, 
  addToast, 
  setAttendance, 
  pendingProfileEdits, 
  setPendingProfileEdits,
  setExpenses,
  roster,
  shiftSwaps,
  setShiftSwaps,
  shiftTemplates,
  overtimeClaims,
  setOvertimeClaims,
  announcements,
  setAnnouncements,
  assets,
  setAssets,
  assetRequests,
  setAssetRequests,
  settings,
  simulatedRole,
  setSimulatedRole
}) {
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, attendance, payslips, leave, profile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showPunchModal, setShowPunchModal] = useState(false)
  useModal(() => setShowPunchModal(false))
  const [punchType, setPunchType] = useState('In')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePunchSubmit = () => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    const todayLogs = attendance?.dailyLogs?.[today] || {}
    const myLog = todayLogs[currentUser.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
    
    let updatedLog = { ...myLog }
    if (punchType === 'In') {
      updatedLog.status = 'Present'
      updatedLog.checkIn = nowTime
    } else {
      updatedLog.checkOut = nowTime
      if (updatedLog.checkIn !== '--') {
        updatedLog.hours = '9.0'
      }
    }
    
    const newLogs = {
      ...attendance.dailyLogs,
      [today]: {
        ...todayLogs,
        [currentUser.id]: updatedLog
      }
    }
    
    setAttendance(prev => ({
      ...prev,
      dailyLogs: newLogs
    }))
    
    setShowPunchModal(false)
    addToast(`Successfully clocked ${punchType.toLowerCase()} at ${nowTime}.`, 'success')
  }

  if (!currentUser) {
    return <div className="p-5">Loading portal...</div>
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView currentUser={currentUser} attendance={attendance} expenses={expenses} announcements={announcements} setActiveTab={setActiveTab} setShowPunchModal={setShowPunchModal} />
      case 'attendance':
        return <AttendanceView 
                 currentUser={currentUser} 
                 employees={employees}
                 attendance={attendance} 
                 roster={roster}
                 shiftSwaps={shiftSwaps}
                 setShiftSwaps={setShiftSwaps}
                 shiftTemplates={shiftTemplates}
                 overtimeClaims={overtimeClaims}
                 setOvertimeClaims={setOvertimeClaims}
                 settings={settings}
                 addToast={addToast} 
               />
      case 'announcements':
        return <AnnouncementsFeedView 
                 currentUser={currentUser} 
                 employees={employees} 
                 announcements={announcements} 
                 setAnnouncements={setAnnouncements} 
                 addToast={addToast} 
               />
      case 'payslips':
        return <PayslipsView currentUser={currentUser} payroll={payroll} addToast={addToast} />
      case 'leave':
        return <LeaveView currentUser={currentUser} attendance={attendance} setAttendance={setAttendance} addToast={addToast} addLog={addLog} />
      case 'profile':
        return <ProfileView currentUser={currentUser} pendingProfileEdits={pendingProfileEdits} setPendingProfileEdits={setPendingProfileEdits} addToast={addToast} addLog={addLog} />
      case 'my-assets':
        return <MyAssetsView
                 currentUser={currentUser}
                 assets={assets}
                 setAssets={setAssets}
                 assetRequests={assetRequests}
                 setAssetRequests={setAssetRequests}
                 addToast={addToast}
               />
      case 'my-tasks':
        return <div className="max-w-[1200px] mx-auto w-full"><Tasks tasks={tasks} setTasks={setTasks} employees={employees} currentUser={currentUser} addToast={addToast} simulatedRole="Employee" addLog={addLog} /></div>
      case 'events':
        return <div className="max-w-[1200px] mx-auto w-full"><Calendar events={events} setEvents={setEvents} employees={employees} addLog={addLog} addToast={addToast} currentUser={currentUser} simulatedRole="Employee" /></div>
      default:
        return <DashboardView currentUser={currentUser} attendance={attendance} expenses={expenses} announcements={announcements} tasks={tasks} events={events} setActiveTab={setActiveTab} setShowPunchModal={setShowPunchModal} />
    }
  }

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'my-tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'events', icon: CalendarDays, label: 'Events' },
    { id: 'announcements', icon: Megaphone, label: 'Feed' },
    { id: 'my-assets', icon: Monitor, label: 'Assets' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'payslips', icon: FileText, label: 'Payslips' },
    { id: 'leave', icon: CalendarIcon, label: 'Leave' },
    { id: 'profile', icon: UserIcon, label: 'Profile' }
  ]

  return (
    <div className={`flex h-full w-full overflow-hidden bg-background ${isMobile ? 'flex-col' : 'flex-row'}`}>
      
      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <div className="w-[250px] flex flex-col px-4 py-6 bg-muted/20 border-r border-border">
          <div className="mb-8 px-3">
            <h2 className="text-2xl font-extrabold text-primary m-0">HR Pulse <span className="text-xs text-muted-foreground">ESS</span></h2>
          </div>
          <nav className="flex flex-col gap-2" role="tablist">
            {navItems.map(item => {
              const active = activeTab === item.id
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full justify-start ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground font-medium'}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className={`mr-2 h-4 w-4 ${active ? 'text-primary' : ''}`} />
                  {item.label}
                </Button>
              )
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start text-muted-foreground font-medium" title={`Theme: ${themeMode}`}>
              {themeMode === 'system' ? <Monitor className="mr-2 h-4 w-4" /> : themeMode === 'light' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Theme: {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
            </Button>
            {!currentUser.isEmployee && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-muted-foreground"
                onClick={() => setSimulatedRole('Admin')}
              >
                ← Back to Admin
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8 bg-background">
        {renderContent()}
      </div>

      {/* Bottom Tab Bar (Mobile) */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center px-2 py-3 z-[100] bg-background/80 backdrop-blur-md border-t border-border">
          {navItems.map(item => {
            const active = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(item.id) } }}
                className={`flex flex-col items-center justify-center gap-1 border-0 cursor-pointer flex-1 min-h-[44px] p-1.5 bg-transparent ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Icon size={20} />
                <span className={`text-[0.65rem] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {isMobile && (
        <div className="fixed top-3 right-3 z-[101] flex gap-2">
          <Button 
            variant="outline"
            size="icon"
            className="rounded-full shadow-sm bg-background/80 backdrop-blur-md h-8 w-8 text-muted-foreground"
            onClick={toggleTheme}
          >
            {themeMode === 'system' ? <Monitor size={14} /> : themeMode === 'light' ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
          {!currentUser.isEmployee && (
            <Button 
              variant="outline"
              size="sm"
              className="rounded-full shadow-sm bg-background/80 backdrop-blur-md h-8"
              onClick={() => setSimulatedRole('Admin')}
            >
              ← Admin
            </Button>
          )}
        </div>
      )}

      {/* Punch Modal */}
      <Dialog open={showPunchModal} onOpenChange={setShowPunchModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Attendance Punch</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select punch type for today (<strong>{formatDate(new Date().toISOString().split('T')[0])}</strong>):
            </p>
            <div className="flex gap-3">
              <Button 
                variant={punchType === 'In' ? 'default' : 'outline'}
                className="flex-1" 
                onClick={() => setPunchType('In')}
              >
                Clock In
              </Button>
              <Button 
                variant={punchType === 'Out' ? 'default' : 'outline'}
                className="flex-1" 
                onClick={() => setPunchType('Out')}
              >
                Clock Out
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchModal(false)}>Cancel</Button>
            <Button onClick={handlePunchSubmit}>Confirm Punch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ----------------------------------------------------
// SUB-VIEWS
// ----------------------------------------------------

function DashboardView({ currentUser, attendance, expenses, announcements, tasks, events, setActiveTab, setShowPunchModal }) {
  const currentBalances = attendance?.balances?.[currentUser.id] || {
    annual: { limit: 20, used: 0 },
    sick: { limit: 14, used: 0 },
    casual: { limit: 10, used: 0 }
  }

  const myExpenses = expenses?.list?.filter(e => e.employeeId === currentUser.id && e.status === 'Pending') || []
  const totalPending = myExpenses.reduce((sum, e) => sum + e.amount, 0)
  
  const recentAnnouncements = (announcements || [])
    .filter(a => a.audience === 'all' || a.audience === currentUser.department)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)

  const myActiveTasks = tasks?.filter(t => t.assigneeIds?.includes(currentUser.id) && t.status !== 'Done') || []
  
  const todayDate = new Date().toISOString().split('T')[0]
  const upcomingEvents = events?.filter(e => e.date >= todayDate).sort((a,b) => a.date.localeCompare(b.date)) || []
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1200px] mx-auto">
      <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-sm">
        <CardContent className="p-6 sm:p-8 flex items-center gap-5 sm:gap-6">
          <div className="size-16 sm:size-20 bg-background rounded-full shadow-sm flex items-center justify-center p-1">
            {getInitialsAvatar(currentUser.name)}
          </div>
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight m-0 text-foreground">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
            <p className="m-0 text-sm sm:text-base font-medium text-muted-foreground">{currentUser.role} • {currentUser.department}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('my-tasks')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <CheckSquare size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Active Tasks</h3>
            </div>
            <div className="text-3xl font-black tabular-nums text-foreground">
              {myActiveTasks.length} <span className="text-sm font-semibold text-muted-foreground ml-1">tasks</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('events')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <CalendarDays size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Next Event</h3>
            </div>
            <div className="text-xl font-bold truncate text-foreground mb-1">
              {nextEvent ? nextEvent.title : 'None Scheduled'}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {nextEvent ? formatDateShort(nextEvent.date) : 'Enjoy your time!'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('leave')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <CalendarIcon size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Available Leave</h3>
            </div>
            <div className="text-3xl font-black tabular-nums text-foreground">
              {currentBalances.annual.limit - currentBalances.annual.used + currentBalances.sick.limit - currentBalances.sick.used} <span className="text-sm font-semibold text-muted-foreground ml-1">days total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setActiveTab('my-assets')}>
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-amber-500">
              <Monitor size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground m-0">Reimbursements</h3>
            </div>
            <div className="text-3xl font-black tabular-nums text-foreground">
              ${totalPending.toFixed(2)} <span className="text-sm font-semibold text-muted-foreground ml-1">pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-4 grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold m-0">Quick Actions</h3>
          <div className="grid gap-4 grid-cols-2">
            <Button variant="outline" className="h-28 flex flex-col gap-3 justify-center items-center" onClick={() => setActiveTab('leave')}>
              <CalendarIcon size={28} className="text-blue-500" />
              <span>Request Leave</span>
            </Button>
            <Button variant="outline" className="h-28 flex flex-col gap-3 justify-center items-center" onClick={() => setActiveTab('payslips')}>
              <Download size={28} className="text-green-500" />
              <span>Download Payslip</span>
            </Button>
            <Button variant="outline" className="h-28 flex flex-col gap-3 justify-center items-center col-span-2 sm:col-span-1" onClick={() => setShowPunchModal(true)}>
              <Clock size={28} className="text-amber-500" />
              <span>Mark Attendance</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg m-0" style={{ color: 'var(--text-primary)' }}>Company Feed</h3>
            <button className="bg-transparent border-0 font-semibold cursor-pointer text-sm" style={{ color: 'var(--accent-primary)' }} onClick={() => setActiveTab('announcements')}>View All</button>
          </div>
          <div className="flex flex-col gap-3">
            {recentAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">No new announcements</CardContent>
              </Card>
            ) : (
              recentAnnouncements.map(ann => (
                <Card key={ann.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${ann.priority === 'Urgent' ? 'border-l-4 border-l-red-500' : ''}`} onClick={() => setActiveTab('announcements')}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold">{ann.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDateShort(ann.date)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground m-0 break-words">{ann.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AttendanceView({ 
  currentUser, 
  employees,
  attendance, 
  roster,
  shiftSwaps,
  setShiftSwaps,
  shiftTemplates,
  overtimeClaims,
  setOvertimeClaims,
  settings,
  addToast 
}) {
  const currentMonth = formatMonthYear(new Date().toISOString().split('T')[0])
  const [activeSubTab, setActiveSubTab] = useState('roster') // 'roster', 'swap', 'overtime', 'offday'

  const today = new Date()
  const currentDay = today.getDay()
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates.push(d)
  }

  const myRoster = weekDates.map(date => {
    const dateStr = date.toISOString().split('T')[0]
    const shiftEntry = roster?.find(r => r.employeeId === currentUser.id && r.date === dateStr)
    const template = shiftTemplates?.find(t => t.id === shiftEntry?.templateId)
    return { date, dateStr, template }
  })

  const [swapDate, setSwapDate] = useState('')
  const [swapColleague, setSwapColleague] = useState('')
  const [swapReason, setSwapReason] = useState('')

  const handleRequestSwap = (e) => {
    e.preventDefault()
    if (!swapDate || !swapColleague) return addToast('Please select date and colleague', 'warning')
    
    const newSwap = {
      id: `swap-${Date.now()}`,
      requesterId: currentUser.id,
      targetId: swapColleague,
      date: swapDate,
      reason: swapReason,
      status: 'Pending'
    }
    
    setShiftSwaps(prev => [...prev, newSwap])
    setSwapDate('')
    setSwapColleague('')
    setSwapReason('')
    addToast('Shift swap request sent to HR for approval.', 'success')
  }

  const [offdayCurrent, setOffdayCurrent] = useState('')
  const [offdayNew, setOffdayNew] = useState('')
  const [offdayReason, setOffdayReason] = useState('')
  const [offdayType, setOffdayType] = useState('Temporary')

  const handleRequestOffday = (e) => {
    e.preventDefault()
    if (!offdayCurrent || !offdayNew) return addToast('Please select both dates', 'warning')
    
    // In a real app this would go to HR approval. For now we just mock the request.
    setOffdayCurrent('')
    setOffdayNew('')
    setOffdayReason('')
    setOffdayType('Temporary')
    addToast('Alternative offday request sent to HR for approval.', 'success')
  }

  const [otDate, setOtDate] = useState('')
  const [otHours, setOtHours] = useState('')
  const [otReason, setOtReason] = useState('')

  const handleClaimOvertime = (e) => {
    e.preventDefault()
    if (!otDate || !otHours) return addToast('Please fill required fields', 'warning')

    const newClaim = {
      id: `ot-${Date.now()}`,
      employeeId: currentUser.id,
      date: otDate,
      hours: parseFloat(otHours),
      reason: otReason,
      status: 'Pending'
    }

    setOvertimeClaims(prev => [...prev, newClaim])
    setOtDate('')
    setOtHours('')
    setOtReason('')
    addToast('Overtime claim submitted for approval.', 'success')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <h2 className="text-2xl font-bold m-0">My Attendance & Roster</h2>
      
      <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
        <Button variant={activeSubTab === 'roster' ? 'secondary' : 'ghost'} onClick={() => setActiveSubTab('roster')}>My Schedule</Button>
        <Button variant={activeSubTab === 'swap' ? 'secondary' : 'ghost'} onClick={() => setActiveSubTab('swap')}>Request Swap</Button>
        <Button variant={activeSubTab === 'offday' ? 'secondary' : 'ghost'} onClick={() => setActiveSubTab('offday')}>Change Offday</Button>
        <Button variant={activeSubTab === 'overtime' ? 'secondary' : 'ghost'} onClick={() => setActiveSubTab('overtime')}>Log Overtime</Button>
      </div>

      {activeSubTab === 'roster' && (
        <Card>
          <CardHeader>
            <CardTitle>This Week ({currentMonth})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              {myRoster.map(({ date, template }, i) => (
                <div key={i} className="p-4 rounded-lg flex flex-col gap-2 border" style={{ 
                  borderColor: template ? template.color : 'hsl(var(--border))',
                  backgroundColor: template ? `${template.color}15` : 'hsl(var(--muted))',
                }}>
                  <div className="text-sm font-medium text-muted-foreground">{formatDateWithWeekday(date.toISOString().split('T')[0])}</div>
                  {template ? (
                    <>
                      <div className="font-bold" style={{ color: template.color }}>{template.name}</div>
                      <div className="text-xs text-foreground">{template.start} - {template.end}</div>
                    </>
                  ) : (
                    <div className="font-semibold text-muted-foreground">Off</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'swap' && (
        <Card className="max-w-[600px]">
          <CardHeader>
            <CardTitle>Request Shift Swap</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestSwap} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Date to Swap</label>
                <Input type="date" required value={swapDate} onChange={(e) => setSwapDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Colleague to Swap With</label>
                <Select value={swapColleague} onChange={setSwapColleague} placeholder="Select Colleague...">
                  {employees?.filter(e => e.id !== currentUser.id && e.department === currentUser.department).map(emp => (
                    <SelectItem id={emp.id} key={emp.id}>{emp.name}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Reason</label>
                <textarea 
                  rows={3} 
                  value={swapReason} 
                  onChange={(e) => setSwapReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Why do you need to swap?" 
                />
              </div>

              <Button type="submit" className="w-fit mt-2">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'offday' && (
        <Card className="max-w-[600px]">
          <CardHeader>
            <CardTitle>Request Alternative Offday</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestOffday} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Change Type</label>
                <Select value={offdayType} onChange={setOffdayType} placeholder="Select Change Type">
                  <SelectItem id="Temporary">One-time Change (This Week Only)</SelectItem>
                  <SelectItem id="Permanent">Permanent Change (From Now On)</SelectItem>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">{offdayType === 'Permanent' ? 'Current Offday' : 'Regular Offday (Working Day)'}</label>
                  <Input type={offdayType === 'Permanent' ? 'text' : 'date'} required value={offdayCurrent} onChange={(e) => setOffdayCurrent(e.target.value)} placeholder={offdayType === 'Permanent' ? 'e.g. Friday' : ''} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Requested Offday</label>
                  <Input type={offdayType === 'Permanent' ? 'text' : 'date'} required value={offdayNew} onChange={(e) => setOffdayNew(e.target.value)} placeholder={offdayType === 'Permanent' ? 'e.g. Sunday' : ''} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Reason</label>
                <textarea 
                  rows={3} 
                  value={offdayReason} 
                  onChange={(e) => setOffdayReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Why do you need to change your offday?" 
                />
              </div>

              <Button type="submit" className="w-fit mt-2">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}


      {activeSubTab === 'overtime' && (
        <Card className="max-w-[600px]">
          <CardHeader>
            <CardTitle>Log Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaimOvertime} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Date</label>
                <Input type="date" required value={otDate} onChange={(e) => setOtDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Total Overtime Hours</label>
                <Input type="number" step="0.5" required value={otHours} onChange={(e) => setOtHours(e.target.value)} placeholder="e.g. 2.5" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Justification / Manager Name</label>
                <textarea 
                  rows={3} 
                  required 
                  value={otReason} 
                  onChange={(e) => setOtReason(e.target.value)} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Explain work done..." 
                />
              </div>

              <Button type="submit" className="w-fit mt-2">Submit Overtime</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PayslipsView({ currentUser, payroll, addToast }) {
  const myPayslips = (payroll?.history || []).filter(p => p.employeeId === currentUser.id)

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <h2 className="text-2xl font-bold m-0">My Payslips</h2>
      
      {myPayslips.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No payslips available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myPayslips.map((slip, i) => (
                <TableRow key={i}>
                  <TableCell>{slip.date}</TableCell>
                  <TableCell>${slip.gross}</TableCell>
                  <TableCell>${slip.deductions}</TableCell>
                  <TableCell className="font-semibold text-green-600 dark:text-green-400">${slip.net}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => addToast('Downloading PDF...', 'info')}>
                      <Download className="h-4 w-4 mr-2" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function LeaveView({ currentUser, attendance, setAttendance, addToast, addLog }) {
  const myLeaves = (attendance?.leaves || []).filter(l => l.employeeId === currentUser.id)
  
  const [type, setType] = useState('Annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptName, setReceiptName] = useState('')

  const handleApply = (e) => {
    e.preventDefault()
    if (!startDate || !endDate) return addToast('Please select dates', 'warning')
    
    const newLeave = {
      id: `leave-${Date.now()}`,
      employeeId: currentUser.id,
      leaveType: type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      receipt,
      receiptName
    }

    setAttendance(prev => ({ ...prev, leaves: [newLeave, ...(prev.leaves || [])] }))
    addToast('Leave request submitted successfully!', 'success')
    addLog('Leave Requested', `${currentUser.name} requested ${type} leave.`, 'info')
    setStartDate(''); setEndDate(''); setReason(''); setReceipt(null); setReceiptName('')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">
      <h2 className="text-2xl font-bold m-0">My Leave</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApply} className="flex flex-col gap-5 max-w-[500px]">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Leave type</label>
              <Select value={type} onChange={setType} placeholder="Leave type">
                <SelectItem id="Annual">Annual</SelectItem>
                <SelectItem id="Sick">Sick</SelectItem>
                <SelectItem id="Casual">Casual</SelectItem>
                <SelectItem id="Unpaid">Unpaid</SelectItem>
              </Select>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium leading-none">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium leading-none">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Reason / Handover notes</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                placeholder="Reason / Handover notes" 
                rows="3" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Attach Receipt / Medical Certificate</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" type="button" className="relative cursor-pointer overflow-hidden group">
                  <Upload className="h-4 w-4 mr-2" /> 
                  <span>{receiptName ? 'Change Document' : 'Upload File'}</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiptName(file.name);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </Button>
                {receiptName && (
                  <span className="text-sm text-muted-foreground break-words max-w-[200px]">
                    {receiptName}
                  </span>
                )}
              </div>
            </div>

            <Button type="submit" className="w-fit mt-2">
              <Send className="h-4 w-4 mr-2" /> Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No leave history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  myLeaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.leaveType}</TableCell>
                      <TableCell>{l.startDate} to {l.endDate}</TableCell>
                      <TableCell className="max-w-[200px] break-words">{l.reason}</TableCell>
                      <TableCell>
                        {l.receipt ? (
                          <Button variant="link" className="p-0 h-auto" asChild>
                            <a href={l.receipt} target="_blank" rel="noreferrer">
                              <FileText className="h-3.5 w-3.5 mr-1" /> View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'Approved' ? 'default' : l.status === 'Rejected' ? 'destructive' : 'secondary'} className={l.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : l.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileView({ currentUser, pendingProfileEdits, setPendingProfileEdits, addToast, addLog }) {
  const [editMode, setEditMode] = useState(false)
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

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[800px] mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold m-0">My Profile</h2>
        {!editMode && !hasPending && (
          <Button variant="outline" onClick={() => setEditMode(true)}>Edit Details</Button>
        )}
      </div>

      {hasPending && (
        <div className="p-4 rounded-md flex gap-3 items-center bg-amber-500/10 border-l-4 border-l-amber-500 text-foreground">
          <AlertCircle className="h-5 w-5 text-amber-500" />
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
              <div className="font-medium text-lg">{currentUser.name}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Employee ID</label>
              <div className="font-medium text-lg">{currentUser.id}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Department</label>
              <div className="font-medium text-lg">{currentUser.department}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
              <div className="font-medium text-lg">{currentUser.role}</div>
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
    </div>
  )
}

// ----------------------------------------------------------------------
// Announcements Feed View
// ----------------------------------------------------------------------
function AnnouncementsFeedView({ currentUser, employees, announcements, setAnnouncements, addToast }) {
  const [filter, setFilter] = useState('All')
  const [activeCommentPost, setActiveCommentPost] = useState(null)
  const [commentText, setCommentText] = useState('')

  const handleAddComment = (e, postId) => {
    e.preventDefault()
    if (!commentText.trim()) return
    
    setAnnouncements(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...(post.comments || []), {
            id: `cmt-${Date.now()}`,
            authorId: currentUser.id,
            text: commentText,
            date: new Date().toISOString()
          }]
        }
      }
      return post
    }))
    setCommentText('')
    addToast('Comment added', 'success')
  }

  const handleReaction = (postId, emoji) => {
    setAnnouncements(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reactions: {
            ...post.reactions,
            [emoji]: (post.reactions[emoji] || 0) + 1
          }
        }
      }
      return post
    }))
  }

  const handleVote = (postId, optionIndex) => {
    setAnnouncements(prev => prev.map(post => {
      if (post.id === postId && post.poll) {
        const hasVoted = post.poll.options.some(o => o.votes.includes(currentUser.id))
        if (hasVoted) {
          addToast('You have already voted on this poll', 'warning')
          return post
        }
        
        const newOptions = [...post.poll.options]
        newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          votes: [...newOptions[optionIndex].votes, currentUser.id]
        }
        return { ...post, poll: { ...post.poll, options: newOptions } }
      }
      return post
    }))
  }

  useEffect(() => {
    setAnnouncements(prev => prev.map(post => {
      if (!post.readBy.includes(currentUser.id)) {
        return { ...post, readBy: [...post.readBy, currentUser.id] }
      }
      return post
    }))
  }, [])

  const visiblePosts = (announcements || [])
    .filter(a => a.audience === 'all' || a.audience === currentUser.department)
    .filter(a => filter === 'All' || a.category === filter)
    .sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1
      return new Date(b.date) - new Date(a.date)
    })

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[800px] mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold m-0 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          Company Feed
        </h2>
        <div className="w-[180px]">
          <Select value={filter} onChange={setFilter} placeholder="All Categories">
            <SelectItem id="All">All Categories</SelectItem>
            <SelectItem id="General">General</SelectItem>
            <SelectItem id="Policy Update">Policy Update</SelectItem>
            <SelectItem id="Event">Event</SelectItem>
            <SelectItem id="Achievement/Birthday/Work Anniversary">Celebrations</SelectItem>
            <SelectItem id="Emergency">Emergency</SelectItem>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {visiblePosts.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No announcements found in this category.
            </CardContent>
          </Card>
        ) : (
          visiblePosts.map(post => {
            const author = post.authorId === 'system' ? { name: 'System Auto-Post', avatar: '' } : employees.find(e => e.id === post.authorId) || { name: 'Unknown User' }
            const dateStr = formatDateTime(post.date)
            const isUrgent = post.priority === 'Urgent'

            return (
              <Card key={post.id} className={`relative overflow-hidden ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}>
                {isUrgent && (
                  <Badge variant="destructive" className="absolute top-4 right-4 uppercase text-[10px]">
                    Pinned
                  </Badge>
                )}
                
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {author.avatar ? (
                          <AvatarImage src={author.avatar} alt={author.name} />
                        ) : null}
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">{author.name}</div>
                        <div className="text-xs text-muted-foreground">{dateStr}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={isUrgent ? 'mr-16' : ''}>
                      {post.category}
                    </Badge>
                  </div>

                  <h3 className="m-0 mb-3 text-xl font-semibold">{post.title}</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </div>

                  {post.poll && (
                    <div className="mt-5 p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="m-0 mb-4 text-base font-medium">📊 {post.poll.question}</h4>
                      <div className="flex flex-col gap-3">
                        {post.poll.options.map((opt, i) => {
                          const hasVoted = post.poll.options.some(o => o.votes.includes(currentUser.id))
                          const iVoted = opt.votes.includes(currentUser.id)
                          const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes.length, 0)
                          const pct = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100)

                          if (hasVoted) {
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <div className="flex-1 relative overflow-hidden rounded-md h-8 bg-muted border border-border/50">
                                  <div className={`absolute top-0 left-0 h-full opacity-20 ${iVoted ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }}></div>
                                  <div className="absolute inset-0 flex items-center px-3 text-sm font-medium">
                                    {opt.text} {iVoted && ' (Your Vote)'}
                                  </div>
                                </div>
                                <div className="w-10 text-sm text-right text-muted-foreground font-medium">{pct}%</div>
                              </div>
                            )
                          } else {
                            return (
                              <Button key={i} variant="outline" className="justify-start px-4 h-10" onClick={() => handleVote(post.id, i)}>
                                {opt.text}
                              </Button>
                            )
                          }
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3" onClick={() => handleReaction(post.id, '👍')}>
                      <ThumbsUp className="h-3.5 w-3.5" /> {post.reactions['👍']}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3" onClick={() => handleReaction(post.id, '❤️')}>
                      <Heart className="h-3.5 w-3.5" /> {post.reactions['❤️']}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 rounded-full h-8 px-3" onClick={() => handleReaction(post.id, '🎉')}>
                      <PartyPopper className="h-3.5 w-3.5" /> {post.reactions['🎉']}
                    </Button>
                    
                    <div className="flex-1"></div>
                    
                    <Button variant="ghost" size="sm" className={`gap-2 h-8 ${activeCommentPost === post.id ? 'bg-muted text-foreground' : 'text-muted-foreground'}`} onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}>
                      <MessageSquare className="h-4 w-4" /> Comment {post.comments?.length > 0 ? `(${post.comments.length})` : ''}
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {(activeCommentPost === post.id || (post.comments && post.comments.length > 0)) && (
                    <div className="mt-4 space-y-4 pt-4 border-t border-border">
                      {/* Render comments */}
                      {post.comments?.map(cmt => {
                        const cAuthor = employees.find(e => e.id === cmt.authorId) || { name: 'Unknown User' }
                        return (
                          <div key={cmt.id} className="flex gap-3 text-sm">
                            <Avatar className="h-8 w-8 mt-1">
                              {cAuthor.avatar ? <AvatarImage src={cAuthor.avatar} /> : null}
                              <AvatarFallback className="text-xs bg-primary/10 text-primary flex items-center justify-center"><User size={16} /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold">{cAuthor.name}</span>
                                <span className="text-[10px] text-muted-foreground">{formatDateTime(cmt.date)}</span>
                              </div>
                              <p className="m-0 text-foreground">{cmt.text}</p>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Comment Input */}
                      {activeCommentPost === post.id && (
                        <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-3 items-start mt-4">
                          <Avatar className="h-8 w-8 mt-1">
                            {currentUser?.avatar ? <AvatarImage src={currentUser.avatar} /> : null}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary flex items-center justify-center"><User size={16} /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <Input 
                              placeholder="Write a comment..." 
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button type="submit" size="sm" disabled={!commentText.trim()}>Post</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// My Assets View (Employee)
// ----------------------------------------------------------------------
function MyAssetsView({ currentUser, assets, setAssets, assetRequests, setAssetRequests, addToast }) {
  const [activeTab, setActiveTab] = useState('assigned') // 'assigned', 'request'
  const [requestForm, setRequestForm] = useState({ category: 'Laptop', justification: '', urgency: 'Medium' })
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueAsset, setIssueAsset] = useState(null)
  const [issueText, setIssueText] = useState('')

  const myAssets = (assets || []).filter(a => a.assignedTo === currentUser.id && a.status === 'Assigned')
  const myRequests = (assetRequests || []).filter(r => r.employeeId === currentUser.id)

  const handleReportIssue = (e) => {
    e.preventDefault()
    setAssets(prev => prev.map(a => {
      if (a.id === issueAsset.id) {
        return {
          ...a,
          status: 'Under Repair',
          maintenanceLogs: [...(a.maintenanceLogs || []), {
            id: `maint-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            issue: issueText,
            cost: 0,
            vendor: 'Reported by Employee',
            status: 'In Progress'
          }]
        }
      }
      return a
    }))
    setIssueText('')
    setShowIssueModal(false)
    addToast('Issue reported. IT will follow up shortly.', 'success')
  }

  const handleRequestReturn = (assetId) => {
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        return { ...a, status: 'Available', assignedTo: null, assignmentDate: null }
      }
      return a
    }))
    addToast('Return request submitted. Please hand over the device to IT/HR.', 'info')
  }

  const handleSubmitRequest = (e) => {
    e.preventDefault()
    const newReq = {
      id: `AREQ-${Date.now()}`,
      employeeId: currentUser.id,
      category: requestForm.category,
      justification: requestForm.justification,
      urgency: requestForm.urgency,
      status: 'Pending',
      date: new Date().toISOString()
    }
    setAssetRequests(prev => [newReq, ...prev])
    setRequestForm({ category: 'Laptop', justification: '', urgency: 'Medium' })
    addToast('Asset request submitted to IT/HR', 'success')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[900px] mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold m-0 flex items-center gap-3">
          <Monitor className="h-6 w-6 text-primary" />
          My Assets
        </h2>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'assigned' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('assigned')}>
            Assigned to Me
          </button>
          <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'request' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('request')}>
            Request Equipment
          </button>
        </div>
      </div>

      {activeTab === 'assigned' && (
        <div className="flex flex-col gap-4">
          {myAssets.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Monitor className="h-10 w-10 mb-3 opacity-20" />
                No assets are currently assigned to you.
              </CardContent>
            </Card>
          ) : (
            myAssets.map(asset => (
              <Card key={asset.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-primary/10">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{asset.name}</div>
                      <div className="text-sm text-muted-foreground">{asset.category} &middot; SN: {asset.serialNumber}</div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        Assigned: {asset.assignmentDate} &middot; Condition: {asset.condition}
                      </div>
                      {asset.warrantyExpiry && (
                        <div className="text-xs text-muted-foreground">Warranty until: {asset.warrantyExpiry}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600" onClick={() => { setIssueAsset(asset); setShowIssueModal(true) }}>
                      <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
                    </Button>
                    <Button variant="outline" onClick={() => handleRequestReturn(asset.id)}>
                      Request Return
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {myRequests.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-3">My Past Requests</h4>
              <div className="space-y-3">
                {myRequests.map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{req.category}</span>
                        <span className="ml-2 text-sm text-muted-foreground break-words max-w-[200px] sm:max-w-[400px] inline-block align-bottom">&quot;{req.justification}&quot;</span>
                      </div>
                      <Badge variant={req.status === 'Approved' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'} className={req.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : req.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                        {req.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <Card>
          <CardHeader>
            <CardTitle>Request New Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="flex flex-col gap-5 max-w-[500px]">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Equipment Category</label>
                <Select value={requestForm.category} onChange={(val) => setRequestForm(p => ({...p, category: val}))} placeholder="Category">
                  <SelectItem id="Laptop">Laptop</SelectItem>
                  <SelectItem id="Phone">Phone</SelectItem>
                  <SelectItem id="Monitor">Monitor</SelectItem>
                  <SelectItem id="Peripherals">Peripherals</SelectItem>
                  <SelectItem id="Access Card">Access Card</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Urgency Level</label>
                <Select value={requestForm.urgency} onChange={(val) => setRequestForm(p => ({...p, urgency: val}))} placeholder="Urgency">
                  <SelectItem id="Low">Low</SelectItem>
                  <SelectItem id="Medium">Medium</SelectItem>
                  <SelectItem id="High">High</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Justification</label>
                <textarea 
                  required 
                  rows={4} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="Explain why you need this equipment..." 
                  value={requestForm.justification} 
                  onChange={e => setRequestForm(p => ({...p, justification: e.target.value}))} 
                />
              </div>
              <Button type="submit" className="w-fit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Report Issue Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Report Issue: {issueAsset?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportIssue} className="flex flex-col gap-5 pt-4">
            <textarea 
              required 
              rows={5} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Describe the issue in detail..." 
              value={issueText} 
              onChange={e => setIssueText(e.target.value)} 
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>Cancel</Button>
              <Button type="submit">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
