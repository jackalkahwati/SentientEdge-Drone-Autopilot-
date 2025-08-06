// Enhanced MAVLink Server with Mesh Networking and Multiple Radio Support
// Addresses John's concerns about radio limitations and distributed communication
// Integrated with ArduCopter-specific message handling

import WebSocket from 'ws';
import dgram from 'dgram';
import { createServer } from 'http';
import { EventEmitter } from 'events';
import { copterMAVLinkHandler, CopterMAVLinkMessageID } from './arducopter-mavlink-handlers';
import { ArduCopterIntegration } from './arducopter-integration';

// Enhanced MAVLink message structure
interface MAVLinkMessage {
  id: number;
  payload: any;
  sysid: number;
  compid: number;
  timestamp: number;
  sourceRadio?: string;
  hopCount?: number;
  routePath?: number[];
}

// Radio connection interface
interface RadioConnection {
  id: string;
  address: string;
  port: number;
  socket: dgram.Socket;
  type: 'primary' | 'backup' | 'mesh';
  status: 'connected' | 'disconnected' | 'error';
  lastHeartbeat: number;
  droneIds: Set<number>; // Which drones this radio can reach
}

// Mesh node for drone-to-drone communication
interface MeshNode {
  droneId: number;
  directNeighbors: Set<number>;
  routingTable: Map<number, { nextHop: number; distance: number }>;
  lastSeen: number;
}

// Enhanced drone information with communication capabilities
interface EnhancedDrone {
  id: number;
  systemId: number;
  componentId: number;
  radios: string[]; // Radio IDs this drone can use
  meshCapable: boolean;
  lastHeartbeat: number;
  position?: { lat: number; lon: number; alt: number };
  status: 'online' | 'offline' | 'limited';
  communicationPath?: number[]; // Path through mesh network
}

class EnhancedMAVLinkServer extends EventEmitter {
  private wss: WebSocket.Server;
  private radioConnections: Map<string, RadioConnection> = new Map();
  private clients: Set<WebSocket> = new Set();
  private drones: Map<number, EnhancedDrone> = new Map();
  private meshNodes: Map<number, MeshNode> = new Map();
  private messageQueue: Map<string, MAVLinkMessage[]> = new Map();
  private routingTable: Map<number, { nextHop: number; distance: number }> = new Map();
  private arduCopterIntegration: ArduCopterIntegration;

  constructor(websocketPort: number) {
    super();
    
    // Initialize ArduCopter integration
    this.arduCopterIntegration = ArduCopterIntegration.getInstance();
    
    // Set up WebSocket server for web clients
    const server = createServer();
    this.wss = new WebSocket.Server({ server });
    server.listen(websocketPort, () => {
      console.log(`Enhanced MAVLink server with ArduCopter integration listening on port ${websocketPort}`);
    });
    
    this.initialize();
    this.startHeartbeatMonitor();
    this.startMeshRouting();
  }

  // Add multiple radio connections for redundancy and extended range
  addRadioConnection(config: {
    id: string;
    address: string;
    port: number;
    type: 'primary' | 'backup' | 'mesh';
  }): void {
    const socket = dgram.createSocket('udp4');
    
    const radioConnection: RadioConnection = {
      ...config,
      socket,
      status: 'disconnected',
      lastHeartbeat: Date.now(),
      droneIds: new Set()
    };

    // Handle incoming messages from this radio
    socket.on('message', (msg, rinfo) => {
      try {
        const mavMessage = this.parseMAVLinkMessage(msg);
        if (mavMessage) {
          mavMessage.sourceRadio = config.id;
          this.handleIncomingMessage(mavMessage, config.id);
        }
      } catch (error) {
        console.error(`Error processing message from radio ${config.id}:`, error);
      }
    });

    socket.on('error', (err) => {
      console.error(`Radio ${config.id} error:`, err);
      radioConnection.status = 'error';
      this.handleRadioError(config.id);
    });

    // Bind socket
    socket.bind(0, '0.0.0.0', () => {
      console.log(`Radio ${config.id} bound and ready`);
      radioConnection.status = 'connected';
    });

    this.radioConnections.set(config.id, radioConnection);
  }

  // Handle incoming messages with mesh routing capability
  private handleIncomingMessage(message: MAVLinkMessage, radioId: string): void {
    const radio = this.radioConnections.get(radioId);
    if (!radio) return;

    // Update drone information
    this.updateDroneInfo(message, radioId);

    // Check if this is a mesh relay message
    if (message.hopCount !== undefined && message.hopCount > 0) {
      this.handleMeshMessage(message);
    } else {
      // Direct message from drone
      this.processDroneMessage(message);
    }

    // Broadcast to web clients
    this.broadcastToClients(message);

    // Update mesh routing table
    this.updateMeshRouting(message);
  }

  // Implement mesh networking for drone-to-drone communication
  private handleMeshMessage(message: MAVLinkMessage): void {
    const targetDrone = message.payload.targetSystem;
    
    // If we're the destination, process the message
    if (this.drones.has(targetDrone)) {
      this.processDroneMessage(message);
      return;
    }

    // If we need to relay, find the best path
    const nextHop = this.findBestRoute(targetDrone);
    if (nextHop && message.hopCount! < 5) { // Limit hop count to prevent loops
      message.hopCount = (message.hopCount || 0) + 1;
      message.routePath = message.routePath || [];
      message.routePath.push(message.sysid);
      
      this.forwardMessage(message, nextHop);
    }
  }

  // Find the best route to a target drone through the mesh network
  private findBestRoute(targetDroneId: number): number | null {
    const route = this.routingTable.get(targetDroneId);
    return route ? route.nextHop : null;
  }

  // Send message to specific drone with automatic radio selection and failover
  sendToDrone(droneId: number, message: MAVLinkMessage): void {
    const drone = this.drones.get(droneId);
    if (!drone) {
      console.warn(`Drone ${droneId} not found`);
      return;
    }

    // Try direct connection first
    const directRadio = this.findBestRadioForDrone(droneId);
    if (directRadio && this.sendViaRadio(message, directRadio)) {
      return;
    }

    // Try mesh routing if direct connection fails
    const meshRoute = this.findBestRoute(droneId);
    if (meshRoute) {
      message.hopCount = 0;
      message.routePath = [];
      this.forwardMessage(message, meshRoute);
      return;
    }

    // Queue message for later delivery
    this.queueMessage(droneId, message);
    console.warn(`Could not deliver message to drone ${droneId}, queued for later`);
  }

  // Find the best radio for communicating with a specific drone
  private findBestRadioForDrone(droneId: number): string | null {
    const drone = this.drones.get(droneId);
    if (!drone) return null;

    // Prefer primary radios that can reach this drone
    for (const radioId of drone.radios) {
      const radio = this.radioConnections.get(radioId);
      if (radio && radio.status === 'connected' && radio.type === 'primary') {
        return radioId;
      }
    }

    // Fall back to any connected radio
    for (const radioId of drone.radios) {
      const radio = this.radioConnections.get(radioId);
      if (radio && radio.status === 'connected') {
        return radioId;
      }
    }

    return null;
  }

  // Send message via specific radio
  private sendViaRadio(message: MAVLinkMessage, radioId: string): boolean {
    const radio = this.radioConnections.get(radioId);
    if (!radio || radio.status !== 'connected') {
      return false;
    }

    try {
      // In a real implementation, encode to MAVLink binary format
      const buffer = this.encodeMAVLinkMessage(message);
      radio.socket.send(buffer, radio.port, radio.address);
      return true;
    } catch (error) {
      console.error(`Failed to send via radio ${radioId}:`, error);
      return false;
    }
  }

  // Forward message through mesh network
  private forwardMessage(message: MAVLinkMessage, nextHopDroneId: number): void {
    const nextHopDrone = this.drones.get(nextHopDroneId);
    if (!nextHopDrone) return;

    // Find radio that can reach the next hop
    const radioId = this.findBestRadioForDrone(nextHopDroneId);
    if (radioId) {
      this.sendViaRadio(message, radioId);
    }
  }

  // Update mesh routing table using Bellman-Ford algorithm
  private updateMeshRouting(message: MAVLinkMessage): void {
    const sourceId = message.sysid;
    const currentTime = Date.now();

    // Update or create mesh node
    if (!this.meshNodes.has(sourceId)) {
      this.meshNodes.set(sourceId, {
        droneId: sourceId,
        directNeighbors: new Set(),
        routingTable: new Map(),
        lastSeen: currentTime
      });
    }

    const sourceNode = this.meshNodes.get(sourceId)!;
    sourceNode.lastSeen = currentTime;

    // Update routing table if this message provides better route information
    if (message.payload.routingInfo) {
      for (const [targetId, distance] of Object.entries(message.payload.routingInfo)) {
        const targetIdNum = parseInt(targetId);
        const currentRoute = this.routingTable.get(targetIdNum);
        const newDistance = (distance as number) + 1;

        if (!currentRoute || newDistance < currentRoute.distance) {
          this.routingTable.set(targetIdNum, {
            nextHop: sourceId,
            distance: newDistance
          });
        }
      }
    }
  }

  // Monitor radio connections and drone health
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const timeoutMs = 5000; // 5 seconds

      // Check radio connections
      for (const [radioId, radio] of this.radioConnections) {
        if (currentTime - radio.lastHeartbeat > timeoutMs) {
          if (radio.status === 'connected') {
            radio.status = 'disconnected';
            console.warn(`Radio ${radioId} connection timeout`);
            this.handleRadioTimeout(radioId);
          }
        }
      }

      // Check drone connections
      for (const [droneId, drone] of this.drones) {
        if (currentTime - drone.lastHeartbeat > timeoutMs) {
          if (drone.status === 'online') {
            drone.status = 'offline';
            console.warn(`Drone ${droneId} offline`);
            this.emit('droneOffline', droneId);
          }
        }
      }

      // Clean up old mesh nodes
      for (const [nodeId, node] of this.meshNodes) {
        if (currentTime - node.lastSeen > 30000) { // 30 seconds
          this.meshNodes.delete(nodeId);
          this.routingTable.delete(nodeId);
        }
      }
    }, 1000);
  }

  // Start mesh routing updates
  private startMeshRouting(): void {
    setInterval(() => {
      // Broadcast routing table to all drones for distributed routing
      const routingInfo: Record<number, number> = {};
      for (const [droneId, route] of this.routingTable) {
        routingInfo[droneId] = route.distance;
      }

      const routingMessage: MAVLinkMessage = {
        id: 999, // Custom routing message ID
        payload: { routingInfo },
        sysid: 0, // Ground control system ID
        compid: 0,
        timestamp: Date.now()
      };

      // Send to all online drones
      for (const [droneId, drone] of this.drones) {
        if (drone.status === 'online') {
          this.sendToDrone(droneId, routingMessage);
        }
      }
    }, 10000); // Update routing every 10 seconds
  }

  // Handle radio connection errors with automatic failover
  private handleRadioError(radioId: string): void {
    const radio = this.radioConnections.get(radioId);
    if (!radio) return;

    // Move drones to backup radios
    for (const droneId of radio.droneIds) {
      const drone = this.drones.get(droneId);
      if (drone) {
        // Find alternative radio for this drone
        const backupRadio = this.findBackupRadioForDrone(droneId);
        if (backupRadio) {
          console.log(`Switching drone ${droneId} to backup radio ${backupRadio}`);
          // Update drone's radio assignment
          drone.radios = drone.radios.filter(id => id !== radioId);
          if (!drone.radios.includes(backupRadio)) {
            drone.radios.push(backupRadio);
          }
        }
      }
    }

    // Attempt to reconnect radio
    setTimeout(() => this.reconnectRadio(radioId), 5000);
  }

  private findBackupRadioForDrone(droneId: number): string | null {
    for (const [radioId, radio] of this.radioConnections) {
      if (radio.status === 'connected' && radio.type === 'backup') {
        return radioId;
      }
    }
    return null;
  }

  private reconnectRadio(radioId: string): void {
    const radio = this.radioConnections.get(radioId);
    if (!radio) return;

    try {
      radio.socket.close();
      const newSocket = dgram.createSocket('udp4');
      radio.socket = newSocket;
      
      // Re-setup event handlers
      newSocket.on('message', (msg, rinfo) => {
        try {
          const mavMessage = this.parseMAVLinkMessage(msg);
          if (mavMessage) {
            mavMessage.sourceRadio = radioId;
            this.handleIncomingMessage(mavMessage, radioId);
          }
        } catch (error) {
          console.error(`Error processing message from radio ${radioId}:`, error);
        }
      });

      newSocket.bind(0, '0.0.0.0', () => {
        radio.status = 'connected';
        radio.lastHeartbeat = Date.now();
        console.log(`Radio ${radioId} reconnected successfully`);
      });
    } catch (error) {
      console.error(`Failed to reconnect radio ${radioId}:`, error);
      setTimeout(() => this.reconnectRadio(radioId), 10000);
    }
  }

  // WebSocket handling for web clients
  private initialize(): void {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);
      
      // Send current drone status to new client
      ws.send(JSON.stringify({
        type: 'drone_status',
        drones: Array.from(this.drones.values())
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(message);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(message: any): void {
    switch (message.type) {
      case 'send_command':
        if (message.droneId && message.command) {
          this.sendToDrone(message.droneId, message.command);
        }
        break;
      case 'get_mesh_status':
        this.sendMeshStatus();
        break;
      case 'configure_mesh':
        this.configureMeshNetworking(message.config);
        break;
    }
  }

  private sendMeshStatus(): void {
    const meshStatus = {
      type: 'mesh_status',
      nodes: Array.from(this.meshNodes.values()),
      routingTable: Object.fromEntries(this.routingTable),
      radioConnections: Array.from(this.radioConnections.values()).map(radio => ({
        id: radio.id,
        status: radio.status,
        type: radio.type,
        connectedDrones: Array.from(radio.droneIds)
      }))
    };

    this.broadcastToClients(meshStatus);
  }

  private broadcastToClients(message: any): void {
    const wsMessage = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(wsMessage);
      }
    }
  }

  // Utility methods
  private updateDroneInfo(message: MAVLinkMessage, radioId: string): void {
    const droneId = message.sysid;
    
    if (!this.drones.has(droneId)) {
      this.drones.set(droneId, {
        id: droneId,
        systemId: message.sysid,
        componentId: message.compid,
        radios: [radioId],
        meshCapable: true, // Assume mesh capable for now
        lastHeartbeat: Date.now(),
        status: 'online'
      });
    } else {
      const drone = this.drones.get(droneId)!;
      drone.lastHeartbeat = Date.now();
      drone.status = 'online';
      
      if (!drone.radios.includes(radioId)) {
        drone.radios.push(radioId);
      }
    }

    // Update radio's drone list
    const radio = this.radioConnections.get(radioId);
    if (radio) {
      radio.droneIds.add(droneId);
      radio.lastHeartbeat = Date.now();
    }
  }

  private processDroneMessage(message: MAVLinkMessage): void {
    // Forward to ArduCopter-specific handler first
    copterMAVLinkHandler.handleMessage(message.id, message.sysid, message.compid, message.payload);
    
    // Process specific message types for server functionality
    switch (message.id) {
      case CopterMAVLinkMessageID.HEARTBEAT:
        this.handleHeartbeat(message);
        break;
      case CopterMAVLinkMessageID.GLOBAL_POSITION_INT:
        this.handlePositionUpdate(message);
        break;
      case CopterMAVLinkMessageID.SYS_STATUS:
        this.handleSystemStatus(message);
        break;
      case CopterMAVLinkMessageID.PARAM_VALUE:
        this.handleParameterValue(message);
        break;
      case CopterMAVLinkMessageID.MISSION_CURRENT:
        this.handleMissionCurrent(message);
        break;
      case CopterMAVLinkMessageID.STATUSTEXT:
        this.handleStatusText(message);
        break;
      // Add more message handlers as needed
    }
    
    // Broadcast to all connected web clients
    this.broadcastToClients('mavlink_message', {
      messageId: message.id,
      systemId: message.sysid,
      componentId: message.compid,
      payload: message.payload,
      timestamp: message.timestamp,
      sourceRadio: message.sourceRadio,
    });
  }

  private handleHeartbeat(message: MAVLinkMessage): void {
    const drone = this.drones.get(message.sysid);
    if (drone) {
      drone.lastHeartbeat = Date.now();
      drone.status = 'online';
    }
  }

  private handlePositionUpdate(message: MAVLinkMessage): void {
    const drone = this.drones.get(message.sysid);
    if (drone && message.payload) {
      drone.position = {
        lat: message.payload.lat / 1e7,
        lon: message.payload.lon / 1e7,
        alt: message.payload.alt / 1000
      };
    }
  }

  private handleSystemStatus(message: MAVLinkMessage): void {
    // System status updates are handled by the ArduCopter integration
    // Additional server-side processing can be added here
  }

  private handleParameterValue(message: MAVLinkMessage): void {
    // Parameter updates are handled by the ArduCopter integration
    // Log parameter changes for audit purposes
    console.log(`Parameter update from system ${message.sysid}: ${message.payload.param_id} = ${message.payload.param_value}`);
  }

  private handleMissionCurrent(message: MAVLinkMessage): void {
    // Mission progress updates
    this.broadcastToClients('mission_progress', {
      systemId: message.sysid,
      currentWaypoint: message.payload.seq,
      timestamp: message.timestamp,
    });
  }

  private handleStatusText(message: MAVLinkMessage): void {
    // Status text messages from ArduCopter
    this.broadcastToClients('status_message', {
      systemId: message.sysid,
      severity: message.payload.severity,
      text: message.payload.text,
      timestamp: message.timestamp,
    });
  }

  // Broadcast message to all connected web clients
  private broadcastToClients(event: string, data: any): void {
    const message = JSON.stringify({ event, data });
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Failed to send message to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  private queueMessage(droneId: number, message: MAVLinkMessage): void {
    const key = `drone_${droneId}`;
    if (!this.messageQueue.has(key)) {
      this.messageQueue.set(key, []);
    }
    this.messageQueue.get(key)!.push(message);
  }

  private handleRadioTimeout(radioId: string): void {
    console.warn(`Radio ${radioId} timeout, attempting recovery...`);
    // Implement recovery logic
  }

  private configureMeshNetworking(config: any): void {
    // Configure mesh networking parameters
    console.log('Configuring mesh networking:', config);
  }

  // Placeholder methods for MAVLink encoding/decoding
  private parseMAVLinkMessage(buffer: Buffer): MAVLinkMessage | null {
    // In a real implementation, this would decode MAVLink binary format
    // For now, return null as placeholder
    return null;
  }

  private encodeMAVLinkMessage(message: MAVLinkMessage): Buffer {
    // In a real implementation, this would encode to MAVLink binary format
    return Buffer.from(JSON.stringify(message));
  }
}

export default EnhancedMAVLinkServer;

// Example usage:
/*
const server = new EnhancedMAVLinkServer(5760);

// Add primary radio
server.addRadioConnection({
  id: 'primary_radio',
  address: '127.0.0.1',
  port: 14550,
  type: 'primary'
});

// Add backup radio for redundancy
server.addRadioConnection({
  id: 'backup_radio',
  address: '127.0.0.1',
  port: 14551,
  type: 'backup'
});

// Add mesh networking radio
server.addRadioConnection({
  id: 'mesh_radio',
  address: '192.168.1.100',
  port: 14552,
  type: 'mesh'
});
*/