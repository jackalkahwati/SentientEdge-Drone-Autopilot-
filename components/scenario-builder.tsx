"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Target, AlertTriangle, Wind, Cloud, Zap, Building, Trees, RouteIcon as Road } from "lucide-react"

export function ScenarioBuilder() {
  const [scenarioName, setScenarioName] = useState("Urban Reconnaissance")
  const [scenarioDescription, setScenarioDescription] = useState(
    "Surveillance mission in an urban environment with multiple objectives and potential threats.",
  )
  const [objectives, setObjectives] = useState([
    { id: 1, name: "Primary Surveillance", type: "recon", location: "City Center", priority: "high" },
    { id: 2, name: "Secondary Data Collection", type: "data", location: "Industrial Zone", priority: "medium" },
  ])
  const [threats, setThreats] = useState([
    { id: 1, name: "Anti-Air Defense", type: "aa", location: "Northern District", level: 3 },
    { id: 2, name: "Electronic Jamming", type: "electronic", location: "Communications Tower", level: 2 },
  ])

  const addObjective = () => {
    const newId = objectives.length > 0 ? Math.max(...objectives.map((o) => o.id)) + 1 : 1
    setObjectives([
      ...objectives,
      { id: newId, name: "New Objective", type: "recon", location: "Location", priority: "medium" },
    ])
  }

  const removeObjective = (id: number) => {
    setObjectives(objectives.filter((objective) => objective.id !== id))
  }

  const addThreat = () => {
    const newId = threats.length > 0 ? Math.max(...threats.map((t) => t.id)) + 1 : 1
    setThreats([...threats, { id: newId, name: "New Threat", type: "ground", location: "Location", level: 1 }])
  }

  const removeThreat = (id: number) => {
    setThreats(threats.filter((threat) => threat.id !== id))
  }

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="environment">Environment</TabsTrigger>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="threats">Threats</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="scenario-name">Scenario Name</Label>
            <Input
              id="scenario-name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Enter scenario name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scenario-description">Description</Label>
            <Textarea
              id="scenario-description"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              placeholder="Describe the scenario"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select defaultValue="advanced">
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Select defaultValue="medium">
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (15-30 min)</SelectItem>
                  <SelectItem value="medium">Medium (30-60 min)</SelectItem>
                  <SelectItem value="long">Long (1-2 hours)</SelectItem>
                  <SelectItem value="extended">Extended (2+ hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="drone-count">Drone Count</Label>
              <Input id="drone-count" type="number" defaultValue="12" min="1" max="100" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scenario-type">Scenario Type</Label>
              <Select defaultValue="recon">
                <SelectTrigger id="scenario-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recon">Reconnaissance</SelectItem>
                  <SelectItem value="combat">Combat Operation</SelectItem>
                  <SelectItem value="rescue">Search & Rescue</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="training">Training Exercise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-assistance">AI Assistance</Label>
              <p className="text-xs text-muted-foreground">Enable AI-powered mission assistance</p>
            </div>
            <Switch id="ai-assistance" defaultChecked />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="environment" className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="environment-type">Environment Type</Label>
              <Select defaultValue="urban">
                <SelectTrigger id="environment-type">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urban">Urban Terrain</SelectItem>
                  <SelectItem value="rural">Rural Landscape</SelectItem>
                  <SelectItem value="desert">Desert Environment</SelectItem>
                  <SelectItem value="mountain">Mountainous Region</SelectItem>
                  <SelectItem value="coastal">Coastal Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Select defaultValue="dawn">
                <SelectTrigger id="time-of-day">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="dawn">Dawn</SelectItem>
                  <SelectItem value="dusk">Dusk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="weather-conditions">Weather Conditions</Label>
              <Select defaultValue="light-rain">
                <SelectTrigger id="weather-conditions">
                  <SelectValue placeholder="Select weather" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clear">Clear</SelectItem>
                  <SelectItem value="cloudy">Cloudy</SelectItem>
                  <SelectItem value="light-rain">Light Rain</SelectItem>
                  <SelectItem value="heavy-rain">Heavy Rain</SelectItem>
                  <SelectItem value="fog">Fog</SelectItem>
                  <SelectItem value="snow">Snow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select defaultValue="moderate">
                <SelectTrigger id="visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="very-poor">Very Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wind-speed">Wind Speed</Label>
              <span className="text-sm">12 km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <Slider id="wind-speed" defaultValue={[12]} max={50} step={1} className="flex-1" />
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="day-night-cycle">Day/Night Cycle</Label>
                <p className="text-xs text-muted-foreground">Time progression during simulation</p>
              </div>
              <Switch id="day-night-cycle" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dynamic-weather">Dynamic Weather</Label>
                <p className="text-xs text-muted-foreground">Weather changes during simulation</p>
              </div>
              <Switch id="dynamic-weather" defaultChecked />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Environment Features</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Switch id="buildings" defaultChecked />
                <Label htmlFor="buildings" className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>Buildings</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="vegetation" defaultChecked />
                <Label htmlFor="vegetation" className="flex items-center gap-1">
                  <Trees className="h-4 w-4" />
                  <span>Vegetation</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="roads" defaultChecked />
                <Label htmlFor="roads" className="flex items-center gap-1">
                  <Road className="h-4 w-4" />
                  <span>Roads</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="water" defaultChecked />
                <Label htmlFor="water" className="flex items-center gap-1">
                  <Cloud className="h-4 w-4" />
                  <span>Water Bodies</span>
                </Label>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="objectives" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Mission Objectives</h3>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addObjective}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Objective</span>
          </Button>
        </div>

        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-4">
            {objectives.map((objective) => (
              <div key={objective.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Objective {objective.id}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeObjective(objective.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`objective-name-${objective.id}`}>Name</Label>
                    <Input
                      id={`objective-name-${objective.id}`}
                      value={objective.name}
                      onChange={(e) => {
                        const updated = objectives.map((obj) =>
                          obj.id === objective.id ? { ...obj, name: e.target.value } : obj,
                        )
                        setObjectives(updated)
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`objective-type-${objective.id}`}>Type</Label>
                      <Select
                        value={objective.type}
                        onValueChange={(value) => {
                          const updated = objectives.map((obj) =>
                            obj.id === objective.id ? { ...obj, type: value } : obj,
                          )
                          setObjectives(updated)
                        }}
                      >
                        <SelectTrigger id={`objective-type-${objective.id}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recon">Reconnaissance</SelectItem>
                          <SelectItem value="data">Data Collection</SelectItem>
                          <SelectItem value="delivery">Payload Delivery</SelectItem>
                          <SelectItem value="extraction">Extraction</SelectItem>
                          <SelectItem value="surveillance">Surveillance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`objective-priority-${objective.id}`}>Priority</Label>
                      <Select
                        value={objective.priority}
                        onValueChange={(value) => {
                          const updated = objectives.map((obj) =>
                            obj.id === objective.id ? { ...obj, priority: value } : obj,
                          )
                          setObjectives(updated)
                        }}
                      >
                        <SelectTrigger id={`objective-priority-${objective.id}`}>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`objective-location-${objective.id}`}>Location</Label>
                    <Input
                      id={`objective-location-${objective.id}`}
                      value={objective.location}
                      onChange={(e) => {
                        const updated = objectives.map((obj) =>
                          obj.id === objective.id ? { ...obj, location: e.target.value } : obj,
                        )
                        setObjectives(updated)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {objectives.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No objectives defined</p>
                <p className="text-xs text-muted-foreground">Add objectives to your mission</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="threats" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Threat Elements</h3>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addThreat}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Threat</span>
          </Button>
        </div>

        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-4">
            {threats.map((threat) => (
              <div key={threat.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h4 className="font-medium">Threat {threat.id}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeThreat(threat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`threat-name-${threat.id}`}>Name</Label>
                    <Input
                      id={`threat-name-${threat.id}`}
                      value={threat.name}
                      onChange={(e) => {
                        const updated = threats.map((t) => (t.id === threat.id ? { ...t, name: e.target.value } : t))
                        setThreats(updated)
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`threat-type-${threat.id}`}>Type</Label>
                      <Select
                        value={threat.type}
                        onValueChange={(value) => {
                          const updated = threats.map((t) => (t.id === threat.id ? { ...t, type: value } : t))
                          setThreats(updated)
                        }}
                      >
                        <SelectTrigger id={`threat-type-${threat.id}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aa">Anti-Air</SelectItem>
                          <SelectItem value="ground">Ground Forces</SelectItem>
                          <SelectItem value="electronic">Electronic Warfare</SelectItem>
                          <SelectItem value="cyber">Cyber Attack</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`threat-level-${threat.id}`}>Threat Level</Label>
                      <Select
                        value={threat.level.toString()}
                        onValueChange={(value) => {
                          const updated = threats.map((t) =>
                            t.id === threat.id ? { ...t, level: Number.parseInt(value) } : t,
                          )
                          setThreats(updated)
                        }}
                      >
                        <SelectTrigger id={`threat-level-${threat.id}`}>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1 (Low)</SelectItem>
                          <SelectItem value="2">Level 2 (Moderate)</SelectItem>
                          <SelectItem value="3">Level 3 (High)</SelectItem>
                          <SelectItem value="4">Level 4 (Critical)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`threat-location-${threat.id}`}>Location</Label>
                    <Input
                      id={`threat-location-${threat.id}`}
                      value={threat.location}
                      onChange={(e) => {
                        const updated = threats.map((t) =>
                          t.id === threat.id ? { ...t, location: e.target.value } : t,
                        )
                        setThreats(updated)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {threats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No threats defined</p>
                <p className="text-xs text-muted-foreground">Add threats to your mission</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline">Cancel</Button>
        <Button>Save Scenario</Button>
      </div>
    </Tabs>
  )
}

