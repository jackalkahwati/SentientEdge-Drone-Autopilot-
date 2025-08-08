import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/mobile-nav"
import { SimulationEnvironment } from "@/components/simulation-environment"
import { ScenarioBuilder } from "@/components/scenario-builder"
import { SimulationControls } from "@/components/simulation-controls"
import { Play, Pause, RotateCcw, Save, Download, Upload, Plus } from "lucide-react"
import Link from "next/link"

export default function SimulationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">SentientEdge</span>
            </Link>
          </div>
          <MobileNav />
        </div>
      </header>

      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Simulation & Training</h1>
            <Badge variant="outline" className="ml-2">
              Digital Twin
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Save className="h-3.5 w-3.5" />
              <span>Save Scenario</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Upload className="h-3.5 w-3.5" />
              <span>Load</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>New Scenario</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="environment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="environment">Simulation Environment</TabsTrigger>
            <TabsTrigger value="scenario">Scenario Builder</TabsTrigger>
            <TabsTrigger value="analysis">Analysis & Playback</TabsTrigger>
          </TabsList>

          <TabsContent value="environment" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-12">
              <Card className="md:col-span-9">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Digital Twin Simulation</CardTitle>
                      <CardDescription>High-fidelity virtual environment for mission rehearsal</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[600px] w-full">
                    <SimulationEnvironment />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6 md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Simulation Controls</CardTitle>
                    <CardDescription>Configure simulation parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SimulationControls />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Details</CardTitle>
                    <CardDescription>Current mission parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Scenario Name</span>
                        <span className="font-medium">Urban Reconnaissance</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Environment</span>
                        <span className="font-medium">Urban Terrain</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Weather</span>
                        <span className="font-medium">Light Rain</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Time of Day</span>
                        <span className="font-medium">Dawn</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Drone Count</span>
                        <span className="font-medium">12</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Difficulty</span>
                        <span className="font-medium">Advanced</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Builder</CardTitle>
                <CardDescription>Create and customize training scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <ScenarioBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mission Analysis</CardTitle>
                <CardDescription>Review and analyze simulation results</CardDescription>
              </CardHeader>
              <CardContent className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No completed simulations to analyze</p>
                  <Button>Run a Simulation</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

