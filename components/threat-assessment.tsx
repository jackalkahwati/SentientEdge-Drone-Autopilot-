"use client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, ArrowDown, ArrowUp, Clock, Shield } from "lucide-react"

interface ThreatData {
  id: string
  name: string
  level: number
  type: string
  location: string
  distance: number
  trend: "increasing" | "decreasing" | "stable"
  timeDetected: string
}

export function ThreatAssessment() {
  // Mock threat data
  const threats: ThreatData[] = [
    {
      id: "t-001",
      name: "Unknown UAV",
      level: 3,
      type: "Aerial",
      location: "Grid E-7",
      distance: 2.4,
      trend: "increasing",
      timeDetected: "10:42:15",
    },
    {
      id: "t-002",
      name: "Hostile Vehicle",
      level: 4,
      type: "Ground",
      location: "Grid F-5",
      distance: 1.8,
      trend: "stable",
      timeDetected: "10:38:22",
    },
    {
      id: "t-003",
      name: "Radar Signal",
      level: 2,
      type: "Electronic",
      location: "Grid D-9",
      distance: 5.6,
      trend: "decreasing",
      timeDetected: "10:15:47",
    },
    {
      id: "t-004",
      name: "Unknown Signature",
      level: 1,
      type: "Unidentified",
      location: "Grid G-3",
      distance: 8.2,
      trend: "stable",
      timeDetected: "09:58:33",
    },
  ]

  // Sort threats by level (highest first)
  const sortedThreats = [...threats].sort((a, b) => b.level - a.level)

  // Calculate overall threat level (average of top 3 threats, weighted)
  const calculateOverallThreat = () => {
    if (threats.length === 0) return 0

    const weightedSum = threats.reduce((sum, threat) => sum + threat.level, 0)
    return Math.min(Math.round((weightedSum / threats.length) * 10) / 10, 5)
  }

  const overallThreat = calculateOverallThreat()

  // Helper function to get threat level text
  const getThreatLevelText = (level: number) => {
    if (level >= 4) return "Critical"
    if (level >= 3) return "High"
    if (level >= 2) return "Moderate"
    if (level >= 1) return "Low"
    return "Minimal"
  }

  // Helper function to get threat level color
  const getThreatLevelColor = (level: number) => {
    if (level >= 4) return "text-red-500"
    if (level >= 3) return "text-orange-500"
    if (level >= 2) return "text-yellow-500"
    if (level >= 1) return "text-blue-500"
    return "text-green-500"
  }

  // Helper function to get threat level progress color
  const getThreatLevelProgressColor = (level: number) => {
    if (level >= 4) return "bg-red-500"
    if (level >= 3) return "bg-orange-500"
    if (level >= 2) return "bg-yellow-500"
    if (level >= 1) return "bg-blue-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${getThreatLevelColor(overallThreat)}`} />
            <span className="font-medium">Overall Threat Level</span>
          </div>
          <span className={`font-bold ${getThreatLevelColor(overallThreat)}`}>{getThreatLevelText(overallThreat)}</span>
        </div>
        <Progress
          value={overallThreat * 20}
          className="h-2"
          indicatorClassName={getThreatLevelProgressColor(overallThreat)}
        />
      </div>

      <div className="rounded-md border">
        <div className="p-2 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Threats</span>
            <Badge variant="outline">{threats.length}</Badge>
          </div>
        </div>

        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-2">
            {sortedThreats.map((threat) => (
              <div key={threat.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${getThreatLevelColor(threat.level)}`} />
                    <span className="font-medium">{threat.name}</span>
                  </div>
                  <Badge
                    variant={threat.level >= 3 ? "destructive" : "outline"}
                    className={threat.level < 3 ? getThreatLevelColor(threat.level) : undefined}
                  >
                    TL{threat.level}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{threat.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{threat.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Distance:</span>
                    <span>{threat.distance} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trend:</span>
                    <span className="flex items-center">
                      {threat.trend === "increasing" ? (
                        <>
                          <ArrowUp className="h-3 w-3 text-red-500 mr-1" />
                          <span className="text-red-500">Rising</span>
                        </>
                      ) : threat.trend === "decreasing" ? (
                        <>
                          <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-green-500">Falling</span>
                        </>
                      ) : (
                        <span>Stable</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Detected:</span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {threat.timeDetected}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {threats.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Shield className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium">No active threats</p>
                <p className="text-xs text-muted-foreground">Area is currently secure</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

