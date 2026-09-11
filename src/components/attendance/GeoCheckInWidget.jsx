import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
import {
  getCurrentPositionRobust,
  watchPositionRobust,
  getDistanceFromLatLonInMeters,
  getGeoMessage,
  GEO_REASON,
} from '../../services/geolocation.js'
import { getStreetBasemap } from '../../services/mapTiles.js'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom user location dot icon
const userPinIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
      <span style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></span>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

// Always frame the office and the user together (auto zoom + center) so the
// distance line stays centered in view. Refits are throttled so continuous GPS
// updates stay smooth instead of animating on every noisy tick.
const REFIT_THROTTLE_MS = 600
const MIN_REFIT_MOVE_METERS = 2

// Desktop/laptop browsers locate themselves via network (Wi-Fi/IP) positioning
// which can be off by hundreds of metres. We accept a check-in when the
// reported distance falls inside the device's own accuracy circle, capped so a
// wildly inaccurate IP-only fix cannot bypass the geofence entirely.
const ACCURACY_TOLERANCE_CAP = 500

function MapBoundsUpdater({ officeCoords, userCoords }) {
  const map = useMap()
  const lastFitRef = useRef(null)
  const lastFitAtRef = useRef(0)
  const pendingFitRef = useRef(null)

  useEffect(() => {
    if (!map) return
    // Cancel any pending trailing fit from a previous coordinate update.
    if (pendingFitRef.current) {
      clearTimeout(pendingFitRef.current)
      pendingFitRef.current = null
    }
    const hasUser = userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)
    const hasOffice = officeCoords && Number.isFinite(officeCoords.lat) && Number.isFinite(officeCoords.lng)

    if (!hasOffice) return

    // Keep both points centered inside the visible map area (clearing the top
    // header and the bottom action button overlays).
    const fit = (user, animate) => {
      if (user) {
        const bounds = L.latLngBounds([
          [officeCoords.lat, officeCoords.lng],
          [user.lat, user.lng]
        ])
        map.fitBounds(bounds, {
          paddingTopLeft: [48, 84],
          paddingBottomRight: [48, 112],
          maxZoom: 18,
          animate
        })
      } else {
        map.setView([officeCoords.lat, officeCoords.lng], 16, { animate })
      }
      lastFitRef.current = {
        officeLat: officeCoords.lat,
        officeLng: officeCoords.lng,
        userLat: user ? user.lat : null,
        userLng: user ? user.lng : null,
      }
      lastFitAtRef.current = Date.now()
    }

    const last = lastFitRef.current
    const officeChanged = !last
      || last.officeLat !== officeCoords.lat
      || last.officeLng !== officeCoords.lng

    if (officeChanged) {
      fit(hasUser ? userCoords : null, true)
      return
    }

    if (!hasUser) return

    const movedEnough = last.userLat == null || last.userLng == null
      || getDistanceFromLatLonInMeters(last.userLat, last.userLng, userCoords.lat, userCoords.lng) >= MIN_REFIT_MOVE_METERS

    if (!movedEnough) return

    const elapsed = Date.now() - lastFitAtRef.current
    if (elapsed >= REFIT_THROTTLE_MS) {
      fit(userCoords, false)
    } else {
      // Trailing refit guarantees the latest position is framed even if GPS
      // updates arrive faster than the throttle window.
      if (pendingFitRef.current) clearTimeout(pendingFitRef.current)
      pendingFitRef.current = setTimeout(() => {
        pendingFitRef.current = null
        fit(userCoords, false)
      }, REFIT_THROTTLE_MS - elapsed)
    }
  }, [map, userCoords?.lat, userCoords?.lng, officeCoords?.lat, officeCoords?.lng])

  useEffect(() => () => {
    if (pendingFitRef.current) clearTimeout(pendingFitRef.current)
  }, [])

  return null
}

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
  const basemap = getStreetBasemap()
  const mapRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Use settings or fallback to default
  const officeLat = settings?.officeLocation?.lat ?? 23.8103
  const officeLng = settings?.officeLocation?.lng ?? 90.4125
  const maxDistance = settings?.officeLocation?.radius ?? 100
  
  const [userLocation, setUserLocation] = useState(null)
  const [distance, setDistance] = useState(null)
  const [locError, setLocError] = useState(null)
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
      setUserLocation({ lat, lng })
      setDistance(getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng))
      storeFix(lat, lng, acc)
    }

    const stop = watchPositionRobust(
      applyPosition,
      ({ reason }) => setLocError(getGeoMessage(reason).title),
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

  const isWorking = empLog.checkIn !== '--' && empLog.checkOut === '--'
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
    setUserLocation({ lat, lng })
    const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
    setDistance(dist)
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
    setLocError(null)
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
        setLocError(msg.title)
        addToast?.(msg.description, 'error')
      }
    } finally {
      setIsLoadingLoc(false)
    }
  }

  const executeActionWithLocation = async (actionCallback) => {
    setIsLoadingLoc(true)
    setLocError(null)
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
        setLocError(getGeoMessage(reason).title)
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
        {/* Progressive blur backdrop on top of map, under header buttons */}
        <div className="map-header-progressive-blur" aria-hidden="true" />

        {/* Floating Top Header over Map (Above progressive blur) */}
        <CardHeader className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-3.5 sm:px-4 pt-3.5 pb-2.5 space-y-0 gap-3 z-20 border-none pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-black">
              <Icon name="schedule" className="!text-black shrink-0" size={20} />
            </div>
            <CardTitle className="text-fluid font-bold tracking-tight !text-black m-0 leading-snug break-words">
              Attendance
            </CardTitle>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setCurrentView && setCurrentView(myLogsTarget)}
              className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0 !text-black !border-black"
            >
              My Logs
            </button>
          </div>
        </CardHeader>

        {/* Map View Section: expands responsively and pushes lower content down */}
        <div className="relative w-full flex-[1_1_340px] min-h-[300px] pt-14 overflow-hidden border-none flex flex-col justify-between">
          {/* Full Box Interactive Map View */}
          <div className="absolute inset-0 w-full h-full z-0">
            <MapContainer
              ref={mapRef}
              center={[officeLat, officeLng]}
              zoom={19}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url={basemap.url}
                attribution={false}
                subdomains={basemap.subdomains}
                maxZoom={basemap.maxZoom}
                className={basemap.className}
                keepBuffer={4}
                updateWhenIdle={true}
                updateWhenZooming={false}
              />
              {/* Office Geofence Circle */}
              <Circle
                center={[officeLat, officeLng]}
                radius={maxDistance}
                pathOptions={{
                  color: distance !== null && distance <= maxDistance ? '#10b981' : '#3b82f6',
                  fillColor: distance !== null && distance <= maxDistance ? '#10b981' : '#3b82f6',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '4, 4'
                }}
              />
              {/* Office Location Marker */}
              <Marker position={[officeLat, officeLng]}>
                <Popup>
                  <div className="text-xs font-sans">
                    <p className="font-bold text-foreground">Office Location</p>
                    <p className="text-muted-foreground">Radius: {maxDistance}m</p>
                  </div>
                </Popup>
              </Marker>

              {/* User Location Marker with floating distance card right above the pin */}
              {userLocation?.lat && userLocation?.lng && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userPinIcon}>
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -18]}
                    className="geo-distance-tooltip"
                  >
                    <div 
                      style={{ 
                        backdropFilter: 'saturate(190%) blur(24px)', 
                        WebkitBackdropFilter: 'saturate(190%) blur(24px)',
                        background: 'transparent'
                      }}
                      className="px-3 py-1.5 rounded-xl border border-black/25 dark:border-black/25 !text-black font-semibold text-xs leading-none whitespace-nowrap flex items-center gap-1.5 shadow-sm select-none map-floating-glass geo-map-floating-text"
                    >
                      <span className="font-mono font-bold tabular-nums text-[13px] !text-black">
                        {distance !== null ? `${distance}m` : 'Detecting...'}
                      </span>
                      <span className="text-[11px] font-medium !text-black/80">
                        {distance !== null && distance <= maxDistance ? 'from office (in zone)' : 'from office'}
                      </span>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="text-xs font-sans">
                      <p className="font-bold text-blue-600">Your Location</p>
                      <p className="text-muted-foreground">
                        {distance !== null ? `${distance}m from office` : 'Detecting...'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Connecting visual distance line between office and user location */}
              {userLocation?.lat && userLocation?.lng && (
                <Polyline
                  positions={[
                    [officeLat, officeLng],
                    [userLocation.lat, userLocation.lng]
                  ]}
                  pathOptions={{
                    color: distance !== null && distance <= maxDistance ? '#10b981' : '#3b82f6',
                    weight: 3,
                    dashArray: '6, 8',
                    opacity: 0.85
                  }}
                />
              )}

              {/* Auto Bounds View Component */}
              <MapBoundsUpdater 
                officeCoords={{ lat: officeLat, lng: officeLng }} 
                userCoords={userLocation} 
                radius={maxDistance} 
              />
            </MapContainer>
          </div>

          {/* Floating Top Controls: Right-aligned Zoom Controls & GPS Refresh (Distance is now pinned directly above user's location) */}
          <div className="relative z-10 p-3 sm:p-4 flex items-start justify-end gap-2.5 pointer-events-none">
            {/* Top-Right Tools: Zoom Controls & GPS Refresh */}
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <button
                data-geo-map-control
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                title="Zoom in"
                aria-label="Zoom in"
                style={{ 
                  backdropFilter: 'saturate(190%) blur(32px)', 
                  WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                  background: 'transparent'
                }}
                className="size-10 rounded-2xl border border-black/25 hover:bg-black/10 flex items-center justify-center !text-black transition-all active:scale-95 cursor-pointer map-floating-glass geo-map-floating-text kormiis-shadow"
              >
                <Icon name="add" size={19} className="!text-black"/>
              </button>
              <button
                data-geo-map-control
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                title="Zoom out"
                aria-label="Zoom out"
                style={{ 
                  backdropFilter: 'saturate(190%) blur(32px)', 
                  WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                  background: 'transparent'
                }}
                className="size-10 rounded-2xl border border-black/25 hover:bg-black/10 flex items-center justify-center !text-black transition-all active:scale-95 cursor-pointer map-floating-glass geo-map-floating-text kormiis-shadow"
              >
                <Icon name="remove" size={19} className="!text-black"/>
              </button>
              <button
                data-geo-map-control
                type="button"
                onClick={refreshLocation}
                title="Refresh GPS"
                aria-label="Refresh GPS"
                disabled={isLoadingLoc}
                style={{ 
                  backdropFilter: 'saturate(190%) blur(32px)', 
                  WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                  background: 'transparent'
                }}
                className="size-10 rounded-2xl border border-black/25 hover:bg-black/10 flex items-center justify-center !text-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer map-floating-glass geo-map-floating-text kormiis-shadow"
              >
                <Icon name="my_location" size={17} className={isLoadingLoc ? "animate-spin !text-black" : "!text-black"}/>
              </button>
            </div>
          </div>

          {/* Floating Bottom Section: Dynamic Compact Primary Action Button */}
          <div className="relative z-10 mt-auto p-3 sm:p-4 flex flex-col gap-2 pointer-events-none">

            {/* Primary Floating Action Button with Ultra-Liquid Glass Style */}
            <div className="pointer-events-auto w-full">
              {canCheckIn || canCheckOut ? (
                <button
                  data-geo-map-control
                  type="button"
                  onClick={canCheckIn ? handleCheckIn : handleCheckOut}
                  disabled={(!canCheckIn && !canCheckOut) || isLoadingLoc}
                  style={{ 
                    backdropFilter: 'saturate(190%) blur(32px)', 
                    WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                    background: 'transparent'
                  }}
                  className={`w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer map-floating-glass geo-map-floating-text kormiis-shadow ${
                    canCheckIn 
                      ? '!text-black border-2 border-emerald-600/80 hover:bg-emerald-500/20' 
                      : '!text-black border-2 border-red-600/80 hover:bg-red-500/20'
                  }`}
                >
                  {isLoadingLoc ? (
                    <Icon name="progress_activity" className="animate-spin shrink-0 !text-black" size={16}/>
                  ) : (
                    <Icon name={canCheckIn ? "login" : "logout"} className={canCheckIn ? "shrink-0 !text-emerald-800" : "shrink-0 !text-red-700"} size={16}/>
                  )}
                  
                  <span className="text-sm font-extrabold tracking-wide flex items-center gap-1.5 !text-black">
                    {gpsPhase === 'acquiring' ? (
                      'Acquiring Live GPS...'
                    ) : gpsPhase === 'verifying' ? (
                      'Verifying GPS...'
                    ) : (
                      canCheckIn ? 'Clock In' : 'Clock Out'
                    )}
                  </span>
                </button>
              ) : (
                <div 
                  data-geo-map-control
                  style={{ 
                    backdropFilter: 'saturate(190%) blur(32px)', 
                    WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                    background: 'transparent'
                  }}
                  className="w-full h-12 flex items-center justify-between px-4 rounded-2xl border border-black/25 text-xs map-floating-glass geo-map-floating-text kormiis-shadow"
                >
                  <span className="flex items-center gap-2 font-bold !text-black">
                    <Icon name="check_circle" className="shrink-0 !text-emerald-600" size={17}/>
                    Clocked Out
                  </span>
                  <span className="text-[11px] font-mono font-bold !text-black/80 flex items-center gap-1">
                    <Icon name="history_toggle_off" size={13} className="!text-black shrink-0"/>
                    Clock In available in {cooldownRemaining}m
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Attendance Content Section */}
        <CardContent className="flex flex-col gap-3.5 p-3.5 sm:p-4 mt-auto">
          {/* 1. Today's Punch & Realtime Worked Duration Banner */}
          <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon 
                name={isWorking ? 'login' : empLog.checkOut && empLog.checkOut !== '--' && empLog.checkOut !== '0' ? 'task_alt' : isOffDay ? 'weekend' : 'schedule'} 
                size={16} 
                className={`shrink-0 ${
                  isWorking 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : empLog.checkOut && empLog.checkOut !== '--' && empLog.checkOut !== '0'
                    ? 'text-blue-600 dark:text-blue-400'
                    : isOffDay
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    Clock In: <span className="font-mono text-muted-foreground font-semibold">{displayCheckIn}</span>
                  </span>
                  <span className="text-muted-foreground text-sm font-bold">•</span>
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    Clock Out: <span className="font-mono text-muted-foreground font-semibold">{displayCheckOut}</span>
                  </span>
                </div>
                {isOffDay && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <Icon name="event_available" size={14} />
                    Off Day (Scheduled in Roster)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <Icon 
                name="timer" 
                size={18} 
                className={isWorking ? "text-emerald-500 animate-pulse" : "text-primary"} 
              />
              <span className="text-base sm:text-lg font-black text-foreground font-mono tabular-nums">
                {workedDurationStr}
              </span>
            </div>
          </div>

          {/* 2. Monthly Attendance Progress Bar Style Representation */}
          <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10">
            {/* Header with Title and Total Hours */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Attendance Breakdown
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                <Icon name="timer" size={13} className="text-primary shrink-0" />
                <span>{monthlyStats.totalWorkHours}h total worked</span>
              </div>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            {(() => {
              const totalRecorded = (monthlyStats.presentDays - monthlyStats.lateDays) + monthlyStats.lateDays + monthlyStats.noShowDays + monthlyStats.leavesCount
              const onTime = Math.max(0, monthlyStats.presentDays - monthlyStats.lateDays)
              const late = monthlyStats.lateDays
              const noShow = monthlyStats.noShowDays
              const leaves = monthlyStats.leavesCount

              // Proportional flex-grow segments share the full width exactly, so
              // the colours merge seamlessly with no sub-pixel gaps or rounding.
              const seg = (count, colorClass, label) => (
                count > 0 ? (
                  <div
                    key={label}
                    style={{ flexGrow: count, flexBasis: 0 }}
                    className={`h-full min-w-0 ${colorClass} transition-all duration-500`}
                    title={`${label}: ${count} days`}
                  />
                ) : null
              )

              return (
                <div className="space-y-2">
                  {/* Visual Bar Track */}
                  <div className="w-full h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                    {totalRecorded === 0 ? (
                      <div className="w-full h-full bg-muted-foreground/20" />
                    ) : (
                      <>
                        {seg(onTime, 'attendance-color-emerald', 'Present (On-Time)')}
                        {seg(late, 'attendance-color-amber', 'Late')}
                        {seg(noShow, 'attendance-color-rose', 'No Show')}
                        {seg(leaves, 'attendance-color-blue', 'Leave')}
                      </>
                    )}
                  </div>

                  {/* Bar Legend & Numerical Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Present / On-Time */}
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full attendance-color-emerald shrink-0" />
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-xs font-black text-foreground tabular-nums font-mono">
                          {monthlyStats.presentDays}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground truncate">
                          Present
                        </span>
                      </div>
                    </div>

                    {/* Late */}
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full attendance-color-amber shrink-0" />
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-xs font-black text-foreground tabular-nums font-mono">
                          {monthlyStats.lateDays}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground truncate">
                          Late
                        </span>
                      </div>
                    </div>

                    {/* No Show */}
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full attendance-color-rose shrink-0" />
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-xs font-black text-foreground tabular-nums font-mono">
                          {monthlyStats.noShowDays}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground truncate">
                          No Show
                        </span>
                      </div>
                    </div>

                    {/* Leave */}
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full attendance-color-blue shrink-0" />
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-xs font-black text-foreground tabular-nums font-mono">
                          {monthlyStats.leavesCount}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground truncate">
                          Leave
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

