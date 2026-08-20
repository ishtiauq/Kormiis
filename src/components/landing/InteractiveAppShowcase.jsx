import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from "@/components/ui/Icon.jsx"

export default function InteractiveAppShowcase() {
  const [activeTab, setActiveTab] = useState('attendance')

  // Attendance Demo State
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockTime, setClockTime] = useState('09:00:00 AM')
  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: 1, name: 'Rahim Ahmed', role: 'Frontend Lead', in: '09:02 AM', out: '--:--', status: 'Present', gps: 'HQ Office' },
    { id: 2, name: 'Nusrat Jahan', role: 'Product Designer', in: '09:14 AM', out: '--:--', status: 'Present', gps: 'Remote (Verified)' },
    { id: 3, name: 'Tanvir Hasan', role: 'Backend Engineer', in: '09:45 AM', out: '--:--', status: 'Late', gps: 'HQ Office' },
    { id: 4, name: 'Farhana Islam', role: 'HR Manager', in: '--:--', out: '--:--', status: 'On Leave', gps: '--' },
  ])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setClockTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handlePunchToggle = () => {
    setIsClockedIn(!isClockedIn)
    if (!isClockedIn) {
      setAttendanceLogs(prev => [
        { id: Date.now(), name: 'You (Admin Demo)', role: 'Workspace Owner', in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), out: '--:--', status: 'Present', gps: 'GPS Verified' },
        ...prev
      ])
    }
  }

  // Payroll Demo State
  const [basicSalary, setBasicSalary] = useState(65000)
  const [currency, setCurrency] = useState('৳')
  const [overtimeHours, setOvertimeHours] = useState(12)
  const houseRent = Math.round(basicSalary * 0.40)
  const medical = Math.round(basicSalary * 0.10)
  const overtimePay = overtimeHours * 500
  const taxDeduction = Math.round(basicSalary * 0.05)
  const netSalary = basicSalary + houseRent + medical + overtimePay - taxDeduction

  // Kanban Tasks Demo State
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Finalize Q3 Performance Reviews', tag: 'HR Ops', col: 'todo', priority: 'High' },
    { id: 2, title: 'Issue Assets to New Dev Hire', tag: 'Inventory', col: 'in_progress', priority: 'Medium' },
    { id: 3, title: 'Generate August Payroll Slips', tag: 'Payroll', col: 'in_progress', priority: 'Urgent' },
    { id: 4, title: 'Update Company Leave Policy v2', tag: 'Compliance', col: 'done', priority: 'Completed' },
  ])

  const moveTask = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      if (t.col === 'todo') return { ...t, col: 'in_progress' }
      if (t.col === 'in_progress') return { ...t, col: 'done' }
      return { ...t, col: 'todo' }
    }))
  }

  // Asset Demo State
  const [assetSearch, setAssetSearch] = useState('')
  const [assetFilter, setAssetFilter] = useState('All')
  const [assetsList] = useState([
    { id: 'AST-101', name: 'MacBook Pro M3 Max 16"', cat: 'Laptop', assignedTo: 'Rahim Ahmed', status: 'Assigned', warranty: '310 Days' },
    { id: 'AST-102', name: 'Dell UltraSharp 27" 4K', cat: 'Monitor', assignedTo: 'Nusrat Jahan', status: 'Assigned', warranty: '180 Days' },
    { id: 'AST-103', name: 'Apple iPad Pro 12.9"', cat: 'Tablet', assignedTo: 'Unassigned', status: 'Available', warranty: '450 Days' },
    { id: 'AST-104', name: 'Logitech MX Master 3S', cat: 'Accessory', assignedTo: 'Tanvir Hasan', status: 'Assigned', warranty: '90 Days' },
  ])

  const filteredAssets = assetsList.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.id.toLowerCase().includes(assetSearch.toLowerCase())
    const matchesFilter = assetFilter === 'All' || a.status === assetFilter
    return matchesSearch && matchesFilter
  })

  // Leaves Demo State
  const [pendingLeave, setPendingLeave] = useState({
    id: 1,
    name: 'Karim Khan',
    role: 'Product Specialist',
    type: 'Casual Leave',
    dates: '2 Days (Aug 18 - Aug 19)',
    reason: 'Attending sibling wedding ceremony.',
    status: 'Pending'
  })

  const [balances, setBalances] = useState({
    sick: { used: 3, limit: 10 },
    casual: { used: 5, limit: 14 },
    annual: { used: 8, limit: 18 }
  })

  const handleApproveLeave = () => {
    setPendingLeave(prev => ({ ...prev, status: 'Approved' }))
    setBalances(prev => ({ ...prev, casual: { ...prev.casual, used: prev.casual.used + 2 } }))
  }

  const tabs = [
    { id: 'attendance', label: 'Smart Attendance', icon: 'schedule' },
    { id: 'payroll', label: 'Automated Payroll', icon: 'payments' },
    { id: 'tasks', label: 'Kanban & Tasks', icon: 'check_box' },
    { id: 'assets', label: 'Asset Inventory', icon: 'monitor' },
    { id: 'leaves', label: 'Leave Approvals', icon: 'event_available' },
  ]

  return (
    <section id="showcase" className="relative w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3 shadow-sm">
            <Icon name="touch_app" size={14} className="text-foreground" />
            <span>INTERACTIVE TEST DRIVE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            See the Platform in <span className="text-primary">Action</span>
          </h2>
          <p className="text-fluid text-muted-foreground mt-3 font-medium">
            Try out the actual workflows your team will use every day. Click through the live modules below.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto pb-4 mb-8 scrollbar-none gap-2">
          <div className="inline-flex p-1.5 rounded-full bg-card border border-border shadow-sm">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-foreground text-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Interactive Showcase Window */}
        <div className="w-full bg-card border border-border rounded-3xl shadow-sm p-4 sm:p-8 relative min-h-[480px] flex flex-col justify-between overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* 1. ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              >
                {/* Left Live Punch Clock */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-muted/40 border border-border rounded-2xl text-center">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Live System Clock
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-foreground tracking-tight my-2">
                    {clockTime}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>GPS Radius Active (Dhaka HQ · 50m)</span>
                  </div>

                  <button
                    onClick={handlePunchToggle}
                    className={`w-full py-4 rounded-full font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                      isClockedIn 
                        ? 'bg-destructive text-destructive-foreground hover:opacity-90' 
                        : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
                    }`}
                  >
                    <Icon name={isClockedIn ? 'logout' : 'login'} size={18} />
                    <span>{isClockedIn ? 'Check Out for the Day' : '1-Tap Clock In'}</span>
                  </button>

                  <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                    {isClockedIn ? '✓ You are clocked in. Timesheet syncs automatically.' : 'Click button to simulate teammate check-in.'}
                  </p>
                </div>

                {/* Right Attendance Feed */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">Today's Timesheet Stream</h3>
                    <span className="text-xs font-mono text-muted-foreground">{attendanceLogs.length} Records</span>
                  </div>

                  <div className="divide-y divide-border/60">
                    {attendanceLogs.map((log) => (
                      <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                            {log.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-foreground leading-snug">{log.name}</div>
                            <div className="text-[11px] text-muted-foreground">{log.role} · {log.gps}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div className="text-xs font-mono text-foreground font-semibold">
                            {log.in}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === 'Present' ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. PAYROLL TAB */}
            {activeTab === 'payroll' && (
              <motion.div
                key="payroll"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
              >
                {/* Left Salary Form Controls */}
                <div className="lg:col-span-6 flex flex-col gap-4 p-6 bg-muted/40 border border-border rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Interactive Compensation Engine</h3>
                    <div className="flex gap-1">
                      {['৳', '$', '€'].map(c => (
                        <button
                          key={c}
                          onClick={() => setCurrency(c)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold ${currency === c ? 'bg-foreground text-background' : 'bg-card text-foreground border border-border'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-foreground mb-1.5">
                      <span>Basic Salary:</span>
                      <span className="font-mono">{currency} {basicSalary.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="30000"
                      max="150000"
                      step="5000"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-foreground mb-1.5">
                      <span>Overtime Claimed:</span>
                      <span className="font-mono">{overtimeHours} Hours (+ {currency} {overtimePay.toLocaleString()})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="2"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground font-medium">
                    ⚡ Formulas configured: House Rent (40%), Medical (10%), Overtime, Standard Tax Deduction (5%).
                  </div>
                </div>

                {/* Right Auto-Calculated Slip */}
                <div className="lg:col-span-6 p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground">MONTHLY PAYSLIP BREAKDOWN</div>
                      <div className="text-[11px] text-muted-foreground">Auto-linked with attendance records</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">READY TO EXPORT</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Basic Earnings</span>
                      <span className="font-mono text-foreground font-semibold">{currency} {basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>House Rent Allowance (40%)</span>
                      <span className="font-mono text-foreground font-semibold">{currency} {houseRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Medical Allowance (10%)</span>
                      <span className="font-mono text-foreground font-semibold">{currency} {medical.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Approved Overtime Pay</span>
                      <span className="font-mono text-foreground font-semibold">+ {currency} {overtimePay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax Withholding (5%)</span>
                      <span className="font-mono text-foreground font-semibold">- {currency} {taxDeduction.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Net Disbursed</span>
                      <div className="text-2xl font-black font-mono text-foreground">
                        {currency} {netSalary.toLocaleString()}
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-full bg-foreground text-background font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90">
                      <Icon name="download" size={14} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. KANBAN TASKS TAB */}
            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-start"
              >
                {/* To Do */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">To Do ({tasks.filter(t => t.col === 'todo').length})</span>
                    <Icon name="pending_actions" size={16} className="text-muted-foreground" />
                  </div>
                  {tasks.filter(t => t.col === 'todo').map(task => (
                    <div
                      key={task.id}
                      onClick={() => moveTask(task.id)}
                      className="p-3 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 cursor-pointer transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">{task.tag}</span>
                        <span className="text-[10px] font-bold text-destructive">{task.priority}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">{task.title}</p>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Click to advance →</span>
                    </div>
                  ))}
                </div>

                {/* In Progress */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">In Progress ({tasks.filter(t => t.col === 'in_progress').length})</span>
                    <Icon name="autorenew" size={16} className="text-muted-foreground" />
                  </div>
                  {tasks.filter(t => t.col === 'in_progress').map(task => (
                    <div
                      key={task.id}
                      onClick={() => moveTask(task.id)}
                      className="p-3 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 cursor-pointer transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">{task.tag}</span>
                        <span className="text-[10px] font-bold text-foreground">{task.priority}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">{task.title}</p>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Click to complete →</span>
                    </div>
                  ))}
                </div>

                {/* Done */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-3 min-h-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Done / Approved ({tasks.filter(t => t.col === 'done').length})</span>
                    <Icon name="check_circle" size={16} className="text-foreground" />
                  </div>
                  {tasks.filter(t => t.col === 'done').map(task => (
                    <div
                      key={task.id}
                      onClick={() => moveTask(task.id)}
                      className="p-3 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 cursor-pointer transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground">{task.tag}</span>
                        <span className="text-[10px] font-bold text-foreground">Done</span>
                      </div>
                      <p className="text-xs font-bold text-foreground line-through opacity-80 leading-snug">{task.title}</p>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Click to restart ↺</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. ASSET INVENTORY TAB */}
            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-4"
              >
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="relative w-full sm:w-72 flex items-center">
                    <Icon name="search" size={18} className="absolute left-3.5 text-muted-foreground z-10 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search hardware by name or ID..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="w-full !pl-10.5 pr-3 h-10 rounded-full bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    {['All', 'Assigned', 'Available'].map(f => (
                      <button
                        key={f}
                        onClick={() => setAssetFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          assetFilter === f ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="pb-2 font-mono">ASSET ID</th>
                        <th className="pb-2">HARDWARE NAME</th>
                        <th className="pb-2">CATEGORY</th>
                        <th className="pb-2">ASSIGNED TO</th>
                        <th className="pb-2">WARRANTY</th>
                        <th className="pb-2 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredAssets.map(asset => (
                        <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-mono font-bold text-foreground">{asset.id}</td>
                          <td className="py-3 font-bold text-foreground">{asset.name}</td>
                          <td className="py-3 text-muted-foreground">{asset.cat}</td>
                          <td className="py-3 text-foreground font-medium">{asset.assignedTo}</td>
                          <td className="py-3 font-mono text-muted-foreground">{asset.warranty}</td>
                          <td className="py-3 text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              asset.status === 'Assigned' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                            }`}>
                              {asset.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 5. LEAVES TAB */}
            {activeTab === 'leaves' && (
              <motion.div
                key="leaves"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
              >
                {/* Left Quotas */}
                <div className="lg:col-span-5 p-6 bg-muted/40 border border-border rounded-2xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-foreground">Employee Leave Quotas</h3>
                  
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-foreground">Sick Leave</span>
                      <span className="font-mono text-muted-foreground">{balances.sick.used} / {balances.sick.limit} Days</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${(balances.sick.used / balances.sick.limit) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-foreground">Casual Leave</span>
                      <span className="font-mono text-muted-foreground">{balances.casual.used} / {balances.casual.limit} Days</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${(balances.casual.used / balances.casual.limit) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-foreground">Annual Vacation</span>
                      <span className="font-mono text-muted-foreground">{balances.annual.used} / {balances.annual.limit} Days</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-foreground" style={{ width: `${(balances.annual.used / balances.annual.limit) * 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* Right 1-Tap Approval Card */}
                <div className="lg:col-span-7 p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-bold text-foreground">PENDING TIME OFF REQUEST</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pendingLeave.status === 'Approved' ? 'bg-foreground text-background' : 'bg-primary/10 text-primary'
                    }`}>
                      {pendingLeave.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                      KK
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{pendingLeave.name}</div>
                      <div className="text-xs text-muted-foreground">{pendingLeave.role} · {pendingLeave.type}</div>
                      <div className="text-xs font-mono font-bold text-foreground mt-1">{pendingLeave.dates}</div>
                      <p className="text-xs text-muted-foreground mt-2 italic">"{pendingLeave.reason}"</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                    {pendingLeave.status === 'Pending' ? (
                      <>
                        <button className="px-4 py-2 rounded-full border border-border text-xs font-bold text-muted-foreground hover:text-foreground">
                          Decline
                        </button>
                        <button
                          onClick={handleApproveLeave}
                          className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5"
                        >
                          <Icon name="check" size={16} />
                          <span>1-Tap Approve</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Icon name="check_circle" size={16} className="text-foreground" />
                        <span>Leave approved & deducted from quota.</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </section>
  )
}
