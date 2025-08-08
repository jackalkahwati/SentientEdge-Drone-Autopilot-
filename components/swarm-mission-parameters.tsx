"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SwarmMissionParameters: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="speed">Cruise Speed (m/s)</Label>
            <Input id="speed" placeholder="12" />
          </div>
          <div>
            <Label htmlFor="alt">Altitude (m)</Label>
            <Input id="alt" placeholder="150" />
          </div>
          <div>
            <Label htmlFor="sep">Separation (m)</Label>
            <Input id="sep" placeholder="20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwarmMissionParameters;


