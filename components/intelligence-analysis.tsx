"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brain,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  Shield,
  Target,
  Zap,
} from "lucide-react"

export function IntelligenceAnalysis() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Threat Assessment</CardTitle>
              <CardDescription>AI-powered analysis of current intelligence</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Update</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <ThreatMetricCard
                title="Overall Threat Level"
                value={3.2}
                maxValue={5}
                trend="increasing"
                description="High level of concern"
                icon={AlertTriangle}
              />

              <ThreatMetricCard
                title="Intelligence Confidence"
                value={78}
                maxValue={100}
                trend="stable"
                description="Moderate confidence"
                icon={Shield}
              />

              <ThreatMetricCard
                title="Activity Level"
                value={65}
                maxValue={100}
                trend="decreasing"
                description="Reduced activity"
                icon={Zap}
              />

              <ThreatMetricCard
                title="Time Sensitivity"
                value={4.1}
                maxValue={5}
                trend="increasing"
                description="Immediate attention required"
                icon={Clock}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Key Findings</h3>
                <Badge variant="outline">AI Generated</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Increased Military Activity</p>
                    <p className="text-sm text-muted-foreground">
                      Multiple intelligence sources confirm unusual military vehicle movements near eastern border.
                      Pattern analysis suggests preparation for coordinated operation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Target className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">Communications Signature</p>
                    <p className="text-sm text-muted-foreground">
                      Encrypted communications detected on multiple frequencies. Cryptographic analysis indicates
                      military-grade encryption consistent with hostile force protocols.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Strategic Locations</p>
                    <p className="text-sm text-muted-foreground">
                      Satellite imagery shows new construction at three key locations. Analysis suggests communications
                      infrastructure and possible staging areas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recommended Actions</h3>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">AI Assisted</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Increase Surveillance</p>
                    <p className="text-sm text-muted-foreground">
                      Deploy additional reconnaissance drones to monitor eastern border activity. Focus on identified
                      staging areas and communication nodes.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Enhance Signal Intelligence</p>
                    <p className="text-sm text-muted-foreground">
                      Allocate additional resources to SIGINT operations. Target identified frequencies and attempt to
                      decrypt communications.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Prepare Defensive Posture</p>
                    <p className="text-sm text-muted-foreground">
                      Alert ground forces and prepare defensive positions. Implement contingency plans for potential
                      hostile action within 48-72 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pattern Analysis</CardTitle>
          <CardDescription>Temporal and spatial intelligence patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Temporal Patterns</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Morning Activity (0600-1200)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">High</span>
                    <ArrowUp className="h-3 w-3 text-red-500" />
                  </div>
                </div>
                <Progress value={85} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Afternoon Activity (1200-1800)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Moderate</span>
                    <ArrowUp className="h-3 w-3 text-yellow-500" />
                  </div>
                </div>
                <Progress value={60} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Evening Activity (1800-0000)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Low</span>
                    <ArrowDown className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <Progress value={30} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Night Activity (0000-0600)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Very High</span>
                    <ArrowUp className="h-3 w-3 text-red-500" />
                  </div>
                </div>
                <Progress value={95} className="h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Spatial Patterns</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Eastern Border</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Critical</span>
                    <ArrowUp className="h-3 w-3 text-red-500" />
                  </div>
                </div>
                <Progress value={95} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Northern Mountains</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Low</span>
                    <ArrowDown className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <Progress value={25} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Southern Coast</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Moderate</span>
                    <ArrowUp className="h-3 w-3 text-yellow-500" />
                  </div>
                </div>
                <Progress value={55} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Western Region</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Minimal</span>
                    <ArrowDown className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <Progress value={15} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intelligence Reports</CardTitle>
          <CardDescription>Generated analysis documents</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Daily Threat Assessment</p>
                    <p className="text-xs text-muted-foreground">Generated today at 06:00</p>
                  </div>
                </div>
                <Badge>New</Badge>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Eastern Border Activity Report</p>
                    <p className="text-xs text-muted-foreground">Generated today at 04:30</p>
                  </div>
                </div>
                <Badge>New</Badge>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Communications Analysis</p>
                    <p className="text-xs text-muted-foreground">Generated yesterday at 18:15</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8">
                  View
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Weekly Intelligence Summary</p>
                    <p className="text-xs text-muted-foreground">Generated 3 days ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8">
                  View
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Terrain Analysis Report</p>
                    <p className="text-xs text-muted-foreground">Generated 5 days ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8">
                  View
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface ThreatMetricCardProps {
  title: string
  value: number
  maxValue: number
  trend: "increasing" | "decreasing" | "stable"
  description: string
  icon: React.ElementType
}

function ThreatMetricCard({ title, value, maxValue, trend, description, icon: Icon }: ThreatMetricCardProps) {
  // Helper function to get trend icon and color
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case "increasing":
        return { icon: <ArrowUp className="h-3 w-3 text-red-500" />, color: "text-red-500" }
      case "decreasing":
        return { icon: <ArrowDown className="h-3 w-3 text-green-500" />, color: "text-green-500" }
      case "stable":
        return { icon: <ArrowRight className="h-3 w-3 text-yellow-500" />, color: "text-yellow-500" }
      default:
        return { icon: null, color: "" }
    }
  }

  const trendDisplay = getTrendDisplay(trend)

  // Helper function to get color based on value percentage
  const getValueColor = (value: number, maxValue: number) => {
    const percentage = (value / maxValue) * 100

    if (percentage >= 80) return "text-red-500"
    if (percentage >= 60) return "text-orange-500"
    if (percentage >= 40) return "text-yellow-500"
    if (percentage >= 20) return "text-blue-500"
    return "text-green-500"
  }

  const valueColor = getValueColor(value, maxValue)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${valueColor}`} />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <div className="flex items-center gap-1">{trendDisplay.icon}</div>
      </div>

      <div className={`text-2xl font-bold ${valueColor}`}>
        {value}
        <span className="text-sm font-normal text-muted-foreground">/{maxValue}</span>
      </div>

      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <span className={trendDisplay.color}>{trend.charAt(0).toUpperCase() + trend.slice(1)}</span>
        <span>•</span>
        <span>{description}</span>
      </p>
    </div>
  )
}

