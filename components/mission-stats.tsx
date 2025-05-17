import { BarChart3, Clock, Cpu, Gauge, Shield, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MissionStats() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Power</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">87%</span>
              <div className="h-2 w-16 rounded-full bg-muted">
                <div className="h-full w-[87%] rounded-full bg-green-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Security</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">100%</span>
              <div className="h-2 w-16 rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-green-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">AI Load</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">62%</span>
              <div className="h-2 w-16 rounded-full bg-muted">
                <div className="h-full w-[62%] rounded-full bg-yellow-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bandwidth</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">43%</span>
              <div className="h-2 w-16 rounded-full bg-muted">
                <div className="h-full w-[43%] rounded-full bg-green-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Uptime</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium">04:32:17</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Efficiency</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium">94%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

