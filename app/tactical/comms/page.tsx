import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/mobile-nav"
import { CommunicationsPanel } from "@/components/communications-panel"
import { MessageHistory } from "@/components/message-history"
import { ChannelList } from "@/components/channel-list"
import { RefreshCw, Lock, Radio, MessageSquare, Users } from "lucide-react"
import Link from "next/link"

export default function CommunicationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">DomainCommand</span>
            </Link>
          </div>
          <MobileNav />
        </div>
      </header>

      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Communications</h1>
            <Badge variant="outline" className="ml-2 gap-1">
              <Lock className="h-3 w-3" />
              <span>Encrypted</span>
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Radio className="h-3.5 w-3.5" />
              <span>Channels</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Users className="h-3.5 w-3.5" />
              <span>Contacts</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>New Message</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Channels</CardTitle>
              <CardDescription>Secure communication channels</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ChannelList />
            </CardContent>
          </Card>

          <div className="space-y-6 md:col-span-9">
            <Card className="md:col-span-9">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tactical Command</CardTitle>
                    <CardDescription>Primary mission coordination channel</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      <span>12 Online</span>
                    </Badge>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] flex flex-col">
                  <MessageHistory />
                  <CommunicationsPanel />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

