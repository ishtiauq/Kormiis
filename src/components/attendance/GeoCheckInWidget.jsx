import { useState, useEffect } from 'react'
import Icon from "@/components/ui/Icon.jsx"
import { toLocal, parseMin, fmtH } from '../../services/attendance.js'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

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

export default function GeoCheckInWidget({ currentUser, attendance, setAttendance, addToast, settings, notes = [], setNotes }) {
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
  
  // Success Message State
  const [successMsg, setSuccessMsg] = useState(null)
  
  // Ensure current user is valid
  const empId = currentUser?.employeeId || currentUser?.id

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const logs = attendance?.dailyLogs?.[today] || {}
  const empLog = logs[empId] || { status: 'Off Duty', checkIn: '--', checkOut: '--', hours: '0.0' }

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  
  const nowMins = parseMin(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))

  const minutesSince = (t) => {
    const tm = parseMin(t)
    if (tm === null || nowMins === null) return null
    let d = nowMins - tm
    if (d < 0) d += 1440
    return d
  }

  const cooldownPassed = empLog.checkOut !== '--' && minutesSince(empLog.checkOut) !== null && minutesSince(empLog.checkOut) >= 30

  const canCheckIn = empId && (empLog.checkIn === '--' || cooldownPassed)
  const canCheckOut = empId && empLog.checkIn !== '--' && empLog.checkOut === '--'

  const elapsed = (() => {
    if (empLog.checkIn === '--' || empLog.checkOut !== '--') return null
    const d = minutesSince(empLog.checkIn)
    if (d === null) return null
    return `${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m`
  })()

  const cooldownRemaining = empLog.checkOut !== '--' && !cooldownPassed ? Math.max(0, 30 - (minutesSince(empLog.checkOut) ?? 0)) : 0

  const showSuccessOverlay = (type, time, hoursWorked = null) => {
    setSuccessMsg({ type, time, hoursWorked })
    // Only auto-close if it's a Check-in
    if (type === 'Check-in') {
      setTimeout(() => {
        setSuccessMsg(null)
      }, 4000)
    }
  }

  const executeActionWithLocation = (actionCallback) => {
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
        
        if (dist <= maxDistance) {
          actionCallback();
        } else {
          setLocError(`You are ${dist}m away from the office (Max: ${maxDistance}m)`)
          addToast?.(`Check-in failed: You are ${dist}m away from the office`, 'error')
        }
      },
      (err) => {
        setLocError('Location access denied or unavailable.')
        addToast?.('Location access denied or unavailable.', 'error')
        setIsLoadingLoc(false)
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
        // Sort by updatedAt descending to get the active one
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
      <Dialog open={!!successMsg} onOpenChange={(open) => { if (!open) setSuccessMsg(null) }}>
        <DialogContent className="max-w-[400px] border-border/50 glass-kormiis shadow-lg flex flex-col items-center justify-center p-5 sm:p-8 gap-4 rounded-[1rem] outline-none">
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

      <Card className="col-span-full xl:col-span-12 border-primary/20 overflow-hidden shadow-sm mb-6 dashboard-widget">
        <CardHeader className="px-3.5 sm:px-4 pt-3.5 pb-2.5 space-y-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
              <Icon name="event_available" className="text-primary shrink-0" size={22}/>
            </div>
            <CardTitle className="text-fluid font-bold tracking-tight text-foreground m-0 leading-snug break-words">Mark Attendance</CardTitle>
          </div>
        </CardHeader>
      
      <CardContent className="p-2.5 sm:p-3 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="text-fluid-display font-black tabular-nums tracking-tight font-sans text-foreground" aria-live="polite">{timeStr}</div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          {elapsed && (
            <div className="mt-1 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-primary/70">Working time</span>
              <span className="font-sans text-base font-bold text-primary">{elapsed}</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {isLoadingLoc ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon name="progress_activity" className="animate-spin" size={16}/>
              Verifying Location...
            </div>
          ) : locError ? (
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <Icon name="gpp_maybe" size={16}/>
              {locError}
            </div>
          ) : distance !== null ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {distance <= maxDistance ? (
                  <Icon name="verified_user" className="text-green-500" size={18}/>
                ) : (
                  <Icon name="gpp_maybe" className="text-destructive" size={18}/>
                )}
                <span className="text-sm font-semibold">
                  {distance <= maxDistance ? 'Location Verified' : 'Outside Office Zone'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground m-0">
                You are {distance} meters away from the office. {distance <= maxDistance ? 'You may check in.' : `You must be within ${maxDistance} meters to check in.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Icon name="pin_drop" size={16}/>
                Location pending
              </div>
              <p className="text-xs text-muted-foreground m-0">
                Click Check In to verify your location.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full">
          {canCheckIn || canCheckOut ? (
            <Button
              onClick={canCheckIn ? handleCheckIn : handleCheckOut}
              disabled={(!canCheckIn && !canCheckOut) || isLoadingLoc}
              className={`w-full sm:w-auto px-3 lg:px-10 h-12 rounded-full text-sm sm:text-base font-semibold flex items-center justify-center gap-2 shadow-sm mx-auto ${canCheckIn ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30'}`}
            >
              <Icon name="schedule" className="shrink-0" size={18}/>
              {isLoadingLoc ? 'Verifying...' : canCheckIn ? 'Check In' : 'Check Out'}
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon name="check_circle" className="text-green-500" size={18}/>
                Checked out
              </div>
              <span className="text-xs text-muted-foreground">
                Check In available in {cooldownRemaining} min
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  )
}
