"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LineChart, BarChart } from "@/components/analytics-charts"
import { Brain, Download, FileText, BarChartIcon, LineChartIcon } from "lucide-react"

export function AIModelEvaluation() {
  const [selectedModel, setSelectedModel] = useState("object-detection-v1")
  const [selectedDataset, setSelectedDataset] = useState("validation-set-1")

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-end justify-between">
        <div className="grid gap-4 md:grid-cols-2 flex-1">
          <div className="grid gap-2">
            <label htmlFor="model-select" className="text-sm font-medium">
              Select Model
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="object-detection-v1">Object Detection v1</SelectItem>
                <SelectItem value="object-detection-v2">Object Detection v2</SelectItem>
                <SelectItem value="path-planning">Path Planning</SelectItem>
                <SelectItem value="swarm-coordination">Swarm Coordination</SelectItem>
                <SelectItem value="threat-assessment">Threat Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="dataset-select" className="text-sm font-medium">
              Evaluation Dataset
            </label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger id="dataset-select">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="validation-set-1">Validation Set 1</SelectItem>
                <SelectItem value="validation-set-2">Validation Set 2</SelectItem>
                <SelectItem value="test-set">Test Set</SelectItem>
                <SelectItem value="real-world-data">Real-world Data</SelectItem>
                <SelectItem value="edge-cases">Edge Cases</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="gap-2">
          <Brain className="h-4 w-4" />
          <span>Run Evaluation</span>
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
          <TabsTrigger value="confusion">Confusion Matrix</TabsTrigger>
          <TabsTrigger value="reports">Evaluation Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Accuracy" value="91.2%" trend="+1.5%" trendDirection="up" />
            <MetricCard title="Precision" value="89.7%" trend="+2.3%" trendDirection="up" />
            <MetricCard title="Recall" value="92.4%" trend="+0.8%" trendDirection="up" />
            <MetricCard title="F1 Score" value="90.9%" trend="+1.7%" trendDirection="up" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Model accuracy across training epochs</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <LineChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class Performance</CardTitle>
                <CardDescription>Accuracy by object class</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
              <CardDescription>Comprehensive performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Metric</th>
                      <th className="text-left p-2">Value</th>
                      <th className="text-left p-2">Previous</th>
                      <th className="text-left p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Accuracy</td>
                      <td className="p-2 font-medium">91.2%</td>
                      <td className="p-2">89.7%</td>
                      <td className="p-2 text-green-500">+1.5%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Precision</td>
                      <td className="p-2 font-medium">89.7%</td>
                      <td className="p-2">87.4%</td>
                      <td className="p-2 text-green-500">+2.3%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Recall</td>
                      <td className="p-2 font-medium">92.4%</td>
                      <td className="p-2">91.6%</td>
                      <td className="p-2 text-green-500">+0.8%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">F1 Score</td>
                      <td className="p-2 font-medium">90.9%</td>
                      <td className="p-2">89.2%</td>
                      <td className="p-2 text-green-500">+1.7%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">AUC-ROC</td>
                      <td className="p-2 font-medium">0.945</td>
                      <td className="p-2">0.932</td>
                      <td className="p-2 text-green-500">+0.013</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Mean IoU</td>
                      <td className="p-2 font-medium">0.876</td>
                      <td className="p-2">0.854</td>
                      <td className="p-2 text-green-500">+0.022</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Inference Time</td>
                      <td className="p-2 font-medium">24ms</td>
                      <td className="p-2">28ms</td>
                      <td className="p-2 text-green-500">-4ms</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Model Size</td>
                      <td className="p-2 font-medium">42.8MB</td>
                      <td className="p-2">45.2MB</td>
                      <td className="p-2 text-green-500">-2.4MB</td>
                    </tr>
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>Performance comparison across model versions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-[300px]">
                    <LineChart />
                  </div>
                  <div className="h-[300px]">
                    <BarChart />
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Accuracy</th>
                        <th className="text-left p-2">Precision</th>
                        <th className="text-left p-2">Recall</th>
                        <th className="text-left p-2">F1 Score</th>
                        <th className="text-left p-2">Inference Time</th>
                        <th className="text-left p-2">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Object Detection v2</td>
                        <td className="p-2">91.2%</td>
                        <td className="p-2">89.7%</td>
                        <td className="p-2">92.4%</td>
                        <td className="p-2">90.9%</td>
                        <td className="p-2">24ms</td>
                        <td className="p-2">42.8MB</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Object Detection v1</td>
                        <td className="p-2">89.7%</td>
                        <td className="p-2">87.4%</td>
                        <td className="p-2">91.6%</td>
                        <td className="p-2">89.2%</td>
                        <td className="p-2">28ms</td>
                        <td className="p-2">45.2MB</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">YOLOv5 Baseline</td>
                        <td className="p-2">86.5%</td>
                        <td className="p-2">84.2%</td>
                        <td className="p-2">88.3%</td>
                        <td className="p-2">86.1%</td>
                        <td className="p-2">32ms</td>
                        <td className="p-2">48.6MB</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">EfficientDet</td>
                        <td className="p-2">88.2%</td>
                        <td className="p-2">86.9%</td>
                        <td className="p-2">89.1%</td>
                        <td className="p-2">87.9%</td>
                        <td className="p-2">36ms</td>
                        <td className="p-2">38.4MB</td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confusion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confusion Matrix</CardTitle>
              <CardDescription>Prediction accuracy by class</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <BarChartIcon className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Confusion matrix visualization would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Evaluation Reports</h3>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Download className="h-3.5 w-3.5" />
              <span>Export All</span>
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Object Detection v2 Evaluation</h3>
                      <p className="text-sm text-muted-foreground">Comprehensive performance analysis</p>
                    </div>
                  </div>
                  <Badge>New</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Generated</p>
                    <p className="font-medium">Today, 10:42 AM</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Validation Set 1</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">2.4 MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Report</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <BarChartIcon className="h-3.5 w-3.5" />
                    <span>View Charts</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Path Planning Model Evaluation</h3>
                      <p className="text-sm text-muted-foreground">Performance in urban environments</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Generated</p>
                    <p className="font-medium">Yesterday, 3:15 PM</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Test Set</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">1.8 MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Report</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <LineChartIcon className="h-3.5 w-3.5" />
                    <span>View Charts</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Swarm Coordination Evaluation</h3>
                      <p className="text-sm text-muted-foreground">Multi-agent coordination performance</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Generated</p>
                    <p className="font-medium">3 days ago</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Real-world Data</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">3.2 MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Report</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <BarChartIcon className="h-3.5 w-3.5" />
                    <span>View Charts</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  trend: string
  trendDirection: "up" | "down" | "neutral"
}

function MetricCard({ title, value, trend, trendDirection }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center mt-1">
          <span
            className={`mr-1 ${trendDirection === "up" ? "text-green-500" : trendDirection === "down" ? "text-red-500" : "text-yellow-500"}`}
          >
            {trend}
          </span>
          vs previous version
        </p>
      </CardContent>
    </Card>
  )
}

