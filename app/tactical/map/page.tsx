"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MapboxTacticalMap from "@/components/mapbox-tactical-map";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, Shield, Map, Layers, Target, Filter, Maximize, RotateCcw, Save,
  Clock, AlertTriangle, Ruler, Sun, 
  Wind, Droplets, Thermometer, Globe 
} from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { EntityList } from "@/components/entity-list";
import { ThreatAssessment } from "@/components/threat-assessment";
import { CommandControls } from "@/components/command-controls";

export default function TacticalMapPage() {
  const [activeThreatLevel, setActiveThreatLevel] = useState(2);
  
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
            <h1 className="text-lg font-semibold md:text-2xl">Tactical Command</h1>
            <Badge variant="outline" className="ml-2">
              Live Operations
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center space-x-3 mr-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className={`h-4 w-4 ${activeThreatLevel > 1 ? "text-orange-500" : "text-green-500"}`} />
                <span className="text-sm">
                  Threat Level: {["Minimal", "Low", "Moderate", "High", "Critical"][activeThreatLevel]}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Layers className="h-3.5 w-3.5" />
              <span>Layers</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>Intel Mode</span>
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
                  <CardTitle>Situational Awareness</CardTitle>
                  <CardDescription>Multi-domain tactical visualization</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Maximize className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <MapboxTacticalMap />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Entity Control</CardTitle>
                <CardDescription>Friendly, neutral, and hostile units</CardDescription>
              </CardHeader>
              <CardContent>
                <EntityList />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threat Assessment</CardTitle>
                <CardDescription>Real-time threat analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreatAssessment />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Command Controls</CardTitle>
                <CardDescription>Mission execution</CardDescription>
              </CardHeader>
              <CardContent>
                <CommandControls />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}