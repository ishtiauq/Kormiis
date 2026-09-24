import { useState, useEffect, useMemo, useRef } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
import {
  getCurrentPositionRobust,
  watchPositionRobust,
  getDistanceFromLatLonInMeters,
  getGeoMessage,
  GEO_REASON,
} from '../../services/geolocation.js'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import SlideToConfirmButton from './SlideToConfirmButton.jsx'

// Desktop/laptop browsers locate themselves via network (Wi-Fi/IP) positioning
// which can be off by hundreds of metres. We accept a check-in when the
// reported distance falls inside the device's own accuracy circle, capped so a
// wildly inaccurate IP-only fix cannot bypass the geofence entirely.
const ACCURACY_TOLERANCE_CAP = 500

// Pretty long-form date for the live clock hero.
const formatLongDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export default function GeoCheckInWidget({ 
  currentUser, 
  attendance, 
  setAttendance, 
  addToast, 
  settings, 
  notes = [], 
  setNotes, 
  cardClassName = '',
  roster = [],
  shiftTemplates = [],
  setCurrentView,
  myLogsTarget = 'attendance'
}) {
  const today = toLocal(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Use settings or fallback to default
  const officeLat = settings?.officeLocation?.lat ?? 23.8103
  const officeLng = settings?.officeLocation?.lng ?? 90.4125
  const maxDistance = settings?.officeLocation?.radius ?? 100
  
  const [isLoadingLoc, setIsLoadingLoc] = useState(false)
  const [gpsPhase, setGpsPhase] = useState('idle') // 'idle' | 'acquiring' | 'verifying' | 'outside'
  
  // Success Message State
  const [successMsg, setSuccessMsg] = useState(null)
  // Out of Geofence Warning Modal State
  const [outOfBoundsModal, setOutOfBoundsModal] = useState({ open: false, dist: 0, max: maxDistance })
  // Device GPS Off / Location Permission Required Modal State
  const [gpsDisabledModal, setGpsDisabledModal] = useState({ open: false, reason: null })
  
  // Ensure current user is valid (defaults to 'emp-101' for demo mode)
  const empId = currentUser?.employeeId || currentUser?.id || 'emp-101'

  // Latest fix from the live watcher, kept in a ref so actions can reuse it
  // instantly without forcing a slow brand-new reading.
  const lastFixRef = useRef(null)
  const LIVE_FIX_FRESH_MS = 120000

  const storeFix = (lat, lng, accuracy) => {
    lastFixRef.current = { lat, lng, accuracy, at: Date.now() }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-detect and watch location continuously so distance updates in
  // real-time. The robust watcher transparently downgrades from GPS to network
  // positioning on devices (desktops/laptops) without a GPS chip.
  useEffect(() => {
    const applyPosition = (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const acc = Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null
      storeFix(lat, lng, acc)
    }

    const stop = watchPositionRobust(
      applyPosition,
      () => {},
      { highAccuracy: true, timeout: 20000, maximumAge: 10000 }
    )

    return stop
  }, [officeLat, officeLng])

  const logs = attendance?.dailyLogs?.[today] || {}
  const empLog = logs[empId] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }

  // Check today's roster schedule for Off Day
  const todayShift = useMemo(() => {
    if (!Array.isArray(roster) || !empId) return null
    return roster.find(r => r.employeeId === empId && r.date === today)
  }, [roster, empId, today])

  const isOffDay = todayShift?.templateId === 'Off' || empLog?.status === 'Day Off' || empLog?.status === 'Off'

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  
  const nowMins = parseMin(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))

  const minutesSince = (t) => {
    const tm = parseMin(t)
    if (tm === null || nowMins === null) return null
    let d = nowMins - tm
    if (d < 0) d += 1440
    return d
  }

  const STANDARD_COOLDOWN_MINS = 15 // Standard limited cooldown time in minutes after clock out

  const cooldownPassed = empLog.checkOut !== '--' && minutesSince(empLog.checkOut) !== null && minutesSince(empLog.checkOut) >= STANDARD_COOLDOWN_MINS

  const canCheckIn = empId && (empLog.checkIn === '--' || cooldownPassed)
  const canCheckOut = empId && empLog.checkIn !== '--' && empLog.checkOut === '--'

  // Format time with 0 instead of '--'
  const displayCheckIn = empLog.checkIn && empLog.checkIn !== '--' ? empLog.checkIn : '0'
  const displayCheckOut = empLog.checkOut && empLog.checkOut !== '--' ? empLog.checkOut : '0'

  // Real-time worked timer calculation (shows 0h 00m instead of '--')
  const workedDurationStr = useMemo(() => {
    if (!empLog || !empLog.checkIn || empLog.checkIn === '--' || empLog.checkIn === '0') {
      return '0h 00m'
    }

    const startMins = parseMin(empLog.checkIn)
    if (startMins === null) return '0h 00m'

    // If already clocked out, show the finalized worked duration from checkIn to checkOut
    if (empLog.checkOut && empLog.checkOut !== '--' && empLog.checkOut !== '0') {
      const endMins = parseMin(empLog.checkOut)
      if (endMins !== null) {
        let diff = endMins - startMins
        if (diff < 0) diff += 1440
        const h = Math.floor(diff / 60)
        const m = diff % 60
        return `${h}h ${String(m).padStart(2, '0')}m`
      }
      if (empLog.hours && empLog.hours !== '0.0') {
        return `${empLog.hours} hrs`
      }
      return '0h 00m'
    }

    // Active working session: timer updates dynamically in real-time
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()
    let elapsedMins = currentMins - startMins
    if (elapsedMins < 0) elapsedMins += 1440
    const h = Math.floor(elapsedMins / 60)
    const m = elapsedMins % 60
    return `${h}h ${String(m).padStart(2, '0')}m`
  }, [empLog, currentTime])

  // Monthly stats calculation (current calendar month)
  const currentMonthPrefix = today.slice(0, 7) // "YYYY-MM"
  const monthlyStats = useMemo(() => {
    let presentDays = 0
    let lateDays = 0
    let noShowDays = 0
    let totalWorkHours = 0
    const dailyLogs = attendance?.dailyLogs || {}

    Object.entries(dailyLogs).forEach(([dateStr, dayObj]) => {
      if (!dateStr.startsWith(currentMonthPrefix)) return
      const log = dayObj?.[empId]
      if (!log) return

      const rawStatus = String(log.status || '').trim()
      const isPresent = rawStatus === 'In Office' || rawStatus === 'Remote' || rawStatus === 'On-Field' || rawStatus === 'Present'
      const isLate = rawStatus === 'Late' || log.isLate === true
      const isNoShow = rawStatus === 'No-Show' || rawStatus === 'No Show'

      if (isPresent || isLate) {
        presentDays++
      }
      if (isLate) {
        lateDays++
      }
      if (isNoShow) {
        noShowDays++
      }
      const hrs = parseFloat(log.hours || 0)
      if (!isNaN(hrs) && hrs > 0) {
        totalWorkHours += hrs
      }
    })

    // Leaves taken in this month
    const leaves = Array.isArray(attendance?.leaves) ? attendance.leaves : []
    const approvedMyLeaves = leaves.filter(l => 
      l && l.employeeId === empId && l.status === 'Approved' &&
      (l.startDate?.startsWith(currentMonthPrefix) || l.endDate?.startsWith(currentMonthPrefix))
    )
    const leavesCount = approvedMyLeaves.reduce((sum, l) => sum + (Number(l.days) || 1), 0)

    return {
      presentDays,
      lateDays,
      noShowDays,
      leavesCount,
      totalWorkHours: totalWorkHours.toFixed(1)
    }
  }, [attendance, empId, currentMonthPrefix])

  const cooldownRemaining = empLog.checkOut !== '--' && !cooldownPassed ? Math.max(0, STANDARD_COOLDOWN_MINS - (minutesSince(empLog.checkOut) ?? 0)) : 0

  const showSuccessOverlay = (type, time, hoursWorked = null) => {
    setSuccessMsg({ type, time, hoursWorked })
    if (type === 'Check-in') {
      setTimeout(() => {
        setSuccessMsg(null)
      }, 4000)
    }
  }

  const nowStamp = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  // Applies a fix to the UI, caches it and returns the distance to the office.
  const applyFix = (lat, lng, acc) => {
    const rounded = Number.isFinite(acc) ? Math.round(acc) : null
    const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
    storeFix(lat, lng, rounded)
    return dist
  }

  // Prefer the live watcher's recent fix (instant + reliable on every device).
  // Only when it is missing or stale do we request a fresh reading.
  const resolveFix = async () => {
    const live = lastFixRef.current
    if (live && Date.now() - live.at <= LIVE_FIX_FRESH_MS) {
      return { lat: live.lat, lng: live.lng, accuracy: live.accuracy }
    }
    const position = await getCurrentPositionRobust({ highAccuracy: true, timeout: 10000, maximumAge: 0 })
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }
  }

  const refreshLocation = async () => {
    setIsLoadingLoc(true)
    try {
      const position = await getCurrentPositionRobust({ highAccuracy: true, timeout: 10000, maximumAge: 0 })
      applyFix(position.coords.latitude, position.coords.longitude, position.coords.accuracy)
    } catch (err) {
      const live = lastFixRef.current
      if (live) {
        applyFix(live.lat, live.lng, live.accuracy)
        addToast?.('Using your last known location.', 'info')
      } else {
        const reason = err?.reason || GEO_REASON.UNKNOWN
        const msg = getGeoMessage(reason)
        addToast?.(msg.description, 'error')
      }
    } finally {
      setIsLoadingLoc(false)
    }
  }

  const executeActionWithLocation = async (actionCallback) => {
    setIsLoadingLoc(true)
    setGpsPhase('acquiring')

    let fix = null
    try {
      fix = await resolveFix()
    } catch (err) {
      // Last resort: use the most recent live fix even if slightly old.
      const stale = lastFixRef.current
      if (stale) {
        fix = { lat: stale.lat, lng: stale.lng, accuracy: stale.accuracy }
      } else {
        setIsLoadingLoc(false)
        setGpsPhase('idle')
        const reason = err?.reason || GEO_REASON.UNKNOWN
        setGpsDisabledModal({ open: true, reason })
        return
      }
    }

    const dist = applyFix(fix.lat, fix.lng, fix.accuracy)
    const acc = Number.isFinite(fix.accuracy) ? Math.round(fix.accuracy) : null
    // Statistically the office could be anywhere within the accuracy radius of
    // the reported point, so allow distance up to radius + (capped) accuracy.
    const tolerance = acc != null ? Math.min(acc, ACCURACY_TOLERANCE_CAP) : 0
    const allowed = maxDistance + tolerance

    // Phase 2: Verifying GPS geofence match
    setGpsPhase('verifying')
    setTimeout(() => {
      setIsLoadingLoc(false)
      setGpsPhase('idle')
      if (dist <= allowed) {
        const strict = dist <= maxDistance
        if (!strict) {
          addToast?.(`Location accepted using ±${tolerance}m device accuracy.`, 'info')
        }
        actionCallback({ distance: dist, accuracy: acc, tolerance: strict ? 0 : tolerance, strict })
      } else {
        setOutOfBoundsModal({ open: true, dist, max: maxDistance, accuracy: acc, tolerance })
      }
    }, 700)
  }

  const handleCheckIn = () => {
    if (!empId) return
    executeActionWithLocation((geo) => {
      const now = nowStamp()
      setAttendance(prev => ({
        ...prev,
        dailyLogs: {
          ...prev.dailyLogs,
          [today]: {
            ...(prev.dailyLogs?.[today] || {}),
            [empId]: {
              status: 'In Office',
              checkIn: now,
              checkOut: '--',
              hours: '0.0',
              checkInLocation: geo ? { distance: geo.distance, accuracy: geo.accuracy, tolerance: geo.tolerance, strict: geo.strict } : undefined
            }
          }
        }
      }))
      showSuccessOverlay('Check-in', now)
    })
  }

  const handleCheckOut = () => {
    if (!empId || empLog.checkIn === '--') return
    executeActionWithLocation((geo) => {
      const now = nowStamp()
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
            [empId]: {
              ...empLog,
              checkOut: now,
              hours: h,
              checkOutLocation: geo ? { distance: geo.distance, accuracy: geo.accuracy, tolerance: geo.tolerance, strict: geo.strict } : undefined
            }
          }
        }
      }))
      
      // Auto-reset Daily Checklist
      const dailyChecklists = notes.filter(n => (n.ownerId === (currentUser?.id || currentUser?.uid) || !n.ownerId) && n.type === 'list' && n.isDailyChecklist)
      if (dailyChecklists.length > 0 && setNotes) {
        dailyChecklists.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        const activeChecklist = dailyChecklists[0]
        const hasCheckedItems = activeChecklist.items?.some(i => i.done)
        if (hasCheckedItems) {
          const resetItems = activeChecklist.items.map(i => ({ ...i, done: false }))
          const resetNote = { ...activeChecklist, items: resetItems, updatedAt: new Date().toISOString() }
          setNotes(notes.map(n => n.id === resetNote.id ? resetNote : n))
          addToast('Daily Checklist reset for tomorrow.', 'info')
        }
      }

      showSuccessOverlay('Check-out', now, h)
    })
  }

  if (!empId) return null

  const gpsModalMsg = getGeoMessage(gpsDisabledModal.reason)

  return (
    <>
      {/* Out of Office Zone Warning Modal (Ultra-Liquid Glass, No Background Overlay) */}
      <Dialog open={outOfBoundsModal.open} onOpenChange={(open) => setOutOfBoundsModal(prev => ({ ...prev, open }))}>
        <DialogContent 
          overlayClassName="!bg-transparent !backdrop-blur-none"
          dialogClassName="!p-6 sm:!p-8 !border-none !outline-none !shadow-none !bg-transparent"
          style={{ 
            background: 'transparent',
            backdropFilter: 'saturate(190%) blur(32px)', 
            WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
          }}
          className="max-w-[420px] border border-black/15 dark:border-white/20 shadow-none flex flex-col items-center justify-center gap-4 rounded-[28px] outline-none text-center"
        >
          {/* Centered Group: Red Filled Icon and Red Text on the exact same line */}
          <div className="flex items-center justify-center gap-3 w-full">
            <Icon 
              name="wrong_location" 
              size={32} 
              style={{ color: '#ef4444', fontVariationSettings: "'FILL' 1" }}
              className="shrink-0 animate-pulse text-red-500" 
            />
            <DialogTitle 
              style={{ color: '#ef4444' }}
              className="text-xl sm:text-2xl font-black tracking-tight !text-red-500 m-0 leading-none"
            >
              Outside Office Zone
            </DialogTitle>
          </div>
          
          {/* Subheading with breathing room */}
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1 px-2">
            You are currently outside the designated office geofence. Clock-in is restricted to verified office premises.
          </DialogDescription>

          {/* Clean Distance Line with breathing gap, zero inner box */}
          <div className="py-2.5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Current Distance:</span>
            <span className="font-bold font-mono text-destructive text-sm tabular-nums">
              {outOfBoundsModal.dist}m
            </span>
            <span className="opacity-40">·</span>
            <span>Allowed:</span>
            <span className="font-semibold font-mono text-foreground text-sm tabular-nums">
              {outOfBoundsModal.max}m
            </span>
            {outOfBoundsModal.tolerance > 0 && (
              <>
                <span className="opacity-40">+</span>
                <span className="font-semibold font-mono text-foreground text-sm tabular-nums">
                  ±{outOfBoundsModal.tolerance}m
                </span>
              </>
            )}
          </div>
          {outOfBoundsModal.accuracy != null && (
            <p className="-mt-2 text-[11px] text-muted-foreground/80">
              Device location accuracy: ±{outOfBoundsModal.accuracy}m
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-3">
            <button 
              type="button"
              onClick={() => {
                setOutOfBoundsModal(prev => ({ ...prev, open: false }))
                refreshLocation()
              }}
              style={{ 
                background: 'transparent',
                backdropFilter: 'saturate(190%) blur(32px)', 
                WebkitBackdropFilter: 'saturate(190%) blur(32px)',
              }}
              className="flex-1 h-12 min-h-[48px] px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 border border-black/15 dark:border-white/20 text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Icon name="refresh" size={18}/>
              Retry Location
            </button>
            <button 
              type="button"
              onClick={() => setOutOfBoundsModal(prev => ({ ...prev, open: false }))}
              style={{ 
                background: 'transparent',
                backdropFilter: 'saturate(190%) blur(32px)', 
                WebkitBackdropFilter: 'saturate(190%) blur(32px)',
              }}
              className="flex-1 h-12 min-h-[48px] px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center border-2 border-destructive/60 text-destructive hover:bg-destructive/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              Understood
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device GPS Off / Location Required Dialog (MonoGlass Ultra-Liquid Glass) */}
      <Dialog open={gpsDisabledModal.open} onOpenChange={(open) => setGpsDisabledModal(prev => ({ ...prev, open }))}>
        <DialogContent 
          overlayClassName="!bg-transparent !backdrop-blur-none"
          dialogClassName="!p-6 sm:!p-8 !border-none !outline-none !shadow-none !bg-transparent"
          style={{ 
            background: 'transparent',
            backdropFilter: 'saturate(190%) blur(32px)', 
            WebkitBackdropFilter: 'saturate(190%) blur(32px)',
          }}
          className="max-w-[420px] border border-black/15 dark:border-white/20 shadow-none flex flex-col items-center justify-center gap-4 rounded-[28px] outline-none text-center"
        >
          <div className="size-16 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 text-amber-500 mb-1">
            <Icon name="location_off" size={32} className="animate-pulse"/>
          </div>

          <div className="space-y-1.5">
            <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {gpsModalMsg.title}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {gpsModalMsg.description}
            </DialogDescription>
          </div>

          <div 
            style={{ 
              background: 'transparent',
              backdropFilter: 'saturate(190%) blur(32px)', 
              WebkitBackdropFilter: 'saturate(190%) blur(32px)',
            }}
            className="w-full rounded-2xl p-3 border border-black/10 dark:border-white/10 flex items-center gap-3 text-left my-1"
          >
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Icon name="pin_drop" size={17}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">{gpsModalMsg.instructions}</p>
              <p className="text-[11px] text-muted-foreground">
                {gpsDisabledModal.reason === GEO_REASON.PERMISSION_DENIED
                  ? 'Tap the lock icon in the address bar ➔ Site settings ➔ Location ➔ Allow'
                  : 'Phone: swipe down ➔ Location ➔ On  ·  Laptop: enable location services in system settings'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-3">
            <button
              type="button"
              onClick={() => {
                setGpsDisabledModal({ open: false, reason: null })
                refreshLocation()
              }}
              style={{ 
                background: 'transparent',
                backdropFilter: 'saturate(190%) blur(32px)', 
                WebkitBackdropFilter: 'saturate(190%) blur(32px)',
              }}
              className="flex-1 h-12 min-h-[48px] px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 border-2 border-emerald-500/60 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Icon name="refresh" size={18}/>
              Retry Location
            </button>
            <button
              type="button"
              onClick={() => setGpsDisabledModal({ open: false, reason: null })}
              style={{ 
                background: 'transparent',
                backdropFilter: 'saturate(190%) blur(32px)', 
                WebkitBackdropFilter: 'saturate(190%) blur(32px)',
              }}
              className="flex-1 h-12 min-h-[48px] px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center border border-black/15 dark:border-white/20 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!successMsg} onOpenChange={(open) => { if (!open) setSuccessMsg(null) }}>
        <DialogContent className="max-w-[400px] border-border/50 glass-kormiis shadow-none flex flex-col items-center justify-center p-5 sm:p-8 gap-4 rounded-[1rem] outline-none">
          <DialogTitle className="sr-only">Check In Successful</DialogTitle>
          <Icon name={successMsg?.type === 'Check-in' ? "celebration" : "check_circle"} className="text-primary animate-bounce mt-2 sm:mt-4" size={64}/>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground text-center">
            {successMsg?.type} Successful!
          </h2>
          <div className="text-center flex flex-col sm:flex-row sm:flex-nowrap gap-2 w-full mt-1 sm:mt-2">
            <div className="bg-muted/30 py-3 rounded-lg border border-border flex flex-col items-center justify-center flex-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Time Recorded</span>
              <span className="text-foreground font-sans text-lg sm:text-xl font-bold">{successMsg?.time}</span>
            </div>
            
            {successMsg?.hoursWorked && (
              <div className="bg-primary/5 py-3 rounded-lg border border-primary/20 flex flex-col items-center justify-center flex-1">
                <span className="text-xs text-primary/70 uppercase tracking-wider font-semibold mb-1">Total Hours Today</span>
                <span className="text-primary font-sans text-lg sm:text-xl font-bold">{successMsg.hoursWorked} <span className="text-sm">hrs</span></span>
              </div>
            )}
          </div>
          <Button onClick={() => setSuccessMsg(null)} className="w-full mt-2 sm:mt-4 rounded-full h-11 text-base font-semibold shadow-sm">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      <Card className={`overflow-hidden dashboard-widget relative rounded-3xl border border-border/60 dark:border-white/10 ${cardClassName ? cardClassName : 'col-span-full xl:col-span-12'} min-h-0 flex flex-col p-0 isolate`}>
        {/* Header — no headline, just the My Logs action */}
        <CardHeader className="flex-row items-center justify-end px-4 sm:px-5 pt-4 pb-1 space-y-0 gap-3 border-none">
          <button
            onClick={() => setCurrentView && setCurrentView(myLogsTarget)}
            className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0 text-foreground"
          >
            My Logs
          </button>
        </CardHeader>

        {/* Hero: live clock (timer) on top, then the slide-to-confirm control */}
        <div className="flex flex-col items-center gap-3 px-4 sm:px-5 pt-5 pb-5">
          {/* Live clock (timer) */}
          <div className="flex flex-col items-center">
            <span aria-live="polite" role="timer" className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">
              {timeStr}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground mt-1">
              {formatLongDate(currentTime)}
            </span>
          </div>

          {/* Slide-to-confirm action OR cooldown status */}
          {canCheckIn || canCheckOut ? (
            <SlideToConfirmButton
              action={canCheckIn ? 'in' : 'out'}
              busy={isLoadingLoc}
              onConfirm={canCheckIn ? handleCheckIn : handleCheckOut}
              checkIn={displayCheckIn}
              checkOut={displayCheckOut}
            />
          ) : (
            <div className="w-full flex items-center justify-between px-4 h-12 rounded-2xl border border-border/70 dark:border-white/12 bg-black/[0.03] dark:bg-white/[0.04] text-xs">
              <span className="flex items-center gap-2 font-bold text-foreground">
                <Icon name="check_circle" className="shrink-0 text-emerald-600 dark:text-emerald-400" size={17}/>
                Checked Out
              </span>
              <span className="text-[11px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                <Icon name="history_toggle_off" size={13} className="shrink-0"/>
                {cooldownRemaining > 0 ? `Check In available in ${cooldownRemaining}m` : 'No action needed'}
              </span>
            </div>
          )}

          {/* GPS phase feedback (while an action is acquiring/verifying) */}
          {gpsPhase !== 'idle' && (
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Icon name="progress_activity" size={14} className="animate-spin" />
              {gpsPhase === 'acquiring' ? 'Acquiring live GPS…' : 'Verifying GPS…'}
            </span>
          )}
        </div>

        {/* Unified Attendance Content Section */}
        <CardContent className="flex flex-col gap-3.5 p-3.5 sm:p-4 mt-auto">
          {/* Today's worked duration — compact summary line */}
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Icon name="timer" size={14} className="shrink-0 text-foreground" />
              Total worked
            </span>
            <span className="text-base sm:text-lg font-black text-foreground font-mono tabular-nums">
              {workedDurationStr}
            </span>
          </div>

          {isOffDay && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Icon name="event_available" size={14} />
              Off Day (Scheduled in Roster)
            </span>
          )}

          {/* 2. Monthly Attendance Progress Bar Style Representation */}
          <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
            {/* Header with Title and Total Hours */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Report
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                <Icon name="timer" size={13} className="text-primary shrink-0" />
                <span>{monthlyStats.totalWorkHours}h total worked</span>
              </div>
            </div>

            {/* Monthly stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'present', label: 'Present', count: monthlyStats.presentDays, bg: 'linear-gradient(135deg, var(--color-status-green) 0%, #047857 100%)', color: '#065f46' },
                { key: 'late', label: 'Late', count: monthlyStats.lateDays, bg: 'linear-gradient(135deg, var(--color-status-yellow) 0%, #b45309 100%)', color: '#92400e' },
                { key: 'noshow', label: 'No Show', count: monthlyStats.noShowDays, bg: 'linear-gradient(135deg, var(--color-status-red) 0%, #b91c1c 100%)', color: '#991b1b' },
                { key: 'leave', label: 'Leave', count: monthlyStats.leavesCount, bg: 'linear-gradient(135deg, var(--color-status-blue) 0%, #3730a3 100%)', color: '#312e81' },
              ].map(({ key, label, count, bg, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 min-w-0 rounded-xl px-3 py-2 shadow-none"
                  style={{ background: bg }}
                >
                  <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">{label}</span>
                  <span className="shrink-0 flex items-center justify-center size-7 rounded-md bg-white">
                    <span className="text-sm font-black tabular-nums font-mono leading-none" style={{ color }}>{count}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

