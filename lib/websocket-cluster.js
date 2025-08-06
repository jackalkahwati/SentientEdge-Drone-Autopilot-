// WebSocket Cluster Manager with Redis Pub/Sub for Horizontal Scaling
// Military-grade drone communication infrastructure

const { EventEmitter } = require('events');
const Redis = require('redis');
const crypto = require('crypto');
const os = require('os');
const { performance } = require('perf_hooks');

class WebSocketClusterManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.serverId = options.serverId || `ws-server-${os.hostname()}-${process.pid}`;
    this.namespace = options.namespace || 'sentient-edge';
    this.redisConfig = options.redis || {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // IPv4
      connectTimeout: 10000,
      commandTimeout: 5000,
    };
    
    // Connection pools
    this.publisher = null;
    this.subscriber = null;
    this.dataStore = null;
    
    // Server state management
    this.connectionCount = 0;
    this.messageRate = 0;
    this.serverMetrics = {
      cpu: 0,
      memory: 0,
      connections: 0,
      messagesPerSecond: 0,
      uptime: Date.now(),
      lastHealthCheck: Date.now(),
    };
    
    // Connection tracking
    this.localConnections = new Map(); // clientId -> connection metadata
    this.connectionsByDrone = new Map(); // droneId -> Set of clientIds
    this.subscriptions = new Map(); // channel -> Set of clientIds
    
    // Performance optimization
    this.batchSize = options.batchSize || 100;
    this.batchTimeout = options.batchTimeout || 10; // ms
    this.messageBatch = [];
    this.batchTimer = null;
    
    // Circuit breaker state
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      threshold: options.circuitBreakerThreshold || 5,
      timeout: options.circuitBreakerTimeout || 60000,
    };
    
    // Health monitoring
    this.healthCheckInterval = null;
    this.metricsInterval = null;
    
    this.setupErrorHandlers();
  }

  async initialize() {
    try {
      console.log(`🔄 Initializing WebSocket cluster node: ${this.serverId}`);
      
      // Create Redis connections with different roles
      await this.createRedisConnections();
      
      // Set up pub/sub channels
      await this.setupPubSubChannels();
      
      // Register this server instance
      await this.registerServerInstance();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      console.log(`✅ WebSocket cluster node initialized: ${this.serverId}`);
      this.emit('cluster:ready');
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket cluster:', error);
      throw error;
    }
  }

  async createRedisConnections() {
    // Publisher connection for sending messages
    this.publisher = Redis.createClient({
      ...this.redisConfig,
      name: `${this.serverId}-pub`,
    });
    
    // Subscriber connection for receiving messages
    this.subscriber = Redis.createClient({
      ...this.redisConfig,
      name: `${this.serverId}-sub`,
    });
    
    // Data store connection for persistent operations
    this.dataStore = Redis.createClient({
      ...this.redisConfig,
      name: `${this.serverId}-data`,
    });
    
    // Connect all clients
    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
      this.dataStore.connect(),
    ]);
    
    console.log('✅ Redis connections established for clustering');
  }

  async setupPubSubChannels() {
    const channels = [
      `${this.namespace}:broadcast`,           // System-wide broadcasts
      `${this.namespace}:drone:telemetry`,     // Drone telemetry updates
      `${this.namespace}:mission:updates`,     // Mission status updates
      `${this.namespace}:alerts`,              // System alerts
      `${this.namespace}:server:heartbeat`,    // Server health signals
      `${this.namespace}:scaling:events`,      // Auto-scaling events
    ];
    
    // Subscribe to all channels
    for (const channel of channels) {
      await this.subscriber.subscribe(channel, (message, channel) => {
        this.handleClusterMessage(message, channel);
      });
    }
    
    console.log(`✅ Subscribed to ${channels.length} cluster channels`);
  }

  async registerServerInstance() {
    const serverInfo = {
      serverId: this.serverId,
      hostname: os.hostname(),
      pid: process.pid,
      port: process.env.PORT || 4000,
      startTime: Date.now(),
      version: '2.0.0-cluster',
      capabilities: [
        'drone-telemetry',
        'mission-control',
        'real-time-updates',
        'high-frequency-data',
      ],
      maxConnections: parseInt(process.env.MAX_WS_CONNECTIONS) || 10000,
    };
    
    // Register in Redis with TTL
    await this.dataStore.setEx(
      `${this.namespace}:servers:${this.serverId}`,
      30, // 30 second TTL
      JSON.stringify(serverInfo)
    );
    
    console.log(`📝 Server registered in cluster: ${this.serverId}`);
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.updateServerMetrics();
        
        // Reset circuit breaker if healthy
        if (this.circuitBreaker.state === 'HALF_OPEN') {
          this.circuitBreaker.state = 'CLOSED';
          this.circuitBreaker.failures = 0;
          console.log('🔄 Circuit breaker reset to CLOSED state');
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.handleCircuitBreakerFailure();
      }
    }, 10000); // Every 10 seconds
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectServerMetrics();
      this.resetMessageRate();
    }, 1000); // Every second
  }

  async performHealthCheck() {
    const startTime = performance.now();
    
    // Check Redis connectivity
    await this.publisher.ping();
    await this.subscriber.ping();
    await this.dataStore.ping();
    
    const responseTime = performance.now() - startTime;
    
    // Update server registration with fresh TTL
    await this.registerServerInstance();
    
    // Publish heartbeat
    await this.publishToCluster('server:heartbeat', {
      serverId: this.serverId,
      timestamp: Date.now(),
      metrics: this.serverMetrics,
      responseTime,
      connectionCount: this.connectionCount,
      circuitBreakerState: this.circuitBreaker.state,
    });
    
    this.serverMetrics.lastHealthCheck = Date.now();
  }

  collectServerMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.serverMetrics = {
      ...this.serverMetrics,
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memory: memUsage.heapUsed / 1024 / 1024, // MB
      connections: this.connectionCount,
      messagesPerSecond: this.messageRate,
      uptime: Date.now() - this.serverMetrics.uptime,
    };
  }

  resetMessageRate() {
    this.messageRate = 0;
  }

  // Connection management
  addConnection(clientId, connectionData) {
    this.localConnections.set(clientId, {
      ...connectionData,
      serverId: this.serverId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
    });
    
    this.connectionCount++;
    
    // Track drone connections separately
    if (connectionData.droneId) {
      if (!this.connectionsByDrone.has(connectionData.droneId)) {
        this.connectionsByDrone.set(connectionData.droneId, new Set());
      }
      this.connectionsByDrone.get(connectionData.droneId).add(clientId);
    }
    
    this.emit('connection:added', { clientId, connectionData });
  }

  removeConnection(clientId) {
    const connection = this.localConnections.get(clientId);
    if (!connection) return;
    
    this.localConnections.delete(clientId);
    this.connectionCount--;
    
    // Remove from drone tracking
    if (connection.droneId) {
      const droneConnections = this.connectionsByDrone.get(connection.droneId);
      if (droneConnections) {
        droneConnections.delete(clientId);
        if (droneConnections.size === 0) {
          this.connectionsByDrone.delete(connection.droneId);
        }
      }
    }
    
    // Remove from subscriptions
    for (const [channel, subscribers] of this.subscriptions) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }
    
    this.emit('connection:removed', { clientId, connection });
  }

  updateConnectionActivity(clientId) {
    const connection = this.localConnections.get(clientId);
    if (connection) {
      connection.lastActivity = Date.now();
      connection.messageCount++;
      this.messageRate++;
    }
  }

  // Message publishing to cluster
  async publishToCluster(channel, data, options = {}) {
    if (this.circuitBreaker.state === 'OPEN') {
      console.warn('⚠️ Circuit breaker OPEN - dropping cluster message');
      return false;
    }
    
    try {
      const message = {
        serverId: this.serverId,
        timestamp: Date.now(),
        messageId: crypto.randomUUID(),
        channel,
        data,
        options,
      };
      
      const fullChannel = `${this.namespace}:${channel}`;
      
      if (options.batch && this.batchSize > 1) {
        await this.addToBatch(fullChannel, message);
      } else {
        await this.publisher.publish(fullChannel, JSON.stringify(message));
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to publish to cluster:', error);
      this.handleCircuitBreakerFailure();
      return false;
    }
  }

  async addToBatch(channel, message) {
    this.messageBatch.push({ channel, message });
    
    if (this.messageBatch.length >= this.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.batchTimeout);
    }
  }

  async flushBatch() {
    if (this.messageBatch.length === 0) return;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    const batch = this.messageBatch.splice(0);
    const pipeline = this.publisher.multi();
    
    for (const { channel, message } of batch) {
      pipeline.publish(channel, JSON.stringify(message));
    }
    
    try {
      await pipeline.exec();
      console.log(`📦 Flushed batch of ${batch.length} messages`);
    } catch (error) {
      console.error('❌ Failed to flush message batch:', error);
      this.handleCircuitBreakerFailure();
    }
  }

  // Handle incoming cluster messages
  handleClusterMessage(rawMessage, channel) {
    try {
      const message = JSON.parse(rawMessage);
      
      // Don't process our own messages
      if (message.serverId === this.serverId) {
        return;
      }
      
      const localChannel = channel.replace(`${this.namespace}:`, '');
      
      switch (localChannel) {
        case 'broadcast':
          this.handleBroadcastMessage(message);
          break;
        case 'drone:telemetry':
          this.handleDroneTelemetryMessage(message);
          break;
        case 'mission:updates':
          this.handleMissionUpdateMessage(message);
          break;
        case 'alerts':
          this.handleAlertMessage(message);
          break;
        case 'server:heartbeat':
          this.handleServerHeartbeat(message);
          break;
        case 'scaling:events':
          this.handleScalingEvent(message);
          break;
        default:
          console.log(`🔄 Received cluster message on ${localChannel}:`, message);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle cluster message:', error);
    }
  }

  handleBroadcastMessage(message) {
    // Broadcast to all local connections
    for (const [clientId, connection] of this.localConnections) {
      this.emit('message:broadcast', {
        clientId,
        connection,
        data: message.data,
      });
    }
  }

  handleDroneTelemetryMessage(message) {
    const { droneId, telemetryData } = message.data;
    
    // Send to connections subscribed to this drone
    const droneConnections = this.connectionsByDrone.get(droneId);
    if (droneConnections) {
      for (const clientId of droneConnections) {
        const connection = this.localConnections.get(clientId);
        if (connection) {
          this.emit('message:drone-telemetry', {
            clientId,
            connection,
            droneId,
            data: telemetryData,
          });
        }
      }
    }
  }

  handleMissionUpdateMessage(message) {
    const { missionId, updateData } = message.data;
    
    // Broadcast to relevant connections based on permissions
    for (const [clientId, connection] of this.localConnections) {
      if (this.hasPermissionForMission(connection, missionId)) {
        this.emit('message:mission-update', {
          clientId,
          connection,
          missionId,
          data: updateData,
        });
      }
    }
  }

  handleAlertMessage(message) {
    const { severity, alertData } = message.data;
    
    // Send alerts based on severity and user permissions
    for (const [clientId, connection] of this.localConnections) {
      if (this.hasPermissionForAlert(connection, severity)) {
        this.emit('message:alert', {
          clientId,
          connection,
          severity,
          data: alertData,
        });
      }
    }
  }

  handleServerHeartbeat(message) {
    // Update cluster server registry
    this.emit('cluster:server-heartbeat', message);
  }

  handleScalingEvent(message) {
    // Handle auto-scaling events
    this.emit('cluster:scaling-event', message);
  }

  // Permission checking helpers
  hasPermissionForMission(connection, missionId) {
    // Implement mission-based permission checking
    return connection.user.permissions.includes('MISSION_VIEW');
  }

  hasPermissionForAlert(connection, severity) {
    // Implement alert permission checking based on severity
    const requiredPermissions = {
      'low': ['ALERT_VIEW'],
      'medium': ['ALERT_VIEW'],
      'high': ['ALERT_MANAGE'],
      'critical': ['ALERT_MANAGE', 'ADMIN'],
    };
    
    const required = requiredPermissions[severity] || ['ALERT_VIEW'];
    return required.some(perm => connection.user.permissions.includes(perm));
  }

  // Circuit breaker pattern
  handleCircuitBreakerFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      console.log(`🚨 Circuit breaker OPEN after ${this.circuitBreaker.failures} failures`);
      
      // Set timer to move to HALF_OPEN state
      setTimeout(() => {
        this.circuitBreaker.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker moved to HALF_OPEN state');
      }, this.circuitBreaker.timeout);
    }
  }

  // Server discovery and load balancing
  async getClusterServers() {
    const keys = await this.dataStore.keys(`${this.namespace}:servers:*`);
    const servers = [];
    
    for (const key of keys) {
      try {
        const serverData = await this.dataStore.get(key);
        if (serverData) {
          servers.push(JSON.parse(serverData));
        }
      } catch (error) {
        console.error(`❌ Failed to parse server data for ${key}:`, error);
      }
    }
    
    return servers;
  }

  async selectOptimalServer(criteria = {}) {
    const servers = await this.getClusterServers();
    
    // Filter healthy servers
    const healthyServers = servers.filter(server => {
      const age = Date.now() - server.startTime;
      return age < 60000; // Server registered within last minute
    });
    
    if (healthyServers.length === 0) {
      return null;
    }
    
    // Sort by connection count (load balancing)
    return healthyServers.sort((a, b) => {
      const aLoad = a.connectionCount || 0;
      const bLoad = b.connectionCount || 0;
      return aLoad - bLoad;
    })[0];
  }

  // Error handling
  setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception in WebSocket cluster:', error);
      this.handleCircuitBreakerFailure();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection in WebSocket cluster:', reason);
      this.handleCircuitBreakerFailure();
    });
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down WebSocket cluster node...');
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Flush any remaining batches
    await this.flushBatch();
    
    // Unregister server
    try {
      await this.dataStore.del(`${this.namespace}:servers:${this.serverId}`);
    } catch (error) {
      console.error('❌ Failed to unregister server:', error);
    }
    
    // Close Redis connections
    await Promise.allSettled([
      this.publisher?.quit(),
      this.subscriber?.quit(),
      this.dataStore?.quit(),
    ]);
    
    console.log('✅ WebSocket cluster node shutdown complete');
  }

  // Statistics and monitoring
  getClusterStats() {
    return {
      serverId: this.serverId,
      connectionCount: this.connectionCount,
      localConnections: this.localConnections.size,
      droneConnections: this.connectionsByDrone.size,
      subscriptions: this.subscriptions.size,
      metrics: this.serverMetrics,
      circuitBreaker: this.circuitBreaker,
      batchStatus: {
        pendingMessages: this.messageBatch.length,
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout,
      },
    };
  }
}

module.exports = { WebSocketClusterManager };