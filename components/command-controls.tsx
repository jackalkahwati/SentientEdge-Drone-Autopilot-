"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bot, DrillIcon as Drone, Mic, RotateCcw, Send, Shield, Target, Play, Pause, AlertTriangle } from "lucide-react"

export function CommandControls() {
  const [inputValue, setInputValue] = useState("")
  const [missionStatus, setMissionStatus] = useState<"active" | "paused" | "standby">("active")

  const [commandHistory, setCommandHistory] = useState<
    Array<{
      id: number
      command: string
      timestamp: string
      status: "success" | "pending" | "error"
    }>
  >([
    {
      id: 1,
      command: "Deploy reconnaissance drones",
      timestamp: "10:42:15",
      status: "success",
    },
    {
      id: 2,
      command: "Activate perimeter scan",
      timestamp: "10:45:32",
      status: "success",
    },
    {
      id: 3,
      command: "Analyze terrain data",
      timestamp: "10:48:07",
      status: "pending",
    },
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newCommand = {
      id: commandHistory.length + 1,
      command: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      status: "pending" as const,
    }

    setCommandHistory([...commandHistory, newCommand])
    setInputValue("")

    // Simulate command processing
    setTimeout(() => {
      setCommandHistory((prev) =>
        prev.map((cmd) =>
          cmd.id === newCommand.id ? { ...cmd, status: Math.random() > 0.2 ? "success" : ("error" as const) } : cmd,
        ),
      )
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant={missionStatus === "active" ? "default" : missionStatus === "paused" ? "secondary" : "outline"}
          >
            {missionStatus === "active" ? "Mission Active" : missionStatus === "paused" ? "Mission Paused" : "Standby"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={missionStatus === "active" ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setMissionStatus("active")}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={missionStatus === "paused" ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setMissionStatus("paused")}
          >
            <Pause className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMissionStatus("standby")}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quick Commands</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Target className="h-3.5 w-3.5 mr-1" />
            Track Target
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Drone className="h-3.5 w-3.5 mr-1" />
            Deploy Drone
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Shield className="h-3.5 w-3.5 mr-1" />
            Secure Area
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Alert Team
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="h-24 overflow-y-auto space-y-2 text-sm">
          {commandHistory.map((cmd) => (
            <div key={cmd.id} className="flex items-start gap-2">
              <div
                className={`mt-0.5 h-2 w-2 rounded-full ${
                  cmd.status === "success" ? "bg-green-500" : cmd.status === "error" ? "bg-red-500" : "bg-yellow-500"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{cmd.command}</span>
                  <span className="text-xs text-muted-foreground">{cmd.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter command..."
              className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" />
              <span>AI</span>
            </div>
          </div>
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

