"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0 sm:max-w-xs">
        <div className="px-7">
          <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
            <span className="font-bold text-xl">SentientEdge</span>
          </Link>
        </div>
        <nav className="mt-6 flex flex-col gap-4 px-2">
          <div className="px-5">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Overview</h3>
            <div className="grid gap-1">
              <MobileLink href="/" setOpen={setOpen}>
                Dashboard
              </MobileLink>
              <MobileLink href="/missions" setOpen={setOpen}>
                Missions
              </MobileLink>
              <MobileLink href="/analytics" setOpen={setOpen}>
                Analytics
              </MobileLink>
              <MobileLink href="/training" setOpen={setOpen}>
                Training
              </MobileLink>
            </div>
          </div>
          <div className="px-5">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Fleet Management</h3>
            <div className="grid gap-1">
              <MobileLink href="/fleet" setOpen={setOpen}>
                Drone Fleet
              </MobileLink>
              <MobileLink href="/fleet/swarm" setOpen={setOpen}>
                Swarm Control
              </MobileLink>
              <MobileLink href="/fleet/maintenance" setOpen={setOpen}>
                Maintenance
              </MobileLink>
            </div>
          </div>
          <div className="px-5">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Tactical</h3>
            <div className="grid gap-1">
              <MobileLink href="/tactical/map" setOpen={setOpen}>
                Tactical Map
              </MobileLink>
              <MobileLink href="/tactical/intelligence" setOpen={setOpen}>
                Intelligence
              </MobileLink>
              <MobileLink href="/tactical/comms" setOpen={setOpen}>
                Communications
              </MobileLink>
            </div>
          </div>
          <div className="px-5">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Administration</h3>
            <div className="grid gap-1">
              <MobileLink href="/admin/users" setOpen={setOpen}>
                Users
              </MobileLink>
              <MobileLink href="/admin/reports" setOpen={setOpen}>
                Reports
              </MobileLink>
              <MobileLink href="/settings" setOpen={setOpen}>
                Settings
              </MobileLink>
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps {
  children: React.ReactNode
  href: string
  setOpen: (open: boolean) => void
}

function MobileLink({ children, href, setOpen }: MobileLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  )
}

