import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/mobile-nav"
import { AIModelTraining } from "@/components/ai-model-training"
import { AIModelEvaluation } from "@/components/ai-model-evaluation"
import { AIModelDeployment } from "@/components/ai-model-deployment"
import { Brain, Database, Download, Plus, RefreshCw, Zap } from "lucide-react"
import Link from "next/link"

export default function AILabPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">SentientEdge</span>
            </Link>
          </div>
          <MobileNav />
        </div>
      </header>

      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">AI Laboratory</h1>
            <Badge variant="outline" className="ml-2">
              Advanced Research
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Database className="h-3.5 w-3.5" />
              <span>Datasets</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>New Model</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">+2</span>
                since last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Training Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-yellow-500">In Progress</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">GPU Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">Optimal</span>
                performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Model Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="mr-1 text-green-500">+1.5%</span>
                from previous version
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="training" className="space-y-4">
          <TabsList>
            <TabsTrigger value="training">Model Training</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="deployment">Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-12">
              <Card className="md:col-span-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>AI Model Training</CardTitle>
                      <CardDescription>Train and fine-tune AI models for drone operations</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AIModelTraining />
                </CardContent>
              </Card>

              <div className="space-y-6 md:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Training Jobs</CardTitle>
                    <CardDescription>Currently running training processes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="font-medium">Object Detection v2</span>
                          </div>
                          <Badge>Running</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span>78%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-full w-[78%] rounded-full bg-primary" />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">ETA: 1h 24m</span>
                            <span className="text-muted-foreground">Epoch 32/50</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="font-medium">Path Planning</span>
                          </div>
                          <Badge>Running</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span>45%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-full w-[45%] rounded-full bg-primary" />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">ETA: 3h 10m</span>
                            <span className="text-muted-foreground">Epoch 18/40</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="font-medium">Swarm Coordination</span>
                          </div>
                          <Badge>Queued</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Position in Queue</span>
                            <span>1</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Estimated Start: 1h 24m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Resources</CardTitle>
                    <CardDescription>Hardware utilization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">GPU Utilization</span>
                          </div>
                          <span>78%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full w-[78%] rounded-full bg-blue-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">CPU Utilization</span>
                          </div>
                          <span>45%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full w-[45%] rounded-full bg-green-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Memory Usage</span>
                          </div>
                          <span>62%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full w-[62%] rounded-full bg-yellow-500" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Storage</span>
                          </div>
                          <span>34%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full w-[34%] rounded-full bg-green-500" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Evaluation</CardTitle>
                <CardDescription>Evaluate and compare AI model performance</CardDescription>
              </CardHeader>
              <CardContent>
                <AIModelEvaluation />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Deployment</CardTitle>
                <CardDescription>Deploy trained models to production environments</CardDescription>
              </CardHeader>
              <CardContent>
                <AIModelDeployment />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

