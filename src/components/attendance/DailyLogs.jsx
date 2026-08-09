import { useState } from 'react'
import { useAttendanceLogs } from '../../hooks/useAttendanceLogs.js'
import { PILL_STYLES } from '../../services/attendance.js'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GlassTimePicker } from './GlassTimePicker.jsx'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"

const z = (v) => v < 10 ? `0${v}` : `${v}`

export default function DailyLogs({ employees, attendance, setAttendance, addToast }) {
  const {
    selectedDate, setSelectedDate, showDatePicker, setShowDatePicker,
    calYear, setCalYear, calMonth, setCalMonth,
    logs, setLog, openStatusEmp, setOpenStatusEmp,
    calDaysInMonth, calFirstDow, calGrid, selNum, selMonth, selYear,
  } = useAttendanceLogs(attendance, setAttendance, addToast)

  // State for the custom time picker
  const [activePicker, setActivePicker] = useState(null) // { empId, field, current }
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  const handleTimeChange = (newTime12) => {
    if (activePicker) {
      setLog(activePicker.empId, { [activePicker.field]: newTime12 })
    }
  }

  const handleConfirmStatusChange = () => {
    if (pendingStatusChange) {
      setLog(pendingStatusChange.empId, { status: pendingStatusChange.status })
      setPendingStatusChange(null)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
      <CardContent className="p-0">
        <div className="bg-muted/30 border-b border-border p-4 sm:p-5 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="outline" className="rounded-full bg-background shadow-sm h-10 px-5 border-border/50 hover:border-primary/50" onClick={(e) => { e.stopPropagation(); setShowDatePicker(v => !v); setCalYear(selYear); setCalMonth(selMonth) }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <Icon name="calendar_month" className="opacity-60 ml-2 text-primary" size={16}/>
            </Button>
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            {showDatePicker && (
              <div onClick={e => e.stopPropagation()}
                className="absolute top-full left-0 z-50 w-[280px] p-4 mt-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
                <div className="flex justify-between items-center mb-3">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} aria-label="Previous month">
                    <Icon name="chevron_left" size={16}/>
                  </Button>
                  <span className="font-semibold text-sm text-foreground">
                    {new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} aria-label="Next month">
                    <Icon name="chevron_right" size={16}/>
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <span key={d} className="font-medium text-[10px] py-1 text-muted-foreground uppercase tracking-widest">{d}</span>
                  ))}
                  {calGrid.map((d, i) => (
                    d === null ? <div key={i} /> : (
                      <button key={i} aria-label={`${calYear}-${z(calMonth+1)}-${z(d)}`} onClick={() => { setSelectedDate(`${calYear}-${z(calMonth+1)}-${z(d)}`); setShowDatePicker(false) }}
                        className={`size-8 rounded-full mx-auto text-sm font-medium transition-colors
                          ${d === selNum && calMonth === selMonth && calYear === selYear
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-muted'}`}>
                        {d}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col max-h-[550px] overflow-y-auto no-scrollbar">
          {employees.map((emp, idx) => {
            const log = logs[emp.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
            const ps = PILL_STYLES[log.status] || PILL_STYLES.Absent
            return (
              <div key={emp.id} className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors hover:bg-muted/20 ${idx !== employees.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className="flex items-center gap-4">
                  <Avatar className="size-12 shrink-0 shadow-sm border border-border/50">
                    {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold"><Icon name="person" size={20}/></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-foreground">{emp.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground mt-0.5 tracking-wider uppercase">{emp.role}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 xl:gap-6 bg-muted/30 p-3 sm:px-4 rounded-2xl border border-border/30 w-full xl:w-auto">
                  <div className="grid grid-cols-[1fr_24px_1fr] items-center w-full sm:flex sm:w-auto gap-2 sm:gap-4">
                    <button
                      onClick={() => setActivePicker({ empId: emp.id, field: 'checkIn', current: log.checkIn })}
                      className="relative group w-full sm:flex-none sm:w-[125px] h-10 rounded-xl border border-input bg-background/80 text-sm font-semibold flex items-center justify-center gap-1 sm:gap-2 hover:border-primary hover:text-primary transition-all shadow-sm"
                    >
                      <Icon name="schedule" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" size={14}/>
                      <span className="truncate">{log.checkIn}</span>
                    </button>
                    
                    <span className="text-muted-foreground/80 font-bold flex justify-center w-full sm:w-auto shrink-0">â†’</span>
                    
                    <button
                      onClick={() => setActivePicker({ empId: emp.id, field: 'checkOut', current: log.checkOut })}
                      className="relative group w-full sm:flex-none sm:w-[125px] h-10 rounded-xl border border-input bg-background/80 text-sm font-semibold flex items-center justify-center gap-1 sm:gap-2 hover:border-primary hover:text-primary transition-all shadow-sm"
                    >
                      <Icon name="schedule" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" size={14}/>
                      <span className="truncate">{log.checkOut}</span>
                    </button>
                  </div>

                  <div className="h-8 w-px bg-muted-foreground/30 hidden sm:block"></div>
                  
                  <div className="grid grid-cols-[1fr_24px_1fr] items-center w-full sm:flex sm:w-auto gap-2 sm:gap-4">
                    <div className="relative w-full sm:flex-none sm:w-[125px] h-10 rounded-xl border border-input bg-background/80 text-sm font-semibold flex items-center justify-center gap-1 shadow-sm">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total:</span>
                      <span className="text-foreground tabular-nums truncate">{log.hours}<span className="text-[10px] opacity-50 ml-0.5">h</span></span>
                    </div>

                    <div className="h-6 w-px bg-muted-foreground/30 sm:hidden flex justify-center mx-auto shrink-0"></div>

                    <div className="relative w-full sm:flex-none sm:w-[125px]">
                      <button role="status" onClick={(e) => { e.stopPropagation(); setOpenStatusEmp(v => v === emp.id ? null : emp.id) }}
                        className="inline-flex w-full items-center justify-center sm:justify-between h-10 rounded-xl px-2 sm:px-4 text-[11px] sm:text-xs font-bold shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
                        style={{ background: ps.bg, color: ps.color, border: 'none' }}>
                        <span className="truncate">{log.status}</span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-70 ml-1 sm:ml-2 shrink-0"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {openStatusEmp === emp.id && (
                        <div onClick={e => e.stopPropagation()}
                          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[130px] p-2 rounded-2xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in duration-200">
                          {Object.entries(PILL_STYLES).map(([k, v]) => (
                            <button key={k} onClick={() => { 
                              if (k !== log.status) {
                                setPendingStatusChange({ empId: emp.id, status: k, oldStatus: log.status, empName: emp.name })
                              }
                              setOpenStatusEmp(null) 
                            }}
                              className="block w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all hover:bg-muted mb-1 last:mb-0"
                              style={{
                                background: k === log.status ? v.bg : 'transparent',
                                color: k === log.status ? v.color : 'var(--foreground)',
                              }}>
                              {k}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <GlassTimePicker
        isOpen={!!activePicker}
        setIsOpen={(open) => !open && setActivePicker(null)}
        time={activePicker?.current}
        onTimeChange={handleTimeChange}
        label={activePicker?.field === 'checkIn' ? 'Check In Time' : 'Check Out Time'}
      />

      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Icon name="warning" className="h-5 w-5 text-amber-500" size={20}/>
              Change Attendance Status?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the attendance status for <strong>{pendingStatusChange?.empName}</strong> from <span className="font-semibold text-foreground">{pendingStatusChange?.oldStatus}</span> to <span className="font-semibold text-foreground">{pendingStatusChange?.status}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStatusChange} 
              variant="default"
              className="!bg-[#10b981] hover:!bg-[#059669] !text-white border-0 shadow-md"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  )
}
