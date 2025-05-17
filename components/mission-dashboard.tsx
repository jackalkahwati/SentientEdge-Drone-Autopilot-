"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Compass,
  DrillIcon as Drone,
  Eye,
  Layers,
  Map,
  Menu,
  MessageSquare,
  Shield,
  Target,
  Wind,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { TacticalMap } from "@/components/tactical-map"
import { SwarmControl } from "@/components/swarm-control"
import { MissionStats } from "@/components/mission-stats"
import { ThreatOverlay } from "@/components/threat-overlay"
import { CommandPanel } from "@/components/command-panel"

export function MissionDashboard() {
  const [activeMission, setActiveMission] = useState(true)
  const [threatLevel, setThreatLevel] = useState(2) // 0-4 scale
  const [droneCount, setDroneCount] = useState(128)
  const [missionProgress, setMissionProgress] = useState(47)

  return (
    <div className="flex flex-col">
      <div className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Mission Dashboard</h1>
            <Badge variant={activeMission ? "default" : "outline"} className="ml-2">
              {activeMission ? "ACTIVE" : "STANDBY"}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Drone className="h-4 w-4" />
              <span className="text-sm font-medium">{droneCount} Drones</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${threatLevel > 2 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">
                Threat Level: {["Minimal", "Low", "Moderate", "High", "Critical"][threatLevel]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Mission Progress: {missionProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container grid flex-1 gap-4 py-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-3">
          <Tabs defaultValue="tactical" className="h-full space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="tactical" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  <span>Tactical</span>
                </TabsTrigger>
                <TabsTrigger value="swarm" className="flex items-center gap-2">
                  <Drone className="h-4 w-4" />
                  <span>Swarm</span>
                </TabsTrigger>
                <TabsTrigger value="intel" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Intel</span>
                </TabsTrigger>
                <TabsTrigger value="comms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comms</span>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Layers</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Menu className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <TabsContent value="tactical" className="h-[calc(100%-40px)]">
              <div className="relative h-full rounded-lg border">
                <TacticalMap />
                <ThreatOverlay threatLevel={threatLevel} />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="h-8 gap-1">
                    <Compass className="h-3.5 w-3.5" />
                    <span>Navigate</span>
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1">
                    <Target className="h-3.5 w-3.5" />
                    <span>Targets</span>
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1">
                    <Wind className="h-3.5 w-3.5" />
                    <span>Weather</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="swarm" className="h-[calc(100%-40px)]">
              <div className="h-full rounded-lg border">
                <SwarmControl droneCount={droneCount} />
              </div>
            </TabsContent>
            <TabsContent value="intel" className="h-[calc(100%-40px)]">
              <div className="h-full rounded-lg border p-4">
                <h3 className="text-lg font-medium">Intelligence Feed</h3>
                <p className="text-muted-foreground">Real-time intelligence data will be displayed here.</p>
              </div>
            </TabsContent>
            <TabsContent value="comms" className="h-[calc(100%-40px)]">
              <div className="h-full rounded-lg border p-4">
                <h3 className="text-lg font-medium">Communications</h3>
                <p className="text-muted-foreground">Secure communications interface will be displayed here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mission Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{missionProgress}%</span>
                  </div>
                  <Progress value={missionProgress} className="h-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Pause
                  </Button>
                  <Button size="sm" className="w-full">
                    Adapt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <CommandPanel />
          <MissionStats />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Environmental Data</CardTitle>
              <CardDescription>Real-time conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wind</span>
                  <span className="text-sm font-medium">12 kts NE</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <span className="text-sm font-medium">8.2 km</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Temperature</span>
                  <span className="text-sm font-medium">22°C</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Precipitation</span>
                  <span className="text-sm font-medium">0%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

