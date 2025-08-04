// Cyphal (UAVCAN v1) Protocol Implementation
// Provides real-time distributed communication as alternative to MAVLink

import { EventEmitter } from 'events';
import dgram from 'dgram';

// Cyphal message priorities (0 = highest, 7 = lowest)
enum CyphalPriority {
  EXCEPTIONAL = 0,
  IMMEDIATE = 1,
  FAST = 2,
  HIGH = 3,
  NOMINAL = 4,
  LOW = 5,
  SLOW = 6,
  OPTIONAL = 7
}

// Cyphal transport types
enum TransportType {
  MESSAGE = 0,
  SERVICE_REQUEST = 1,
  SERVICE_RESPONSE = 2
}

// Standard Cyphal subjects (message types)
enum CyphalSubject {
  HEARTBEAT = 7509,
  NODE_LIST = 7510,
  NODE_INFO = 430,
  DRONE_STATUS = 8001, // Custom subject for drone status
  POSITION = 8002,     // Custom subject for position
  BATTERY = 8003,      // Custom subject for battery status
  MISSION_COMMAND = 8004, // Custom subject for mission commands
  SWARM_COORDINATION = 8005 // Custom subject for swarm coordination
}

// Cyphal node information
interface CyphalNode {
  nodeId: number;
  name: string;
  softwareVersion: string;
  hardwareVersion: string;
  uniqueId: Buffer;
  lastHeartbeat: number;
  health: 'nominal' | 'advisory' | 'caution' | 'warning';
  mode: 'operational' | 'initialization' | 'maintenance' | 'software_update';
  uptime: number;
}

// Cyphal message structure
interface CyphalMessage {
  priority: CyphalPriority;
  subject: number;
  sourceNodeId: number;
  transferId: number;
  payload: Buffer;
  timestamp: number;
  transportType: TransportType;
}

// Position message payload
interface PositionPayload {
  latitude: number;  // degrees
  longitude: number; // degrees
  altitude: number;  // meters
  velocity: [number, number, number]; // m/s [x, y, z]
  accuracy: number;  // meters
}

// Swarm coordination message
interface SwarmCoordinationPayload {
  swarmId: number;
  formation: 'grid' | 'circle' | 'line' | 'vee' | 'custom';
  role: 'leader' | 'follower' | 'coordinator';
  targetPosition?: [number, number, number];
  formationParameters: Record<string, any>;
  timestamp: number;
}

// Drone status message
interface DroneStatusPayload {
  droneId: number;
  armed: boolean;
  flightMode: string;
  batteryPercent: number;
  gpsStatus: 'no_fix' | '2d' | '3d' | 'dgps' | 'rtk';
  missionStatus: 'idle' | 'active' | 'completed' | 'failed';
  systemStatus: 'ok' | 'warning' | 'error' | 'critical';
}

class CyphalProtocol extends EventEmitter {
  private socket: dgram.Socket;
  private nodeId: number;
  private nodes: Map<number, CyphalNode> = new Map();
  private subscriptions: Map<number, Set<(message: CyphalMessage) => void>> = new Map();
  private transferIdCounter: number = 0;
  private port: number;
  private multicastAddress: string;
  private redundantTransports: dgram.Socket[] = [];

  constructor(nodeId: number, port: number = 9382, multicastAddress: string = '239.65.83.72') {
    super();
    this.nodeId = nodeId;
    this.port = port;
    this.multicastAddress = multicastAddress;
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    this.initialize();
    this.startHeartbeat();
    this.startNodeDiscovery();
  }

  private initialize(): void {
    // Bind to multicast address for Cyphal communication
    this.socket.bind(this.port, () => {
      console.log(`Cyphal node ${this.nodeId} bound to port ${this.port}`);
      
      // Join multicast group
      this.socket.addMembership(this.multicastAddress);
      this.socket.setMulticastTTL(1);
      this.socket.setMulticastLoopback(true);
    });

    // Handle incoming messages
    this.socket.on('message', (msg, rinfo) => {
      try {
        const cyphalMessage = this.decodeCyphalMessage(msg);
        if (cyphalMessage) {
          this.handleIncomingMessage(cyphalMessage);
        }
      } catch (error) {
        console.error('Error processing Cyphal message:', error);
      }
    });

    this.socket.on('error', (err) => {
      console.error('Cyphal socket error:', err);
    });
  }

  // Add redundant transport for improved reliability
  addRedundantTransport(port: number): void {
    const redundantSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    redundantSocket.bind(port, () => {
      console.log(`Cyphal redundant transport added on port ${port}`);
      redundantSocket.addMembership(this.multicastAddress);
    });

    redundantSocket.on('message', (msg, rinfo) => {
      try {
        const cyphalMessage = this.decodeCyphalMessage(msg);
        if (cyphalMessage) {
          this.handleIncomingMessage(cyphalMessage);
        }
      } catch (error) {
        console.error('Error processing redundant Cyphal message:', error);
      }
    });

    this.redundantTransports.push(redundantSocket);
  }

  // Subscribe to specific Cyphal subjects
  subscribe(subject: number, callback: (message: CyphalMessage) => void): void {
    if (!this.subscriptions.has(subject)) {
      this.subscriptions.set(subject, new Set());
    }
    this.subscriptions.get(subject)!.add(callback);
    console.log(`Subscribed to Cyphal subject ${subject}`);
  }

  // Unsubscribe from Cyphal subjects
  unsubscribe(subject: number, callback: (message: CyphalMessage) => void): void {
    const subscribers = this.subscriptions.get(subject);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscriptions.delete(subject);
      }
    }
  }

  // Publish message to Cyphal network
  publish(subject: number, payload: any, priority: CyphalPriority = CyphalPriority.NOMINAL): void {
    const message: CyphalMessage = {
      priority,
      subject,
      sourceNodeId: this.nodeId,
      transferId: this.getNextTransferId(),
      payload: this.encodePayload(payload),
      timestamp: Date.now(),
      transportType: TransportType.MESSAGE
    };

    const encodedMessage = this.encodeCyphalMessage(message);
    
    // Send on primary transport
    this.socket.send(encodedMessage, this.port, this.multicastAddress, (err) => {
      if (err) {
        console.error('Error sending Cyphal message:', err);
      }
    });

    // Send on redundant transports for critical messages
    if (priority <= CyphalPriority.HIGH) {
      for (const redundantSocket of this.redundantTransports) {
        redundantSocket.send(encodedMessage, this.port, this.multicastAddress);
      }
    }
  }

  // Publish drone status
  publishDroneStatus(status: DroneStatusPayload): void {
    this.publish(CyphalSubject.DRONE_STATUS, status, CyphalPriority.FAST);
  }

  // Publish position update
  publishPosition(position: PositionPayload): void {
    this.publish(CyphalSubject.POSITION, position, CyphalPriority.FAST);
  }

  // Publish battery status
  publishBatteryStatus(batteryPercent: number, voltage: number, current: number): void {
    const batteryData = { batteryPercent, voltage, current, nodeId: this.nodeId };
    this.publish(CyphalSubject.BATTERY, batteryData, CyphalPriority.NOMINAL);
  }

  // Publish swarm coordination message
  publishSwarmCoordination(coordination: SwarmCoordinationPayload): void {
    this.publish(CyphalSubject.SWARM_COORDINATION, coordination, CyphalPriority.HIGH);
  }

  // Send mission command to specific drone
  sendMissionCommand(targetNodeId: number, command: any): void {
    const missionData = { targetNodeId, command, sourceNodeId: this.nodeId };
    this.publish(CyphalSubject.MISSION_COMMAND, missionData, CyphalPriority.IMMEDIATE);
  }

  // Request service from another node
  requestService(targetNodeId: number, serviceId: number, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const transferId = this.getNextTransferId();
      
      const serviceMessage: CyphalMessage = {
        priority: CyphalPriority.FAST,
        subject: serviceId,
        sourceNodeId: this.nodeId,
        transferId,
        payload: this.encodePayload({ targetNodeId, request }),
        timestamp: Date.now(),
        transportType: TransportType.SERVICE_REQUEST
      };

      // Set up response handler
      const responseHandler = (message: CyphalMessage) => {
        if (message.transportType === TransportType.SERVICE_RESPONSE &&
            message.transferId === transferId &&
            message.sourceNodeId === targetNodeId) {
          resolve(this.decodePayload(message.payload));
          this.off('cyphal_message', responseHandler);
        }
      };

      this.on('cyphal_message', responseHandler);

      // Send request
      const encodedMessage = this.encodeCyphalMessage(serviceMessage);
      this.socket.send(encodedMessage, this.port, this.multicastAddress);

      // Set timeout
      setTimeout(() => {
        this.off('cyphal_message', responseHandler);
        reject(new Error('Service request timeout'));
      }, 5000);
    });
  }

  // Handle incoming Cyphal messages
  private handleIncomingMessage(message: CyphalMessage): void {
    // Update node information if it's a heartbeat
    if (message.subject === CyphalSubject.HEARTBEAT) {
      this.updateNodeInfo(message);
    }

    // Emit to subscribers
    const subscribers = this.subscriptions.get(message.subject);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in Cyphal subscription callback:', error);
        }
      }
    }

    // Emit general event
    this.emit('cyphal_message', message);

    // Handle specific message types
    switch (message.subject) {
      case CyphalSubject.DRONE_STATUS:
        this.handleDroneStatus(message);
        break;
      case CyphalSubject.POSITION:
        this.handlePositionUpdate(message);
        break;
      case CyphalSubject.SWARM_COORDINATION:
        this.handleSwarmCoordination(message);
        break;
      case CyphalSubject.MISSION_COMMAND:
        this.handleMissionCommand(message);
        break;
    }
  }

  private handleDroneStatus(message: CyphalMessage): void {
    const status = this.decodePayload(message.payload) as DroneStatusPayload;
    this.emit('drone_status_update', status);
  }

  private handlePositionUpdate(message: CyphalMessage): void {
    const position = this.decodePayload(message.payload) as PositionPayload;
    this.emit('position_update', { nodeId: message.sourceNodeId, position });
  }

  private handleSwarmCoordination(message: CyphalMessage): void {
    const coordination = this.decodePayload(message.payload) as SwarmCoordinationPayload;
    this.emit('swarm_coordination', coordination);
  }

  private handleMissionCommand(message: CyphalMessage): void {
    const command = this.decodePayload(message.payload);
    if (command.targetNodeId === this.nodeId) {
      this.emit('mission_command', command.command);
    }
  }

  // Send periodic heartbeat
  private startHeartbeat(): void {
    setInterval(() => {
      const heartbeat = {
        nodeId: this.nodeId,
        health: 'nominal',
        mode: 'operational',
        uptime: process.uptime()
      };
      this.publish(CyphalSubject.HEARTBEAT, heartbeat, CyphalPriority.NOMINAL);
    }, 1000); // 1 Hz heartbeat
  }

  // Discover other nodes on the network
  private startNodeDiscovery(): void {
    // Request node list periodically
    setInterval(() => {
      this.publish(CyphalSubject.NODE_LIST, { requesterId: this.nodeId }, CyphalPriority.LOW);
    }, 10000); // Every 10 seconds

    // Clean up stale nodes
    setInterval(() => {
      const now = Date.now();
      for (const [nodeId, node] of this.nodes) {
        if (now - node.lastHeartbeat > 30000) { // 30 second timeout
          this.nodes.delete(nodeId);
          this.emit('node_offline', nodeId);
        }
      }
    }, 5000);
  }

  private updateNodeInfo(message: CyphalMessage): void {
    const heartbeatData = this.decodePayload(message.payload);
    const nodeId = message.sourceNodeId;

    if (!this.nodes.has(nodeId)) {
      const newNode: CyphalNode = {
        nodeId,
        name: `Node_${nodeId}`,
        softwareVersion: 'unknown',
        hardwareVersion: 'unknown',
        uniqueId: Buffer.alloc(16),
        lastHeartbeat: Date.now(),
        health: heartbeatData.health || 'nominal',
        mode: heartbeatData.mode || 'operational',
        uptime: heartbeatData.uptime || 0
      };
      this.nodes.set(nodeId, newNode);
      this.emit('node_online', newNode);
    } else {
      const node = this.nodes.get(nodeId)!;
      node.lastHeartbeat = Date.now();
      node.health = heartbeatData.health || node.health;
      node.mode = heartbeatData.mode || node.mode;
      node.uptime = heartbeatData.uptime || node.uptime;
    }
  }

  // Get list of all discovered nodes
  getNodes(): CyphalNode[] {
    return Array.from(this.nodes.values());
  }

  // Get next transfer ID (6-bit counter)
  private getNextTransferId(): number {
    this.transferIdCounter = (this.transferIdCounter + 1) % 64;
    return this.transferIdCounter;
  }

  // Encode payload to buffer (simplified - real implementation would use DSDL)
  private encodePayload(payload: any): Buffer {
    return Buffer.from(JSON.stringify(payload), 'utf8');
  }

  // Decode payload from buffer (simplified - real implementation would use DSDL)
  private decodePayload(buffer: Buffer): any {
    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch {
      return null;
    }
  }

  // Encode Cyphal message to UDP packet (simplified)
  private encodeCyphalMessage(message: CyphalMessage): Buffer {
    const header = Buffer.alloc(8);
    
    // Simplified header encoding
    header.writeUInt8(message.priority << 5 | message.transportType, 0);
    header.writeUInt16BE(message.subject, 1);
    header.writeUInt8(message.sourceNodeId, 3);
    header.writeUInt8(message.transferId, 4);
    header.writeUInt32BE(Math.floor(message.timestamp / 1000), 4);

    return Buffer.concat([header, message.payload]);
  }

  // Decode Cyphal message from UDP packet (simplified)
  private decodeCyphalMessage(buffer: Buffer): CyphalMessage | null {
    if (buffer.length < 8) return null;

    try {
      const priorityAndType = buffer.readUInt8(0);
      const priority = (priorityAndType >> 5) & 0x07;
      const transportType = priorityAndType & 0x03;
      const subject = buffer.readUInt16BE(1);
      const sourceNodeId = buffer.readUInt8(3);
      const transferId = buffer.readUInt8(4);
      const timestamp = buffer.readUInt32BE(4) * 1000;
      const payload = buffer.slice(8);

      return {
        priority,
        subject,
        sourceNodeId,
        transferId,
        payload,
        timestamp,
        transportType
      };
    } catch {
      return null;
    }
  }

  // Shutdown Cyphal node
  shutdown(): void {
    console.log(`Shutting down Cyphal node ${this.nodeId}`);
    this.socket.close();
    for (const redundantSocket of this.redundantTransports) {
      redundantSocket.close();
    }
    this.removeAllListeners();
  }
}

export { CyphalProtocol, CyphalPriority, CyphalSubject, TransportType };
export type { 
  CyphalNode, 
  CyphalMessage, 
  PositionPayload, 
  SwarmCoordinationPayload, 
  DroneStatusPayload 
};

// Example usage:
/*
const cyphalNode = new CyphalProtocol(42); // Node ID 42

// Subscribe to drone status updates
cyphalNode.subscribe(CyphalSubject.DRONE_STATUS, (message) => {
  console.log('Received drone status:', message);
});

// Subscribe to position updates
cyphalNode.subscribe(CyphalSubject.POSITION, (message) => {
  console.log('Received position update:', message);
});

// Publish drone status
cyphalNode.publishDroneStatus({
  droneId: 42,
  armed: true,
  flightMode: 'AUTO',
  batteryPercent: 85,
  gpsStatus: '3d',
  missionStatus: 'active',
  systemStatus: 'ok'
});

// Publish position
cyphalNode.publishPosition({
  latitude: 32.7157,
  longitude: -117.1611,
  altitude: 100,
  velocity: [5, 0, 0],
  accuracy: 1.5
});
*/