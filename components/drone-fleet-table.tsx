"use client";

import { useMemo } from "react";
import { useDrones } from "@/hooks/use-drones";

const statusMap: Record<string, string> = {
  idle: "standby",
  "in-flight": "active",
  charging: "maintenance",
  maintenance: "maintenance",
};

export const DroneFleetTable = ({ status }: { status?: "active" | "standby" | "maintenance" }) => {
  const { drones, refresh } = useDrones();
  const items = useMemo(() => {
    if (!status) return drones;
    return drones.filter((d) => statusMap[d.status] === status);
  }, [drones, status]);

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-2 text-sm">
        <div className="font-medium">{items.length} Drones</div>
        <button className="text-xs underline" onClick={() => refresh()}>Refresh</button>
      </div>
      <div className="grid grid-cols-6 gap-2 p-2 border-t text-xs font-medium text-muted-foreground">
        <div>ID</div>
        <div>Name</div>
        <div>Status</div>
        <div>Latitude</div>
        <div>Longitude</div>
        <div>Alt (m)</div>
      </div>
      {items.map((d) => (
        <div key={d.id} className="grid grid-cols-6 gap-2 p-2 border-t text-sm">
          <div>{d.id}</div>
          <div>{d.name}</div>
          <div className="capitalize">{d.status}</div>
          <div>{d.lat.toFixed(4)}</div>
          <div>{d.lon.toFixed(4)}</div>
          <div>{d.altitude}</div>
        </div>
      ))}
    </div>
  );
};

export default DroneFleetTable;


