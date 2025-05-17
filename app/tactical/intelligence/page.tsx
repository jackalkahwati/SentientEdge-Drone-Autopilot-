import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/mobile-nav"
import { IntelligenceFeed } from "@/components/intelligence-feed"
import { IntelligenceAnalysis } from "@/components/intelligence-analysis"
import { IntelligenceMap } from "@/components/intelligence-map"
import { Filter, Download, Save, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function IntelligencePage() {
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
            <h1 className="text-lg font-semibold md:text-2xl">Intelligence</h1>
            <Badge variant="outline" className="ml-2">
              Secure Channel
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 hidden md:flex">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="feed">Intelligence Feed</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="map">Intelligence Map</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <IntelligenceFeed />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <IntelligenceAnalysis />
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Intelligence Map</CardTitle>
                <CardDescription>Geospatial intelligence visualization</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] w-full">
                  <IntelligenceMap />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

