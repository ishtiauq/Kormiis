import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import DailyLogs from './DailyLogs.jsx'
import LeaveRequests from './LeaveRequests.jsx'
import LeaveBalanceCard from './LeaveBalanceCard.jsx'
import RosterPlanner from './RosterPlanner.jsx'
import ShiftSwaps from './ShiftSwaps.jsx'
import OvertimeClaims from './OvertimeClaims.jsx'

export default function AttendancePage({ 
  employees, 
  attendance, 
  setAttendance, 
  roster, 
  setRoster, 
  shiftSwaps, 
  setShiftSwaps, 
  shiftTemplates, 
  overtimeClaims, 
  setOvertimeClaims, 
  addLog, 
  addToast, 
  addNotification, 
  addAuditLog,
  settings,
  headline = 'Attendance & Leaves'
}) {
  const [tab, setTab] = useState('daily')
  const tabs = [
    { id: 'daily', label: 'Daily Logs', icon: <Icon name="schedule" size={15}/> },
    { id: 'leave', label: 'Leave Requests', icon: <Icon name="calendar_month" size={15}/> },
    { id: 'roster', label: 'Roster', icon: <Icon name="swap_vert" size={15}/> },
    { id: 'overtime', label: 'Overtime', icon: <Icon name="memory" size={15}/> },
  ]

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="schedule" className="text-foreground" size={20}/>
          {headline}
        </h1>
      </div>
      <div className="border-t border-border border-headline" />

      <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm w-full max-w-full">
        <div role="tablist" aria-label="Attendance sections" className="menu-bar">
          {tabs.map(t => (
            <Button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                variant={tab === t.id ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full px-4 justify-center ${tab !== t.id ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon} {t.label}
              </Button>
          ))}
        </div>
      </div>

      {tab === 'daily' && <DailyLogs employees={employees} attendance={attendance} setAttendance={setAttendance} addToast={addToast} />}
      {tab === 'leave' && (
        <div className="grid gap-6">
          <LeaveRequests 
            attendance={attendance}
            leaves={attendance.leaves} 
            employees={employees} 
            setAttendance={setAttendance}
            addLog={addLog}
            addToast={addToast}
            settings={settings}
          />
          <LeaveBalanceCard employees={employees} balances={attendance.leaveBalances || {}} leaves={attendance.leaves || []} settings={settings} />
        </div>
      )}
      {tab === 'roster' && (
        <div className="flex flex-col gap-5">
          <RosterPlanner employees={employees} roster={roster} setRoster={setRoster} shiftTemplates={shiftTemplates} addToast={addToast} />
          <ShiftSwaps employees={employees} shiftSwaps={shiftSwaps} setShiftSwaps={setShiftSwaps} roster={roster} setRoster={setRoster} addToast={addToast} />
        </div>
      )}
      {tab === 'overtime' && <OvertimeClaims employees={employees} overtimeClaims={overtimeClaims} setOvertimeClaims={setOvertimeClaims} addToast={addToast} />}
    </div>
  )
}
