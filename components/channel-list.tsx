"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  BellOff,
  Lock,
  MessageSquare,
  MoreVertical,
  Plus,
  Radio,
  Search,
  Shield,
  Users,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Channel {
  id: string
  name: string
  type: "tactical" | "operations" | "intelligence" | "logistics" | "command" | "emergency"
  unreadCount: number
  isActive: boolean
  isEncrypted: boolean
  members: number
  isPinned: boolean
  isEmergency?: boolean
}

export function ChannelList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeChannel, setActiveChannel] = useState("channel-001")

  // Mock channel data
  const channels: Channel[] = [
    {
      id: "channel-001",
      name: "Tactical Command",
      type: "tactical",
      unreadCount: 0,
      isActive: true,
      isEncrypted: true,
      members: 12,
      isPinned: true,
    },
    {
      id: "channel-002",
      name: "Operations Planning",
      type: "operations",
      unreadCount: 3,
      isActive: true,
      isEncrypted: true,
      members: 8,
      isPinned: true,
    },
    {
      id: "channel-003",
      name: "Intelligence Feed",
      type: "intelligence",
      unreadCount: 7,
      isActive: true,
      isEncrypted: true,
      members: 6,
      isPinned: true,
    },
    {
      id: "channel-004",
      name: "Logistics Coordination",
      type: "logistics",
      unreadCount: 0,
      isActive: true,
      isEncrypted: true,
      members: 5,
      isPinned: false,
    },
    {
      id: "channel-005",
      name: "Command Staff",
      type: "command",
      unreadCount: 2,
      isActive: true,
      isEncrypted: true,
      members: 4,
      isPinned: true,
    },
    {
      id: "channel-006",
      name: "Emergency Alerts",
      type: "emergency",
      unreadCount: 0,
      isActive: true,
      isEncrypted: true,
      members: 15,
      isPinned: true,
      isEmergency: true,
    },
  ]

  // Filter channels based on search query
  const filteredChannels = channels.filter((channel) => channel.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Sort channels: pinned first, then by unread count
  const sortedChannels = [...filteredChannels].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.unreadCount - a.unreadCount
  })

  // Helper function to get channel icon
  const getChannelIcon = (type: Channel["type"]) => {
    switch (type) {
      case "tactical":
        return <Radio className="h-4 w-4" />
      case "operations":
        return <Users className="h-4 w-4" />
      case "intelligence":
        return <Shield className="h-4 w-4" />
      case "logistics":
        return <MessageSquare className="h-4 w-4" />
      case "command":
        return <Shield className="h-4 w-4" />
      case "emergency":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search channels..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedChannels.map((channel) => (
            <button
              key={channel.id}
              className={`w-full flex items-center justify-between p-2 rounded-md text-left ${
                channel.id === activeChannel ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setActiveChannel(channel.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`${channel.isEmergency ? "text-red-500" : ""}`}>{getChannelIcon(channel.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{channel.name}</span>
                    {channel.isEncrypted && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{channel.members}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {channel.unreadCount > 0 && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center">{channel.unreadCount}</Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Channel Options</DropdownMenuLabel>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Manage Members</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <BellOff className="h-4 w-4 mr-2" />
                      <span>Mute Notifications</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {channel.isPinned ? (
                        <>
                          <span>Unpin Channel</span>
                        </>
                      ) : (
                        <>
                          <span>Pin Channel</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Leave Channel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <Button variant="outline" className="w-full gap-1">
          <Plus className="h-4 w-4" />
          <span>New Channel</span>
        </Button>
      </div>
    </div>
  )
}

