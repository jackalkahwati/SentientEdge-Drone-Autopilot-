"use client"

import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, Check, CheckCheck, Clock, FileText, ImageIcon, MapPin, Shield, User } from "lucide-react"

interface Message {
  id: string
  sender: {
    id: string
    name: string
    avatar?: string
    role: "commander" | "operator" | "ai" | "system"
  }
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read" | "pending"
  isEncrypted: boolean
  attachments?: {
    type: "image" | "document" | "location"
    name: string
    url?: string
  }[]
}

export function MessageHistory() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Mock message data
  const messages: Message[] = [
    {
      id: "msg-001",
      sender: {
        id: "system",
        name: "System",
        role: "system",
      },
      content: "Secure channel established. All communications are encrypted end-to-end.",
      timestamp: "10:30:15",
      status: "read",
      isEncrypted: true,
    },
    {
      id: "msg-002",
      sender: {
        id: "user-001",
        name: "Commander Chen",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "commander",
      },
      content:
        "Team, we have new intelligence about activity in the eastern sector. Reconnaissance drones have detected multiple vehicles moving towards the border.",
      timestamp: "10:32:45",
      status: "read",
      isEncrypted: true,
    },
    {
      id: "msg-003",
      sender: {
        id: "user-002",
        name: "Operator Rodriguez",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "operator",
      },
      content: "Acknowledged. How many vehicles are we tracking?",
      timestamp: "10:33:12",
      status: "read",
      isEncrypted: true,
    },
    {
      id: "msg-004",
      sender: {
        id: "user-001",
        name: "Commander Chen",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "commander",
      },
      content:
        "Current count is 7 vehicles, appears to be a mix of transport and light armor. Sending satellite imagery now.",
      timestamp: "10:34:30",
      status: "read",
      isEncrypted: true,
      attachments: [
        {
          type: "image",
          name: "satellite_imagery_20250324_103420.jpg",
          url: "/placeholder.svg?height=200&width=300",
        },
      ],
    },
    {
      id: "msg-005",
      sender: {
        id: "ai",
        name: "AutonoFly AI",
        role: "ai",
      },
      content:
        "Analysis complete. Vehicle signatures match known patterns of hostile force equipment. Confidence level: 87%. Recommend deploying additional reconnaissance assets to monitor movement.",
      timestamp: "10:35:15",
      status: "read",
      isEncrypted: true,
    },
    {
      id: "msg-006",
      sender: {
        id: "user-003",
        name: "Operator Kim",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "operator",
      },
      content:
        "I've prepared a drone deployment plan for the eastern sector. Three surveillance drones can be on station within 15 minutes.",
      timestamp: "10:36:22",
      status: "read",
      isEncrypted: true,
      attachments: [
        {
          type: "document",
          name: "drone_deployment_plan.pdf",
        },
        {
          type: "location",
          name: "Eastern Sector Grid E-7",
        },
      ],
    },
    {
      id: "msg-007",
      sender: {
        id: "user-001",
        name: "Commander Chen",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "commander",
      },
      content:
        "Approved. Launch the drones immediately. I want real-time feeds from all units. Also, alert the ground teams to be on standby.",
      timestamp: "10:37:05",
      status: "read",
      isEncrypted: true,
    },
    {
      id: "msg-008",
      sender: {
        id: "user-002",
        name: "Operator Rodriguez",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "operator",
      },
      content: "Ground teams notified. They're moving to alert status.",
      timestamp: "10:38:30",
      status: "delivered",
      isEncrypted: true,
    },
    {
      id: "msg-009",
      sender: {
        id: "ai",
        name: "AutonoFly AI",
        role: "ai",
      },
      content:
        "Weather alert: Incoming storm system may affect drone operations in 2 hours. Recommend completing critical surveillance before 12:30.",
      timestamp: "10:40:12",
      status: "delivered",
      isEncrypted: true,
    },
    {
      id: "msg-010",
      sender: {
        id: "user-003",
        name: "Operator Kim",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "operator",
      },
      content: "Drones launched. ETA to target area is 8 minutes.",
      timestamp: "10:41:45",
      status: "sent",
      isEncrypted: true,
    },
  ]

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Helper function to get sender avatar
  const getSenderAvatar = (sender: Message["sender"]) => {
    if (sender.role === "ai") {
      return <Bot className="h-5 w-5" />
    } else if (sender.role === "system") {
      return <Shield className="h-5 w-5" />
    } else {
      return sender.avatar ? <AvatarImage src={sender.avatar} alt={sender.name} /> : <User className="h-5 w-5" />
    }
  }

  // Helper function to get message status icon
  const getMessageStatusIcon = (status: Message["status"]) => {
    switch (status) {
      case "read":
        return <CheckCheck className="h-3.5 w-3.5 text-primary" />
      case "delivered":
        return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
      case "sent":
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  // Helper function to get attachment icon
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "location":
        return <MapPin className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <Avatar
              className={`h-8 w-8 ${message.sender.role === "ai" ? "bg-primary/10" : message.sender.role === "system" ? "bg-muted" : ""}`}
            >
              {getSenderAvatar(message.sender)}
              <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    message.sender.role === "commander"
                      ? "text-primary"
                      : message.sender.role === "ai"
                        ? "text-primary"
                        : ""
                  }`}
                >
                  {message.sender.name}
                </span>
                {message.sender.role === "commander" && (
                  <Badge variant="outline" className="h-5 px-1 text-xs">
                    Commander
                  </Badge>
                )}
                {message.sender.role === "ai" && (
                  <Badge variant="secondary" className="h-5 px-1 text-xs">
                    AI
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>

              <div className="text-sm">{message.content}</div>

              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="flex flex-col">
                      {attachment.type === "image" && attachment.url && (
                        <div className="rounded-md overflow-hidden mt-1 mb-1">
                          <img
                            src={attachment.url || "/placeholder.svg"}
                            alt={attachment.name}
                            className="max-w-[300px] h-auto object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/50 max-w-fit">
                        {getAttachmentIcon(attachment.type)}
                        <span className="text-xs">{attachment.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {message.isEncrypted && (
                  <>
                    <span>Encrypted</span>
                    <span>•</span>
                  </>
                )}
                <span>{message.status.charAt(0).toUpperCase() + message.status.slice(1)}</span>
                {getMessageStatusIcon(message.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

