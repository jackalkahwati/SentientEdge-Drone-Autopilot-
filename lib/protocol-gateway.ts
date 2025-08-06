// Unified Protocol Translation Gateway
// Provides seamless interoperability between MAVLink, Cyphal, and future protocols

import { EventEmitter } from 'events';
import { webSocketService } from './websocket';
import { MAVLinkClient, MAVMode, MAVResult } from './mavlink';
import { CyphalProtocol, CyphalPriority, CyphalSubject } from './cyphal-protocol';
import { Drone, DroneStatus, DroneType } from './types';

// Protocol types supported by the gateway
export enum ProtocolType {
  MAVLINK = 'mavlink',
  CYPHAL = 'cyphal',
  PROPRIETARY = 'proprietary',
  AUTO_DETECT = 'auto'
}

// Message priority levels (unified across protocols)
export enum MessagePriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4
}

// Unified message structure for protocol translation
export interface UnifiedMessage {
  id: string;
  type: 'telemetry' | 'command' | 'status' | 'mission' | 'heartbeat';
  sourceProtocol: ProtocolType;
  targetProtocol?: ProtocolType;
  droneId: string;
  priority: MessagePriority;
  timestamp: number;
  data: any;
  routingPath?: string[];
  hopCount?: number;
  requiresAck?: boolean;
  timeout?: number;
}

// Protocol adapter interface for extensibility
export interface ProtocolAdapter {
  readonly protocolType: ProtocolType;
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendMessage(message: UnifiedMessage): Promise<boolean>;
  translateIncoming(rawMessage: any): UnifiedMessage | null;
  translateOutgoing(message: UnifiedMessage): any;
  getDrones(): Drone[];
  healthCheck(): Promise<boolean>;
}

// Configuration for protocol endpoints
export interface ProtocolEndpoint {
  id: string;
  protocol: ProtocolType;
  config: any;
  priority: number; // Higher number = higher priority
  redundant?: boolean;
  healthCheckInterval?: number;
}

// Drone communication capabilities
export interface DroneCapabilities {
  droneId: string;
  supportedProtocols: ProtocolType[];
  primaryProtocol: ProtocolType;
  backupProtocols: ProtocolType[];
  meshCapable: boolean;
  lastSeen: number;
  communicationQuality: Record<ProtocolType, number>; // 0-100 quality score
}

// Message routing strategy
export enum RoutingStrategy {
  DIRECT = 'direct',           // Direct to drone via best protocol
  REDUNDANT = 'redundant',     // Send via multiple protocols
  MESH = 'mesh',               // Route through mesh network
  FAILOVER = 'failover'        // Try protocols in priority order
}

// Translation mapping between protocols
export interface MessageMapping {
  sourceType: string;
  targetType: string;
  transform?: (data: any) => any;
  bidirectional?: boolean;
}

class ProtocolTranslationGateway extends EventEmitter {
  private adapters: Map<ProtocolType, ProtocolAdapter> = new Map();
  private endpoints: Map<string, ProtocolEndpoint> = new Map();
  private droneCapabilities: Map<string, DroneCapabilities> = new Map();
  private messageQueue: Map<string, UnifiedMessage[]> = new Map();
  private routingTable: Map<string, { protocol: ProtocolType; endpoint: string; quality: number }[]> = new Map();
  private translationMappings: Map<string, MessageMapping> = new Map();
  private performanceMetrics: Map<string, { latency: number; success: number; failure: number }> = new Map();
  private isRunning: boolean = false;

  constructor() {
    super();
    this.initializeTranslationMappings();
    this.startHealthMonitoring();
    this.startPerformanceAnalysis();
  }

  // Initialize protocol translation mappings
  private initializeTranslationMappings(): void {
    // MAVLink <-> Cyphal mappings
    this.addTranslationMapping({
      sourceType: 'mavlink:HEARTBEAT',
      targetType: 'cyphal:HEARTBEAT',
      transform: (data) => ({
        nodeId: data.sysid,
        health: this.mapMAVStateToHealth(data.system_status),
        mode: this.mapMAVModeToOperational(data.base_mode),
        uptime: data.time_boot_ms || 0
      }),
      bidirectional: true
    });

    this.addTranslationMapping({
      sourceType: 'mavlink:GLOBAL_POSITION_INT',
      targetType: 'cyphal:POSITION',
      transform: (data) => ({
        latitude: data.lat / 1e7,
        longitude: data.lon / 1e7,
        altitude: data.alt / 1000,
        velocity: [data.vx / 100, data.vy / 100, data.vz / 100],
        accuracy: 2.5 // Default GPS accuracy
      })
    });

    this.addTranslationMapping({
      sourceType: 'mavlink:SYS_STATUS',
      targetType: 'cyphal:BATTERY',
      transform: (data) => ({
        batteryPercent: data.battery_remaining,
        voltage: data.voltage_battery / 1000,
        current: data.current_battery / 100
      })
    });

    this.addTranslationMapping({
      sourceType: 'cyphal:DRONE_STATUS',
      targetType: 'mavlink:HEARTBEAT',
      transform: (data) => ({
        type: this.mapDroneTypeToMAV(data.droneId),
        autopilot: 3, // ArduPilot
        base_mode: data.armed ? 128 : 0,
        custom_mode: 0,
        system_status: this.mapSystemStatusToMAV(data.systemStatus)
      })
    });
  }

  // Add protocol adapter
  public addAdapter(adapter: ProtocolAdapter): void {
    this.adapters.set(adapter.protocolType, adapter);
    console.log(`Added protocol adapter: ${adapter.protocolType}`);
  }

  // Add protocol endpoint configuration
  public addEndpoint(endpoint: ProtocolEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint);
    console.log(`Added protocol endpoint: ${endpoint.id} (${endpoint.protocol})`);
  }

  // Start the gateway with all configured endpoints
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Gateway is already running');
      return;
    }

    console.log('Starting Protocol Translation Gateway...');

    // Initialize all protocol adapters
    for (const [endpointId, endpoint] of this.endpoints) {
      const adapter = this.adapters.get(endpoint.protocol);
      if (adapter) {
        try {
          await adapter.connect(endpoint.config);
          console.log(`Connected to ${endpointId} (${endpoint.protocol})`);
          
          // Set up message handling for this adapter
          this.setupAdapterListeners(adapter, endpointId);
        } catch (error) {
          console.error(`Failed to connect to ${endpointId}:`, error);
        }
      } else {
        console.warn(`No adapter found for protocol ${endpoint.protocol}`);
      }
    }

    // Connect to WebSocket service for web client integration
    if (webSocketService) {
      webSocketService.connect();
      webSocketService.subscribe('protocol_command', (data) => {
        this.handleWebSocketCommand(data);
      });
    }

    this.isRunning = true;
    this.emit('gateway:started');
    console.log('Protocol Translation Gateway started successfully');
  }

  // Stop the gateway and disconnect all adapters
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping Protocol Translation Gateway...');

    for (const adapter of this.adapters.values()) {
      try {
        await adapter.disconnect();
      } catch (error) {
        console.error('Error disconnecting adapter:', error);
      }
    }

    if (webSocketService) {
      webSocketService.disconnect();
    }

    this.isRunning = false;
    this.emit('gateway:stopped');
    console.log('Protocol Translation Gateway stopped');
  }

  // Send message to drone with automatic protocol selection and translation
  public async sendToDrone(
    droneId: string, 
    message: Partial<UnifiedMessage>, 
    strategy: RoutingStrategy = RoutingStrategy.DIRECT
  ): Promise<boolean> {
    const unifiedMessage: UnifiedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: message.type || 'command',
      sourceProtocol: ProtocolType.AUTO_DETECT,
      droneId,
      priority: message.priority || MessagePriority.NORMAL,
      timestamp: Date.now(),
      data: message.data,
      requiresAck: message.requiresAck || false,
      timeout: message.timeout || 5000,
      ...message
    };

    const droneCapabilities = this.droneCapabilities.get(droneId);
    if (!droneCapabilities) {
      console.warn(`No capabilities found for drone ${droneId}`);
      return false;
    }

    switch (strategy) {
      case RoutingStrategy.DIRECT:
        return this.sendDirect(unifiedMessage, droneCapabilities);
      
      case RoutingStrategy.REDUNDANT:
        return this.sendRedundant(unifiedMessage, droneCapabilities);
      
      case RoutingStrategy.MESH:
        return this.sendViaMesh(unifiedMessage, droneCapabilities);
      
      case RoutingStrategy.FAILOVER:
        return this.sendWithFailover(unifiedMessage, droneCapabilities);
      
      default:
        return this.sendDirect(unifiedMessage, droneCapabilities);
    }
  }

  // Direct send to drone via best available protocol
  private async sendDirect(message: UnifiedMessage, capabilities: DroneCapabilities): Promise<boolean> {
    const bestProtocol = this.selectBestProtocol(capabilities);
    if (!bestProtocol) {
      console.error(`No available protocol for drone ${message.droneId}`);
      return false;
    }

    const adapter = this.adapters.get(bestProtocol);
    if (!adapter || !adapter.isConnected()) {
      console.error(`Adapter for ${bestProtocol} not available`);
      return false;
    }

    // Translate message if needed
    const translatedMessage = this.translateMessage(message, bestProtocol);
    if (!translatedMessage) {
      console.error(`Failed to translate message for ${bestProtocol}`);
      return false;
    }

    const startTime = Date.now();
    try {
      const success = await adapter.sendMessage(translatedMessage);
      this.recordPerformanceMetric(bestProtocol, Date.now() - startTime, success);
      return success;
    } catch (error) {
      console.error(`Failed to send message via ${bestProtocol}:`, error);
      this.recordPerformanceMetric(bestProtocol, Date.now() - startTime, false);
      return false;
    }
  }

  // Send via multiple protocols for redundancy
  private async sendRedundant(message: UnifiedMessage, capabilities: DroneCapabilities): Promise<boolean> {
    const availableProtocols = capabilities.supportedProtocols.filter(protocol => {
      const adapter = this.adapters.get(protocol);
      return adapter && adapter.isConnected();
    });

    if (availableProtocols.length === 0) {
      console.error(`No available protocols for drone ${message.droneId}`);
      return false;
    }

    const promises = availableProtocols.map(async (protocol) => {
      const adapter = this.adapters.get(protocol);
      if (!adapter) return false;

      const translatedMessage = this.translateMessage(message, protocol);
      if (!translatedMessage) return false;

      const startTime = Date.now();
      try {
        const success = await adapter.sendMessage(translatedMessage);
        this.recordPerformanceMetric(protocol, Date.now() - startTime, success);
        return success;
      } catch (error) {
        console.error(`Redundant send failed via ${protocol}:`, error);
        this.recordPerformanceMetric(protocol, Date.now() - startTime, false);
        return false;
      }
    });

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`Redundant send: ${successCount}/${availableProtocols.length} protocols succeeded`);
    return successCount > 0;
  }

  // Send via mesh network (route through intermediate drones)
  private async sendViaMesh(message: UnifiedMessage, capabilities: DroneCapabilities): Promise<boolean> {
    if (!capabilities.meshCapable) {
      console.warn(`Drone ${message.droneId} is not mesh capable, falling back to direct`);
      return this.sendDirect(message, capabilities);
    }

    // Find mesh route to target drone
    const route = this.findMeshRoute(message.droneId);
    if (!route || route.length === 0) {
      console.warn(`No mesh route found for drone ${message.droneId}`);
      return this.sendDirect(message, capabilities);
    }

    // Add routing information to message
    message.routingPath = route;
    message.hopCount = 0;

    // Send to first hop in the route
    const nextHop = route[0];
    const nextHopCapabilities = this.droneCapabilities.get(nextHop);
    if (!nextHopCapabilities) {
      console.error(`No capabilities found for next hop ${nextHop}`);
      return false;
    }

    return this.sendDirect(message, nextHopCapabilities);
  }

  // Send with automatic failover between protocols
  private async sendWithFailover(message: UnifiedMessage, capabilities: DroneCapabilities): Promise<boolean> {
    const protocolsByPriority = this.getProtocolsByPriority(capabilities);
    
    for (const protocol of protocolsByPriority) {
      const adapter = this.adapters.get(protocol);
      if (!adapter || !adapter.isConnected()) {
        continue;
      }

      const translatedMessage = this.translateMessage(message, protocol);
      if (!translatedMessage) {
        continue;
      }

      const startTime = Date.now();
      try {
        const success = await adapter.sendMessage(translatedMessage);
        this.recordPerformanceMetric(protocol, Date.now() - startTime, success);
        
        if (success) {
          console.log(`Message sent successfully via ${protocol} (failover)`);
          return true;
        }
      } catch (error) {
        console.warn(`Failover attempt via ${protocol} failed:`, error);
        this.recordPerformanceMetric(protocol, Date.now() - startTime, false);
      }
    }

    console.error(`All failover attempts failed for drone ${message.droneId}`);
    return false;
  }

  // Translate message between protocols
  private translateMessage(message: UnifiedMessage, targetProtocol: ProtocolType): UnifiedMessage | null {
    if (message.targetProtocol === targetProtocol || message.sourceProtocol === targetProtocol) {
      // No translation needed
      return { ...message, targetProtocol };
    }

    const mappingKey = `${message.sourceProtocol}:${message.type}`;
    const targetMappingKey = `${targetProtocol}:${message.type}`;
    const mapping = this.translationMappings.get(`${mappingKey}_to_${targetMappingKey}`);

    if (!mapping) {
      // Try to find a generic mapping
      const genericMapping = this.findGenericMapping(message.type, targetProtocol);
      if (!genericMapping) {
        console.warn(`No translation mapping found for ${mappingKey} -> ${targetMappingKey}`);
        return null;
      }
      
      return {
        ...message,
        targetProtocol,
        data: genericMapping.transform ? genericMapping.transform(message.data) : message.data
      };
    }

    return {
      ...message,
      targetProtocol,
      data: mapping.transform ? mapping.transform(message.data) : message.data
    };
  }

  // Set up message listeners for protocol adapters
  private setupAdapterListeners(adapter: ProtocolAdapter, endpointId: string): void {
    // In a real implementation, adapters would emit events for incoming messages
    // For now, we'll set up polling to check for new drones
    setInterval(() => {
      try {
        const drones = adapter.getDrones();
        this.updateDroneCapabilities(drones, adapter.protocolType, endpointId);
      } catch (error) {
        console.error(`Error getting drones from ${endpointId}:`, error);
      }
    }, 1000);
  }

  // Update drone capabilities based on discovered drones
  private updateDroneCapabilities(drones: Drone[], protocol: ProtocolType, endpointId: string): void {
    for (const drone of drones) {
      let capabilities = this.droneCapabilities.get(drone.id);
      
      if (!capabilities) {
        capabilities = {
          droneId: drone.id,
          supportedProtocols: [protocol],
          primaryProtocol: protocol,
          backupProtocols: [],
          meshCapable: protocol === ProtocolType.CYPHAL, // Cyphal is mesh-capable by default
          lastSeen: Date.now(),
          communicationQuality: { [protocol]: 100 }
        };
      } else {
        // Update existing capabilities
        if (!capabilities.supportedProtocols.includes(protocol)) {
          capabilities.supportedProtocols.push(protocol);
        }
        capabilities.lastSeen = Date.now();
        capabilities.communicationQuality[protocol] = this.calculateCommunicationQuality(drone, protocol);
      }
      
      this.droneCapabilities.set(drone.id, capabilities);
    }

    // Broadcast updated capabilities to web clients
    if (webSocketService) {
      webSocketService.send('drone_capabilities_update', {
        capabilities: Array.from(this.droneCapabilities.values())
      });
    }
  }

  // Select the best protocol for a drone based on quality and availability
  private selectBestProtocol(capabilities: DroneCapabilities): ProtocolType | null {
    const availableProtocols = capabilities.supportedProtocols.filter(protocol => {
      const adapter = this.adapters.get(protocol);
      return adapter && adapter.isConnected();
    });

    if (availableProtocols.length === 0) {
      return null;
    }

    // Sort by communication quality (highest first)
    availableProtocols.sort((a, b) => {
      const qualityA = capabilities.communicationQuality[a] || 0;
      const qualityB = capabilities.communicationQuality[b] || 0;
      return qualityB - qualityA;
    });

    return availableProtocols[0];
  }

  // Get protocols sorted by priority and quality
  private getProtocolsByPriority(capabilities: DroneCapabilities): ProtocolType[] {
    return capabilities.supportedProtocols
      .filter(protocol => {
        const adapter = this.adapters.get(protocol);
        return adapter && adapter.isConnected();
      })
      .sort((a, b) => {
        // Primary protocol gets highest priority
        if (a === capabilities.primaryProtocol) return -1;
        if (b === capabilities.primaryProtocol) return 1;
        
        // Then sort by communication quality
        const qualityA = capabilities.communicationQuality[a] || 0;
        const qualityB = capabilities.communicationQuality[b] || 0;
        return qualityB - qualityA;
      });
  }

  // Calculate communication quality score for a protocol
  private calculateCommunicationQuality(drone: Drone, protocol: ProtocolType): number {
    let quality = 100;
    
    // Reduce quality based on signal strength
    if (drone.signal !== undefined) {
      quality = Math.min(quality, drone.signal);
    }
    
    // Reduce quality if drone status indicates issues
    if (drone.status === 'maintenance' || drone.status === 'offline') {
      quality *= 0.5;
    }
    
    // Get performance metrics for this protocol
    const metrics = this.performanceMetrics.get(protocol);
    if (metrics) {
      const successRate = metrics.success / (metrics.success + metrics.failure);
      quality *= successRate;
      
      // Penalize high latency
      if (metrics.latency > 1000) {
        quality *= 0.8;
      } else if (metrics.latency > 500) {
        quality *= 0.9;
      }
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  // Find mesh route to target drone
  private findMeshRoute(targetDroneId: string): string[] | null {
    // Simplified mesh routing - in practice would use more sophisticated algorithms
    const routes = this.routingTable.get(targetDroneId);
    if (!routes || routes.length === 0) {
      return null;
    }
    
    // Return the route with highest quality
    const bestRoute = routes.sort((a, b) => b.quality - a.quality)[0];
    return [bestRoute.endpoint]; // Simplified - would contain full path
  }

  // Add translation mapping
  private addTranslationMapping(mapping: MessageMapping): void {
    const key = `${mapping.sourceType}_to_${mapping.targetType}`;
    this.translationMappings.set(key, mapping);
    
    if (mapping.bidirectional) {
      const reverseKey = `${mapping.targetType}_to_${mapping.sourceType}`;
      this.translationMappings.set(reverseKey, {
        sourceType: mapping.targetType,
        targetType: mapping.sourceType,
        transform: mapping.transform, // Would need reverse transform in practice
        bidirectional: false
      });
    }
  }

  // Find generic mapping for message type
  private findGenericMapping(messageType: string, targetProtocol: ProtocolType): MessageMapping | null {
    // Look for wildcard mappings or default transformations
    for (const [key, mapping] of this.translationMappings) {
      if (key.includes(messageType) && key.includes(targetProtocol)) {
        return mapping;
      }
    }
    return null;
  }

  // Record performance metrics
  private recordPerformanceMetric(protocol: ProtocolType, latency: number, success: boolean): void {
    const key = protocol.toString();
    let metrics = this.performanceMetrics.get(key);
    
    if (!metrics) {
      metrics = { latency: 0, success: 0, failure: 0 };
    }
    
    // Update metrics with exponential moving average
    const alpha = 0.1; // Smoothing factor
    metrics.latency = alpha * latency + (1 - alpha) * metrics.latency;
    
    if (success) {
      metrics.success++;
    } else {
      metrics.failure++;
    }
    
    this.performanceMetrics.set(key, metrics);
  }

  // Handle commands from web clients
  private handleWebSocketCommand(data: any): void {
    switch (data.command) {
      case 'send_to_drone':
        this.sendToDrone(data.droneId, data.message, data.strategy);
        break;
        
      case 'get_gateway_status':
        this.sendGatewayStatus();
        break;
        
      case 'switch_protocol':
        this.switchDroneProtocol(data.droneId, data.protocol);
        break;
        
      case 'configure_routing':
        this.configureRouting(data.config);
        break;
    }
  }

  // Send gateway status to web clients
  private sendGatewayStatus(): void {
    if (!webSocketService) return;
    
    const status = {
      type: 'gateway_status',
      isRunning: this.isRunning,
      adapters: Array.from(this.adapters.entries()).map(([type, adapter]) => ({
        protocol: type,
        connected: adapter.isConnected()
      })),
      endpoints: Array.from(this.endpoints.values()),
      droneCapabilities: Array.from(this.droneCapabilities.values()),
      performanceMetrics: Object.fromEntries(this.performanceMetrics)
    };
    
    webSocketService.send('gateway_status', status);
  }

  // Switch drone's primary protocol
  private switchDroneProtocol(droneId: string, newProtocol: ProtocolType): void {
    const capabilities = this.droneCapabilities.get(droneId);
    if (!capabilities) {
      console.warn(`Cannot switch protocol for unknown drone ${droneId}`);
      return;
    }
    
    if (!capabilities.supportedProtocols.includes(newProtocol)) {
      console.warn(`Drone ${droneId} does not support protocol ${newProtocol}`);
      return;
    }
    
    capabilities.primaryProtocol = newProtocol;
    console.log(`Switched drone ${droneId} to primary protocol ${newProtocol}`);
    
    this.emit('protocol:switched', { droneId, protocol: newProtocol });
  }

  // Configure routing parameters
  private configureRouting(config: any): void {
    console.log('Configuring routing:', config);
    // Implement routing configuration logic
  }

  // Start health monitoring for all adapters
  private startHealthMonitoring(): void {
    setInterval(async () => {
      for (const [protocol, adapter] of this.adapters) {
        try {
          const healthy = await adapter.healthCheck();
          if (!healthy) {
            console.warn(`Health check failed for ${protocol} adapter`);
            this.emit('adapter:unhealthy', { protocol, adapter });
          }
        } catch (error) {
          console.error(`Health check error for ${protocol}:`, error);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  // Start performance analysis
  private startPerformanceAnalysis(): void {
    setInterval(() => {
      // Analyze performance metrics and emit alerts for poor performance
      for (const [protocol, metrics] of this.performanceMetrics) {
        const successRate = metrics.success / (metrics.success + metrics.failure);
        
        if (successRate < 0.8) {
          console.warn(`Low success rate for ${protocol}: ${(successRate * 100).toFixed(1)}%`);
          this.emit('performance:warning', { protocol, successRate, metrics });
        }
        
        if (metrics.latency > 2000) {
          console.warn(`High latency for ${protocol}: ${metrics.latency.toFixed(0)}ms`);
          this.emit('performance:warning', { protocol, latency: metrics.latency, metrics });
        }
      }
    }, 30000); // Analyze every 30 seconds
  }

  // Utility methods for protocol mapping
  private mapMAVStateToHealth(state: number): string {
    switch (state) {
      case 0: case 1: case 2: return 'caution';
      case 3: return 'nominal';
      case 4: return 'nominal';
      case 5: return 'warning';
      case 6: return 'warning';
      default: return 'caution';
    }
  }

  private mapMAVModeToOperational(mode: number): string {
    return (mode & 128) ? 'operational' : 'initialization';
  }

  private mapDroneTypeToMAV(droneId: string): number {
    // Default to quadrotor
    return 2;
  }

  private mapSystemStatusToMAV(status: string): number {
    switch (status) {
      case 'ok': return 4;
      case 'warning': return 5;
      case 'error': case 'critical': return 6;
      default: return 3;
    }
  }

  // Getters for external access
  public getAdapters(): Map<ProtocolType, ProtocolAdapter> {
    return new Map(this.adapters);
  }

  public getDroneCapabilities(): Map<string, DroneCapabilities> {
    return new Map(this.droneCapabilities);
  }

  public getPerformanceMetrics(): Map<string, { latency: number; success: number; failure: number }> {
    return new Map(this.performanceMetrics);
  }

  public isGatewayRunning(): boolean {
    return this.isRunning;
  }
}

export default ProtocolTranslationGateway;
export { ProtocolTranslationGateway };
