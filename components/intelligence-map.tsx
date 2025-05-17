"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ZoomIn,
  ZoomOut,
  Move,
  Layers,
  MapIcon,
  Satellite,
  Wind,
  Eye,
  AlertTriangle,
  Radio,
  MessageSquare,
  ImageIcon,
} from "lucide-react"

export function IntelligenceMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [mapMode, setMapMode] = useState<"terrain" | "satellite" | "hybrid">("terrain")
  const [showLayers, setShowLayers] = useState({
    terrain: true,
    weather: false,
    intel: true,
    signals: true,
    imagery: true,
    human: true,
    threats: true,
  })

  // Mock intelligence data points
  const intelPoints = [
    {
      id: "intel-001",
      type: "imagery",
      position: { x: 0.3, y: 0.4 },
      title: "Suspicious Vehicle Movement",
      classification: "secret",
      timestamp: "10:42:15",
    },
    {
      id: "intel-002",
      type: "signal",
      position: { x: 0.65, y: 0.35 },
      title: "Communications Intercept",
      classification: "top-secret",
      timestamp: "10:38:22",
    },
    {
      id: "intel-003",
      type: "human",
      position: { x: 0.45, y: 0.6 },
      title: "Local Informant Report",
      classification: "confidential",
      timestamp: "09:15:47",
    },
    {
      id: "intel-004",
      type: "imagery",
      position: { x: 0.75, y: 0.25 },
      title: "Satellite Imagery Analysis",
      classification: "secret",
      timestamp: "08:58:33",
    },
    {
      id: "intel-005",
      type: "open-source",
      position: { x: 0.2, y: 0.2 },
      title: "Social Media Activity Spike",
      classification: "restricted",
      timestamp: "08:22:15",
    },
  ]

  // Mock threat zones
  const threatZones = [
    {
      position: { x: 0.65, y: 0.35 },
      radius: 0.1,
      level: 4,
      title: "High Activity Zone",
    },
    {
      position: { x: 0.75, y: 0.25 },
      radius: 0.15,
      level: 2,
      title: "Suspicious Movement",
    },
  ]

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
        canvas.height = parent.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Draw intelligence map
    const drawMap = () => {
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw terrain based on map mode
      drawTerrain(ctx, canvas, mapMode)

      // Draw grid
      drawGrid(ctx, canvas, zoom)

      // Draw coordinate system
      drawCoordinateSystem(ctx, canvas)

      // Draw threat zones if enabled
      if (showLayers.threats) {
        drawThreatZones(ctx, canvas, threatZones)
      }

      // Draw intelligence points
      drawIntelPoints(
        ctx,
        canvas,
        intelPoints.filter((point) => {
          // Filter based on layer visibility
          if (point.type === "imagery" && !showLayers.imagery) return false
          if (point.type === "signal" && !showLayers.signals) return false
          if (point.type === "human" && !showLayers.human) return false
          return showLayers.intel
        }),
      )

      // Request next frame
      requestAnimationFrame(drawMap)
    }

    // Start animation
    drawMap()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [zoom, mapMode, showLayers, intelPoints, threatZones])

  // Helper function to draw terrain
  const drawTerrain = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, mode: string) => {
    // Base terrain color
    if (mode === "terrain" || mode === "hybrid") {
      ctx.fillStyle = "rgba(40, 60, 40, 1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw some terrain features
      // Mountains
      ctx.fillStyle = "rgba(80, 90, 80, 0.7)"
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.3, canvas.height * 0.3, 120, 80, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.7, canvas.height * 0.2, 100, 60, 0, 0, Math.PI * 2)
      ctx.fill()

      // Water
      ctx.fillStyle = "rgba(33, 150, 243, 0.5)"
      ctx.beginPath()
      ctx.moveTo(0, canvas.height * 0.7)
      ctx.bezierCurveTo(
        canvas.width * 0.3,
        canvas.height * 0.6,
        canvas.width * 0.6,
        canvas.height * 0.8,
        canvas.width,
        canvas.height * 0.65,
      )
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      ctx.fill()
    } else if (mode === "satellite") {
      // Satellite view - darker with more texture
      ctx.fillStyle = "rgba(30, 40, 30, 1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add some texture/noise
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const size = Math.random() * 2
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`
        ctx.fillRect(x, y, size, size)
      }

      // Water with different color for satellite view
      ctx.fillStyle = "rgba(20, 60, 120, 0.7)"
      ctx.beginPath()
      ctx.moveTo(0, canvas.height * 0.7)
      ctx.bezierCurveTo(
        canvas.width * 0.3,
        canvas.height * 0.6,
        canvas.width * 0.6,
        canvas.height * 0.8,
        canvas.width,
        canvas.height * 0.65,
      )
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Helper function to draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, zoom: number) => {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1

    const gridSize = 40 * zoom
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
  }

  // Helper function to draw coordinate system
  const drawCoordinateSystem = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Draw coordinates at the corners
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.font = "12px sans-serif"

    // Top-left
    ctx.textAlign = "left"
    ctx.fillText("N 38°12'30\"", 10, 20)
    ctx.fillText("W 122°15'45\"", 10, 35)

    // Top-right
    ctx.textAlign = "right"
    ctx.fillText("N 38°12'30\"", canvas.width - 10, 20)
    ctx.fillText("W 122°10'15\"", canvas.width - 10, 35)

    // Bottom-left
    ctx.textAlign = "left"
    ctx.fillText("N 38°08'10\"", 10, canvas.height - 20)
    ctx.fillText("W 122°15'45\"", 10, canvas.height - 5)

    // Bottom-right
    ctx.textAlign = "right"
    ctx.fillText("N 38°08'10\"", canvas.width - 10, canvas.height - 20)
    ctx.fillText("W 122°10'15\"", canvas.width - 10, canvas.height - 5)
  }

  // Helper function to draw threat zones
  const drawThreatZones = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, zones: any[]) => {
    zones.forEach((zone) => {
      const x = zone.position.x * canvas.width
      const y = zone.position.y * canvas.height
      const radius = zone.radius * Math.min(canvas.width, canvas.height)

      // Choose color based on threat level
      let color
      switch (zone.level) {
        case 1:
          color = "rgba(255, 255, 0, 0.1)"
          break
        case 2:
          color = "rgba(255, 165, 0, 0.15)"
          break
        case 3:
          color = "rgba(255, 100, 0, 0.2)"
          break
        case 4:
          color = "rgba(255, 0, 0, 0.25)"
          break
        default:
          color = "rgba(255, 255, 0, 0.1)"
      }

      // Draw threat zone
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()

      // Draw border
      ctx.strokeStyle = color.replace("0.1", "0.5").replace("0.15", "0.5").replace("0.2", "0.5").replace("0.25", "0.5")
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw threat level indicator
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.font = "bold 14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`TL${zone.level}`, x, y)

      // Draw title
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
      ctx.font = "12px sans-serif"
      ctx.fillText(zone.title, x, y + 20)
    })
  }

  // Helper function to draw intelligence points
  const drawIntelPoints = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, points: any[]) => {
    points.forEach((point) => {
      const x = point.position.x * canvas.width
      const y = point.position.y * canvas.height

      // Choose icon and color based on intel type
      let color, icon
      switch (point.type) {
        case "imagery":
          color = "rgba(0, 150, 255, 1)"
          icon = (x: number, y: number) => {
            ctx.beginPath()
            ctx.moveTo(x - 6, y - 6)
            ctx.lineTo(x + 6, y - 6)
            ctx.lineTo(x + 6, y + 6)
            ctx.lineTo(x - 6, y + 6)
            ctx.closePath()
            ctx.fill()
          }
          break
        case "signal":
          color = "rgba(255, 100, 255, 1)"
          icon = (x: number, y: number) => {
            ctx.beginPath()
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.fill()

            // Radio waves
            ctx.beginPath()
            ctx.arc(x, y, 10, -Math.PI / 4, Math.PI / 4)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(x, y, 14, -Math.PI / 4, Math.PI / 4)
            ctx.stroke()
          }
          break
        case "human":
          color = "rgba(255, 200, 0, 1)"
          icon = (x: number, y: number) => {
            ctx.beginPath()
            ctx.moveTo(x, y - 6)
            ctx.lineTo(x - 6, y + 6)
            ctx.lineTo(x + 6, y + 6)
            ctx.closePath()
            ctx.fill()
          }
          break
        case "open-source":
          color = "rgba(100, 255, 100, 1)"
          icon = (x: number, y: number) => {
            ctx.beginPath()
            ctx.moveTo(x, y - 6)
            ctx.lineTo(x + 6, y)
            ctx.lineTo(x, y + 6)
            ctx.lineTo(x - 6, y)
            ctx.closePath()
            ctx.fill()
          }
          break
        default:
          color = "rgba(200, 200, 200, 1)"
          icon = (x: number, y: number) => {
            ctx.beginPath()
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.fill()
          }
      }

      // Draw icon
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      icon(x, y)

      // Draw pulse effect for newer intel
      if (point.timestamp.includes("10:")) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.arc(x, y, 10 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw classification indicator
      let classColor
      switch (point.classification) {
        case "top-secret":
          classColor = "rgba(255, 50, 50, 1)"
          break
        case "secret":
          classColor = "rgba(255, 100, 100, 1)"
          break
        case "confidential":
          classColor = "rgba(255, 200, 0, 1)"
          break
        default:
          classColor = "rgba(200, 200, 200, 1)"
      }

      ctx.fillStyle = classColor
      ctx.beginPath()
      ctx.arc(x + 8, y - 8, 3, 0, Math.PI * 2)
      ctx.fill()

      // Draw title on hover (simulated for a few points)
      if (point.id === "intel-001" || point.id === "intel-002") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.roundRect(x - 100, y - 40, 200, 30, 5)
        ctx.fill()

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(point.title, x, y - 25)
        ctx.font = "10px sans-serif"
        ctx.fillText(point.timestamp, x, y - 10)
      }
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="h-full w-full" />

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((prev) => Math.min(prev + 0.2, 2))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8">
            <Move className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8">
            <Layers className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant={mapMode === "terrain" ? "default" : "secondary"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setMapMode("terrain")}
          >
            <MapIcon className="h-4 w-4" />
            <span>Terrain</span>
          </Button>
          <Button
            variant={mapMode === "satellite" ? "default" : "secondary"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setMapMode("satellite")}
          >
            <Satellite className="h-4 w-4" />
            <span>Satellite</span>
          </Button>
          <Button
            variant={mapMode === "hybrid" ? "default" : "secondary"}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setMapMode("hybrid")}
          >
            <Layers className="h-4 w-4" />
            <span>Hybrid</span>
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-background/80 p-2 rounded-md">
          <div className="text-xs font-medium mb-1">Intelligence Layers</div>
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.intel ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, intel: !showLayers.intel })}
            >
              <Eye className="h-3 w-3 mr-1" />
              <span>All Intel</span>
            </Button>
            <Button
              variant={showLayers.threats ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, threats: !showLayers.threats })}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>Threats</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.imagery ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, imagery: !showLayers.imagery })}
            >
              <ImageIcon className="h-3 w-3 mr-1" />
              <span>Imagery</span>
            </Button>
            <Button
              variant={showLayers.signals ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, signals: !showLayers.signals })}
            >
              <Radio className="h-3 w-3 mr-1" />
              <span>Signals</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.human ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, human: !showLayers.human })}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              <span>Human</span>
            </Button>
            <Button
              variant={showLayers.weather ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, weather: !showLayers.weather })}
            >
              <Wind className="h-3 w-3 mr-1" />
              <span>Weather</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

