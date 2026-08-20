import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectItem } from "@/components/ui/select"

export default function ClockWidget({ employees, attendance, setAttendance, addToast }) {
  const today = toLocal(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockEmpId, setClockEmpId] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const logs = attendance?.dailyLogs?.[today] || {}
  const empLog = clockEmpId ? (logs[clockEmpId] || { status: 'Absent', checkIn: '--', checkOut: '--', hours: '0.0' }) : null

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const handleCheckIn = () => {
    if (!clockEmpId) return
    const now = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    setAttendance(prev => ({
      ...prev,
      dailyLogs: {
        ...prev.dailyLogs,
        [today]: {
          ...(prev.dailyLogs?.[today] || {}),
          [clockEmpId]: {
            status: 'Present',
            checkIn: now,
            checkOut: empLog?.checkOut || '--',
            hours: empLog?.hours || '0.0'
          }
        }
      }
    }))
    addToast?.('Check-in recorded for today', 'success')
  }

  const handleCheckOut = () => {
    if (!clockEmpId || !empLog || empLog.checkIn === '--') return
    const now = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const ci = parseMin(empLog.checkIn)
    const co = parseMin(now)
    let h = '0.0'
    if (ci !== null && co !== null) {
      let d = co - ci; if (d < 0) d += 1440
      h = fmtH(d)
    }
    setAttendance(prev => ({
      ...prev,
      dailyLogs: {
        ...prev.dailyLogs,
        [today]: {
          ...(prev.dailyLogs?.[today] || {}),
          [clockEmpId]: { ...empLog, checkOut: now, hours: h }
        }
      }
    }))
    addToast?.('Check-out recorded for today', 'success')
  }

  const canCheckIn = clockEmpId && (!empLog || empLog.checkIn === '--')
  const canCheckOut = clockEmpId && empLog && empLog.checkIn !== '--' && empLog.checkOut === '--'

  return (
    <Card className="glass-kormiis border border-border/80 dark:border-white/12 shadow-lg">
      <CardContent className="flex items-center justify-between flex-wrap gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-0.5">
          <span aria-live="polite" role="timer" className="text-[30px] font-black tabular-nums leading-[1.2] tracking-tight text-foreground dark:text-white drop-shadow-xs">
            {timeStr}
          </span>
          <span className="text-xs font-semibold text-muted-foreground dark:text-white/60">
            {dateStr}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={clockEmpId} onChange={setClockEmpId} placeholder="- Select employee -">
            {employees.map(emp => (
              <SelectItem key={emp.id} id={emp.id}>{emp.name}</SelectItem>
            ))}
          </Select>

          <Button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className={`rounded-full px-4 sm:px-6 font-bold shadow-sm transition-all ${
              canCheckIn 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 active:scale-95' 
                : ''
            }`}
          >
            <Icon name="schedule" size={15}/> Check In
          </Button>

          <Button
            variant="outline"
            onClick={handleCheckOut}
            disabled={!canCheckOut}
            className={`rounded-full px-4 sm:px-6 font-bold transition-all ${
              canCheckOut 
                ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95' 
                : 'dark:border-white/10 dark:text-white/40'
            }`}
          >
            Check Out
          </Button>

          {clockEmpId && empLog && empLog.checkIn !== '--' && (
            <div role="status" className="text-xs flex items-center gap-2 whitespace-nowrap bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 px-3 py-1.5 rounded-full text-muted-foreground">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">In: {empLog.checkIn}</span>
              {empLog.checkOut !== '--' && (
                <>
                  <span className="opacity-30">|</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">Out: {empLog.checkOut}</span>
                  <span className="opacity-30">|</span>
                  <span className="font-extrabold text-foreground dark:text-white">{empLog.hours}h</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
