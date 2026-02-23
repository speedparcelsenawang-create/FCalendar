import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { List, Info, Plus, Check, X, Edit2, Trash2, Search, Settings, Save, ArrowUp, ArrowDown, RotateCcw, Truck, Loader2, Maximize2, Minimize2, StickyNote, SlidersHorizontal, Pin, PinOff, LayoutGrid } from "lucide-react"
import { RowInfoModal } from "./RowInfoModal"
import { RouteNotesModal, appendChangelog } from "./RouteNotesModal"
import { useEditMode } from "@/contexts/EditModeContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  qrCodeImageUrl?: string
  qrCodeDestinationUrl?: string
  avatarImageUrl?: string
  avatarImages?: string[]
}

interface Route {
  id: string
  name: string
  code: string
  shift: string
  deliveryPoints: DeliveryPoint[]
  updatedAt?: string
}

// Returns true if the delivery point is active on the given date
function isDeliveryActive(delivery: DeliveryPoint['delivery'], date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay()   // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const dateNum   = date.getDate()  // 1-31
  switch (delivery) {
    case 'Daily':   return true
    case 'Alt 1':   return dateNum % 2 !== 0   // odd dates
    case 'Alt 2':   return dateNum % 2 === 0   // even dates
    case 'Weekday': return dayOfWeek <= 4       // Sun(0) – Thu(4)
    default:        return true
  }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ── Distance helpers ──────────────────────────────────────────────
const DEFAULT_MAP_CENTER = { lat: 3.0695500, lng: 101.5469179 }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatKm(km: number): string {
  const rounded = Math.round(km * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} Km`
}

const DEFAULT_ROUTES: Route[] = [
  {
    id: "route-1",
    name: "Route KL 7",
    code: "3PVK04",
    shift: "PM",
    deliveryPoints: [
      {
        code: "32",
        name: "KPJ Klang",
        delivery: "Daily",
        latitude: 3.0333,
        longitude: 101.4500,
        descriptions: [
          { key: "Bank", value: "CIMB" },
          { key: "Fuel", value: "Petrol" }
        ]
      },
      {
        code: "45",
        name: "Sunway Medical Centre",
        delivery: "Weekday",
        latitude: 3.0738,
        longitude: 101.6057,
        descriptions: []
      },
      {
        code: "78",
        name: "Gleneagles KL",
        delivery: "Alt 1",
        latitude: 3.1493,
        longitude: 101.7055,
        descriptions: [
          { key: "Contact", value: "03-42571300" }
        ]
      },
    ]
  }
]

export function RouteList() {
  const { isEditMode, hasUnsavedChanges, isSaving, setHasUnsavedChanges, registerSaveHandler, saveChanges, registerDiscardHandler } = useEditMode()
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES)
  const routesSnapshotRef = useRef<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentRouteId, setCurrentRouteId] = useState<string>("route-1")
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<DeliveryPoint | null>(null)
  const [addRouteDialogOpen, setAddRouteDialogOpen] = useState(false)
  const [editRouteDialogOpen, setEditRouteDialogOpen] = useState(false)
  const [deleteRouteConfirmOpen, setDeleteRouteConfirmOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null)
  const [newRoute, setNewRoute] = useState({ name: "", code: "", shift: "AM" })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRegion, setFilterRegion] = useState<"all" | "KL" | "Sel">("all")
  const [filterShift, setFilterShift] = useState<"all" | "AM" | "PM">("all")

  // Card columns — synced with Settings Display
  const [cardCols, setCardCols] = useState<string>(() => localStorage.getItem('fcalendar_card_cols') || '2')
  useEffect(() => {
    const sync = () => setCardCols(localStorage.getItem('fcalendar_card_cols') || '2')
    window.addEventListener('fcalendar_card_cols_changed', sync)
    return () => window.removeEventListener('fcalendar_card_cols_changed', sync)
  }, [])
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailFullscreen, setDetailFullscreen] = useState(false)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [notesRouteId, setNotesRouteId] = useState<string>("")
  const [notesRouteName, setNotesRouteName] = useState<string>("")
  const [infoModalRouteId, setInfoModalRouteId] = useState<string | null>(null)

  // Pinned routes stored in localStorage
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]").map((r: { id: string }) => r.id)) }
    catch { return new Set() }
  })

  function togglePin(route: Route) {
    const stored: Array<{ id: string; name: string; code: string; shift: string }> = (() => {
      try { return JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]") } catch { return [] }
    })()
    let updated
    if (pinnedIds.has(route.id)) {
      updated = stored.filter(r => r.id !== route.id)
    } else {
      updated = [...stored.filter(r => r.id !== route.id), { id: route.id, name: route.name, code: route.code, shift: route.shift }]
    }
    localStorage.setItem("fcalendar_pinned_routes", JSON.stringify(updated))
    setPinnedIds(new Set(updated.map(r => r.id)))
    window.dispatchEvent(new Event("fcalendar_pins_changed"))
  }

  // Fetch routes from database
  const fetchRoutes = useCallback(async (preserveCurrentId?: string) => {
    try {
      const res = await fetch('/api/routes')
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setRoutes(data.data)
        // Keep current route if it still exists, else go to first
        const stillExists = preserveCurrentId && data.data.some((r: Route) => r.id === preserveCurrentId)
        setCurrentRouteId(stillExists ? preserveCurrentId! : data.data[0].id)
      }
    } catch {
      /* fallback to default routes */
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch routes from database on mount
  useEffect(() => {
    fetchRoutes()
  }, [fetchRoutes])

  // Load My Sort List from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fcalendar_my_sorts')
      if (stored) {
        const parsed: SavedRowOrder[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedRowOrders(parsed)
          setSavedRowOrderOnce(true)
        }
      }
    } catch {}
  }, [])

  const currentRoute = routes.find(r => r.id === currentRouteId)
  const deliveryPoints = currentRoute?.deliveryPoints || []
  const setDeliveryPoints = (updater: (prev: DeliveryPoint[]) => DeliveryPoint[]) => {
    setHasUnsavedChanges(true)
    setRoutes(prev => prev.map(route => 
      route.id === currentRouteId 
        ? { ...route, deliveryPoints: updater(route.deliveryPoints) }
        : route
    ))
  }
  // Filter routes based on search query + region, then sort A-Z / 1-10 by name
  const filteredRoutes = useMemo(() => {
    const list = routes.filter(route => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchSearch =
          route.name.toLowerCase().includes(query) ||
          route.code.toLowerCase().includes(query) ||
          route.shift.toLowerCase().includes(query)
        if (!matchSearch) return false
      }
      if (filterRegion !== "all") {
        const hay = (route.name + " " + route.code).toLowerCase()
        const needle = filterRegion.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (filterShift !== "all" && route.shift !== filterShift) return false
      return true
    })
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [routes, searchQuery, filterRegion, filterShift])
  const [editingCell, setEditingCell] = useState<{ rowCode: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [editError, setEditError] = useState<string>("")
  const [popoverOpen, setPopoverOpen] = useState<{ [key: string]: boolean }>({})
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [addPointDialogOpen, setAddPointDialogOpen] = useState(false)
  const [newPoint, setNewPoint] = useState({
    code: "",
    name: "",
    delivery: "Daily" as "Daily" | "Weekday" | "Alt 1" | "Alt 2",
    latitude: 0,
    longitude: 0,
    descriptions: [] as { key: string; value: string }[]
  })
  const [codeError, setCodeError] = useState<string>("")
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedTargetRoute, setSelectedTargetRoute] = useState("")
  const [pendingSelectedRows, setPendingSelectedRows] = useState<string[]>([])
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [deliveryModalCode, setDeliveryModalCode] = useState<string | null>(null)
  const [openKmTooltip, setOpenKmTooltip] = useState<string | null>(null)
  // tracks locally-edited cells that haven't been pushed to DB yet
  const [pendingCellEdits, setPendingCellEdits] = useState<Set<string>>(new Set())

  // ── Settings Modal ────────────────────────────────────────────────
  type ColumnKey = 'no' | 'code' | 'name' | 'delivery' | 'action'

  interface ColumnDef {
    key: ColumnKey
    label: string
    visible: boolean
  }

  const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: 'no',       label: 'No',       visible: true },
    { key: 'code',     label: 'Code',     visible: true },
    { key: 'name',     label: 'Name',     visible: true },
    { key: 'delivery', label: 'Delivery', visible: true },
    { key: 'action',   label: 'Action',   visible: true },
  ]

  interface SavedRowOrder {
    id: string
    label: string
    order: string[]   // array of point.code in order
  }

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMenu, setSettingsMenu] = useState<'column' | 'row' | 'sorting'>('column')

  // Column Customize
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS)
  const [draftColumns, setDraftColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS)
  const [savedColumns, setSavedColumns] = useState<ColumnDef[] | null>(null)
  const columnsDirty = useMemo(() => JSON.stringify(draftColumns) !== JSON.stringify(columns), [draftColumns, columns])
  const columnsHasSaved = savedColumns !== null

  // Row Customize
  type RowOrderEntry = { code: string; position: string; name: string; delivery: string }
  const buildRowEntries = (pts: typeof deliveryPoints): RowOrderEntry[] =>
    pts.map((p, i) => ({ code: p.code, position: String(i + 1), name: p.name, delivery: p.delivery }))
  const [draftRowOrder, setDraftRowOrder] = useState<RowOrderEntry[]>([])
  const [savedRowOrders, setSavedRowOrders] = useState<SavedRowOrder[]>([])
  const [savedRowOrderOnce, setSavedRowOrderOnce] = useState(false)
  const rowOrderDirty = useMemo(() => {
    const orig = buildRowEntries(deliveryPoints)
    return JSON.stringify(draftRowOrder.map(r => r.code)) !== JSON.stringify(orig.map(r => r.code))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRowOrder, deliveryPoints])
  const [rowOrderError, setRowOrderError] = useState<string>("")

  // Sorting
  type SortType = { type: 'column'; key: ColumnKey; dir: 'asc' | 'desc' } | { type: 'saved'; id: string } | null
  const [activeSortConfig, setActiveSortConfig] = useState<SortType>(null)
  const [draftSort, setDraftSort] = useState<SortType>(null)
  const [sortingTab, setSortingTab] = useState<'example' | 'my'>('example')

  const openSettings = (routeId: string) => {
    setCurrentRouteId(routeId)
    setDraftColumns([...columns])
    setDraftRowOrder(buildRowEntries(routes.find(r => r.id === routeId)?.deliveryPoints || []))
    setDraftSort(activeSortConfig)
    setSettingsMenu('column')
    setSortingTab('example')
    setSettingsOpen(true)
  }

  // Column helpers
  const moveDraftCol = (idx: number, dir: -1 | 1) => {
    const next = [...draftColumns]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setDraftColumns(next)
  }

  // Row helpers
  const handleRowPositionChange = (code: string, val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return
    setDraftRowOrder(prev => prev.map(r => r.code === code ? { ...r, position: val } : r))
    setRowOrderError('')
  }

  const applyRowPositions = () => {
    const positions = draftRowOrder.map(r => parseInt(r.position))
    const hasDup = positions.length !== new Set(positions).size
    const hasEmpty = draftRowOrder.some(r => r.position === '')
    if (hasDup) { setRowOrderError('Duplicate position numbers'); return }
    if (hasEmpty) { setRowOrderError('All rows must have a position'); return }
    const sorted = [...draftRowOrder].sort((a, b) => parseInt(a.position) - parseInt(b.position))
    const reindexed = sorted.map((r, i) => ({ ...r, position: String(i + 1) }))
    setDraftRowOrder(reindexed)
    setRowOrderError('')
  }

  const saveRowOrder = () => {
    const positions = draftRowOrder.map(r => parseInt(r.position))
    const hasDup = positions.length !== new Set(positions).size
    if (hasDup) { setRowOrderError('Duplicate position numbers'); return }
    const sorted = [...draftRowOrder].sort((a, b) => parseInt(a.position) - parseInt(b.position))
    const id = `roworder-${Date.now()}`
    const label = `Order ${savedRowOrders.length + 1} (${new Date().toLocaleTimeString()})`
    const newEntry = { id, label, order: sorted.map(r => r.code) }
    setSavedRowOrders(prev => {
      const updated = [...prev, newEntry]
      try { localStorage.setItem('fcalendar_my_sorts', JSON.stringify(updated)) } catch {}
      return updated
    })
    setSavedRowOrderOnce(true)
    setRowOrderError('')
  }

  // Apply sort to deliveryPoints
  const sortedDeliveryPoints = useMemo(() => {
    const today = new Date()
    const sortByActive = (pts: DeliveryPoint[]) => {
      // Active rows first, disabled rows last (stable within each group)
      const active   = pts.filter(p =>  isDeliveryActive(p.delivery, today))
      const inactive = pts.filter(p => !isDeliveryActive(p.delivery, today))
      return [...active, ...inactive]
    }

    if (!activeSortConfig) {
      const byCode = [...deliveryPoints].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }))
      return sortByActive(byCode)
    }
    if (activeSortConfig.type === 'column') {
      const { key, dir } = activeSortConfig
      const fieldMap: Partial<Record<ColumnKey, keyof DeliveryPoint>> = {
        code: 'code', name: 'name', delivery: 'delivery'
      }
      const field = fieldMap[key]
      if (!field) return sortByActive(deliveryPoints)
      const sorted = [...deliveryPoints].sort((a, b) => {
        const av = a[field!] ?? ''
        const bv = b[field!] ?? ''
        if (av < bv) return dir === 'asc' ? -1 : 1
        if (av > bv) return dir === 'asc' ? 1 : -1
        return 0
      })
      return sortByActive(sorted)
    }
    if (activeSortConfig.type === 'saved') {
      const saved = savedRowOrders.find(s => s.id === activeSortConfig.id)
      if (!saved) return sortByActive(deliveryPoints)
      const sorted = [...deliveryPoints].sort((a, b) => {
        const ai = saved.order.indexOf(a.code)
        const bi = saved.order.indexOf(b.code)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      return sortByActive(sorted)
    }
    return sortByActive(deliveryPoints)
  }, [deliveryPoints, activeSortConfig, savedRowOrders])

  // Compute distances for Km column
  // Default sort  → direct distance from map origin to each point (not cumulative)
  // Custom/saved  → cumulative chained: origin → Row1 → Row2 → Row3 …
  const isCustomSort = activeSortConfig !== null
  const pointDistances = useMemo(() => {
    const result: { display: number; segment: number }[] = []
    if (!isCustomSort) {
      // Direct distance mode: each row shows straight-line from origin
      for (const point of sortedDeliveryPoints) {
        const direct = haversineKm(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng, point.latitude, point.longitude)
        result.push({ display: direct, segment: direct })
      }
    } else {
      // Cumulative chain mode: origin → Row1 → Row2 → Row3 …
      let cumulative = 0
      let prevLat = DEFAULT_MAP_CENTER.lat
      let prevLng = DEFAULT_MAP_CENTER.lng
      for (const point of sortedDeliveryPoints) {
        const segment = haversineKm(prevLat, prevLng, point.latitude, point.longitude)
        cumulative += segment
        result.push({ display: cumulative, segment })
        prevLat = point.latitude
        prevLng = point.longitude
      }
    }
    return result
  }, [sortedDeliveryPoints, isCustomSort])

  const startEdit = (rowCode: string, field: string, currentValue: string | number) => {
    if (!isEditMode) return
    const key = `${rowCode}-${field}`
    setEditingCell({ rowCode, field })
    setEditValue(String(currentValue))
    setPopoverOpen({ [key]: true })
  }

  const saveEdit = () => {
    if (!editingCell) return

    // Cross-route duplicate check when editing code
    if (editingCell.field === 'code' && editValue !== editingCell.rowCode) {
      const dupMsg = findDuplicateRoute(editValue)
      if (dupMsg) {
        setEditError(dupMsg)
        return
      }
    }
    setEditError("")
    
    const { rowCode, field } = editingCell
    setDeliveryPoints(prev => prev.map(point => {
      if (point.code === rowCode) {
        if (field === 'latitude' || field === 'longitude') {
          const numValue = parseFloat(editValue)
          if (!isNaN(numValue)) {
            return { ...point, [field]: numValue }
          }
        } else {
          return { ...point, [field]: editValue }
        }
      }
      return point
    }))
    // mark this cell as pending (locally edited, not yet saved to DB)
    setPendingCellEdits(prev => { const n = new Set(prev); n.add(`${rowCode}-${field}`); return n })
    cancelEdit()
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
    setEditError("")
    setPopoverOpen({})
  }

  const toggleRowSelection = (code: string) => {
    setSelectedRows(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === deliveryPoints.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(deliveryPoints.map(p => p.code))
    }
  }

  const findDuplicateRoute = (code: string): string | null => {
    for (const route of routes) {
      const exists = route.deliveryPoints.some(p => p.code === code)
      if (exists) {
        if (route.id === currentRouteId) return "Code already exists in this route"
        return `Code already exists in "${route.name}"`
      }
    }
    return null
  }

  const handleAddNewPoint = () => {
    const dupMsg = findDuplicateRoute(newPoint.code)
    if (dupMsg) {
      setCodeError(dupMsg)
      return
    }
    
    if (newPoint.code) {
      setDeliveryPoints(prev => [...prev, newPoint])
      setNewPoint({
        code: "",
        name: "",
        delivery: "Daily",
        latitude: 0,
        longitude: 0,
        descriptions: []
      })
      setCodeError("")
      setAddPointDialogOpen(false)
    }
  }

  const handleCodeChange = (value: string) => {
    setNewPoint({ ...newPoint, code: value })
    if (value) {
      const dupMsg = findDuplicateRoute(value)
      setCodeError(dupMsg ?? "")
    } else {
      setCodeError("")
    }
  }

  const handleDoneClick = () => {
    setPendingSelectedRows(selectedRows)
    setActionModalOpen(true)
  }

  const handleDeleteRows = () => {
    setDeliveryPoints(prev => prev.filter(point => !pendingSelectedRows.includes(point.code)))
    setDeleteConfirmOpen(false)
    setActionModalOpen(false)
    setPendingSelectedRows([])
    setSelectedRows([])
  }

  const handleMoveRows = () => {
    if (selectedTargetRoute) {
      // Get the points to move
      const pointsToMove = deliveryPoints.filter(point => pendingSelectedRows.includes(point.code))
      
      setHasUnsavedChanges(true)
      // Move points to target route
      setRoutes(prev => prev.map(route => {
        if (route.id === selectedTargetRoute) {
          return { ...route, deliveryPoints: [...route.deliveryPoints, ...pointsToMove] }
        }
        if (route.id === currentRouteId) {
          return { ...route, deliveryPoints: route.deliveryPoints.filter(point => !pendingSelectedRows.includes(point.code)) }
        }
        return route
      }))
      
      setMoveDialogOpen(false)
      setActionModalOpen(false)
      setPendingSelectedRows([])
      setSelectedRows([])
      setSelectedTargetRoute("")
    }
  }

  const handleEditRoute = (route: Route) => {
    setEditingRoute({ ...route })
    setEditRouteDialogOpen(true)
  }

  const handleSaveRoute = () => {
    if (!editingRoute) return
    
    if (!editingRoute.name || !editingRoute.code) {
      alert("Name and Code are required!")
      return
    }

    setHasUnsavedChanges(true)
    setRoutes(prev => prev.map(r => 
      r.id === editingRoute.id ? editingRoute : r
    ))
    setEditRouteDialogOpen(false)
    setEditingRoute(null)
  }

  const doSave = useCallback(async () => {
    // Snapshot before state for changelog
    const before = routesSnapshotRef.current
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Save failed')
    // Record changelog entries per changed route
    // First pass: detect cross-route moves
    type MoveInfo = { code: string; name: string; fromId: string; fromName: string; toId: string; toName: string }
    const moves: MoveInfo[] = []
    routes.forEach(route => {
      const old = before.find(r => r.id === route.id)
      if (!old) return
      route.deliveryPoints.forEach(p => {
        if (!old.deliveryPoints.find(o => o.code === p.code)) {
          // This point is new in this route — check if it was removed from another route
          before.forEach(oldRoute => {
            if (oldRoute.id === route.id) return
            if (oldRoute.deliveryPoints.find(o => o.code === p.code)) {
              const newFrom = routes.find(r => r.id === oldRoute.id)
              if (newFrom && !newFrom.deliveryPoints.find(x => x.code === p.code)) {
                // Confirmed move: was in oldRoute, now in route
                moves.push({ code: p.code, name: p.name || p.code, fromId: oldRoute.id, fromName: oldRoute.name, toId: route.id, toName: route.name })
              }
            }
          })
        }
      })
    })
    const movedCodes = new Set(moves.map(m => m.code))

    routes.forEach(route => {
      const old = before.find(r => r.id === route.id)
      const changes: string[] = []
      if (!old) {
        changes.push(`Route "${route.name}" created`)
      } else {
        if (old.name !== route.name) changes.push(`Name changed: "${old.name}" → "${route.name}"`)
        if (old.code !== route.code) changes.push(`Code changed: ${old.code} → ${route.code}`)
        if (old.shift !== route.shift) changes.push(`Shift changed: ${old.shift} → ${route.shift}`)

        // Moves OUT from this route
        const movedOut = moves.filter(m => m.fromId === route.id)
        const movedOutByDest: Record<string, MoveInfo[]> = {}
        movedOut.forEach(m => { if (!movedOutByDest[m.toId]) movedOutByDest[m.toId] = []; movedOutByDest[m.toId].push(m) })
        Object.values(movedOutByDest).forEach(group => {
          const names = group.map(m => m.name).join(", ")
          changes.push(`Moved ${group.length} location${group.length > 1 ? 's' : ''} to "${group[0].toName}": ${names}`)
        })

        // Moves INTO this route
        const movedIn = moves.filter(m => m.toId === route.id)
        const movedInBySource: Record<string, MoveInfo[]> = {}
        movedIn.forEach(m => { if (!movedInBySource[m.fromId]) movedInBySource[m.fromId] = []; movedInBySource[m.fromId].push(m) })
        Object.values(movedInBySource).forEach(group => {
          const names = group.map(m => m.name).join(", ")
          changes.push(`Received ${group.length} location${group.length > 1 ? 's' : ''} from "${group[0].fromName}": ${names}`)
        })

        // Added (not via move)
        const addedPts = route.deliveryPoints.filter(p => !old.deliveryPoints.find(o => o.code === p.code) && !movedCodes.has(p.code))
        // Removed (not via move)
        const removedPts = old.deliveryPoints.filter(o => !route.deliveryPoints.find(p => p.code === o.code) && !movedCodes.has(o.code))
        // Edited
        const editedPts = route.deliveryPoints.filter(p => {
          const o = old.deliveryPoints.find(x => x.code === p.code)
          return o && (o.name !== p.name || o.delivery !== p.delivery || o.latitude !== p.latitude || o.longitude !== p.longitude)
        })

        if (addedPts.length) changes.push(`Added ${addedPts.length} location${addedPts.length > 1 ? 's' : ''}: ${addedPts.map(p => p.name || p.code).join(", ")}`)
        if (removedPts.length) changes.push(`Removed ${removedPts.length} location${removedPts.length > 1 ? 's' : ''}: ${removedPts.map(p => p.name || p.code).join(", ")}`)
        if (editedPts.length) changes.push(`Edited ${editedPts.length} location${editedPts.length > 1 ? 's' : ''}: ${editedPts.map(p => p.name || p.code).join(", ")}`)
      }
      changes.forEach(desc => appendChangelog(route.id, desc))
    })
    // Clear pending-edit markers once successfully persisted
    setPendingCellEdits(new Set())
    // Re-fetch from server so UI mirrors exactly what was persisted
    await fetchRoutes(currentRouteId)
  }, [routes, fetchRoutes, currentRouteId])

  useEffect(() => {
    registerSaveHandler(doSave)
  }, [doSave, registerSaveHandler])

  // Snapshot routes when edit mode turns ON for instant discard
  useEffect(() => {
    if (isEditMode) {
      routesSnapshotRef.current = JSON.parse(JSON.stringify(routes))
    }
  }, [isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Register discard handler — restore snapshot instantly, clear pending edits
  useEffect(() => {
    registerDiscardHandler(() => {
      setRoutes(routesSnapshotRef.current)
      setPendingCellEdits(new Set())
    })
  }, [registerDiscardHandler])

  const handleDeleteRoute = () => {
    if (!routeToDelete) return
    
    if (routes.length <= 1) {
      alert("Cannot delete the last route!")
      return
    }

    setHasUnsavedChanges(true)
    setRoutes(prev => prev.filter(r => r.id !== routeToDelete.id))
    setDeleteRouteConfirmOpen(false)
    setRouteToDelete(null)
    
    // Switch to first available route if current route is deleted
    if (currentRouteId === routeToDelete.id) {
      const remainingRoutes = routes.filter(r => r.id !== routeToDelete.id)
      if (remainingRoutes.length > 0) {
        setCurrentRouteId(remainingRoutes[0].id)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-24 gap-3 text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">Loading routes...</span>
      </div>
    )
  }

  return (
    <div className="relative font-light flex-1 overflow-y-auto">
      {/* Route List */}
      <div className="mt-4 px-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Page header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight">Route List</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''}
              {(filterRegion !== 'all' || filterShift !== 'all') && <span className="ml-1 text-primary font-medium">· filtered</span>}
            </p>
          </div>
        </div>
        {/* Search + Filter */}
        <div className="mb-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search routes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 bg-card rounded-xl text-sm placeholder:text-muted-foreground/40 outline-none ring-1 ring-border/60 focus:ring-2 focus:ring-primary/40 shadow-sm transition-shadow"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Single Filter Button */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`relative h-11 w-11 flex items-center justify-center rounded-xl ring-1 shadow-sm transition-colors ${
                  filterRegion !== "all" || filterShift !== "all"
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-muted-foreground ring-border/60 hover:bg-muted"
                }`}
              >
                <SlidersHorizontal className="size-4" />
                {(filterRegion !== "all" || filterShift !== "all") && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-orange-400 ring-1 ring-background" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Filter</span>
                {(filterRegion !== "all" || filterShift !== "all") && (
                  <button
                    onClick={() => { setFilterRegion("all"); setFilterShift("all") }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Region */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Region</p>
                <div className="flex gap-1.5">
                  {(["all", "KL", "Sel"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRegion(r)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                        filterRegion === r
                          ? r === "KL" ? "bg-blue-500 text-white"
                            : r === "Sel" ? "bg-red-500 text-white"
                            : "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {r === "all" ? "All" : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shift</p>
                <div className="flex gap-1.5">
                  {(["all", "AM", "PM"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterShift(s)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                        filterShift === s
                          ? s === "AM" ? "bg-orange-500 text-white"
                            : s === "PM" ? "bg-indigo-500 text-white"
                            : "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {s === "all" ? "All" : s}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Card Columns quick toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-11 w-11 flex items-center justify-center rounded-xl ring-1 ring-border/60 shadow-sm bg-card text-muted-foreground hover:bg-muted transition-colors">
                <LayoutGrid className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Card Columns</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(["2","3","4","auto"] as const).map(c => (
                  <button key={c}
                    onClick={() => { localStorage.setItem('fcalendar_card_cols', c); setCardCols(c); window.dispatchEvent(new Event('fcalendar_card_cols_changed')) }}
                    className={`flex flex-col items-center py-1.5 rounded-md border text-[10px] font-semibold transition-all ${
                      cardCols === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {c === 'auto' ? '≡' : c}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className={`grid gap-2.5 ${
          cardCols === '2' ? 'grid-cols-2' :
          cardCols === '3' ? 'grid-cols-3' :
          cardCols === '4' ? 'grid-cols-2 sm:grid-cols-4' :
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        }`}>
        {filteredRoutes.map((route) => {
          const isKL    = (route.name + " " + route.code).toLowerCase().includes("kl")
          const isSel   = (route.name + " " + route.code).toLowerCase().includes("sel")
          return (
          <div key={route.id} className="w-full">
            <div
              className="bg-card rounded-2xl ring-1 ring-border/60 shadow-sm active:scale-95 transition-all duration-150 overflow-hidden relative group flex flex-col"
            >
              {/* Edit settings button — top right, edit mode only */}
              {isEditMode && (
                <div className="absolute top-3 right-2.5 z-10" onClick={e => e.stopPropagation()}>
                  <button
                    className="p-1 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => handleEditRoute(route)}
                  >
                    <Settings className="size-3.5" />
                  </button>
                </div>
              )}

              {/* Pin button — top left */}
              <div className="absolute top-2.5 left-2.5 z-10" onClick={e => e.stopPropagation()}>
                <button
                  className={`transition-colors duration-200 ${
                    pinnedIds.has(route.id)
                      ? 'text-amber-400 hover:text-amber-500'
                      : 'text-muted-foreground/25 hover:text-amber-400'
                  }`}
                  title={pinnedIds.has(route.id) ? 'Unpin from Home' : 'Pin to Home'}
                  onClick={() => togglePin(route)}
                >
                  {pinnedIds.has(route.id)
                    ? <PinOff className="size-3.5" />
                    : <Pin className="size-3.5" />}
                </button>
              </div>

              {/* Card body */}
              <div className="px-3 pt-6 pb-3 flex flex-col items-center gap-2 flex-1">
                {/* Flag / icon */}
                {isKL
                  ? <img src="/kl-flag.png"
                      className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                      style={{ width: 48, height: 30 }}
                      alt="KL" />
                  : isSel
                  ? <img src="/selangor-flag.png"
                      className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                      style={{ width: 48, height: 30 }}
                      alt="Selangor" />
                  : <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                      <Truck className="size-4 text-primary" />
                    </div>
                }

                {/* Name + code */}
                <div className="text-center w-full">
                  <h2 className="text-[12px] font-bold text-foreground leading-snug line-clamp-2">{route.name}</h2>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 tracking-wide">{route.code}</p>
                </div>

              </div>

              {/* Footer — Notes | Info | List */}
              <div className="flex items-center border-t border-border/40 mt-auto min-h-[36px]" onClick={e => e.stopPropagation()}>
                <button
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  onClick={() => { setNotesRouteId(route.id); setNotesRouteName(route.name); setNotesModalOpen(true) }}
                >
                  <StickyNote className="size-3.5" />
                  <span className="text-[10px] font-medium">Notes</span>
                </button>

                <div className="w-px h-5 bg-border/50" />

                <button
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                  onClick={e => { e.stopPropagation(); setInfoModalRouteId(route.id) }}
                >
                  <Info className="size-3.5" />
                  <span className="text-[10px] font-medium">Info</span>
                </button>

                <div className="w-px h-5 bg-border/50" />

                <button
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-primary/70 hover:text-primary hover:bg-primary/8 transition-colors"
                  onClick={() => { setCurrentRouteId(route.id); setDetailDialogOpen(true) }}
                >
                  <List className="size-3.5" />
                  <span className="text-[10px] font-medium">List</span>
                </button>
              </div>
            </div>
                  <Dialog open={detailDialogOpen && route.id === currentRouteId} onOpenChange={(open) => { if (!open) { setDetailDialogOpen(false); setDetailFullscreen(false); setSelectedRows([]) } }}>
                  <DialogContent
                    className="p-0 gap-0 flex flex-col overflow-hidden transition-[width,height,max-width,border-radius] duration-300 ease-in-out"
                    style={detailFullscreen
                      ? { width: '100vw', maxWidth: '100vw', height: '100dvh', borderRadius: 0 }
                      : { width: '92vw', maxWidth: '56rem', height: 'calc(7 * 44px + 96px)', borderRadius: '0.75rem' }
                    }
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border shrink-0 bg-background flex items-center gap-3">
                      {(route.name + " " + route.code).toLowerCase().includes("kl")
                        ? <img src="/kl-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0" style={{ width: 44, height: 28 }} alt="KL" />
                        : (route.name + " " + route.code).toLowerCase().includes("sel")
                        ? <img src="/selangor-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0" style={{ width: 44, height: 28 }} alt="Selangor" />
                        : (
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                            <Truck className="size-[17px] text-primary" />
                          </div>
                        )}
                      <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold leading-tight truncate">{route.name}</h1>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openSettings(route.id)} className="shrink-0 flex items-center gap-1.5 h-8 rounded-xl text-xs">
                        <Settings className="size-3.5" />Settings
                      </Button>
                      <button
                        onClick={() => setDetailFullscreen(f => !f)}
                        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={detailFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      >
                        {detailFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                      </button>
                    </div>
                    {/* Table */}
                    <div className="flex-1 overflow-auto scroll-smooth">
                          <table className="border-collapse text-[12px] whitespace-nowrap min-w-max w-full">
                            <thead className="bg-muted/70 sticky top-0 z-10 backdrop-blur-sm">
                              <tr className="border-b border-border">
                                {isEditMode && (
                                  <th className="px-3 h-9 text-center w-10">
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.length === deliveryPoints.length && deliveryPoints.length > 0}
                                      onChange={toggleSelectAll}
                                      className="w-4 h-4 rounded border-border cursor-pointer accent-primary"
                                    />
                                  </th>
                                )}
                                {columns.filter(c => c.visible && c.key !== 'action').map(col => (
                                  <th key={col.key} className="px-3 h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</th>
                                ))}
                                <th className="px-3 h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Km</th>
                                {isEditMode && <th className="px-3 h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latitude</th>}
                                {isEditMode && <th className="px-3 h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Longitude</th>}
                                {columns.find(c => c.key === 'action' && c.visible) && (
                                  <th className="px-3 h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                                )}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDeliveryPoints.map((point, index) => {
                            const isActive = isDeliveryActive(point.delivery)
                            const distInfo = pointDistances[index]
                            const hasCoords = point.latitude !== 0 || point.longitude !== 0
                            const segmentLabel = !isCustomSort
                            ? `Origin → ${point.name || point.code}: ${hasCoords && distInfo ? formatKm(distInfo.display) : '-'}`
                            : index === 0
                              ? `Origin → ${point.name || point.code}: ${hasCoords && distInfo ? formatKm(distInfo.segment) : '-'}`
                              : `${sortedDeliveryPoints[index - 1].name || sortedDeliveryPoints[index - 1].code} → ${point.name || point.code}: ${hasCoords && distInfo ? formatKm(distInfo.segment) : '-'}`

                            const isEditingThisRow = editingCell?.rowCode === point.code
                            const hasRowPending = [...pendingCellEdits].some(k => k.startsWith(`${point.code}-`))
                            return (
                              <tr key={point.code} className={`border-b transition-colors duration-100 ${
                                isEditingThisRow
                                  ? 'border-primary/50 bg-primary/6 shadow-[inset_3px_0_0_hsl(var(--primary)/0.7)]'
                                  : hasRowPending
                                  ? 'border-amber-400/40 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-900/10'
                                  : isActive
                                  ? index % 2 === 0 ? 'border-border/30 hover:bg-primary/5' : 'border-border/30 bg-muted/25 hover:bg-primary/5'
                                  : 'border-border/30 opacity-40 hover:opacity-60'
                              }`}>
                                {isEditMode && (
                                  <td className="px-3 h-11 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.includes(point.code)}
                                      onChange={() => toggleRowSelection(point.code)}
                                      className="w-4 h-4 rounded border-border cursor-pointer accent-primary"
                                    />
                                  </td>
                                )}
                                {columns.filter(c => c.visible).map(col => {
                                  if (col.key === 'no') return (
                                    <td key="no" className="px-3 h-11 text-center text-[11px] text-muted-foreground tabular-nums font-medium">{index + 1}</td>
                                  )
                                  if (col.key === 'code') return (
                                    <td key="code" className="px-3 h-11 text-center">
                                      {isEditMode ? (
                                      <Popover
                                        open={isEditMode && !!popoverOpen[`${point.code}-code`]}
                                        onOpenChange={(open) => {
                                          if (!isEditMode) return
                                          if (!open) cancelEdit()
                                          setPopoverOpen({ [`${point.code}-code`]: open })
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group mx-auto" onClick={() => startEdit(point.code, 'code', point.code)}>
                                            <span className={pendingCellEdits.has(`${point.code}-code`) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{point.code}</span>
                                            <Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72">
                                          <div className="space-y-3">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Code</label>
                                              <Input
                                                className={`text-center ${editError ? 'border-red-500 focus-visible:ring-red-500/30' : ''}`}
                                                value={editValue}
                                                onChange={(e) => {
                                                  const v = e.target.value
                                                  setEditValue(v)
                                                  if (v && v !== editingCell?.rowCode) {
                                                    const msg = findDuplicateRoute(v)
                                                    setEditError(msg ?? "")
                                                  } else {
                                                    setEditError("")
                                                  }
                                                }}
                                                placeholder="Enter code"
                                                autoFocus
                                                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                                              />
                                              {editError && <p className="text-xs text-red-500">{editError}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                              <Button size="sm" onClick={saveEdit} disabled={!!editError} className="flex-1"><Check className="size-4 mr-1" /> Save</Button>
                                              <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      ) : (<span className="font-mono text-[11px] text-muted-foreground">{point.code}</span>)}
                                    </td>
                                  )
                                  if (col.key === 'name') return (
                                    <td key="name" className="px-3 h-11 text-center">
                                      {isEditMode ? (
                                      <Popover
                                        open={isEditMode && !!popoverOpen[`${point.code}-name`]}
                                        onOpenChange={(open) => {
                                          if (!isEditMode) return
                                          if (!open) cancelEdit()
                                          setPopoverOpen({ [`${point.code}-name`]: open })
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group mx-auto" onClick={() => startEdit(point.code, 'name', point.name)}>
                                            <span className={pendingCellEdits.has(`${point.code}-name`) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{point.name}</span>
                                            <Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72">
                                          <div className="space-y-3">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Name</label>
                                              <Input className="text-center" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} />
                                            </div>
                                            <div className="flex gap-2">
                                              <Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button>
                                              <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      ) : (<span className="text-[12px]">{point.name}</span>)}
                                    </td>
                                  )
                                  if (col.key === 'delivery') return (
                                    <td key="delivery" className="px-3 h-11 text-center">
                                      {isEditMode ? (
                                        <button
                                          className="group inline-flex items-center gap-1.5 hover:scale-105 transition-transform mx-auto"
                                          onClick={() => {
                                            setDeliveryModalCode(point.code)
                                            setDeliveryModalOpen(true)
                                          }}
                                        >
                                          <span className={`text-[11px] font-semibold ${
                                            pendingCellEdits.has(`${point.code}-delivery`)
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-foreground'
                                          }`}>{point.delivery}</span>
                                          <span className={`text-[10px] font-semibold ${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{isActive ? 'ON' : 'OFF'}</span>
                                          <Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      ) : (
                                        <span className="text-[11px] font-semibold text-foreground">{point.delivery}</span>
                                      )}
                                    </td>
                                  )
                                  if (col.key === 'action') return null
                                  return null
                                })}
                                <td className="px-3 h-11 text-center">
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip
                                      open={openKmTooltip === point.code}
                                      onOpenChange={(open) => setOpenKmTooltip(open ? point.code : null)}
                                    >
                                      <TooltipTrigger
                                        type="button"
                                        className="text-[11px] font-medium text-muted-foreground cursor-help tabular-nums"
                                        onClick={() => setOpenKmTooltip(prev => prev === point.code ? null : point.code)}
                                      >
                                        {hasCoords && distInfo ? formatKm(distInfo.display) : ''}
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs max-w-[220px] text-center z-[9999]">
                                        {segmentLabel}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                {isEditMode && (
                                  <td className="px-3 h-11 text-center font-mono">
                                    <Popover open={isEditMode && !!popoverOpen[`${point.code}-latitude`]} onOpenChange={(open) => { if (!isEditMode) return; if (!open) cancelEdit(); setPopoverOpen({ [`${point.code}-latitude`]: open }) }}>
                                      <PopoverTrigger asChild>
                                        <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group font-mono mx-auto text-[11px]" onClick={() => startEdit(point.code, 'latitude', point.latitude.toFixed(4))}>
                                          <span className={pendingCellEdits.has(`${point.code}-latitude`) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{point.latitude.toFixed(4)}</span><Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64"><div className="space-y-3"><div className="space-y-2"><label className="text-sm font-medium">Latitude</label><Input className="text-center font-mono" type="number" step="0.0001" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter latitude" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} /></div><div className="flex gap-2"><Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button><Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button></div></div></PopoverContent>
                                    </Popover>
                                  </td>
                                )}
                                {isEditMode && (
                                  <td className="px-3 h-11 text-center font-mono">
                                    <Popover open={isEditMode && !!popoverOpen[`${point.code}-longitude`]} onOpenChange={(open) => { if (!isEditMode) return; if (!open) cancelEdit(); setPopoverOpen({ [`${point.code}-longitude`]: open }) }}>
                                      <PopoverTrigger asChild>
                                        <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group font-mono mx-auto text-[11px]" onClick={() => startEdit(point.code, 'longitude', point.longitude.toFixed(4))}>
                                          <span className={pendingCellEdits.has(`${point.code}-longitude`) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{point.longitude.toFixed(4)}</span><Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64"><div className="space-y-3"><div className="space-y-2"><label className="text-sm font-medium">Longitude</label><Input className="text-center font-mono" type="number" step="0.0001" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter longitude" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} /></div><div className="flex gap-2"><Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button><Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button></div></div></PopoverContent>
                                    </Popover>
                                  </td>
                                )}
                                {columns.find(c => c.key === 'action' && c.visible) && (
                                  <td className="px-3 h-11 text-center">
                                    <button
                                      className={`inline-flex items-center justify-center p-1 rounded transition-colors duration-150 ${
                                        isActive
                                          ? 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                          : 'text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                      }`}
                                      onClick={() => { setSelectedPoint(point); setInfoModalOpen(true) }}
                                    >
                                      <Info className="size-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                          
                          {/* Add New Row */}
                          {isEditMode && (
                          <tr 
                            className="border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/3 cursor-pointer transition-all duration-150 group"
                            onClick={() => {
                              setAddPointDialogOpen(true)
                              setCodeError("")
                            }}
                          >
                            <td colSpan={8} className="py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                  <Plus className="size-3.5 text-primary" />
                                </div>
                                <span className="text-[12px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                  Add New Delivery Point
                                </span>
                              </div>
                            </td>
                          </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Action Buttons - Show when rows are selected in Edit Mode */}
                    {selectedRows.length > 0 && isEditMode && (
                      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-primary/5 shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedRows([])}>
                            <X className="size-3 mr-1" />Deselect
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={handleDoneClick}>
                            <Check className="size-3 mr-1" />Action
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                  </Dialog>
                
                {/* Action Modal - After Done is clicked */}
                <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
                  <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Edit2 className="size-4 text-primary" />
                        </div>
                        <div>
                          <DialogTitle className="text-base font-bold">Manage Rows</DialogTitle>
                          <DialogDescription className="text-xs mt-0.5">
                            {pendingSelectedRows.length} row{pendingSelectedRows.length > 1 ? 's' : ''} selected
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="px-5 py-4 space-y-2.5">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => { setActionModalOpen(false); setMoveDialogOpen(true) }}
                        disabled={routes.length <= 1}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <ArrowUp className="size-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Move to Route</p>
                          <p className="text-xs text-muted-foreground">{routes.length <= 1 ? 'Create another route first' : 'Transfer to another route'}</p>
                        </div>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
                        onClick={() => { setActionModalOpen(false); setDeleteConfirmOpen(true) }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                          <Trash2 className="size-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-destructive">Delete Rows</p>
                          <p className="text-xs text-muted-foreground">Permanently remove selected rows</p>
                        </div>
                      </button>
                    </div>
                    <div className="px-5 pb-5 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setActionModalOpen(false); setPendingSelectedRows([]); setSelectedRows([]) }}>
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Move Dialog */}
                <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                  <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <ArrowUp className="size-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <DialogTitle className="text-base font-bold">Move to Route</DialogTitle>
                          <DialogDescription className="text-xs mt-0.5">
                            {pendingSelectedRows.length} point{pendingSelectedRows.length > 1 ? 's' : ''} will be moved
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="px-5 py-4 space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination Route</label>
                      <select
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={selectedTargetRoute}
                        onChange={(e) => setSelectedTargetRoute(e.target.value)}
                      >
                        <option value="">Choose a route…</option>
                        {routes
                          .filter(route => route.id !== currentRouteId)
                          .map(route => (
                            <option key={route.id} value={route.id}>
                              {route.name} ({route.code} · {route.shift})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="px-5 pb-5 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setMoveDialogOpen(false); setActionModalOpen(true) }}>Back</Button>
                      <Button size="sm" onClick={handleMoveRows} disabled={!selectedTargetRoute}>
                        <ArrowUp className="size-3.5 mr-1" />Move
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                          <Trash2 className="size-4 text-destructive" />
                        </div>
                        <div>
                          <DialogTitle className="text-base font-bold">Delete Rows?</DialogTitle>
                          <DialogDescription className="text-xs mt-0.5">
                            This will permanently remove {pendingSelectedRows.length} point{pendingSelectedRows.length > 1 ? 's' : ''}.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="px-5 py-4">
                      <p className="text-sm text-muted-foreground">This action <span className="font-semibold text-foreground">cannot be undone</span>. The selected delivery points will be permanently deleted.</p>
                    </div>
                    <div className="px-5 pb-5 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmOpen(false); setActionModalOpen(true) }}>Cancel</Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteRows}>
                        <Trash2 className="size-3.5 mr-1" />Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Add New Delivery Point Modal */}
                <Dialog open={addPointDialogOpen} onOpenChange={setAddPointDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Delivery Point</DialogTitle>
                      <DialogDescription>
                        Enter details for the new delivery location
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Code <span className="text-red-500">*</span>
                          </label>
                          <Input
                            placeholder="Enter code"
                            value={newPoint.code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            className={codeError ? "border-red-500" : ""}
                          />
                          {codeError && (
                            <p className="text-xs text-red-500">{codeError}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Delivery Type</label>
                          <select
                            className="w-full p-2 rounded border border-border bg-background text-sm"
                            value={newPoint.delivery}
                            onChange={(e) => setNewPoint({ ...newPoint, delivery: e.target.value as "Daily" | "Weekday" | "Alt 1" | "Alt 2" })}
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekday">Weekday</option>
                            <option value="Alt 1">Alt 1</option>
                            <option value="Alt 2">Alt 2</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          placeholder="Enter location name"
                          value={newPoint.name}
                          onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Latitude</label>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="0.0000"
                            value={newPoint.latitude || ""}
                            onChange={(e) => setNewPoint({ ...newPoint, latitude: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Longitude</label>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="0.0000"
                            value={newPoint.longitude || ""}
                            onChange={(e) => setNewPoint({ ...newPoint, longitude: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAddPointDialogOpen(false)
                          setCodeError("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddNewPoint}
                        disabled={!newPoint.code || !!codeError}
                      >
                        Add Point
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Delivery Edit Modal */}
                <Dialog open={deliveryModalOpen && currentRouteId === route.id} onOpenChange={(open) => {
                  setDeliveryModalOpen(open)
                  if (!open) setDeliveryModalCode(null)
                }}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Delivery Schedule</DialogTitle>
                      <DialogDescription>
                        {deliveryModalCode && (() => {
                          const pt = deliveryPoints.find(p => p.code === deliveryModalCode)
                          return pt ? `${pt.code} — ${pt.name}` : ''
                        })()}
                      </DialogDescription>
                    </DialogHeader>

                    {deliveryModalCode && (() => {
                      const pt = deliveryPoints.find(p => p.code === deliveryModalCode)
                      if (!pt) return null
                      const today = new Date()
                      const options: { value: DeliveryPoint['delivery']; label: string; desc: string }[] = [
                        { value: 'Daily',   label: 'Daily',   desc: 'Delivery every day' },
                        { value: 'Alt 1',   label: 'Alt 1',   desc: 'Delivery on odd dates only' },
                        { value: 'Alt 2',   label: 'Alt 2',   desc: 'Delivery on even dates only' },
                        { value: 'Weekday', label: 'Weekday', desc: 'Delivery Sunday – Thursday only' },
                      ]
                      return (
                        <div className="space-y-3 py-2">
                          {options.map(opt => {
                            const optActive = isDeliveryActive(opt.value, today)
                            return (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setDeliveryPoints(prev => prev.map(p =>
                                    p.code === deliveryModalCode ? { ...p, delivery: opt.value } : p
                                  ))
                                  if (deliveryModalCode) {
                                    setPendingCellEdits(prev => { const n = new Set(prev); n.add(`${deliveryModalCode}-delivery`); return n })
                                  }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  pt.delivery === opt.value
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                                }`}
                              >
                                <span className="text-sm font-medium w-16 shrink-0">{opt.label}</span>
                                <span className="text-xs text-muted-foreground flex-1">{opt.desc}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  optActive ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                }`}>{optActive ? 'ON' : 'OFF'}</span>
                                {pt.delivery === opt.value && (
                                  <Check className="size-4 text-primary shrink-0" />
                                )}
                              </button>
                            )
                          })}

                          <div className="flex justify-end pt-1">
                            <Button variant="outline" onClick={() => {
                              setDeliveryModalOpen(false)
                              setDeliveryModalCode(null)
                            }}>Close</Button>
                          </div>
                        </div>
                      )
                    })()}
                  </DialogContent>
                </Dialog>

                {/* Info Modal */}
                {selectedPoint && (
                  <RowInfoModal
                    open={infoModalOpen}
                    onOpenChange={setInfoModalOpen}
                    point={selectedPoint}
                    isEditMode={isEditMode}
                    onSave={(updated) => {
                      setDeliveryPoints(prev => prev.map(p => p.code === updated.code ? updated : p))
                      setSelectedPoint(updated)
                      setHasUnsavedChanges(true)
                    }}
                  />
                )}
          </div>
          )
        })}
        
        {/* No Results Message */}
        {filteredRoutes.length === 0 && (searchQuery || filterRegion !== "all") && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
                <Search className="size-10 text-muted-foreground/50" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent blur-xl" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">No routes found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {searchQuery
                ? `No routes match "${searchQuery}".`
                : `No routes found in ${filterRegion === "KL" ? "Kuala Lumpur" : "Selangor"}.`}{" "}
              Try adjusting your search or filter.
            </p>
            {filterRegion !== "all" && (
              <button
                onClick={() => setFilterRegion("all")}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
        
        {/* Add New Route Card */}
        {isEditMode && (
        <div className="w-full">
          <Dialog open={addRouteDialogOpen} onOpenChange={setAddRouteDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full h-full min-h-[140px] rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Plus className="size-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Route</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Route</DialogTitle>
                <DialogDescription>
                  Add a new delivery route with details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name Route</label>
                  <Input
                    placeholder="Enter route name"
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code Route</label>
                  <Input
                    placeholder="Enter route code"
                    value={newRoute.code}
                    onChange={(e) => setNewRoute({ ...newRoute, code: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={newRoute.shift}
                    onChange={(e) => setNewRoute({ ...newRoute, shift: e.target.value })}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddRouteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newRoute.name && newRoute.code) {
                      const newRouteData: Route = {
                        id: `route-${Date.now()}`,
                        name: newRoute.name,
                        code: newRoute.code,
                        shift: newRoute.shift,
                        deliveryPoints: []
                      }
                      setHasUnsavedChanges(true)
                      setRoutes(prev => [...prev, newRouteData])
                      setNewRoute({ name: "", code: "", shift: "AM" })
                      setAddRouteDialogOpen(false)
                    }
                  }}
                >
                  Create Route
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        )}
        </div>

        {/* Edit Route Dialog */}
        <Dialog open={editRouteDialogOpen} onOpenChange={setEditRouteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Route</DialogTitle>
              <DialogDescription>
                Update route information
              </DialogDescription>
            </DialogHeader>
            
            {editingRoute && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Name *</label>
                  <Input
                    placeholder="Enter route name"
                    value={editingRoute.name}
                    onChange={(e) => setEditingRoute({ ...editingRoute, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Route Code *</label>
                  <Input
                    placeholder="Enter route code"
                    value={editingRoute.code}
                    onChange={(e) => setEditingRoute({ ...editingRoute, code: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift</label>
                  <select
                    value={editingRoute.shift}
                    onChange={(e) => setEditingRoute({ ...editingRoute, shift: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRouteToDelete(editingRoute)
                      setEditRouteDialogOpen(false)
                      setDeleteRouteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete Route
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditRouteDialogOpen(false)
                        setEditingRoute(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveRoute}>
                      <Check className="size-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Route Confirmation Dialog */}
        <Dialog open={deleteRouteConfirmOpen} onOpenChange={setDeleteRouteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Route</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this route?
              </DialogDescription>
            </DialogHeader>
            
            {routeToDelete && (
              <div className="space-y-4 py-4">
                <div className="bg-destructive/10 border border-destructive/50 rounded-md p-4">
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-bold text-sm">Route Name</dt>
                      <dd className="ml-0 mb-2 text-sm">{routeToDelete.name}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-sm">Code</dt>
                      <dd className="ml-0 mb-2 text-sm">{routeToDelete.code}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-sm">Delivery Points</dt>
                      <dd className="ml-0 mb-2 text-sm">{routeToDelete.deliveryPoints.length} points</dd>
                    </div>
                  </dl>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Warning:</strong> This will permanently delete the route and all its delivery points. This action cannot be undone.
                  </p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteRouteConfirmOpen(false)
                      setRouteToDelete(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteRoute}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete Route
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Settings Modal ──────────────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Table Settings</DialogTitle>
            <DialogDescription>Customize how the table looks and behaves</DialogDescription>
          </DialogHeader>

          {/* Tab Menu */}
          <div className="flex border-b border-border">
            {(['column', 'row', 'sorting'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSettingsMenu(m)}
                className={`px-5 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  settingsMenu === m
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'column' ? 'Column Customize' : m === 'row' ? 'Row Customize' : 'Sorting'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">

            {/* ── COLUMN CUSTOMIZE ── */}
            {settingsMenu === 'column' && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Toggle visibility and reorder columns.</p>
                <div className="space-y-2">
                  {draftColumns.map((col, idx) => (
                    <div key={col.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() =>
                          setDraftColumns(prev =>
                            prev.map((c, i) => i === idx ? { ...c, visible: !c.visible } : c)
                          )
                        }
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="flex-1 text-sm font-medium">{col.label}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={idx === 0}
                          onClick={() => moveDraftCol(idx, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={idx === draftColumns.length - 1}
                          onClick={() => moveDraftCol(idx, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ROW CUSTOMIZE ── */}
            {settingsMenu === 'row' && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Input a position number to reorder rows. No duplicates allowed.</p>
                {rowOrderError && (
                  <p className="text-sm text-destructive font-medium">{rowOrderError}</p>
                )}
                <div className="space-y-2">
                  {draftRowOrder.map((row) => (
                    <div key={row.code} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      <Input
                        value={row.position}
                        onChange={(e) => handleRowPositionChange(row.code, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-16 text-center text-sm"
                        inputMode="numeric"
                      />
                      <span className="w-16 text-sm font-mono font-medium text-center">{row.code}</span>
                      <span className="flex-1 text-sm text-center">{row.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium
                        ${row.delivery === 'Daily' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                        ${row.delivery === 'Weekday' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                        ${row.delivery === 'Alt 1' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                        ${row.delivery === 'Alt 2' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
                      `}>{row.delivery}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SORTING ── */}
            {settingsMenu === 'sorting' && (
              <div className="p-4 space-y-3">
                {/* Sub-tabs */}
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {(['example', 'my'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSortingTab(tab)}
                      className={`flex-1 py-1.5 px-3 text-sm rounded-md font-medium transition-colors ${
                        sortingTab === tab
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab === 'example' ? 'Example Sort List' : 'My Sort List'}
                    </button>
                  ))}
                </div>

                {/* Example Sort List */}
                {sortingTab === 'example' && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">Predefined sort orders — visible to all users.</p>
                    {[
                      { key: 'code'     as ColumnKey, dir: 'asc'  as const, label: 'Code A → Z' },
                      { key: 'code'     as ColumnKey, dir: 'desc' as const, label: 'Code Z → A' },
                      { key: 'name'     as ColumnKey, dir: 'asc'  as const, label: 'Name A → Z' },
                      { key: 'name'     as ColumnKey, dir: 'desc' as const, label: 'Name Z → A' },
                      { key: 'delivery' as ColumnKey, dir: 'asc'  as const, label: 'Delivery A → Z' },
                      { key: 'delivery' as ColumnKey, dir: 'desc' as const, label: 'Delivery Z → A' },
                    ].map(({ key, dir, label }) => (
                      <button
                        key={`${key}-${dir}`}
                        onClick={() => setDraftSort({ type: 'column', key, dir })}
                        className={`w-full py-2 px-3 text-sm rounded border transition-colors text-left ${
                          draftSort?.type === 'column' && draftSort.key === key && draftSort.dir === dir
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* My Sort List */}
                {sortingTab === 'my' && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">Your saved row orders from Row Customize — stored privately in this browser.</p>
                    {savedRowOrders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>No saved sort orders yet.</p>
                        <p className="text-xs mt-1">Go to <strong>Row Customize</strong> tab and save a custom order.</p>
                      </div>
                    ) : (
                      savedRowOrders.map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <button
                            onClick={() => setDraftSort({ type: 'saved', id: s.id })}
                            className={`flex-1 py-2 px-3 text-sm rounded border transition-colors text-left ${
                              draftSort?.type === 'saved' && draftSort.id === s.id
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            {s.label}
                          </button>
                          <button
                            onClick={() => {
                              setSavedRowOrders(prev => {
                                const updated = prev.filter(r => r.id !== s.id)
                                try { localStorage.setItem('fcalendar_my_sorts', JSON.stringify(updated)) } catch {}
                                return updated
                              })
                              if (draftSort?.type === 'saved' && draftSort.id === s.id) setDraftSort(null)
                            }}
                            className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0"
                            title="Delete this sort"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {draftSort && (
                  <button
                    onClick={() => setDraftSort(null)}
                    className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1 pt-1"
                  >
                    <X className="size-3.5" /> Clear sorting
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Footer Buttons ── */}
          <div className="border-t border-border pt-4 px-4 pb-2">
            {settingsMenu === 'column' && (
              <div className="flex items-center gap-2">
                {columnsHasSaved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftColumns(savedColumns!)
                    }}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <RotateCcw className="size-3.5" /> Reset
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setDraftColumns([...columns])}>
                  Cancel
                </Button>
                {columnsDirty && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setColumns([...draftColumns])
                      setSavedColumns([...draftColumns])
                    }}
                  >
                    <Save className="size-3.5 mr-1.5" /> Save
                  </Button>
                )}
              </div>
            )}

            {settingsMenu === 'row' && (
              <div className="flex items-center gap-2">
                {savedRowOrderOnce && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftRowOrder(buildRowEntries(deliveryPoints))
                      setRowOrderError('')
                    }}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <RotateCcw className="size-3.5" /> Reset
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraftRowOrder(buildRowEntries(deliveryPoints))}
                >
                  Cancel
                </Button>
                {rowOrderDirty && (
                  <Button variant="secondary" size="sm" onClick={applyRowPositions}>
                    <Check className="size-3.5 mr-1.5" /> Apply
                  </Button>
                )}
                <Button size="sm" onClick={saveRowOrder}>
                  <Save className="size-3.5 mr-1.5" /> Save Order
                </Button>
              </div>
            )}

            {settingsMenu === 'sorting' && (
              <div className="flex items-center gap-2">
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setDraftSort(activeSortConfig)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveSortConfig(draftSort)
                    setSettingsOpen(false)
                  }}
                >
                  <Check className="size-3.5 mr-1.5" /> Apply
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Save Button */}
      {(hasUnsavedChanges || isSaving) && isEditMode && (
        <Button
          onClick={saveChanges}
          disabled={isSaving}
          className={
            `fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-all h-12 px-6 gap-2 ` +
            (isSaving
              ? 'bg-green-600 hover:bg-green-600 animate-pulse cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700')
          }
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          <span>
            {isSaving ? (
              <span className="inline-flex items-center gap-0.5">
                Saving
                <span className="inline-flex gap-0.5 ml-0.5">
                  <span className="animate-bounce [animation-delay:0ms]">.</span>
                  <span className="animate-bounce [animation-delay:150ms]">.</span>
                  <span className="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </span>
            ) : 'Save Changes'}
          </span>
        </Button>
      )}

      {/* Notes modal — rendered once outside the card loop */}
      <RouteNotesModal
        open={notesModalOpen}
        onOpenChange={(open) => { if (!open) setNotesModalOpen(false) }}
        routeId={notesRouteId}
        routeName={notesRouteName}
      />

      {/* Info modal — rendered once outside the card loop */}
      {(() => {
        const infoRoute = routes.find(r => r.id === infoModalRouteId)
        if (!infoRoute) return null
        const infoKL  = (infoRoute.name + " " + infoRoute.code).toLowerCase().includes("kl")
        const infoSel = (infoRoute.name + " " + infoRoute.code).toLowerCase().includes("sel")
        const infoTotal  = infoRoute.deliveryPoints.length
        const infoActive = infoRoute.deliveryPoints.filter(p => isDeliveryActive(p.delivery)).length
        return (
          <Dialog open={!!infoModalRouteId} onOpenChange={open => { if (!open) setInfoModalRouteId(null) }}>
            <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl max-w-xs w-[88vw]">
              {/* Header */}
              <div className={`px-4 py-3 flex items-center gap-3 ${
                infoKL  ? 'bg-blue-500/10 border-b border-blue-200/40 dark:border-blue-800/40'
                : infoSel ? 'bg-red-500/10 border-b border-red-200/40 dark:border-red-800/40'
                : 'bg-primary/8 border-b border-border/60'
              }`}>
                {infoKL
                  ? <img src="/kl-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 40, height: 25 }} alt="KL" />
                  : infoSel
                  ? <img src="/selangor-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 40, height: 25 }} alt="Selangor" />
                  : <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0"><Truck className="size-4 text-primary" /></div>
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground leading-tight truncate">{infoRoute.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wide">{infoRoute.code}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  infoRoute.shift === 'AM'
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>{infoRoute.shift}</span>
              </div>

              {/* Stats */}
              <div className="px-4 py-3 space-y-2.5">
                {/* Active today */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active today</span>
                  <span className="text-xs font-semibold text-foreground">
                    {infoActive} <span className="font-normal text-muted-foreground/60">/ {infoTotal}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: infoTotal ? `${(infoActive / infoTotal) * 100}%` : '0%' }} />
                </div>

                {/* Delivery type breakdown */}
                {(['Daily','Weekday','Alt 1','Alt 2'] as const).map(type => {
                  const count = infoRoute.deliveryPoints.filter(p => p.delivery === type).length
                  if (!count) return null
                  const dot: Record<string, string> = { 'Daily': 'bg-green-500', 'Weekday': 'bg-blue-500', 'Alt 1': 'bg-orange-500', 'Alt 2': 'bg-purple-500' }
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dot[type]}`} />
                        <span className="text-xs text-muted-foreground">{type}</span>
                      </div>
                      <span className="text-xs font-medium text-foreground">{count}</span>
                    </div>
                  )
                })}

                {/* Updated */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">Updated</span>
                  <span className="text-xs text-muted-foreground/70">{infoRoute.updatedAt ? formatRelativeTime(infoRoute.updatedAt) : '—'}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
