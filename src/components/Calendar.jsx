import { useState } from 'react'
import { useModal } from '../services/useModal.js'
import Icon from "@/components/ui/Icon.jsx"
import { useConfirm } from '../hooks/useConfirm'
import AdSlot from './AdSlot'
import { formatDate } from '../services/date.js'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"

const EVENT_TYPES = [
  { id: 'meeting', label: 'Meeting', icon: <Icon name="group" size={14}/>, color: '#3b82f6' },
  { id: 'holiday', label: 'Holiday', icon: <Icon name="calendar_month" size={14}/>, color: '#10b981' },
  { id: 'birthday', label: 'Birthday', icon: <Icon name="redeem" size={14}/>, color: '#f59e0b' },
  { id: 'deadline', label: 'Deadline', icon: <Icon name="warning" size={14}/>, color: '#ef4444' },
  { id: 'other', label: 'Other', icon: <Icon name="description" size={14}/>, color: '#8b5cf6' },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar({ events, setEvents, employees, addLog, addToast, currentUser, addNotification }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [viewMode, setViewMode] = useState('month')

  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formType, setFormType] = useState('meeting')
  const [formDescription, setFormDescription] = useState('')
  useModal(() => { setShowEventModal(false); resetForm() })

  const { confirm, ConfirmDialog } = useConfirm()

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDate('')
    setFormTime('')
    setFormType('meeting')
    setFormDescription('')
    setEditingEvent(null)
  }

  const openCreateModal = (date) => {
    const dateStr = date || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
    resetForm()
    setFormDate(dateStr)
    setShowEventModal(true)
  }

  const openEditModal = (event) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormDate(event.date)
    setFormTime(event.time || '')
    setFormType(event.type)
    setFormDescription(event.description || '')
    setShowEventModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formTitle || !formDate) return addToast('Title and date are required', 'warning')

    if (editingEvent) {
      setEvents(prev => prev.map(ev =>
        ev.id === editingEvent.id
          ? { ...ev, title: formTitle, date: formDate, time: formTime, type: formType, description: formDescription }
          : ev
      ))
      addToast('Event updated', 'success')
      addLog('Event Updated', `${formTitle} on ${formDate}`)
      if (addNotification) addNotification(`Company event updated: "${formTitle}" on ${formDate}`)
    } else {
      const newEvent = {
        id: `evt-${Date.now()}`,
        title: formTitle,
        date: formDate,
        time: formTime,
        type: formType,
        description: formDescription,
        createdBy: currentUser?.id || 'unknown',
        createdAt: new Date().toISOString(),
      }
      setEvents(prev => [...prev, newEvent])
      addToast('Event created', 'success')
      addLog('Event Created', `${formTitle} on ${formDate}`)
      if (addNotification) addNotification(`New company event scheduled: "${formTitle}" on ${formDate}`)
    }

    setShowEventModal(false)
    resetForm()
  }

  const handleDelete = async (id) => {
    const ok = await confirm('This event will be permanently removed.', 'Delete Event?', { destructive: true })
    if (!ok) return
    setEvents(prev => prev.filter(ev => ev.id !== id))
    addToast('Event deleted', 'info')
  }

  const birthdayEvents = (employees || [])
    .filter(emp => emp.dob)
    .map(emp => {
      const dobDate = new Date(emp.dob)
      const month = String(dobDate.getMonth() + 1).padStart(2, '0')
      const day = String(dobDate.getDate()).padStart(2, '0')
      return {
        id: `bday-${emp.id}`,
        title: `${emp.name}'s Birthday \u{1F382}`,
        date: `${currentYear}-${month}-${day}`,
        type: 'birthday',
        description: `Wish ${emp.name} a happy birthday!`,
        isAuto: true
      }
    })

  const allEvents = [...events, ...birthdayEvents]

  const getEventsForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allEvents.filter(ev => ev.date === dateStr)
  }

  const getTypeInfo = (typeId) => EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[4]

  const upcomingEvents = [...allEvents]
    .filter(ev => ev.date >= `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  const filteredEvents = selectedDate
    ? allEvents.filter(ev => ev.date === selectedDate)
    : allEvents.filter(ev => {
        const d = new Date(ev.date + 'T00:00:00')
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })

  const renderCalendarGrid = () => (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" className="size-8 sm:size-10" onClick={prevMonth} aria-label="Previous month">
              <Icon name="chevron_left" size={18}/>
            </Button>
            <h2 className="text-base sm:text-lg font-bold m-0 min-w-[140px] sm:min-w-[180px] text-center text-foreground">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="outline" size="icon" className="size-8 sm:size-10" onClick={nextMonth} aria-label="Next month">
              <Icon name="chevron_right" size={18}/>
            </Button>
          </div>
          {(currentUser?.role === 'Admin' || currentUser?.permissions?.includes('approve_leaves')) && (
            <Button className="w-full sm:w-auto" onClick={() => openCreateModal(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)}>
              <Icon name="add" className="mr-1.5" size={16}/> Add Event
            </Button>
          )}
        </div>

        <div role="grid" aria-label="Calendar" className="grid grid-cols-7 gap-1 text-center">
          {DAYS.map(d => (
            <div key={d} role="columnheader" className="py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDate(day)
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day
            const isSelected = selectedDate === dateStr
            return (
              <div key={day}
                role="gridcell"
                aria-label={`${MONTHS[currentMonth]} ${day}, ${currentYear}`}
                onClick={() => setSelectedDate(dateStr)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(dateStr) } }}
                tabIndex={0}
                className={`flex flex-col items-center gap-1 p-1 sm:p-2 cursor-pointer min-h-[48px] sm:min-h-[64px] rounded-lg transition-colors
                  ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-accent' : 'hover:bg-accent/50'}`}
                style={{
                  border: isToday && !isSelected ? '1px solid hsl(var(--primary))' : 'none',
                }}
              >
                <span className="text-sm" style={{ fontWeight: isToday ? 800 : 600 }}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map(ev => {
                      return <div key={ev.id} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    })}
                    {dayEvents.length > 3 && <span className="text-[0.6rem] text-muted-foreground">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  const renderEventList = () => (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <h3 className="text-lg font-bold m-0 mb-4 flex items-center gap-2 text-foreground">
          <Icon name="calendar_month" className="text-primary" size={18}/>
          {selectedDate ? `Events on ${formatDate(selectedDate)}` : "This Month's Events"}
        </h3>

        {filteredEvents.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            {selectedDate ? 'No events on this day' : 'No events this month'}
          </p>
        ) : (
          <div role="list" className="flex flex-col gap-2">
            {filteredEvents.map(ev => {
              const typeInfo = getTypeInfo(ev.type)
              return (
                <div key={ev.id} role="listitem" className="flex items-start gap-3 p-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-center shrink-0 size-9 rounded-lg text-muted-foreground">
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{ev.title}</span>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border text-muted-foreground">{typeInfo.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <Icon name="calendar_month" size={12}/> {formatDate(ev.date)}
                          </span>
                          {ev.time && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              <Icon name="schedule" size={12}/> {ev.time}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-fluid-xs m-0 mt-1.5 text-muted-foreground">{ev.description}</p>
                        )}
                      </div>
                      {!ev.isAuto && (currentUser?.role === 'Admin' || currentUser?.permissions?.includes('approve_leaves')) && (
                        <div className="flex items-center gap-1 shrink-0 -mr-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditModal(ev)} aria-label="Edit event">
                            <Icon name="edit" size={14}/>
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.id)} aria-label="Delete event">
                            <Icon name="delete" size={14}/>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-fluid-xl font-bold tracking-tight flex items-center gap-2.5 headline-gradient">
          <Icon name="calendar_month" className="text-foreground" size={20}/>
          Events
        </h1>
      </div>
      <div className="border-t border-border border-headline" />

      <div className={`grid gap-6 items-start ${selectedDate ? 'grid-cols-1 xl:grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
        {renderCalendarGrid()}
        {selectedDate && renderEventList()}
      </div>

      {!selectedDate && (
        <div>{renderEventList()}</div>
      )}



      <Dialog open={showEventModal} onOpenChange={(open) => { if (!open) { setShowEventModal(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Title *</label>
              <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Event title" aria-label="Event title"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Date *" required value={formDate} onChange={e => setFormDate(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Time</label>
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} aria-label="Event time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Type</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_TYPES.map(t => {
                  const isActive = formType === t.id
                  return (
                    <button key={t.id} type="button" onClick={() => setFormType(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${isActive ? 'border-2' : 'border border-input'}`}
                      style={{
                        borderColor: isActive ? t.color : undefined,
                        background: isActive ? `${t.color}15` : undefined,
                        color: isActive ? t.color : undefined,
                      }}>
                      {t.icon} {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Description</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="Event description (optional)" aria-label="Event description"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y" />
            </div>
            <DialogFooter className="flex gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => { setShowEventModal(false); resetForm() }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
      <AdSlot />
    </div>
  )
}
