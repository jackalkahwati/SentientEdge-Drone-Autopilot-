"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function NewMissionButton() {
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle mission creation logic here
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Mission
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Mission</DialogTitle>
            <DialogDescription>
              Define the parameters for your new drone mission. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Mission Name</Label>
              <Input id="name" placeholder="Operation Name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Mission objectives and details" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Grid coordinates or region" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Start Date</Label>
                <Input id="date" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration</Label>
                <Input id="duration" placeholder="e.g. 4h 30m" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="drones">Number of Drones</Label>
                <Input id="drones" type="number" min="1" placeholder="e.g. 24" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="team-size">Team Size</Label>
                <Input id="team-size" type="number" min="1" placeholder="e.g. 6" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="threat-level">Threat Assessment</Label>
                <Select defaultValue="0">
                  <SelectTrigger id="threat-level">
                    <SelectValue placeholder="Select threat level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Threat Level</SelectLabel>
                      <SelectItem value="0">Minimal (0)</SelectItem>
                      <SelectItem value="1">Low (1)</SelectItem>
                      <SelectItem value="2">Moderate (2)</SelectItem>
                      <SelectItem value="3">High (3)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Mission</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

