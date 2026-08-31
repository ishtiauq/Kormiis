import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
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
    <Card>
      <CardContent className="flex items-center justify-between flex-wrap gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-0.5">
          <span aria-live="polite" role="timer" className="text-[30px] font-bold tabular-nums leading-[1.2] tracking-[0.02em] text-foreground">
            {timeStr}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {dateStr}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={clockEmpId} onChange={setClockEmpId} placeholder="— Select employee —">
            {employees.map(emp => (
              <SelectItem key={emp.id} id={emp.id}>{emp.name}</SelectItem>
            ))}
          </Select>

          <Button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className="rounded-full px-4 sm:px-6"
            style={{ background: canCheckIn ? '#28a745' : undefined }}
          >
            <Clock size={15} /> Check In
          </Button>

          <Button
            variant="outline"
            onClick={handleCheckOut}
            disabled={!canCheckOut}
            className="rounded-full px-4 sm:px-6 border-2"
            style={{ borderColor: canCheckOut ? '#dc3545' : undefined, color: canCheckOut ? '#dc3545' : undefined }}
          >
            Check Out
          </Button>

          {clockEmpId && empLog && empLog.checkIn !== '--' && (
            <span role="status" className="text-xs flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
              <span className="font-semibold" style={{ color: '#28a745' }}>In: {empLog.checkIn}</span>
              {empLog.checkOut !== '--' && (
                <><span className="opacity-30">|</span><span className="font-semibold" style={{ color: '#dc3545' }}>Out: {empLog.checkOut}</span><span className="opacity-30">|</span><span className="font-semibold text-foreground">{empLog.hours}h</span></>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
