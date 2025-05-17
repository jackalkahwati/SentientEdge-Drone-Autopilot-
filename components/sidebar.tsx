"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Cpu,
  DrillIcon as Drone,
  FileText,
  Layers,
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
  Shield,
  Target,
  Users,
  Zap,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div className={cn("relative flex flex-col border-r bg-background", className)}>
      <div
        className={cn(
          "flex h-14 items-center px-4 border-b transition-all duration-200",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">SentientEdge</span>
          </Link>
        )}
        {collapsed && <Zap className="h-5 w-5 text-primary" />}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <nav className="grid gap-1 px-2 py-3">
          <div className={cn("mb-2", collapsed ? "px-2" : "px-3")}>
            {!collapsed && <h3 className="mb-1 text-xs font-medium text-muted-foreground">Overview</h3>}
            <div className="grid gap-1">
              <NavItem
                href="/"
                icon={LayoutDashboard}
                label="Dashboard"
                isActive={pathname === "/"}
                collapsed={collapsed}
              />
              <NavItem
                href="/missions"
                icon={Target}
                label="Missions"
                isActive={pathname === "/missions" || pathname.startsWith("/missions/")}
                collapsed={collapsed}
              />
              <NavItem
                href="/analytics"
                icon={BarChart3}
                label="Analytics"
                isActive={pathname === "/analytics"}
                collapsed={collapsed}
              />
              <NavItem
                href="/training"
                icon={Cpu}
                label="Training"
                isActive={pathname === "/training"}
                collapsed={collapsed}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className={cn("mb-2", collapsed ? "px-2" : "px-3")}>
            {!collapsed && <h3 className="mb-1 text-xs font-medium text-muted-foreground">Fleet Management</h3>}
            <div className="grid gap-1">
              <NavItem
                href="/fleet"
                icon={Drone}
                label="Drone Fleet"
                isActive={pathname === "/fleet"}
                collapsed={collapsed}
              />
              <NavItem
                href="/fleet/swarm"
                icon={Layers}
                label="Swarm Control"
                isActive={pathname === "/fleet/swarm"}
                collapsed={collapsed}
              />
              <NavItem
                href="/fleet/maintenance"
                icon={Settings}
                label="Maintenance"
                isActive={pathname === "/fleet/maintenance"}
                collapsed={collapsed}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className={cn("mb-2", collapsed ? "px-2" : "px-3")}>
            {!collapsed && <h3 className="mb-1 text-xs font-medium text-muted-foreground">Tactical</h3>}
            <div className="grid gap-1">
              <NavItem
                href="/tactical/map"
                icon={Map}
                label="Tactical Map"
                isActive={pathname === "/tactical/map"}
                collapsed={collapsed}
              />
              <NavItem
                href="/tactical/intelligence"
                icon={Shield}
                label="Intelligence"
                isActive={pathname === "/tactical/intelligence"}
                collapsed={collapsed}
              />
              <NavItem
                href="/tactical/comms"
                icon={MessageSquare}
                label="Communications"
                isActive={pathname === "/tactical/comms"}
                collapsed={collapsed}
              />
              <NavItem
                href="/drone-control"
                icon={Drone}
                label="Drone Control"
                isActive={pathname === "/drone-control"}
                collapsed={collapsed}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <div className={cn("mb-2", collapsed ? "px-2" : "px-3")}>
            {!collapsed && <h3 className="mb-1 text-xs font-medium text-muted-foreground">Administration</h3>}
            <div className="grid gap-1">
              <NavItem
                href="/admin/users"
                icon={Users}
                label="Users"
                isActive={pathname === "/admin/users"}
                collapsed={collapsed}
              />
              <NavItem
                href="/admin/reports"
                icon={FileText}
                label="Reports"
                isActive={pathname === "/admin/reports"}
                collapsed={collapsed}
              />
              <NavItem
                href="/settings"
                icon={Settings}
                label="Settings"
                isActive={pathname === "/settings"}
                collapsed={collapsed}
              />
            </div>
          </div>
        </nav>
      </ScrollArea>
      <div className="mt-auto p-4 border-t">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-start")}>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Secure Mode</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  isActive?: boolean
  collapsed?: boolean
}

function NavItem({ href, icon: Icon, label, isActive, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

