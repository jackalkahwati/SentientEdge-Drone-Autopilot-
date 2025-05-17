"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Minus, Plus, Clock, Cpu, Shield, Zap } from "lucide-react"

export function SimulationControls() {
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [aiDifficulty, setAiDifficulty] = useState(3)
  const [realisticPhysics, setRealisticPhysics] = useState(true)
  const [advancedWeather, setAdvancedWeather] = useState(true)
  const [failureSimulation, setFailureSimulation] = useState(false)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="simulation-speed">Simulation Speed</Label>
            <span className="text-sm">{simulationSpeed}x</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="simulation-speed"
              value={[simulationSpeed]}
              min={0.25}
              max={4}
              step={0.25}
              className="flex-1"
              onValueChange={(value) => setSimulationSpeed(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-difficulty">AI Difficulty</Label>
            <span className="text-sm">{aiDifficulty}/5</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="ai-difficulty"
              value={[aiDifficulty]}
              min={1}
              max={5}
              step={1}
              className="flex-1"
              onValueChange={(value) => setAiDifficulty(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="environment">Environment Type</Label>
          <Select defaultValue="urban">
            <SelectTrigger id="environment">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urban">Urban Terrain</SelectItem>
              <SelectItem value="rural">Rural Landscape</SelectItem>
              <SelectItem value="desert">Desert Environment</SelectItem>
              <SelectItem value="mountain">Mountainous Region</SelectItem>
              <SelectItem value="coastal">Coastal Area</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="realistic-physics">Realistic Physics</Label>
            <p className="text-xs text-muted-foreground">Accurate flight dynamics and collisions</p>
          </div>
          <Switch id="realistic-physics" checked={realisticPhysics} onCheckedChange={setRealisticPhysics} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="advanced-weather">Advanced Weather</Label>
            <p className="text-xs text-muted-foreground">Wind, precipitation, and visibility effects</p>
          </div>
          <Switch id="advanced-weather" checked={advancedWeather} onCheckedChange={setAdvancedWeather} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="failure-simulation">Failure Simulation</Label>
            <p className="text-xs text-muted-foreground">Random component failures and malfunctions</p>
          </div>
          <Switch id="failure-simulation" checked={failureSimulation} onCheckedChange={setFailureSimulation} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">System Resources</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">CPU Usage</span>
            </div>
            <div className="w-24">
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-full w-[65%] rounded-full bg-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">GPU Usage</span>
            </div>
            <div className="w-24">
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-full w-[78%] rounded-full bg-purple-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Simulation Time</span>
            </div>
            <span className="text-sm">00:15:42</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">AI Status</span>
            </div>
            <span className="text-sm text-green-500">Operational</span>
          </div>
        </div>
      </div>

      <Button className="w-full">Apply Settings</Button>
    </div>
  )
}

