import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MissionsHeader } from "@/components/missions-header"
import { MissionsList } from "@/components/missions-list"
import { NewMissionButton } from "@/components/new-mission-button"

export default function MissionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MissionsHeader />
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Missions</h1>
            <NewMissionButton />
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <MissionsList status="active" />
            </TabsContent>

            <TabsContent value="scheduled">
              <MissionsList status="scheduled" />
            </TabsContent>

            <TabsContent value="completed">
              <MissionsList status="completed" />
            </TabsContent>

            <TabsContent value="archived">
              <MissionsList status="archived" />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

