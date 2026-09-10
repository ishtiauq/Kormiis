// Cross-device geolocation helpers.
//
// Mobile handsets expose a real GNSS/GPS chip, while desktops and laptops
// usually only have network (Wi-Fi/IP) positioning. Requesting a high-accuracy
// fix on a device without GPS hardware can hang or fail with a TIMEOUT /
// POSITION_UNAVAILABLE error. These helpers try high accuracy first and then
// gracefully fall back to network positioning so location tracking and
// clock-in work precisely on every device.

export const GEO_REASON = {
  UNSUPPORTED: 'unsupported',
  INSECURE: 'insecure',
  PERMISSION_DENIED: 'permission_denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
}

// UI copy per failure reason. `instructions` is intentionally device-agnostic
// so the same dialog works on mobile, tablet, desktop and laptop.
export const GEO_MESSAGES = {
  [GEO_REASON.UNSUPPORTED]: {
    title: 'Location Not Supported',
    description: 'This browser does not support location services. Please open the app in a modern browser such as Chrome, Safari, Edge or Firefox.',
    instructions: 'Try a different browser',
  },
  [GEO_REASON.INSECURE]: {
    title: 'Secure Connection Required',
    description: 'Location access only works over a secure HTTPS connection. Please reload the app using its https:// address.',
    instructions: 'Open the app over HTTPS',
  },
  [GEO_REASON.PERMISSION_DENIED]: {
    title: 'Location Permission Blocked',
    description: 'Clock In needs your device location, but the browser has blocked access. Allow location for this site, then tap Retry.',
    instructions: 'Allow location in browser settings',
  },
  [GEO_REASON.UNAVAILABLE]: {
    title: 'Location Services Are Off',
    description: 'Your device could not provide a location. Make sure location services are switched on for this device, then tap Retry.',
    instructions: 'Turn on device location',
  },
  [GEO_REASON.TIMEOUT]: {
    title: 'Could Not Get Your Location',
    description: 'Your device took too long to return a location. Move near a window or open area, keep Wi-Fi on, then tap Retry.',
    instructions: 'Retry for a fresh location',
  },
  [GEO_REASON.UNKNOWN]: {
    title: 'Location Unavailable',
    description: 'We could not read your device location. Please try again.',
    instructions: 'Retry location',
  },
}

export function getGeoMessage(reason) {
  return GEO_MESSAGES[reason] || GEO_MESSAGES[GEO_REASON.UNKNOWN]
}

// A coarse check of the current environment. `supported` is false when the
// browser has no geolocation API at all; `secure` is false when the page is
// served over plain HTTP (geolocation is blocked by browsers there).
export function getGeolocationStatus() {
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation
  const secure = typeof window === 'undefined' ? true : window.isSecureContext !== false
  let reason = null
  if (!supported) reason = GEO_REASON.UNSUPPORTED
  else if (!secure) reason = GEO_REASON.INSECURE
  return { supported, secure, reason }
}

export function reasonFromError(err) {
  if (!err) return GEO_REASON.UNKNOWN
  if (err.reason) return err.reason
  switch (err.code) {
    case 1: return GEO_REASON.PERMISSION_DENIED
    case 2: return GEO_REASON.UNAVAILABLE
    case 3: return GEO_REASON.TIMEOUT
    default: return GEO_REASON.UNKNOWN
  }
}

function makeGeoError(reason, cause) {
  const err = new Error(reason)
  err.reason = reason
  if (cause && cause.code != null) err.code = cause.code
  return err
}

function requestPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

// Resolves with a Position. Tries a high-accuracy fix first (GPS) and falls
// back to network positioning when the device cannot deliver one in time.
export async function getCurrentPositionRobust({
  highAccuracy = true,
  timeout = 10000,
  maximumAge = 0,
} = {}) {
  const status = getGeolocationStatus()
  if (!status.supported || !status.secure) {
    throw makeGeoError(status.reason)
  }

  // Progressive ladder: fresh high-accuracy GPS → recent high-accuracy fix →
  // network/Wi-Fi positioning (may use a recent cached reading). This makes
  // desktops, laptops and phones indoors all resolve instead of timing out.
  const attempts = highAccuracy
    ? [
        { enableHighAccuracy: true, timeout: Math.min(timeout, 10000), maximumAge: 0 },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 },
      ]
    : [
        { enableHighAccuracy: false, timeout, maximumAge },
        { enableHighAccuracy: false, timeout: Math.max(timeout, 15000), maximumAge: 120000 },
      ]

  // Keep the most actionable failure: permission denial beats "unavailable",
  // which beats a plain timeout. Otherwise a later timeout attempt would mask
  // the real reason (e.g. location services switched off).
  const priority = {
    [GEO_REASON.PERMISSION_DENIED]: 4,
    [GEO_REASON.UNAVAILABLE]: 3,
    [GEO_REASON.TIMEOUT]: 2,
    [GEO_REASON.UNKNOWN]: 1,
  }

  let bestReason = null
  let bestErr = null
  for (const options of attempts) {
    try {
      return await requestPosition(options)
    } catch (err) {
      const reason = reasonFromError(err)
      if (bestReason === null || priority[reason] > priority[bestReason]) {
        bestReason = reason
        bestErr = err
      }
      // A denied permission will not change by retrying with lower accuracy.
      if (reason === GEO_REASON.PERMISSION_DENIED) break
    }
  }
  throw makeGeoError(bestReason || GEO_REASON.UNKNOWN, bestErr)
}

// Starts a continuous watch that survives high-accuracy failures by dropping
// to network positioning. Returns a cleanup function (always safe to call).
export function watchPositionRobust(onUpdate, onError, {
  highAccuracy = true,
  timeout = 20000,
  maximumAge = 10000,
} = {}) {
  const status = getGeolocationStatus()
  if (!status.supported || !status.secure) {
    onError?.({ reason: status.reason })
    return () => {}
  }

  let watchId = null
  let stopped = false
  let usingHighAccuracy = highAccuracy

  const optionsFor = () => (
    usingHighAccuracy
      ? { enableHighAccuracy: true, timeout, maximumAge }
      : { enableHighAccuracy: false, timeout: Math.max(timeout, 15000), maximumAge: Math.max(maximumAge, 30000) }
  )

  const start = () => {
    if (stopped) return
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!stopped) onUpdate?.(position)
      },
      (err) => {
        if (stopped) return
        const reason = reasonFromError(err)
        if (reason === GEO_REASON.PERMISSION_DENIED) {
          onError?.({ reason, code: err?.code })
          return
        }
        // One-time downgrade from GPS to network positioning.
        if (usingHighAccuracy && (reason === GEO_REASON.TIMEOUT || reason === GEO_REASON.UNAVAILABLE)) {
          usingHighAccuracy = false
          if (watchId != null) navigator.geolocation.clearWatch(watchId)
          watchId = null
          start()
          return
        }
        onError?.({ reason, code: err?.code })
      },
      optionsFor()
    )
  }

  start()

  return () => {
    stopped = true
    if (watchId != null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

// Great-circle distance between two coordinates, in metres.
export function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}
