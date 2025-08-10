"use client"

import { Home, Search, MessageCircle, Users, Settings, Moon, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Main navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Overview and insights"
  },
  {
    title: "Finder",
    url: "/finder",
    icon: Search,
    description: "Find roommates nearby"
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageCircle,
    description: "Your active conversations"
  },
  {
    title: "Requests", 
    url: "/requests",
    icon: Users,
    description: "Connection requests"
  }
]

const footerItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "App preferences"
  }
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard"
    if (url === "/finder") return pathname === "/finder"
    if (url === "/messages") return pathname === "/messages" || pathname.startsWith("/chat")
    if (url === "/requests") return pathname === "/requests"
    if (url.includes("profile")) return pathname.startsWith("/profile")
    return pathname === url
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <span className="font-bold text-sm">A</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Adonde</span>
                  <span className="truncate text-xs text-muted-foreground">Roommate Finder</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    tooltip={item.description}
                    isActive={isActive(item.url)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={() => router.push(item.url)}
                tooltip={item.description}
                isActive={isActive(item.url)}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Toggle theme">
              <Moon />
              <span>Dark Mode</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* User Profile */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/profile')}
              tooltip="Your profile"
            >
              <User />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}