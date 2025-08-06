// MAVLink Protocol Adapter for Unified Gateway
// Integrates existing MAVLink implementation with the protocol gateway

import { ProtocolAdapter, ProtocolType, UnifiedMessage, MessagePriority } from '../protocol-gateway';
import { MAVLinkClient, MAVMode, MAVResult } from '../mavlink';
import { Drone, DroneStatus } from '../types';

interface MAVLinkAdapterConfig {
  url?: string;
  connectionTimeout?: number;
  heartbeatInterval?: number;
  commandTimeout?: number;
}

export class MAVLinkAdapter implements ProtocolAdapter {
  public readonly protocolType = ProtocolType.MAVLINK;
  private client: MAVLinkClient;
  private config: MAVLinkAdapterConfig;
  private connected: boolean = false;
  private drones: Drone[] = [];
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private healthStatus: boolean = true;
  private lastHealthCheck: number = 0;

  constructor(config: MAVLinkAdapterConfig = {}) {
    this.config = {
      url: 'ws://localhost:5760',
      connectionTimeout: 10000,
      heartbeatInterval: 1000,
      commandTimeout: 5000,
      ...config
    };
    
    this.client = MAVLinkClient.getInstance();
    this.setupMessageHandlers();
  }

  public async connect(config?: MAVLinkAdapterConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      console.log(`Connecting MAVLink adapter to ${this.config.url}`);
      
      // Connect the MAVLink client
      this.client.connect(this.config.url);
      
      // Set up drone monitoring
      this.client.addListener((drones) => {
        this.drones = drones;
        this.onDronesUpdated(drones);
      });
      
      // Wait for connection to be established
      await this.waitForConnection();
      
      this.connected = true;
      this.healthStatus = true;
      console.log('MAVLink adapter connected successfully');
    } catch (error) {
      console.error('Failed to connect MAVLink adapter:', error);
      this.connected = false;
      this.healthStatus = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    try {
      this.client.disconnect();
      this.connected = false;
      this.drones = [];
      console.log('MAVLink adapter disconnected');
    } catch (error) {
      console.error('Error disconnecting MAVLink adapter:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected && this.client.isConnected();
  }

  public async sendMessage(message: UnifiedMessage): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('MAVLink adapter not connected');
      return false;
    }

    try {
      const result = await this.executeMAVLinkCommand(message);
      return result === MAVResult.ACCEPTED;
    } catch (error) {
      console.error('Failed to send MAVLink message:', error);
      return false;
    }
  }

  public translateIncoming(rawMessage: any): UnifiedMessage | null {
    if (!rawMessage || !rawMessage.id) {
      return null;
    }

    // Translate MAVLink message to unified format
    const unifiedMessage: UnifiedMessage = {
      id: `mavlink_${rawMessage.sysid}_${rawMessage.compid}_${Date.now()}`,
      type: this.mapMAVLinkMessageType(rawMessage.id),
      sourceProtocol: ProtocolType.MAVLINK,
      droneId: `drone-${rawMessage.sysid}-${rawMessage.compid}`,
      priority: this.mapMAVLinkPriority(rawMessage.id),
      timestamp: rawMessage.timestamp || Date.now(),
      data: this.translateMAVLinkData(rawMessage)
    };

    return unifiedMessage;
  }

  public translateOutgoing(message: UnifiedMessage): any {
    // Convert unified message to MAVLink format
    return {
      id: this.mapUnifiedToMAVLinkType(message.type),
      sysid: this.extractSystemId(message.droneId),
      compid: this.extractComponentId(message.droneId),
      payload: this.translateUnifiedData(message.data, message.type),
      timestamp: message.timestamp
    };
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
      // Check if client is connected and responsive
      const isConnected = this.client.isConnected();
      const hasDrones = this.drones.length > 0;
      
      // Consider healthy if connected, or if we have recent drone data
      const recentDroneActivity = this.drones.some(drone => {
        const lastSeen = new Date(drone.nextMaintenance).getTime() - (30 * 24 * 60 * 60 * 1000);
        return (now - lastSeen) < 30000; // 30 seconds
      });
      
      this.healthStatus = isConnected && (hasDrones || recentDroneActivity);
      return this.healthStatus;
    } catch (error) {
      console.error('MAVLink adapter health check failed:', error);
      this.healthStatus = false;
      return false;
    }
  }

  // Private methods

  private setupMessageHandlers(): void {
    // Set up handlers for different MAVLink message types
    this.messageHandlers.set('HEARTBEAT', this.handleHeartbeat.bind(this));
    this.messageHandlers.set('GLOBAL_POSITION_INT', this.handlePosition.bind(this));
    this.messageHandlers.set('SYS_STATUS', this.handleSystemStatus.bind(this));
    this.messageHandlers.set('ATTITUDE', this.handleAttitude.bind(this));
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MAVLink connection timeout'));
      }, this.config.connectionTimeout);
      
      const checkConnection = () => {
        if (this.client.isConnected()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      
      checkConnection();
    });
  }

  private onDronesUpdated(drones: Drone[]): void {
    // Emit event when drones are updated - would integrate with gateway events
    console.log(`MAVLink adapter: ${drones.length} drones active`);
  }

  private async executeMAVLinkCommand(message: UnifiedMessage): Promise<MAVResult> {
    const droneId = message.droneId;
    
    switch (message.type) {
      case 'command':
        return this.executeGenericCommand(droneId, message.data);
      
      case 'mission':
        return this.executeMissionCommand(droneId, message.data);
      
      case 'status':
        return this.executeStatusCommand(droneId, message.data);
      
      default:
        console.warn(`Unknown message type for MAVLink: ${message.type}`);
        return MAVResult.UNSUPPORTED;
    }
  }

  private async executeGenericCommand(droneId: string, data: any): Promise<MAVResult> {
    try {
      switch (data.command) {
        case 'arm':
          await this.client.armDisarm(droneId, true);
          return MAVResult.ACCEPTED;
        
        case 'disarm':
          await this.client.armDisarm(droneId, false);
          return MAVResult.ACCEPTED;
        
        case 'takeoff':
          await this.client.takeoff(droneId, data.altitude || 10);
          return MAVResult.ACCEPTED;
        
        case 'land':
          await this.client.land(droneId);
          return MAVResult.ACCEPTED;
        
        case 'rtl':
          await this.client.returnToLaunch(droneId);
          return MAVResult.ACCEPTED;
        
        case 'goto':
          if (data.position) {
            await this.client.gotoPosition(
              droneId, 
              data.position.lat, 
              data.position.lon, 
              data.position.alt || 10
            );
            return MAVResult.ACCEPTED;
          }
          return MAVResult.FAILED;
        
        case 'set_mode':
          if (data.mode !== undefined) {
            await this.client.setMode(droneId, data.mode);
            return MAVResult.ACCEPTED;
          }
          return MAVResult.FAILED;
        
        default:
          console.warn(`Unknown MAVLink command: ${data.command}`);
          return MAVResult.UNSUPPORTED;
      }
    } catch (error) {
      console.error(`MAVLink command execution failed:`, error);
      return MAVResult.FAILED;
    }
  }

  private async executeMissionCommand(droneId: string, data: any): Promise<MAVResult> {
    // Handle mission-specific commands
    console.log(`Executing mission command for ${droneId}:`, data);
    // Implementation would depend on mission command structure
    return MAVResult.ACCEPTED;
  }

  private async executeStatusCommand(droneId: string, data: any): Promise<MAVResult> {
    // Handle status queries or updates
    console.log(`Executing status command for ${droneId}:`, data);
    return MAVResult.ACCEPTED;
  }

  private mapMAVLinkMessageType(messageId: number): UnifiedMessage['type'] {
    switch (messageId) {
      case 0: // HEARTBEAT
        return 'heartbeat';
      case 1: // SYS_STATUS
        return 'status';
      case 24: // GPS_RAW_INT
      case 33: // GLOBAL_POSITION_INT
        return 'telemetry';
      case 30: // ATTITUDE
        return 'telemetry';
      case 76: // COMMAND_LONG
        return 'command';
      case 39: // MISSION_ITEM
        return 'mission';
      default:
        return 'telemetry';
    }
  }

  private mapMAVLinkPriority(messageId: number): MessagePriority {
    switch (messageId) {
      case 0: // HEARTBEAT
        return MessagePriority.HIGH;
      case 76: // COMMAND_LONG
        return MessagePriority.HIGH;
      case 1: // SYS_STATUS
        return MessagePriority.NORMAL;
      case 33: // GLOBAL_POSITION_INT
        return MessagePriority.NORMAL;
      default:
        return MessagePriority.LOW;
    }
  }

  private mapUnifiedToMAVLinkType(unifiedType: UnifiedMessage['type']): number {
    switch (unifiedType) {
      case 'heartbeat':
        return 0; // HEARTBEAT
      case 'command':
        return 76; // COMMAND_LONG
      case 'status':
        return 1; // SYS_STATUS
      case 'mission':
        return 39; // MISSION_ITEM
      case 'telemetry':
        return 33; // GLOBAL_POSITION_INT
      default:
        return 0;
    }
  }

  private translateMAVLinkData(rawMessage: any): any {
    // Translate MAVLink-specific data structures to unified format
    switch (rawMessage.id) {
      case 0: // HEARTBEAT
        return {
          systemId: rawMessage.sysid,
          componentId: rawMessage.compid,
          type: rawMessage.payload?.type,
          autopilot: rawMessage.payload?.autopilot,
          baseMode: rawMessage.payload?.base_mode,
          customMode: rawMessage.payload?.custom_mode,
          systemStatus: rawMessage.payload?.system_status
        };
      
      case 33: // GLOBAL_POSITION_INT
        return {
          position: {
            lat: rawMessage.payload?.lat / 1e7,
            lon: rawMessage.payload?.lon / 1e7,
            alt: rawMessage.payload?.alt / 1000,
            relativeAlt: rawMessage.payload?.relative_alt / 1000
          },
          velocity: {
            vx: rawMessage.payload?.vx / 100,
            vy: rawMessage.payload?.vy / 100,
            vz: rawMessage.payload?.vz / 100
          },
          heading: rawMessage.payload?.hdg / 100
        };
      
      case 1: // SYS_STATUS
        return {
          battery: {
            voltage: rawMessage.payload?.voltage_battery / 1000,
            current: rawMessage.payload?.current_battery / 100,
            remaining: rawMessage.payload?.battery_remaining
          },
          communication: {
            dropRate: rawMessage.payload?.drop_rate_comm,
            errors: rawMessage.payload?.errors_comm
          },
          load: rawMessage.payload?.load
        };
      
      case 30: // ATTITUDE
        return {
          attitude: {
            roll: rawMessage.payload?.roll,
            pitch: rawMessage.payload?.pitch,
            yaw: rawMessage.payload?.yaw,
            rollSpeed: rawMessage.payload?.rollspeed,
            pitchSpeed: rawMessage.payload?.pitchspeed,
            yawSpeed: rawMessage.payload?.yawspeed
          }
        };
      
      default:
        return rawMessage.payload || {};
    }
  }

  private translateUnifiedData(data: any, messageType: UnifiedMessage['type']): any {
    // Translate unified data structures to MAVLink format
    switch (messageType) {
      case 'command':
        return {
          target_system: this.extractSystemId(data.droneId || ''),
          target_component: 1,
          command: data.command,
          confirmation: 0,
          param1: data.param1 || 0,
          param2: data.param2 || 0,
          param3: data.param3 || 0,
          param4: data.param4 || 0,
          param5: data.param5 || 0,
          param6: data.param6 || 0,
          param7: data.param7 || 0
        };
      
      case 'mission':
        return {
          target_system: this.extractSystemId(data.droneId || ''),
          target_component: 1,
          seq: data.sequence || 0,
          frame: data.frame || 0,
          command: data.command || 16, // NAV_WAYPOINT
          current: data.current || 0,
          autocontinue: data.autocontinue || 1,
          param1: data.param1 || 0,
          param2: data.param2 || 0,
          param3: data.param3 || 0,
          param4: data.param4 || 0,
          x: data.x || 0,
          y: data.y || 0,
          z: data.z || 0
        };
      
      default:
        return data;
    }
  }

  private extractSystemId(droneId: string): number {
    // Extract system ID from drone ID (format: "drone-{sysid}-{compid}")
    const parts = droneId.split('-');
    return parts.length > 1 ? parseInt(parts[1], 10) : 1;
  }

  private extractComponentId(droneId: string): number {
    // Extract component ID from drone ID
    const parts = droneId.split('-');
    return parts.length > 2 ? parseInt(parts[2], 10) : 1;
  }

  // Message handlers for processing incoming MAVLink messages
  private handleHeartbeat(message: any): void {
    // Process heartbeat message
    console.log(`Heartbeat from system ${message.sysid}`);
  }

  private handlePosition(message: any): void {
    // Process position message
    console.log(`Position update from system ${message.sysid}`);
  }

  private handleSystemStatus(message: any): void {
    // Process system status message
    console.log(`System status from system ${message.sysid}`);
  }

  private handleAttitude(message: any): void {
    // Process attitude message
    console.log(`Attitude update from system ${message.sysid}`);
  }
}

export default MAVLinkAdapter;
