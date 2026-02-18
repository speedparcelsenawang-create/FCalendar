import { useState, lazy, Suspense } from "react"
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
      case "calendar":
        return <Calendar />
      case "settings":
        return <Settings />
      case "plano-vm":
        return <PlanoVM />
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
          </div>
        )
    }
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case "route-list":
        return "Route List"
      case "calendar":
        return "Calendar"
      case "settings":
        return "Settings"
      case "plano-vm":
        return "Plano VM"
      case "dashboard":
      default:
        return "Dashboard"
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
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 shadow-sm transition-all duration-500">
          <SidebarTrigger className="-ml-1" disabled={isEditMode} />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" onClick={() => handlePageChange("dashboard")}>
                  FCalendar
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            {hasUnsavedChanges && isEditMode && (
              <Button 
                onClick={handleSaveChanges}
                size="sm"
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="size-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            <Button 
              onClick={handleToggleEditMode}
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              className={isEditMode ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isEditMode ? (
                <>
                  <X className="size-4 mr-2" />
                  Exit Edit Mode
                </>
              ) : (
                <>
                  <Edit3 className="size-4 mr-2" />
                  Edit Mode
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

export function App() {
  return (
    <SidebarProvider>
      <EditModeProvider>
        <AppContent />
      </EditModeProvider>
    </SidebarProvider>
  )
}

export default App
