"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/api";
import { Drone, DroneStatus } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface DronesContextType {
  drones: Drone[];
  loading: boolean;
  error: string | null;
  getDrones: (status?: DroneStatus) => Promise<Drone[]>;
  getDrone: (id: string) => Promise<Drone | null>;
  updateDroneStatus: (id: string, status: DroneStatus) => Promise<boolean>;
  assignDroneToMission: (droneId: string, missionId: string) => Promise<boolean>;
}

interface DronesProviderProps {
  children: ReactNode;
}

const DronesContext = createContext<DronesContextType | undefined>(undefined);

export function DronesProvider({ children }: DronesProviderProps) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Load drones on initial load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getDrones();
    }
  }, [isAuthenticated]);

  const getDrones = async (status?: DroneStatus): Promise<Drone[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = status ? `/drones?status=${status}` : '/drones';
      const response = await api.get<Drone[]>(endpoint);
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return [];
      }
      
      if (response.data) {
        setDrones(response.data);
        setLoading(false);
        return response.data;
      }
      
      return [];
    } catch (err) {
      setError("Failed to fetch drones");
      setLoading(false);
      return [];
    }
  };

  const getDrone = async (id: string): Promise<Drone | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get<Drone>(`/drones/${id}`);
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return null;
      }
      
      setLoading(false);
      return response.data || null;
    } catch (err) {
      setError("Failed to fetch drone");
      setLoading(false);
      return null;
    }
  };

  const updateDroneStatus = async (id: string, status: DroneStatus): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.patch<Drone>(`/drones/${id}/status`, { status });
      
      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return false;
      }
      
      if (response.data) {
        // Update local state
        setDrones(drones.map(drone => 
          drone.id === id ? { ...drone, status: response.data!.status } : drone
        ));
        toast.success(`Drone status updated to ${status}`);
        setLoading(false);
        return true;
      }
      
      return false;
    } catch (err) {
      setError("Failed to update drone status");
      toast.error("Failed to update drone status");
      setLoading(false);
      return false;
    }
  };

  const assignDroneToMission = async (droneId: string, missionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post<{ success: boolean }>(`/drones/${droneId}/assign`, { missionId });
      
      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return false;
      }
      
      if (response.data?.success) {
        // Refresh drone data
        getDrones();
        toast.success("Drone assigned to mission");
        setLoading(false);
        return true;
      }
      
      return false;
    } catch (err) {
      setError("Failed to assign drone to mission");
      toast.error("Failed to assign drone to mission");
      setLoading(false);
      return false;
    }
  };

  return (
    <DronesContext.Provider
      value={{
        drones,
        loading,
        error,
        getDrones,
        getDrone,
        updateDroneStatus,
        assignDroneToMission,
      }}
    >
      {children}
    </DronesContext.Provider>
  );
}

export function useDrones() {
  const context = useContext(DronesContext);
  if (context === undefined) {
    throw new Error("useDrones must be used within a DronesProvider");
  }
  return context;
}
