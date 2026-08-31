import { useAttendanceLogs } from '../../hooks/useAttendanceLogs.js'
import { PILL_STYLES } from '../../services/attendance.js'
import { formatDateShort } from '../../services/date.js'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Check, User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

const z = (v) => v < 10 ? `0${v}` : `${v}`

export default function DailyLogs({ employees, attendance, setAttendance, addToast }) {
  const {
    selectedDate, setSelectedDate, showDatePicker, setShowDatePicker,
    calYear, setCalYear, calMonth, setCalMonth,
    logs, setLog, markAll, openStatusEmp, setOpenStatusEmp,
    calDaysInMonth, calFirstDow, calGrid, selNum, selMonth, selYear,
  } = useAttendanceLogs(attendance, setAttendance, addToast)

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex justify-between items-center flex-wrap gap-3 pb-4">
          <div className="flex items-center gap-3 relative">
            <Button variant="outline" className="rounded-full" onClick={(e) => { e.stopPropagation(); setShowDatePicker(v => !v); setCalYear(selYear); setCalMonth(selMonth) }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <CalendarDays size={16} className="opacity-60" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            {showDatePicker && (
              <div onClick={e => e.stopPropagation()}
                className="absolute top-full left-0 z-50 w-[280px] p-4 mt-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} aria-label="Previous month">
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="font-semibold text-sm text-foreground">
                    {new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} aria-label="Next month">
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <span key={d} className="font-medium text-xs py-1 text-muted-foreground">{d}</span>
                  ))}
                  {calGrid.map((d, i) => (
                    d === null ? <div key={i} /> : (
                      <button key={i} aria-label={`${calYear}-${z(calMonth+1)}-${z(d)}`} onClick={() => { setSelectedDate(`${calYear}-${z(calMonth+1)}-${z(d)}`); setShowDatePicker(false) }}
                        className={`size-8 rounded-full mx-auto text-sm transition-colors
                          ${d === selNum && calMonth === selMonth && calYear === selYear
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'}`}>
                        {d}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => markAll(employees)}>
            <Plus size={15} /> Mark All Present
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Employee</TableHead>
                <TableHead className="text-center w-[140px]">Check In</TableHead>
                <TableHead className="text-center w-[140px]">Check Out</TableHead>
                <TableHead className="text-center w-[80px]">Hours</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="max-h-[520px] overflow-y-auto">
            <Table>
              <TableBody>
                {employees.map(emp => {
                  const log = logs[emp.id] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }
                  const ps = PILL_STYLES[log.status] || PILL_STYLES.Absent
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="w-[200px]">
                        <div className="flex items-center gap-3 w-[250px]">
                          <Avatar className="size-7 shrink-0">
                            {emp.avatar ? <AvatarImage src={emp.avatar} alt={emp.name} className="object-cover" /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary"><User size={14} /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center w-[140px]">
                        <input aria-label={`Check-in time for ${emp.name}`} type="text" value={log.checkIn} onChange={e => setLog(emp.id, { [e.target.name]: e.target.value })} name="checkIn"
                          className="w-[90px] text-center h-8 rounded-md border border-input bg-background px-2 text-sm"
                          placeholder="09:00 AM"
                        />
                      </TableCell>
                      <TableCell className="text-center w-[140px]">
                        <input aria-label={`Check-out time for ${emp.name}`} type="text" value={log.checkOut} onChange={e => setLog(emp.id, { [e.target.name]: e.target.value })} name="checkOut"
                          className="w-[90px] text-center h-8 rounded-md border border-input bg-background px-2 text-sm"
                          placeholder="06:00 PM"
                        />
                      </TableCell>
                      <TableCell className="text-center w-[80px]">
                        <span className="tabular-nums font-semibold text-foreground">{log.hours}</span>
                      </TableCell>
                      <TableCell className="w-[160px]">
                        <div className="relative">
                          <button role="status" onClick={(e) => { e.stopPropagation(); setOpenStatusEmp(v => v === emp.id ? null : emp.id) }}
                            className="inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-semibold"
                            style={{ background: ps.bg, color: ps.color, border: 'none' }}>
                            {log.status}
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-70"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          {openStatusEmp === emp.id && (
                            <div onClick={e => e.stopPropagation()}
                              className="absolute left-0 z-50 min-w-[140px] p-1.5 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
                              style={{ top: 'calc(100% + 4px)' }}>
                              {Object.entries(PILL_STYLES).map(([k, v]) => (
                                <button key={k} onClick={() => { setLog(emp.id, { status: k }); setOpenStatusEmp(null) }}
                                  className="block w-full px-3 py-2 rounded-full text-xs font-semibold text-left transition-colors hover:bg-accent"
                                  style={{
                                    background: k === log.status ? v.bg : undefined,
                                    color: k === log.status ? v.color : undefined,
                                  }}>
                                  {k}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => addToast('Daily logs saved.', 'success')}>
            <Check size={16} /> Save Daily Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
