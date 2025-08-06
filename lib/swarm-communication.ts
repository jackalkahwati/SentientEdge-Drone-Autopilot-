/**
 * Swarm Communication Protocols
 * 
 * Implements secure, efficient communication protocols for drone-to-drone coordination
 * within swarms. Handles message routing, reliability, encryption, and protocol adaptation
 * based on network conditions and mission requirements.
 */

import {
  SwarmMessage,
  SwarmMessageType,
  SwarmCommunicationProtocol,
  Drone,
  Swarm,
  Vector3D
} from './types';

import { useWebSocket } from './websocket';

// ============================================================================
// MESSAGE QUEUE AND PRIORITY MANAGEMENT
// ============================================================================

interface QueuedMessage extends SwarmMessage {
  retryCount: number;
  lastAttempt: number;
  acknowledged: boolean;
}

export class SwarmMessageQueue {
  private messageQueue: QueuedMessage[] = [];
  private acknowledgments: Map<string, number> = new Map(); // messageId -> timestamp
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly ACK_TIMEOUT = 5000; // 5 seconds

  /**
   * Add message to priority queue
   */
  enqueue(message: SwarmMessage): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest low-priority messages
      this.messageQueue = this.messageQueue
        .filter(m => m.priority !== 'low')
        .slice(-this.MAX_QUEUE_SIZE + 1);
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      retryCount: 0,
      lastAttempt: 0,
      acknowledged: !message.ackRequired
    };

    // Insert based on priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const insertIndex = this.messageQueue.findIndex(
      m => priorityOrder[m.priority] > priorityOrder[message.priority]
    );

    if (insertIndex === -1) {
      this.messageQueue.push(queuedMessage);
    } else {
      this.messageQueue.splice(insertIndex, 0, queuedMessage);
    }
  }

  /**
   * Get next message to send
   */
  dequeue(): QueuedMessage | null {
    const now = Date.now();
    
    // Clean up expired messages
    this.messageQueue = this.messageQueue.filter(m => {
      const age = (now - new Date(m.timestamp).getTime()) / 1000;
      return age < m.ttl;
    });

    // Find highest priority unsent or unacknowledged message
    for (let i = 0; i < this.messageQueue.length; i++) {
      const message = this.messageQueue[i];
      
      if (!message.acknowledged && 
          (message.lastAttempt === 0 || now - message.lastAttempt > this.ACK_TIMEOUT)) {
        
        if (message.retryCount < this.MAX_RETRIES) {
          message.lastAttempt = now;
          message.retryCount++;
          return message;
        } else {
          // Max retries exceeded, remove message
          this.messageQueue.splice(i, 1);
          i--;
        }
      }
    }

    return null;
  }

  /**
   * Process acknowledgment
   */
  processAcknowledgment(messageId: string): void {
    const messageIndex = this.messageQueue.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      this.messageQueue[messageIndex].acknowledged = true;
      this.acknowledgments.set(messageId, Date.now());
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalMessages: number;
    pendingMessages: number;
    criticalMessages: number;
    averageRetries: number;
  } {
    const pending = this.messageQueue.filter(m => !m.acknowledged);
    const critical = this.messageQueue.filter(m => m.priority === 'critical');
    const totalRetries = this.messageQueue.reduce((sum, m) => sum + m.retryCount, 0);

    return {
      totalMessages: this.messageQueue.length,
      pendingMessages: pending.length,
      criticalMessages: critical.length,
      averageRetries: this.messageQueue.length > 0 ? totalRetries / this.messageQueue.length : 0
    };
  }
}

// ============================================================================
// MESH NETWORK ROUTING
// ============================================================================

export class SwarmMeshRouter {
  private routingTable: Map<string, string[]> = new Map(); // droneId -> [next hop droneIds]
  private connectionStrengths: Map<string, number> = new Map(); // droneId -> signal strength
  private readonly MAX_HOPS = 5;

  /**
   * Update routing table based on network topology
   */
  updateRoutingTable(
    swarmDrones: Drone[],
    communicationRange: number
  ): void {
    this.routingTable.clear();
    this.connectionStrengths.clear();

    // Build adjacency matrix based on communication range
    for (const drone of swarmDrones) {
      if (!drone.location || drone.status !== 'active') continue;

      const neighbors: string[] = [];
      const dronePos = { x: drone.location[0], y: drone.location[1], z: drone.altitude || 100 };

      for (const neighbor of swarmDrones) {
        if (neighbor.id === drone.id || !neighbor.location || neighbor.status !== 'active') continue;

        const neighborPos = { x: neighbor.location[0], y: neighbor.location[1], z: neighbor.altitude || 100 };
        const distance = this.calculateDistance(dronePos, neighborPos);

        if (distance <= communicationRange) {
          neighbors.push(neighbor.id);
          // Signal strength inversely proportional to distance
          const strength = Math.max(0, 1 - (distance / communicationRange));
          this.connectionStrengths.set(`${drone.id}-${neighbor.id}`, strength);
        }
      }

      this.routingTable.set(drone.id, neighbors);
    }
  }

  /**
   * Find optimal route to destination
   */
  findRoute(sourceId: string, destinationId: string): string[] | null {
    if (sourceId === destinationId) return [sourceId];

    const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: sourceId, path: [sourceId] }];
    const visited = new Set<string>();
    const routes: Array<{ path: string[]; totalStrength: number }> = [];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (visited.has(nodeId) || path.length > this.MAX_HOPS) continue;
      visited.add(nodeId);

      const neighbors = this.routingTable.get(nodeId) || [];

      for (const neighborId of neighbors) {
        const newPath = [...path, neighborId];

        if (neighborId === destinationId) {
          // Found route to destination
          const totalStrength = this.calculatePathStrength(newPath);
          routes.push({ path: newPath, totalStrength });
        } else if (!visited.has(neighborId) && newPath.length < this.MAX_HOPS) {
          queue.push({ nodeId: neighborId, path: newPath });
        }
      }
    }

    // Return route with highest total strength
    if (routes.length === 0) return null;
    
    routes.sort((a, b) => b.totalStrength - a.totalStrength);
    return routes[0].path;
  }

  private calculatePathStrength(path: string[]): number {
    let totalStrength = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]}-${path[i + 1]}`;
      const strength = this.connectionStrengths.get(key) || 0;
      totalStrength += strength;
    }
    
    return totalStrength / (path.length - 1); // Average strength
  }

  private calculateDistance(pos1: Vector3D, pos2: Vector3D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get network topology statistics
   */
  getTopologyStats(): {
    nodeCount: number;
    totalConnections: number;
    averageConnectivity: number;
    isolatedNodes: string[];
  } {
    const nodes = Array.from(this.routingTable.keys());
    let totalConnections = 0;
    const isolatedNodes: string[] = [];

    for (const [nodeId, neighbors] of this.routingTable) {
      totalConnections += neighbors.length;
      if (neighbors.length === 0) {
        isolatedNodes.push(nodeId);
      }
    }

    return {
      nodeCount: nodes.length,
      totalConnections: totalConnections / 2, // Each connection counted twice
      averageConnectivity: nodes.length > 0 ? totalConnections / nodes.length : 0,
      isolatedNodes
    };
  }
}

// ============================================================================
// PROTOCOL ADAPTATION ENGINE
// ============================================================================

export class ProtocolAdaptationEngine {
  private currentProtocol: SwarmCommunicationProtocol;
  private networkMetrics: {
    latency: number;
    packetLoss: number;
    throughput: number;
    nodeCount: number;
  };

  constructor() {
    this.currentProtocol = {
      broadcastInterval: 1000, // 1 second
      heartbeatInterval: 5000, // 5 seconds
      acknowledgmentTimeout: 3000, // 3 seconds
      maxRetries: 3,
      encryptionEnabled: true,
      compressionEnabled: false
    };

    this.networkMetrics = {
      latency: 100, // ms
      packetLoss: 0.01, // 1%
      throughput: 1000, // KB/s
      nodeCount: 1
    };
  }

  /**
   * Adapt protocol parameters based on network conditions
   */
  adaptProtocol(metrics: {
    latency: number;
    packetLoss: number;
    throughput: number;
    nodeCount: number;
  }): SwarmCommunicationProtocol {
    this.networkMetrics = metrics;

    const adaptedProtocol = { ...this.currentProtocol };

    // Adapt broadcast interval based on network congestion
    if (metrics.nodeCount > 20) {
      // Large swarm - increase intervals to reduce congestion
      adaptedProtocol.broadcastInterval = Math.min(2000, this.currentProtocol.broadcastInterval * 1.5);
      adaptedProtocol.heartbeatInterval = Math.min(10000, this.currentProtocol.heartbeatInterval * 1.2);
    } else if (metrics.nodeCount < 5) {
      // Small swarm - can afford more frequent updates
      adaptedProtocol.broadcastInterval = Math.max(500, this.currentProtocol.broadcastInterval * 0.8);
      adaptedProtocol.heartbeatInterval = Math.max(2000, this.currentProtocol.heartbeatInterval * 0.8);
    }

    // Adapt timeouts based on latency
    adaptedProtocol.acknowledgmentTimeout = Math.max(1000, metrics.latency * 10);

    // Adapt retries based on packet loss
    if (metrics.packetLoss > 0.05) { // > 5% packet loss
      adaptedProtocol.maxRetries = Math.min(5, this.currentProtocol.maxRetries + 1);
    } else if (metrics.packetLoss < 0.01) { // < 1% packet loss
      adaptedProtocol.maxRetries = Math.max(1, this.currentProtocol.maxRetries - 1);
    }

    // Enable compression for low throughput networks
    adaptedProtocol.compressionEnabled = metrics.throughput < 500; // < 500 KB/s

    this.currentProtocol = adaptedProtocol;
    return adaptedProtocol;
  }

  /**
   * Get current protocol configuration
   */
  getCurrentProtocol(): SwarmCommunicationProtocol {
    return { ...this.currentProtocol };
  }
}

// ============================================================================
// RELIABLE MESSAGING SYSTEM
// ============================================================================

export class ReliableMessagingSystem {
  private messageQueue: SwarmMessageQueue;
  private meshRouter: SwarmMeshRouter;
  private protocolEngine: ProtocolAdaptationEngine;
  private webSocket: ReturnType<typeof useWebSocket>;
  private activeConnections: Map<string, number> = new Map(); // droneId -> last heartbeat

  constructor() {
    this.messageQueue = new SwarmMessageQueue();
    this.meshRouter = new SwarmMeshRouter();
    this.protocolEngine = new ProtocolAdaptationEngine();
    this.webSocket = useWebSocket();
    
    this.setupMessageHandling();
    this.startPeriodicTasks();
  }

  /**
   * Send message through swarm network
   */
  sendMessage(message: SwarmMessage): Promise<boolean> {
    return new Promise((resolve) => {
      // Add to queue for reliable delivery
      this.messageQueue.enqueue(message);

      if (message.ackRequired) {
        // Wait for acknowledgment
        const checkAck = () => {
          setTimeout(() => {
            const stats = this.messageQueue.getQueueStats();
            // Simplified check - in production would track specific message
            resolve(stats.pendingMessages < this.messageQueue.getQueueStats().totalMessages);
          }, this.protocolEngine.getCurrentProtocol().acknowledgmentTimeout);
        };
        checkAck();
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Broadcast message to all swarm members
   */
  broadcastMessage(message: Omit<SwarmMessage, 'receiverId'>): Promise<number> {
    const broadcastMsg: SwarmMessage = {
      ...message,
      receiverId: undefined // Broadcast
    };

    this.messageQueue.enqueue(broadcastMsg);
    
    // Return number of active nodes
    return Promise.resolve(this.activeConnections.size);
  }

  /**
   * Send message via optimal route
   */
  sendViaRoute(message: SwarmMessage, sourceId: string): Promise<boolean> {
    if (!message.receiverId) {
      return this.broadcastMessage(message).then(() => true);
    }

    const route = this.meshRouter.findRoute(sourceId, message.receiverId);
    
    if (!route || route.length < 2) {
      // Direct send via WebSocket
      return this.sendDirectMessage(message);
    }

    // Multi-hop routing
    const routedMessage: SwarmMessage = {
      ...message,
      payload: {
        ...message.payload,
        route: route,
        currentHop: 0
      }
    };

    return this.sendDirectMessage(routedMessage);
  }

  private sendDirectMessage(message: SwarmMessage): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Compress if enabled
        let payload = message.payload;
        if (this.protocolEngine.getCurrentProtocol().compressionEnabled) {
          payload = this.compressPayload(payload);
        }

        // Encrypt if enabled
        if (this.protocolEngine.getCurrentProtocol().encryptionEnabled) {
          this.webSocket.sendSecure?.('swarm_message', {
            ...message,
            payload
          });
        } else {
          this.webSocket.send?.('swarm_message', {
            ...message,
            payload
          });
        }

        resolve(true);
      } catch (error) {
        console.error('Failed to send message:', error);
        resolve(false);
      }
    });
  }

  /**
   * Update network topology
   */
  updateTopology(swarmDrones: Drone[], communicationRange: number): void {
    this.meshRouter.updateRoutingTable(swarmDrones, communicationRange);
    
    // Update active connections
    this.activeConnections.clear();
    const now = Date.now();
    
    for (const drone of swarmDrones) {
      if (drone.status === 'active') {
        this.activeConnections.set(drone.id, now);
      }
    }

    // Adapt protocol based on network size
    const topologyStats = this.meshRouter.getTopologyStats();
    this.protocolEngine.adaptProtocol({
      latency: 100, // Would be measured in production
      packetLoss: 0.01,
      throughput: 1000,
      nodeCount: topologyStats.nodeCount
    });
  }

  /**
   * Process incoming message
   */
  processIncomingMessage(message: SwarmMessage): void {
    // Send acknowledgment if required
    if (message.ackRequired) {
      const ackMessage: SwarmMessage = {
        id: `ack_${message.id}`,
        senderId: 'system', // Would be current drone ID in production
        receiverId: message.senderId,
        type: 'heartbeat', // Using heartbeat as acknowledgment type
        payload: { originalMessageId: message.id },
        timestamp: new Date().toISOString(),
        priority: 'high',
        encrypted: false,
        ackRequired: false,
        ttl: 30
      };

      this.sendMessage(ackMessage);
    }

    // Handle routed messages
    if (message.payload.route && message.payload.currentHop !== undefined) {
      const route = message.payload.route as string[];
      const currentHop = message.payload.currentHop as number;
      
      if (currentHop < route.length - 1) {
        // Forward to next hop
        const nextHopId = route[currentHop + 1];
        const forwardedMessage: SwarmMessage = {
          ...message,
          payload: {
            ...message.payload,
            currentHop: currentHop + 1
          }
        };

        this.sendMessage(forwardedMessage);
        return;
      }
    }

    // Process message locally
    this.handleMessage(message);
  }

  private handleMessage(message: SwarmMessage): void {
    switch (message.type) {
      case 'heartbeat':
        this.activeConnections.set(message.senderId, Date.now());
        
        // Check if this is an acknowledgment
        if (message.payload.originalMessageId) {
          this.messageQueue.processAcknowledgment(message.payload.originalMessageId);
        }
        break;

      case 'position_update':
      case 'formation_command':
      case 'leader_election':
      case 'consensus_vote':
      case 'emergency_alert':
      case 'collision_warning':
      case 'task_assignment':
      case 'status_report':
      case 'formation_complete':
      case 'mission_update':
        // Forward to appropriate handlers via WebSocket
        this.webSocket.send?.(`swarm_${message.type}`, message.payload);
        break;
    }
  }

  private setupMessageHandling(): void {
    // Subscribe to incoming swarm messages
    this.webSocket.subscribe?.('swarm_message', (data) => {
      this.processIncomingMessage(data);
    });

    // Subscribe to acknowledgments
    this.webSocket.subscribe?.('swarm_ack', (data) => {
      this.messageQueue.processAcknowledgment(data.messageId);
    });
  }

  private startPeriodicTasks(): void {
    // Process message queue
    setInterval(() => {
      const message = this.messageQueue.dequeue();
      if (message) {
        this.sendDirectMessage(message);
      }
    }, 100); // Process every 100ms

    // Send heartbeats
    setInterval(() => {
      const heartbeat: SwarmMessage = {
        id: `heartbeat_${Date.now()}`,
        senderId: 'system', // Would be current drone ID
        type: 'heartbeat',
        payload: { timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        priority: 'low',
        encrypted: false,
        ackRequired: false,
        ttl: 30
      };

      this.broadcastMessage(heartbeat);
    }, this.protocolEngine.getCurrentProtocol().heartbeatInterval);

    // Clean up inactive connections
    setInterval(() => {
      const now = Date.now();
      const timeout = this.protocolEngine.getCurrentProtocol().heartbeatInterval * 3;
      
      for (const [droneId, lastHeartbeat] of this.activeConnections) {
        if (now - lastHeartbeat > timeout) {
          this.activeConnections.delete(droneId);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private compressPayload(payload: any): any {
    // Simplified compression - in production would use proper compression
    const jsonStr = JSON.stringify(payload);
    if (jsonStr.length > 1000) {
      // Mock compression for large payloads
      return {
        compressed: true,
        data: jsonStr.substring(0, 500) + '...[compressed]'
      };
    }
    return payload;
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    activeConnections: number;
    queueStats: ReturnType<SwarmMessageQueue['getQueueStats']>;
    topologyStats: ReturnType<SwarmMeshRouter['getTopologyStats']>;
    currentProtocol: SwarmCommunicationProtocol;
  } {
    return {
      activeConnections: this.activeConnections.size,
      queueStats: this.messageQueue.getQueueStats(),
      topologyStats: this.meshRouter.getTopologyStats(),
      currentProtocol: this.protocolEngine.getCurrentProtocol()
    };
  }
}

// ============================================================================
// SWARM COMMUNICATION MANAGER
// ============================================================================

export class SwarmCommunicationManager {
  private messagingSystem: ReliableMessagingSystem;
  private swarmId: string;
  private droneId: string;

  constructor(swarmId: string, droneId: string) {
    this.swarmId = swarmId;
    this.droneId = droneId;
    this.messagingSystem = new ReliableMessagingSystem();
  }

  /**
   * Initialize communication for swarm
   */
  initialize(swarmDrones: Drone[], communicationRange: number): void {
    this.messagingSystem.updateTopology(swarmDrones, communicationRange);
  }

  /**
   * Send position update to swarm
   */
  sendPositionUpdate(position: Vector3D, velocity: Vector3D, heading: number): Promise<boolean> {
    const message: SwarmMessage = {
      id: `pos_${this.droneId}_${Date.now()}`,
      senderId: this.droneId,
      type: 'position_update',
      payload: { position, velocity, heading },
      timestamp: new Date().toISOString(),
      priority: 'normal',
      encrypted: false, // Position updates need speed
      ackRequired: false,
      ttl: 30
    };

    return this.messagingSystem.broadcastMessage(message).then(() => true);
  }

  /**
   * Send formation command
   */
  sendFormationCommand(
    targetDroneId: string,
    command: string,
    parameters: any
  ): Promise<boolean> {
    const message: SwarmMessage = {
      id: `formation_${this.droneId}_${Date.now()}`,
      senderId: this.droneId,
      receiverId: targetDroneId,
      type: 'formation_command',
      payload: { command, parameters },
      timestamp: new Date().toISOString(),
      priority: 'high',
      encrypted: true,
      ackRequired: true,
      ttl: 60
    };

    return this.messagingSystem.sendMessage(message);
  }

  /**
   * Send emergency alert
   */
  sendEmergencyAlert(
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any
  ): Promise<number> {
    const message: SwarmMessage = {
      id: `emergency_${this.droneId}_${Date.now()}`,
      senderId: this.droneId,
      type: 'emergency_alert',
      payload: { alertType, severity, details },
      timestamp: new Date().toISOString(),
      priority: 'critical',
      encrypted: true,
      ackRequired: true,
      ttl: 300 // 5 minutes
    };

    return this.messagingSystem.broadcastMessage(message);
  }

  /**
   * Send collision warning
   */
  sendCollisionWarning(
    targetDroneId: string,
    timeToCollision: number,
    recommendedAction: string
  ): Promise<boolean> {
    const message: SwarmMessage = {
      id: `collision_${this.droneId}_${Date.now()}`,
      senderId: this.droneId,
      receiverId: targetDroneId,
      type: 'collision_warning',
      payload: { timeToCollision, recommendedAction },
      timestamp: new Date().toISOString(),
      priority: 'critical',
      encrypted: false, // Speed is critical
      ackRequired: false,
      ttl: Math.max(timeToCollision * 2, 10)
    };

    return this.messagingSystem.sendMessage(message);
  }

  /**
   * Update network topology
   */
  updateTopology(swarmDrones: Drone[], communicationRange: number): void {
    this.messagingSystem.updateTopology(swarmDrones, communicationRange);
  }

  /**
   * Get communication statistics
   */
  getStats(): ReturnType<ReliableMessagingSystem['getStats']> {
    return this.messagingSystem.getStats();
  }
}

export default {
  SwarmMessageQueue,
  SwarmMeshRouter,
  ProtocolAdaptationEngine,
  ReliableMessagingSystem,
  SwarmCommunicationManager
};