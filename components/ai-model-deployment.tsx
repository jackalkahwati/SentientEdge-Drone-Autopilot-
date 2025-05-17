"use client";

import { Button } from "@/components/ui/button";

export function AIModelDeployment() {
  return (
    <div className="p-6 border rounded-md bg-background/50 space-y-4">
      <h2 className="text-xl font-semibold">AI Model Deployment</h2>
      <p className="text-sm text-muted-foreground">
        The full deployment dashboard is temporarily disabled while under maintenance. This placeholder
        keeps the build green.
      </p>
      <Button size="sm" onClick={() => alert("Mock deployment triggered")}>Mock Deploy</Button>
    </div>
  );
}

