"use client"

import type React from "react"

import { useState } from "react"
import { Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function CommandPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [commandInput, setCommandInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [outputHistory, setOutputHistory] = useState<{ type: string; content: string }[]>([
    { type: "system", content: "SentientEdge Command Interface v1.0" },
    { type: "system", content: "Type 'help' for available commands" },
  ])

  const togglePanel = () => {
    setIsOpen(!isOpen)
  }

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!commandInput.trim()) return

    // Add command to history
    setCommandHistory((prev) => [...prev, commandInput])

    // Process command
    processCommand(commandInput)

    // Clear input
    setCommandInput("")
  }

  const processCommand = (command: string) => {
    // Add command to output history
    setOutputHistory((prev) => [...prev, { type: "command", content: `> ${command}` }])

    // Process different commands
    const lowerCommand = command.toLowerCase().trim()

    if (lowerCommand === "help") {
      setOutputHistory((prev) => [
        ...prev,
        {
          type: "response",
          content:
            "Available commands:\n- help: Show this help message\n- status: Show system status\n- clear: Clear console\n- deploy [number]: Deploy specified number of drones\n- scan: Scan surrounding area\n- encrypt [string]: Encrypt a message",
        },
      ])
    } else if (lowerCommand === "status") {
      setOutputHistory((prev) => [
        ...prev,
        {
          type: "response",
          content:
            "System Status: OPERATIONAL\nSecurity Level: ALPHA\nConnected Drones: 12\nBattery Status: 87%\nSignal Strength: EXCELLENT",
        },
      ])
    } else if (lowerCommand === "clear") {
      setOutputHistory([
        { type: "system", content: "SentientEdge Command Interface v1.0" },
        { type: "system", content: "Type 'help' for available commands" },
      ])
    } else if (lowerCommand.startsWith("deploy ")) {
      const number = Number.parseInt(lowerCommand.split(" ")[1])
      if (isNaN(number)) {
        setOutputHistory((prev) => [...prev, { type: "error", content: "Error: Invalid number format" }])
      } else {
        setOutputHistory((prev) => [
          ...prev,
          {
            type: "response",
            content: `Deploying ${number} drones...\nInitiating launch sequence...\nDrones deployed successfully.`,
          },
        ])
      }
    } else if (lowerCommand === "scan") {
      setOutputHistory((prev) => [
        ...prev,
        {
          type: "response",
          content:
            "Scanning...\nDetected:\n- 3 friendly units\n- 1 unknown contact\n- No hostile entities\nScan complete.",
        },
      ])
    } else if (lowerCommand.startsWith("encrypt ")) {
      const string = command.substring(8)
      const encrypted = Array.from(string)
        .map((char) => char.charCodeAt(0).toString(16))
        .join("")

      setOutputHistory((prev) => [
        ...prev,
        {
          type: "response",
          content: `Original: ${string}\nEncrypted: ${encrypted}`,
        },
      ])
    } else {
      setOutputHistory((prev) => [
        ...prev,
        { type: "error", content: "Unknown command. Type 'help' for available commands." },
      ])
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-50 w-full md:w-96 transition-all duration-300 ease-in-out",
        isOpen ? "h-96" : "h-12",
      )}
    >
      <div className="flex h-12 items-center justify-between bg-primary px-4 cursor-pointer" onClick={togglePanel}>
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-primary-foreground" />
          <span className="font-medium text-primary-foreground">Command Interface</span>
        </div>
        <div className="text-primary-foreground">{isOpen ? "▼" : "▲"}</div>
      </div>

      {isOpen && (
        <div className="h-84 bg-black border border-primary p-4 flex flex-col">
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-2 font-mono text-sm">
              {outputHistory.map((output, index) => (
                <div
                  key={index}
                  className={cn(
                    "whitespace-pre-wrap",
                    output.type === "system" && "text-blue-400",
                    output.type === "command" && "text-green-400",
                    output.type === "response" && "text-white",
                    output.type === "error" && "text-red-400",
                  )}
                >
                  {output.content}
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleCommandSubmit} className="flex space-x-2">
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className="flex-1 bg-black border-primary text-white font-mono"
              placeholder="Enter command..."
            />
            <Button type="submit" variant="outline" className="border-primary text-primary">
              Execute
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

