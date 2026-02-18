import { useState, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
import { EditModeProvider, useEditMode } from "@/contexts/EditModeContext"
import { Edit3, Save, X } from "lucide-react"
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
      className="inline-block w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10"
      style={{ backgroundColor: color }}
    />
  )
}

function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-2xl mx-auto w-full">
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
    } else {
      setIsEditMode(!isEditMode)
    }
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
      
      <main className={`relative flex w-full flex-1 flex-col bg-background transition-all duration-500 ease-in-out ${(isMobile && openMobile) || (!isMobile && open) ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`}>
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 px-3 md:px-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-500" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)', paddingBottom: '0.25rem', minHeight: 'calc(3.5rem + env(safe-area-inset-top) + 0.5rem)' }}>
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
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2.5 md:px-3 ${isEditMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
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
