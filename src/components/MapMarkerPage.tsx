import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, Navigation, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

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
  descriptions: { key: string; value: string }[]
}

interface Route {
  id: string
  name: string
  code: string
  shift: string
  deliveryPoints: DeliveryPoint[]
}

interface EnrichedPoint extends DeliveryPoint {
  routeId: string
  routeName: string
  routeCode: string
}

const DELIVERY_TYPES = ["All", "Daily", "Weekday", "Alt 1", "Alt 2"] as const
type DeliveryFilter = (typeof DELIVERY_TYPES)[number]

const getMarkerColor = (delivery: string) => {
  switch (delivery) {
    case "Daily":   return "#22c55e"
    case "Weekday": return "#3b82f6"
    case "Alt 1":   return "#eab308"
    case "Alt 2":   return "#a855f7"
    default:        return "#6b7280"
  }
}

const getDeliveryBadgeClass = (delivery: string) => {
  switch (delivery) {
    case "Daily":   return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
    case "Weekday": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
    case "Alt 1":   return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
    case "Alt 2":   return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
    default:        return "bg-muted text-muted-foreground"
  }
}

const createCustomIcon = (delivery: string, selected: boolean) => {
  const color = getMarkerColor(delivery)
  const size = selected ? 20 : 14
  const border = selected ? "3.5px" : "2.5px"
  const shadow = selected
    ? `0 0 0 3px ${color}33, 0 2px 8px rgba(0,0,0,0.4)`
    : "0 1px 4px rgba(0,0,0,0.35)"
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border} solid white;box-shadow:${shadow};transition:all 0.2s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Component that flies the map to a chosen point
function FlyToPoint({ point }: { point: EnrichedPoint | null }) {
  const map = useMap()
  const prevCode = useRef<string | null>(null)

  useEffect(() => {
    if (!point) return
    if (point.code === prevCode.current) return
    prevCode.current = point.code
    map.flyTo([point.latitude, point.longitude], 16, { animate: true, duration: 1.2 })
  }, [map, point])

  return null
}

// Component that fits bounds of all visible points
function FitBounds({ points }: { points: EnrichedPoint[] }) {
  const map = useMap()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || points.length === 0) return
    initialized.current = true
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14)
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [map, points])

  return null
}

const DEFAULT_ROUTES: Route[] = [
  {
    id: "route-1",
    name: "Route KL 7",
    code: "3PVK04",
    shift: "PM",
    deliveryPoints: [
      { code: "32", name: "KPJ Klang", delivery: "Daily", latitude: 3.0333, longitude: 101.4500, descriptions: [] },
      { code: "45", name: "Sunway Medical Centre", delivery: "Weekday", latitude: 3.0738, longitude: 101.6057, descriptions: [] },
      { code: "78", name: "Gleneagles KL", delivery: "Alt 1", latitude: 3.1493, longitude: 101.7055, descriptions: [] },
    ],
  },
]

export function MapMarkerPage() {
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState<EnrichedPoint | null>(null)
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const selectedListRef = useRef<HTMLButtonElement | null>(null)

  // Fetch routes from API
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch("/api/routes")
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setRoutes(data.data)
      }
    } catch {
      /* fallback to default routes */
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoutes()
  }, [fetchRoutes])

  // Flatten all delivery points that have lat/long across all routes
  const allPoints = useMemo<EnrichedPoint[]>(() => {
    const pts: EnrichedPoint[] = []
    for (const route of routes) {
      for (const dp of route.deliveryPoints) {
        if (dp.latitude !== 0 && dp.longitude !== 0) {
          pts.push({ ...dp, routeId: route.id, routeName: route.name, routeCode: route.code })
        }
      }
    }
    return pts
  }, [routes])

  // Count by delivery type
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allPoints.length }
    for (const p of allPoints) {
      c[p.delivery] = (c[p.delivery] || 0) + 1
    }
    return c
  }, [allPoints])

  // Filter by delivery type + search
  const filteredPoints = useMemo(() => {
    let pts = activeFilter === "All" ? allPoints : allPoints.filter(p => p.delivery === activeFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      pts = pts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.routeName.toLowerCase().includes(q) ||
        p.routeCode.toLowerCase().includes(q)
      )
    }
    return pts
  }, [allPoints, activeFilter, searchQuery])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedListRef.current) {
      selectedListRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedPoint])

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 md:px-6 md:pt-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Map Marker</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allPoints.length} location{allPoints.length !== 1 ? "s" : ""} with coordinates across {routes.length} route{routes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Body: split layout */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-0">
        {/* MAP — takes 60% height on mobile, 70% width on desktop */}
        <div className="relative h-[52vh] md:h-auto md:flex-[7] min-h-0 border-b md:border-b-0 md:border-r border-border">
          {allPoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20">
              <MapPin className="size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No locations with coordinates yet.</p>
              <p className="text-xs text-muted-foreground/70">Add latitude & longitude in Route List to see markers here.</p>
            </div>
          ) : (
            <MapContainer
              center={[3.15, 101.65]}
              zoom={11}
              style={{ width: "100%", height: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={allPoints} />
              <FlyToPoint point={selectedPoint} />
              {filteredPoints.map(point => (
                <Marker
                  key={`${point.routeId}-${point.code}`}
                  position={[point.latitude, point.longitude]}
                  icon={createCustomIcon(point.delivery, selectedPoint?.code === point.code && selectedPoint?.routeId === point.routeId)}
                  eventHandlers={{
                    click: () => setSelectedPoint(point),
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[140px]">
                      <strong className="block mb-1">{point.name}</strong>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Code: {point.code}</div>
                        <div>Route: {point.routeName}</div>
                        <div>Delivery: {point.delivery}</div>
                        <div className="font-mono">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* LIST PANEL — overflow scrollable */}
        <div className="flex flex-col md:flex-[3] min-h-0 md:max-w-xs lg:max-w-sm">
          {/* Search */}
          <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 text-sm rounded-lg"
                placeholder="Cari lokasi, route…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tab filter */}
          <div className="shrink-0 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none border-b border-border/60">
            {DELIVERY_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeFilter === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {type !== "All" && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: getMarkerColor(type) }}
                  />
                )}
                {type}
                <span className={`ml-0.5 text-[10px] font-bold px-1 py-0.5 rounded-md ${
                  activeFilter === type ? "bg-primary-foreground/20" : "bg-background/60"
                }`}>
                  {counts[type] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                <MapPin className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Tiada lokasi dijumpai.</p>
                {searchQuery && (
                  <button className="text-xs text-primary underline" onClick={() => setSearchQuery("")}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredPoints.map(point => {
                  const isSelected = selectedPoint?.code === point.code && selectedPoint?.routeId === point.routeId
                  return (
                    <button
                      key={`${point.routeId}-${point.code}`}
                      ref={isSelected ? selectedListRef : null}
                      onClick={() => setSelectedPoint(point)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/8 border-l-2 border-primary"
                          : "hover:bg-muted/50 border-l-2 border-transparent"
                      }`}
                    >
                      {/* Color dot */}
                      <div className="mt-0.5 shrink-0 flex flex-col items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-full border-2 border-white shrink-0"
                          style={{
                            background: getMarkerColor(point.delivery),
                            boxShadow: isSelected ? `0 0 0 2px ${getMarkerColor(point.delivery)}55` : "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                        {isSelected && <Navigation className="size-3 text-primary" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-sm truncate ${isSelected ? "text-primary" : ""}`}>
                            {point.name}
                          </span>
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${getDeliveryBadgeClass(point.delivery)}`}>
                            {point.delivery}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{point.code}</span>
                          <span className="text-[10px] text-muted-foreground/60">·</span>
                          <span className="text-xs text-muted-foreground truncate">{point.routeName}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer count */}
          <div className="shrink-0 px-3 py-2 border-t border-border/60 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing {filteredPoints.length} of {allPoints.length} marker{allPoints.length !== 1 ? "s" : ""}
              {selectedPoint && (
                <span className="ml-1.5 text-primary font-medium">· Selected: {selectedPoint.name}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
