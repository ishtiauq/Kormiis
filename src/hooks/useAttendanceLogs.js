import { useState, useEffect, useCallback } from 'react'
import { toLocal, parseMin, fmtH } from '../services/attendance.js'

export function useAttendanceLogs(attendance, setAttendance, addToast) {
  const [selectedDate, setSelectedDate] = useState(() => toLocal(new Date()))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [openStatusEmp, setOpenStatusEmp] = useState(null)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  const closeAll = useCallback(() => { setShowDatePicker(false); setOpenStatusEmp(null) }, [])

  useEffect(() => {
    if (!showDatePicker && openStatusEmp === null) return
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [showDatePicker, openStatusEmp, closeAll])

  const logs = attendance?.dailyLogs?.[selectedDate] || {}

  const setLog = (empId, upd) => {
    const cur = logs[empId] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }
    const next = { ...cur, ...upd }
    if (next.checkIn !== '--' && next.checkOut !== '--') {
      const a = parseMin(next.checkIn), b = parseMin(next.checkOut)
      if (a !== null && b !== null) {
        let d = b - a; if (d < 0) d += 1440
        next.hours = fmtH(d)
        if (cur.status === 'Off Duty' || cur.status === 'No-Show' || cur.status === 'Absent' || cur.status === '--') {
          next.status = 'In Office'
        }
      }
    }
    setAttendance(prev => ({ ...prev, dailyLogs: { ...prev.dailyLogs, [selectedDate]: { ...logs, [empId]: next } } }))
  }

  const markAll = (employees) => {
    const now = new Date()
    const time = `${z(now.getHours())}:${z(now.getMinutes())}`
    setAttendance(prev => {
      const updated = { ...prev, dailyLogs: { ...prev.dailyLogs, [selectedDate]: { ...logs } } }
      employees.forEach(emp => {
        if (!updated.dailyLogs[selectedDate][emp.id]) {
          updated.dailyLogs[selectedDate][emp.id] = { status: 'In Office', checkIn: time, checkOut: '--', hours: '0.0' }
        }
      })
      return updated
    })
    addToast(`Marked all team members as In Office (${time})`, 'success')
  }

  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calFirstDow = new Date(calYear, calMonth, 1).getDay()
  const calGrid = []
  for (let i = 0; i < calFirstDow; i++) calGrid.push(null)
  for (let d = 1; d <= calDaysInMonth; d++) calGrid.push(d)
  while (calGrid.length % 7 !== 0) calGrid.push(null)

  const selNum = parseInt(selectedDate.split('-')[2], 10)
  const selMonth = parseInt(selectedDate.split('-')[1], 10) - 1
  const selYear = parseInt(selectedDate.split('-')[0], 10)

  return {
    selectedDate, setSelectedDate, showDatePicker, setShowDatePicker,
    calYear, setCalYear, calMonth, setCalMonth,
    logs, setLog, markAll, openStatusEmp, setOpenStatusEmp,
    calDaysInMonth, calFirstDow, calGrid, selNum, selMonth, selYear,
    closeAll
  }
}

const z = (v) => v < 10 ? `0${v}` : `${v}`
