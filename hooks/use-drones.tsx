"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Drone } from "@/lib/types";

const DronesContext = createContext<{ drones: Drone[]; update: (d: Drone) => void; refresh: () => Promise<void> } | undefined>(undefined);

export const DronesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drones, setDrones] = useState<Drone[]>([]);

  const refresh = async () => {
    const res = await fetch("/api/drones", { cache: "no-store" });
    const data = await res.json();
    setDrones(data.drones ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({
    drones,
    update: (d: Drone) => setDrones((prev) => {
      const idx = prev.findIndex((x) => x.id === d.id);
      if (idx === -1) return [...prev, d];
      const copy = [...prev];
      copy[idx] = d;
      return copy;
    }),
    refresh,
  }), [drones]);
  return <DronesContext.Provider value={value}>{children}</DronesContext.Provider>;
};

export const useDrones = () => {
  const ctx = useContext(DronesContext);
  if (!ctx) throw new Error("useDrones must be used within DronesProvider");
  return ctx;
};


