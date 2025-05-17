"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DrillIcon as Drone, MoreVertical, Calendar, Map, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Mission, MissionStatus } from "@/lib/types";
import { useMissions } from "@/hooks/use-missions";

interface MissionsListProps {
  status: MissionStatus;
}

export function MissionsList({ status }: MissionsListProps) {
  const { missions, loading, error, getMissions } = useMissions();
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);

  useEffect(() => {
    // Load missions filtered by status
    getMissions(status);
  }, [status]);

  useEffect(() => {
    // Filter missions by status when the missions array changes
    setFilteredMissions(missions.filter(mission => mission.status === status));
  }, [missions, status]);

  // Function to get badge variant based on threat level
  const getThreatBadgeVariant = (level: number) => {
    switch (level) {
      case 0:
        return "outline";
      case 1:
        return "secondary";
      case 2:
        return "default";
      case 3:
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return <MissionsListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-semibold mb-2 text-destructive">Error Loading Missions</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button variant="outline" onClick={() => getMissions(status)}>
          Retry
        </Button>
      </div>
    );
  }

  if (filteredMissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">No {status} missions found</h3>
        <p className="text-muted-foreground mb-6">There are currently no missions with the {status} status.</p>
        <Button variant="outline">Create New Mission</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredMissions.map((mission) => (
        <Link href={`/missions/${mission.id}`} key={mission.id} className="block">
          <Card className="h-full hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{mission.name}</CardTitle>
                  <CardDescription>{mission.description}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Location</span>
                  </div>
                  <span className="text-sm font-medium">{mission.location}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date</span>
                  </div>
                  <span className="text-sm font-medium">{new Date(mission.date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Duration</span>
                  </div>
                  <span className="text-sm font-medium">{mission.duration}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Drone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Drones</span>
                  </div>
                  <span className="text-sm font-medium">{mission.droneCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Team</span>
                  </div>
                  <span className="text-sm font-medium">{mission.teamSize} operators</span>
                </div>

                {status !== "scheduled" && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{mission.progress}%</span>
                    </div>
                    <Progress value={mission.progress} className="h-1.5" />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex items-center justify-between w-full">
                <Badge variant={getThreatBadgeVariant(mission.threatLevel)}>
                  {mission.threatLevel === 0
                    ? "Minimal Threat"
                    : mission.threatLevel === 1
                      ? "Low Threat"
                      : mission.threatLevel === 2
                        ? "Moderate Threat"
                        : "High Threat"}
                </Badge>
                <Badge
                  variant={
                    status === "active"
                      ? "default"
                      : status === "scheduled"
                        ? "secondary"
                        : status === "completed"
                          ? "outline"
                          : "outline"
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Skeleton loading state component
function MissionsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="h-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <div className="flex items-center justify-between w-full">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
