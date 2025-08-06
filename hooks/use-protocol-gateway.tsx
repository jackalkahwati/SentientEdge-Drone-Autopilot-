// React Hook for Protocol Gateway Integration
// Provides easy access to protocol gateway functionality in React components

import { useState, useEffect, useCallback, useRef } from 'react';
import ProtocolIntegration, { ProtocolIntegrationConfig } from '../lib/protocol-integration';
import { 
  ProtocolType, 
  UnifiedMessage, 
  MessagePriority, 
  RoutingStrategy 
} from '../lib/protocol-gateway';
import { LoadBalancingAlgorithm } from '../lib/protocol-router';
import { Drone } from '../lib/types';

// Hook state interface
interface ProtocolGatewayState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  drones: Drone[];
  protocolStatus: Record<string, boolean>;
  performanceMetrics: {
    totalMessages: number;
    successRate: number;
    averageLatency: number;
    protocolSwitches: number;
    cacheHitRate: number;
  };
  routingStatus: {
    protocols: ProtocolType[];
    circuitBreakers: Record<string, any>;
  };
}

// Hook options
interface UseProtocolGatewayOptions {
  config?: Partial<ProtocolIntegrationConfig>;
  autoInitialize?: boolean;
  updateInterval?: number;
}

// Hook return type
interface UseProtocolGatewayReturn extends ProtocolGatewayState {
  // Actions
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  sendMessage: (droneId: string, message: Partial<UnifiedMessage>, options?: {
    strategy?: RoutingStrategy;
    priority?: MessagePriority;
    enableBatching?: boolean;
  }) => Promise<boolean>;
  switchProtocol: (droneId: string, protocol: ProtocolType) => Promise<boolean>;
  runHealthCheck: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Utilities
  getDroneById: (droneId: string) => Drone | undefined;
  getDronesByType: (type: string) => Drone[];
  getAvailableProtocols: () => ProtocolType[];
  isProtocolHealthy: (protocol: ProtocolType) => boolean;
}

// Default configuration
const defaultConfig: ProtocolIntegrationConfig = {
  enableGateway: true,
  defaultRoutingStrategy: RoutingStrategy.ADAPTIVE,
  
  mavlink: {
    enabled: true,
    url: process.env.NEXT_PUBLIC_MAVLINK_URL || 'ws://localhost:5760',
    timeout: 5000
  },
  
  cyphal: {
    enabled: true,
    nodeId: 42,
    port: 9382,
    multicastAddress: '239.65.83.72'
  },
  
  routing: {
    enableFailover: true,
    loadBalancingAlgorithm: LoadBalancingAlgorithm.ADAPTIVE,
    circuitBreakerThreshold: 5,
    healthCheckInterval: 10000
  },
  
  performance: {
    enableCaching: true,
    cacheTimeout: 30000,
    maxConcurrentMessages: 100,
    batchingEnabled: true,
    batchSize: 10,
    batchTimeout: 1000
  }
};

export function useProtocolGateway(options: UseProtocolGatewayOptions = {}): UseProtocolGatewayReturn {
  const {
    config = {},
    autoInitialize = true,
    updateInterval = 5000
  } = options;
  
  // State
  const [state, setState] = useState<ProtocolGatewayState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    drones: [],
    protocolStatus: {},
    performanceMetrics: {
      totalMessages: 0,
      successRate: 0,
      averageLatency: 0,
      protocolSwitches: 0,
      cacheHitRate: 0
    },
    routingStatus: {
      protocols: [],
      circuitBreakers: {}
    }
  });
  
  // Refs
  const integrationRef = useRef<ProtocolIntegration | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  
  // Initialize the protocol integration
  const initialize = useCallback(async () => {
    if (integrationRef.current?.isGatewayRunning() || state.isLoading) {
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const finalConfig = { ...defaultConfig, ...config };
      integrationRef.current = new ProtocolIntegration(finalConfig);
      
      // Set up event handlers
      setupEventHandlers();
      
      await integrationRef.current.initialize();
      
      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: null
        }));
        
        // Start periodic updates
        startPeriodicUpdates();
        
        // Initial data refresh
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to initialize protocol gateway:', error);
      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Initialization failed'
        }));
      }
    }
  }, [config, state.isLoading]);
  
  // Shutdown and cleanup
  const shutdown = useCallback(async () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    if (integrationRef.current) {
      try {
        await integrationRef.current.shutdown();
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
      integrationRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isInitialized: false,
      drones: [],
      protocolStatus: {},
      routingStatus: { protocols: [], circuitBreakers: {} }
    }));
  }, []);
  
  // Send message to drone
  const sendMessage = useCallback(async (
    droneId: string,
    message: Partial<UnifiedMessage>,
    options: {
      strategy?: RoutingStrategy;
      priority?: MessagePriority;
      enableBatching?: boolean;
    } = {}
  ): Promise<boolean> => {
    if (!integrationRef.current) {
      console.warn('Protocol gateway not initialized');
      return false;
    }
    
    try {
      return await integrationRef.current.sendMessage(droneId, message, options);
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, []);
  
  // Switch drone protocol
  const switchProtocol = useCallback(async (
    droneId: string,
    protocol: ProtocolType
  ): Promise<boolean> => {
    if (!integrationRef.current) {
      console.warn('Protocol gateway not initialized');
      return false;
    }
    
    try {
      return await integrationRef.current.switchDroneProtocol(droneId, protocol);
    } catch (error) {
      console.error('Failed to switch protocol:', error);
      return false;
    }
  }, []);
  
  // Run health check
  const runHealthCheck = useCallback(async () => {
    if (!integrationRef.current) {
      return;
    }
    
    try {
      const healthResults = await integrationRef.current.runHealthCheck();
      const protocolStatus: Record<string, boolean> = {};
      
      for (const [protocol, healthy] of healthResults) {
        protocolStatus[protocol] = healthy;
      }
      
      if (!isUnmountedRef.current) {
        setState(prev => ({ ...prev, protocolStatus }));
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, []);
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!integrationRef.current) {
      return;
    }
    
    try {
      // Get drones
      const drones = integrationRef.current.getAllDrones();
      
      // Get performance metrics
      const rawMetrics = integrationRef.current.getPerformanceMetrics();
      const performanceMetrics = {
        totalMessages: rawMetrics.totalMessages,
        successRate: rawMetrics.totalMessages > 0 
          ? (rawMetrics.successfulTranslations / rawMetrics.totalMessages) * 100 
          : 0,
        averageLatency: rawMetrics.averageLatency,
        protocolSwitches: rawMetrics.protocolSwitches,
        cacheHitRate: (rawMetrics.cacheHits + rawMetrics.cacheMisses) > 0
          ? (rawMetrics.cacheHits / (rawMetrics.cacheHits + rawMetrics.cacheMisses)) * 100
          : 0
      };
      
      // Get routing status
      const routingStatusData = integrationRef.current.getRoutingStatus();
      const routingStatus = {
        protocols: routingStatusData.protocols,
        circuitBreakers: routingStatusData.circuitBreakers
      };
      
      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          drones,
          performanceMetrics,
          routingStatus
        }));
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, []);
  
  // Utility functions
  const getDroneById = useCallback((droneId: string): Drone | undefined => {
    return state.drones.find(drone => drone.id === droneId);
  }, [state.drones]);
  
  const getDronesByType = useCallback((type: string): Drone[] => {
    return state.drones.filter(drone => drone.type === type);
  }, [state.drones]);
  
  const getAvailableProtocols = useCallback((): ProtocolType[] => {
    return state.routingStatus.protocols;
  }, [state.routingStatus.protocols]);
  
  const isProtocolHealthy = useCallback((protocol: ProtocolType): boolean => {
    return state.protocolStatus[protocol] ?? false;
  }, [state.protocolStatus]);
  
  // Setup event handlers
  const setupEventHandlers = useCallback(() => {
    if (!integrationRef.current) return;
    
    integrationRef.current.on('gateway:ready', () => {
      console.log('Protocol gateway ready');
    });
    
    integrationRef.current.on('protocol:switched', (data) => {
      console.log(`Protocol switched for ${data.droneId} to ${data.protocol}`);
      refreshData();
    });
    
    integrationRef.current.on('protocol:unhealthy', (data) => {
      console.warn(`Protocol ${data.protocol} is unhealthy`);
      runHealthCheck();
    });
    
    integrationRef.current.on('integration:shutdown', () => {
      console.log('Protocol integration shut down');
    });
  }, [refreshData, runHealthCheck]);
  
  // Start periodic updates
  const startPeriodicUpdates = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    
    updateIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current && integrationRef.current) {
        refreshData();
        runHealthCheck();
      }
    }, updateInterval);
  }, [refreshData, runHealthCheck, updateInterval]);
  
  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !state.isInitialized && !state.isLoading) {
      initialize();
    }
    
    return () => {
      isUnmountedRef.current = true;
    };
  }, [autoInitialize, initialize, state.isInitialized, state.isLoading]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      
      if (integrationRef.current) {
        integrationRef.current.shutdown().catch(console.error);
      }
    };
  }, []);
  
  return {
    // State
    ...state,
    
    // Actions
    initialize,
    shutdown,
    sendMessage,
    switchProtocol,
    runHealthCheck,
    refreshData,
    
    // Utilities
    getDroneById,
    getDronesByType,
    getAvailableProtocols,
    isProtocolHealthy
  };
}

// Convenience hooks for specific use cases

// Hook for drone command operations
export function useDroneCommands() {
  const gateway = useProtocolGateway();
  
  const armDrone = useCallback(async (droneId: string): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: { command: 'arm' },
      priority: MessagePriority.HIGH
    });
  }, [gateway]);
  
  const disarmDrone = useCallback(async (droneId: string): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: { command: 'disarm' },
      priority: MessagePriority.HIGH
    });
  }, [gateway]);
  
  const takeoff = useCallback(async (droneId: string, altitude: number = 10): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: { command: 'takeoff', altitude },
      priority: MessagePriority.HIGH
    });
  }, [gateway]);
  
  const land = useCallback(async (droneId: string): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: { command: 'land' },
      priority: MessagePriority.HIGH
    });
  }, [gateway]);
  
  const returnToLaunch = useCallback(async (droneId: string): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: { command: 'rtl' },
      priority: MessagePriority.HIGH
    });
  }, [gateway]);
  
  const gotoPosition = useCallback(async (
    droneId: string, 
    lat: number, 
    lon: number, 
    alt: number = 10
  ): Promise<boolean> => {
    return gateway.sendMessage(droneId, {
      type: 'command',
      data: {
        command: 'goto',
        position: { lat, lon, alt }
      },
      priority: MessagePriority.NORMAL
    });
  }, [gateway]);
  
  return {
    ...gateway,
    armDrone,
    disarmDrone,
    takeoff,
    land,
    returnToLaunch,
    gotoPosition
  };
}

// Hook for protocol monitoring
export function useProtocolMonitoring(options: { updateInterval?: number } = {}) {
  const { updateInterval = 2000 } = options;
  const gateway = useProtocolGateway({ updateInterval });
  
  const getProtocolHealth = useCallback(() => {
    const protocols = gateway.getAvailableProtocols();
    return protocols.reduce((health, protocol) => {
      health[protocol] = gateway.isProtocolHealthy(protocol);
      return health;
    }, {} as Record<ProtocolType, boolean>);
  }, [gateway]);
  
  const getSystemHealth = useCallback(() => {
    const totalDrones = gateway.drones.length;
    const activeDrones = gateway.drones.filter(d => d.status === 'active').length;
    const offlineDrones = gateway.drones.filter(d => d.status === 'offline').length;
    
    return {
      totalDrones,
      activeDrones,
      offlineDrones,
      systemHealth: totalDrones > 0 ? (activeDrones / totalDrones) * 100 : 0,
      protocolHealth: getProtocolHealth()
    };
  }, [gateway.drones, getProtocolHealth]);
  
  return {
    ...gateway,
    getProtocolHealth,
    getSystemHealth
  };
}

export default useProtocolGateway;
