"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/api";
import { Mission, MissionStatus } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface MissionsContextType {
  missions: Mission[];
  loading: boolean;
  error: string | null;
  getMissions: (status?: MissionStatus) => Promise<Mission[]>;
  getMission: (id: string) => Promise<Mission | null>;
  createMission: (missionData: Partial<Mission>) => Promise<Mission | null>;
  updateMission: (id: string, missionData: Partial<Mission>) => Promise<Mission | null>;
  deleteMission: (id: string) => Promise<boolean>;
}

interface MissionsProviderProps {
  children: ReactNode;
}

const MissionsContext = createContext<MissionsContextType | undefined>(undefined);

export function MissionsProvider({ children }: MissionsProviderProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Load missions on initial load if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getMissions();
    }
  }, [isAuthenticated]);

  const getMissions = async (status?: MissionStatus): Promise<Mission[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = status ? `/missions?status=${status}` : '/missions';
      const response = await api.get<Mission[]>(endpoint);
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return [];
      }
      
      if (response.data) {
        setMissions(response.data);
        setLoading(false);
        return response.data;
      }
      
      return [];
    } catch (err) {
      setError("Failed to fetch missions");
      setLoading(false);
      return [];
    }
  };

  const getMission = async (id: string): Promise<Mission | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get<Mission>(`/missions/${id}`);
      
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return null;
      }
      
      setLoading(false);
      return response.data || null;
    } catch (err) {
      setError("Failed to fetch mission");
      setLoading(false);
      return null;
    }
  };

  const createMission = async (missionData: Partial<Mission>): Promise<Mission | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post<Mission>('/missions', missionData);
      
      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return null;
      }
      
      if (response.data) {
        // Update local state with the new mission
        setMissions([...missions, response.data]);
        toast.success("Mission created successfully");
        setLoading(false);
        return response.data;
      }
      
      return null;
    } catch (err) {
      setError("Failed to create mission");
      toast.error("Failed to create mission");
      setLoading(false);
      return null;
    }
  };

  const updateMission = async (id: string, missionData: Partial<Mission>): Promise<Mission | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.patch<Mission>(`/missions/${id}`, missionData);
      
      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return null;
      }
      
      if (response.data) {
        // Update local state
        setMissions(missions.map(mission => 
          mission.id === id ? { ...mission, ...response.data } : mission
        ));
        toast.success("Mission updated successfully");
        setLoading(false);
        return response.data;
      }
      
      return null;
    } catch (err) {
      setError("Failed to update mission");
      toast.error("Failed to update mission");
      setLoading(false);
      return null;
    }
  };

  const deleteMission = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.delete(`/missions/${id}`);
      
      if (response.error) {
        setError(response.error);
        toast.error(response.error);
        setLoading(false);
        return false;
      }
      
      // Update local state by removing the deleted mission
      setMissions(missions.filter(mission => mission.id !== id));
      toast.success("Mission deleted successfully");
      setLoading(false);
      return true;
    } catch (err) {
      setError("Failed to delete mission");
      toast.error("Failed to delete mission");
      setLoading(false);
      return false;
    }
  };

  return (
    <MissionsContext.Provider
      value={{
        missions,
        loading,
        error,
        getMissions,
        getMission,
        createMission,
        updateMission,
        deleteMission,
      }}
    >
      {children}
    </MissionsContext.Provider>
  );
}

export function useMissions() {
  const context = useContext(MissionsContext);
  if (context === undefined) {
    throw new Error("useMissions must be used within a MissionsProvider");
  }
  return context;
}
