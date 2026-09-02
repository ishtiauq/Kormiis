import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectItem } from "@/components/ui/select"

export default function ClockWidget({ employees = [], attendance = {}, setAttendance, addToast }) {
  const today = toLocal(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockEmpId, setClockEmpId] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const logs = attendance?.dailyLogs?.[today] || {}
  const empLog = clockEmpId ? (logs[clockEmpId] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }) : null

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const handleCheckIn = () => {
    if (!clockEmpId) return
    const now = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    setAttendance(prev => ({
      ...prev,
      dailyLogs: {
        ...(prev?.dailyLogs || {}),
        [today]: {
          ...(prev?.dailyLogs?.[today] || {}),
          [clockEmpId]: {
            status: 'In Office',
            checkIn: now,
            checkOut: empLog?.checkOut || '--',
            hours: empLog?.hours || '0.0'
          }
        }
      }
    }))
    addToast?.('Check-in recorded for today (In Office)', 'success')
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
        ...(prev?.dailyLogs || {}),
        [today]: {
          ...(prev?.dailyLogs?.[today] || {}),
          [clockEmpId]: { ...empLog, checkOut: now, hours: h }
        }
      }
    }))
    addToast?.('Check-out recorded for today', 'success')
  }

  const canCheckIn = clockEmpId && (!empLog || empLog.checkIn === '--')
  const canCheckOut = clockEmpId && empLog && empLog.checkIn !== '--' && empLog.checkOut === '--'

  return (
    <Card className="glass-kormiis border border-white/30 dark:border-white/12 shadow-xl rounded-3xl p-0">
      <CardContent className="flex items-center justify-between flex-wrap gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-3.5">
          <Icon name="schedule" className="text-foreground shrink-0" size={38}/>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span aria-live="polite" role="timer" className="text-2xl sm:text-3xl font-black tabular-nums leading-tight tracking-tight text-foreground">
                {timeStr}
              </span>
              <span className="pulse-dot pulse-dot-orange m-0"></span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-0.5">
              {dateStr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select 
            value={clockEmpId} 
            onChange={(key) => setClockEmpId(key)} 
            placeholder="- Select employee -"
            className="min-w-[170px]"
          >
            {(employees || []).map(emp => (
              <SelectItem key={emp.id} id={emp.id} value={emp.id} textValue={emp.name}>{emp.name}</SelectItem>
            ))}
          </Select>

          <Button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className={`rounded-full px-5 h-11 font-bold shadow-md transition-all cursor-pointer ${
              canCheckIn 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20 active:scale-95' 
                : 'opacity-50'
            }`}
          >
            <Icon name="login" size={15}/> Check In
          </Button>

          <Button
            variant="outline"
            onClick={handleCheckOut}
            disabled={!canCheckOut}
            className={`rounded-full px-5 h-11 font-bold transition-all cursor-pointer ${
              canCheckOut 
                ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95' 
                : 'opacity-50'
            }`}
          >
            <Icon name="logout" size={15}/> Check Out
          </Button>

          {clockEmpId && empLog && empLog.checkIn !== '--' && (
            <div role="status" className="text-xs flex items-center gap-2 whitespace-nowrap bg-white/60 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-3.5 py-2.5 rounded-full text-muted-foreground shadow-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">In: {empLog.checkIn}</span>
              {empLog.checkOut !== '--' && (
                <>
                  <span className="opacity-30">|</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">Out: {empLog.checkOut}</span>
                  <span className="opacity-30">|</span>
                  <span className="font-extrabold text-foreground">{empLog.hours}h</span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
