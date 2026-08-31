import { useState, useEffect, useCallback } from 'react'
import { getMon, addDays } from '../services/attendance.js'

export function useRoster(roster, setRoster, shiftTemplates, employees) {
  const [weekStart, setWeekStart] = useState(() => getMon(0))
  const [openRosterEmp, setOpenRosterEmp] = useState(null)
  const [openRosterDate, setOpenRosterDate] = useState(null)

  const closeAll = useCallback(() => { setOpenRosterEmp(null); setOpenRosterDate(null) }, [])

  useEffect(() => {
    if (openRosterEmp === null) return
    document.addEventListener('click', closeAll)
    return () => document.removeEventListener('click', closeAll)
  }, [openRosterEmp, closeAll])

  const goBack = () => setWeekStart(addDays(weekStart, -7))
  const goNext = () => setWeekStart(addDays(weekStart, 7))

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const assign = (empId, dateStr, templateId) => {
    setRoster(prev => [...prev.filter(r => !(r.employeeId === empId && r.date === dateStr)), { employeeId: empId, date: dateStr, templateId }])
  }

  const copyPrevWeek = () => {
    const prevStart = addDays(weekStart, -7)
    const prevDates = Array.from({ length: 7 }, (_, i) => addDays(prevStart, i))
    const curSet = new Set(weekDates)
    const entries = []
    employees.forEach(emp => {
      for (let i = 0; i < 7; i++) {
        const p = (roster || []).find(r => r.employeeId === emp.id && r.date === prevDates[i])
        if (p) entries.push({ employeeId: emp.id, date: weekDates[i], templateId: p.templateId })
      }
    })
    return { entries, curSet }
  }

  return {
    weekStart, setWeekStart,
    weekDates, labels, assign, copyPrevWeek, goBack, goNext,
    openRosterEmp, setOpenRosterEmp, openRosterDate, setOpenRosterDate,
    closeAll
  }
}
