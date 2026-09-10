// Google Maps raster tiles.
//
// These public tile endpoints need no API key and show no watermark, which is
// why the app uses them. They are undocumented and technically outside
// Google's official Maps Platform terms, so if Google ever changes or blocks
// the endpoint, switch to a licensed provider (see git history for CARTO/Esri
// alternatives).
export const GOOGLE_ATTRIBUTION = ''

export const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3']
export const GOOGLE_MAX_ZOOM = 20

// lyrs: m = roadmap, s = satellite, y = hybrid (satellite + labels)
const googleTileUrl = (lyrs) =>
  `https://{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`

export function getStreetBasemap() {
  return {
    provider: 'google',
    url: googleTileUrl('m'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: GOOGLE_SUBDOMAINS,
    maxZoom: GOOGLE_MAX_ZOOM,
    className: '',
  }
}

export function getSatelliteBasemap() {
  return {
    provider: 'google',
    url: googleTileUrl('y'),
    attribution: GOOGLE_ATTRIBUTION,
    subdomains: GOOGLE_SUBDOMAINS,
    maxZoom: GOOGLE_MAX_ZOOM,
    className: '',
  }
}
