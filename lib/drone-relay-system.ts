// Drone Relay System for Extended Range Communication
// Implements intelligent relay selection and range extension

import { EventEmitter } from 'events';

interface RelayNode {
  droneId: number;
  position: { lat: number; lon: number; alt: number };
  signalStrength: number;
  batteryLevel: number;
  relayCapacity: number; // Max simultaneous relay connections
  activeRelays: number;   // Current relay connections
  relayPriority: number;  // 0-10, higher = better relay candidate
  lastUpdate: number;
  isReachable: boolean;
  communicationRange: number; // meters
}

interface RelayRoute {
  id: string;
  sourceId: number;
  targetId: number;
  relayChain: number[]; // Drone IDs in relay path
  totalDistance: number;
  estimatedLatency: number;
  reliability: number; // 0-1
  lastUsed: number;
  isActive: boolean;
}

interface RelayMessage {
  messageId: string;
  sourceId: number;
  targetId: number;
  hopCount: number;
  maxHops: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: any;
  timestamp: number;
  routeId?: string;
}

interface RelayPerformance {
  totalMessages: number;
  successfulDeliveries: number;
  averageLatency: number;
  averageHops: number;
  relayEfficiency: number;
  networkCoverage: number;
}

class DroneRelaySystem extends EventEmitter {
  private relayNodes: Map<number, RelayNode> = new Map();
  private relayRoutes: Map<string, RelayRoute> = new Map();
  private messageQueue: Map<string, RelayMessage[]> = new Map();
  private performanceMetrics: RelayPerformance;
  private maxRange: number = 1000; // meters
  private maxHops: number = 5;
  private relayTimeout: number = 10000; // 10 seconds
  
  constructor() {
    super();
    this.performanceMetrics = {
      totalMessages: 0,
      successfulDeliveries: 0,
      averageLatency: 0,
      averageHops: 0,
      relayEfficiency: 0,
      networkCoverage: 0
    };
    
    this.startRelayMaintenance();
    this.startPerformanceMonitoring();
  }

  // Register a drone as a potential relay node
  registerRelayNode(droneId: number, capabilities: {
    position: { lat: number; lon: number; alt: number };
    signalStrength: number;
    batteryLevel: number;
    relayCapacity: number;
    communicationRange: number;
  }): void {
    const relayNode: RelayNode = {
      droneId,
      position: capabilities.position,
      signalStrength: capabilities.signalStrength,
      batteryLevel: capabilities.batteryLevel,
      relayCapacity: capabilities.relayCapacity,
      activeRelays: 0,
      relayPriority: this.calculateRelayPriority(capabilities),
      lastUpdate: Date.now(),
      isReachable: true,
      communicationRange: capabilities.communicationRange
    };

    this.relayNodes.set(droneId, relayNode);
    this.updateNetworkTopology();
    console.log(`Registered relay node: Drone ${droneId}`);
  }

  // Update relay node status
  updateRelayNode(droneId: number, updates: Partial<RelayNode>): void {
    const node = this.relayNodes.get(droneId);
    if (node) {
      Object.assign(node, updates, { lastUpdate: Date.now() });
      
      // Recalculate priority if relevant fields changed
      if (updates.batteryLevel || updates.signalStrength || updates.position) {
        node.relayPriority = this.calculateRelayPriority(node);
      }
      
      this.updateNetworkTopology();
    }
  }

  // Send message through relay network
  async sendMessage(message: RelayMessage): Promise<boolean> {
    this.performanceMetrics.totalMessages++;
    
    try {
      // Check if direct communication is possible
      if (this.canCommunicateDirectly(message.sourceId, message.targetId)) {
        return await this.sendDirectMessage(message);
      }

      // Find or create relay route
      const route = await this.findOptimalRoute(message.sourceId, message.targetId);
      if (!route) {
        console.warn(`No relay route found from ${message.sourceId} to ${message.targetId}`);
        return false;
      }

      // Send through relay chain
      return await this.sendThroughRelay(message, route);
    } catch (error) {
      console.error('Error sending relay message:', error);
      return false;
    }
  }

  // Find optimal relay route between two drones
  private async findOptimalRoute(sourceId: number, targetId: number): Promise<RelayRoute | null> {
    // Check existing routes first
    const existingRoute = this.findExistingRoute(sourceId, targetId);
    if (existingRoute && this.isRouteValid(existingRoute)) {
      return existingRoute;
    }

    // Calculate new route using Dijkstra's algorithm
    const route = this.calculateOptimalPath(sourceId, targetId);
    if (route) {
      this.relayRoutes.set(route.id, route);
      return route;
    }

    return null;
  }

  // Calculate optimal path using modified Dijkstra's algorithm
  private calculateOptimalPath(sourceId: number, targetId: number): RelayRoute | null {
    const distances = new Map<number, number>();
    const previous = new Map<number, number | null>();
    const visited = new Set<number>();
    const unvisited = new Set<number>();

    // Initialize distances
    for (const [nodeId] of this.relayNodes) {
      distances.set(nodeId, nodeId === sourceId ? 0 : Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: number | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (currentNode === null || minDistance === Infinity) {
        break; // No more reachable nodes
      }

      unvisited.delete(currentNode);
      visited.add(currentNode);

      if (currentNode === targetId) {
        // Found target, construct route
        return this.constructRoute(sourceId, targetId, previous, distances);
      }

      // Check neighbors
      const neighbors = this.getReachableNeighbors(currentNode);
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        const neighbor = this.relayNodes.get(neighborId)!;
        const edge = this.calculateEdgeWeight(currentNode, neighborId);
        const tentativeDistance = distances.get(currentNode)! + edge;

        if (tentativeDistance < distances.get(neighborId)!) {
          distances.set(neighborId, tentativeDistance);
          previous.set(neighborId, currentNode);
        }
      }
    }

    return null; // No route found
  }

  // Construct relay route from pathfinding results
  private constructRoute(sourceId: number, targetId: number, previous: Map<number, number | null>, distances: Map<number, number>): RelayRoute {
    const path: number[] = [];
    let current: number | null = targetId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current)!;
    }

    // Remove source and target from relay chain
    const relayChain = path.slice(1, -1);
    
    const route: RelayRoute = {
      id: `${sourceId}-${targetId}-${Date.now()}`,
      sourceId,
      targetId,
      relayChain,
      totalDistance: this.calculateRouteDistance(path),
      estimatedLatency: this.estimateRouteLatency(path),
      reliability: this.calculateRouteReliability(path),
      lastUsed: Date.now(),
      isActive: true
    };

    return route;
  }

  // Calculate edge weight between two nodes
  private calculateEdgeWeight(nodeId1: number, nodeId2: number): number {
    const node1 = this.relayNodes.get(nodeId1)!;
    const node2 = this.relayNodes.get(nodeId2)!;

    // Calculate physical distance
    const distance = this.calculateDistance(node1.position, node2.position);
    
    // Factor in relay capacity, battery, and signal strength
    const capacityFactor = (node2.relayCapacity - node2.activeRelays) / node2.relayCapacity;
    const batteryFactor = node2.batteryLevel / 100;
    const signalFactor = node2.signalStrength / 100;
    
    // Higher weight = less desirable path
    const weight = distance / (capacityFactor * batteryFactor * signalFactor);
    
    return weight;
  }

  // Get reachable neighbors for a node
  private getReachableNeighbors(nodeId: number): number[] {
    const node = this.relayNodes.get(nodeId);
    if (!node || !node.isReachable) return [];

    const neighbors: number[] = [];
    
    for (const [otherNodeId, otherNode] of this.relayNodes) {
      if (otherNodeId === nodeId || !otherNode.isReachable) continue;
      
      const distance = this.calculateDistance(node.position, otherNode.position);
      const maxRange = Math.min(node.communicationRange, otherNode.communicationRange);
      
      if (distance <= maxRange) {
        neighbors.push(otherNodeId);
      }
    }
    
    return neighbors;
  }

  // Send message through relay chain
  private async sendThroughRelay(message: RelayMessage, route: RelayRoute): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Reserve relay capacity
      if (!this.reserveRelayCapacity(route.relayChain)) {
        console.warn('Cannot reserve relay capacity for route');
        return false;
      }

      message.routeId = route.id;
      message.hopCount = 0;
      message.maxHops = route.relayChain.length + 1;

      // Send through each hop
      let currentMessage = { ...message };
      let currentNode = route.sourceId;

      for (const relayNodeId of route.relayChain) {
        currentMessage.hopCount++;
        
        const success = await this.sendHop(currentMessage, currentNode, relayNodeId);
        if (!success) {
          this.releaseRelayCapacity(route.relayChain);
          return false;
        }
        
        currentNode = relayNodeId;
      }

      // Final hop to target
      currentMessage.hopCount++;
      const finalSuccess = await this.sendHop(currentMessage, currentNode, route.targetId);
      
      // Release relay capacity
      this.releaseRelayCapacity(route.relayChain);
      
      if (finalSuccess) {
        // Update performance metrics
        const latency = Date.now() - startTime;
        this.updatePerformanceMetrics(route.relayChain.length + 1, latency, true);
        this.performanceMetrics.successfulDeliveries++;
      }
      
      return finalSuccess;
    } catch (error) {
      console.error('Error in relay transmission:', error);
      this.releaseRelayCapacity(route.relayChain);
      return false;
    }
  }

  // Send single hop in relay chain
  private async sendHop(message: RelayMessage, fromId: number, toId: number): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate message transmission with realistic delays
      const fromNode = this.relayNodes.get(fromId);
      const toNode = this.relayNodes.get(toId);
      
      if (!fromNode || !toNode) {
        resolve(false);
        return;
      }

      const distance = this.calculateDistance(fromNode.position, toNode.position);
      const signalDelay = Math.max(1, distance / 300); // Rough signal propagation delay
      const processingDelay = 5 + Math.random() * 10; // Processing delay
      
      setTimeout(() => {
        // Check if nodes are still reachable
        if (fromNode.isReachable && toNode.isReachable) {
          this.emit('relayHop', {
            messageId: message.messageId,
            fromId,
            toId,
            hopCount: message.hopCount,
            timestamp: Date.now()
          });
          resolve(true);
        } else {
          resolve(false);
        }
      }, signalDelay + processingDelay);
    });
  }

  // Check if two drones can communicate directly
  private canCommunicateDirectly(sourceId: number, targetId: number): boolean {
    const sourceNode = this.relayNodes.get(sourceId);
    const targetNode = this.relayNodes.get(targetId);
    
    if (!sourceNode || !targetNode || !sourceNode.isReachable || !targetNode.isReachable) {
      return false;
    }

    const distance = this.calculateDistance(sourceNode.position, targetNode.position);
    const maxRange = Math.min(sourceNode.communicationRange, targetNode.communicationRange);
    
    return distance <= maxRange;
  }

  // Send direct message (no relay)
  private async sendDirectMessage(message: RelayMessage): Promise<boolean> {
    const startTime = Date.now();
    
    // Simulate direct transmission
    return new Promise((resolve) => {
      setTimeout(() => {
        const latency = Date.now() - startTime;
        this.updatePerformanceMetrics(0, latency, true);
        this.performanceMetrics.successfulDeliveries++;
        
        this.emit('directMessage', {
          messageId: message.messageId,
          sourceId: message.sourceId,
          targetId: message.targetId,
          timestamp: Date.now()
        });
        
        resolve(true);
      }, 10 + Math.random() * 20); // Direct transmission delay
    });
  }

  // Reserve relay capacity for a route
  private reserveRelayCapacity(relayChain: number[]): boolean {
    // Check if all relay nodes have capacity
    for (const nodeId of relayChain) {
      const node = this.relayNodes.get(nodeId);
      if (!node || node.activeRelays >= node.relayCapacity) {
        return false;
      }
    }

    // Reserve capacity
    for (const nodeId of relayChain) {
      const node = this.relayNodes.get(nodeId)!;
      node.activeRelays++;
    }

    return true;
  }

  // Release relay capacity
  private releaseRelayCapacity(relayChain: number[]): void {
    for (const nodeId of relayChain) {
      const node = this.relayNodes.get(nodeId);
      if (node && node.activeRelays > 0) {
        node.activeRelays--;
      }
    }
  }

  // Calculate relay priority for a node
  private calculateRelayPriority(node: RelayNode | {
    signalStrength: number;
    batteryLevel: number;
    relayCapacity: number;
    position: { lat: number; lon: number; alt: number };
  }): number {
    const batteryWeight = 0.4;
    const signalWeight = 0.3;
    const capacityWeight = 0.2;
    const altitudeWeight = 0.1;

    const batteryScore = (node.batteryLevel / 100) * 10;
    const signalScore = (node.signalStrength / 100) * 10;
    const capacityScore = Math.min(node.relayCapacity / 5, 1) * 10; // Normalize to 10
    const altitudeScore = Math.min(node.position.alt / 500, 1) * 10; // Higher altitude = better relay

    return batteryWeight * batteryScore +
           signalWeight * signalScore +
           capacityWeight * capacityScore +
           altitudeWeight * altitudeScore;
  }

  // Calculate distance between two positions
  private calculateDistance(pos1: { lat: number; lon: number; alt: number }, pos2: { lat: number; lon: number; alt: number }): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lon - pos1.lon) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const horizontalDistance = R * c;
    const verticalDistance = Math.abs(pos2.alt - pos1.alt);
    
    return Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
  }

  // Utility methods
  private findExistingRoute(sourceId: number, targetId: number): RelayRoute | null {
    for (const route of this.relayRoutes.values()) {
      if (route.sourceId === sourceId && route.targetId === targetId && route.isActive) {
        return route;
      }
    }
    return null;
  }

  private isRouteValid(route: RelayRoute): boolean {
    const maxAge = 60000; // 1 minute
    return Date.now() - route.lastUsed < maxAge && 
           route.relayChain.every(nodeId => {
             const node = this.relayNodes.get(nodeId);
             return node && node.isReachable;
           });
  }

  private calculateRouteDistance(path: number[]): number {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const node1 = this.relayNodes.get(path[i])!;
      const node2 = this.relayNodes.get(path[i + 1])!;
      totalDistance += this.calculateDistance(node1.position, node2.position);
    }
    return totalDistance;
  }

  private estimateRouteLatency(path: number[]): number {
    const baseLatency = 10; // Base latency per hop
    const propagationDelay = this.calculateRouteDistance(path) / 300; // Signal propagation
    return (path.length - 1) * baseLatency + propagationDelay;
  }

  private calculateRouteReliability(path: number[]): number {
    let reliability = 1.0;
    for (const nodeId of path) {
      const node = this.relayNodes.get(nodeId)!;
      const nodeReliability = (node.batteryLevel / 100) * (node.signalStrength / 100);
      reliability *= nodeReliability;
    }
    return reliability;
  }

  private updatePerformanceMetrics(hops: number, latency: number, success: boolean): void {
    if (success) {
      this.performanceMetrics.averageHops = 
        (this.performanceMetrics.averageHops + hops) / 2;
      this.performanceMetrics.averageLatency = 
        (this.performanceMetrics.averageLatency + latency) / 2;
    }
    
    this.performanceMetrics.relayEfficiency = 
      this.performanceMetrics.successfulDeliveries / this.performanceMetrics.totalMessages;
  }

  private updateNetworkTopology(): void {
    // Recalculate network coverage and connectivity
    const totalNodes = this.relayNodes.size;
    const activeNodes = Array.from(this.relayNodes.values()).filter(n => n.isReachable).length;
    
    this.performanceMetrics.networkCoverage = totalNodes > 0 ? activeNodes / totalNodes : 0;
  }

  // Maintenance and monitoring
  private startRelayMaintenance(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const timeout = 30000; // 30 seconds

      // Check for stale nodes
      for (const [nodeId, node] of this.relayNodes) {
        if (currentTime - node.lastUpdate > timeout) {
          node.isReachable = false;
          console.warn(`Relay node ${nodeId} marked as unreachable`);
        }
      }

      // Clean up old routes
      for (const [routeId, route] of this.relayRoutes) {
        if (!this.isRouteValid(route)) {
          this.relayRoutes.delete(routeId);
        }
      }

      this.updateNetworkTopology();
    }, 10000); // Check every 10 seconds
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.emit('performanceUpdate', { ...this.performanceMetrics });
    }, 5000); // Update every 5 seconds
  }

  // Public API methods
  getNetworkStatus(): {
    totalNodes: number;
    activeNodes: number;
    totalRoutes: number;
    performance: RelayPerformance;
  } {
    const totalNodes = this.relayNodes.size;
    const activeNodes = Array.from(this.relayNodes.values()).filter(n => n.isReachable).length;
    const totalRoutes = this.relayRoutes.size;

    return {
      totalNodes,
      activeNodes,
      totalRoutes,
      performance: { ...this.performanceMetrics }
    };
  }

  getRelayNodes(): RelayNode[] {
    return Array.from(this.relayNodes.values());
  }

  getActiveRoutes(): RelayRoute[] {
    return Array.from(this.relayRoutes.values()).filter(r => r.isActive);
  }

  // Graceful shutdown
  shutdown(): void {
    console.log('Shutting down drone relay system');
    this.relayNodes.clear();
    this.relayRoutes.clear();
    this.messageQueue.clear();
    this.removeAllListeners();
  }
}

export { DroneRelaySystem };
export type { RelayNode, RelayRoute, RelayMessage, RelayPerformance };

// Example usage:
/*
const relaySystem = new DroneRelaySystem();

// Register relay nodes
relaySystem.registerRelayNode(1, {
  position: { lat: 32.7157, lon: -117.1611, alt: 100 },
  signalStrength: 95,
  batteryLevel: 80,
  relayCapacity: 3,
  communicationRange: 1000
});

// Send message through relay network
const message: RelayMessage = {
  messageId: 'msg_001',
  sourceId: 1,
  targetId: 5,
  hopCount: 0,
  maxHops: 5,
  priority: 'high',
  payload: { command: 'RTL' },
  timestamp: Date.now()
};

relaySystem.sendMessage(message);

// Monitor performance
relaySystem.on('performanceUpdate', (metrics) => {
  console.log('Relay performance:', metrics);
});
*/