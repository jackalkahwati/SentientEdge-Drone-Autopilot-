"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { LayoutGrid, CircleDot, Hexagon, Grid3X3, ArrowRight, Triangle, Minus, Plus } from "lucide-react"

export interface SwarmFormationSelectorProps {
  /** Called when the user presses the "Apply Formation" button */
  onApplyFormation?: (type: "grid" | "circle" | "hex" | "custom") => void;
}

export function SwarmFormationSelector({ onApplyFormation }: SwarmFormationSelectorProps) {
  const [spacing, setSpacing] = useState(50)
  const [density, setDensity] = useState(70)
  const [adaptiveBehavior, setAdaptiveBehavior] = useState(true)
  // Track selected formation locally
  const [selectedFormation, setSelectedFormation] = useState<"grid" | "circle" | "hex" | "arrow" | "triangle" | "custom">("grid")

  return (
    <div className="space-y-6">
      <RadioGroup value={selectedFormation} onValueChange={setSelectedFormation}>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="grid" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="grid" id="grid" className="sr-only" />
            <LayoutGrid className="h-5 w-5" />
            <span className="text-xs">Grid</span>
          </label>

          <label htmlFor="circle" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="circle" id="circle" className="sr-only" />
            <CircleDot className="h-5 w-5" />
            <span className="text-xs">Circle</span>
          </label>

          <label htmlFor="hex" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="hex" id="hex" className="sr-only" />
            <Hexagon className="h-5 w-5" />
            <span className="text-xs">Hexagon</span>
          </label>

          <label htmlFor="arrow" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="arrow" id="arrow" className="sr-only" />
            <ArrowRight className="h-5 w-5" />
            <span className="text-xs">Arrow</span>
          </label>

          <label htmlFor="triangle" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="triangle" id="triangle" className="sr-only" />
            <Triangle className="h-5 w-5" />
            <span className="text-xs">Triangle</span>
          </label>

          <label htmlFor="custom" className="w-full h-16 flex flex-col items-center justify-center gap-1 border rounded-md cursor-pointer hover:bg-muted">
            <RadioGroupItem value="custom" id="custom" className="sr-only" />
            <Grid3X3 className="h-5 w-5" />
            <span className="text-xs">Custom</span>
          </label>
        </div>
      </RadioGroup>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="spacing">Drone Spacing</Label>
            <span className="text-sm">{spacing}m</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="spacing"
              value={[spacing]}
              min={10}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={(value) => setSpacing(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="density">Formation Density</Label>
            <span className="text-sm">{density}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              id="density"
              value={[density]}
              min={10}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={(value) => setDensity(value[0])}
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="adaptive">Adaptive Behavior</Label>
            <p className="text-xs text-muted-foreground">Automatically adjust to obstacles</p>
          </div>
          <Switch id="adaptive" checked={adaptiveBehavior} onCheckedChange={setAdaptiveBehavior} />
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => {
          if (!onApplyFormation) return;
          // Map additional shapes to "custom" for now
          const mapping: Record<string, "grid" | "circle" | "hex" | "custom"> = {
            grid: "grid",
            circle: "circle",
            hex: "hex",
            arrow: "custom",
            triangle: "custom",
            custom: "custom",
          };
          onApplyFormation(mapping[selectedFormation]);
        }}
      >
        Apply Formation
      </Button>
    </div>
  )
}

