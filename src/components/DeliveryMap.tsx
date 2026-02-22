import { useMemo, useState } from "react"
import { GoogleMap, useLoadScript, MarkerF, InfoWindow } from "@react-google-maps/api"

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""

const DELIVERY_COLORS: Record<string, string> = {
  Daily:   "#22c55e",
  Weekday: "#3b82f6",
  "Alt 1": "#eab308",
  "Alt 2": "#a855f7",
}

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
}

interface DeliveryMapProps {
  deliveryPoints: DeliveryPoint[]
  scrollZoom?: boolean
}

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
}

export function DeliveryMap({ deliveryPoints, scrollZoom = false }: DeliveryMapProps) {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: GMAP_KEY })
  const [activeCode, setActiveCode] = useState<string | null>(null)

  const validPoints = useMemo(
    () => deliveryPoints.filter((p) => p.latitude !== 0 && p.longitude !== 0),
    [deliveryPoints]
  )

  // Precompute dot icons per delivery type (stable reference between renders)
  const dotIcons = useMemo<Record<string, google.maps.Symbol>>(() => {
    if (!isLoaded) return {}
    const types = ["Daily", "Weekday", "Alt 1", "Alt 2", "default"]
    const result: Record<string, google.maps.Symbol> = {}
    for (const t of types) {
      result[t] = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: DELIVERY_COLORS[t] ?? "#6b7280",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2.5,
        scale: 8,
      }
    }
    return result
  }, [isLoaded])

  const activePoint = useMemo(
    () => validPoints.find(p => p.code === activeCode) ?? null,
    [validPoints, activeCode]
  )

  const center = useMemo(() => {
    if (validPoints.length === 0) return { lat: 3.15, lng: 101.65 }
    return {
      lat: validPoints.reduce((s, p) => s + p.latitude, 0) / validPoints.length,
      lng: validPoints.reduce((s, p) => s + p.longitude, 0) / validPoints.length,
    }
  }, [validPoints])

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center}
      zoom={13}
      options={{
        ...MAP_OPTIONS,
        scrollwheel: scrollZoom,
        gestureHandling: scrollZoom ? "greedy" : "cooperative",
      }}
      onLoad={(map) => {
        if (validPoints.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          validPoints.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }))
          map.fitBounds(bounds, 30)
        } else if (validPoints.length === 1) {
          map.setCenter({ lat: validPoints[0].latitude, lng: validPoints[0].longitude })
          map.setZoom(13)
        }
      }}
      onClick={() => setActiveCode(null)}
    >
      {validPoints.map((point) => (
        <MarkerF
          key={point.code}
          position={{ lat: point.latitude, lng: point.longitude }}
          icon={dotIcons[point.delivery] ?? dotIcons["default"]}
          onClick={() => setActiveCode(prev => prev === point.code ? null : point.code)}
        />
      ))}
      {activePoint && (
        <InfoWindow
          position={{ lat: activePoint.latitude, lng: activePoint.longitude }}
          onCloseClick={() => setActiveCode(null)}
        >
          <div className="text-sm">
            <strong className="block mb-1">{activePoint.name}</strong>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Code: {activePoint.code}</div>
              <div>Delivery: {activePoint.delivery}</div>
              <div className="font-mono">{activePoint.latitude.toFixed(4)}, {activePoint.longitude.toFixed(4)}</div>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
