"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMissions } from "@/hooks/use-missions";
import { useDrones } from "@/hooks/use-drones";

export const MissionDashboard: React.FC = () => {
  const { missions } = useMissions();
  const { drones } = useDrones();
  return (
    <div className="container mx-auto p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Operational Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white">Nominal</Badge>
            <span className="text-sm text-muted-foreground">All systems reporting</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Missions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{missions.filter((m) => m.status === "active").length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Connected Drones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{drones.length}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionDashboard;


