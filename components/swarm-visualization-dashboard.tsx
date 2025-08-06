"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  AlertTriangle,
  Battery,
  Radio,
  Users,
  Target,
  Zap,
  Shield,
  Navigation,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Square,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Info
} from 'lucide-react'

import {
  Swarm,
  Drone,
  SwarmIntelligenceMetrics,
  SwarmFormation,
  Vector3D,
  SwarmStatus,
  EmergencyThreat
} from '@/lib/types'

// ============================================================================
// REAL-TIME SWARM VISUALIZATION CANVAS
// ============================================================================

interface SwarmVisualizationCanvasProps {
  swarm: Swarm
  drones: Drone[]
  metrics: SwarmIntelligenceMetrics
  emergencyThreats: EmergencyThreat[]
  showTrails?: boolean
  showCommunicationLinks?: boolean
  showFormationGuides?: boolean
}

export function SwarmVisualizationCanvas({
  swarm,
  drones,
  metrics,
  emergencyThreats,
  showTrails = true,
  showCommunicationLinks = true,
  showFormationGuides = true
}: SwarmVisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const trailHistoryRef = useRef<Map<string, Vector3D[]>>(new Map())
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [isPaused, setIsPaused] = useState(false)

  // Calculate swarm bounds and center
  const swarmBounds = useMemo(() => {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id) && d.location)
    
    if (swarmDrones.length === 0) {
      return { minX: -100, maxX: 100, minY: -100, maxY: 100, centerX: 0, centerY: 0 }
    }

    const positions = swarmDrones.map(d => ({ x: d.location![0], y: d.location![1] }))
    const minX = Math.min(...positions.map(p => p.x))
    const maxX = Math.max(...positions.map(p => p.x))
    const minY = Math.min(...positions.map(p => p.y))
    const maxY = Math.max(...positions.map(p => p.y))
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }, [drones, swarm.drones])

  // Update trail history
  useEffect(() => {
    if (isPaused) return

    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id) && d.location)
    const trails = trailHistoryRef.current

    swarmDrones.forEach(drone => {
      if (!trails.has(drone.id)) {
        trails.set(drone.id, [])
      }
      
      const trail = trails.get(drone.id)!
      const currentPos = { x: drone.location![0], y: drone.location![1], z: drone.altitude || 100 }
      
      trail.push(currentPos)
      
      // Keep only last 50 positions
      if (trail.length > 50) {
        trail.shift()
      }
    })
  }, [drones, swarm.drones, isPaused])

  // Canvas drawing function
  const drawSwarm = (ctx: CanvasRenderingContext2D) => {
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Set up coordinate system
    ctx.save()
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2)
    ctx.scale(zoomLevel, zoomLevel)
    ctx.translate(-viewCenter.x, -viewCenter.y)

    // Draw grid
    drawGrid(ctx)

    // Draw formation guides
    if (showFormationGuides) {
      drawFormationGuides(ctx)
    }

    // Draw communication links
    if (showCommunicationLinks) {
      drawCommunicationLinks(ctx)
    }

    // Draw trails
    if (showTrails) {
      drawTrails(ctx)
    }

    // Draw emergency zones
    drawEmergencyZones(ctx)

    // Draw drones
    drawDrones(ctx)

    // Draw swarm center of mass
    drawCenterOfMass(ctx)

    ctx.restore()

    // Draw HUD overlay
    drawHUD(ctx)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    const gridSize = 50 / zoomLevel
    const startX = Math.floor((viewCenter.x - canvasSize.width / 2 / zoomLevel) / gridSize) * gridSize
    const endX = Math.ceil((viewCenter.x + canvasSize.width / 2 / zoomLevel) / gridSize) * gridSize
    const startY = Math.floor((viewCenter.y - canvasSize.height / 2 / zoomLevel) / gridSize) * gridSize
    const endY = Math.ceil((viewCenter.y + canvasSize.height / 2 / zoomLevel) / gridSize) * gridSize

    ctx.beginPath()
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }
    ctx.stroke()
  }

  const drawFormationGuides = (ctx: CanvasRenderingContext2D) => {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id) && d.location)
    if (swarmDrones.length === 0) return

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    // Draw formation shape based on swarm formation type
    switch (swarm.formation) {
      case 'circle':
        drawCircleFormation(ctx, swarmDrones)
        break
      case 'line':
        drawLineFormation(ctx, swarmDrones)
        break
      case 'vee':
        drawVeeFormation(ctx, swarmDrones)
        break
      case 'grid':
        drawGridFormation(ctx, swarmDrones)
        break
    }

    ctx.setLineDash([])
  }

  const drawCircleFormation = (ctx: CanvasRenderingContext2D, drones: Drone[]) => {
    if (drones.length < 2) return
    
    const radius = swarm.parameters.spacing * drones.length / (2 * Math.PI)
    
    ctx.beginPath()
    ctx.arc(swarmBounds.centerX, swarmBounds.centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  const drawLineFormation = (ctx: CanvasRenderingContext2D, drones: Drone[]) => {
    if (drones.length < 2) return
    
    const totalWidth = (drones.length - 1) * swarm.parameters.spacing
    const startX = swarmBounds.centerX - totalWidth / 2
    
    ctx.beginPath()
    ctx.moveTo(startX, swarmBounds.centerY)
    ctx.lineTo(startX + totalWidth, swarmBounds.centerY)
    ctx.stroke()
  }

  const drawVeeFormation = (ctx: CanvasRenderingContext2D, drones: Drone[]) => {
    if (drones.length < 3) return
    
    const apex = { x: swarmBounds.centerX, y: swarmBounds.centerY }
    const wingSpan = swarm.parameters.spacing * (drones.length - 1) / 2
    const depth = wingSpan * 0.8
    
    ctx.beginPath()
    ctx.moveTo(apex.x - wingSpan, apex.y - depth)
    ctx.lineTo(apex.x, apex.y)
    ctx.lineTo(apex.x + wingSpan, apex.y - depth)
    ctx.stroke()
  }

  const drawGridFormation = (ctx: CanvasRenderingContext2D, drones: Drone[]) => {
    const cols = Math.ceil(Math.sqrt(drones.length))
    const rows = Math.ceil(drones.length / cols)
    const spacing = swarm.parameters.spacing
    
    ctx.beginPath()
    // Draw grid lines
    for (let i = 0; i <= cols; i++) {
      const x = swarmBounds.centerX + (i - cols/2) * spacing
      ctx.moveTo(x, swarmBounds.centerY - rows/2 * spacing)
      ctx.lineTo(x, swarmBounds.centerY + rows/2 * spacing)
    }
    for (let i = 0; i <= rows; i++) {
      const y = swarmBounds.centerY + (i - rows/2) * spacing
      ctx.moveTo(swarmBounds.centerX - cols/2 * spacing, y)
      ctx.lineTo(swarmBounds.centerX + cols/2 * spacing, y)
    }
    ctx.stroke()
  }

  const drawCommunicationLinks = (ctx: CanvasRenderingContext2D) => {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id) && d.location)
    const commRange = swarm.parameters.communicationRange

    ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)'
    ctx.lineWidth = 1

    swarmDrones.forEach((drone, i) => {
      const dronePos = { x: drone.location![0], y: drone.location![1] }
      
      swarmDrones.slice(i + 1).forEach(otherDrone => {
        const otherPos = { x: otherDrone.location![0], y: otherDrone.location![1] }
        const distance = Math.sqrt(
          Math.pow(dronePos.x - otherPos.x, 2) + 
          Math.pow(dronePos.y - otherPos.y, 2)
        )
        
        if (distance <= commRange) {
          ctx.globalAlpha = Math.max(0.1, 1 - distance / commRange)
          ctx.beginPath()
          ctx.moveTo(dronePos.x, dronePos.y)
          ctx.lineTo(otherPos.x, otherPos.y)
          ctx.stroke()
        }
      })
    })
    
    ctx.globalAlpha = 1
  }

  const drawTrails = (ctx: CanvasRenderingContext2D) => {
    const trails = trailHistoryRef.current
    
    trails.forEach((trail, droneId) => {
      if (trail.length < 2) return
      
      const drone = drones.find(d => d.id === droneId)
      if (!drone) return
      
      const color = getDroneColor(drone)
      ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.3)')
      ctx.lineWidth = 2
      
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      
      for (let i = 1; i < trail.length; i++) {
        const alpha = i / trail.length * 0.5
        ctx.globalAlpha = alpha
        ctx.lineTo(trail[i].x, trail[i].y)
      }
      
      ctx.stroke()
      ctx.globalAlpha = 1
    })
  }

  const drawEmergencyZones = (ctx: CanvasRenderingContext2D) => {
    emergencyThreats.forEach(threat => {
      if (!threat.location) return
      
      const severityColors = {
        low: 'rgba(255, 255, 0, 0.2)',
        medium: 'rgba(255, 165, 0, 0.3)',
        high: 'rgba(255, 100, 0, 0.4)',
        critical: 'rgba(255, 0, 0, 0.5)'
      }
      
      ctx.fillStyle = severityColors[threat.severity]
      ctx.strokeStyle = severityColors[threat.severity].replace('0.', '0.8')
      ctx.lineWidth = 2
      
      const radius = threat.radius || 50
      
      ctx.beginPath()
      ctx.arc(threat.location.x, threat.location.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Draw threat icon
      ctx.fillStyle = '#ff0000'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('⚠', threat.location.x, threat.location.y + 7)
    })
  }

  const drawDrones = (ctx: CanvasRenderingContext2D) => {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id))
    
    swarmDrones.forEach(drone => {
      if (!drone.location) return
      
      const x = drone.location[0]
      const y = drone.location[1]
      const isLeader = drone.id === swarm.leadDrone
      const color = getDroneColor(drone)
      const size = isLeader ? 10 : 8
      
      // Draw drone body
      ctx.fillStyle = color
      ctx.strokeStyle = isLeader ? '#FFD700' : '#ffffff'
      ctx.lineWidth = isLeader ? 3 : 1
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Draw heading indicator
      if (drone.heading !== undefined) {
        const headingRad = (drone.heading * Math.PI) / 180
        const lineLength = size + 8
        
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(
          x + Math.cos(headingRad - Math.PI/2) * lineLength,
          y + Math.sin(headingRad - Math.PI/2) * lineLength
        )
        ctx.stroke()
      }
      
      // Draw status indicators
      drawDroneStatusIndicators(ctx, drone, x, y, size)
      
      // Draw drone ID
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(drone.name.slice(-3), x, y - size - 8)
    })
  }

  const drawDroneStatusIndicators = (
    ctx: CanvasRenderingContext2D, 
    drone: Drone, 
    x: number, 
    y: number, 
    size: number
  ) => {
    // Battery indicator
    const batteryColor = drone.battery > 50 ? '#00ff00' : 
                        drone.battery > 25 ? '#ffff00' : '#ff0000'
    
    ctx.fillStyle = batteryColor
    ctx.fillRect(x + size + 2, y - 3, 8, 2)
    ctx.fillRect(x + size + 10, y - 2, 2, 1)
    
    // Signal indicator
    const signalColor = drone.signal > 70 ? '#00ff00' :
                       drone.signal > 40 ? '#ffff00' : '#ff0000'
    
    ctx.fillStyle = signalColor
    for (let i = 0; i < 3; i++) {
      const height = (i + 1) * 2
      const alpha = drone.signal > (i + 1) * 33 ? 1 : 0.3
      ctx.globalAlpha = alpha
      ctx.fillRect(x + size + 2 + i * 3, y + 5 - height, 2, height)
    }
    ctx.globalAlpha = 1
  }

  const drawCenterOfMass = (ctx: CanvasRenderingContext2D) => {
    if (metrics.centerOfMass) {
      ctx.strokeStyle = '#ff00ff'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      
      const size = 15
      ctx.beginPath()
      ctx.moveTo(metrics.centerOfMass.x - size, metrics.centerOfMass.y)
      ctx.lineTo(metrics.centerOfMass.x + size, metrics.centerOfMass.y)
      ctx.moveTo(metrics.centerOfMass.x, metrics.centerOfMass.y - size)
      ctx.lineTo(metrics.centerOfMass.x, metrics.centerOfMass.y + size)
      ctx.stroke()
      
      ctx.setLineDash([])
    }
  }

  const drawHUD = (ctx: CanvasRenderingContext2D) => {
    // Draw zoom level
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 10, 150, 30)
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`Zoom: ${(zoomLevel * 100).toFixed(0)}%`, 20, 30)
    
    // Draw swarm status
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 50, 200, 50)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`Formation: ${swarm.formation}`, 20, 70)
    ctx.fillText(`Status: ${swarm.status}`, 20, 90)
    
    // Draw performance metrics
    if (metrics) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(canvasSize.width - 220, 10, 210, 100)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`Cohesion: ${(metrics.cohesion * 100).toFixed(1)}%`, canvasSize.width - 210, 30)
      ctx.fillText(`Efficiency: ${(metrics.efficiency * 100).toFixed(1)}%`, canvasSize.width - 210, 50)
      ctx.fillText(`Adaptability: ${(metrics.adaptability * 100).toFixed(1)}%`, canvasSize.width - 210, 70)
      ctx.fillText(`Resilience: ${(metrics.resilience * 100).toFixed(1)}%`, canvasSize.width - 210, 90)
    }
  }

  const getDroneColor = (drone: Drone): string => {
    const statusColors = {
      active: '#00ff00',
      idle: '#ffff00',
      maintenance: '#ff8800',
      offline: '#ff0000'
    }
    
    const typeColors = {
      surveillance: '#00aaff',
      recon: '#aa00ff',
      attack: '#ff0000',
      transport: '#00ff88',
      multi: '#ffffff'
    }
    
    if (drone.status !== 'active') {
      return statusColors[drone.status]
    }
    
    return typeColors[drone.type] || '#ffffff'
  }

  // Animation loop
  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      
      if (canvas && ctx) {
        drawSwarm(ctx)
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [swarm, drones, metrics, emergencyThreats, showTrails, showCommunicationLinks, showFormationGuides, canvasSize, viewCenter, zoomLevel, isPaused])

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width, height })
        canvas.width = width
        canvas.height = height
      }
    })

    resizeObserver.observe(canvas.parentElement!)
    
    return () => resizeObserver.disconnect()
  }, [])

  // Auto-center view on swarm
  useEffect(() => {
    setViewCenter({ x: swarmBounds.centerX, y: swarmBounds.centerY })
  }, [swarmBounds])

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1))
  const handleResetView = () => {
    setZoomLevel(1)
    setViewCenter({ x: swarmBounds.centerX, y: swarmBounds.centerY })
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Control overlay */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>+</Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>-</Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* View controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button
          variant={showTrails ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTrails(!showTrails)}
        >
          Trails
        </Button>
        <Button
          variant={showCommunicationLinks ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCommunicationLinks(!showCommunicationLinks)}
        >
          Links
        </Button>
        <Button
          variant={showFormationGuides ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFormationGuides(!showFormationGuides)}
        >
          Formation
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// SWARM MONITORING PANEL
// ============================================================================

interface SwarmMonitoringPanelProps {
  swarm: Swarm
  drones: Drone[]
  metrics: SwarmIntelligenceMetrics
  emergencyThreats: EmergencyThreat[]
  onEmergencyResponse?: (threatId: string, response: string) => void
}

export function SwarmMonitoringPanel({
  swarm,
  drones,
  metrics,
  emergencyThreats,
  onEmergencyResponse
}: SwarmMonitoringPanelProps) {
  const swarmDrones = drones.filter(d => swarm.drones.includes(d.id))
  const activeDrones = swarmDrones.filter(d => d.status === 'active')
  const criticalThreats = emergencyThreats.filter(t => t.severity === 'critical')
  const highThreats = emergencyThreats.filter(t => t.severity === 'high')

  const averageBattery = swarmDrones.length > 0 ? 
    swarmDrones.reduce((sum, d) => sum + d.battery, 0) / swarmDrones.length : 0

  const averageSignal = swarmDrones.length > 0 ?
    swarmDrones.reduce((sum, d) => sum + d.signal, 0) / swarmDrones.length : 0

  const getStatusColor = (status: SwarmStatus) => {
    const colors = {
      forming: 'bg-yellow-500',
      active: 'bg-green-500',
      standby: 'bg-blue-500',
      dispersing: 'bg-orange-500',
      emergency: 'bg-red-500',
      reformed: 'bg-purple-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  const getMetricColor = (value: number) => {
    if (value >= 0.8) return 'text-green-500'
    if (value >= 0.6) return 'text-yellow-500'
    if (value >= 0.4) return 'text-orange-500'
    return 'text-red-500'
  }

  const getThreatIcon = (type: string) => {
    const icons = {
      collision_imminent: '⚡',
      weather_severe: '🌪️',
      communication_failure: '📡',
      power_critical: '🔋',
      mechanical_failure: '⚙️',
      hostile_threat: '🎯',
      airspace_violation: '🚫',
      terrain_obstacle: '🏔️',
      swarm_fragmentation: '💥',
      leader_failure: '👑'
    }
    return icons[type as keyof typeof icons] || '⚠️'
  }

  return (
    <div className="space-y-6">
      {/* Swarm Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Swarm Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(swarm.status)}>
                  {swarm.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Status</p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold">{activeDrones.length}/{swarmDrones.length}</div>
              <p className="text-sm text-muted-foreground">Active Drones</p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold">{swarm.formation}</div>
              <p className="text-sm text-muted-foreground">Formation</p>
            </div>
            
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {swarm.leadDrone ? drones.find(d => d.id === swarm.leadDrone)?.name.slice(-3) || 'N/A' : 'None'}
              </div>
              <p className="text-sm text-muted-foreground">Leader</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cohesion</span>
                <span className={`text-sm font-bold ${getMetricColor(metrics.cohesion)}`}>
                  {(metrics.cohesion * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.cohesion * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Efficiency</span>
                <span className={`text-sm font-bold ${getMetricColor(metrics.efficiency)}`}>
                  {(metrics.efficiency * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.efficiency * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Adaptability</span>
                <span className={`text-sm font-bold ${getMetricColor(metrics.adaptability)}`}>
                  {(metrics.adaptability * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.adaptability * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Resilience</span>
                <span className={`text-sm font-bold ${getMetricColor(metrics.resilience)}`}>
                  {(metrics.resilience * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.resilience * 100} className="h-2" />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">Avg Battery</div>
                <div className={`text-lg font-bold ${averageBattery > 50 ? 'text-green-500' : averageBattery > 25 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {averageBattery.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">Avg Signal</div>
                <div className={`text-lg font-bold ${averageSignal > 70 ? 'text-green-500' : averageSignal > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {averageSignal.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">Formation Error</div>
                <div className="text-lg font-bold">
                  {metrics.formationError.toFixed(1)}m
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Threats */}
      {emergencyThreats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Emergency Threats
              <Badge variant="destructive">{emergencyThreats.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {emergencyThreats.map(threat => (
                  <Alert key={threat.id} variant={threat.severity === 'critical' ? 'destructive' : 'default'}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getThreatIcon(threat.type)}</span>
                        <div>
                          <AlertDescription className="font-medium">
                            {threat.type.replace(/_/g, ' ').toUpperCase()}
                          </AlertDescription>
                          <div className="text-xs text-muted-foreground mt-1">
                            Severity: {threat.severity} | Confidence: {(threat.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Affected: {threat.affectedDrones.length} drones
                          </div>
                          {threat.timeToImpact && (
                            <div className="text-xs text-red-500 font-medium">
                              Impact in: {threat.timeToImpact.toFixed(1)}s
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {onEmergencyResponse && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEmergencyResponse(threat.id, 'acknowledge')}
                          >
                            ACK
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onEmergencyResponse(threat.id, 'emergency_response')}
                          >
                            RESPOND
                          </Button>
                        </div>
                      )}
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Individual Drone Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Individual Drone Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {swarmDrones.map(drone => (
                <div
                  key={drone.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        drone.status === 'active' ? 'bg-green-500' :
                        drone.status === 'idle' ? 'bg-yellow-500' :
                        drone.status === 'maintenance' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="font-medium">{drone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {drone.type} | {drone.status}
                        {drone.id === swarm.leadDrone && (
                          <Badge variant="outline" className="ml-2">Leader</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Battery className="h-3 w-3" />
                      <span className={drone.battery > 50 ? 'text-green-500' : drone.battery > 25 ? 'text-yellow-500' : 'text-red-500'}>
                        {drone.battery}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      <span className={drone.signal > 70 ? 'text-green-500' : drone.signal > 40 ? 'text-yellow-500' : 'text-red-500'}>
                        {drone.signal}%
                      </span>
                    </div>
                    {drone.speed !== undefined && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{drone.speed.toFixed(1)} m/s</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN SWARM VISUALIZATION DASHBOARD
// ============================================================================

interface SwarmVisualizationDashboardProps {
  swarm: Swarm
  drones: Drone[]
  metrics: SwarmIntelligenceMetrics
  emergencyThreats: EmergencyThreat[]
  onEmergencyResponse?: (threatId: string, response: string) => void
}

export function SwarmVisualizationDashboard({
  swarm,
  drones,
  metrics,
  emergencyThreats,
  onEmergencyResponse
}: SwarmVisualizationDashboardProps) {
  return (
    <div className="w-full h-full">
      <Tabs defaultValue="visualization" className="w-full h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visualization">3D Visualization</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visualization" className="h-[calc(100%-60px)]">
          <SwarmVisualizationCanvas
            swarm={swarm}
            drones={drones}
            metrics={metrics}
            emergencyThreats={emergencyThreats}
          />
        </TabsContent>
        
        <TabsContent value="monitoring" className="h-[calc(100%-60px)] overflow-auto">
          <SwarmMonitoringPanel
            swarm={swarm}
            drones={drones}
            metrics={metrics}
            emergencyThreats={emergencyThreats}
            onEmergencyResponse={onEmergencyResponse}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SwarmVisualizationDashboard