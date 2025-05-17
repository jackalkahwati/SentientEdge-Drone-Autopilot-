"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Radio,
  Search,
  Shield,
  Video,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type IntelType = "signal" | "imagery" | "human" | "open-source" | "geospatial"
type ClassificationLevel = "top-secret" | "secret" | "confidential" | "restricted" | "unclassified"

interface IntelItem {
  id: string
  title: string
  description: string
  source: string
  type: IntelType
  classification: ClassificationLevel
  timestamp: string
  location?: string
  hasAttachment: boolean
  attachmentType?: "image" | "video" | "document" | "audio"
  threatLevel?: number
  isNew: boolean
}

export function IntelligenceFeed() {
  const [searchQuery, setSearchQuery] = useState("")

  // Mock intelligence data
  const intelItems: IntelItem[] = [
    {
      id: "intel-001",
      title: "Suspicious Vehicle Movement",
      description:
        "Multiple armored vehicles observed moving towards eastern border. Estimated 5-7 vehicles with unknown markings.",
      source: "Aerial Reconnaissance",
      type: "imagery",
      classification: "secret",
      timestamp: "10:42:15",
      location: "Grid F-7",
      hasAttachment: true,
      attachmentType: "image",
      threatLevel: 3,
      isNew: true,
    },
    {
      id: "intel-002",
      title: "Communications Intercept",
      description:
        "Encrypted radio transmissions detected on frequency 127.85 MHz. Pattern suggests coordinated operation.",
      source: "SIGINT Station Alpha",
      type: "signal",
      classification: "top-secret",
      timestamp: "10:38:22",
      hasAttachment: true,
      attachmentType: "audio",
      threatLevel: 4,
      isNew: true,
    },
    {
      id: "intel-003",
      title: "Local Informant Report",
      description:
        "Civilian informant reports unusual activity at abandoned warehouse. Multiple vehicles arriving during night hours.",
      source: "HUMINT Team",
      type: "human",
      classification: "confidential",
      timestamp: "09:15:47",
      location: "Grid D-9",
      hasAttachment: false,
      threatLevel: 2,
      isNew: false,
    },
    {
      id: "intel-004",
      title: "Satellite Imagery Analysis",
      description: "New construction identified at previously monitored facility. Appears to be communications array.",
      source: "Satellite IMINT",
      type: "imagery",
      classification: "secret",
      timestamp: "08:58:33",
      location: "Grid G-3",
      hasAttachment: true,
      attachmentType: "image",
      threatLevel: 2,
      isNew: false,
    },
    {
      id: "intel-005",
      title: "Social Media Activity Spike",
      description:
        "Unusual increase in social media discussions about military movements in region. Multiple accounts sharing similar content.",
      source: "OSINT Team",
      type: "open-source",
      classification: "restricted",
      timestamp: "08:22:15",
      hasAttachment: true,
      attachmentType: "document",
      threatLevel: 1,
      isNew: false,
    },
    {
      id: "intel-006",
      title: "Terrain Analysis Report",
      description:
        "Updated terrain analysis of northern mountain passes. New routes identified suitable for vehicle movement.",
      source: "Geospatial Intelligence",
      type: "geospatial",
      classification: "confidential",
      timestamp: "Yesterday, 18:45:12",
      location: "Northern Region",
      hasAttachment: true,
      attachmentType: "document",
      isNew: false,
    },
    {
      id: "intel-007",
      title: "Drone Footage of Border Area",
      description:
        "Surveillance drone captured footage of border crossing point. Shows increased security measures and checkpoints.",
      source: "UAV Reconnaissance",
      type: "imagery",
      classification: "secret",
      timestamp: "Yesterday, 16:30:08",
      location: "Eastern Border",
      hasAttachment: true,
      attachmentType: "video",
      threatLevel: 2,
      isNew: false,
    },
  ]

  // Filter intel items based on search query
  const filteredItems = intelItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Helper function to get intel type icon
  const getIntelTypeIcon = (type: IntelType) => {
    switch (type) {
      case "signal":
        return <Radio className="h-4 w-4" />
      case "imagery":
        return <ImageIcon className="h-4 w-4" />
      case "human":
        return <MessageSquare className="h-4 w-4" />
      case "open-source":
        return <Eye className="h-4 w-4" />
      case "geospatial":
        return <MapPin className="h-4 w-4" />
    }
  }

  // Helper function to get classification badge variant
  const getClassificationBadgeVariant = (classification: ClassificationLevel) => {
    switch (classification) {
      case "top-secret":
        return "destructive"
      case "secret":
        return "default"
      case "confidential":
        return "secondary"
      case "restricted":
        return "outline"
      case "unclassified":
        return "outline"
    }
  }

  // Helper function to get attachment type icon
  const getAttachmentTypeIcon = (type?: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <Radio className="h-4 w-4" />
      default:
        return null
    }
  }

  // Helper function to get threat level color
  const getThreatLevelColor = (level?: number) => {
    if (!level) return ""

    if (level >= 4) return "text-red-500"
    if (level >= 3) return "text-orange-500"
    if (level >= 2) return "text-yellow-500"
    if (level >= 1) return "text-blue-500"
    return "text-green-500"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search intelligence..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Intel</TabsTrigger>
          <TabsTrigger value="new">
            New
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {intelItems.filter((item) => item.isNew).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="imagery">Imagery</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <IntelCard key={item.id} item={item} />
              ))}

              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No intelligence found</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredItems
                .filter((item) => item.isNew)
                .map((item) => (
                  <IntelCard key={item.id} item={item} />
                ))}

              {filteredItems.filter((item) => item.isNew).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No new intelligence</p>
                  <p className="text-xs text-muted-foreground">All intelligence has been reviewed</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="threats" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredItems
                .filter((item) => item.threatLevel && item.threatLevel > 0)
                .map((item) => (
                  <IntelCard key={item.id} item={item} />
                ))}

              {filteredItems.filter((item) => item.threatLevel && item.threatLevel > 0).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium">No threats detected</p>
                  <p className="text-xs text-muted-foreground">Area is currently secure</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="imagery" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredItems
                .filter((item) => item.type === "imagery")
                .map((item) => (
                  <IntelCard key={item.id} item={item} />
                ))}

              {filteredItems.filter((item) => item.type === "imagery").length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No imagery intelligence</p>
                  <p className="text-xs text-muted-foreground">No imagery data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface IntelCardProps {
  item: IntelItem
}

function IntelCard({ item }: IntelCardProps) {
  // Helper function to get intel type icon
  const getIntelTypeIcon = (type: IntelType) => {
    switch (type) {
      case "signal":
        return <Radio className="h-4 w-4" />
      case "imagery":
        return <ImageIcon className="h-4 w-4" />
      case "human":
        return <MessageSquare className="h-4 w-4" />
      case "open-source":
        return <Eye className="h-4 w-4" />
      case "geospatial":
        return <MapPin className="h-4 w-4" />
    }
  }

  // Helper function to get classification badge variant
  const getClassificationBadgeVariant = (classification: ClassificationLevel) => {
    switch (classification) {
      case "top-secret":
        return "destructive"
      case "secret":
        return "default"
      case "confidential":
        return "secondary"
      case "restricted":
        return "outline"
      case "unclassified":
        return "outline"
    }
  }

  // Helper function to get attachment type icon
  const getAttachmentTypeIcon = (type?: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <Radio className="h-4 w-4" />
      default:
        return null
    }
  }

  // Helper function to get threat level color
  const getThreatLevelColor = (level?: number) => {
    if (!level) return ""

    if (level >= 4) return "text-red-500"
    if (level >= 3) return "text-orange-500"
    if (level >= 2) return "text-yellow-500"
    if (level >= 1) return "text-blue-500"
    return "text-green-500"
  }

  return (
    <Card className={item.isNew ? "border-primary/50" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{item.title}</CardTitle>
              {item.isNew && (
                <Badge variant="secondary" className="h-5 px-1 text-xs">
                  New
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                {getIntelTypeIcon(item.type)}
                <span>{item.source}</span>
              </span>
              {item.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{item.location}</span>
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getClassificationBadgeVariant(item.classification)}>
              {item.classification.replace("-", " ").toUpperCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Mark as Reviewed</DropdownMenuItem>
                <DropdownMenuItem>Share Intel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Add to Report</DropdownMenuItem>
                <DropdownMenuItem>Export Data</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm">{item.description}</p>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{item.timestamp}</span>
            </div>
            <div className="flex items-center gap-3">
              {item.threatLevel && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className={`h-4 w-4 ${getThreatLevelColor(item.threatLevel)}`} />
                  <span className={`font-medium ${getThreatLevelColor(item.threatLevel)}`}>TL{item.threatLevel}</span>
                </div>
              )}

              {item.hasAttachment && (
                <div className="flex items-center gap-1">
                  {getAttachmentTypeIcon(item.attachmentType)}
                  <span className="text-muted-foreground">
                    {item.attachmentType?.charAt(0).toUpperCase() + item.attachmentType?.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

