"use client";

import { useMemo } from "react";
import { useMissions } from "@/hooks/use-missions";

export const MissionsList = ({ status }: { status?: "active" | "scheduled" | "completed" | "archived" }) => {
  const { missions, refresh } = useMissions();
  const items = useMemo(() => (status ? missions.filter((m) => m.status === status) : missions), [missions, status]);
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-2 text-sm">
        <div className="font-medium">{items.length} Missions</div>
        <button className="text-xs underline" onClick={() => refresh()}>Refresh</button>
      </div>
      <div className="grid grid-cols-4 gap-2 p-2 border-t text-xs font-medium text-muted-foreground">
        <div>ID</div>
        <div>Name</div>
        <div>Status</div>
        <div>Actions</div>
      </div>
      {items.map((m) => (
        <div key={m.id} className="grid grid-cols-4 gap-2 p-2 border-t text-sm">
          <div>{m.id}</div>
          <div>{m.name}</div>
          <div className="capitalize">{m.status}</div>
          <div>
            <button className="text-xs underline">Open</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MissionsList;


