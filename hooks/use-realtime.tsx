"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useWebSocket } from "@/lib/websocket";
import { MapMarker, Drone, Mission, EnvironmentalData } from "@/lib/types";

type RealtimeData = {
  dronePositions: MapMarker[];
  droneStatuses: { [droneId: string]: Partial<Drone> };
  environmentalData: EnvironmentalData | null;
  activeMissionUpdates: { [missionId: string]: Partial<Mission> };
  alerts: Array<{ id: string; message: string; type: "info" | "warning" | "critical"; timestamp: string }>;
};

interface RealtimeContextType {
  connected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  realtimeData: RealtimeData;
  clearAlerts: () => void;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { connect, disconnect, subscribe, onStatusChange } = useWebSocket();
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("disconnected");
  
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    dronePositions: [],
    droneStatuses: {},
    environmentalData: null,
    activeMissionUpdates: {},
    alerts: [],
  });

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connect();

    // Set up status change handler
    const statusUnsubscribe = onStatusChange((status) => {
      setConnectionStatus(status);
      setConnected(status === "connected");
    });

    // Set up message type subscriptions
    const dronePositionsUnsubscribe = subscribe("drone_positions", (data) => {
      setRealtimeData(prev => ({
        ...prev,
        dronePositions: data,
      }));
    });

    const droneStatusUnsubscribe = subscribe("drone_status", (data) => {
      setRealtimeData(prev => ({
        ...prev,
        droneStatuses: {
          ...prev.droneStatuses,
          [data.id]: data,
        }
      }));
    });

    const environmentalDataUnsubscribe = subscribe("environmental_data", (data) => {
      setRealtimeData(prev => ({
        ...prev,
        environmentalData: data,
      }));
    });

    const missionUpdateUnsubscribe = subscribe("mission_update", (data) => {
      setRealtimeData(prev => ({
        ...prev,
        activeMissionUpdates: {
          ...prev.activeMissionUpdates,
          [data.id]: data,
        }
      }));
    });

    const alertUnsubscribe = subscribe("alert", (data) => {
      setRealtimeData(prev => ({
        ...prev,
        alerts: [...prev.alerts, data],
      }));
    });

    // Disconnect only when the tab/window is actually unloaded.
    const handleUnload = () => disconnect();
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleUnload);
    }

    // Cleanup subscriptions on component unmount (leave WS alive in dev to avoid Strict-Mode loop)
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", handleUnload);
      }
      statusUnsubscribe();
      dronePositionsUnsubscribe();
      droneStatusUnsubscribe();
      environmentalDataUnsubscribe();
      missionUpdateUnsubscribe();
      alertUnsubscribe();
    };
  }, []);

  const clearAlerts = () => {
    setRealtimeData(prev => ({
      ...prev,
      alerts: [],
    }));
  };

  return (
    <RealtimeContext.Provider
      value={{
        connected,
        connectionStatus,
        realtimeData,
        clearAlerts,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
