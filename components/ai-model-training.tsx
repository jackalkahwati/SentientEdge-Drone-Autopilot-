"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Layers, Zap, Play, Pause, RotateCcw, Plus, Trash2, Eye, FileText, BarChart } from "lucide-react"

export function AIModelTraining() {
  const [activeTab, setActiveTab] = useState("new")
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("object-detection")
  const [dataset, setDataset] = useState("drone-imagery-v2")
  const [epochs, setEpochs] = useState(50)
  const [batchSize, setBatchSize] = useState(32)
  const [learningRate, setLearningRate] = useState(0.001)
  const [useTransferLearning, setUseTransferLearning] = useState(true)
  const [useDataAugmentation, setUseDataAugmentation] = useState(true)
  const [useDistributedTraining, setUseDistributedTraining] = useState(false)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="new">New Training</TabsTrigger>
        <TabsTrigger value="history">Training History</TabsTrigger>
        <TabsTrigger value="models">Available Models</TabsTrigger>
      </TabsList>

      <TabsContent value="new" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Enter model name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger id="model-type">
                  <SelectValue placeholder="Select model type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="object-detection">Object Detection</SelectItem>
                  <SelectItem value="path-planning">Path Planning</SelectItem>
                  <SelectItem value="swarm-coordination">Swarm Coordination</SelectItem>
                  <SelectItem value="threat-assessment">Threat Assessment</SelectItem>
                  <SelectItem value="terrain-analysis">Terrain Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataset">Training Dataset</Label>
              <Select value={dataset} onValueChange={setDataset}>
                <SelectTrigger id="dataset">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drone-imagery-v2">Drone Imagery v2</SelectItem>
                  <SelectItem value="urban-environment">Urban Environment</SelectItem>
                  <SelectItem value="tactical-scenarios">Tactical Scenarios</SelectItem>
                  <SelectItem value="swarm-behaviors">Swarm Behaviors</SelectItem>
                  <SelectItem value="threat-database">Threat Database</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="architecture">Model Architecture</Label>
              <Select defaultValue="yolov5">
                <SelectTrigger id="architecture">
                  <SelectValue placeholder="Select architecture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yolov5">YOLOv5</SelectItem>
                  <SelectItem value="efficientdet">EfficientDet</SelectItem>
                  <SelectItem value="retinanet">RetinaNet</SelectItem>
                  <SelectItem value="faster-rcnn">Faster R-CNN</SelectItem>
                  <SelectItem value="custom">Custom Architecture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="epochs">Training Epochs</Label>
                <span className="text-sm">{epochs}</span>
              </div>
              <Slider
                id="epochs"
                value={[epochs]}
                min={1}
                max={100}
                step={1}
                onValueChange={(value) => setEpochs(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-size">Batch Size</Label>
                <span className="text-sm">{batchSize}</span>
              </div>
              <Slider
                id="batch-size"
                value={[batchSize]}
                min={1}
                max={128}
                step={1}
                onValueChange={(value) => setBatchSize(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="learning-rate">Learning Rate</Label>
                <span className="text-sm">{learningRate}</span>
              </div>
              <Slider
                id="learning-rate"
                value={[learningRate * 1000]}
                min={0.1}
                max={10}
                step={0.1}
                onValueChange={(value) => setLearningRate(value[0] / 1000)}
              />
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="transfer-learning">Transfer Learning</Label>
                  <p className="text-xs text-muted-foreground">Use pre-trained weights</p>
                </div>
                <Switch id="transfer-learning" checked={useTransferLearning} onCheckedChange={setUseTransferLearning} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-augmentation">Data Augmentation</Label>
                  <p className="text-xs text-muted-foreground">Apply transformations to training data</p>
                </div>
                <Switch id="data-augmentation" checked={useDataAugmentation} onCheckedChange={setUseDataAugmentation} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="distributed-training">Distributed Training</Label>
                  <p className="text-xs text-muted-foreground">Use multiple GPUs for training</p>
                </div>
                <Switch
                  id="distributed-training"
                  checked={useDistributedTraining}
                  onCheckedChange={setUseDistributedTraining}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline">Reset</Button>
          <Button>Start Training</Button>
        </div>
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Object Detection v2</h3>
                  <p className="text-sm text-muted-foreground">YOLOv5 architecture with custom layers</p>
                </div>
                <Badge>In Progress</Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">Today, 10:42 AM</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Drone Imagery v2</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <p className="font-medium">32/50 epochs</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Training Progress</span>
                    <span>64%</span>
                  </div>
                  <Progress value={64} className="h-2" />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Stop</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Path Planning Model</h3>
                  <p className="text-sm text-muted-foreground">Reinforcement learning with custom rewards</p>
                </div>
                <Badge variant="outline">Completed</Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="font-medium">Yesterday, 3:15 PM</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Urban Environment</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">4h 32m</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Final Accuracy</span>
                    <span className="text-green-500">92.4%</span>
                  </div>
                  <Progress value={92.4} className="h-2" />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Report</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <BarChart className="h-3.5 w-3.5" />
                    <span>View Metrics</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Play className="h-3.5 w-3.5" />
                    <span>Deploy</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Swarm Coordination v1</h3>
                  <p className="text-sm text-muted-foreground">Multi-agent reinforcement learning</p>
                </div>
                <Badge variant="outline">Completed</Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="font-medium">3 days ago</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dataset</p>
                    <p className="font-medium">Swarm Behaviors</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">12h 15m</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Final Accuracy</span>
                    <span className="text-green-500">88.7%</span>
                  </div>
                  <Progress value={88.7} className="h-2" />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Report</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <BarChart className="h-3.5 w-3.5" />
                    <span>View Metrics</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Play className="h-3.5 w-3.5" />
                    <span>Deploy</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="models" className="space-y-4">
        <div className="flex items-center justify-between">
          <Input placeholder="Search models..." className="max-w-sm" />
          <Button size="sm" className="h-8 gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span>Import Model</span>
          </Button>
        </div>

        <ScrollArea className="h-[450px]">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Object Detection v1</h3>
                    <p className="text-sm text-muted-foreground">YOLOv5 architecture</p>
                  </div>
                </div>
                <Badge variant="secondary">Production</Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-medium">91.2%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">42.8 MB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">2 weeks ago</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inference Time</p>
                  <p className="font-medium">24ms</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Fine-tune</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Deploy</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Path Planning</h3>
                    <p className="text-sm text-muted-foreground">Reinforcement learning model</p>
                  </div>
                </div>
                <Badge variant="secondary">Production</Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-medium">92.4%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">78.3 MB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">Yesterday</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inference Time</p>
                  <p className="font-medium">18ms</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Fine-tune</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Deploy</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Threat Assessment</h3>
                    <p className="text-sm text-muted-foreground">Multi-modal classification</p>
                  </div>
                </div>
                <Badge variant="outline">Development</Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-medium">87.6%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">64.1 MB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">5 days ago</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inference Time</p>
                  <p className="font-medium">32ms</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Fine-tune</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Deploy</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}

