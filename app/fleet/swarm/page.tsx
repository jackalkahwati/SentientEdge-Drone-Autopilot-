"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/mobile-nav"
import SwarmControlInterface, { SwarmControlInterfaceHandle } from "@/components/swarm-control-interface"
import { SwarmFormationSelector } from "@/components/swarm-formation-selector"
import { SwarmMissionParameters } from "@/components/swarm-mission-parameters"
import { Play, Pause, RotateCcw, Save, Upload, Download } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SwarmControlPage() {
  const [formationType, setFormationType] = useState<"grid" | "circle" | "hex" | "custom">("grid");
  const [droneCount, setDroneCount] = useState(24);
  const [isSimulating, setIsSimulating] = useState(false);
  const [swarmMetrics, setSwarmMetrics] = useState({
    activeDrones: 24,
    totalDrones: 24,
    formationIntegrity: 98.7,
    communicationLatency: 4.2,
    averageBattery: 82,
    aiAssistance: true
  });
  
  const swarmInterfaceRef = useRef<SwarmControlInterfaceHandle | null>(null);
  
  // Handle formation change from the selector
  const handleFormationChange = (type: "grid" | "circle" | "hex" | "custom") => {
    setFormationType(type);
    // Update the visualization through the imperative API
    swarmInterfaceRef.current?.updateFormationType(type);
  };
  
  // Handle drone count change from the selector
  const handleDroneCountChange = (count: number) => {
    setDroneCount(count);
    setSwarmMetrics(prev => ({
      ...prev,
      activeDrones: count,
      totalDrones: count
    }));
  };
  
  // Toggle simulation
  const toggleSimulation = () => {
    // Tell the map interface to start / stop the animation
    swarmInterfaceRef.current?.toggleSimulation();

    setIsSimulating(prev => !prev);
    
    // Update some metrics randomly when simulation starts
    if (!isSimulating) {
      const interval = setInterval(() => {
        if (!isSimulating) {
          clearInterval(interval);
          return;
        }
        
        setSwarmMetrics(prev => ({
          ...prev,
          formationIntegrity: Math.max(90, Math.min(99.9, prev.formationIntegrity + (Math.random() - 0.5) * 2)),
          communicationLatency: Math.max(1, Math.min(10, prev.communicationLatency + (Math.random() - 0.5))),
          averageBattery: Math.max(50, Math.min(100, prev.averageBattery - Math.random() * 0.5)),
        }));
      }, 2000);
      
      return () => clearInterval(interval);
    }
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setIsSimulating(false);
    setSwarmMetrics({
      activeDrones: droneCount,
      totalDrones: droneCount,
      formationIntegrity: 99.9,
      communicationLatency: 3.2,
      averageBattery: 95,
      aiAssistance: true
    });
  };
  
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
            <h1 className="text-lg font-semibold md:text-2xl">Swarm Control</h1>
            <Badge variant="outline" className="ml-2">
              Advanced AI
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Save className="h-3.5 w-3.5" />
              <span>Save Formation</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Upload className="h-3.5 w-3.5" />
              <span>Load</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-9">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Swarm Visualization</CardTitle>
                  <CardDescription>Real-time swarm formation and control</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={toggleSimulation}
                  >
                    {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={resetSimulation}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <SwarmControlInterface 
                  ref={swarmInterfaceRef}
                  initialCenter={[-122.4194, 37.7749]}
                  initialZoom={15}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-3">
            {/* Combined Formation + Mission Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Swarm Configuration</CardTitle>
                <CardDescription>Adjust formation and mission parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="formation" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="formation">Formation</TabsTrigger>
                    <TabsTrigger value="mission">Mission</TabsTrigger>
                    <TabsTrigger value="status">Status</TabsTrigger>
                  </TabsList>

                  <TabsContent value="formation">
                    <SwarmFormationSelector onApplyFormation={handleFormationChange} />
                  </TabsContent>

                  <TabsContent value="mission">
                    <SwarmMissionParameters />
                  </TabsContent>

                  <TabsContent value="status">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Active Drones</span>
                        <span className="font-medium">{swarmMetrics.activeDrones} / {swarmMetrics.totalDrones}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Formation Integrity</span>
                        <span className="font-medium">{swarmMetrics.formationIntegrity.toFixed(1)}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Communication Latency</span>
                        <span className="font-medium">{swarmMetrics.communicationLatency.toFixed(1)}ms</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Battery</span>
                        <span className="font-medium">{swarmMetrics.averageBattery.toFixed(0)}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">AI Assistance</span>
                        <Badge variant="outline">{swarmMetrics.aiAssistance ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

