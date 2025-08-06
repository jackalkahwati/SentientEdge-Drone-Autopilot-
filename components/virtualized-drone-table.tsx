"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { FixedSizeList as List } from 'react-window'
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
import { useDroneStatus } from "@/hooks/use-realtime-optimized"

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

interface VirtualizedDroneTableProps {
  drones: Drone[]
  status?: DroneStatus
  height?: number
}

// Memoized row component to prevent unnecessary re-renders
const DroneRow = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: {
    drones: Drone[];
    selectedRows: string[];
    toggleRow: (id: string) => void;
  }
}) => {
  const { drones, selectedRows, toggleRow } = data;
  const drone = drones[index];
  
  // Get real-time status updates
  const realtimeStatus = useDroneStatus(drone.id);
  
  // Merge real-time data with static data
  const currentDrone = useMemo(() => ({
    ...drone,
    ...realtimeStatus,
  }), [drone, realtimeStatus]);

  const handleToggle = useCallback(() => {
    toggleRow(drone.id);
  }, [drone.id, toggleRow]);

  return (
    <div style={style} className="flex items-center border-b">
      <div className="w-12 px-3 py-4">
        <Checkbox
          checked={selectedRows.includes(drone.id)}
          onCheckedChange={handleToggle}
          aria-label={`Select ${drone.name}`}
        />
      </div>
      
      <div className="flex-1 px-3 py-4">
        <div className="font-medium">{currentDrone.name}</div>
        <div className="text-sm text-muted-foreground">{drone.id}</div>
      </div>
      
      <div className="w-40 px-3 py-4">
        <div className="flex items-center gap-2">
          {getDroneTypeIcon(drone.type)}
          <span>{drone.model}</span>
        </div>
      </div>
      
      <div className="w-24 px-3 py-4">
        <Badge variant={getStatusBadgeVariant(currentDrone.status)}>
          {currentDrone.status?.charAt(0).toUpperCase() + currentDrone.status?.slice(1)}
        </Badge>
      </div>
      
      <div className="w-32 px-3 py-4">
        <BatteryIndicator level={currentDrone.battery || drone.battery} />
      </div>
      
      <div className="w-32 px-3 py-4">
        <SignalIndicator level={currentDrone.signal || drone.signal} />
      </div>
      
      <div className="w-40 px-3 py-4">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          <span>{drone.location}</span>
        </div>
      </div>
      
      <div className="w-40 px-3 py-4">{drone.lastMission}</div>
      
      <div className="w-32 px-3 py-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span>{getSecurityLevelText(drone.securityLevel)}</span>
        </div>
      </div>
      
      <div className="w-12 px-3 py-4">
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
      </div>
    </div>
  );
});

DroneRow.displayName = 'DroneRow';

// Memoized battery indicator component
const BatteryIndicator = memo(({ level }: { level: number }) => (
  <div className="flex items-center gap-2">
    <Battery className="h-4 w-4 text-muted-foreground" />
    <div className="w-16">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Level</span>
        <span>{level}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBatteryColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  </div>
));

BatteryIndicator.displayName = 'BatteryIndicator';

// Memoized signal indicator component
const SignalIndicator = memo(({ level }: { level: number }) => (
  <div className="flex items-center gap-2">
    <Signal className="h-4 w-4 text-muted-foreground" />
    <div className="w-16">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Strength</span>
        <span>{level}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getSignalColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  </div>
));

SignalIndicator.displayName = 'SignalIndicator';

// Table header component
const TableHeader = memo(() => (
  <div className="flex items-center border-b bg-muted/50 font-medium text-sm">
    <div className="w-12 px-3 py-2">
      <span className="sr-only">Select</span>
    </div>
    <div className="flex-1 px-3 py-2">
      <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
        <span>Drone</span>
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    </div>
    <div className="w-40 px-3 py-2">Type</div>
    <div className="w-24 px-3 py-2">Status</div>
    <div className="w-32 px-3 py-2">Battery</div>
    <div className="w-32 px-3 py-2">Signal</div>
    <div className="w-40 px-3 py-2">Location</div>
    <div className="w-40 px-3 py-2">Last Mission</div>
    <div className="w-32 px-3 py-2">Security</div>
    <div className="w-12 px-3 py-2"></div>
  </div>
));

TableHeader.displayName = 'TableHeader';

export function VirtualizedDroneTable({ 
  drones, 
  status, 
  height = 400 
}: VirtualizedDroneTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // Filter and memoize drones
  const filteredDrones = useMemo(() => 
    status ? drones.filter((drone) => drone.status === status) : drones,
    [drones, status]
  );

  const toggleRow = useCallback((id: string) => {
    setSelectedRows((prev) => 
      prev.includes(id) 
        ? prev.filter((rowId) => rowId !== id) 
        : [...prev, id]
    );
  }, []);

  const toggleAllRows = useCallback(() => {
    setSelectedRows((prev) => 
      prev.length === filteredDrones.length 
        ? [] 
        : filteredDrones.map((drone) => drone.id)
    );
  }, [filteredDrones]);

  // Memoize data passed to virtual list
  const itemData = useMemo(() => ({
    drones: filteredDrones,
    selectedRows,
    toggleRow,
  }), [filteredDrones, selectedRows, toggleRow]);

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
        <TableHeader />
        
        {filteredDrones.length === 0 ? (
          <div className="h-24 flex items-center justify-center">
            <span className="text-muted-foreground">No drones found</span>
          </div>
        ) : (
          <List
            height={height}
            itemCount={filteredDrones.length}
            itemSize={80} // Height of each row
            itemData={itemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
          >
            {DroneRow}
          </List>
        )}
      </div>
    </div>
  )
}

// Helper functions
function getDroneTypeIcon(type: DroneType) {
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

function getStatusBadgeVariant(status: DroneStatus) {
  switch (status) {
    case "active":
      return "default"
    case "standby":
      return "secondary"
    case "maintenance":
      return "warning" as any
    case "offline":
      return "destructive"
    default:
      return "outline"
  }
}

function getBatteryColor(level: number) {
  if (level > 70) return "bg-green-500"
  if (level > 30) return "bg-yellow-500"
  return "bg-red-500"
}

function getSignalColor(level: number) {
  if (level > 80) return "bg-green-500"
  if (level > 50) return "bg-yellow-500"
  return "bg-red-500"
}

function getSecurityLevelText(level: number) {
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