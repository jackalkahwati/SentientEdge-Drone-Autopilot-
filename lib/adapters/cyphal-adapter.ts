// Cyphal Protocol Adapter for Unified Gateway
// Integrates Cyphal/UAVCAN implementation with the protocol gateway

import { ProtocolAdapter, ProtocolType, UnifiedMessage, MessagePriority } from '../protocol-gateway';
import { 
  CyphalProtocol, 
  CyphalPriority, 
  CyphalSubject, 
  CyphalNode,
  CyphalMessage,
  DroneStatusPayload,
  PositionPayload 
} from '../cyphal-protocol';
import { Drone, DroneType, DroneStatus } from '../types';

interface CyphalAdapterConfig {
  nodeId: number;
  port?: number;
  multicastAddress?: string;
  redundantPorts?: number[];
  healthCheckInterval?: number;
}

export class CyphalAdapter implements ProtocolAdapter {
  public readonly protocolType = ProtocolType.CYPHAL;
  private cyphal: CyphalProtocol;
  private config: CyphalAdapterConfig;
  private connected: boolean = false;
  private drones: Drone[] = [];
  private nodes: Map<number, CyphalNode> = new Map();
  private healthStatus: boolean = true;
  private lastHealthCheck: number = 0;
  private messageSubscriptions: Map<number, (message: CyphalMessage) => void> = new Map();

  constructor(config: CyphalAdapterConfig) {
    this.config = {
      port: 9382,
      multicastAddress: '239.65.83.72',
      redundantPorts: [],
      healthCheckInterval: 10000,
      ...config
    };
    
    this.cyphal = new CyphalProtocol(
      this.config.nodeId,
      this.config.port,
      this.config.multicastAddress
    );
    
    this.setupSubscriptions();
  }

  public async connect(config?: CyphalAdapterConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      console.log(`Connecting Cyphal adapter as node ${this.config.nodeId}`);
      
      // Add redundant transports if configured
      if (this.config.redundantPorts) {
        for (const port of this.config.redundantPorts) {
          this.cyphal.addRedundantTransport(port);
        }
      }
      
      // Set up event listeners
      this.cyphal.on('node_online', this.handleNodeOnline.bind(this));
      this.cyphal.on('node_offline', this.handleNodeOffline.bind(this));
      this.cyphal.on('drone_status_update', this.handleDroneStatusUpdate.bind(this));
      this.cyphal.on('position_update', this.handlePositionUpdate.bind(this));
      this.cyphal.on('cyphal_message', this.handleCyphalMessage.bind(this));
      
      this.connected = true;
      this.healthStatus = true;
      
      console.log('Cyphal adapter connected successfully');
      
      // Start periodic status updates
      this.startStatusUpdates();
    } catch (error) {
      console.error('Failed to connect Cyphal adapter:', error);
      this.connected = false;
      this.healthStatus = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    try {
      this.cyphal.shutdown();
      this.connected = false;
      this.drones = [];
      this.nodes.clear();
      console.log('Cyphal adapter disconnected');
    } catch (error) {
      console.error('Error disconnecting Cyphal adapter:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async sendMessage(message: UnifiedMessage): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('Cyphal adapter not connected');
      return false;
    }

    try {
      const cyphalMessage = this.translateOutgoing(message);
      const priority = this.mapUnifiedToCyphalPriority(message.priority);
      const subject = this.determineSubject(message);
      
      this.cyphal.publish(subject, cyphalMessage, priority);
      return true;
    } catch (error) {
      console.error('Failed to send Cyphal message:', error);
      return false;
    }
  }

  public translateIncoming(rawMessage: CyphalMessage): UnifiedMessage | null {
    if (!rawMessage || !rawMessage.subject) {
      return null;
    }

    const unifiedMessage: UnifiedMessage = {
      id: `cyphal_${rawMessage.sourceNodeId}_${rawMessage.transferId}_${rawMessage.timestamp}`,
      type: this.mapCyphalMessageType(rawMessage.subject),
      sourceProtocol: ProtocolType.CYPHAL,
      droneId: `cyphal-node-${rawMessage.sourceNodeId}`,
      priority: this.mapCyphalToUnifiedPriority(rawMessage.priority),
      timestamp: rawMessage.timestamp,
      data: this.translateCyphalData(rawMessage),
      hopCount: 0 // Cyphal handles routing internally
    };

    return unifiedMessage;
  }

  public translateOutgoing(message: UnifiedMessage): any {
    // Convert unified message to Cyphal-compatible data structure
    switch (message.type) {
      case 'command':
        return this.translateCommand(message);
      case 'mission':
        return this.translateMission(message);
      case 'status':
        return this.translateStatus(message);
      case 'telemetry':
        return this.translateTelemetry(message);
      case 'heartbeat':
        return this.translateHeartbeat(message);
      default:
        return message.data;
    }
  }

  public getDrones(): Drone[] {
    return [...this.drones];
  }

  public async healthCheck(): Promise<boolean> {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - this.lastHealthCheck < 5000) {
      return this.healthStatus;
    }
    
    this.lastHealthCheck = now;
    
    try {
      // Check if we have active nodes and recent communication
      const activeNodes = this.cyphal.getNodes();
      const recentActivity = activeNodes.some(node => 
        (now - node.lastHeartbeat) < 30000 // 30 seconds
      );
      
      this.healthStatus = this.connected && (activeNodes.length > 0 || recentActivity);
      return this.healthStatus;
    } catch (error) {
      console.error('Cyphal adapter health check failed:', error);
      this.healthStatus = false;
      return false;
    }
  }

  // Private methods

  private setupSubscriptions(): void {
    // Subscribe to key Cyphal subjects
    const subscriptions = [
      { subject: CyphalSubject.HEARTBEAT, handler: this.handleHeartbeatMessage.bind(this) },
      { subject: CyphalSubject.DRONE_STATUS, handler: this.handleDroneStatusMessage.bind(this) },
      { subject: CyphalSubject.POSITION, handler: this.handlePositionMessage.bind(this) },
      { subject: CyphalSubject.BATTERY, handler: this.handleBatteryMessage.bind(this) },
      { subject: CyphalSubject.MISSION_COMMAND, handler: this.handleMissionCommandMessage.bind(this) },
      { subject: CyphalSubject.SWARM_COORDINATION, handler: this.handleSwarmMessage.bind(this) }
    ];

    for (const subscription of subscriptions) {
      this.cyphal.subscribe(subscription.subject, subscription.handler);
      this.messageSubscriptions.set(subscription.subject, subscription.handler);
    }
  }

  private startStatusUpdates(): void {
    // Periodically publish our own status as a ground control station
    setInterval(() => {
      if (this.connected) {
        const status: DroneStatusPayload = {
          droneId: this.config.nodeId,
          armed: false, // GCS is never "armed"
          flightMode: 'ground_control',
          batteryPercent: 100, // GCS power status
          gpsStatus: '3d', // Assume good GPS
          missionStatus: 'idle',
          systemStatus: 'ok'
        };
        
        this.cyphal.publishDroneStatus(status);
      }
    }, 5000); // Every 5 seconds
  }

  private handleNodeOnline(node: CyphalNode): void {
    console.log(`Cyphal node ${node.nodeId} came online`);
    this.nodes.set(node.nodeId, node);
    this.updateDroneFromNode(node);
  }

  private handleNodeOffline(nodeId: number): void {
    console.log(`Cyphal node ${nodeId} went offline`);
    this.nodes.delete(nodeId);
    
    // Mark corresponding drone as offline
    const droneIndex = this.drones.findIndex(drone => 
      drone.id === `cyphal-node-${nodeId}`
    );
    
    if (droneIndex >= 0) {
      this.drones[droneIndex].status = 'offline';
    }
  }

  private handleDroneStatusUpdate(status: DroneStatusPayload): void {
    this.updateDroneFromStatus(status);
  }

  private handlePositionUpdate(data: { nodeId: number; position: PositionPayload }): void {
    const drone = this.drones.find(d => d.id === `cyphal-node-${data.nodeId}`);
    if (drone) {
      drone.location = [data.position.longitude, data.position.latitude];
      drone.altitude = data.position.altitude;
      drone.speed = Math.sqrt(
        data.position.velocity[0] ** 2 + 
        data.position.velocity[1] ** 2
      );
    }
  }

  private handleCyphalMessage(message: CyphalMessage): void {
    // Process any Cyphal message for translation
    const unifiedMessage = this.translateIncoming(message);
    if (unifiedMessage) {
      // Emit to gateway for further processing
      console.log(`Received Cyphal message: ${unifiedMessage.type} from ${unifiedMessage.droneId}`);
    }
  }

  private updateDroneFromNode(node: CyphalNode): void {
    const droneId = `cyphal-node-${node.nodeId}`;
    let drone = this.drones.find(d => d.id === droneId);
    
    if (!drone) {
      drone = {
        id: droneId,
        name: node.name || `Cyphal Node ${node.nodeId}`,
        type: this.inferDroneType(node),
        status: this.mapCyphalHealthToStatus(node.health),
        battery: 100, // Will be updated from battery messages
        signal: 100, // Cyphal doesn't have direct signal strength
        missionCount: 0,
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        model: `Cyphal ${node.softwareVersion}`,
        serialNumber: node.uniqueId.toString('hex').substring(0, 16)
      };
      
      this.drones.push(drone);
    } else {
      // Update existing drone
      drone.name = node.name || drone.name;
      drone.status = this.mapCyphalHealthToStatus(node.health);
    }
  }

  private updateDroneFromStatus(status: DroneStatusPayload): void {
    const droneId = `cyphal-node-${status.droneId}`;
    let drone = this.drones.find(d => d.id === droneId);
    
    if (!drone) {
      drone = {
        id: droneId,
        name: `Cyphal Drone ${status.droneId}`,
        type: 'multi', // Default type
        status: this.mapSystemStatusToStatus(status.systemStatus),
        battery: status.batteryPercent,
        signal: 100,
        missionCount: 0,
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        model: `Cyphal Drone`,
        serialNumber: `CYP${status.droneId.toString().padStart(8, '0')}`
      };
      
      this.drones.push(drone);
    } else {
      // Update existing drone
      drone.battery = status.batteryPercent;
      drone.status = this.mapSystemStatusToStatus(status.systemStatus);
    }
  }

  private determineSubject(message: UnifiedMessage): number {
    switch (message.type) {
      case 'heartbeat':
        return CyphalSubject.HEARTBEAT;
      case 'status':
        return CyphalSubject.DRONE_STATUS;
      case 'telemetry':
        // Determine specific telemetry type from data
        if (message.data.position) {
          return CyphalSubject.POSITION;
        } else if (message.data.battery) {
          return CyphalSubject.BATTERY;
        }
        return CyphalSubject.DRONE_STATUS;
      case 'command':
      case 'mission':
        return CyphalSubject.MISSION_COMMAND;
      default:
        return CyphalSubject.DRONE_STATUS;
    }
  }

  private mapCyphalMessageType(subject: number): UnifiedMessage['type'] {
    switch (subject) {
      case CyphalSubject.HEARTBEAT:
        return 'heartbeat';
      case CyphalSubject.DRONE_STATUS:
        return 'status';
      case CyphalSubject.POSITION:
      case CyphalSubject.BATTERY:
        return 'telemetry';
      case CyphalSubject.MISSION_COMMAND:
        return 'command';
      case CyphalSubject.SWARM_COORDINATION:
        return 'mission';
      default:
        return 'telemetry';
    }
  }

  private mapCyphalToUnifiedPriority(cyphalPriority: CyphalPriority): MessagePriority {
    switch (cyphalPriority) {
      case CyphalPriority.EXCEPTIONAL:
      case CyphalPriority.IMMEDIATE:
        return MessagePriority.CRITICAL;
      case CyphalPriority.FAST:
      case CyphalPriority.HIGH:
        return MessagePriority.HIGH;
      case CyphalPriority.NOMINAL:
        return MessagePriority.NORMAL;
      case CyphalPriority.LOW:
      case CyphalPriority.SLOW:
        return MessagePriority.LOW;
      case CyphalPriority.OPTIONAL:
        return MessagePriority.BACKGROUND;
      default:
        return MessagePriority.NORMAL;
    }
  }

  private mapUnifiedToCyphalPriority(unifiedPriority: MessagePriority): CyphalPriority {
    switch (unifiedPriority) {
      case MessagePriority.CRITICAL:
        return CyphalPriority.EXCEPTIONAL;
      case MessagePriority.HIGH:
        return CyphalPriority.FAST;
      case MessagePriority.NORMAL:
        return CyphalPriority.NOMINAL;
      case MessagePriority.LOW:
        return CyphalPriority.LOW;
      case MessagePriority.BACKGROUND:
        return CyphalPriority.OPTIONAL;
      default:
        return CyphalPriority.NOMINAL;
    }
  }

  private mapCyphalHealthToStatus(health: string): DroneStatus {
    switch (health) {
      case 'nominal':
        return 'active';
      case 'advisory':
        return 'idle';
      case 'caution':
      case 'warning':
        return 'maintenance';
      default:
        return 'offline';
    }
  }

  private mapSystemStatusToStatus(systemStatus: string): DroneStatus {
    switch (systemStatus) {
      case 'ok':
        return 'active';
      case 'warning':
        return 'idle';
      case 'error':
      case 'critical':
        return 'maintenance';
      default:
        return 'offline';
    }
  }

  private inferDroneType(node: CyphalNode): DroneType {
    // Try to infer drone type from node information
    const name = node.name.toLowerCase();
    
    if (name.includes('surveillance') || name.includes('camera')) {
      return 'surveillance';
    } else if (name.includes('transport') || name.includes('cargo')) {
      return 'transport';
    } else if (name.includes('recon') || name.includes('scout')) {
      return 'recon';
    } else if (name.includes('attack') || name.includes('weapon')) {
      return 'attack';
    }
    
    return 'multi'; // Default
  }

  private translateCyphalData(message: CyphalMessage): any {
    try {
      const data = JSON.parse(message.payload.toString('utf8'));
      
      switch (message.subject) {
        case CyphalSubject.HEARTBEAT:
          return {
            nodeId: message.sourceNodeId,
            health: data.health,
            mode: data.mode,
            uptime: data.uptime
          };
        
        case CyphalSubject.POSITION:
          return {
            position: {
              lat: data.latitude,
              lon: data.longitude,
              alt: data.altitude
            },
            velocity: data.velocity,
            accuracy: data.accuracy
          };
        
        case CyphalSubject.BATTERY:
          return {
            battery: {
              percent: data.batteryPercent,
              voltage: data.voltage,
              current: data.current
            }
          };
        
        case CyphalSubject.DRONE_STATUS:
          return {
            droneId: data.droneId,
            armed: data.armed,
            flightMode: data.flightMode,
            batteryPercent: data.batteryPercent,
            gpsStatus: data.gpsStatus,
            missionStatus: data.missionStatus,
            systemStatus: data.systemStatus
          };
        
        default:
          return data;
      }
    } catch (error) {
      console.error('Error parsing Cyphal message data:', error);
      return {};
    }
  }

  private translateCommand(message: UnifiedMessage): any {
    return {
      targetNodeId: this.extractNodeId(message.droneId),
      command: message.data.command,
      parameters: message.data.parameters || {},
      timestamp: message.timestamp
    };
  }

  private translateMission(message: UnifiedMessage): any {
    return {
      targetNodeId: this.extractNodeId(message.droneId),
      missionData: message.data,
      timestamp: message.timestamp
    };
  }

  private translateStatus(message: UnifiedMessage): DroneStatusPayload {
    const nodeId = this.extractNodeId(message.droneId);
    
    return {
      droneId: nodeId,
      armed: message.data.armed || false,
      flightMode: message.data.flightMode || 'unknown',
      batteryPercent: message.data.battery?.percent || 0,
      gpsStatus: message.data.gps?.status || 'no_fix',
      missionStatus: message.data.mission?.status || 'idle',
      systemStatus: message.data.system?.status || 'ok'
    };
  }

  private translateTelemetry(message: UnifiedMessage): any {
    if (message.data.position) {
      return {
        latitude: message.data.position.lat,
        longitude: message.data.position.lon,
        altitude: message.data.position.alt,
        velocity: message.data.velocity || [0, 0, 0],
        accuracy: message.data.position.accuracy || 2.5
      };
    } else if (message.data.battery) {
      return {
        batteryPercent: message.data.battery.percent,
        voltage: message.data.battery.voltage,
        current: message.data.battery.current,
        nodeId: this.extractNodeId(message.droneId)
      };
    }
    
    return message.data;
  }

  private translateHeartbeat(message: UnifiedMessage): any {
    return {
      nodeId: this.extractNodeId(message.droneId),
      health: message.data.health || 'nominal',
      mode: message.data.mode || 'operational',
      uptime: message.data.uptime || 0
    };
  }

  private extractNodeId(droneId: string): number {
    // Extract node ID from drone ID (format: "cyphal-node-{nodeId}")
    const parts = droneId.split('-');
    return parts.length > 2 ? parseInt(parts[2], 10) : this.config.nodeId;
  }

  // Message handlers
  private handleHeartbeatMessage(message: CyphalMessage): void {
    console.log(`Cyphal heartbeat from node ${message.sourceNodeId}`);
  }

  private handleDroneStatusMessage(message: CyphalMessage): void {
    console.log(`Cyphal drone status from node ${message.sourceNodeId}`);
  }

  private handlePositionMessage(message: CyphalMessage): void {
    console.log(`Cyphal position update from node ${message.sourceNodeId}`);
  }

  private handleBatteryMessage(message: CyphalMessage): void {
    console.log(`Cyphal battery update from node ${message.sourceNodeId}`);
  }

  private handleMissionCommandMessage(message: CyphalMessage): void {
    console.log(`Cyphal mission command from node ${message.sourceNodeId}`);
  }

  private handleSwarmMessage(message: CyphalMessage): void {
    console.log(`Cyphal swarm coordination from node ${message.sourceNodeId}`);
  }
}

export default CyphalAdapter;
