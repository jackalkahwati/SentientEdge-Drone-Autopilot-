"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ArduCopterControlPanel: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`container mx-auto p-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>ArduCopter Control Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button>Arm</Button>
            <Button variant="destructive">Disarm</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArduCopterControlPanel;


