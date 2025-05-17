"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Minus, Plus } from "lucide-react"

export function SwarmMissionParameters() {
  const [altitude, setAltitude] = useState(120)
  const [speed, setSpeed] = useState(15)
  const [autonomyLevel, setAutonomyLevel] = useState("assisted")
  const [collisionAvoidance, setCollisionAvoidance] = useState(true)
  const [adaptivePath, setAdaptivePath] = useState(true)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="altitude">Altitude</Label>
            <span className="text-sm">{altitude}m</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="altitude"
              value={[altitude]}
              min={10}
              max={500}
              step={10}
              className="flex-1"
              onValueChange={(value) => setAltitude(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed">Speed</Label>
            <span className="text-sm">{speed}m/s</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="speed"
              value={[speed]}
              min={5}
              max={30}
              step={1}
              className="flex-1"
              onValueChange={(value) => setSpeed(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="autonomy">Autonomy Level</Label>
          <Select value={autonomyLevel} onValueChange={setAutonomyLevel}>
            <SelectTrigger id="autonomy">
              <SelectValue placeholder="Select autonomy level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Control</SelectItem>
              <SelectItem value="assisted">AI Assisted</SelectItem>
              <SelectItem value="semi">Semi-Autonomous</SelectItem>
              <SelectItem value="full">Fully Autonomous</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="collision">Collision Avoidance</Label>
            <p className="text-xs text-muted-foreground">AI-powered obstacle detection</p>
          </div>
          <Switch id="collision" checked={collisionAvoidance} onCheckedChange={setCollisionAvoidance} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="adaptive-path">Adaptive Path Planning</Label>
            <p className="text-xs text-muted-foreground">Dynamic route optimization</p>
          </div>
          <Switch id="adaptive-path" checked={adaptivePath} onCheckedChange={setAdaptivePath} />
        </div>
      </div>

      <Button className="w-full">Apply Parameters</Button>
    </div>
  )
}

