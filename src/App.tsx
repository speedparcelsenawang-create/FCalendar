import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { RouteList } from "@/components/RouteList"
import { ThemeToggle } from "@/components/theme-toggle"
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
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar()

  const renderContent = () => {
    switch (currentPage) {
      case "route-list":
        return <RouteList />
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
      case "dashboard":
      default:
        return "Dashboard"
    }
  }

  return (
    <>
      <AppSidebar onNavigate={setCurrentPage} />
      
      {/* Backdrop for desktop sidebar */}
      {!isMobile && open && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}
      
      <main className={`relative flex w-full flex-1 flex-col bg-background transition-all duration-500 ease-in-out ${(isMobile && openMobile) || (!isMobile && open) ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 shadow-sm transition-all duration-500">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" onClick={() => setCurrentPage("dashboard")}>
                  FCalendar
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {renderContent()}
      </main>
    </>
  )
}

export function App() {
  return (
    <SidebarProvider>
      <AppContent />
    </SidebarProvider>
  )
}

export default App
