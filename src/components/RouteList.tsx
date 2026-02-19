import { useState, useMemo, useEffect, useCallback } from "react"
import { List, Info, Plus, Check, X, Edit2, Trash2, Search, Settings, Map, MapPin, Save, ArrowUp, ArrowDown, RotateCcw, EyeOff, Expand } from "lucide-react"
import { RowInfoModal } from "./RowInfoModal"
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
import { DeliveryMap } from "./DeliveryMap"

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
  const { isEditMode, hasUnsavedChanges, isSaving, setHasUnsavedChanges, registerSaveHandler } = useEditMode()
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES)
  const [isLoading, setIsLoading] = useState(true)
  const [currentRouteId, setCurrentRouteId] = useState<string>("route-1")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<DeliveryPoint | null>(null)
  const [addRouteDialogOpen, setAddRouteDialogOpen] = useState(false)
  const [editRouteDialogOpen, setEditRouteDialogOpen] = useState(false)
  const [deleteRouteConfirmOpen, setDeleteRouteConfirmOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null)
  const [newRoute, setNewRoute] = useState({ name: "", code: "", shift: "AM" })
  const [searchQuery, setSearchQuery] = useState("")
  const [showMapCards, setShowMapCards] = useState<Set<string>>(new Set())
  const [fullscreenRouteId, setFullscreenRouteId] = useState<string | null>(null)

  const toggleCardMap = (routeId: string) => {
    setShowMapCards(prev => {
      const next = new Set(prev)
      if (next.has(routeId)) next.delete(routeId)
      else next.add(routeId)
      return next
    })
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
  // Filter routes based on search query, then sort A-Z / 1-10 by name
  const filteredRoutes = useMemo(() => {
    const list = !searchQuery.trim()
      ? routes
      : (() => {
          const query = searchQuery.toLowerCase()
          return routes.filter(route =>
            route.name.toLowerCase().includes(query) ||
            route.code.toLowerCase().includes(query) ||
            route.shift.toLowerCase().includes(query)
          )
        })()

    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [routes, searchQuery])
  const [editingCell, setEditingCell] = useState<{ rowCode: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
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

  const startEdit = (rowCode: string, field: string, currentValue: string | number) => {
    if (!isEditMode) return
    const key = `${rowCode}-${field}`
    setEditingCell({ rowCode, field })
    setEditValue(String(currentValue))
    setPopoverOpen({ [key]: true })
  }

  const saveEdit = () => {
    if (!editingCell) return
    
    setDeliveryPoints(prev => prev.map(point => {
      if (point.code === editingCell.rowCode) {
        if (editingCell.field === 'latitude' || editingCell.field === 'longitude') {
          const numValue = parseFloat(editValue)
          if (!isNaN(numValue)) {
            return { ...point, [editingCell.field]: numValue }
          }
        } else {
          return { ...point, [editingCell.field]: editValue }
        }
      }
      return point
    }))
    
    cancelEdit()
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
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

  const handleAddNewPoint = () => {
    // Check for duplicate code
    const isDuplicate = deliveryPoints.some(point => point.code === newPoint.code)
    
    if (isDuplicate) {
      setCodeError("Code already exists")
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
    // Check for duplicate as user types
    const isDuplicate = deliveryPoints.some(point => point.code === value)
    if (isDuplicate && value) {
      setCodeError("Code already exists")
    } else {
      setCodeError("")
    }
  }

  const handleDoneClick = () => {
    setPendingSelectedRows(selectedRows)
    setDialogOpen(false)
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
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Gagal simpan')
    // Re-fetch from server so UI mirrors exactly what was persisted
    await fetchRoutes(currentRouteId)
  }, [routes, fetchRoutes, currentRouteId])

  useEffect(() => {
    registerSaveHandler(doSave)
  }, [doSave, registerSaveHandler])

  const handleSaveChanges = async () => {
    try {
      await doSave()
      setHasUnsavedChanges(false)
    } catch (e) {
      alert('Gagal simpan: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
  }

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
        <span className="text-sm">Memuatkan routes...</span>
      </div>
    )
  }

  return (
    <div className="relative font-light">
      {/* Route List */}
      <div className="mt-4 px-4 max-w-5xl mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Search Field */}
        <div className="mb-5">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Cari nama, kod, atau shift..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10 rounded-xl border-border/70 bg-card shadow-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {filteredRoutes.map((route) => (
          <div key={route.id} className="w-full">
            {/* Card */}
            <div 
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 overflow-hidden h-[400px] flex flex-col group"
            >
              {/* Header Section - Point Count & Buttons */}
              <div className="px-4 py-3 border-b border-border/60 bg-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="size-3.5" />
                    <span>{route.deliveryPoints.length} lokasi</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => handleEditRoute(route)}
                      title="Edit Route"
                      disabled={!isEditMode}
                    >
                      <Settings className="size-4" />
                    </button>
                    <Dialog open={dialogOpen && currentRouteId === route.id} onOpenChange={(open) => {
                      setDialogOpen(open)
                      if (open) setCurrentRouteId(route.id)
                    }}>
                      <DialogTrigger asChild>
                        <button 
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                          onClick={() => setCurrentRouteId(route.id)}
                          title="View Details"
                        >
                          <List className="size-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <div className="flex items-center justify-between pr-6">
                            <div>
                              <DialogTitle>Delivery Points - {route.name}</DialogTitle>
                              <DialogDescription>
                                Manage delivery locations and schedules
                              </DialogDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDialogOpen(false)
                                openSettings(route.id)
                              }}
                              className="flex items-center gap-2"
                            >
                              <Settings className="size-4" />
                              Settings
                            </Button>
                          </div>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-auto">
                          <table className="w-full border-collapse">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                {isEditMode && (
                                  <th className="p-3 text-center font-semibold text-sm w-12">
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.length === deliveryPoints.length && deliveryPoints.length > 0}
                                      onChange={toggleSelectAll}
                                      className="w-4 h-4 rounded border-border cursor-pointer"
                                    />
                                  </th>
                                )}
                                {columns.filter(c => c.visible).map(col => (
                                  <th key={col.key} className="p-3 text-center font-semibold text-sm">{col.label}</th>
                                ))}
                                {isEditMode && <th className="p-3 text-center font-semibold text-sm">Latitude</th>}
                                {isEditMode && <th className="p-3 text-center font-semibold text-sm">Longitude</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDeliveryPoints.map((point, index) => {
                            const isActive = isDeliveryActive(point.delivery)
                            
                            return (
                              <tr key={point.code} className={`border-b border-border/50 transition-colors ${
                                isActive
                                  ? 'hover:bg-muted/30'
                                  : 'bg-muted/40 opacity-50 hover:opacity-60'
                              }`}>
                                {isEditMode && (
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.includes(point.code)}
                                      onChange={() => toggleRowSelection(point.code)}
                                      className="w-4 h-4 rounded border-border cursor-pointer"
                                    />
                                  </td>
                                )}
                                {columns.filter(c => c.visible).map(col => {
                                  if (col.key === 'no') return (
                                    <td key="no" className="p-3 text-sm text-center">{index + 1}</td>
                                  )
                                  if (col.key === 'code') return (
                                    <td key="code" className="p-3 text-sm text-center">
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
                                            <span>{point.code}</span>
                                            <Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64">
                                          <div className="space-y-3">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Code</label>
                                              <Input className="text-center" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter code" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} />
                                            </div>
                                            <div className="flex gap-2">
                                              <Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button>
                                              <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      ) : (<span className="px-3 py-1">{point.code}</span>)}
                                    </td>
                                  )
                                  if (col.key === 'name') return (
                                    <td key="name" className="p-3 text-sm text-center">
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
                                            <span>{point.name}</span>
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
                                      ) : (<span className="px-3 py-1">{point.name}</span>)}
                                    </td>
                                  )
                                  if (col.key === 'delivery') return (
                                    <td key="delivery" className="p-3 text-center">
                                      {isEditMode ? (
                                        <button
                                          className="group inline-flex items-center gap-1.5 hover:scale-105 transition-transform mx-auto"
                                          onClick={() => {
                                            setDeliveryModalCode(point.code)
                                            setDeliveryModalOpen(true)
                                          }}
                                        >
                                          <span className="text-sm">{point.delivery}</span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>{isActive ? 'ON' : 'OFF'}</span>
                                          <Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      ) : (
                                        <span className="text-sm">{point.delivery}</span>
                                      )}
                                    </td>
                                  )
                                  if (col.key === 'action') return (
                                    <td key="action" className="p-3 text-center">
                                      <button
                                        className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                        onClick={() => { setSelectedPoint(point); setInfoModalOpen(true) }}
                                      >
                                        <Info className="size-4" />
                                      </button>
                                    </td>
                                  )
                                  return null
                                })}
                                {isEditMode && (
                                  <td className="p-3 text-sm font-mono text-center">
                                    <Popover open={isEditMode && !!popoverOpen[`${point.code}-latitude`]} onOpenChange={(open) => { if (!isEditMode) return; if (!open) cancelEdit(); setPopoverOpen({ [`${point.code}-latitude`]: open }) }}>
                                      <PopoverTrigger asChild>
                                        <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group font-mono mx-auto" onClick={() => startEdit(point.code, 'latitude', point.latitude.toFixed(4))}>
                                          <span>{point.latitude.toFixed(4)}</span><Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64"><div className="space-y-3"><div className="space-y-2"><label className="text-sm font-medium">Latitude</label><Input className="text-center font-mono" type="number" step="0.0001" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter latitude" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} /></div><div className="flex gap-2"><Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button><Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button></div></div></PopoverContent>
                                    </Popover>
                                  </td>
                                )}
                                {isEditMode && (
                                  <td className="p-3 text-sm font-mono text-center">
                                    <Popover open={isEditMode && !!popoverOpen[`${point.code}-longitude`]} onOpenChange={(open) => { if (!isEditMode) return; if (!open) cancelEdit(); setPopoverOpen({ [`${point.code}-longitude`]: open }) }}>
                                      <PopoverTrigger asChild>
                                        <button className="hover:bg-accent px-3 py-1 rounded flex items-center justify-center gap-1.5 group font-mono mx-auto" onClick={() => startEdit(point.code, 'longitude', point.longitude.toFixed(4))}>
                                          <span>{point.longitude.toFixed(4)}</span><Edit2 className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64"><div className="space-y-3"><div className="space-y-2"><label className="text-sm font-medium">Longitude</label><Input className="text-center font-mono" type="number" step="0.0001" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Enter longitude" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} /></div><div className="flex gap-2"><Button size="sm" onClick={saveEdit} className="flex-1"><Check className="size-4 mr-1" /> Save</Button><Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1"><X className="size-4 mr-1" /> Cancel</Button></div></div></PopoverContent>
                                    </Popover>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                          
                          {/* Add New Row */}
                          {isEditMode && (
                          <tr 
                            className="border-2 border-dashed border-border hover:border-primary hover:bg-accent/30 cursor-pointer transition-all group"
                            onClick={() => {
                              setAddPointDialogOpen(true)
                              setCodeError("")
                            }}
                          >
                            <td colSpan={8} className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 flex items-center justify-center transition-colors">
                                  <Plus className="size-4 text-green-600 dark:text-green-500" />
                                </div>
                                <span className="font-medium text-sm group-hover:text-primary transition-colors">
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
                      <div className="border-t border-border p-4 flex justify-end gap-2 bg-muted/30">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRows([])}
                        >
                          Deselect All
                        </Button>
                        <Button
                          onClick={handleDoneClick}
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                  </div>
                
                {/* Action Modal - After Done is clicked */}
                <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Manage Selected Rows</DialogTitle>
                      <DialogDescription>
                        {pendingSelectedRows.length} row(s) selected. Choose an action:
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 py-4">
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          setActionModalOpen(false)
                          setMoveDialogOpen(true)
                        }}
                        disabled={routes.length <= 1}
                      >
                        Move Rows to Another Route
                      </Button>
                      {routes.length <= 1 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Create another route first to enable moving
                        </p>
                      )}
                      
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() => {
                          setActionModalOpen(false)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        Delete Rows
                      </Button>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setActionModalOpen(false)
                          setPendingSelectedRows([])
                          setSelectedRows([])
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Move Dialog */}
                <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Move to Route</DialogTitle>
                      <DialogDescription>
                        Select the destination route for {pendingSelectedRows.length} delivery point(s)
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Route</label>
                        <select
                          className="w-full p-2 rounded border border-border bg-background text-sm"
                          value={selectedTargetRoute}
                          onChange={(e) => setSelectedTargetRoute(e.target.value)}
                        >
                          <option value="">Choose a route...</option>
                          {routes
                            .filter(route => route.id !== currentRouteId)
                            .map(route => (
                              <option key={route.id} value={route.id}>
                                {route.name} ({route.code} - {route.shift})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMoveDialogOpen(false)
                          setActionModalOpen(true)
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleMoveRows}
                        disabled={!selectedTargetRoute}
                      >
                        Move
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Confirm Deletion</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete {pendingSelectedRows.length} delivery point(s)? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeleteConfirmOpen(false)
                          setActionModalOpen(true)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteRows}
                      >
                        Delete
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
                        { value: 'Daily',   label: 'Daily',   desc: 'Penghantaran setiap hari' },
                        { value: 'Alt 1',   label: 'Alt 1',   desc: 'Penghantaran pada tarikh ganjil sahaja' },
                        { value: 'Alt 2',   label: 'Alt 2',   desc: 'Penghantaran pada tarikh genap sahaja' },
                        { value: 'Weekday', label: 'Weekday', desc: 'Penghantaran hari Ahad – Khamis sahaja' },
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
                            }}>Tutup</Button>
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
              </div>
              
              {/* Map Section */}
              <div className="flex-1 relative bg-muted/20 rounded-none">
                {showMapCards.has(route.id) ? (
                  <div className="absolute inset-0 rounded-none">
                    <DeliveryMap deliveryPoints={route.deliveryPoints} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-none">
                    <MapPin className="size-10 text-muted-foreground/15" />
                    <span className="text-[11px] text-muted-foreground/40 font-medium">Tekan ikon peta untuk lihat</span>
                  </div>
                )}
                
                {/* Map Controls */}
                {showMapCards.has(route.id) && (
                  <div className="absolute top-3 right-3 flex flex-col gap-2 z-[100]">
                    <button
                      onClick={() => setFullscreenRouteId(route.id)}
                      className="p-2 bg-background/90 backdrop-blur-sm border border-border rounded-md hover:bg-primary/10 hover:border-primary/50 transition-all shadow-sm"
                      title="Fullscreen"
                    >
                      <Expand className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Footer Section - Route Info */}
              <div className="px-4 py-3 border-t border-border/60 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate group-hover:text-primary transition-colors leading-tight">{route.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-muted/70 border border-border text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                        {route.code}
                      </span>
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${route.shift === 'AM' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400'}`}>
                        {route.shift}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCardMap(route.id)}
                    className={`shrink-0 p-2 rounded-xl border transition-all ${
                      showMapCards.has(route.id)
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/50 text-muted-foreground border-border/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5'
                    }`}
                    title={showMapCards.has(route.id) ? 'Sorok peta' : 'Tunjuk peta'}
                  >
                    {showMapCards.has(route.id) ? <EyeOff className="size-4" /> : <Map className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* No Results Message */}
        {filteredRoutes.length === 0 && searchQuery && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
                <Search className="size-10 text-muted-foreground/50" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent blur-xl" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">No routes found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              No routes match &quot;{searchQuery}&quot;. Try a different search term or create a new route.
            </p>
          </div>
        )}
        
        {/* Add New Route Card */}
        {isEditMode && (
        <div className="w-full">
          <Dialog open={addRouteDialogOpen} onOpenChange={setAddRouteDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full h-[400px] rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:via-purple-500/5 hover:to-pink-500/5 transition-all duration-300 flex flex-col items-center justify-center gap-6 group relative overflow-hidden">
                {/* Animated Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/0 to-transparent group-hover:via-primary/5 transition-all duration-500" />
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <Plus className="size-10 text-primary transition-transform group-hover:rotate-90 duration-300" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Add New Route</h3>
                    <p className="text-sm text-muted-foreground">Create a new delivery route</p>
                  </div>
                </div>
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

        {/* Fullscreen Map Dialog */}
        <Dialog open={!!fullscreenRouteId} onOpenChange={(open) => { if (!open) setFullscreenRouteId(null) }}>
          <DialogContent className="max-w-none w-screen h-[100dvh] p-0 rounded-none border-0 flex flex-col">
            <DialogTitle className="sr-only">Fullscreen Map</DialogTitle>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0 pr-12">
              <Map className="size-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {routes.find(r => r.id === fullscreenRouteId)?.name ?? "Map"}
              </span>
            </div>
            <div className="flex-1 relative h-full min-h-0">
              {fullscreenRouteId && (
                <div className="absolute inset-0">
                  <DeliveryMap
                    deliveryPoints={routes.find(r => r.id === fullscreenRouteId)?.deliveryPoints ?? []}
                    scrollZoom
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
      {hasUnsavedChanges && isEditMode && (
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all h-12 px-6"
          size="lg"
        >
          <Save className="size-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      )}
    </div>
  )
}
