import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { MissionsHeader } from "@/components/missions-header"
import {
  ArrowLeft,
  Calendar,
  Clock,
  DrillIcon as Drone,
  Map,
  MessageSquare,
  Users,
  AlertTriangle,
  Activity,
  History,
  FileText,
  Download,
} from "lucide-react"
import Link from "next/link"
import { MissionTimeline } from "@/components/mission-timeline"
import { MissionDetailMap } from "@/components/mission-detail-map"

interface PageProps {
  params: {
    id: string
  }
}

export default function MissionDetailPage({ params }: PageProps) {
  // In a real app, fetch mission data based on ID
  const mission = {
    id: params.id,
    name: "Operation Eagle Eye",
    description: "Surveillance mission over northern sector with advanced reconnaissance capabilities.",
    status: "active",
    location: "Northern Grid A-7",
    date: "2025-03-24",
    duration: "4h 32m",
    progress: 67,
    threatLevel: 2,
    droneCount: 48,
    teamSize: 6,
    primaryObjective: "Gather intelligence on target area",
    secondaryObjectives: ["Map terrain features", "Monitor communications", "Identify resources"],
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MissionsHeader />

      <div className="border-b">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-4">
            <Link href="/missions" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Missions</span>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{mission.name}</h1>
              <Badge variant="default" className="ml-2">
                ACTIVE
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Mission Overview</CardTitle>
                  <CardDescription>{mission.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Primary Objective</h3>
                        <p className="text-muted-foreground">{mission.primaryObjective}</p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Secondary Objectives</h3>
                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                          {mission.secondaryObjectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Location</p>
                          <div className="flex items-center gap-2">
                            <Map className="h-4 w-4 text-muted-foreground" />
                            <span>{mission.location}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Date</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(mission.date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Duration</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{mission.duration}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Team</p>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{mission.teamSize} operators</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">Mission Progress</h3>
                          <span className="text-sm font-medium">{mission.progress}%</span>
                        </div>
                        <Progress value={mission.progress} className="h-2" />
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">Drone Fleet</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Drone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{mission.droneCount} Drones Deployed</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-medium">32</div>
                            <div className="text-xs text-muted-foreground">Recon</div>
                          </div>
                          <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-medium">8</div>
                            <div className="text-xs text-muted-foreground">Tactical</div>
                          </div>
                          <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-medium">6</div>
                            <div className="text-xs text-muted-foreground">Comms</div>
                          </div>
                          <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-medium">2</div>
                            <div className="text-xs text-muted-foreground">Utility</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">Threat Assessment</h3>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Moderate (Level 2)</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Potential hostile elements in northeastern quadrant.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-[400px] overflow-hidden">
                <CardHeader className="pb-0">
                  <CardTitle>Mission Map</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-full">
                  <MissionDetailMap />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Mission Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full">Deploy Additional Drones</Button>
                    <Button variant="outline" className="w-full">
                      Adjust Mission Parameters
                    </Button>
                    <Button variant="outline" className="w-full">
                      Request Support
                    </Button>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button variant="destructive" className="w-full">
                        Abort Mission
                      </Button>
                      <Button variant="outline" className="w-full">
                        Pause Mission
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Mission Timeline</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <History className="h-4 w-4" />
                      <span>View All</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <MissionTimeline />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Team Chat</span>
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Live Feed</span>
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Reports</span>
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

