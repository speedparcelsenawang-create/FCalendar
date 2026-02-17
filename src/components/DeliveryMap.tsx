import { useMemo, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  description: string
}

interface DeliveryMapProps {
  deliveryPoints: DeliveryPoint[]
}

export function DeliveryMap({ deliveryPoints }: DeliveryMapProps) {
  const validPoints = useMemo(
    () => deliveryPoints.filter((p) => p.latitude !== 0 && p.longitude !== 0),
    [deliveryPoints]
  )

  const center = useMemo(() => {
    if (validPoints.length === 0) {
      return { lat: 3.15, lng: 101.65 } // Kuala Lumpur default
    }
    const avgLat = validPoints.reduce((sum, p) => sum + p.latitude, 0) / validPoints.length
    const avgLng = validPoints.reduce((sum, p) => sum + p.longitude, 0) / validPoints.length
    return { lat: avgLat, lng: avgLng }
  }, [validPoints])

  const getMarkerColor = (delivery: string) => {
    switch (delivery) {
      case "Daily":
        return "#22c55e" // green
      case "Weekday":
        return "#3b82f6" // blue
      case "Alt 1":
        return "#eab308" // yellow
      case "Alt 2":
        return "#a855f7" // purple
      default:
        return "#6b7280" // gray
    }
  }

  const createCustomIcon = (delivery: string) => {
    const color = getMarkerColor(delivery)
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><div style="width: 8px; height: 8px; background: white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg);"></div></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 25],
    })
  }

  // Component to fit bounds to all markers
  function FitBounds({ points }: { points: DeliveryPoint[] }) {
    const map = useMap()
    
    useEffect(() => {
      if (points.length === 0) return
      
      if (points.length === 1) {
        // Single point - center on it with reasonable zoom
        map.setView([points[0].latitude, points[0].longitude], 13)
      } else {
        // Multiple points - fit bounds to show all markers
        const bounds = L.latLngBounds(
          points.map(p => [p.latitude, p.longitude] as [number, number])
        )
        map.fitBounds(bounds, {
          padding: [30, 30], // Add padding around the markers
          maxZoom: 15 // Don't zoom in too much
        })
      }
    }, [map, points])
    
    return null
  }

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ width: "100%", height: "100%", borderRadius: "0.5rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={validPoints} />
      {validPoints.map((point) => (
        <Marker
          key={point.code}
          position={[point.latitude, point.longitude]}
          icon={createCustomIcon(point.delivery)}
        >
          <Popup>
            <div className="text-sm">
              <strong className="block mb-1">{point.name}</strong>
              <div className="text-xs text-muted-foreground">
                <div>Code: {point.code}</div>
                <div>Delivery: {point.delivery}</div>
                <div>
                  {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
