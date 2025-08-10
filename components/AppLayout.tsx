"use client"

import { AppSidebar } from "./AppSidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

interface AppLayoutProps {
  children: React.ReactNode
}

function getBreadcrumbs(pathname: string) {
  if (pathname === "/dashboard") {
    return [
      { label: "Dashboard", href: "/dashboard", isPage: true }
    ]
  }
  
  if (pathname === "/finder") {
    return [
      { label: "Finder", href: "/finder", isPage: true }
    ]
  }
  
  if (pathname === "/messages" || pathname.startsWith("/chat")) {
    return [
      { label: "Messages", href: "/messages", isPage: true }
    ]
  }
  
  if (pathname === "/requests") {
    return [
      { label: "Requests", href: "/requests", isPage: true }
    ]
  }
  
  if (pathname.startsWith("/profile")) {
    return [
      { label: "Profile", href: "/profile", isPage: false },
      { label: pathname.includes("edit") ? "Edit" : "View", href: "#", isPage: true }
    ]
  }
  
  return [{ label: "Dashboard", href: "/dashboard", isPage: true }]
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-gray-200">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.label} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                    <BreadcrumbItem>
                      {crumb.isPage ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}