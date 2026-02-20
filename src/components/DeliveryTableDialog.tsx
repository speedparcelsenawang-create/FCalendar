import { useState, useEffect, useCallback, useMemo } from "react"
import { RefreshCw, Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2" | string
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  qrCodeImageUrl?: string
  qrCodeDestinationUrl?: string
}

interface Route {
  id: string
  name: string
  code: string
  shift: string
  deliveryPoints: DeliveryPoint[]
}

interface FlatPoint extends DeliveryPoint {
  routeId: string
  routeName: string
  routeCode: string
  routeShift: string
  _rowIndex: number
  _dupCode: boolean
  _dupName: boolean
}

const KNOWN_DELIVERY = new Set(["Daily", "Weekday", "Alt 1", "Alt 2"])

function ShiftBadge({ shift }: { shift: string }) {
  const upper = shift?.toUpperCase()
  if (upper === "AM")
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-50">AM</span>
  if (upper === "PM")
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-700">PM</span>
  if (!shift) return null
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">{shift}</span>
}

// ─── Delivery Badge ───────────────────────────────────────────────────────────
const deliveryConfig: Record<string, string> = {
  Daily:   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Weekday: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Alt 1": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Alt 2": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
}

function DeliveryBadge({ value }: { value: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", deliveryConfig[value] ?? "bg-gray-100 text-gray-700")}>
      {value}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DeliveryTableDialog() {
  const [routes, setRoutes]   = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchRoutes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/routes")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setRoutes(json.data ?? json ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoutes() }, [fetchRoutes])

  // ── Flatten all points + detect duplicates ───────────────────────────────
  const { flat, dupCodeCount, dupNameCount } = useMemo(() => {
    const all: FlatPoint[] = []
    routes.forEach(route => {
      (route.deliveryPoints ?? []).forEach((pt, i) => {
        all.push({ ...pt, routeId: route.id, routeName: route.name, routeCode: route.code, routeShift: route.shift ?? "", _rowIndex: i, _dupCode: false, _dupName: false })
      })
    })

    // Count occurrences
    const codeCounts: Record<string, number> = {}
    const nameCounts: Record<string, number> = {}
    all.forEach(p => {
      codeCounts[p.code.trim().toLowerCase()] = (codeCounts[p.code.trim().toLowerCase()] ?? 0) + 1
      nameCounts[p.name.trim().toLowerCase()] = (nameCounts[p.name.trim().toLowerCase()] ?? 0) + 1
    })

    let dupCodeCount = 0
    let dupNameCount = 0
    all.forEach(p => {
      p._dupCode = codeCounts[p.code.trim().toLowerCase()] > 1
      p._dupName = nameCounts[p.name.trim().toLowerCase()] > 1
      if (p._dupCode) dupCodeCount++
      if (p._dupName) dupNameCount++
    })

    return { flat: all, dupCodeCount, dupNameCount }
  }, [routes])

  const totalPoints = flat.length

  return (
    <div className="flex flex-col flex-1 min-h-0 border rounded-xl overflow-hidden shadow-sm bg-background">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-muted/40 shrink-0">
        <span className="text-xs text-muted-foreground mr-auto">
          {!loading && !error && `${totalPoints} location point(s) across ${routes.length} route(s)`}
        </span>
        {!loading && !error && dupCodeCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {dupCodeCount} duplicate code(s)
          </span>
        )}
        {!loading && !error && dupNameCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {dupNameCount} duplicate name(s)
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={fetchRoutes} disabled={loading} className="h-7 gap-1.5 text-xs">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {loading && !flat.length && (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading routes…</span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Flex-scroll table ────────────────────────────────────────── */}
      {(!loading || flat.length > 0) && !error && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Frozen header */}
          <div className="shrink-0 overflow-x-auto border-b">
            <table className="w-full" style={{ minWidth: "860px" }}>
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 120 }}>Route</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 80 }}>Code</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 200 }}>Location Name</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 110 }}>Delivery</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 100 }}>Coordinates</th>
                  <th className="px-3 py-2.5 text-left font-medium" style={{ minWidth: 80 }}>Descriptions</th>
                  <th className="px-3 py-2.5 text-center font-medium" style={{ minWidth: 60 }}>Action</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm" style={{ minWidth: "860px" }}>
              <tbody className="divide-y divide-border">
                {flat.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      No location points found.
                    </td>
                  </tr>
                ) : (
                  flat.map((pt, idx) => (
                    <tr
                      key={`${pt.routeId}-${pt.code}-${idx}`}
                      className={cn(
                        "transition-colors",
                        (pt._dupCode || pt._dupName)
                          ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground w-8 text-xs">{idx + 1}</td>

                      {/* Route */}
                      <td className="px-3 py-2.5" style={{ minWidth: 120 }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium leading-tight">{pt.routeName}</span>
                          <ShiftBadge shift={pt.routeShift} />
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-3 py-2.5" style={{ minWidth: 80 }}>
                        <span className={cn("font-mono text-xs", pt._dupCode && "text-amber-600 dark:text-amber-400 font-bold")}>
                          {pt.code}
                        </span>
                        {pt._dupCode && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                        <span className={cn(pt._dupName && "text-rose-600 dark:text-rose-400 font-semibold")}>
                          {pt.name}
                        </span>
                        {pt._dupName && <AlertTriangle className="inline w-3 h-3 ml-1 text-rose-500" />}
                      </td>

                      {/* Delivery */}
                      <td className="px-3 py-2.5" style={{ minWidth: 110 }}>
                        <DeliveryBadge value={pt.delivery} />
                      </td>

                      {/* Coordinates */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono" style={{ minWidth: 100 }}>
                        {pt.latitude !== 0 || pt.longitude !== 0
                          ? `${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)}`
                          : "—"
                        }
                      </td>

                      {/* Descriptions count */}
                      <td className="px-3 py-2.5 text-xs text-muted-foreground" style={{ minWidth: 80 }}>
                        {pt.descriptions?.length > 0 ? `${pt.descriptions.length} item(s)` : "—"}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 text-center" style={{ minWidth: 60 }}>
                        <Info
                          className={cn(
                            "w-4 h-4 mx-auto",
                            KNOWN_DELIVERY.has(pt.delivery)
                              ? "text-green-700 dark:text-green-500"
                              : "text-red-600 dark:text-red-400"
                          )}
                          />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
