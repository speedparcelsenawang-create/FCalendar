import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { GoogleMap, useLoadScript, InfoWindow } from "@react-google-maps/api"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LIBRARIES = ["marker"] as any
import {
  MapPin, Navigation, Search, X, SlidersHorizontal,
  Palette, Check, Map as MapIcon, Settings2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""

const GMAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  mapId: "DEMO_MAP_ID",
}

/**
 * Teardrop pin HTMLElement for AdvancedMarkerElement.
 * selected → larger with glow ring.
 */
function createPinElement(color: string, selected: boolean): HTMLElement {
  const w = selected ? 30 : 22
  const h = Math.round(w * 1.5)
  const wrapper = document.createElement("div")
  wrapper.style.cssText = `
    cursor: pointer;
    transform-origin: bottom center;
    transition: transform 0.15s ease;
    transform: ${selected ? "scale(1.15)" : "scale(1)"};
  `
  wrapper.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"
         width="${w}" height="${h}"
         style="filter: drop-shadow(0 ${selected ? "3px 8px" : "1px 4px"} rgba(0,0,0,${selected ? "0.5" : "0.4"})">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9.188 12 24 12 24S24 21.188 24 12C24 5.373 18.627 0 12 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="11.5" r="4.5" fill="white" opacity="0.92"/>
    </svg>
  `
  return wrapper
}

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_DEFAULT_VIEW = "mapMarkerDefaultView"
const LS_ROUTE_COLORS = "mapRouteColors"
const FALLBACK_CENTER: [number, number] = [3.0695500, 101.5469179]
const FALLBACK_ZOOM = 12

const DELIVERY_COLORS: Record<string, string> = {
  Daily:   "#22c55e",
  Weekday: "#3b82f6",
  "Alt 1": "#eab308",
  "Alt 2": "#a855f7",
}

const PRESET_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#8b5cf6","#ec4899","#6b7280","#1d4ed8",
  "#0284c7","#16a34a","#b45309","#7c3aed","#be185d",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadDefaultView(): { center: [number, number]; zoom: number } {
  try {
    const raw = localStorage.getItem(LS_DEFAULT_VIEW)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { center: FALLBACK_CENTER, zoom: FALLBACK_ZOOM }
}

function saveDefaultView(center: [number, number], zoom: number) {
  localStorage.setItem(LS_DEFAULT_VIEW, JSON.stringify({ center, zoom }))
}

function loadRouteColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_ROUTE_COLORS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveRouteColors(colors: Record<string, string>) {
  localStorage.setItem(LS_ROUTE_COLORS, JSON.stringify(colors))
}

function getEffectiveColor(
  point: EnrichedPoint,
  routeColors: Record<string, string>,
): string {
  return routeColors[point.routeId] ?? DELIVERY_COLORS[point.delivery] ?? "#6b7280"
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const DEFAULT_ROUTES: Route[] = [
  {
    id: "route-1",
    name: "Route KL 7",
    code: "3PVK04",
    shift: "PM",
    deliveryPoints: [
      { code: "32", name: "KPJ Klang",            delivery: "Daily",   latitude: 3.0333, longitude: 101.4500, descriptions: [] },
      { code: "45", name: "Sunway Medical Centre", delivery: "Weekday", latitude: 3.0738, longitude: 101.6057, descriptions: [] },
      { code: "78", name: "Gleneagles KL",         delivery: "Alt 1",   latitude: 3.1493, longitude: 101.7055, descriptions: [] },
    ],
  },
]

// ─── Filter Modal ─────────────────────────────────────────────────────────────
interface FilterModalProps {
  open: boolean
  onClose: () => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  deliveryFilter: DeliveryFilter
  setDeliveryFilter: (v: DeliveryFilter) => void
  selectedRouteIds: Set<string>
  setSelectedRouteIds: (v: Set<string>) => void
  routes: Route[]
  counts: Record<string, number>
}

function FilterModal({
  open, onClose,
  searchQuery, setSearchQuery,
  deliveryFilter, setDeliveryFilter,
  selectedRouteIds, setSelectedRouteIds,
  routes, counts,
}: FilterModalProps) {
  const toggleRoute = (id: string) => {
    const next = new Set(selectedRouteIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedRouteIds(next)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filter Marker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Search */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Location name, code, route…"
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

          {/* Delivery type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Type</p>
            <div className="flex flex-wrap gap-1.5">
              {DELIVERY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setDeliveryFilter(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    deliveryFilter === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {type !== "All" && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: DELIVERY_COLORS[type] ?? "#6b7280" }}
                    />
                  )}
                  {type}
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                    deliveryFilter === type ? "bg-white/20" : "bg-background/60"
                  }`}>
                    {counts[type] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Route filter */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filter Route</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedRouteIds(new Set())}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                  selectedRouteIds.size === 0
                    ? "bg-primary/10 border-primary text-primary font-medium"
                    : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span className={`flex size-4 items-center justify-center rounded border-2 shrink-0 ${
                  selectedRouteIds.size === 0 ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}>
                  {selectedRouteIds.size === 0 && <Check className="size-2.5 text-white" />}
                </span>
                Semua Route
              </button>

              {routes.map(route => {
                const sel     = selectedRouteIds.has(route.id)
                const ptCount = route.deliveryPoints.filter(p => p.latitude !== 0 && p.longitude !== 0).length
                return (
                  <button
                    key={route.id}
                    onClick={() => toggleRoute(route.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                      sel
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span className={`flex size-4 items-center justify-center rounded border-2 shrink-0 ${
                      sel ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}>
                      {sel && <Check className="size-2.5 text-white" />}
                    </span>
                    <span className="flex-1 text-left truncate">{route.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{route.code}</span>
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded shrink-0">{ptCount}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeliveryFilter("All"); setSelectedRouteIds(new Set()); setSearchQuery("") }}
            >
              Reset
            </Button>
            <Button size="sm" onClick={onClose}>Guna Filter</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Route Color Modal ────────────────────────────────────────────────────────
interface RouteColorModalProps {
  open: boolean
  onClose: () => void
  routes: Route[]
  routeColors: Record<string, string>
  onChange: (colors: Record<string, string>) => void
}

function RouteColorModal({ open, onClose, routes, routeColors, onChange }: RouteColorModalProps) {
  const [local, setLocal] = useState<Record<string, string>>(routeColors)

  useEffect(() => {
    if (open) setLocal({ ...routeColors })
  }, [open, routeColors])

  const setColor   = (id: string, color: string) => setLocal(prev => ({ ...prev, [id]: color }))
  const resetRoute = (id: string) => setLocal(prev => { const n = { ...prev }; delete n[id]; return n })

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Marker Colour per Route
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">
            Set marker colour for each route. If not set, colour follows delivery type.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {routes.map(route => {
              const current = local[route.id]
              return (
                <div key={route.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{route.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{route.code} · {route.shift}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Preset swatches */}
                    <div className="flex flex-wrap gap-1 max-w-[88px]">
                      {PRESET_COLORS.slice(0, 6).map(color => (
                        <button
                          key={color}
                          title={color}
                          onClick={() => setColor(route.id, color)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                            current === color ? "border-white scale-125 shadow-md" : "border-transparent"
                          }`}
                          style={{ background: color }}
                        />
                      ))}
                    </div>

                    {/* Custom colour wheel */}
                    <div
                      className="relative size-7 rounded-full border-2 border-dashed border-muted-foreground/40 overflow-hidden hover:border-primary transition-colors cursor-pointer"
                      style={{ background: current ?? "conic-gradient(red,yellow,lime,aqua,blue,magenta,red)" }}
                      title="Custom colour"
                    >
                      <input
                        type="color"
                        value={current ?? "#3b82f6"}
                        onChange={e => setColor(route.id, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>

                    {current && (
                      <button
                        onClick={() => resetRoute(route.id)}
                        title="Reset to delivery colour"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Default colour (delivery type)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DELIVERY_COLORS).map(([type, color]) => (
                <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-full border border-white/50" style={{ background: color }} />
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => { onChange(local); onClose() }}>Save Colours</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Map Settings Modal ───────────────────────────────────────────────────────
interface MapSettingsModalProps {
  open: boolean
  onClose: () => void
  defaultView: { center: [number, number]; zoom: number }
  onSave: (view: { center: [number, number]; zoom: number }) => void
}

function MapSettingsModal({ open, onClose, defaultView, onSave }: MapSettingsModalProps) {
  const [lat,  setLat]  = useState(String(defaultView.center[0]))
  const [lng,  setLng]  = useState(String(defaultView.center[1]))
  const [zoom, setZoom] = useState(String(defaultView.zoom))

  useEffect(() => {
    if (open) {
      setLat(String(defaultView.center[0]))
      setLng(String(defaultView.center[1]))
      setZoom(String(defaultView.zoom))
    }
  }, [open, defaultView])

  const handleSave = () => {
    const latN  = parseFloat(lat)
    const lngN  = parseFloat(lng)
    const zoomN = parseInt(zoom, 10)
    if (isNaN(latN) || isNaN(lngN) || isNaN(zoomN)) return
    onSave({ center: [latN, lngN], zoom: zoomN })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="size-4" />
            Default Map View Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">
            Coordinates and zoom shown by default when opening Map Marker.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latitude</label>
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="3.0695500" className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Longitude</label>
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="101.5469179" className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zoom (1–18)</label>
              <Input type="number" min={1} max={18} value={zoom} onChange={e => setZoom(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              onClick={() => { setLat(String(FALLBACK_CENTER[0])); setLng(String(FALLBACK_CENTER[1])); setZoom(String(FALLBACK_ZOOM)) }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Reset to default
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MapMarkerPage() {
  const [routes,           setRoutes]           = useState<Route[]>(DEFAULT_ROUTES)
  const [isLoading,        setIsLoading]        = useState(true)
  const [selectedPoint,    setSelectedPoint]    = useState<EnrichedPoint | null>(null)
  const [deliveryFilter,   setDeliveryFilter]   = useState<DeliveryFilter>("All")
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set())
  const [searchQuery,      setSearchQuery]      = useState("")
  const [filterOpen,       setFilterOpen]       = useState(false)
  const [colorOpen,        setColorOpen]        = useState(false)
  const [mapSettingsOpen,  setMapSettingsOpen]  = useState(false)
  const [routeColors,      setRouteColors]      = useState<Record<string, string>>(loadRouteColors)
  const [defaultView,      setDefaultView]      = useState(loadDefaultView)
  const [infoWindowPoint,  setInfoWindowPoint]  = useState<EnrichedPoint | null>(null)
  const selectedListRef = useRef<HTMLButtonElement | null>(null)
  const mapRef          = useRef<google.maps.Map | null>(null)
  const flyPrevKey      = useRef<string | null>(null)
  const { isLoaded: gmapsLoaded } = useLoadScript({ googleMapsApiKey: GMAP_KEY, libraries: LIBRARIES })
  const [mapInstance,  setMapInstance]  = useState<google.maps.Map | null>(null)
  const markerMapRef = useRef<Map<string, {
    marker: google.maps.marker.AdvancedMarkerElement
    el: HTMLElement
    point: EnrichedPoint
  }>>(new Map())

  // Fetch routes from API
  const fetchRoutes = useCallback(async () => {
    try {
      const res  = await fetch("/api/routes")
      const data = await res.json()
      if (data.success && data.data.length > 0) setRoutes(data.data)
    } catch { /* fallback */ }
    finally   { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchRoutes() }, [fetchRoutes])

  const allPoints = useMemo<EnrichedPoint[]>(() => {
    const pts: EnrichedPoint[] = []
    for (const route of routes) {
      for (const dp of route.deliveryPoints) {
        if (dp.latitude !== 0 && dp.longitude !== 0)
          pts.push({ ...dp, routeId: route.id, routeName: route.name, routeCode: route.code })
      }
    }
    return pts
  }, [routes])

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allPoints.length }
    for (const p of allPoints) c[p.delivery] = (c[p.delivery] ?? 0) + 1
    return c
  }, [allPoints])

  const filteredPoints = useMemo(() => {
    let pts = deliveryFilter === "All" ? allPoints : allPoints.filter(p => p.delivery === deliveryFilter)
    if (selectedRouteIds.size > 0) pts = pts.filter(p => selectedRouteIds.has(p.routeId))
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
  }, [allPoints, deliveryFilter, selectedRouteIds, searchQuery])

  useEffect(() => {
    selectedListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedPoint])

  // Fly to selected point on Google Maps
  useEffect(() => {
    if (!selectedPoint || !mapRef.current) return
    const key = `${selectedPoint.routeId}-${selectedPoint.code}`
    if (key === flyPrevKey.current) return
    flyPrevKey.current = key
    mapRef.current.panTo({ lat: selectedPoint.latitude, lng: selectedPoint.longitude })
    mapRef.current.setZoom(16)
  }, [selectedPoint])

  const handleSaveRouteColors = (colors: Record<string, string>) => {
    setRouteColors(colors)
    saveRouteColors(colors)
  }

  const handleSaveDefaultView = (view: { center: [number, number]; zoom: number }) => {
    setDefaultView(view)
    saveDefaultView(view.center, view.zoom)
  }

  const activeFiltersCount =
    (deliveryFilter !== "All" ? 1 : 0) + selectedRouteIds.size + (searchQuery.trim() ? 1 : 0)

  // Create / sync AdvancedMarkers when map, points or colours change
  useEffect(() => {
    if (!mapInstance) return
    const prev = markerMapRef.current
    const nextKeys = new Set(filteredPoints.map(p => `${p.routeId}-${p.code}`))

    // Remove markers no longer in filtered list
    for (const [key, { marker }] of prev) {
      if (!nextKeys.has(key)) { marker.map = null; prev.delete(key) }
    }

    // Add new markers, update existing colour
    for (const point of filteredPoints) {
      const key   = `${point.routeId}-${point.code}`
      const color = getEffectiveColor(point, routeColors)
      const isSelected = selectedPoint?.code === point.code && selectedPoint?.routeId === point.routeId

      if (prev.has(key)) {
        // Update colour on existing element
        const { el } = prev.get(key)!
        const svg = el.querySelector("path")
        if (svg) svg.setAttribute("fill", color)
      } else {
        const el     = createPinElement(color, isSelected)
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map:      mapInstance,
          position: { lat: point.latitude, lng: point.longitude },
          content:  el,
          title:    point.name,
        })
        marker.addListener("click", () => {
          setSelectedPoint(point)
          setInfoWindowPoint(point)
        })
        prev.set(key, { marker, el, point })
      }
    }
  }, [mapInstance, filteredPoints, routeColors]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected-state styling without recreating markers
  useEffect(() => {
    for (const [, { el, point }] of markerMapRef.current) {
      const isSelected = selectedPoint?.code === point.code && selectedPoint?.routeId === point.routeId
      el.style.transform        = isSelected ? "scale(1.15)" : "scale(1)"
      el.style.zIndex           = isSelected ? "100" : ""
      const svg = el.querySelector("svg")
      if (svg) svg.style.filter = isSelected
        ? "drop-shadow(0 3px 8px rgba(0,0,0,0.5))"
        : "drop-shadow(0 1px 4px rgba(0,0,0,0.4))"
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
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-5 pb-3 md:px-6 md:pt-6 md:pb-4 border-b border-border/50 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Map Marker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allPoints.length} locations · {routes.length} route
            {(deliveryFilter !== "All" || selectedRouteIds.size > 0) && (
              <span className="ml-1 text-primary font-medium">· {filteredPoints.length} shown</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <button
            onClick={() => setColorOpen(true)}
            title="Set marker colour per route"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Palette className="size-3.5" />
            <span className="hidden sm:inline">Route Colours</span>
          </button>
          <button
            onClick={() => setMapSettingsOpen(true)}
            title="Map default view settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="size-3.5" />
            <span className="hidden sm:inline">Map Settings</span>
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* MAP */}
        <div className="relative h-[52vh] md:h-auto md:flex-[7] min-h-0 border-b md:border-b-0 md:border-r border-border">
          {allPoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20">
              <MapPin className="size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No locations with coordinates.</p>
              <p className="text-xs text-muted-foreground/70">Add lat/lng in Route List to display markers.</p>
            </div>
          ) : (
            (!gmapsLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={{ lat: defaultView.center[0], lng: defaultView.center[1] }}
                zoom={defaultView.zoom}
                options={GMAP_OPTIONS}
                onLoad={(map) => { mapRef.current = map; setMapInstance(map) }}
                onClick={() => setInfoWindowPoint(null)}
              >
                {infoWindowPoint && (
                  <InfoWindow
                    position={{ lat: infoWindowPoint.latitude, lng: infoWindowPoint.longitude }}
                    onCloseClick={() => setInfoWindowPoint(null)}
                  >
                    <div className="text-sm min-w-[150px]">
                      <strong className="block mb-1">{infoWindowPoint.name}</strong>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>Code: {infoWindowPoint.code}</div>
                        <div>Route: {infoWindowPoint.routeName} ({infoWindowPoint.routeCode})</div>
                        <div>Type: {infoWindowPoint.delivery}</div>
                        <div className="font-mono">{infoWindowPoint.latitude.toFixed(6)}, {infoWindowPoint.longitude.toFixed(6)}</div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ))
          )}
        </div>

        {/* LIST PANEL */}
        <div className="flex flex-col md:flex-[3] min-h-0 md:max-w-xs lg:max-w-sm">
          {/* Filter bar */}
          <div className="shrink-0 px-4 pt-3.5 pb-3 border-b border-border/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-8 text-sm rounded-lg"
                placeholder="Search location…"
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
            <button
              onClick={() => setFilterOpen(true)}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeFiltersCount > 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </button>
          </div>

          {/* Active filter chips */}
          {(deliveryFilter !== "All" || selectedRouteIds.size > 0) && (
            <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5 border-b border-border/60 bg-muted/10">
              {deliveryFilter !== "All" && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  <span className="w-2 h-2 rounded-full" style={{ background: DELIVERY_COLORS[deliveryFilter] }} />
                  {deliveryFilter}
                  <button onClick={() => setDeliveryFilter("All")} className="ml-0.5 hover:text-primary/60"><X className="size-3" /></button>
                </span>
              )}
              {routes.filter(r => selectedRouteIds.has(r.id)).map(r => (
                <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  {r.name}
                  <button
                    onClick={() => { const n = new Set(selectedRouteIds); n.delete(r.id); setSelectedRouteIds(n) }}
                    className="ml-0.5 hover:text-primary/60"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                <MapPin className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No locations found.</p>
                {(searchQuery || deliveryFilter !== "All" || selectedRouteIds.size > 0) && (
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => { setSearchQuery(""); setDeliveryFilter("All"); setSelectedRouteIds(new Set()) }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredPoints.map(point => {
                  const isSelected  = selectedPoint?.code === point.code && selectedPoint?.routeId === point.routeId
                  const markerColor = getEffectiveColor(point, routeColors)
                  return (
                    <button
                      key={`${point.routeId}-${point.code}`}
                      ref={isSelected ? selectedListRef : null}
                      onClick={() => setSelectedPoint(point)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/8 border-l-2 border-primary"
                          : "hover:bg-muted/50 border-l-2 border-transparent"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 flex flex-col items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border-2 border-white"
                          style={{
                            background: markerColor,
                            boxShadow: isSelected ? `0 0 0 2px ${markerColor}55` : "0 1px 3px rgba(0,0,0,0.22)",
                          }}
                        />
                        {isSelected && <Navigation className="size-3 text-primary" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-sm truncate ${isSelected ? "text-primary" : ""}`}>
                            {point.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{point.code}</span>
                          <span className="text-[10px] text-muted-foreground/60">·</span>
                          <span className="text-xs text-muted-foreground truncate">{point.routeName}</span>
                          <span className="text-[10px] text-muted-foreground/60">·</span>
                          <span className="text-xs text-muted-foreground">{point.delivery}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 py-2.5 border-t border-border/60 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Tunjuk {filteredPoints.length} / {allPoints.length} marker
              {selectedPoint && (
                <span className="ml-1.5 text-primary font-medium">· {selectedPoint.name}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        deliveryFilter={deliveryFilter}
        setDeliveryFilter={setDeliveryFilter}
        selectedRouteIds={selectedRouteIds}
        setSelectedRouteIds={setSelectedRouteIds}
        routes={routes}
        counts={counts}
      />

      <RouteColorModal
        open={colorOpen}
        onClose={() => setColorOpen(false)}
        routes={routes}
        routeColors={routeColors}
        onChange={handleSaveRouteColors}
      />

      <MapSettingsModal
        open={mapSettingsOpen}
        onClose={() => setMapSettingsOpen(false)}
        defaultView={defaultView}
        onSave={handleSaveDefaultView}
      />
    </div>
  )
}
