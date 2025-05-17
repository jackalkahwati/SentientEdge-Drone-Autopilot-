"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CircleDot,
  DrillIcon as Drone,
  Grid3X3,
  Hexagon,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react"

interface SwarmControlProps {
  droneCount: number
}

export function SwarmControl({ droneCount }: SwarmControlProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight - 60 // Account for control panel
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Draw swarm visualization
    const drawSwarm = () => {
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1

      const gridSize = 40
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Draw swarm in grid formation
      const droneSize = 6
      const rows = Math.ceil(Math.sqrt(droneCount))
      const cols = Math.ceil(droneCount / rows)
      const spacing = Math.min(canvas.width / (cols + 1), canvas.height / (rows + 1))

      ctx.fillStyle = "rgba(33, 150, 243, 0.8)"

      let droneIndex = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (droneIndex < droneCount) {
            const x = (col + 1) * spacing
            const y = (row + 1) * spacing

            // Add slight random movement
            const offsetX = Math.sin(Date.now() / 1000 + droneIndex * 0.1) * 2
            const offsetY = Math.cos(Date.now() / 1000 + droneIndex * 0.1) * 2

            ctx.beginPath()
            ctx.arc(x + offsetX, y + offsetY, droneSize, 0, Math.PI * 2)
            ctx.fill()

            droneIndex++
          }
        }
      }

      // Request next frame
      requestAnimationFrame(drawSwarm)
    }

    // Start animation
    drawSwarm()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [droneCount])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Hexagon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <CircleDot className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowUpToLine className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowDownToLine className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Drone className="h-4 w-4" />
            <span className="text-sm font-medium">{droneCount}</span>
            <Slider defaultValue={[droneCount]} max={1000} step={1} className="w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

