"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  ArrowUpDown,
  DrillIcon as DroneIcon,
  Plane,
  Car,
  Anchor,
  Battery,
  Signal,
  Shield,
  Map,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DroneType = "multirotor" | "fixed-wing" | "ground" | "underwater"
type DroneStatus = "active" | "standby" | "maintenance" | "offline"

interface Drone {
  id: string
  name: string
  type: DroneType
  model: string
  status: DroneStatus
  battery: number
  signal: number
  location: string
  lastMission: string
  securityLevel: number
}

interface DroneFleetTableProps {
  status?: DroneStatus
}

export function DroneFleetTable({ status }: DroneFleetTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // Mock drone data
  const drones: Drone[] = [
    {
      id: "DR-001",
      name: "Falcon-1",
      type: "multirotor",
      model: "QuadX-450",
      status: "active",
      battery: 87,
      signal: 98,
      location: "Grid A-7",
      lastMission: "Recon Alpha",
      securityLevel: 3,
    },
    {
      id: "DR-002",
      name: "Eagle-2",
      type: "fixed-wing",
      model: "SkyGlider-V2",
      status: "active",
      battery: 92,
      signal: 95,
      location: "Grid B-3",
      lastMission: "Perimeter Scan",
      securityLevel: 2,
    },
    {
      id: "DR-003",
      name: "Rover-1",
      type: "ground",
      model: "TerrainMaster",
      status: "standby",
      battery: 100,
      signal: 100,
      location: "Base Station",
      lastMission: "Supply Route",
      securityLevel: 2,
    },
    {
      id: "DR-004",
      name: "Hawk-3",
      type: "multirotor",
      model: "HexaCopter-680",
      status: "maintenance",
      battery: 45,
      signal: 0,
      location: "Maintenance Bay",
      lastMission: "Urban Patrol",
      securityLevel: 3,
    },
    {
      id: "DR-005",
      name: "Manta-1",
      type: "underwater",
      model: "DeepSub-300",
      status: "active",
      battery: 78,
      signal: 82,
      location: "Coastal Zone C",
      lastMission: "Underwater Survey",
      securityLevel: 4,
    },
    {
      id: "DR-006",
      name: "Condor-1",
      type: "fixed-wing",
      model: "LongRange-X1",
      status: "active",
      battery: 65,
      signal: 90,
      location: "Grid F-9",
      lastMission: "Border Patrol",
      securityLevel: 3,
    },
    {
      id: "DR-007",
      name: "Scorpion-2",
      type: "ground",
      model: "AllTerrain-V3",
      status: "standby",
      battery: 100,
      signal: 100,
      location: "Forward Base",
      lastMission: "Perimeter Defense",
      securityLevel: 3,
    },
    {
      id: "DR-008",
      name: "Osprey-4",
      type: "multirotor",
      model: "OctoCopter-X8",
      status: "offline",
      battery: 0,
      signal: 0,
      location: "Unknown",
      lastMission: "Night Recon",
      securityLevel: 3,
    },
    {
      id: "DR-009",
      name: "Barracuda-1",
      type: "underwater",
      model: "StealthSub-500",
      status: "active",
      battery: 82,
      signal: 75,
      location: "Deep Water Zone",
      lastMission: "Covert Surveillance",
      securityLevel: 5,
    },
    {
      id: "DR-010",
      name: "Phoenix-1",
      type: "multirotor",
      model: "QuadX-450",
      status: "maintenance",
      battery: 60,
      signal: 0,
      location: "Maintenance Bay",
      lastMission: "Search and Rescue",
      securityLevel: 2,
    },
  ]

  // Filter drones by status if provided
  const filteredDrones = status ? drones.filter((drone) => drone.status === status) : drones

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  const toggleAllRows = () => {
    setSelectedRows((prev) => (prev.length === filteredDrones.length ? [] : filteredDrones.map((drone) => drone.id)))
  }

  // Helper function to get drone type icon
  const getDroneTypeIcon = (type: DroneType) => {
    switch (type) {
      case "multirotor":
        return <DroneIcon className="h-4 w-4" />
      case "fixed-wing":
        return <Plane className="h-4 w-4" />
      case "ground":
        return <Car className="h-4 w-4" />
      case "underwater":
        return <Anchor className="h-4 w-4" />
    }
  }

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: DroneStatus) => {
    switch (status) {
      case "active":
        return "default"
      case "standby":
        return "secondary"
      case "maintenance":
        return "warning"
      case "offline":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Helper function to get battery color
  const getBatteryColor = (level: number) => {
    if (level > 70) return "bg-green-500"
    if (level > 30) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Helper function to get signal color
  const getSignalColor = (level: number) => {
    if (level > 80) return "bg-green-500"
    if (level > 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Helper function to get security level text
  const getSecurityLevelText = (level: number) => {
    switch (level) {
      case 1:
        return "Low"
      case 2:
        return "Standard"
      case 3:
        return "Enhanced"
      case 4:
        return "High"
      case 5:
        return "Maximum"
      default:
        return "Unknown"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" disabled={selectedRows.length === 0}>
            Assign to Mission
          </Button>
          <Button variant="outline" size="sm" className="h-8" disabled={selectedRows.length === 0}>
            Schedule Maintenance
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedRows.length > 0 ? `${selectedRows.length} selected` : `${filteredDrones.length} drones`}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.length === filteredDrones.length && filteredDrones.length > 0}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                    <span>Drone</span>
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Mission</TableHead>
              <TableHead>Security</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No drones found
                </TableCell>
              </TableRow>
            ) : (
              filteredDrones.map((drone) => (
                <TableRow key={drone.id} className={selectedRows.includes(drone.id) ? "bg-muted/50" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(drone.id)}
                      onCheckedChange={() => toggleRow(drone.id)}
                      aria-label={`Select ${drone.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{drone.name}</div>
                    <div className="text-sm text-muted-foreground">{drone.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDroneTypeIcon(drone.type)}
                      <span>{drone.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(drone.status)}>
                      {drone.status.charAt(0).toUpperCase() + drone.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-muted-foreground" />
                      <div className="w-16">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Level</span>
                          <span>{drone.battery}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${getBatteryColor(drone.battery)}`}
                            style={{ width: `${drone.battery}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Signal className="h-4 w-4 text-muted-foreground" />
                      <div className="w-16">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Strength</span>
                          <span>{drone.signal}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${getSignalColor(drone.signal)}`}
                            style={{ width: `${drone.signal}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-muted-foreground" />
                      <span>{drone.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>{drone.lastMission}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{getSecurityLevelText(drone.securityLevel)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem>Assign to Mission</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Schedule Maintenance</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Decommission</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

