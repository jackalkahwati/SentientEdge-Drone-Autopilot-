import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileNav } from "@/components/mobile-nav"
import { DroneFleetTable } from "@/components/drone-fleet-table"
import { DroneTypeDistribution } from "@/components/drone-type-distribution"
import { FleetStatusOverview } from "@/components/fleet-status-overview"
import { Plus, Filter, Download, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function FleetPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">DomainCommand</span>
            </Link>
          </div>
          <MobileNav />
        </div>
      </header>

      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Drone Fleet Management</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Drone</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,248</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">+24</span>
                since last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Drones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">876</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">70.2%</span>
                deployment rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-yellow-500">3.4%</span>
                of total fleet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fleet Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">96.8%</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">+1.2%</span>
                from previous week
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-7 mb-6">
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Fleet Status Overview</CardTitle>
              <CardDescription>Current status of all drone units</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <FleetStatusOverview />
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Drone Type Distribution</CardTitle>
              <CardDescription>Breakdown by vehicle type</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <DroneTypeDistribution />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Drone Fleet</CardTitle>
              <CardDescription>Manage and monitor all drone units</CardDescription>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Drones</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="standby">Standby</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <DroneFleetTable />
              </TabsContent>

              <TabsContent value="active">
                <DroneFleetTable status="active" />
              </TabsContent>

              <TabsContent value="standby">
                <DroneFleetTable status="standby" />
              </TabsContent>

              <TabsContent value="maintenance">
                <DroneFleetTable status="maintenance" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

