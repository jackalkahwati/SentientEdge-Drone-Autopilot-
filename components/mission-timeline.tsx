import { Clock } from "lucide-react"

export function MissionTimeline() {
  const events = [
    {
      time: "10:42:15",
      event: "Mission initiated",
      details: "All systems operational",
    },
    {
      time: "10:45:32",
      event: "Drone deployment complete",
      details: "All 48 units synchronized",
    },
    {
      time: "11:03:17",
      event: "Target area reached",
      details: "Beginning primary scan sequence",
    },
    {
      time: "11:26:05",
      event: "Data collection in progress",
      details: "32% of primary objective complete",
    },
    {
      time: "12:10:58",
      event: "Weather alert",
      details: "Adjusting for increased wind speed",
    },
    {
      time: "12:48:22",
      event: "Current status",
      details: "67% of mission objectives complete",
    },
  ]

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="relative pl-6">
          <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary" />
          {index !== events.length - 1 && <div className="absolute left-1 top-3 h-full w-[1px] bg-border" />}
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{event.time}</span>
            </div>
            <p className="font-medium">{event.event}</p>
            <p className="text-sm text-muted-foreground">{event.details}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

