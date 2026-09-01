import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRoster } from '../../hooks/useRoster.js'
import { addDays } from '../../services/attendance.js'
import { formatDateShort } from '../../services/date.js'
import Icon from "@/components/ui/Icon.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import ShiftTemplatesModal, { SHIFT_COLOR_PALETTE } from './ShiftTemplatesModal.jsx'

export default function RosterPlanner({ employees, roster, setRoster, shiftTemplates, setShiftTemplates, addToast }) {
  const {
    weekStart, setWeekStart,
    weekDates, labels, assign, copyPrevWeek, goBack, goNext,
    openRosterEmp, setOpenRosterEmp, openRosterDate, setOpenRosterDate,
    closeAll
  } = useRoster(roster, setRoster, shiftTemplates, employees)

  const [menuRect, setMenuRect] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)

  const colorFor = (t, i) => t?.color || SHIFT_COLOR_PALETTE[i % SHIFT_COLOR_PALETTE.length]

  const closeMenu = () => { setOpenRosterEmp(null); setOpenRosterDate(null); setMenuRect(null) }

  useEffect(() => {
    if (!menuRect) return
    const onScroll = () => closeMenu()
    const onResize = () => closeMenu()
    const onKey = (e) => { if (e.key === 'Escape') closeMenu() }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuRect])

  const handleToggle = (e, empId, d) => {
    e.stopPropagation()
    if (openRosterEmp === empId && openRosterDate === d) {
      closeMenu()
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setOpenRosterEmp(empId)
      setOpenRosterDate(d)
      setMenuRect({ top: rect.top, bottom: rect.bottom, centerX: rect.left + rect.width / 2 })
    }
  }

  const assignWithRestCheck = (empId, dateStr, templateId) => {
    if (templateId !== 'Off') {
      const prevDate = addDays(dateStr, -1)
      const pe = (roster || []).find(r => r.employeeId === empId && r.date === prevDate)
      if (pe && pe.templateId !== 'Off') {
        const pt = (shiftTemplates || []).find(t => t.id === pe.templateId)
        const ct = (shiftTemplates || []).find(t => t.id === templateId)
        if (pt && ct) {
          const peh = parseInt(pt.end.split(':')[0])
          const csh = parseInt(ct.start.split(':')[0])
          let rest = csh - peh; if (rest < 0) rest += 24
          if (rest < 8) addToast(`Less than 8h rest for ${employees.find(e=>e.id===empId)?.name}`, 'warning')
        }
      }
    }
    assign(empId, dateStr, templateId)
  }

  const handleCopyPrev = () => {
    const { entries, curSet } = copyPrevWeek()
    if (entries.length === 0) return addToast('No shifts found in the previous week to copy.', 'warning')
    setRoster(prev => [...prev.filter(r => !curSet.has(r.date)), ...entries])
    addToast('Copied previous week roster.', 'success')
  }

  return (
    <>
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex justify-between items-center flex-wrap gap-3 pb-4">
          <h3 className="text-base font-bold m-0 text-foreground">Weekly Roster Planner</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
              <Icon name="add" size={14}/> Add Shift
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyPrev}>
              <Icon name="calendar_month" size={14}/> Copy Prev Week
            </Button>
            <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-background">
              <Button variant="ghost" size="icon" className="size-7" onClick={goBack} aria-label="Previous week">
                <Icon name="chevron_left" size={15}/>
              </Button>
              <span className="text-xs font-semibold px-2 whitespace-nowrap text-foreground">
                {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
              </span>
              <Button variant="ghost" size="icon" className="size-7" onClick={goNext} aria-label="Next week">
                <Icon name="chevron_right" size={15}/>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px] sticky left-0 bg-background">Employee</TableHead>
                  {weekDates.map((d, i) => (
                    <TableHead key={d} className="text-center min-w-[120px]">
                      {labels[i]}<br /><span className="font-normal text-muted-foreground">{formatDateShort(d)}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="w-[160px] sticky left-0 bg-background">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{emp.name}</span>
                      </div>
                    </TableCell>
                    {weekDates.map(d => {
                      const entry = (roster || []).find(r => r.employeeId === emp.id && r.date === d)
                      const tid = entry?.templateId || 'Off'
                      const tmpl = (shiftTemplates || []).find(t => t.id === tid)
                      const tmplIdx = (shiftTemplates || []).findIndex(t => t.id === tid)
                      const cellColor = tmpl ? colorFor(tmpl, tmplIdx) : undefined
                      const isOpen = openRosterEmp === emp.id && openRosterDate === d

                      let menuStyle = null
                      if (isOpen && menuRect) {
                        const itemCount = 1 + (shiftTemplates || []).length
                        const estH = 12 + itemCount * 32
                        const openAbove = menuRect.top >= estH + 8
                        const left = Math.max(8, Math.min(window.innerWidth - 168, menuRect.centerX - 80))
                        menuStyle = openAbove
                          ? { left, width: 160, bottom: window.innerHeight - menuRect.top + 4 }
                          : { left, width: 160, top: menuRect.bottom + 4 }
                      }

                      return (
                        <TableCell key={d} className="text-center p-2 relative">
                          <button aria-label={`${emp.name} - ${tmpl ? tmpl.name : 'Off'}`} onClick={(e) => handleToggle(e, emp.id, d)}
                            className="w-full px-2 py-1.5 rounded-md text-xs font-semibold min-h-8 cursor-pointer flex items-center justify-center gap-1 border border-input"
                            style={{
                              background: cellColor ? `${cellColor}18` : undefined,
                              color: cellColor || 'text-muted-foreground',
                            }}>
                            {tmpl ? tmpl.name : 'Off'}
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none" className="opacity-50"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          {isOpen && menuStyle && createPortal(
                            <div onClick={e => e.stopPropagation()} role="menu"
                              className="fixed z-[100] p-1.5 rounded-xl border border-border glass-kormiis text-popover-foreground shadow-xl"
                              style={menuStyle}>
                              <button key="Off" aria-label="Set as off" onClick={() => { assignWithRestCheck(emp.id, d, 'Off'); closeMenu() }}
                                className="block w-full px-2.5 py-1.5 rounded-full text-xs font-semibold text-center transition-colors hover:bg-accent"
                                style={{
                                  background: tid === 'Off' ? '#6c757d' : undefined,
                                  color: tid === 'Off' ? '#fff' : undefined,
                                }}>
                                Off
                              </button>
                              {(shiftTemplates || []).map((t, i) => (
                                <button key={t.id} aria-label={`Set shift: ${t.name}`} onClick={() => { assignWithRestCheck(emp.id, d, t.id); closeMenu() }}
                                  className="block w-full px-2.5 py-1.5 rounded-full text-xs font-semibold text-center transition-colors hover:bg-accent"
                                  style={{
                                    background: tid === t.id ? colorFor(t, i) : undefined,
                                    color: tid === t.id ? '#fff' : undefined,
                                  }}>
                                  {t.name}
                                </button>
                              ))}
                            </div>,
                            document.body
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      </Card>
      <ShiftTemplatesModal open={manageOpen} onOpenChange={setManageOpen} shiftTemplates={shiftTemplates} setShiftTemplates={setShiftTemplates} addToast={addToast} />
    </>
  )
}
