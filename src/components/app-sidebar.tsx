"use client"

import * as React from "react"
import {
  Calendar,
  CalendarDays,
  Settings2,
  LifeBuoy,
  Send,
  Package,
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
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onItemClick={handleNavClick} onSubItemClick={handleSubItemClick} />
        <NavProjects projects={data.projects} onProjectClick={handleProjectClick} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
