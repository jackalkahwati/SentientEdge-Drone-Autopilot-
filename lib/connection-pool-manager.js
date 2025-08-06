// Advanced WebSocket Connection Pool Manager
// High-performance connection pooling for military-grade drone operations

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

class ConnectionPoolManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConnections: options.maxConnections || 10000,
      maxConnectionsPerDrone: options.maxConnectionsPerDrone || 5,
      maxConnectionsPerUser: options.maxConnectionsPerUser || 10,
      connectionTimeout: options.connectionTimeout || 300000, // 5 minutes
      idleTimeout: options.idleTimeout || 600000, // 10 minutes
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      messageQueueSize: options.messageQueueSize || 1000,
      priorityLevels: options.priorityLevels || ['critical', 'high', 'normal', 'low'],
      rateLimitWindow: options.rateLimitWindow || 60000, // 1 minute
      rateLimitMax: options.rateLimitMax || 1000, // messages per window
    };
    
    // Connection pools organized by different criteria
    this.connections = new Map(); // connectionId -> ConnectionWrapper
    this.userConnections = new Map(); // userId -> Set of connectionIds
    this.droneConnections = new Map(); // droneId -> Set of connectionIds
    this.roleConnections = new Map(); // role -> Set of connectionIds
    this.priorityQueues = new Map(); // priority -> Queue of messages
    
    // Resource monitoring
    this.statistics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      deadConnections: 0,
      messagesProcessed: 0,
      messagesQueued: 0,
      averageResponseTime: 0,
      peakConnections: 0,
      connectionErrors: 0,
      memoryUsage: 0,
    };
    
    // Rate limiting
    this.rateLimiters = new Map(); // connectionId -> rate limit data
    
    // Connection health monitoring
    this.healthChecks = new Map(); // connectionId -> health data
    
    // Message queues for different priorities
    this.initializePriorityQueues();
    
    // Start background processes
    this.startHealthChecking();
    this.startConnectionCleanup();
    this.startMessageProcessing();
    
    console.log('🔄 Connection Pool Manager initialized with max:', this.options.maxConnections);
  }

  initializePriorityQueues() {
    for (const priority of this.options.priorityLevels) {
      this.priorityQueues.set(priority, []);
    }
  }

  // Connection wrapper class for enhanced management
  createConnectionWrapper(socket, connectionData) {
    const connectionId = crypto.randomUUID();
    
    const wrapper = {
      id: connectionId,
      socket: socket,
      metadata: {
        ...connectionData,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        lastPing: Date.now(),
        messageCount: 0,
        bytesSent: 0,
        bytesReceived: 0,
        averageLatency: 0,
        status: 'active', // active, idle, dead, throttled
        priority: connectionData.priority || 'normal',
        healthScore: 100,
      },
      messageQueue: [],
      rateLimitData: {
        messageCount: 0,
        windowStart: Date.now(),
        throttled: false,
      },
      subscriptions: new Set(),
      channels: new Set(),
    };
    
    // Set up socket event handlers
    this.setupSocketHandlers(wrapper);
    
    return wrapper;
  }

  setupSocketHandlers(wrapper) {
    const { socket, metadata } = wrapper;
    
    socket.on('message', (data) => {
      this.handleMessage(wrapper, data);
    });
    
    socket.on('pong', () => {
      metadata.lastPing = Date.now();
      metadata.lastActivity = Date.now();
      this.updateHealthScore(wrapper);
    });
    
    socket.on('close', (code, reason) => {
      this.removeConnection(wrapper.id, { code, reason });
    });
    
    socket.on('error', (error) => {
      console.error(`Connection error for ${wrapper.id}:`, error);
      this.statistics.connectionErrors++;
      this.updateHealthScore(wrapper, -20);
    });
    
    // Set up periodic ping
    const pingInterval = setInterval(() => {
      if (socket.readyState === 1) { // OPEN
        socket.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 25000);
    
    wrapper.pingInterval = pingInterval;
  }

  // Add connection to pool
  addConnection(socket, connectionData) {
    // Check global connection limit
    if (this.connections.size >= this.options.maxConnections) {
      console.warn('⚠️ Connection pool at capacity, rejecting new connection');
      socket.close(1013, 'Server overloaded');
      return null;
    }
    
    // Check per-user connection limit
    const userId = connectionData.user?.userId;
    if (userId) {
      const userConnCount = this.userConnections.get(userId)?.size || 0;
      if (userConnCount >= this.options.maxConnectionsPerUser) {
        console.warn(`⚠️ User ${userId} exceeded connection limit`);
        socket.close(1013, 'Too many connections');
        return null;
      }
    }
    
    // Check per-drone connection limit
    const droneId = connectionData.droneId;
    if (droneId) {
      const droneConnCount = this.droneConnections.get(droneId)?.size || 0;
      if (droneConnCount >= this.options.maxConnectionsPerDrone) {
        console.warn(`⚠️ Drone ${droneId} exceeded connection limit`);
        socket.close(1013, 'Too many drone connections');
        return null;
      }
    }
    
    // Create connection wrapper
    const wrapper = this.createConnectionWrapper(socket, connectionData);
    
    // Add to pools
    this.connections.set(wrapper.id, wrapper);
    
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId).add(wrapper.id);
    }
    
    if (droneId) {
      if (!this.droneConnections.has(droneId)) {
        this.droneConnections.set(droneId, new Set());
      }
      this.droneConnections.get(droneId).add(wrapper.id);
    }
    
    const role = connectionData.user?.role;
    if (role) {
      if (!this.roleConnections.has(role)) {
        this.roleConnections.set(role, new Set());
      }
      this.roleConnections.get(role).add(wrapper.id);
    }
    
    // Initialize rate limiter
    this.rateLimiters.set(wrapper.id, wrapper.rateLimitData);
    
    // Initialize health monitoring
    this.healthChecks.set(wrapper.id, {
      lastCheck: Date.now(),
      responseTime: 0,
      pingCount: 0,
      failureCount: 0,
    });
    
    // Update statistics
    this.statistics.totalConnections++;
    this.statistics.activeConnections++;
    if (this.statistics.activeConnections > this.statistics.peakConnections) {
      this.statistics.peakConnections = this.statistics.activeConnections;
    }
    
    console.log(`✅ Connection added to pool: ${wrapper.id} (${this.statistics.activeConnections}/${this.options.maxConnections})`);
    
    this.emit('connection:added', wrapper);
    return wrapper;
  }

  // Remove connection from pool
  removeConnection(connectionId, closeInfo = {}) {
    const wrapper = this.connections.get(connectionId);
    if (!wrapper) return;
    
    // Clear ping interval
    if (wrapper.pingInterval) {
      clearInterval(wrapper.pingInterval);
    }
    
    // Remove from all tracking structures
    this.connections.delete(connectionId);
    
    const userId = wrapper.metadata.user?.userId;
    if (userId && this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(connectionId);
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }
    
    const droneId = wrapper.metadata.droneId;
    if (droneId && this.droneConnections.has(droneId)) {
      this.droneConnections.get(droneId).delete(connectionId);
      if (this.droneConnections.get(droneId).size === 0) {
        this.droneConnections.delete(droneId);
      }
    }
    
    const role = wrapper.metadata.user?.role;
    if (role && this.roleConnections.has(role)) {
      this.roleConnections.get(role).delete(connectionId);
      if (this.roleConnections.get(role).size === 0) {
        this.roleConnections.delete(role);
      }
    }
    
    // Clean up tracking data
    this.rateLimiters.delete(connectionId);
    this.healthChecks.delete(connectionId);
    
    // Update statistics
    this.statistics.activeConnections--;
    if (wrapper.metadata.status === 'dead') {
      this.statistics.deadConnections--;
    }
    
    console.log(`🗑️ Connection removed from pool: ${connectionId} (${this.statistics.activeConnections}/${this.options.maxConnections})`);
    
    this.emit('connection:removed', { wrapper, closeInfo });
  }

  // Handle incoming messages with rate limiting
  handleMessage(wrapper, data) {
    const startTime = performance.now();
    
    // Update activity
    wrapper.metadata.lastActivity = Date.now();
    wrapper.metadata.messageCount++;
    wrapper.metadata.bytesReceived += data.length;
    
    // Check rate limiting
    if (!this.checkRateLimit(wrapper)) {
      // Message dropped due to rate limiting
      return;
    }
    
    try {
      const message = JSON.parse(data.toString());
      
      // Add to appropriate priority queue
      const priority = message.priority || wrapper.metadata.priority || 'normal';
      this.addToQueue(priority, {
        connectionId: wrapper.id,
        message,
        timestamp: Date.now(),
        startTime,
      });
      
      this.statistics.messagesQueued++;
      
    } catch (error) {
      console.error(`Message parsing error for ${wrapper.id}:`, error);
      this.updateHealthScore(wrapper, -5);
    }
  }

  checkRateLimit(wrapper) {
    const rateLimitData = wrapper.rateLimitData;
    const now = Date.now();
    
    // Reset window if expired
    if (now - rateLimitData.windowStart > this.options.rateLimitWindow) {
      rateLimitData.messageCount = 0;
      rateLimitData.windowStart = now;
      rateLimitData.throttled = false;
    }
    
    rateLimitData.messageCount++;
    
    // Check if over limit
    if (rateLimitData.messageCount > this.options.rateLimitMax) {
      if (!rateLimitData.throttled) {
        console.warn(`⚠️ Rate limiting connection ${wrapper.id}`);
        rateLimitData.throttled = true;
        wrapper.metadata.status = 'throttled';
        
        // Send throttling notice
        this.sendToConnection(wrapper.id, {
          type: 'rate_limit_warning',
          payload: {
            message: 'Rate limit exceeded',
            retryAfter: this.options.rateLimitWindow,
          },
        });
      }
      return false;
    }
    
    return true;
  }

  addToQueue(priority, messageData) {
    const queue = this.priorityQueues.get(priority);
    if (queue) {
      queue.push(messageData);
    } else {
      // Default to normal priority
      this.priorityQueues.get('normal').push(messageData);
    }
  }

  // Send message to specific connection
  sendToConnection(connectionId, message, options = {}) {
    const wrapper = this.connections.get(connectionId);
    if (!wrapper || wrapper.socket.readyState !== 1) {
      return false;
    }
    
    try {
      const serialized = JSON.stringify(message);
      wrapper.socket.send(serialized);
      
      // Update statistics
      wrapper.metadata.bytesSent += serialized.length;
      this.statistics.messagesProcessed++;
      
      // Add to message queue if connection is busy
      if (wrapper.messageQueue.length > 0 || options.queue) {
        wrapper.messageQueue.push({ message, timestamp: Date.now() });
        
        // Limit queue size
        if (wrapper.messageQueue.length > this.options.messageQueueSize) {
          wrapper.messageQueue.shift(); // Remove oldest message
        }
      }
      
      return true;
      
    } catch (error) {
      console.error(`Failed to send message to ${connectionId}:`, error);
      this.updateHealthScore(wrapper, -10);
      return false;
    }
  }

  // Broadcast to multiple connections with filtering
  broadcast(message, filter = {}) {
    let sentCount = 0;
    const startTime = performance.now();
    
    for (const [connectionId, wrapper] of this.connections) {
      if (this.matchesFilter(wrapper, filter)) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    }
    
    const duration = performance.now() - startTime;
    console.log(`📡 Broadcast sent to ${sentCount} connections in ${duration.toFixed(2)}ms`);
    
    return sentCount;
  }

  matchesFilter(wrapper, filter) {
    if (filter.role && wrapper.metadata.user?.role !== filter.role) {
      return false;
    }
    
    if (filter.droneId && wrapper.metadata.droneId !== filter.droneId) {
      return false;
    }
    
    if (filter.userId && wrapper.metadata.user?.userId !== filter.userId) {
      return false;
    }
    
    if (filter.permissions && !filter.permissions.every(perm => 
      wrapper.metadata.user?.permissions?.includes(perm))) {
      return false;
    }
    
    if (filter.status && wrapper.metadata.status !== filter.status) {
      return false;
    }
    
    if (filter.minHealthScore && wrapper.metadata.healthScore < filter.minHealthScore) {
      return false;
    }
    
    return true;
  }

  // Health checking and maintenance
  startHealthChecking() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
  }

  performHealthChecks() {
    const now = Date.now();
    let healthyCount = 0;
    let idleCount = 0;
    let deadCount = 0;
    
    for (const [connectionId, wrapper] of this.connections) {
      const timeSinceActivity = now - wrapper.metadata.lastActivity;
      const timeSincePing = now - wrapper.metadata.lastPing;
      
      // Check for dead connections
      if (timeSincePing > this.options.connectionTimeout) {
        wrapper.metadata.status = 'dead';
        this.statistics.deadConnections++;
        console.warn(`💀 Dead connection detected: ${connectionId}`);
        wrapper.socket.terminate();
        continue;
      }
      
      // Check for idle connections
      if (timeSinceActivity > this.options.idleTimeout) {
        wrapper.metadata.status = 'idle';
        idleCount++;
      } else {
        wrapper.metadata.status = 'active';
        healthyCount++;
      }
      
      // Update health score based on responsiveness
      this.updateHealthScore(wrapper);
    }
    
    this.statistics.activeConnections = healthyCount;
    this.statistics.idleConnections = idleCount;
    
    // Emit health report
    this.emit('health:report', {
      healthy: healthyCount,
      idle: idleCount,
      dead: deadCount,
      total: this.connections.size,
    });
  }

  updateHealthScore(wrapper, adjustment = 0) {
    const now = Date.now();
    const timeSincePing = now - wrapper.metadata.lastPing;
    
    // Base health score calculation
    let score = wrapper.metadata.healthScore;
    
    if (adjustment !== 0) {
      score += adjustment;
    } else {
      // Calculate based on response time
      if (timeSincePing < 1000) score = Math.min(100, score + 1);
      else if (timeSincePing < 5000) score = Math.max(0, score - 1);
      else score = Math.max(0, score - 5);
    }
    
    wrapper.metadata.healthScore = Math.max(0, Math.min(100, score));
    
    // Mark as dead if health score is too low
    if (wrapper.metadata.healthScore < 10) {
      wrapper.metadata.status = 'dead';
    }
  }

  startConnectionCleanup() {
    setInterval(() => {
      this.cleanupDeadConnections();
      this.updateStatistics();
    }, this.options.cleanupInterval);
  }

  cleanupDeadConnections() {
    const deadConnections = [];
    
    for (const [connectionId, wrapper] of this.connections) {
      if (wrapper.metadata.status === 'dead' || 
          wrapper.socket.readyState === 3) { // CLOSED
        deadConnections.push(connectionId);
      }
    }
    
    for (const connectionId of deadConnections) {
      this.removeConnection(connectionId);
    }
    
    if (deadConnections.length > 0) {
      console.log(`🧹 Cleaned up ${deadConnections.length} dead connections`);
    }
  }

  startMessageProcessing() {
    setInterval(() => {
      this.processMessageQueues();
    }, 10); // Process every 10ms for high frequency
  }

  processMessageQueues() {
    // Process priority queues in order
    for (const priority of this.options.priorityLevels) {
      const queue = this.priorityQueues.get(priority);
      if (queue.length > 0) {
        const batch = queue.splice(0, 10); // Process up to 10 messages per cycle
        
        for (const messageData of batch) {
          this.processQueuedMessage(messageData);
        }
      }
    }
  }

  processQueuedMessage(messageData) {
    const { connectionId, message, startTime } = messageData;
    const wrapper = this.connections.get(connectionId);
    
    if (!wrapper) return;
    
    // Process the message (this would typically involve business logic)
    this.emit('message:process', {
      connectionId,
      wrapper,
      message,
      processingTime: performance.now() - startTime,
    });
    
    this.statistics.messagesProcessed++;
  }

  updateStatistics() {
    const memUsage = process.memoryUsage();
    this.statistics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    
    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const healthData of this.healthChecks.values()) {
      if (healthData.responseTime > 0) {
        totalResponseTime += healthData.responseTime;
        responseCount++;
      }
    }
    
    this.statistics.averageResponseTime = responseCount > 0 ? 
      totalResponseTime / responseCount : 0;
  }

  // API methods for external access
  getConnectionsByUser(userId) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];
    
    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }

  getConnectionsByDrone(droneId) {
    const connectionIds = this.droneConnections.get(droneId);
    if (!connectionIds) return [];
    
    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }

  getConnectionsByRole(role) {
    const connectionIds = this.roleConnections.get(role);
    if (!connectionIds) return [];
    
    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }

  getPoolStatistics() {
    return {
      ...this.statistics,
      poolUtilization: (this.statistics.activeConnections / this.options.maxConnections) * 100,
      queueSizes: Object.fromEntries(
        Array.from(this.priorityQueues.entries()).map(([priority, queue]) => [
          priority, queue.length
        ])
      ),
      connectionsPerRole: Object.fromEntries(
        Array.from(this.roleConnections.entries()).map(([role, connections]) => [
          role, connections.size
        ])
      ),
      connectionsPerUser: this.userConnections.size,
      connectionsPerDrone: this.droneConnections.size,
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down connection pool manager...');
    
    // Close all connections gracefully
    const closePromises = [];
    for (const [connectionId, wrapper] of this.connections) {
      closePromises.push(new Promise(resolve => {
        wrapper.socket.close(1001, 'Server shutdown');
        setTimeout(resolve, 100); // Give time for graceful close
      }));
    }
    
    await Promise.all(closePromises);
    
    // Clear all tracking structures
    this.connections.clear();
    this.userConnections.clear();
    this.droneConnections.clear();
    this.roleConnections.clear();
    this.rateLimiters.clear();
    this.healthChecks.clear();
    
    for (const queue of this.priorityQueues.values()) {
      queue.length = 0;
    }
    
    console.log('✅ Connection pool manager shutdown complete');
  }
}

module.exports = { ConnectionPoolManager };