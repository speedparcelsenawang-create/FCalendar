import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Delivery {
  id: number
  tracking_no: string
  recipient_name: string
  address: string
  status: "pending" | "delivered" | "failed" | "returned" | string
  delivery_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  failed:    { label: "Failed",    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  returned:  { label: "Returned",  className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-700" }
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ─── Column definition ────────────────────────────────────────────────────────
const COLUMNS: { field: keyof Delivery; header: string; minWidth: number }[] = [
  { field: "tracking_no",    header: "Tracking No",   minWidth: 160 },
  { field: "recipient_name", header: "Recipient",     minWidth: 180 },
  { field: "address",        header: "Address",       minWidth: 220 },
  { field: "status",         header: "Status",        minWidth: 110 },
  { field: "delivery_date",  header: "Delivery Date", minWidth: 130 },
  { field: "notes",          header: "Notes",         minWidth: 160 },
]

// ─── Cell renderer ─────────────────────────────────────────────────────────────
function CellValue({ field, value }: { field: keyof Delivery; value: unknown }) {
  if (field === "status") return <StatusBadge status={String(value ?? "")} />

  if ((field === "delivery_date" || field === "created_at" || field === "updated_at") && value) {
    const d = new Date(String(value))
    return <span>{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-MY")}</span>
  }

  return <span className="truncate">{value != null ? String(value) : "—"}</span>
}

// ─── Main Component (inline flex table, no dialog) ───────────────────────────
export function DeliveryTableDialog() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/deliveries")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDeliveries(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDeliveries() }, [fetchDeliveries])

  return (
    <div className="flex flex-col flex-1 min-h-0 border rounded-xl overflow-hidden shadow-sm bg-background">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40 shrink-0">
        <span className="text-xs text-muted-foreground">
          {!loading && !error ? `${deliveries.length} record(s)` : ""}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchDeliveries}
          disabled={loading}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── States ──────────────────────────────────────────────────── */}
      {loading && !deliveries.length && (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading deliveries…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Flex-scroll table ───────────────────────────────────────── */}
      {(!loading || deliveries.length > 0) && !error && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Frozen header */}
          <div className="shrink-0 overflow-x-auto border-b">
            <table className="w-full" style={{ minWidth: "860px" }}>
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium w-10">#</th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.field}
                      className="px-3 py-2.5 text-left font-medium"
                      style={{ minWidth: col.minWidth }}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm" style={{ minWidth: "860px" }}>
              <tbody className="divide-y divide-border">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="text-center py-16 text-muted-foreground">
                      No deliveries found.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground w-10 text-xs">{idx + 1}</td>
                      {COLUMNS.map((col) => (
                        <td key={col.field} className="px-3 py-2.5" style={{ minWidth: col.minWidth }}>
                          <CellValue field={col.field} value={row[col.field]} />
                        </td>
                      ))}
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
