import { useState, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
import { EditModeProvider, useEditMode } from "@/contexts/EditModeContext"
import { Edit3, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
      className="inline-block w-5 h-5 rounded-full shrink-0 shadow-sm ring-2 ring-white/60 dark:ring-black/30"
      style={{ backgroundColor: color }}
    />
  )
}

function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 max-w-2xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 px-5 py-4 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">📅</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-snug">FCalendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Panduan warna harian untuk operasi stok.</p>
        </div>
      </div>

      {/* Color Guide Table */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Jadual Warna</p>
        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-4 bg-muted/70 dark:bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2.5 gap-2 border-b border-border">
            <span>Hari</span>
            <span className="text-center">✅ Masuk</span>
            <span className="text-center">🔄 Hadapan</span>
            <span className="text-center">🚫 Luput</span>
          </div>
          {/* Rows */}
          {DAYS.map((day, i) => (
            <div
              key={day.en}
              className="grid grid-cols-4 items-center px-4 py-3 gap-2 border-t border-border/50 hover:bg-muted/25 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{day.my}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{day.en}</p>
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
      </div>

      {/* Legend */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Petunjuk Warna</p>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          {[
            { color: "#3B82F6", label: "Blue / Biru" },
            { color: "#F97316", label: "Orange" },
            { color: "#92400E", label: "Brown / Coklat" },
            { color: "#22C55E", label: "Green / Hijau" },
            { color: "#A855F7", label: "Purple / Ungu" },
            { color: "#EC4899", label: "Pink" },
            { color: "#EAB308", label: "Yellow / Kuning" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <ColorDot color={color} />
              <span className="text-xs font-medium text-foreground/80">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isEditTransitioning, setIsEditTransitioning] = useState(false)
  const [editTransitionPhase, setEditTransitionPhase] = useState<"idle" | "closing" | "opening">("idle")
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()
  const { isEditMode, hasUnsavedChanges, isSaving, setIsEditMode, setHasUnsavedChanges, saveChanges } = useEditMode()
  const [showExitDialog, setShowExitDialog] = useState(false)

  const handlePageChange = (page: string) => {
    if (page === currentPage) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 300) // Match animation duration
  }

  const handleToggleEditMode = () => {
    if (isEditMode && hasUnsavedChanges) {
      setShowExitDialog(true)
      return
    }
    // Shutdown transition
    setIsEditTransitioning(true)
    setEditTransitionPhase("closing")
    setTimeout(() => {
      setIsEditMode(!isEditMode)
      setEditTransitionPhase("opening")
      setTimeout(() => {
        setIsEditTransitioning(false)
        setEditTransitionPhase("idle")
      }, 600)
    }, 600)
  }

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false)
    setIsEditMode(false)
    setShowExitDialog(false)
  }

  const handleSaveChanges = () => {
    saveChanges()
    // Keep edit mode on after saving
  }

  const renderContent = () => {
    switch (currentPage) {
      case "route-list":
        return <RouteList />
      case "calendar-month":
        return <Calendar view="month" />
      case "calendar-week":
        return <Calendar view="week" />
      case "calendar-day":
        return <Calendar view="day" />
      case "calendar":
        return <Calendar view="month" />
      case "settings":
        return <Settings />
      case "plano-vm":
        return <PlanoVM />
      case "dashboard":
      default:
        return <HomePage />
    }
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case "route-list":
        return "Route List"
      case "calendar-month":
        return "Calendar — Month View"
      case "calendar-week":
        return "Calendar — Week View"
      case "calendar-day":
        return "Calendar — Day View"
      case "calendar":
        return "Calendar"
      case "settings":
        return "Settings"
      case "plano-vm":
        return "Plano VM"
      case "dashboard":
      default:
        return "Home"
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
      
      <main className={`relative flex w-full flex-1 flex-col min-h-0 overflow-y-auto bg-background transition-all duration-500 ease-in-out ${(isMobile && openMobile) || (!isMobile && open) ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`}>
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 backdrop-blur-md px-3 md:px-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.25)] transition-colors duration-300" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)', paddingBottom: '0.5rem', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
          <SidebarTrigger className="-ml-1 shrink-0" disabled={isEditMode} />
          <Separator orientation="vertical" className="mr-1 md:mr-2 h-4 shrink-0" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" onClick={() => handlePageChange("dashboard")}>
                  FCalendar
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate max-w-[160px] md:max-w-none">{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1.5 md:gap-2 shrink-0">
            {hasUnsavedChanges && isEditMode && (
              <Button 
                onClick={handleSaveChanges}
                size="sm"
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 h-8 px-2.5 md:px-3"
              >
                <Save className="size-4" />
                <span className="hidden sm:inline ml-1.5">{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>
            )}
            <Button 
              onClick={handleToggleEditMode}
              variant="default"
              size="sm"
              disabled={isEditTransitioning}
              className={`h-8 px-2.5 md:px-3 transition-colors duration-300 ${
                isEditMode
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              {isEditMode ? (
                <>
                  <X className="size-4" />
                  <span className="hidden sm:inline ml-1.5">Exit</span>
                </>
              ) : (
                <>
                  <Edit3 className="size-4" />
                  <span className="hidden sm:inline ml-1.5">Edit</span>
                </>
              )}
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>}>
          <div className={isTransitioning ? "page-fade-out" : "page-fade-in"}>
            {renderContent()}
          </div>
        </Suspense>
      </main>

      {/* Edit Mode Shutdown Transition Overlay */}
      {isEditTransitioning && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-black transition-opacity duration-500 ${
            editTransitionPhase === "closing" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Loader2 className="size-10 animate-spin text-white/80" />
          <p className="text-white/60 text-sm tracking-widest uppercase">
            {editTransitionPhase === "closing"
              ? (isEditMode ? "Exiting Edit Mode..." : "Entering Edit Mode...")
              : ""}
          </p>
        </div>
      )}

      {/* Exit Edit Mode Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to save them before exiting edit mode?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowExitDialog(false)}
            >
              Continue Editing
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDiscardChanges}
            >
              Discard Changes
            </Button>
            <Button 
              onClick={() => {
                saveChanges()
                setIsEditMode(false)
                setShowExitDialog(false)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="size-4 mr-2" />
              Save & Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
            Cuba semula
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
    </ErrorBoundary>
  )
}

export default App
