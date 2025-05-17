"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpCircle, User, AlertCircle, Bell, CheckCircle2, Clock, Lock, Send, Mic, Paperclip, ImageIcon, FileText, MapPin, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWebSocket } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";
import { Message } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ChannelList } from "@/components/channel-list";

export function CommunicationsPanel() {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connected, subscribe } = useWebSocket();

  // Sample messages for display until API is connected
  useEffect(() => {
    const sampleMessages: Message[] = [
      {
        id: "msg-1",
        sender: "System",
        text: "Welcome to the communications panel. All messages in this channel are encrypted end-to-end.",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        channel: "channel-001",
        read: true,
        priority: "normal",
      },
      {
        id: "msg-2",
        sender: "user-2",
        text: "Drone fleet positioned at waypoint Bravo, awaiting further instructions.",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        channel: "channel-001",
        read: true,
        priority: "normal",
      },
      {
        id: "msg-3",
        sender: "System",
        text: "Alert: Weather conditions have changed. Wind speed increased to 15 knots.",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        channel: "channel-001",
        read: true,
        priority: "urgent",
      },
      {
        id: "msg-4",
        sender: "user-1",
        text: "Roger that. Adjusting flight parameters to compensate for wind conditions.",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        channel: "channel-001",
        read: true,
        priority: "normal",
      },
      {
        id: "msg-5",
        sender: "System",
        text: "Mission objective updated: Extend surveillance area by 2km to the north.",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        channel: "channel-001",
        read: true,
        priority: "critical",
      },
    ];
    
    setMessages(sampleMessages);
  }, []);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    // Create new message
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: user?.id || "user-1",
      text: messageInput,
      timestamp: new Date().toISOString(),
      channel: "channel-001",
      read: true,
      priority: "normal",
    };
    
    // In a real app, this would send the message through WebSocket
    // For now, just add to local state
    setMessages(prev => [...prev, newMessage]);
    setMessageInput("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-3 ${message.sender === (user?.id || "user-1") ? "justify-end" : ""}`}
            >
              {message.sender !== (user?.id || "user-1") && (
                <Avatar className="h-8 w-8">
                  {message.sender === "System" ? (
                    <AvatarFallback className="bg-primary/20 text-primary">SYS</AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>OP</AvatarFallback>
                    </>
                  )}
                </Avatar>
              )}
              
              <div className={`flex flex-col ${message.sender === (user?.id || "user-1") ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {message.sender === "System" ? "System" : message.sender === (user?.id || "user-1") ? "You" : "Operator"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {message.priority === "critical" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {message.priority === "urgent" && <Bell className="h-4 w-4 text-yellow-500" />}
                </div>
                
                <div 
                  className={`px-3 py-2 rounded-lg max-w-[80%] ${
                    message.sender === (user?.id || "user-1")
                      ? "bg-primary text-primary-foreground"
                      : message.sender === "System"
                        ? "bg-secondary border"
                        : "bg-muted"
                  } ${message.priority === "critical" ? "border-destructive" : ""}`}
                >
                  {message.text}
                </div>
              </div>
              
              {message.sender === (user?.id || "user-1") && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback>YOU</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="border-t p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <Input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
              {isEncrypted && <Lock className="h-3 w-3" />}
            </div>
          </div>
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <MapPin className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secure Channel</span>
            </div>
            <Button
              type="button"
              variant={isEncrypted ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setIsEncrypted(!isEncrypted)}
            >
              <Lock className="h-3 w-3" />
              <span>{isEncrypted ? "Encrypted" : "Unencrypted"}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}