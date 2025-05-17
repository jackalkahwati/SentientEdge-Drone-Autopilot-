import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MissionsHeader } from "@/components/missions-header"
import { Brain, PlayCircle, Trophy, BarChart, Clock, Cpu, Layers, BookOpen, Command } from "lucide-react"

export default function TrainingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MissionsHeader />
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Training & Simulation</h1>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              New Simulation
            </Button>
          </div>

          <Tabs defaultValue="training" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="training">Training Programs</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="analytics">Learning Analytics</TabsTrigger>
              <TabsTrigger value="models">AI Models</TabsTrigger>
            </TabsList>

            <TabsContent value="training">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Basic Drone Operations</CardTitle>
                        <CardDescription>Fundamental flight control</CardDescription>
                      </div>
                      <Badge variant="outline">Beginner</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <Brain className="h-10 w-10 text-primary/80" />
                      <div>
                        <div className="text-sm text-muted-foreground">AI Model Progress</div>
                        <div className="font-medium">Advanced Proficiency</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Learning Progress</span>
                          <span className="font-medium">100%</span>
                        </div>
                        <Progress value={100} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Sessions</div>
                          <div className="font-medium">245</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Flight Hours</div>
                          <div className="font-medium">1,240</div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        View Training
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Swarm Coordination</CardTitle>
                        <CardDescription>Multi-drone operations</CardDescription>
                      </div>
                      <Badge variant="outline">Intermediate</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <Brain className="h-10 w-10 text-primary/80" />
                      <div>
                        <div className="text-sm text-muted-foreground">AI Model Progress</div>
                        <div className="font-medium">Intermediate Proficiency</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Learning Progress</span>
                          <span className="font-medium">68%</span>
                        </div>
                        <Progress value={68} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Sessions</div>
                          <div className="font-medium">124</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Flight Hours</div>
                          <div className="font-medium">782</div>
                        </div>
                      </div>
                      <Button className="w-full">Continue Training</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Tactical Response</CardTitle>
                        <CardDescription>Advanced combat scenarios</CardDescription>
                      </div>
                      <Badge variant="outline">Advanced</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <Brain className="h-10 w-10 text-primary/80" />
                      <div>
                        <div className="text-sm text-muted-foreground">AI Model Progress</div>
                        <div className="font-medium">Developing Proficiency</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Learning Progress</span>
                          <span className="font-medium">42%</span>
                        </div>
                        <Progress value={42} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Sessions</div>
                          <div className="font-medium">87</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Flight Hours</div>
                          <div className="font-medium">356</div>
                        </div>
                      </div>
                      <Button className="w-full">Continue Training</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Environmental Adaptation</CardTitle>
                        <CardDescription>Weather and terrain adaptation</CardDescription>
                      </div>
                      <Badge variant="outline">Intermediate</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <Brain className="h-10 w-10 text-primary/80" />
                      <div>
                        <div className="text-sm text-muted-foreground">AI Model Progress</div>
                        <div className="font-medium">Advanced Proficiency</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Learning Progress</span>
                          <span className="font-medium">89%</span>
                        </div>
                        <Progress value={89} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Sessions</div>
                          <div className="font-medium">156</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Flight Hours</div>
                          <div className="font-medium">912</div>
                        </div>
                      </div>
                      <Button className="w-full">Continue Training</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Reconnaissance Patterns</CardTitle>
                        <CardDescription>Advanced surveillance techniques</CardDescription>
                      </div>
                      <Badge variant="outline">Advanced</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3">
                      <Brain className="h-10 w-10 text-primary/80" />
                      <div>
                        <div className="text-sm text-muted-foreground">AI Model Progress</div>
                        <div className="font-medium">Intermediate Proficiency</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Learning Progress</span>
                          <span className="font-medium">56%</span>
                        </div>
                        <Progress value={56} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Sessions</div>
                          <div className="font-medium">103</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-muted-foreground">Flight Hours</div>
                          <div className="font-medium">564</div>
                        </div>
                      </div>
                      <Button className="w-full">Continue Training</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-muted-foreground">New Training Program</CardTitle>
                        <CardDescription>Create custom AI training</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center py-8">
                    <Button variant="outline" className="border-dashed">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Create New Training
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="scenarios">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Urban Environment</CardTitle>
                        <CardDescription>City navigation and operations</CardDescription>
                      </div>
                      <Badge>Featured</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 rounded-md bg-secondary/20 mb-4 flex items-center justify-center">
                      <Command className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Difficulty</div>
                        <div className="font-medium">High</div>
                      </div>
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">3h 20m</div>
                      </div>
                    </div>
                    <Button className="w-full">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Run Simulation
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Desert Operations</CardTitle>
                        <CardDescription>Harsh environment adaptation</CardDescription>
                      </div>
                      <Badge variant="secondary">New</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 rounded-md bg-secondary/20 mb-4 flex items-center justify-center">
                      <Command className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Difficulty</div>
                        <div className="font-medium">Medium</div>
                      </div>
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">2h 45m</div>
                      </div>
                    </div>
                    <Button className="w-full">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Run Simulation
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Mountain Rescue</CardTitle>
                        <CardDescription>High-altitude operations</CardDescription>
                      </div>
                      <Badge variant="outline">Popular</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 rounded-md bg-secondary/20 mb-4 flex items-center justify-center">
                      <Command className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Difficulty</div>
                        <div className="font-medium">Hard</div>
                      </div>
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">4h 10m</div>
                      </div>
                    </div>
                    <Button className="w-full">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Run Simulation
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-muted-foreground">Custom Scenario</CardTitle>
                        <CardDescription>Build custom simulation</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Command className="h-10 w-10 text-muted-foreground mb-4" />
                    <Button variant="outline" className="border-dashed">
                      Create New Scenario
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid gap-6 md:grid-cols-12">
                <Card className="md:col-span-8">
                  <CardHeader>
                    <CardTitle>Learning Progress</CardTitle>
                    <CardDescription>AI learning curves by training program</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="text-muted-foreground">
                      <BarChart className="h-16 w-16 mx-auto mb-2" />
                      <p>Learning analytics visualization would appear here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-4">
                  <CardHeader>
                    <CardTitle>Training Metrics</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Overall Progress</span>
                        </div>
                        <span className="font-bold">78%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">AI Efficiency</span>
                        </div>
                        <span className="font-bold">92%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Total Training Hours</span>
                        </div>
                        <span className="font-bold">3,846</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Computational Resources</span>
                        </div>
                        <span className="font-bold">15.2 PF</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">Completed Scenarios</span>
                        </div>
                        <span className="font-bold">124/150</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-6">
                  <CardHeader>
                    <CardTitle>Performance by Drone Type</CardTitle>
                    <CardDescription>AI efficiency by hardware configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] flex items-center justify-center">
                    <div className="text-muted-foreground">
                      <BarChart className="h-16 w-16 mx-auto mb-2" />
                      <p>Drone performance visualization would appear here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-6">
                  <CardHeader>
                    <CardTitle>Learning Recommendations</CardTitle>
                    <CardDescription>AI suggested training focus areas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Advanced Terrain Navigation</h4>
                          <p className="text-sm text-muted-foreground">
                            Performance in complex terrain navigation is 32% below target. Recommend additional training
                            scenarios.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Emergency Response Protocols</h4>
                          <p className="text-sm text-muted-foreground">
                            Reaction time during emergency scenarios needs improvement. 45% more training recommended.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Power Management Optimization</h4>
                          <p className="text-sm text-muted-foreground">
                            Energy efficiency could be improved by 18% with targeted training on power management.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="models">
              <div className="grid gap-6 md:grid-cols-12">
                <Card className="md:col-span-12">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>AI Model Management</CardTitle>
                        <CardDescription>Active and developing AI models for autonomous flight</CardDescription>
                      </div>
                      <Button>Train New Model</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
                        <div className="col-span-3">Model Name</div>
                        <div className="col-span-2">Version</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Performance</div>
                        <div className="col-span-2">Last Updated</div>
                        <div className="col-span-1">Actions</div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/50">
                        <div className="col-span-3 font-medium">AutonoFly Core System</div>
                        <div className="col-span-2">v4.2.1</div>
                        <div className="col-span-2">
                          <Badge variant="outline">Production</Badge>
                        </div>
                        <div className="col-span-2">98.7%</div>
                        <div className="col-span-2 text-muted-foreground">2 days ago</div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/50">
                        <div className="col-span-3 font-medium">Advanced Navigation Model</div>
                        <div className="col-span-2">v2.8.5</div>
                        <div className="col-span-2">
                          <Badge variant="outline">Production</Badge>
                        </div>
                        <div className="col-span-2">94.3%</div>
                        <div className="col-span-2 text-muted-foreground">5 days ago</div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/50">
                        <div className="col-span-3 font-medium">Tactical Assessment System</div>
                        <div className="col-span-2">v3.1.2</div>
                        <div className="col-span-2">
                          <Badge variant="secondary">Testing</Badge>
                        </div>
                        <div className="col-span-2">87.2%</div>
                        <div className="col-span-2 text-muted-foreground">1 day ago</div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-muted/50">
                        <div className="col-span-3 font-medium">Environmental Adaptation</div>
                        <div className="col-span-2">v1.9.3</div>
                        <div className="col-span-2">
                          <Badge variant="default">Training</Badge>
                        </div>
                        <div className="col-span-2">72.8%</div>
                        <div className="col-span-2 text-muted-foreground">Today</div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50">
                        <div className="col-span-3 font-medium">Swarm Intelligence v2</div>
                        <div className="col-span-2">v0.8.1</div>
                        <div className="col-span-2">
                          <Badge variant="destructive">Development</Badge>
                        </div>
                        <div className="col-span-2">64.5%</div>
                        <div className="col-span-2 text-muted-foreground">3 hours ago</div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
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

