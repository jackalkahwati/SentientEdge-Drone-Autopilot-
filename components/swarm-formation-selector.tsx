"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SwarmFormationSelector: React.FC<{ onApplyFormation?: (t: "grid" | "circle" | "hex" | "custom") => void }> = ({ onApplyFormation }) => {
  const [active, setActive] = useState<"grid" | "circle" | "hex" | "custom">("grid");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={active}>
          <TabsList>
            <TabsTrigger value="grid" active={active === "grid"} onClick={() => { setActive("grid"); onApplyFormation?.("grid"); }}>Grid</TabsTrigger>
            <TabsTrigger value="circle" active={active === "circle"} onClick={() => { setActive("circle"); onApplyFormation?.("circle"); }}>Circle</TabsTrigger>
            <TabsTrigger value="hex" active={active === "hex"} onClick={() => { setActive("hex"); onApplyFormation?.("hex"); }}>Hex</TabsTrigger>
          </TabsList>
          <TabsContent value="grid">
            <p className="text-sm text-muted-foreground">Grid formation for area coverage.</p>
          </TabsContent>
          <TabsContent value="circle">
            <p className="text-sm text-muted-foreground">Circular formation for perimeter operations.</p>
          </TabsContent>
          <TabsContent value="hex">
            <p className="text-sm text-muted-foreground">Hex formation for dense swarms.</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SwarmFormationSelector;


