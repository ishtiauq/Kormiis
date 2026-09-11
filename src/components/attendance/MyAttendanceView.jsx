import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { formatMonthYear, formatDateWithWeekday } from '../../services/date.js'
import MyLeaveView from './MyLeaveView.jsx'

export default function MyAttendanceView({
  currentUser,
  employees,
  attendance,
  setAttendance,
  roster,
  shiftSwaps,
  setShiftSwaps,
  shiftTemplates,
  overtimeClaims,
  setOvertimeClaims,
  settings,
  addToast,
  addLog,
  addNotification,
  initialSubTab = 'history'
}) {
  const currentMonth = formatMonthYear(new Date().toISOString().split('T')[0])
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab) // 'history', 'leave', 'roster', 'swap', 'overtime', 'offday'

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
    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} requested a shift swap for ${swapDate}`,
        'attendance',
        { title: 'Shift Swap Requested', category: 'attendance', targetRoles: ['Admin', 'HR'], targetEmployeeIds: swapColleague ? [swapColleague] : null }
      )
    }

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
    if (addNotification) {
      addNotification(
        `${currentUser.name || 'Teammate'} submitted an overtime claim of ${otHours} hours for ${otDate}`,
        'attendance',
        { title: 'Overtime Claim Submitted', category: 'attendance', targetRoles: ['Admin', 'HR'] }
      )
    }

    setOtDate('')
    setOtHours('')
    setOtReason('')
    addToast('Overtime claim submitted for approval.', 'success')
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 max-w-[1000px] mx-auto pb-10">

      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Attendance sections" className="menu-bar">
          <Button
            role="tab"
            aria-selected={activeSubTab === 'history'}
            variant={activeSubTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'history' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <Icon name="schedule" size={15}/> My Logs
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'leave'}
            variant={activeSubTab === 'leave' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'leave' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('leave')}
          >
            <Icon name="event_busy" size={15}/> Leaves
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'roster'}
            variant={activeSubTab === 'roster' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'roster' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('roster')}
          >
            <Icon name="swap_vert" size={15}/> My Schedule
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'swap'}
            variant={activeSubTab === 'swap' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'swap' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('swap')}
          >
            <Icon name="swap_horiz" size={15}/> Request Swap
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'offday'}
            variant={activeSubTab === 'offday' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'offday' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('offday')}
          >
            <Icon name="event_busy" size={15}/> Change Offday
          </Button>
          <Button
            role="tab"
            aria-selected={activeSubTab === 'overtime'}
            variant={activeSubTab === 'overtime' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full px-4 justify-center ${activeSubTab !== 'overtime' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
            onClick={() => setActiveSubTab('overtime')}
          >
            <Icon name="memory" size={15}/> Log Overtime
          </Button>
        </div>
      </div>

      {activeSubTab === 'leave' && (
        <MyLeaveView
          currentUser={currentUser}
          attendance={attendance}
          setAttendance={setAttendance}
          addToast={addToast}
          addLog={addLog}
          settings={settings}
          addNotification={addNotification}
        />
      )}

      {activeSubTab === 'history' && (() => {
        const myHistory = Object.entries(attendance?.dailyLogs || {})
          .filter(([date, logs]) => logs[currentUser.id])
          .map(([date, logs]) => ({ date, log: logs[currentUser.id] }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 30) // last 30 days

        return (
          <Card>
            <CardHeader>
              <CardTitle>My Attendance Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Total Hrs</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No recent logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myHistory.map(({ date, log }) => (
                        <TableRow key={date}>
                          <TableCell className="font-medium">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                          <TableCell>{log.checkIn}</TableCell>
                          <TableCell>{log.checkOut}</TableCell>
                          <TableCell>{log.hours}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'In Office' || log.status === 'Present' ? 'default' : 'secondary'}>{log.status === 'Present' ? 'In Office' : (log.status === 'Absent' ? 'Off Duty' : log.status)}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

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
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="swap_horiz" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Request Shift Swap</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="swap-form" onSubmit={handleRequestSwap} className="flex flex-col gap-5">
              <div className="space-y-2">
                <DatePicker label="Date to Swap" required value={swapDate} onChange={(e) => setSwapDate(e.target.value)} />
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
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="swap-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
            </Button>
          </div>
        </Card>
      )}

      {activeSubTab === 'offday' && (
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="event_busy" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Request Alternative Offday</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="offday-form" onSubmit={handleRequestOffday} className="flex flex-col gap-5">
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
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="offday-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Request
            </Button>
          </div>
        </Card>
      )}


      {activeSubTab === 'overtime' && (
        <Card className="max-w-[600px] overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="memory" className="text-foreground shrink-0" size={24}/>
              <CardTitle className="text-base m-0 modal-title-solid">Log Overtime</CardTitle>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6">
            <form id="overtime-form" onSubmit={handleClaimOvertime} className="flex flex-col gap-5">
              <div className="space-y-2">
                <DatePicker label="Date" required value={otDate} onChange={(e) => setOtDate(e.target.value)} />
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
            </form>
          </CardContent>
          <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button type="submit" form="overtime-form">
              <Icon name="send" className="h-4 w-4 mr-2" size={16}/> Submit Overtime
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}