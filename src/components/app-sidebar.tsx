"use client"

import * as React from "react"
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  Users,
  Settings2,
  LifeBuoy,
  Send,
  Route,
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
      isActive: true,
      items: [
        {
          title: "Month View",
          url: "#",
        },
        {
          title: "Week View",
          url: "#",
        },
        {
          title: "Day View",
          url: "#",
        },
      ],
    },
    {
      title: "Events",
      url: "#",
      icon: CalendarCheck,
      items: [
        {
          title: "All Events",
          url: "#",
        },
        {
          title: "Upcoming",
          url: "#",
        },
        {
          title: "Past Events",
          url: "#",
        },
      ],
    },
    {
      title: "Schedule",
      url: "#",
      icon: CalendarClock,
      items: [
        {
          title: "My Schedule",
          url: "#",
        },
        {
          title: "Team Schedule",
          url: "#",
        },
        {
          title: "Availability",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Notifications",
          url: "#",
        },
        {
          title: "Preferences",
          url: "#",
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
      name: "Team Meetings",
      url: "#",
      icon: Users,
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
      if (itemTitle === "Calendar") {
        onNavigate("calendar")
      } else if (itemTitle === "Settings") {
        onNavigate("settings")
      }
    }
  }

  const handleProjectClick = (projectName: string) => {
    if (onNavigate) {
      if (projectName === "Route List") {
        onNavigate("route-list")
      } else if (projectName === "Plano Vm") {
        onNavigate("plano-vm")
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
        <NavMain items={data.navMain} onItemClick={handleNavClick} />
        <NavProjects projects={data.projects} onProjectClick={handleProjectClick} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
