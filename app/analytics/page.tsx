import { BarChart, LineChart, PieChart } from "@/components/analytics-charts"
import { DataFilterBar } from "@/components/data-filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MissionsHeader } from "@/components/missions-header"

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MissionsHeader />
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          </div>

          <DataFilterBar />

          <div className="grid gap-4 mt-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Missions"
              value="248"
              trend="+12%"
              description="vs previous period"
              trendDirection="up"
            />
            <MetricCard
              title="Active Drones"
              value="1,024"
              trend="+8%"
              description="fleet utilization"
              trendDirection="up"
            />
            <MetricCard
              title="Success Rate"
              value="94.8%"
              trend="+2.3%"
              description="mission completion"
              trendDirection="up"
            />
            <MetricCard
              title="Avg. Mission Duration"
              value="6.4h"
              trend="-5%"
              description="efficiency improved"
              trendDirection="down"
            />
          </div>

          <Tabs defaultValue="performance" className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="performance">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Mission Performance Metrics</CardTitle>
                    <CardDescription>Success rates and efficiency over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <LineChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resource Utilization</CardTitle>
                    <CardDescription>Drone and system resource allocation</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PieChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Efficiency</CardTitle>
                    <CardDescription>Performance metrics by component</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BarChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Operation Types</CardTitle>
                    <CardDescription>Mission distribution by category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PieChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                    <CardDescription>Mission distribution by region</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BarChart />
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Operational Trends</CardTitle>
                    <CardDescription>Mission parameters over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <LineChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="resources">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle>Resource Allocation Timeline</CardTitle>
                    <CardDescription>Drone and system resource utilization over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <LineChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Drone Utilization</CardTitle>
                    <CardDescription>By drone type and capability</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PieChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Energy Consumption</CardTitle>
                    <CardDescription>Power usage by system component</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BarChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Schedule</CardTitle>
                    <CardDescription>Upcoming maintenance windows</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BarChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="threats">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Threat Level Timeline</CardTitle>
                    <CardDescription>Average threat assessment over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <LineChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Threat Distribution</CardTitle>
                    <CardDescription>By type and severity</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <PieChart />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Countermeasure Effectiveness</CardTitle>
                    <CardDescription>Success rate by threat type</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BarChart />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  trend: string
  description: string
  trendDirection: "up" | "down"
}

function MetricCard({ title, value, trend, description, trendDirection }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center mt-1">
          <span className={`mr-1 ${trendDirection === "up" ? "text-green-500" : "text-red-500"}`}>{trend}</span>
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

