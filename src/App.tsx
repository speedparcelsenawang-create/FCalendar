import { useState, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
const DeliveryTableDialog = lazy(() => import("@/components/DeliveryTableDialog").then(m => ({ default: m.DeliveryTableDialog })))
const MapMarkerPage = lazy(() => import("@/components/MapMarkerPage").then(m => ({ default: m.MapMarkerPage })))
import { EditModeProvider } from "@/contexts/EditModeContext"
import { Home, Package, CalendarDays as CalendarDaysIcon, Settings2, Calendar as CalendarIcon } from "lucide-react"
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
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-2xl mx-auto w-full overflow-y-auto" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Welcome to FCalendar</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily colour guide for stock operations.</p>
      </div>

      {/* Color Guide Table */}
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-4 bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 gap-2">
          <span>Day</span>
          <span className="text-center">✅ Stock In</span>
          <span className="text-center">🔄 Move Front</span>
          <span className="text-center">🚫 Expired</span>
        </div>
        {/* Rows */}
        {DAYS.map((day, i) => (
          <div
            key={day.en}
            className="grid grid-cols-4 items-center px-4 py-3 gap-2 border-t border-border/60 hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{day.my}</p>
              <p className="text-xs text-muted-foreground">{day.en}</p>
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
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard")
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Location</h1>
              <p className="text-sm text-muted-foreground mt-1">View and manage delivery records.</p>
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
      case "dashboard":
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
        return { parent: { label: "Plano VM", icon: CalendarDaysIcon }, current: "Plano VM" }
      case "dashboard":
      default:
        return { current: "Home" }
    }
  }

  return (
    <>
      <AppSidebar onNavigate={handlePageChange} />
      
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
                  onClick={() => handlePageChange("dashboard")}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-foreground/80 transition-colors"
                >
                  <Home className="size-3.5 shrink-0" />
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
    <ErrorBoundary>
      <SidebarProvider defaultOpen={false}>
        <EditModeProvider>
          <AppContent />
        </EditModeProvider>
      </SidebarProvider>
      <PWAInstallPrompt />
    </ErrorBoundary>
  )
}

export default App
