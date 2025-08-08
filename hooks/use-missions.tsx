"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Mission } from "@/lib/types";

const MissionsContext = createContext<{ missions: Mission[]; add: (m: Mission) => void; refresh: () => Promise<void> } | undefined>(undefined);

export const MissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [missions, setMissions] = useState<Mission[]>([]);

  const refresh = async () => {
    const res = await fetch("/api/missions", { cache: "no-store" });
    const data = await res.json();
    setMissions(data.missions ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ missions, add: (m: Mission) => setMissions((prev) => [...prev, m]), refresh }), [missions]);
  return <MissionsContext.Provider value={value}>{children}</MissionsContext.Provider>;
};

export const useMissions = () => {
  const ctx = useContext(MissionsContext);
  if (!ctx) throw new Error("useMissions must be used within MissionsProvider");
  return ctx;
};


