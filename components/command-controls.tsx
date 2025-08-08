"use client";

import { Button } from "@/components/ui/button";

export const CommandControls = () => (
  <div className="flex gap-2">
    <Button>Hold</Button>
    <Button variant="secondary">Resume</Button>
  </div>
);

export default CommandControls;


