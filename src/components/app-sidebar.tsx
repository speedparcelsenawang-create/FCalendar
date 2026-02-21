"use client"

import * as React from "react"
import {
  Calendar,
  CalendarDays,
  Settings2,
  LifeBuoy,
  Send,
  Package,
  Search,
  X,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Calendar",
      url: "#",
      icon: Calendar,
      isActive: false,
      items: [
        {
          title: "Month View",
          url: "#",
          page: "calendar-month",
        },
        {
          title: "Week View",
          url: "#",
          page: "calendar-week",
        },
        {
          title: "Day View",
          url: "#",
          page: "calendar-day",
        },
      ],
    },
    {
      title: "Vending Machine",
      url: "#",
      icon: Package,
      isActive: false,
      items: [
        {
          title: "Route List",
          url: "#",
          page: "route-list",
        },
        {
          title: "Location",
          url: "#",
          page: "deliveries",
        },
        {
          title: "Map Marker",
          url: "#",
          page: "map-marker",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "#",
          page: "settings-profile",
        },
        {
          title: "Notifications",
          url: "#",
          page: "settings-notifications",
        },
        {
          title: "Appearance",
          url: "#",
          page: "settings-appearance",
        },
        {
          title: "Font",
          url: "#",
          page: "settings-appearance-font",
        },
        {
          title: "Display",
          url: "#",
          page: "settings-appearance-display",
        },
        {
          title: "Map Settings",
          url: "#",
          page: "settings-map",
        },
        {
          title: "Security",
          url: "#",
          page: "settings-security",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Plano Vm",
      url: "#",
      icon: CalendarDays,
    },
  ],
}

export function AppSidebar({ 
  onNavigate,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { 
  onNavigate?: (page: string) => void 
}) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredNavMain = React.useMemo(() => {
    if (!searchQuery.trim()) return data.navMain
    const q = searchQuery.toLowerCase()
    return data.navMain
      .map(item => {
        const titleMatch = item.title.toLowerCase().includes(q)
        const filteredSubs = item.items?.filter(sub => sub.title.toLowerCase().includes(q)) ?? []
        if (titleMatch) return item
        if (filteredSubs.length > 0) return { ...item, items: filteredSubs }
        return null
      })
      .filter(Boolean) as typeof data.navMain
  }, [searchQuery])

  const handleNavClick = (_itemTitle: string) => {
    // top-level items with children just expand/collapse — no navigation
  }

  const handleSubItemClick = (page: string) => {
    onNavigate?.(page)
  }

  const handleProjectClick = (projectName: string) => {
    if (onNavigate) {
      if (projectName === "Plano Vm") {
        onNavigate("plano-vm")
      }
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              asChild
              onClick={() => onNavigate?.("dashboard")}
            >
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Calendar className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">FCalendar</span>
                  <span className="truncate text-xs">Your Schedule</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Search field */}
        <div className="relative mt-1 sidebar-search-wrapper">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="sidebar-search h-8 w-full rounded-md border border-input bg-background pl-8 pr-7 text-sm shadow-none outline-none ring-0 transition-all duration-200 placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} onItemClick={handleNavClick} onSubItemClick={handleSubItemClick} searchQuery={searchQuery} />
        <NavProjects projects={data.projects} onProjectClick={handleProjectClick} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
