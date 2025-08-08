"use client";

import { Button } from "@/components/ui/button";

export const SimulationControls = () => (
  <div className="flex gap-2">
    <Button>Start</Button>
    <Button variant="secondary">Pause</Button>
    <Button variant="ghost">Reset</Button>
  </div>
);

export default SimulationControls;


