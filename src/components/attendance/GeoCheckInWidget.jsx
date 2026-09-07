import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, Popup } from 'react-leaflet'
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

// Auto fit map bounds to show both office and user
function MapBoundsUpdater({ officeCoords, userCoords, radius }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (userCoords?.lat && userCoords?.lng) {
      const bounds = L.latLngBounds([
        [officeCoords.lat, officeCoords.lng],
        [userCoords.lat, userCoords.lng]
      ])
      // Pad bounds so circle is comfortably visible
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 })
    } else if (officeCoords?.lat && officeCoords?.lng) {
      map.setView([officeCoords.lat, officeCoords.lng], 16)
    }
  }, [map, officeCoords?.lat, officeCoords?.lng, userCoords?.lat, userCoords?.lng, radius])
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

export default function GeoCheckInWidget({ currentUser, attendance, setAttendance, addToast, settings, notes = [], setNotes, cardClassName = '' }) {
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
  // Out of Geofence Warning Modal State
  const [outOfBoundsModal, setOutOfBoundsModal] = useState({ open: false, dist: 0, max: maxDistance })
  
  // Ensure current user is valid
  const empId = currentUser?.employeeId || currentUser?.id

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-detect location on load so the map shows user immediately
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setUserLocation({ lat, lng })
          const dist = getDistanceFromLatLonInMeters(lat, lng, officeLat, officeLng)
          setDistance(dist)
        },
        () => {
          // silently handle initial lookup error; user can still interact
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      )
    }
  }, [officeLat, officeLng])

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
          setLocError(`Outside office geofence (${dist}m away, max ${maxDistance}m)`)
          setOutOfBoundsModal({ open: true, dist, max: maxDistance })
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
      {/* Out of Office Zone Warning Modal */}
      <Dialog open={outOfBoundsModal.open} onOpenChange={(open) => setOutOfBoundsModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[420px] border-destructive/20 glass-kormiis shadow-none flex flex-col items-center justify-center p-6 sm:p-8 gap-4 rounded-[1.5rem] outline-none">
          <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <Icon name="wrong_location" size={36} className="text-destructive animate-pulse" />
          </div>
          
          <div className="text-center space-y-1.5">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Outside Office Zone
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              You are currently outside the designated office geofence. Clock-in is restricted to verified office premises.
            </DialogDescription>
          </div>

          <div className="w-full bg-muted/40 dark:bg-white/[0.04] rounded-xl p-3.5 border border-border/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Icon name="navigation" size={14} className="text-destructive"/> Your Current Distance
              </span>
              <span className="font-bold font-mono text-destructive text-sm tabular-nums">
                {outOfBoundsModal.dist} meters
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Icon name="radio_button_checked" size={14} className="text-emerald-500"/> Allowed Office Radius
              </span>
              <span className="font-semibold font-mono text-foreground text-sm tabular-nums">
                {outOfBoundsModal.max} meters
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
            <Button 
              variant="outline"
              onClick={() => {
                setOutOfBoundsModal(prev => ({ ...prev, open: false }))
                refreshLocation()
              }}
              className="flex-1 h-11 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Icon name="refresh" size={15}/>
              Retry Location
            </Button>
            <Button 
              onClick={() => setOutOfBoundsModal(prev => ({ ...prev, open: false }))}
              className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold shadow-none"
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
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

      <Card className={`overflow-hidden dashboard-widget ${cardClassName ? cardClassName : 'col-span-full xl:col-span-12 border-primary/20 shadow-sm'}`}>
        <CardHeader className="px-3.5 sm:px-4 pt-3.5 pb-2.5 space-y-0 gap-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 flex items-center justify-center [&_.msr]:!text-foreground">
                <Icon name="nest_clock_farsight_analog" className="text-primary shrink-0" size={20}/>
              </div>
              <CardTitle className="text-fluid-sm sm:text-fluid font-bold tracking-tight text-foreground m-0 leading-snug truncate">Time & Attendance</CardTitle>
            </div>
            {elapsed && (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                {elapsed}
              </span>
            )}
          </div>
        </CardHeader>
      
      <CardContent className="p-3 sm:p-4 flex flex-col justify-between gap-3 h-[calc(100%-49px)]">
        {/* Compact Clock & Status */}
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight font-mono text-foreground leading-none" aria-live="polite">
              {timeStr}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              empLog.status === 'In Office' || empLog.status === 'Remote' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-muted text-muted-foreground border border-border/40'
            }`}>
              <span className={`size-1.5 rounded-full ${empLog.status === 'In Office' || empLog.status === 'Remote' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {empLog.status || 'Off Duty'}
            </span>
          </div>
        </div>

        {/* Live Interactive Map with Office Geofence & User Location */}
        <div className="space-y-1.5">
          <div className="h-32 sm:h-36 w-full rounded-xl overflow-hidden border border-border/40 relative isolate z-0">
            <MapContainer
              center={[officeLat, officeLng]}
              zoom={16}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
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

              {/* Auto Bounds View Component */}
              <MapBoundsUpdater 
                officeCoords={{ lat: officeLat, lng: officeLng }} 
                userCoords={userLocation} 
                radius={maxDistance} 
              />
            </MapContainer>

            {/* Map corner status overlay */}
            <div className="absolute top-2 left-2 z-[400] flex items-center gap-1.5 px-2 py-1 rounded-md glass-kormiis bg-background/80 backdrop-blur-md text-[11px] font-medium border border-border/40">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500" />
                <span>Office ({maxDistance}m)</span>
              </span>
              {userLocation && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>You</span>
                  </span>
                </>
              )}
            </div>

            {/* Refresh GPS Button on Map */}
            <button
              type="button"
              onClick={refreshLocation}
              title="Refresh GPS"
              disabled={isLoadingLoc}
              className="absolute top-2 right-2 z-[400] size-7 rounded-md glass-kormiis bg-background/80 backdrop-blur-md hover:bg-background border border-border/40 flex items-center justify-center text-foreground transition-colors disabled:opacity-50"
            >
              <Icon name="my_location" size={14} className={isLoadingLoc ? "animate-spin text-primary" : "text-muted-foreground"}/>
            </button>
          </div>

          {/* Location status badge below map */}
          <div className="min-w-0 bg-muted/20 dark:bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-border/30 text-xs flex items-center justify-between gap-2">
            {isLoadingLoc ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon name="progress_activity" className="animate-spin text-primary" size={14}/>
                <span className="truncate">Acquiring live GPS position...</span>
              </div>
            ) : locError ? (
              <div className="flex items-center gap-1.5 text-destructive font-medium">
                <Icon name="gpp_maybe" size={14} className="shrink-0"/>
                <span className="truncate">{locError}</span>
              </div>
            ) : distance !== null ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  {distance <= maxDistance ? (
                    <Icon name="verified_user" className="text-emerald-500 shrink-0" size={14}/>
                  ) : (
                    <Icon name="gpp_maybe" className="text-destructive shrink-0" size={14}/>
                  )}
                  <span className={`font-semibold truncate ${distance <= maxDistance ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {distance <= maxDistance ? 'Inside Office Zone' : 'Outside Office Zone'}
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 tabular-nums font-mono text-[11px]">
                  {distance}m / {maxDistance}m
                </span>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon name="pin_drop" size={14} className="shrink-0 text-muted-foreground/80"/>
                  <span className="truncate">Office Geofence ({maxDistance}m radius)</span>
                </div>
                <button 
                  onClick={refreshLocation}
                  className="text-primary hover:underline text-[11px] font-medium shrink-0"
                >
                  Locate Me
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full mt-auto pt-1">
          {canCheckIn || canCheckOut ? (
            <Button
              onClick={canCheckIn ? handleCheckIn : handleCheckOut}
              disabled={(!canCheckIn && !canCheckOut) || isLoadingLoc}
              className={`w-full h-10 sm:h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                canCheckIn 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-none' 
                  : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 shadow-none'
              }`}
            >
              <Icon name={canCheckIn ? "login" : "logout"} className="shrink-0" size={17}/>
              {isLoadingLoc ? 'Verifying GPS...' : canCheckIn ? 'Clock In Now' : 'Clock Out Now'}
            </Button>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Icon name="check_circle" className="shrink-0" size={15}/>
                Shift completed today
              </span>
              <span className="text-[11px] opacity-80">
                {cooldownRemaining > 0 ? `Ready in ${cooldownRemaining}m` : 'Done'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  )
}

