"use client"

import * as React from "react"
import {
  Calendar,
  CalendarDays,
  Settings2,
  LifeBuoy,
  Send,
  Route,
  Truck,
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
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [],
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
      name: "Route List",
      url: "#",
      icon: Route,
    },
    {
      name: "Plano Vm",
      url: "#",
      icon: CalendarDays,
    },
    {
      name: "Deliveries",
      url: "#",
      icon: Truck,
    },
  ],
}

export function AppSidebar({ 
  onNavigate,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { 
  onNavigate?: (page: string) => void 
}) {
  const handleNavClick = (itemTitle: string) => {
    if (onNavigate) {
      if (itemTitle === "Settings") {
        onNavigate("settings")
      }
    }
  }

  const handleSubItemClick = (page: string) => {
    onNavigate?.(page)
  }

  const handleProjectClick = (projectName: string) => {
    if (onNavigate) {
      if (projectName === "Route List") {
        onNavigate("route-list")
      } else if (projectName === "Plano Vm") {
        onNavigate("plano-vm")
      } else if (projectName === "Deliveries") {
        onNavigate("deliveries")
      }
    }
  }

  return (
    <Sidebar variant="inset" {...props}>
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
