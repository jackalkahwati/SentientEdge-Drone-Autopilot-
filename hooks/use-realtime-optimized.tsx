"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useTransition, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { MapMarker, Drone, Mission, EnvironmentalData } from "@/lib/types";

// Optimized data structures for performance
type DronePositionMap = Map<string, MapMarker>;
type DroneStatusMap = Map<string, Partial<Drone>>;
type MissionUpdateMap = Map<string, Partial<Mission>>;

type RealtimeData = {
  dronePositions: DronePositionMap;
  droneStatuses: DroneStatusMap;
  environmentalData: EnvironmentalData | null;
  activeMissionUpdates: MissionUpdateMap;
  alerts: Array<{ id: string; message: string; type: "info" | "warning" | "critical"; timestamp: string }>;
};

interface RealtimeContextType {
  connected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  realtimeData: RealtimeData;
  clearAlerts: () => void;
  // Selective data access functions
  getDronePosition: (droneId: string) => MapMarker | undefined;
  getDroneStatus: (droneId: string) => Partial<Drone> | undefined;
  getMissionUpdate: (missionId: string) => Partial<Mission> | undefined;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Data throttling configuration
const THROTTLE_CONFIG = {
  DRONE_POSITIONS: 100, // 10Hz max for positions
  DRONE_STATUS: 250,    // 4Hz max for status updates
  ENVIRONMENTAL: 1000,  // 1Hz for environmental data
  ALERTS: 0,           // No throttling for alerts
};

const MAX_ALERTS = 100; // Prevent memory leaks

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { connect, disconnect, subscribe, onStatusChange } = useWebSocket();
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("disconnected");
  const [isPending, startTransition] = useTransition();
  
  // Use Maps for O(1) lookups and better performance
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    dronePositions: new Map(),
    droneStatuses: new Map(),
    environmentalData: null,
    activeMissionUpdates: new Map(),
    alerts: [],
  });

  // Throttling refs to prevent excessive updates
  const throttleRefs = useRef<Record<string, number>>({});

  // Throttled update function using React 19's useTransition
  const throttledUpdate = useCallback((
    type: string,
    updateFn: (prevData: RealtimeData) => RealtimeData,
    throttleMs: number
  ) => {
    const now = Date.now();
    const lastUpdate = throttleRefs.current[type] || 0;
    
    if (now - lastUpdate < throttleMs) {
      return; // Skip this update
    }
    
    throttleRefs.current[type] = now;
    
    // Use startTransition for non-urgent updates
    startTransition(() => {
      setRealtimeData(updateFn);
    });
  }, [startTransition]);

  // Optimized drone position handler
  const handleDronePositions = useCallback((data: MapMarker[]) => {
    throttledUpdate(
      'drone_positions',
      (prevData) => {
        const newPositions = new Map(prevData.dronePositions);
        data.forEach(marker => {
          newPositions.set(marker.id, marker);
        });
        return { ...prevData, dronePositions: newPositions };
      },
      THROTTLE_CONFIG.DRONE_POSITIONS
    );
  }, [throttledUpdate]);

  // Optimized drone status handler
  const handleDroneStatus = useCallback((data: Partial<Drone> & { id: string }) => {
    throttledUpdate(
      `drone_status_${data.id}`,
      (prevData) => {
        const newStatuses = new Map(prevData.droneStatuses);
        // Merge with existing status to avoid overwriting fields
        const existingStatus = newStatuses.get(data.id) || {};
        newStatuses.set(data.id, { ...existingStatus, ...data });
        return { ...prevData, droneStatuses: newStatuses };
      },
      THROTTLE_CONFIG.DRONE_STATUS
    );
  }, [throttledUpdate]);

  // Environmental data handler
  const handleEnvironmentalData = useCallback((data: EnvironmentalData) => {
    throttledUpdate(
      'environmental',
      (prevData) => ({ ...prevData, environmentalData: data }),
      THROTTLE_CONFIG.ENVIRONMENTAL
    );
  }, [throttledUpdate]);

  // Mission update handler
  const handleMissionUpdate = useCallback((data: Partial<Mission> & { id: string }) => {
    throttledUpdate(
      `mission_${data.id}`,
      (prevData) => {
        const newUpdates = new Map(prevData.activeMissionUpdates);
        newUpdates.set(data.id, data);
        return { ...prevData, activeMissionUpdates: newUpdates };
      },
      250 // 4Hz for mission updates
    );
  }, [throttledUpdate]);

  // Alert handler with memory management
  const handleAlert = useCallback((data: { id: string; message: string; type: "info" | "warning" | "critical"; timestamp: string }) => {
    setRealtimeData(prevData => {
      const newAlerts = [...prevData.alerts, data];
      // Prevent memory leaks by limiting alert count
      if (newAlerts.length > MAX_ALERTS) {
        newAlerts.splice(0, newAlerts.length - MAX_ALERTS);
      }
      return { ...prevData, alerts: newAlerts };
    });
  }, []);

  useEffect(() => {
    connect();

    const statusUnsubscribe = onStatusChange((status) => {
      setConnectionStatus(status);
      setConnected(status === "connected");
    });

    // Set up optimized message subscriptions
    const dronePositionsUnsubscribe = subscribe("drone_positions", handleDronePositions);
    const droneStatusUnsubscribe = subscribe("drone_status", handleDroneStatus);
    const environmentalDataUnsubscribe = subscribe("environmental_data", handleEnvironmentalData);
    const missionUpdateUnsubscribe = subscribe("mission_update", handleMissionUpdate);
    const alertUnsubscribe = subscribe("alert", handleAlert);

    const handleUnload = () => disconnect();
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleUnload);
    }

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
  }, [
    connect, disconnect, subscribe, onStatusChange,
    handleDronePositions, handleDroneStatus, handleEnvironmentalData,
    handleMissionUpdate, handleAlert
  ]);

  // Memoized selector functions for efficient data access
  const getDronePosition = useCallback((droneId: string) => {
    return realtimeData.dronePositions.get(droneId);
  }, [realtimeData.dronePositions]);

  const getDroneStatus = useCallback((droneId: string) => {
    return realtimeData.droneStatuses.get(droneId);
  }, [realtimeData.droneStatuses]);

  const getMissionUpdate = useCallback((missionId: string) => {
    return realtimeData.activeName.get(missionId);
  }, [realtimeData.activeMissionUpdates]);

  const clearAlerts = useCallback(() => {
    startTransition(() => {
      setRealtimeData(prev => ({ ...prev, alerts: [] }));
    });
  }, [startTransition]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    connected,
    connectionStatus,
    realtimeData,
    clearAlerts,
    getDronePosition,
    getDroneStatus,
    getMissionUpdate,
  }), [
    connected,
    connectionStatus,
    realtimeData,
    clearAlerts,
    getDronePosition,
    getDroneStatus,
    getMissionUpdate
  ]);

  return (
    <RealtimeContext.Provider value={contextValue}>
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

// Selective hooks for specific data to minimize re-renders
export function useDronePosition(droneId: string) {
  const { getDronePosition } = useRealtime();
  return getDronePosition(droneId);
}

export function useDroneStatus(droneId: string) {
  const { getDroneStatus } = useRealtime();
  return getDroneStatus(droneId);
}

export function useMissionUpdate(missionId: string) {
  const { getMissionUpdate } = useRealtime();
  return getMissionUpdate(missionId);
}