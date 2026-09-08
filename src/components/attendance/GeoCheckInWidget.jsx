import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
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

// Auto-fit bounds between office and user location so distance is always visually shown
function MapBoundsUpdater({ officeCoords, userCoords }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (userCoords?.lat && userCoords?.lng && officeCoords?.lat && officeCoords?.lng) {
      const bounds = L.latLngBounds([
        [officeCoords.lat, officeCoords.lng],
        [userCoords.lat, userCoords.lng]
      ])
      // Fit both locations with visual padding
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true })
    } else if (officeCoords?.lat && officeCoords?.lng) {
      map.setView([officeCoords.lat, officeCoords.lng], 16)
    }
  }, [map, userCoords?.lat, userCoords?.lng, officeCoords?.lat, officeCoords?.lng])
  return null
}

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return Math.round(R * c); 
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
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
  setCurrentView
}) {
  const today = toLocal(new Date())
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
  const [gpsDisabledModal, setGpsDisabledModal] = useState(false)
  
  // Ensure current user is valid
  const empId = currentUser?.employeeId || currentUser?.id

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-detect and watch location continuously so distance updates in real-time
  useEffect(() => {
    if (!navigator.geolocation) return

    const updateCoords = (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setUserLocation({ lat, lng })
      const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
      setDistance(dist)
    }

    // Initial fetch
    navigator.geolocation.getCurrentPosition(
      updateCoords,
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    // Continuous real-time location watcher
    const watchId = navigator.geolocation.watchPosition(
      updateCoords,
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
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

  // Leave policies & balances (remaining vs total quota)
  const defaultPolicies = settings?.leavePolicies || { Annual: 14, Sick: 7, Casual: 3 }
  const myBalance = attendance?.leaveBalances?.[empId] || defaultPolicies

  const leaveItems = useMemo(() => {
    return Object.keys(defaultPolicies).map(type => {
      const quota = defaultPolicies[type] ?? 0
      const remaining = myBalance[type] ?? quota
      const taken = Math.max(0, quota - remaining)
      return {
        type,
        quota,
        remaining,
        taken
      }
    })
  }, [defaultPolicies, myBalance])

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

  const refreshLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser')
      addToast?.('Geolocation is not supported by your browser', 'error')
      return
    }

    setIsLoadingLoc(true)
    setLocError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserLocation({ lat, lng })
        const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
        setDistance(dist)
        setIsLoadingLoc(false)
      },
      (err) => {
        setLocError('Location access denied or unavailable.')
        setIsLoadingLoc(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const executeActionWithLocation = (actionCallback) => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser')
      setGpsDisabledModal(true)
      return
    }

    setIsLoadingLoc(true)
    setLocError(null)
    setGpsPhase('acquiring')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserLocation({ lat, lng })
        const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
        setDistance(dist)

        // Phase 2: Verifying GPS geofence match
        setGpsPhase('verifying')
        setTimeout(() => {
          setIsLoadingLoc(false)
          setGpsPhase('idle')
          if (dist <= maxDistance) {
            actionCallback()
          } else {
            setOutOfBoundsModal({ open: true, dist, max: maxDistance })
          }
        }, 700)
      },
      (err) => {
        setIsLoadingLoc(false)
        setGpsPhase('idle')
        // PERMISSION_DENIED (1) or POSITION_UNAVAILABLE (2)
        setLocError('Location is turned off or access is denied.')
        setGpsDisabledModal(true)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleCheckIn = () => {
    if (!empId) return
    executeActionWithLocation(() => {
      const now = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
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
              hours: '0.0'
            }
          }
        }
      }))
      showSuccessOverlay('Check-in', now)
    })
  }

  const handleCheckOut = () => {
    if (!empId || empLog.checkIn === '--') return
    executeActionWithLocation(() => {
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
            [empId]: { ...empLog, checkOut: now, hours: h }
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
          <div className="py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Current Distance:</span>
            <span className="font-bold font-mono text-destructive text-sm tabular-nums">
              {outOfBoundsModal.dist}m
            </span>
            <span className="opacity-40">·</span>
            <span>Allowed:</span>
            <span className="font-semibold font-mono text-foreground text-sm tabular-nums">
              {outOfBoundsModal.max}m
            </span>
          </div>

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
      <Dialog open={gpsDisabledModal} onOpenChange={setGpsDisabledModal}>
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
              Location is Turned Off
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Clock In requires your device GPS. Please pull down your phone notification bar and turn on <strong>Location / GPS</strong>, then tap Retry.
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
              <p className="text-xs font-bold text-foreground">Turn On Location</p>
              <p className="text-[11px] text-muted-foreground">Swipe down Settings ➔ Location ➔ Turn On</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-3">
            <button
              type="button"
              onClick={() => {
                setGpsDisabledModal(false)
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
              Retry GPS
            </button>
            <button
              type="button"
              onClick={() => setGpsDisabledModal(false)}
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
        {/* Top Header over Map with Progressive Blur (Seamless, zero separator bar) */}
        <CardHeader className="relative flex-row items-center justify-between px-3.5 sm:px-4 pt-3.5 pb-2.5 space-y-0 gap-3 z-20 border-none">
          {/* Progressive blur backdrop melting map into header */}
          <div className="map-header-progressive-blur" aria-hidden="true" />

          <div className="relative z-10 flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-black">
              <Icon name="schedule" className="!text-black shrink-0" size={20} />
            </div>
            <CardTitle className="text-fluid font-bold tracking-tight !text-black m-0 leading-snug break-words">
              Attendance
            </CardTitle>
          </div>
          <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setCurrentView && setCurrentView('attendance')}
              className="apple-glass-btn text-xs font-semibold px-3.5 h-7 rounded-full cursor-pointer shrink-0 !text-black border-black/20"
            >
              My Logs
            </button>
          </div>
        </CardHeader>

        {/* Map View Section (Zero separator bar) */}
        <div className="relative w-full h-[260px] sm:h-[290px] -mt-[57px] pt-[57px] overflow-hidden border-none flex flex-col justify-between">
          {/* Full Box Interactive Map View */}
          <div className="absolute inset-0 w-full h-full z-0">
            <MapContainer
              center={[officeLat, officeLng]}
              zoom={19}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                maxZoom={20}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                keepBuffer={8}
                updateWhenIdle={false}
                updateWhenZooming={true}
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

              {/* User Location Marker */}
              {userLocation?.lat && userLocation?.lng && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userPinIcon}>
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

          {/* Floating Top Controls: Live Distance & Action Tools */}
          <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between gap-2.5 pointer-events-none">
            {/* Glass Distance Pill: Realtime Distance from Office (always black text in both light & dark mode) */}
            <div 
              data-geo-map-control
              style={{ 
                backdropFilter: 'saturate(190%) blur(32px)', 
                WebkitBackdropFilter: 'saturate(190%) blur(32px)', 
                background: 'transparent'
              }}
              className="pointer-events-auto h-10 px-3.5 rounded-2xl border border-black/25 map-floating-glass geo-map-floating-text kormiis-shadow flex items-center gap-2"
            >
              <Icon 
                name={distance !== null && distance <= maxDistance ? "near_me" : "distance"} 
                size={17} 
                className={distance !== null && distance <= maxDistance ? "!text-emerald-700 shrink-0 animate-pulse" : "!text-black shrink-0"}
              />
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm sm:text-base font-black tabular-nums tracking-tight font-mono !text-black" aria-live="polite">
                  {distance !== null ? `${distance}m` : 'Detecting...'}
                </span>
                <span className="text-[11px] font-bold !text-black/80">
                  {distance !== null && distance <= maxDistance ? 'from office (in zone)' : 'from office'}
                </span>
              </div>
            </div>

            {/* Top-Right Tools: GPS Refresh Button matching same height & alignment */}
            <div className="pointer-events-auto flex items-center">
              <button
                data-geo-map-control
                type="button"
                onClick={refreshLocation}
                title="Refresh GPS"
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
        <CardContent className="flex flex-col gap-3 p-3 sm:p-3.5">
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

          {/* 2. Monthly 5-Metric Grid (Present, Late, No-Show, Leave, Hours) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            {/* Present Days */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="check_circle" size={15} className="text-emerald-500 shrink-0" />
                <span className="text-fluid font-black text-foreground tabular-nums">
                  {monthlyStats.presentDays}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground">Present</span>
              <span className="text-[9px] text-muted-foreground font-semibold">This Month</span>
            </div>

            {/* Late Count */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="history_toggle_off" size={15} className="text-amber-500 shrink-0" />
                <span className="text-fluid font-black text-foreground tabular-nums">
                  {monthlyStats.lateDays}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground">Late</span>
              <span className="text-[9px] text-muted-foreground font-semibold">Arrivals</span>
            </div>

            {/* No Show Count */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="cancel" size={15} className="text-rose-500 shrink-0" />
                <span className="text-fluid font-black text-foreground tabular-nums">
                  {monthlyStats.noShowDays}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground">No Show</span>
              <span className="text-[9px] text-muted-foreground font-semibold">Absences</span>
            </div>

            {/* Leaves Taken */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="event_busy" size={15} className="text-blue-500 shrink-0" />
                <span className="text-fluid font-black text-foreground tabular-nums">
                  {monthlyStats.leavesCount}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground">Leave</span>
              <span className="text-[9px] text-muted-foreground font-semibold">Days Taken</span>
            </div>

            {/* Total Worked Hours */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name="timer" size={15} className="text-primary shrink-0" />
                <span className="text-fluid font-black text-foreground tabular-nums font-mono">
                  {monthlyStats.totalWorkHours}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground">Hours</span>
              <span className="text-[9px] text-muted-foreground font-semibold">Total Work</span>
            </div>
          </div>

          {/* 3. Leave Balance Cards (matching the top metric box style, zero separator bar) */}
          <div className="flex flex-col gap-2 pt-1.5 border-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Leave Balances (Remaining / Total)
              </span>
              <button
                type="button"
                onClick={() => setCurrentView && setCurrentView('leave')}
                className="apple-glass-btn text-xs font-semibold px-2.5 py-1 rounded-xl text-primary hover:text-primary/90 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Icon name="add" size={13} />
                <span>Apply</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {leaveItems.map((item) => (
                <div
                  key={item.type}
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-center"
                >
                  <div className="flex items-baseline gap-1 mb-0.5 font-mono">
                    <span className="text-fluid font-black text-foreground tabular-nums">
                      {item.remaining}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      / {item.quota}d
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground truncate max-w-full">
                    {item.type}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    {item.remaining > 0 ? `${item.remaining} remaining` : 'Exhausted'}
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

