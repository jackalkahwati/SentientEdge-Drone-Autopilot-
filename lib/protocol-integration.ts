// Protocol Integration Module
// Main integration point for the unified protocol translation gateway

import { EventEmitter } from 'events';
import ProtocolTranslationGateway, { 
  ProtocolType, 
  ProtocolEndpoint, 
  UnifiedMessage, 
  MessagePriority,
  RoutingStrategy 
} from './protocol-gateway';
import ProtocolRouter, { LoadBalancingAlgorithm } from './protocol-router';
import MAVLinkAdapter from './adapters/mavlink-adapter';
import CyphalAdapter from './adapters/cyphal-adapter';
import { webSocketService } from './websocket';
import { Drone } from './types';

// Integration configuration
export interface ProtocolIntegrationConfig {
  // Gateway settings
  enableGateway: boolean;
  defaultRoutingStrategy: RoutingStrategy;
  
  // MAVLink configuration
  mavlink?: {
    enabled: boolean;
    url?: string;
    timeout?: number;
  };
  
  // Cyphal configuration
  cyphal?: {
    enabled: boolean;
    nodeId: number;
    port?: number;
    multicastAddress?: string;
    redundantPorts?: number[];
  };
  
  // Routing configuration
  routing?: {
    enableFailover: boolean;
    loadBalancingAlgorithm: LoadBalancingAlgorithm;
    circuitBreakerThreshold: number;
    healthCheckInterval: number;
  };
  
  // Performance optimization
  performance?: {
    enableCaching: boolean;
    cacheTimeout: number;
    maxConcurrentMessages: number;
    batchingEnabled: boolean;
    batchSize: number;
    batchTimeout: number;
  };
}

// Message batching for performance optimization
interface MessageBatch {
  messages: UnifiedMessage[];
  targetProtocol: ProtocolType;
  droneId: string;
  priority: MessagePriority;
  createdAt: number;
  timeout: NodeJS.Timeout;
}

// Performance metrics
interface PerformanceMetrics {
  totalMessages: number;
  successfulTranslations: number;
  failedTranslations: number;
  averageLatency: number;
  protocolSwitches: number;
  cacheHits: number;
  cacheMisses: number;
}

export class ProtocolIntegration extends EventEmitter {
  private gateway: ProtocolTranslationGateway;
  private router: ProtocolRouter;
  private config: ProtocolIntegrationConfig;
  private isInitialized: boolean = false;
  private messageCache: Map<string, any> = new Map();
  private messageBatches: Map<string, MessageBatch> = new Map();
  private performanceMetrics: PerformanceMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private concurrentMessages: number = 0;

  constructor(config: ProtocolIntegrationConfig) {
    super();
    
    this.config = {
      enableGateway: true,
      defaultRoutingStrategy: RoutingStrategy.DIRECT,
      mavlink: {
        enabled: true,
        url: 'ws://localhost:5760',
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
      },
      ...config
    };
    
    this.performanceMetrics = {
      totalMessages: 0,
      successfulTranslations: 0,
      failedTranslations: 0,
      averageLatency: 0,
      protocolSwitches: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.gateway = new ProtocolTranslationGateway();
    this.router = new ProtocolRouter({
      enabled: this.config.routing?.enableFailover,
      circuitBreakerThreshold: this.config.routing?.circuitBreakerThreshold
    });
    
    this.setupEventHandlers();
  }

  // Initialize the complete protocol integration system
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Protocol integration already initialized');
      return;
    }

    try {
      console.log('Initializing Protocol Integration System...');
      
      // Initialize adapters based on configuration
      await this.initializeAdapters();
      
      // Start the gateway
      if (this.config.enableGateway) {
        await this.gateway.start();
      }
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Set up WebSocket integration
      this.setupWebSocketIntegration();
      
      this.isInitialized = true;
      console.log('Protocol Integration System initialized successfully');
      
      this.emit('integration:initialized');
    } catch (error) {
      console.error('Failed to initialize protocol integration:', error);
      throw error;
    }
  }

  // Shutdown the integration system
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    
    console.log('Shutting down Protocol Integration System...');
    
    // Clear any pending batches
    for (const batch of this.messageBatches.values()) {
      clearTimeout(batch.timeout);
    }
    this.messageBatches.clear();
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Shutdown components
    await this.gateway.stop();
    this.router.shutdown();
    
    // Clear cache
    this.messageCache.clear();
    
    this.isInitialized = false;
    console.log('Protocol Integration System shut down');
    
    this.emit('integration:shutdown');
  }

  // Send message with intelligent protocol selection and optimization
  public async sendMessage(
    droneId: string,
    message: Partial<UnifiedMessage>,
    options?: {
      strategy?: RoutingStrategy;
      forceProtocol?: ProtocolType;
      enableBatching?: boolean;
      priority?: MessagePriority;
    }
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Protocol integration not initialized');
    }
    
    // Check concurrent message limit
    if (this.concurrentMessages >= (this.config.performance?.maxConcurrentMessages || 100)) {
      console.warn('Max concurrent messages reached, queuing message');
      // In a real implementation, this would queue the message
      return false;
    }
    
    this.concurrentMessages++;
    const startTime = Date.now();
    
    try {
      // Create unified message
      const unifiedMessage: UnifiedMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: message.type || 'command',
        sourceProtocol: ProtocolType.AUTO_DETECT,
        droneId,
        priority: options?.priority || message.priority || MessagePriority.NORMAL,
        timestamp: Date.now(),
        data: message.data,
        requiresAck: message.requiresAck || false,
        timeout: message.timeout || 5000,
        ...message
      };
      
      this.performanceMetrics.totalMessages++;
      
      // Check cache first
      if (this.config.performance?.enableCaching) {
        const cacheKey = this.generateCacheKey(unifiedMessage);
        const cachedResult = this.messageCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp) < (this.config.performance.cacheTimeout || 30000)) {
          this.performanceMetrics.cacheHits++;
          console.log('Using cached result for message');
          return cachedResult.success;
        }
        this.performanceMetrics.cacheMisses++;
      }
      
      // Handle batching if enabled
      if (options?.enableBatching && this.config.performance?.batchingEnabled) {
        return this.handleMessageBatching(unifiedMessage, options.strategy);
      }
      
      // Send message through gateway
      const strategy = options?.strategy || this.config.defaultRoutingStrategy;
      const success = await this.gateway.sendToDrone(droneId, unifiedMessage, strategy);
      
      // Update metrics
      const latency = Date.now() - startTime;
      this.updatePerformanceMetrics(success, latency);
      
      // Cache result if enabled
      if (this.config.performance?.enableCaching) {
        const cacheKey = this.generateCacheKey(unifiedMessage);
        this.messageCache.set(cacheKey, {
          success,
          timestamp: Date.now()
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      this.performanceMetrics.failedTranslations++;
      return false;
    } finally {
      this.concurrentMessages--;
    }
  }

  // Get all discovered drones from all protocols
  public getAllDrones(): Drone[] {
    const allDrones: Drone[] = [];
    const droneMap = new Map<string, Drone>();
    
    // Collect drones from all adapters
    for (const adapter of this.gateway.getAdapters().values()) {
      const drones = adapter.getDrones();
      for (const drone of drones) {
        // Merge drone information if seen from multiple protocols
        if (droneMap.has(drone.id)) {
          const existingDrone = droneMap.get(drone.id)!;
          // Merge data, preferring more recent information
          droneMap.set(drone.id, this.mergeDroneData(existingDrone, drone));
        } else {
          droneMap.set(drone.id, drone);
        }
      }
    }
    
    return Array.from(droneMap.values());
  }

  // Get performance metrics
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Get routing status
  public getRoutingStatus(): any {
    return {
      protocols: Array.from(this.gateway.getAdapters().keys()),
      metrics: Object.fromEntries(this.router.getRoutingMetrics()),
      circuitBreakers: Object.fromEntries(this.router.getCircuitBreakerStatus()),
      droneCapabilities: Object.fromEntries(this.gateway.getDroneCapabilities())
    };
  }

  // Switch drone's primary protocol
  public async switchDroneProtocol(droneId: string, protocol: ProtocolType): Promise<boolean> {
    try {
      // This would integrate with the gateway's protocol switching
      this.performanceMetrics.protocolSwitches++;
      
      console.log(`Switching drone ${droneId} to protocol ${protocol}`);
      this.emit('protocol:switched', { droneId, protocol });
      
      return true;
    } catch (error) {
      console.error('Failed to switch protocol:', error);
      return false;
    }
  }

  // Force protocol health check
  public async runHealthCheck(): Promise<Map<ProtocolType, boolean>> {
    const results = new Map<ProtocolType, boolean>();
    
    for (const [protocol, adapter] of this.gateway.getAdapters()) {
      try {
        const healthy = await adapter.healthCheck();
        results.set(protocol, healthy);
        
        if (!healthy) {
          console.warn(`Protocol ${protocol} failed health check`);
          this.emit('protocol:unhealthy', { protocol });
        }
      } catch (error) {
        console.error(`Health check error for ${protocol}:`, error);
        results.set(protocol, false);
      }
    }
    
    return results;
  }

  // Private methods

  private async initializeAdapters(): Promise<void> {
    const endpoints: ProtocolEndpoint[] = [];
    
    // Initialize MAVLink adapter
    if (this.config.mavlink?.enabled) {
      const mavlinkAdapter = new MAVLinkAdapter({
        url: this.config.mavlink.url,
        connectionTimeout: this.config.mavlink.timeout
      });
      
      this.gateway.addAdapter(mavlinkAdapter);
      this.router.initializeProtocol(ProtocolType.MAVLINK);
      
      endpoints.push({
        id: 'mavlink_primary',
        protocol: ProtocolType.MAVLINK,
        config: this.config.mavlink,
        priority: 1
      });
    }
    
    // Initialize Cyphal adapter
    if (this.config.cyphal?.enabled) {
      const cyphalAdapter = new CyphalAdapter({
        nodeId: this.config.cyphal.nodeId,
        port: this.config.cyphal.port,
        multicastAddress: this.config.cyphal.multicastAddress,
        redundantPorts: this.config.cyphal.redundantPorts
      });
      
      this.gateway.addAdapter(cyphalAdapter);
      this.router.initializeProtocol(ProtocolType.CYPHAL);
      
      endpoints.push({
        id: 'cyphal_primary',
        protocol: ProtocolType.CYPHAL,
        config: this.config.cyphal,
        priority: 2
      });
    }
    
    // Add endpoints to gateway
    for (const endpoint of endpoints) {
      this.gateway.addEndpoint(endpoint);
    }
    
    console.log(`Initialized ${endpoints.length} protocol adapters`);
  }

  private setupEventHandlers(): void {
    // Gateway events
    this.gateway.on('gateway:started', () => {
      console.log('Protocol gateway started');
      this.emit('gateway:ready');
    });
    
    this.gateway.on('gateway:stopped', () => {
      console.log('Protocol gateway stopped');
    });
    
    // Router events
    this.router.on('circuit_breaker:opened', (data) => {
      console.warn(`Circuit breaker opened for ${data.protocol}`);
      this.emit('protocol:circuit_breaker', data);
    });
    
    this.router.on('metrics:updated', (data) => {
      // Update routing metrics based on router feedback
      console.log(`Routing metrics updated for ${data.protocol}`);
    });
  }

  private setupWebSocketIntegration(): void {
    if (!webSocketService) {
      console.warn('WebSocket service not available for integration');
      return;
    }
    
    // Handle commands from web clients
    webSocketService.subscribe('integration_command', async (data) => {
      try {
        switch (data.command) {
          case 'send_message':
            const success = await this.sendMessage(data.droneId, data.message, data.options);
            webSocketService.send('command_result', { id: data.id, success });
            break;
          
          case 'get_drones':
            const drones = this.getAllDrones();
            webSocketService.send('drones_list', { drones });
            break;
          
          case 'get_status':
            const status = this.getRoutingStatus();
            webSocketService.send('integration_status', status);
            break;
          
          case 'switch_protocol':
            const switched = await this.switchDroneProtocol(data.droneId, data.protocol);
            webSocketService.send('protocol_switch_result', { success: switched });
            break;
          
          case 'health_check':
            const healthResults = await this.runHealthCheck();
            webSocketService.send('health_check_results', { results: Object.fromEntries(healthResults) });
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket command:', error);
        webSocketService.send('command_error', { id: data.id, error: error.message });
      }
    });
    
    // Broadcast status updates
    setInterval(() => {
      if (webSocketService && this.isInitialized) {
        webSocketService.send('integration_metrics', this.getPerformanceMetrics());
      }
    }, 10000); // Every 10 seconds
  }

  private startHealthMonitoring(): void {
    const interval = this.config.routing?.healthCheckInterval || 10000;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthCheck();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, interval);
  }

  private handleMessageBatching(message: UnifiedMessage, strategy?: RoutingStrategy): Promise<boolean> {
    return new Promise((resolve) => {
      const batchKey = `${message.droneId}_${message.targetProtocol || 'auto'}`;
      let batch = this.messageBatches.get(batchKey);
      
      if (!batch) {
        batch = {
          messages: [],
          targetProtocol: message.targetProtocol || ProtocolType.AUTO_DETECT,
          droneId: message.droneId,
          priority: message.priority,
          createdAt: Date.now(),
          timeout: setTimeout(() => {
            this.processBatch(batchKey);
          }, this.config.performance?.batchTimeout || 1000)
        };
        
        this.messageBatches.set(batchKey, batch);
      }
      
      batch.messages.push(message);
      
      // Process batch if it reaches the size limit
      if (batch.messages.length >= (this.config.performance?.batchSize || 10)) {
        clearTimeout(batch.timeout);
        this.processBatch(batchKey);
      }
      
      // For now, resolve immediately (would be more complex in real implementation)
      resolve(true);
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.messageBatches.get(batchKey);
    if (!batch) return;
    
    this.messageBatches.delete(batchKey);
    
    console.log(`Processing batch of ${batch.messages.length} messages for ${batch.droneId}`);
    
    // Process all messages in the batch
    for (const message of batch.messages) {
      try {
        await this.gateway.sendToDrone(batch.droneId, message, RoutingStrategy.DIRECT);
      } catch (error) {
        console.error('Error processing batched message:', error);
      }
    }
  }

  private generateCacheKey(message: UnifiedMessage): string {
    return `${message.droneId}_${message.type}_${JSON.stringify(message.data)}`;
  }

  private updatePerformanceMetrics(success: boolean, latency: number): void {
    if (success) {
      this.performanceMetrics.successfulTranslations++;
    } else {
      this.performanceMetrics.failedTranslations++;
    }
    
    // Update average latency with exponential moving average
    const alpha = 0.1;
    this.performanceMetrics.averageLatency = 
      alpha * latency + (1 - alpha) * this.performanceMetrics.averageLatency;
  }

  private mergeDroneData(existing: Drone, new_: Drone): Drone {
    // Merge drone data, preferring more recent information
    return {
      ...existing,
      // Use the most recent status
      status: new_.status !== 'offline' ? new_.status : existing.status,
      // Take the best battery reading
      battery: Math.max(existing.battery, new_.battery),
      // Take the best signal reading
      signal: Math.max(existing.signal, new_.signal),
      // Use most recent location if available
      location: new_.location || existing.location,
      altitude: new_.altitude || existing.altitude,
      speed: new_.speed || existing.speed,
      heading: new_.heading || existing.heading,
      // Merge mission counts
      missionCount: Math.max(existing.missionCount, new_.missionCount),
      // Keep the earlier maintenance date
      nextMaintenance: existing.nextMaintenance < new_.nextMaintenance 
        ? existing.nextMaintenance 
        : new_.nextMaintenance
    };
  }
}

export default ProtocolIntegration;
