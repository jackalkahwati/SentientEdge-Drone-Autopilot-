"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DrillIcon as Drone,
  Plane,
  Car,
  Anchor,
  Shield,
  Target,
  Eye,
  HelpCircle,
  Search,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type EntityType = "friendly" | "hostile" | "neutral" | "unknown"
type DomainType = "air" | "ground" | "sea" | "underwater"
type VehicleType = "multirotor" | "fixed-wing" | "ground" | "underwater" | "ship" | "infantry" | "armor"

interface Entity {
  id: string
  name: string
  type: EntityType
  domain: DomainType
  vehicleType: VehicleType
  status: string
  battery?: number
  signal?: number
  threatLevel?: number
}

export function EntityList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])

  // Mock entities data
  const entities: Entity[] = [
    // Friendly entities
    {
      id: "f-001",
      name: "Falcon-1",
      type: "friendly",
      domain: "air",
      vehicleType: "multirotor",
      status: "Active",
      battery: 87,
      signal: 98,
    },
    {
      id: "f-002",
      name: "Eagle-2",
      type: "friendly",
      domain: "air",
      vehicleType: "fixed-wing",
      status: "Active",
      battery: 92,
      signal: 95,
    },
    {
      id: "f-003",
      name: "Rover-1",
      type: "friendly",
      domain: "ground",
      vehicleType: "ground",
      status: "Active",
      battery: 100,
      signal: 100,
    },
    {
      id: "f-004",
      name: "Manta-1",
      type: "friendly",
      domain: "underwater",
      vehicleType: "underwater",
      status: "Active",
      battery: 78,
      signal: 82,
    },

    // Hostile entities
    {
      id: "h-001",
      name: "Unknown UAV",
      type: "hostile",
      domain: "air",
      vehicleType: "multirotor",
      status: "Tracking",
      threatLevel: 3,
    },
    {
      id: "h-002",
      name: "Hostile Vehicle",
      type: "hostile",
      domain: "ground",
      vehicleType: "armor",
      status: "Tracking",
      threatLevel: 4,
    },

    // Neutral entities
    {
      id: "n-001",
      name: "Civilian Aircraft",
      type: "neutral",
      domain: "air",
      vehicleType: "fixed-wing",
      status: "Monitoring",
    },
    {
      id: "n-002",
      name: "Fishing Vessel",
      type: "neutral",
      domain: "sea",
      vehicleType: "ship",
      status: "Monitoring",
    },

    // Unknown entities
    {
      id: "u-001",
      name: "Unidentified Contact",
      type: "unknown",
      domain: "ground",
      vehicleType: "ground",
      status: "Investigating",
    },
  ]

  const toggleEntity = (id: string) => {
    setSelectedEntities((prev) => (prev.includes(id) ? prev.filter((entityId) => entityId !== id) : [...prev, id]))
  }

  const toggleAllEntities = (type: EntityType) => {
    const typeEntities = entities.filter((entity) => entity.type === type).map((entity) => entity.id)

    if (typeEntities.every((id) => selectedEntities.includes(id))) {
      // If all are selected, deselect all
      setSelectedEntities((prev) => prev.filter((id) => !typeEntities.includes(id)))
    } else {
      // Otherwise, select all
      const newSelected = [...selectedEntities]
      typeEntities.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      setSelectedEntities(newSelected)
    }
  }

  // Helper function to get entity icon
  const getEntityIcon = (entity: Entity) => {
    if (entity.domain === "air") {
      if (entity.vehicleType === "multirotor") {
        return <Drone className="h-4 w-4" />
      } else {
        return <Plane className="h-4 w-4" />
      }
    } else if (entity.domain === "ground") {
      return <Car className="h-4 w-4" />
    } else if (entity.domain === "sea" || entity.domain === "underwater") {
      return <Anchor className="h-4 w-4" />
    }

    return <HelpCircle className="h-4 w-4" />
  }

  // Helper function to get entity type icon
  const getEntityTypeIcon = (type: EntityType) => {
    switch (type) {
      case "friendly":
        return <Shield className="h-4 w-4" />
      case "hostile":
        return <Target className="h-4 w-4" />
      case "neutral":
        return <Eye className="h-4 w-4" />
      case "unknown":
        return <HelpCircle className="h-4 w-4" />
    }
  }

  // Helper function to get entity type badge variant
  const getEntityTypeBadgeVariant = (type: EntityType) => {
    switch (type) {
      case "friendly":
        return "default"
      case "hostile":
        return "destructive"
      case "neutral":
        return "secondary"
      case "unknown":
        return "outline"
    }
  }

  // Filter entities based on search query
  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search entities..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-4 h-8">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="friendly" className="text-xs">
            Friendly
          </TabsTrigger>
          <TabsTrigger value="hostile" className="text-xs">
            Hostile
          </TabsTrigger>
          <TabsTrigger value="neutral" className="text-xs">
            Neutral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-2">
          <ScrollArea className="h-[300px]">
            <EntityGroup
              title="Friendly"
              icon={<Shield className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "friendly")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("friendly")}
            />

            <EntityGroup
              title="Hostile"
              icon={<Target className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "hostile")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("hostile")}
            />

            <EntityGroup
              title="Neutral"
              icon={<Eye className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "neutral")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("neutral")}
            />

            <EntityGroup
              title="Unknown"
              icon={<HelpCircle className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "unknown")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("unknown")}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="friendly" className="mt-2">
          <ScrollArea className="h-[300px]">
            <EntityGroup
              title="Friendly"
              icon={<Shield className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "friendly")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("friendly")}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="hostile" className="mt-2">
          <ScrollArea className="h-[300px]">
            <EntityGroup
              title="Hostile"
              icon={<Target className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "hostile")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("hostile")}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="neutral" className="mt-2">
          <ScrollArea className="h-[300px]">
            <EntityGroup
              title="Neutral"
              icon={<Eye className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "neutral")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("neutral")}
            />

            <EntityGroup
              title="Unknown"
              icon={<HelpCircle className="h-4 w-4" />}
              entities={filteredEntities.filter((entity) => entity.type === "unknown")}
              selectedEntities={selectedEntities}
              toggleEntity={toggleEntity}
              toggleAllEntities={() => toggleAllEntities("unknown")}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{selectedEntities.length} selected</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8" disabled={selectedEntities.length === 0}>
            Track
          </Button>
          <Button variant="outline" size="sm" className="h-8" disabled={selectedEntities.length === 0}>
            Command
          </Button>
        </div>
      </div>
    </div>
  )
}

interface EntityGroupProps {
  title: string
  icon: React.ReactNode
  entities: Entity[]
  selectedEntities: string[]
  toggleEntity: (id: string) => void
  toggleAllEntities: () => void
}

function EntityGroup({ title, icon, entities, selectedEntities, toggleEntity, toggleAllEntities }: EntityGroupProps) {
  if (entities.length === 0) return null

  const allSelected = entities.every((entity) => selectedEntities.includes(entity.id))

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">({entities.length})</span>
        </div>
        <Checkbox checked={allSelected} onCheckedChange={toggleAllEntities} aria-label={`Select all ${title}`} />
      </div>

      <div className="space-y-1">
        {entities.map((entity) => (
          <EntityItem
            key={entity.id}
            entity={entity}
            isSelected={selectedEntities.includes(entity.id)}
            toggleEntity={toggleEntity}
          />
        ))}
      </div>
    </div>
  )
}

interface EntityItemProps {
  entity: Entity
  isSelected: boolean
  toggleEntity: (id: string) => void
}

function EntityItem({ entity, isSelected, toggleEntity }: EntityItemProps) {
  // Helper function to get entity icon
  const getEntityIcon = (entity: Entity) => {
    if (entity.domain === "air") {
      if (entity.vehicleType === "multirotor") {
        return <Drone className="h-4 w-4" />
      } else {
        return <Plane className="h-4 w-4" />
      }
    } else if (entity.domain === "ground") {
      return <Car className="h-4 w-4" />
    } else if (entity.domain === "sea" || entity.domain === "underwater") {
      return <Anchor className="h-4 w-4" />
    }

    return <HelpCircle className="h-4 w-4" />
  }

  // Helper function to get entity type badge variant
  const getEntityTypeBadgeVariant = (type: EntityType) => {
    switch (type) {
      case "friendly":
        return "default"
      case "hostile":
        return "destructive"
      case "neutral":
        return "secondary"
      case "unknown":
        return "outline"
    }
  }

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-md ${isSelected ? "bg-muted" : "hover:bg-muted/50"}`}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleEntity(entity.id)}
          aria-label={`Select ${entity.name}`}
        />
        <div className="flex items-center gap-2">
          {getEntityIcon(entity)}
          <div>
            <div className="text-sm font-medium">{entity.name}</div>
            <div className="flex items-center gap-1">
              <Badge variant={getEntityTypeBadgeVariant(entity.type)} className="text-[10px] h-4 px-1">
                {entity.status}
              </Badge>
              {entity.threatLevel && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                  TL{entity.threatLevel}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Track Entity</DropdownMenuItem>
          <DropdownMenuItem>Focus Camera</DropdownMenuItem>
          <DropdownMenuSeparator />
          {entity.type === "friendly" && (
            <>
              <DropdownMenuItem>Send Command</DropdownMenuItem>
              <DropdownMenuItem>Assign Mission</DropdownMenuItem>
            </>
          )}
          {entity.type === "hostile" && (
            <>
              <DropdownMenuItem>Mark as Priority</DropdownMenuItem>
              <DropdownMenuItem>Threat Analysis</DropdownMenuItem>
            </>
          )}
          {entity.type === "unknown" && <DropdownMenuItem>Identify</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

