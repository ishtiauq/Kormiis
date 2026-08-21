import { useState } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import DailyLogs from './DailyLogs.jsx'
import LeaveRequests from './LeaveRequests.jsx'
import LeaveBalanceCard from './LeaveBalanceCard.jsx'
import RosterPlanner from './RosterPlanner.jsx'
import ShiftSwaps from './ShiftSwaps.jsx'
import OvertimeRulesEditor from './OvertimeRulesEditor.jsx'
import OvertimeClaims from './OvertimeClaims.jsx'
import GeofenceSettings from './GeofenceSettings.jsx'
import LeavePoliciesEditor from './LeavePoliciesEditor.jsx'

export default function AttendancePage({ 
  employees, 
  attendance, 
  setAttendance, 
  roster, 
  setRoster, 
  shiftSwaps, 
  setShiftSwaps, 
  overtimeClaims, 
  setOvertimeClaims, 
  addLog, 
  addToast, 
  addNotification, 
  addAuditLog,
  settings,
  setSettings,
  headline = 'Attendance & Leaves',
  icon = 'schedule',
  tabs: propTabs,
  defaultTab = 'daily'
}) {
  const allTabs = [
    { id: 'daily', label: 'Daily Logs', icon: <Icon name="schedule" size={15}/> },
    { id: 'leave', label: 'Leave Requests', icon: <Icon name="calendar_month" size={15}/> },
    { id: 'roster', label: 'Roster', icon: <Icon name="swap_vert" size={15}/> },
    { id: 'overtime', label: 'Overtime', icon: <Icon name="memory" size={15}/> },
  ]
  const tabs = propTabs || allTabs
  const [tab, setTab] = useState(defaultTab)

  const shiftTemplates = settings?.shiftTemplates || []
  const overtimeRules = settings?.overtimeRules || { multiplierWeekday: 1.5, multiplierWeekend: 2.0 }

  const updateShiftTemplates = (updater) => {
    if (!setSettings) return
    setSettings(prev => ({ ...prev, shiftTemplates: typeof updater === 'function' ? updater(prev?.shiftTemplates || []) : updater }))
  }
  const updateOvertimeRules = (updater) => {
    if (!setSettings) return
    setSettings(prev => ({ ...prev, overtimeRules: typeof updater === 'function' ? updater(prev?.overtimeRules || { multiplierWeekday: 1.5, multiplierWeekend: 2.0 }) : updater }))
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Icon name={icon} className="text-foreground shrink-0" size={28}/>
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

      {tab === 'daily' && <DailyLogs employees={employees} attendance={attendance} setAttendance={setAttendance} addToast={addToast} settings={settings} />}
      {tab === 'leave' && (
        <div className="grid gap-6">
          <LeaveRequests 
            attendance={attendance}
            leaves={attendance.leaves} 
            employees={employees} 
            setAttendance={setAttendance}
            addLog={addLog}
            addToast={addToast}
            addNotification={addNotification}
            settings={settings}
          />
          <LeaveBalanceCard employees={employees} balances={attendance.leaveBalances || {}} leaves={attendance.leaves || []} settings={settings} />
        </div>
      )}
      {tab === 'roster' && (
        <div className="flex flex-col gap-5">
          <RosterPlanner employees={employees} roster={roster} setRoster={setRoster} shiftTemplates={shiftTemplates} setShiftTemplates={updateShiftTemplates} addToast={addToast} />
          <ShiftSwaps employees={employees} shiftSwaps={shiftSwaps} setShiftSwaps={setShiftSwaps} roster={roster} setRoster={setRoster} addToast={addToast} />
        </div>
      )}
      {tab === 'overtime' && (
        <div className="flex flex-col gap-5">
          <OvertimeRulesEditor overtimeRules={overtimeRules} setOvertimeRules={updateOvertimeRules} />
          <OvertimeClaims employees={employees} overtimeClaims={overtimeClaims} setOvertimeClaims={setOvertimeClaims} addToast={addToast} />
        </div>
      )}
      {tab === 'geofence' && (
        <GeofenceSettings settings={settings} setSettings={setSettings} addToast={addToast} addLog={addLog} />
      )}
      {tab === 'policies' && (
        <LeavePoliciesEditor settings={settings} setSettings={setSettings} addToast={addToast} addLog={addLog} />
      )}
    </div>
  )
}
