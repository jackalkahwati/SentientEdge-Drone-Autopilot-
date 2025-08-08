"use client";

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SwarmControlInterfaceHandle = {
  start: () => void;
  stop: () => void;
  updateFormationType: (t: "grid" | "circle" | "hex" | "custom") => void;
  toggleSimulation: () => void;
};

const SwarmControlInterface = forwardRef<SwarmControlInterfaceHandle, { className?: string; initialCenter?: [number, number]; initialZoom?: number }>((_props, ref) => {
  const [active, setActive] = useState(false);
  const [formation, setFormation] = useState<"grid" | "circle" | "hex" | "custom">("grid");

  useImperativeHandle(ref, () => ({
    start: () => setActive(true),
    stop: () => setActive(false),
    updateFormationType: (t) => setFormation(t),
    toggleSimulation: () => setActive((prev) => !prev),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swarm Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 items-center">
          <Button onClick={() => setActive(true)}>Start</Button>
          <Button variant="secondary" onClick={() => setActive(false)}>Stop</Button>
          <span className="text-sm text-muted-foreground">Status: {active ? "Active" : "Idle"}</span>
          <span className="text-sm text-muted-foreground">Formation: {formation}</span>
        </div>
      </CardContent>
    </Card>
  );
});

SwarmControlInterface.displayName = "SwarmControlInterface";

export default SwarmControlInterface;


