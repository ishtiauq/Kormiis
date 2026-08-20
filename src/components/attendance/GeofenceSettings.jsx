import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Icon from "@/components/ui/Icon.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && position.lat && position.lng) {
      map.flyTo(position, map.getZoom());
    }
  }, [position.lat, position.lng, map]);

  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return position === null ? null : (
    <Marker position={position}></Marker>
  )
}

export default function GeofenceSettings({ settings, setSettings, addToast, addLog }) {
  const defaultLoc = { lat: 23.8103, lng: 90.4125, radius: 100 }
  const [officeLocation, setOfficeLocation] = useState(settings?.officeLocation || defaultLoc)
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [isMapSearching, setIsMapSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings?.officeLocation) {
      setOfficeLocation(settings.officeLocation)
    }
  }, [settings?.officeLocation])

  const handleMapSearch = async (e) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    setIsMapSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setOfficeLocation(prev => ({ ...prev, lat, lng: lon }));
        if (addToast) addToast(`Found: ${data[0].display_name.split(',')[0]}`, 'success');
      } else {
        if (addToast) addToast('Location not found. Try a different search term.', 'error');
      }
    } catch (err) {
      if (addToast) addToast('Error searching for location.', 'error');
    } finally {
      setIsMapSearching(false);
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      if (addToast) addToast('Geolocation is not supported by your browser.', 'error')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLocation(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }))
        setIsLocating(false)
        if (addToast) addToast('Updated to your current GPS coordinates!', 'success')
      },
      (err) => {
        setIsLocating(false)
        if (addToast) addToast(`GPS Error: ${err.message}`, 'error')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSaveLocation = () => {
    if (!setSettings) return
    setIsSaving(true)
    setSettings(prev => ({
      ...prev,
      officeLocation: {
        lat: Number(officeLocation.lat),
        lng: Number(officeLocation.lng),
        radius: Number(officeLocation.radius || 100)
      }
    }))
    addLog?.('Geofence Updated', `Office geofence updated (lat: ${officeLocation.lat}, lng: ${officeLocation.lng}, radius: ${officeLocation.radius}m)`, 'success')
    setTimeout(() => {
      setIsSaving(false)
      if (addToast) addToast('Office Geofence saved successfully!', 'success')
    }, 200)
  }

  return (
    <Card className="glass-kormiis border border-border/80 dark:border-white/12 shadow-xl rounded-3xl overflow-hidden animate-fade-in">
      <CardHeader className="p-6 pb-4 border-b border-border/40 dark:border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Icon name="pin_drop" size={22}/>
          </div>
          <div>
            <CardTitle className="text-fluid-lg font-bold">Office Geofence Location</CardTitle>
            <CardDescription className="text-fluid-xs text-muted-foreground">
              Define the physical perimeter required for employee attendance check-ins and check-outs.
            </CardDescription>
          </div>
        </div>

        <Button 
          onClick={handleSaveLocation} 
          disabled={isSaving}
          className="liquid-glass-btn h-11 px-5 rounded-2xl font-bold shadow-md gap-2 shrink-0 self-start sm:self-auto"
        >
          <Icon name="save" size={16}/>
          {isSaving ? 'Saving...' : 'Save Geofence'}
        </Button>
      </CardHeader>

      <CardContent className="p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleMapSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
              <Input 
                value={mapSearchQuery} 
                onChange={e => setMapSearchQuery(e.target.value)} 
                placeholder="Search area, landmark, or street name..." 
                className="h-11 !pl-10.5 rounded-2xl bg-card border-border/80 dark:border-white/12 font-medium"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isMapSearching} className="h-11 px-4 rounded-2xl font-bold gap-1.5 shrink-0">
              <Icon name="search" size={16}/>
              {isMapSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleUseCurrentLocation} 
            disabled={isLocating}
            className="h-11 px-4 rounded-2xl font-bold gap-2 border-border/80 dark:border-white/12 shrink-0"
          >
            <Icon name="my_location" size={16} className={isLocating ? 'animate-spin text-primary' : 'text-primary'}/>
            {isLocating ? 'Detecting GPS...' : 'Use My GPS'}
          </Button>
        </div>

        {/* Map Container */}
        <div className="w-full h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-border/80 dark:border-white/12 relative shadow-inner z-0">
          <MapContainer 
            center={[officeLocation.lat, officeLocation.lng]} 
            zoom={16} 
            scrollWheelZoom={true} 
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
              position={{ lat: officeLocation.lat, lng: officeLocation.lng }} 
              setPosition={(pos) => setOfficeLocation(prev => ({ ...prev, ...pos }))} 
            />
            <Circle 
              center={[officeLocation.lat, officeLocation.lng]} 
              radius={Number(officeLocation.radius) || 100}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
          </MapContainer>
          <div className="absolute bottom-3 left-3 bg-card/90 dark:bg-[#12131c]/90 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-semibold text-foreground border border-border/80 dark:border-white/12 shadow-lg pointer-events-none z-[1000] flex items-center gap-2">
            <Icon name="touch_app" size={16} className="text-primary"/>
            <span>Click anywhere on the map to pin exact office coords</span>
          </div>
        </div>

        {/* Coords & Radius Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
            <Input 
              type="number" 
              step="any" 
              value={officeLocation.lat} 
              onChange={e => setOfficeLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))} 
              className="h-11 rounded-2xl font-bold tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
            <Input 
              type="number" 
              step="any" 
              value={officeLocation.lng} 
              onChange={e => setOfficeLocation(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))} 
              className="h-11 rounded-2xl font-bold tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Allowed Radius (Meters)</label>
            <Input 
              type="number" 
              min="10" 
              max="5000" 
              value={officeLocation.radius} 
              onChange={e => setOfficeLocation(prev => ({ ...prev, radius: parseInt(e.target.value, 10) || 100 }))} 
              className="h-11 rounded-2xl font-bold tabular-nums"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
