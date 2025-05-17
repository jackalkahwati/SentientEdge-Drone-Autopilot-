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
  Mountain,
  Wind,
  Eye,
  Shield,
  Target,
  AlertTriangle,
} from "lucide-react"

type EntityType = "friendly" | "hostile" | "neutral" | "unknown"
type DomainType = "air" | "ground" | "sea" | "underwater"
type VehicleType = "multirotor" | "fixed-wing" | "ground" | "underwater" | "ship" | "infantry" | "armor"

interface Entity {
  id: string
  name: string
  type: EntityType
  domain: DomainType
  vehicleType: VehicleType
  position: { x: number; y: number }
  heading: number
  speed: number
  altitude?: number
  depth?: number
  threatLevel?: number
}

export function TacticalMapInterface() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [mapMode, setMapMode] = useState<"terrain" | "satellite" | "hybrid">("terrain")
  const [showLayers, setShowLayers] = useState({
    terrain: true,
    weather: false,
    threats: true,
    friendly: true,
    hostile: true,
    neutral: true,
    unknown: false,
    air: true,
    ground: true,
    sea: true,
    underwater: false,
  })

  // Mock entities data
  const entities: Entity[] = [
    // Friendly entities
    {
      id: "f-001",
      name: "Falcon-1",
      type: "friendly",
      domain: "air",
      vehicleType: "multirotor",
      position: { x: 0.3, y: 0.4 },
      heading: 45,
      speed: 15,
      altitude: 120,
    },
    {
      id: "f-002",
      name: "Eagle-2",
      type: "friendly",
      domain: "air",
      vehicleType: "fixed-wing",
      position: { x: 0.25, y: 0.35 },
      heading: 90,
      speed: 40,
      altitude: 300,
    },
    {
      id: "f-003",
      name: "Rover-1",
      type: "friendly",
      domain: "ground",
      vehicleType: "ground",
      position: { x: 0.4, y: 0.5 },
      heading: 180,
      speed: 8,
    },
    {
      id: "f-004",
      name: "Manta-1",
      type: "friendly",
      domain: "underwater",
      vehicleType: "underwater",
      position: { x: 0.7, y: 0.8 },
      heading: 270,
      speed: 5,
      depth: 30,
    },

    // Hostile entities
    {
      id: "h-001",
      name: "Unknown UAV",
      type: "hostile",
      domain: "air",
      vehicleType: "multirotor",
      position: { x: 0.7, y: 0.3 },
      heading: 225,
      speed: 20,
      altitude: 150,
      threatLevel: 3,
    },
    {
      id: "h-002",
      name: "Hostile Vehicle",
      type: "hostile",
      domain: "ground",
      vehicleType: "armor",
      position: { x: 0.65, y: 0.35 },
      heading: 180,
      speed: 5,
      threatLevel: 4,
    },

    // Neutral entities
    {
      id: "n-001",
      name: "Civilian Aircraft",
      type: "neutral",
      domain: "air",
      vehicleType: "fixed-wing",
      position: { x: 0.2, y: 0.2 },
      heading: 90,
      speed: 100,
      altitude: 1000,
    },
    {
      id: "n-002",
      name: "Fishing Vessel",
      type: "neutral",
      domain: "sea",
      vehicleType: "ship",
      position: { x: 0.8, y: 0.7 },
      heading: 45,
      speed: 8,
    },

    // Unknown entities
    {
      id: "u-001",
      name: "Unidentified Contact",
      type: "unknown",
      domain: "ground",
      vehicleType: "ground",
      position: { x: 0.5, y: 0.6 },
      heading: 0,
      speed: 0,
    },
  ]

  // Mock threat zones
  const threatZones = [
    {
      position: { x: 0.65, y: 0.35 },
      radius: 0.1,
      level: 4,
    },
    {
      position: { x: 0.75, y: 0.25 },
      radius: 0.15,
      level: 2,
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

    // Draw tactical map
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

      // Draw entities
      drawEntities(
        ctx,
        canvas,
        entities.filter((entity) => {
          // Filter based on layer visibility
          if (!showLayers[entity.type]) return false
          if (!showLayers[entity.domain]) return false
          return true
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
  }, [zoom, mapMode, showLayers, entities, threatZones])

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
    })
  }

  // Helper function to draw entities
  const drawEntities = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, entities: Entity[]) => {
    entities.forEach((entity) => {
      const x = entity.position.x * canvas.width
      const y = entity.position.y * canvas.height

      // Choose color and size based on entity type
      let color, size
      switch (entity.type) {
        case "friendly":
          color = "rgba(0, 150, 255, 1)"
          size = 6
          break
        case "hostile":
          color = "rgba(255, 50, 50, 1)"
          size = 6
          break
        case "neutral":
          color = "rgba(255, 255, 255, 1)"
          size = 5
          break
        case "unknown":
          color = "rgba(255, 255, 0, 1)"
          size = 5
          break
        default:
          color = "rgba(150, 150, 150, 1)"
          size = 4
      }

      // Draw entity based on domain and vehicle type
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((entity.heading * Math.PI) / 180)

      // Draw different shapes based on domain and vehicle type
      if (entity.domain === "air") {
        if (entity.vehicleType === "multirotor") {
          // Multirotor drone
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(0, 0, size, 0, Math.PI * 2)
          ctx.fill()

          // Propellers
          ctx.beginPath()
          ctx.moveTo(-size * 1.5, -size * 1.5)
          ctx.lineTo(size * 1.5, size * 1.5)
          ctx.moveTo(size * 1.5, -size * 1.5)
          ctx.lineTo(-size * 1.5, size * 1.5)
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else if (entity.vehicleType === "fixed-wing") {
          // Fixed-wing aircraft
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(size * 1.5, 0)
          ctx.lineTo(0, -size)
          ctx.lineTo(-size * 1.5, 0)
          ctx.lineTo(0, size * 0.5)
          ctx.closePath()
          ctx.fill()

          // Wings
          ctx.beginPath()
          ctx.moveTo(-size, -size * 0.3)
          ctx.lineTo(size, -size * 0.3)
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      } else if (entity.domain === "ground") {
        if (entity.vehicleType === "ground") {
          // Ground vehicle
          ctx.fillStyle = color
          ctx.fillRect(-size, -size, size * 2, size * 2)
        } else if (entity.vehicleType === "armor") {
          // Armored vehicle
          ctx.fillStyle = color
          ctx.fillRect(-size, -size, size * 2, size * 2)

          // Turret
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2)
          ctx.fill()

          // Gun
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(size * 2, 0)
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (entity.vehicleType === "infantry") {
          // Infantry
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2)
          ctx.fill()

          // Body
          ctx.beginPath()
          ctx.moveTo(0, size * 0.7)
          ctx.lineTo(0, size * 2)
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()

          // Arms
          ctx.beginPath()
          ctx.moveTo(-size, size)
          ctx.lineTo(size, size)
          ctx.stroke()
        }
      } else if (entity.domain === "sea") {
        if (entity.vehicleType === "ship") {
          // Ship
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(size * 1.5, 0)
          ctx.lineTo(size, -size * 0.7)
          ctx.lineTo(-size, -size * 0.7)
          ctx.lineTo(-size * 1.5, 0)
          ctx.lineTo(-size, size * 0.7)
          ctx.lineTo(size, size * 0.7)
          ctx.closePath()
          ctx.fill()
        }
      } else if (entity.domain === "underwater") {
        if (entity.vehicleType === "underwater") {
          // Submarine/underwater vehicle
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.ellipse(0, 0, size * 1.5, size * 0.8, 0, 0, Math.PI * 2)
          ctx.fill()

          // Conning tower
          ctx.fillRect(-size * 0.3, -size * 1.3, size * 0.6, size * 0.5)
        }
      }

      ctx.restore()

      // Draw label with name
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(entity.name, x, y + size * 2.5)

      // Draw additional info for friendly units
      if (entity.type === "friendly") {
        let infoText = ""
        if (entity.domain === "air") {
          infoText = `${entity.speed}kts ${entity.altitude}m`
        } else if (entity.domain === "underwater") {
          infoText = `${entity.speed}kts ${entity.depth}m`
        } else {
          infoText = `${entity.speed}kts`
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "9px sans-serif"
        ctx.fillText(infoText, x, y + size * 4)
      }

      // Draw threat indicator for hostile units
      if (entity.type === "hostile" && entity.threatLevel) {
        ctx.fillStyle = "rgba(255, 50, 50, 0.8)"
        ctx.font = "bold 9px sans-serif"
        ctx.fillText(`TL${entity.threatLevel}`, x, y - size * 2)
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
          <div className="text-xs font-medium mb-1">Layers</div>
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.terrain ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, terrain: !showLayers.terrain })}
            >
              <Mountain className="h-3 w-3 mr-1" />
              <span>Terrain</span>
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
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.threats ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, threats: !showLayers.threats })}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>Threats</span>
            </Button>
            <Button
              variant={showLayers.friendly ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, friendly: !showLayers.friendly })}
            >
              <Shield className="h-3 w-3 mr-1" />
              <span>Friendly</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showLayers.hostile ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, hostile: !showLayers.hostile })}
            >
              <Target className="h-3 w-3 mr-1" />
              <span>Hostile</span>
            </Button>
            <Button
              variant={showLayers.neutral ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowLayers({ ...showLayers, neutral: !showLayers.neutral })}
            >
              <Eye className="h-3 w-3 mr-1" />
              <span>Neutral</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

