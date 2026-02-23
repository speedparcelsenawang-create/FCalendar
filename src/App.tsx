import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
const DeliveryTableDialog = lazy(() => import("@/components/DeliveryTableDialog").then(m => ({ default: m.DeliveryTableDialog })))
const MapMarkerPage = lazy(() => import("@/components/MapMarkerPage").then(m => ({ default: m.MapMarkerPage })))
const Album = lazy(() => import("@/components/Album").then(m => ({ default: m.Album })))
import { EditModeProvider } from "@/contexts/EditModeContext"
import { DeviceProvider } from "@/contexts/DeviceContext"
import { Toaster } from "sonner"
import { Home, Package, Settings2, Calendar as CalendarIcon, Images, ChevronDown, Truck, Pin } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const DAYS = [
  { en: "Monday",    my: "Isnin"  },
  { en: "Tuesday",   my: "Selasa" },
  { en: "Wednesday", my: "Rabu"   },
  { en: "Thursday",  my: "Khamis" },
  { en: "Friday",    my: "Jumaat" },
  { en: "Saturday",  my: "Sabtu"  },
  { en: "Sunday",    my: "Ahad"   },
]

const STOCK_IN_COLORS  = ["#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899","#EAB308"]
const MOVE_FRONT_COLORS = ["#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899"]
const EXPIRED_COLORS   = ["#EC4899","#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7"]

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10"
      style={{ backgroundColor: color }}
    />
  )
}

function HomePage() {
  const [tableOpen, setTableOpen] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  // Mon=0 … Sun=6
  const todayIndex = (new Date().getDay() + 6) % 7

  // Read pinned routes from localStorage (written by RouteList)
  const [pinnedRoutes, setPinnedRoutes] = useState<Array<{ id: string; name: string; code: string; shift: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]") } catch { return [] }
  })
  // Re-sync when tab becomes visible (user switches from RouteList → Home)
  useEffect(() => {
    const sync = () => {
      try { setPinnedRoutes(JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]")) } catch {}
    }
    window.addEventListener("fcalendar_pins_changed", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("fcalendar_pins_changed", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  function unpin(id: string) {
    const updated = pinnedRoutes.filter(r => r.id !== id)
    localStorage.setItem("fcalendar_pinned_routes", JSON.stringify(updated))
    setPinnedRoutes(updated)
    window.dispatchEvent(new Event("fcalendar_pins_changed"))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-2xl mx-auto w-full overflow-y-auto" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      {/* Welcome */}
      <div>
        <h1 className="text-fluid-xl page-header font-bold text-gray-900 dark:text-white">Welcome to FCalendar</h1>
        <p className="text-fluid-sm page-subheader text-muted-foreground mt-1">Daily colour guide for stock operations.</p>
      </div>

      {/* Pinned Routes */}
      {pinnedRoutes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Pin className="size-3" />
            Pinned Routes
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pinnedRoutes.map(r => {
              const isKL  = (r.name + " " + r.code).toLowerCase().includes("kl")
              const isSel = (r.name + " " + r.code).toLowerCase().includes("sel")
              return (
                <div key={r.id} className="relative bg-card rounded-xl ring-1 ring-border/60 shadow-sm flex flex-col items-center gap-1.5 px-3 py-3 text-center">
                  {/* Unpin */}
                  <button
                    className="absolute top-1.5 right-1.5 p-0.5 rounded-md text-primary/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Unpin"
                    onClick={() => unpin(r.id)}
                  >
                    <Pin className="size-3" />
                  </button>
                  {isKL
                    ? <img src="/kl-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 48, height: 30 }} alt="KL" />
                    : isSel
                    ? <img src="/selangor-flag.png" className="object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 48, height: 30 }} alt="Selangor" />
                    : <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <Truck className="size-4 text-primary" />
                      </div>
                  }
                  <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{r.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.shift === "AM" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"}`}>
                    {r.shift}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Color Guide Table */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Collapsible header */}
        <button
          className="w-full grid grid-cols-4 bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 gap-2 hover:bg-muted/80 transition-colors text-left items-center"
          onClick={() => setTableOpen(v => !v)}
        >
          <span className="flex items-center gap-1.5">
            <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-200 ${tableOpen ? "rotate-180" : ""}`} />
            Day
          </span>
          <span className="text-center">✅ Stock In</span>
          <span className="text-center">🔄 Move Front</span>
          <span className="text-center">🚫 Expired</span>
        </button>
        {/* Rows — today always visible, others shown when expanded */}
        {tableOpen && DAYS.map((day, i) => {
          const isToday = i === todayIndex
          if (!isToday && !tableExpanded) return null
          return (
          <div
            key={day.en}
            className={`grid grid-cols-4 items-center px-4 py-3 gap-2 border-t border-border/60 transition-colors ${isToday ? "bg-primary/8 dark:bg-primary/10" : "hover:bg-muted/30"}`}
          >
            <div className="flex items-center gap-2">
              {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{day.my}</p>
                <p className="text-xs text-muted-foreground">{day.en}</p>
              </div>
            </div>
            <div className="flex justify-center">
              <ColorDot color={STOCK_IN_COLORS[i]} />
            </div>
            <div className="flex justify-center">
              <ColorDot color={MOVE_FRONT_COLORS[i]} />
            </div>
            <div className="flex justify-center">
              <ColorDot color={EXPIRED_COLORS[i]} />
            </div>
          </div>
          )
        })}
        {tableOpen && (
          <button
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/60"
            onClick={() => setTableExpanded(v => !v)}
          >
            <ChevronDown className={`size-3 transition-transform duration-200 ${tableExpanded ? "rotate-180" : ""}`} />
            {tableExpanded ? "Show less" : "Show all days"}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <button
          className="w-full flex items-center gap-1.5 bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hover:bg-muted/80 transition-colors text-left"
          onClick={() => setLegendOpen(v => !v)}
        >
          <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-200 ${legendOpen ? "rotate-180" : ""}`} />
          Colour Legend
        </button>
        {legendOpen && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-4 border-t border-border/60">
            {[
              { color: "#3B82F6", label: "Blue / Biru" },
              { color: "#F97316", label: "Orange" },
              { color: "#92400E", label: "Brown / Coklat" },
              { color: "#22C55E", label: "Green / Hijau" },
              { color: "#A855F7", label: "Purple / Ungu" },
              { color: "#EC4899", label: "Pink" },
              { color: "#EAB308", label: "Yellow / Kuning" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <ColorDot color={color} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()

  const handlePageChange = (page: string) => {
    if (page === currentPage) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 300)
  }

  const renderContent = () => {
    switch (currentPage) {
      case "route-list":
        return <RouteList />
      case "deliveries":
        return (
          <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 md:p-6">
            <div className="shrink-0">
              <h1 className="text-fluid-xl page-header font-bold text-gray-900 dark:text-white">Location</h1>
              <p className="text-fluid-sm page-subheader text-muted-foreground mt-1">View and manage delivery records.</p>
            </div>
            <DeliveryTableDialog />
          </div>
        )
      case "map-marker":
        return <MapMarkerPage />
      case "calendar-month":
        return <Calendar view="month" />
      case "calendar-week":
        return <Calendar view="week" />
      case "calendar-day":
        return <Calendar view="day" />
      case "calendar":
        return <Calendar view="month" />
      case "settings":
      case "settings-profile":
        return <Settings section="profile" />
      case "settings-notifications":
        return <Settings section="notifications" />
      case "settings-appearance":
        return <Settings section="appearance-theme" />
      case "settings-appearance-font":
        return <Settings section="appearance-font" />
      case "settings-appearance-display":
        return <Settings section="appearance-display" />
      case "settings-map":
        return <Settings section="map-defaultview" />
      case "settings-security":
        return <Settings section="security" />
      case "plano-vm":
        return <PlanoVM />
      case "gallery-album":
        return <Album />
      case "home":
      default:
        return <HomePage />
    }
  }

  const getPageBreadcrumbs = (): { parent?: { label: string; icon: React.ElementType }; current: string } => {
    switch (currentPage) {
      case "route-list":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Route List" }
      case "deliveries":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Location" }
      case "map-marker":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Map Marker" }
      case "calendar-month":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Month View" }
      case "calendar-week":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Week View" }
      case "calendar-day":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Day View" }
      case "calendar":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Month View" }
      case "settings":
      case "settings-profile":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Profile" }
      case "settings-notifications":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Notifications" }
      case "settings-appearance":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Appearance" }
      case "settings-appearance-font":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Font" }
      case "settings-appearance-display":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Display" }
      case "settings-map":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Map Settings" }
      case "settings-security":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Security" }
      case "plano-vm":
        return { parent: { label: "Gallery", icon: Images }, current: "Plano VM" }
      case "gallery-album":
        return { parent: { label: "Gallery", icon: Images }, current: "Album" }
      case "home":
      default:
        return { current: "Home" }
    }
  }

  return (
    <>
      <AppSidebar onNavigate={handlePageChange} currentPage={currentPage} />
      
      {/* Backdrop for desktop sidebar */}
      {!isMobile && open && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}
      
      <main className={`relative flex w-full flex-1 flex-col min-h-0 overflow-hidden bg-background transition-all duration-500 ease-in-out ${(isMobile && openMobile) || (!isMobile && open) ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="glass-header sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 md:px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-colors duration-300" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '0.625rem', minHeight: 'calc(3.5rem + max(env(safe-area-inset-top), 12px))' }}>
          <SidebarTrigger className="-ml-1 shrink-0 size-10 md:size-7" />
          <Separator orientation="vertical" className="mr-1 md:mr-2 h-4 shrink-0" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  href="#"
                  onClick={() => handlePageChange("home")}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-foreground/80 transition-colors"
                >
                  <Home className="size-[18px] shrink-0" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              {(() => {
                const { parent, current } = getPageBreadcrumbs()
                return (
                  <>
                    {parent && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem
                          key={`parent-${currentPage}`}
                          className="hidden md:flex items-center gap-1 text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                          <parent.icon className="size-3.5 shrink-0" />
                          <span>{parent.label}</span>
                        </BreadcrumbItem>
                      </>
                    )}
                    <BreadcrumbSeparator className={parent ? undefined : "hidden md:block"} />
                    <BreadcrumbItem
                      key={`current-${currentPage}`}
                      className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none font-medium">
                        {current}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )
              })()}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>}>
          <div className={`flex flex-col flex-1 min-h-0 ${isTransitioning ? "page-fade-out" : "page-fade-in animate-in slide-in-from-bottom-4"}`}>
            {renderContent()}
          </div>
        </Suspense>
      </main>

      {/* Edit Mode controls moved to Settings page */}
    </>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Ralat berlaku</h1>
          <pre className="max-w-xl rounded bg-muted p-4 text-left text-xs text-destructive overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <DeviceProvider>
      <ErrorBoundary>
        <SidebarProvider defaultOpen={false}>
          <EditModeProvider>
            <AppContent />
          </EditModeProvider>
        </SidebarProvider>
        <PWAInstallPrompt />
        <Toaster position="bottom-right" richColors closeButton />
      </ErrorBoundary>
    </DeviceProvider>
  )
}

export default App
