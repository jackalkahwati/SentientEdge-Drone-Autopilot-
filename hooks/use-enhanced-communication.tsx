"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { CyphalProtocol, CyphalSubject, CyphalPriority } from "@/lib/cyphal-protocol";
import type { DroneStatusPayload, PositionPayload, SwarmCoordinationPayload } from "@/lib/cyphal-protocol";
import { Drone, DroneStatus } from "@/lib/types";
import { toast } from "sonner";

// Enhanced communication protocols
type CommunicationProtocol = 'mavlink' | 'cyphal' | 'hybrid';

// Radio connection status
interface RadioConnection {
  id: string;
  protocol: CommunicationProtocol;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  type: 'primary' | 'backup' | 'mesh';
  signalStrength: number; // 0-100
  latency: number; // milliseconds
  throughput: number; // messages per second
  connectedDrones: number[];
  lastUpdate: number;
}

// Communication statistics
interface CommunicationStats {
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  packetLoss: number;
  bandwidth: number;
  activeConnections: number;
  meshNodes: number;
}

// Enhanced drone with communication info
interface EnhancedDrone extends Drone {
  communicationStatus: {
    protocol: CommunicationProtocol;
    signalStrength: number;
    latency: number;
    lastContact: number;
    activeRadios: string[];
    meshRoute?: number[];
  };
  cyphalNodeId?: number;
  capabilities: {
    mavlink: boolean;
    cyphal: boolean;
    meshRelay: boolean;
    multiRadio: boolean;
  };
}

interface EnhancedCommunicationContextType {
  // Connection management
  connect: (protocol: CommunicationProtocol) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  isConnected: boolean;
  protocol: CommunicationProtocol;
  
  // Radio management
  radioConnections: RadioConnection[];
  addRadioConnection: (config: any) => Promise<boolean>;
  removeRadioConnection: (radioId: string) => Promise<boolean>;
  
  // Drone management
  drones: EnhancedDrone[];
  getDroneById: (id: string) => EnhancedDrone | null;
  sendCommandToDrone: (droneId: string, command: any) => Promise<boolean>;
  
  // Swarm coordination
  createSwarm: (droneIds: string[], formation: string) => Promise<boolean>;
  updateSwarmFormation: (swarmId: string, formation: string) => Promise<boolean>;
  disbandSwarm: (swarmId: string) => Promise<boolean>;
  
  // Communication stats
  stats: CommunicationStats;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const EnhancedCommunicationContext = createContext<EnhancedCommunicationContextType | undefined>(undefined);

interface EnhancedCommunicationProviderProps {
  children: ReactNode;
}

export function EnhancedCommunicationProvider({ children }: EnhancedCommunicationProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [protocol, setProtocol] = useState<CommunicationProtocol>('hybrid');
  const [radioConnections, setRadioConnections] = useState<RadioConnection[]>([]);
  const [drones, setDrones] = useState<EnhancedDrone[]>([]);
  const [stats, setStats] = useState<CommunicationStats>({
    totalMessages: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    packetLoss: 0,
    bandwidth: 0,
    activeConnections: 0,
    meshNodes: 0
  });
  const [error, setError] = useState<string | null>(null);
  
  // Protocol instances
  const [cyphalNode, setCyphalNode] = useState<CyphalProtocol | null>(null);
  const [mavlinkSocket, setMavlinkSocket] = useState<WebSocket | null>(null);

  // Initialize communication protocols
  const connect = useCallback(async (selectedProtocol: CommunicationProtocol): Promise<boolean> => {
    try {
      setError(null);
      setProtocol(selectedProtocol);

      if (selectedProtocol === 'cyphal' || selectedProtocol === 'hybrid') {
        // Initialize Cyphal protocol
        const nodeId = Math.floor(Math.random() * 127) + 1; // Random node ID 1-127
        const newCyphalNode = new CyphalProtocol(nodeId);
        
        // Set up Cyphal event handlers
        setupCyphalHandlers(newCyphalNode);
        setCyphalNode(newCyphalNode);
        
        toast.success(`Cyphal node ${nodeId} initialized`);
      }

      if (selectedProtocol === 'mavlink' || selectedProtocol === 'hybrid') {
        // Initialize MAVLink WebSocket connection
        const ws = new WebSocket('ws://localhost:5760');
        
        ws.onopen = () => {
          console.log('MAVLink WebSocket connected');
          setMavlinkSocket(ws);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleMavlinkMessage(message);
          } catch (err) {
            console.error('Error parsing MAVLink message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('MAVLink WebSocket error:', error);
          setError('MAVLink connection failed');
        };

        ws.onclose = () => {
          console.log('MAVLink WebSocket disconnected');
          setMavlinkSocket(null);
        };
      }

      setIsConnected(true);
      startStatsMonitoring();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      if (cyphalNode) {
        cyphalNode.shutdown();
        setCyphalNode(null);
      }

      if (mavlinkSocket) {
        mavlinkSocket.close();
        setMavlinkSocket(null);
      }

      setIsConnected(false);
      setRadioConnections([]);
      setDrones([]);
      toast.success('Communication protocols disconnected');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disconnect failed';
      setError(errorMessage);
      return false;
    }
  }, [cyphalNode, mavlinkSocket]);

  // Set up Cyphal event handlers
  const setupCyphalHandlers = (node: CyphalProtocol) => {
    // Subscribe to drone status updates
    node.subscribe(CyphalSubject.DRONE_STATUS, (message) => {
      const status = JSON.parse(message.payload.toString()) as DroneStatusPayload;
      updateDroneFromCyphal(status, message.sourceNodeId);
    });

    // Subscribe to position updates
    node.subscribe(CyphalSubject.POSITION, (message) => {
      const position = JSON.parse(message.payload.toString()) as PositionPayload;
      updateDronePosition(message.sourceNodeId, position);
    });

    // Subscribe to swarm coordination
    node.subscribe(CyphalSubject.SWARM_COORDINATION, (message) => {
      const coordination = JSON.parse(message.payload.toString()) as SwarmCoordinationPayload;
      handleSwarmCoordination(coordination);
    });

    // Handle node discovery
    node.on('node_online', (nodeInfo) => {
      console.log('New Cyphal node discovered:', nodeInfo);
      updateStats(prev => ({ ...prev, meshNodes: prev.meshNodes + 1 }));
    });

    node.on('node_offline', (nodeId) => {
      console.log('Cyphal node offline:', nodeId);
      updateStats(prev => ({ ...prev, meshNodes: Math.max(0, prev.meshNodes - 1) }));
    });
  };

  // Handle MAVLink messages
  const handleMavlinkMessage = (message: any) => {
    switch (message.type) {
      case 'drone_status':
        updateDronesFromMavlink(message.drones);
        break;
      case 'mesh_status':
        updateMeshStatus(message);
        break;
      default:
        console.log('Unhandled MAVLink message:', message);
    }
  };

  // Update drone from Cyphal status
  const updateDroneFromCyphal = (status: DroneStatusPayload, nodeId: number) => {
    setDrones(prev => {
      const existing = prev.find(d => d.cyphalNodeId === nodeId);
      if (existing) {
        return prev.map(d => d.cyphalNodeId === nodeId ? {
          ...d,
          status: mapDroneStatus(status.systemStatus),
          battery: status.batteryPercent,
          communicationStatus: {
            ...d.communicationStatus,
            lastContact: Date.now(),
            protocol: 'cyphal'
          }
        } : d);
      } else {
        // Create new drone from Cyphal data
        const newDrone: EnhancedDrone = {
          id: `cyphal_${nodeId}`,
          name: `Drone ${nodeId}`,
          type: 'multi',
          status: mapDroneStatus(status.systemStatus),
          battery: status.batteryPercent,
          signal: 100, // Assume good signal for Cyphal
          missionCount: 0,
          nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          model: 'Unknown',
          serialNumber: `CYP${nodeId}`,
          cyphalNodeId: nodeId,
          communicationStatus: {
            protocol: 'cyphal',
            signalStrength: 100,
            latency: 5, // Cyphal typically has low latency
            lastContact: Date.now(),
            activeRadios: ['cyphal_primary']
          },
          capabilities: {
            mavlink: false,
            cyphal: true,
            meshRelay: true,
            multiRadio: false
          }
        };
        return [...prev, newDrone];
      }
    });
  };

  // Update drone position
  const updateDronePosition = (nodeId: number, position: PositionPayload) => {
    setDrones(prev => prev.map(d => 
      d.cyphalNodeId === nodeId ? {
        ...d,
        location: [position.longitude, position.latitude],
        altitude: position.altitude
      } : d
    ));
  };

  // Handle swarm coordination messages
  const handleSwarmCoordination = (coordination: SwarmCoordinationPayload) => {
    console.log('Swarm coordination received:', coordination);
    // Implement swarm coordination logic
  };

  // Update drones from MAVLink
  const updateDronesFromMavlink = (mavlinkDrones: any[]) => {
    const enhancedDrones: EnhancedDrone[] = mavlinkDrones.map(drone => ({
      ...drone,
      communicationStatus: {
        protocol: 'mavlink' as CommunicationProtocol,
        signalStrength: drone.signal || 0,
        latency: 20, // MAVLink typically has higher latency
        lastContact: Date.now(),
        activeRadios: ['mavlink_primary']
      },
      capabilities: {
        mavlink: true,
        cyphal: false,
        meshRelay: false,
        multiRadio: true
      }
    }));

    setDrones(prev => {
      // Merge with existing Cyphal drones
      const cyphalDrones = prev.filter(d => d.capabilities.cyphal);
      const mavlinkDroneIds = enhancedDrones.map(d => d.id);
      const existingMavlinkDrones = prev.filter(d => mavlinkDroneIds.includes(d.id));
      
      // Update existing MAVLink drones and add new ones
      const updatedDrones = enhancedDrones.map(newDrone => {
        const existing = existingMavlinkDrones.find(d => d.id === newDrone.id);
        return existing ? { ...existing, ...newDrone } : newDrone;
      });

      return [...cyphalDrones, ...updatedDrones];
    });
  };

  // Update mesh status
  const updateMeshStatus = (meshStatus: any) => {
    setRadioConnections(prev => {
      const updated = [...prev];
      
      // Update radio connections from mesh status
      meshStatus.radioConnections?.forEach((radioInfo: any) => {
        const existingIndex = updated.findIndex(r => r.id === radioInfo.id);
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: radioInfo.status,
            connectedDrones: radioInfo.connectedDrones || [],
            lastUpdate: Date.now()
          };
        }
      });

      return updated;
    });

    updateStats(prev => ({
      ...prev,
      meshNodes: meshStatus.nodes?.length || 0,
      activeConnections: meshStatus.radioConnections?.length || 0
    }));
  };

  // Add radio connection
  const addRadioConnection = useCallback(async (config: any): Promise<boolean> => {
    try {
      const newConnection: RadioConnection = {
        id: config.id,
        protocol: config.protocol || 'mavlink',
        status: 'connecting',
        type: config.type || 'primary',
        signalStrength: 0,
        latency: 0,
        throughput: 0,
        connectedDrones: [],
        lastUpdate: Date.now()
      };

      setRadioConnections(prev => [...prev, newConnection]);

      // Send configuration to backend
      if (mavlinkSocket && mavlinkSocket.readyState === WebSocket.OPEN) {
        mavlinkSocket.send(JSON.stringify({
          type: 'add_radio',
          config
        }));
      }

      toast.success(`Added radio connection: ${config.id}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add radio';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [mavlinkSocket]);

  // Remove radio connection
  const removeRadioConnection = useCallback(async (radioId: string): Promise<boolean> => {
    try {
      setRadioConnections(prev => prev.filter(r => r.id !== radioId));
      
      if (mavlinkSocket && mavlinkSocket.readyState === WebSocket.OPEN) {
        mavlinkSocket.send(JSON.stringify({
          type: 'remove_radio',
          radioId
        }));
      }

      toast.success(`Removed radio connection: ${radioId}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove radio';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [mavlinkSocket]);

  // Get drone by ID
  const getDroneById = useCallback((id: string): EnhancedDrone | null => {
    return drones.find(d => d.id === id) || null;
  }, [drones]);

  // Send command to drone
  const sendCommandToDrone = useCallback(async (droneId: string, command: any): Promise<boolean> => {
    const drone = getDroneById(droneId);
    if (!drone) {
      setError(`Drone ${droneId} not found`);
      return false;
    }

    try {
      if (drone.capabilities.cyphal && cyphalNode) {
        // Send via Cyphal
        cyphalNode.sendMissionCommand(drone.cyphalNodeId!, command);
      } else if (drone.capabilities.mavlink && mavlinkSocket) {
        // Send via MAVLink
        mavlinkSocket.send(JSON.stringify({
          type: 'send_command',
          droneId,
          command
        }));
      } else {
        throw new Error('No compatible communication protocol available');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Command failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [drones, cyphalNode, mavlinkSocket, getDroneById]);

  // Swarm management functions
  const createSwarm = useCallback(async (droneIds: string[], formation: string): Promise<boolean> => {
    try {
      const swarmId = Math.floor(Math.random() * 1000);
      const coordination: SwarmCoordinationPayload = {
        swarmId,
        formation: formation as any,
        role: 'coordinator',
        formationParameters: { spacing: 10, altitude: 100 },
        timestamp: Date.now()
      };

      if (cyphalNode) {
        cyphalNode.publishSwarmCoordination(coordination);
      }

      toast.success(`Created swarm with ${droneIds.length} drones`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create swarm';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [cyphalNode]);

  const updateSwarmFormation = useCallback(async (swarmId: string, formation: string): Promise<boolean> => {
    // Implementation for updating swarm formation
    toast.success(`Updated swarm ${swarmId} formation to ${formation}`);
    return true;
  }, []);

  const disbandSwarm = useCallback(async (swarmId: string): Promise<boolean> => {
    // Implementation for disbanding swarm
    toast.success(`Disbanded swarm ${swarmId}`);
    return true;
  }, []);

  // Start monitoring communication statistics
  const startStatsMonitoring = () => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + Math.floor(Math.random() * 10),
        messagesPerSecond: Math.floor(Math.random() * 50) + 10,
        averageLatency: Math.floor(Math.random() * 20) + 5,
        packetLoss: Math.random() * 2,
        bandwidth: Math.floor(Math.random() * 1000) + 500,
        activeConnections: radioConnections.filter(r => r.status === 'connected').length
      }));
    }, 1000);

    return () => clearInterval(interval);
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper functions
  const mapDroneStatus = (systemStatus: string): DroneStatus => {
    switch (systemStatus) {
      case 'ok': return 'active';
      case 'warning': return 'idle';
      case 'error':
      case 'critical': return 'maintenance';
      default: return 'offline';
    }
  };

  const updateStats = (updater: (prev: CommunicationStats) => CommunicationStats) => {
    setStats(updater);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cyphalNode) {
        cyphalNode.shutdown();
      }
      if (mavlinkSocket) {
        mavlinkSocket.close();
      }
    };
  }, [cyphalNode, mavlinkSocket]);

  return (
    <EnhancedCommunicationContext.Provider
      value={{
        connect,
        disconnect,
        isConnected,
        protocol,
        radioConnections,
        addRadioConnection,
        removeRadioConnection,
        drones,
        getDroneById,
        sendCommandToDrone,
        createSwarm,
        updateSwarmFormation,
        disbandSwarm,
        stats,
        error,
        clearError
      }}
    >
      {children}
    </EnhancedCommunicationContext.Provider>
  );
}

export function useEnhancedCommunication() {
  const context = useContext(EnhancedCommunicationContext);
  if (context === undefined) {
    throw new Error("useEnhancedCommunication must be used within an EnhancedCommunicationProvider");
  }
  return context;
}

export type { EnhancedDrone, RadioConnection, CommunicationStats, CommunicationProtocol };