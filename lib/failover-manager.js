// Failover and Connection Recovery Manager
// Automatic failover, connection migration, and recovery for military-grade reliability

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

class FailoverManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      failoverThreshold: options.failoverThreshold || 3, // failures before failover
      failoverTimeout: options.failoverTimeout || 30000, // 30 seconds
      recoveryTimeout: options.recoveryTimeout || 300000, // 5 minutes
      heartbeatInterval: options.heartbeatInterval || 15000, // 15 seconds
      connectionMigrationTimeout: options.connectionMigrationTimeout || 10000, // 10 seconds
      maxRetryAttempts: options.maxRetryAttempts || 5,
      retryBackoffMultiplier: options.retryBackoffMultiplier || 2,
      retryInitialDelay: options.retryInitialDelay || 1000, // 1 second
      gracefulShutdownTimeout: options.gracefulShutdownTimeout || 60000, // 1 minute
      stateReplicationInterval: options.stateReplicationInterval || 5000, // 5 seconds
    };
    
    // Failover state tracking
    this.serverStates = new Map(); // serverId -> server state
    this.failoverHistory = []; // History of failover events
    this.recoveryQueue = new Map(); // serverId -> recovery info
    this.migrationQueue = new Map(); // connectionId -> migration info
    
    // Connection state for recovery
    this.connectionStates = new Map(); // connectionId -> connection state
    this.sessionBackups = new Map(); // sessionId -> session backup
    this.pendingMigrations = new Map(); // connectionId -> migration state
    
    // Monitoring and health tracking
    this.healthChecks = new Map(); // serverId -> health check data
    this.performanceMetrics = new Map(); // serverId -> performance data
    
    // Leader election for coordinated failover
    this.isLeader = false;
    this.leaderId = null;
    this.leaderElectionInProgress = false;
    
    // Circuit breaker states
    this.circuitBreakers = new Map(); // serverId -> circuit breaker state
    
    console.log('🔄 Failover Manager initialized');
  }

  async initialize(redisClient, clusterManager) {
    this.redis = redisClient;
    this.clusterManager = clusterManager;
    
    // Start monitoring processes
    this.startHealthMonitoring();
    this.startStateReplication();
    this.startLeaderElection();
    this.startConnectionRecovery();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    console.log('✅ Failover Manager initialized');
    this.emit('failover:ready');
  }

  setupEventHandlers() {
    // Listen for cluster events
    this.clusterManager.on('server:heartbeat', (data) => {
      this.handleServerHeartbeat(data);
    });
    
    this.clusterManager.on('connection:added', (data) => {
      this.backupConnectionState(data.clientId, data.connectionData);
    });
    
    this.clusterManager.on('connection:removed', (data) => {
      this.cleanupConnectionState(data.clientId);
    });
    
    // Listen for Redis connection issues
    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.handleRedisFailure(error);
    });
    
    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      this.handleRedisReconnecting();
    });
  }

  // Health monitoring and failure detection
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.options.heartbeatInterval);
  }

  async performHealthChecks() {
    const serverPromises = [];
    
    for (const [serverId, serverState] of this.serverStates) {
      serverPromises.push(this.checkServerHealth(serverId, serverState));
    }
    
    const results = await Promise.allSettled(serverPromises);
    
    // Process health check results
    results.forEach((result, index) => {
      const serverId = Array.from(this.serverStates.keys())[index];
      if (result.status === 'fulfilled') {
        this.processHealthCheckResult(serverId, result.value);
      } else {
        this.handleHealthCheckFailure(serverId, result.reason);
      }
    });
  }

  async checkServerHealth(serverId, serverState) {
    const startTime = performance.now();
    
    try {
      // Multiple health check methods
      const checks = await Promise.allSettled([
        this.pingServer(serverId),
        this.checkServerMetrics(serverId),
        this.checkConnectionHealth(serverId),
      ]);
      
      const responseTime = performance.now() - startTime;
      
      const pingSuccess = checks[0].status === 'fulfilled' && checks[0].value;
      const metricsSuccess = checks[1].status === 'fulfilled';
      const connectionSuccess = checks[2].status === 'fulfilled';
      
      const overallHealth = pingSuccess && metricsSuccess && connectionSuccess;
      
      return {
        healthy: overallHealth,
        responseTime,
        checks: {
          ping: pingSuccess,
          metrics: metricsSuccess,
          connections: connectionSuccess,
        },
        details: {
          pingTime: checks[0].value?.responseTime || null,
          metrics: checks[1].value || null,
          connectionCount: checks[2].value?.count || 0,
        },
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        responseTime: performance.now() - startTime,
      };
    }
  }

  async pingServer(serverId) {
    // Use Redis-based ping for cluster communication
    const pingKey = `failover:ping:${serverId}`;
    const pingValue = `${Date.now()}:${crypto.randomUUID()}`;
    
    await this.redis.setEx(pingKey, 5, pingValue); // 5 second TTL
    
    // Wait for pong response
    const pongKey = `failover:pong:${serverId}`;
    const startTime = performance.now();
    
    let attempts = 0;
    while (attempts < 10) { // Wait up to 1 second
      const pong = await this.redis.get(pongKey);
      if (pong === pingValue) {
        await this.redis.del(pongKey);
        return {
          success: true,
          responseTime: performance.now() - startTime,
        };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return { success: false, timeout: true };
  }

  async checkServerMetrics(serverId) {
    const metricsKey = `failover:metrics:${serverId}`;
    const metrics = await this.redis.get(metricsKey);
    
    if (!metrics) {
      return null; // No metrics available
    }
    
    const parsed = JSON.parse(metrics);
    const now = Date.now();
    
    // Check if metrics are recent (within last 30 seconds)
    if (now - parsed.timestamp > 30000) {
      throw new Error('Stale metrics');
    }
    
    return parsed;
  }

  async checkConnectionHealth(serverId) {
    const connectionsKey = `failover:connections:${serverId}`;
    const connections = await this.redis.get(connectionsKey);
    
    if (!connections) {
      return { count: 0, healthy: true };
    }
    
    const parsed = JSON.parse(connections);
    return {
      count: parsed.count,
      healthy: parsed.errors < parsed.count * 0.1, // Less than 10% error rate
    };
  }

  processHealthCheckResult(serverId, result) {
    const healthData = this.healthChecks.get(serverId) || {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailure: null,
      lastSuccess: null,
      averageResponseTime: 0,
      checkHistory: [],
    };
    
    const now = Date.now();
    
    if (result.healthy) {
      healthData.consecutiveSuccesses++;
      healthData.consecutiveFailures = 0;
      healthData.lastSuccess = now;
      
      // Update server state to healthy if it was failed
      const serverState = this.serverStates.get(serverId);
      if (serverState && serverState.status === 'failed') {
        this.handleServerRecovery(serverId, serverState);
      }
      
    } else {
      healthData.consecutiveFailures++;
      healthData.consecutiveSuccesses = 0;
      healthData.lastFailure = now;
      
      // Trigger failover if threshold reached
      if (healthData.consecutiveFailures >= this.options.failoverThreshold) {
        this.triggerServerFailover(serverId, result);
      }
    }
    
    // Update response time average
    if (result.responseTime) {
      const historySize = healthData.checkHistory.length;
      healthData.averageResponseTime = 
        (healthData.averageResponseTime * historySize + result.responseTime) / (historySize + 1);
    }
    
    // Maintain check history (last 100 checks)
    healthData.checkHistory.push({
      timestamp: now,
      healthy: result.healthy,
      responseTime: result.responseTime,
    });
    
    if (healthData.checkHistory.length > 100) {
      healthData.checkHistory.shift();
    }
    
    this.healthChecks.set(serverId, healthData);
    
    // Update circuit breaker state
    this.updateCircuitBreaker(serverId, result.healthy);
  }

  handleHealthCheckFailure(serverId, error) {
    console.error(`❌ Health check failed for server ${serverId}:`, error);
    
    this.processHealthCheckResult(serverId, {
      healthy: false,
      error: error.message,
      responseTime: null,
    });
  }

  // Failover logic
  async triggerServerFailover(serverId, healthResult) {
    const serverState = this.serverStates.get(serverId);
    if (!serverState || serverState.status === 'failed') {
      return; // Already failed or unknown server
    }
    
    console.error(`🚨 Triggering failover for server ${serverId}`);
    
    // Update server state
    serverState.status = 'failed';
    serverState.failedAt = Date.now();
    serverState.failureReason = healthResult.error || 'Health check failures';
    
    // Record failover event
    const failoverEvent = {
      id: crypto.randomUUID(),
      serverId,
      triggeredAt: Date.now(),
      triggeredBy: process.env.SERVER_ID || 'unknown',
      reason: serverState.failureReason,
      healthResult,
      connectionsAffected: serverState.connections?.size || 0,
      status: 'in_progress',
    };
    
    this.failoverHistory.push(failoverEvent);
    
    // Emit failover event
    this.emit('server:failover-triggered', failoverEvent);
    
    try {
      // Only proceed with failover if we're the leader
      if (this.isLeader) {
        await this.executeFailover(serverId, failoverEvent);
      } else {
        console.log(`⏳ Waiting for leader to execute failover for ${serverId}`);
      }
      
    } catch (error) {
      console.error(`❌ Failover execution failed for ${serverId}:`, error);
      failoverEvent.status = 'failed';
      failoverEvent.error = error.message;
      this.emit('server:failover-failed', failoverEvent);
    }
  }

  async executeFailover(serverId, failoverEvent) {
    console.log(`🔄 Executing failover for server ${serverId}`);
    
    // Step 1: Stop routing new connections to failed server
    await this.stopRoutingToServer(serverId);
    
    // Step 2: Identify affected connections
    const affectedConnections = await this.getAffectedConnections(serverId);
    console.log(`📊 Found ${affectedConnections.length} connections to migrate`);
    
    // Step 3: Find healthy target servers
    const targetServers = await this.findHealthyTargetServers(serverId);
    if (targetServers.length === 0) {
      throw new Error('No healthy servers available for failover');
    }
    
    // Step 4: Migrate connections
    const migrationResults = await this.migrateConnections(
      affectedConnections, 
      targetServers, 
      failoverEvent.id
    );
    
    // Step 5: Update failover event
    failoverEvent.status = 'completed';
    failoverEvent.completedAt = Date.now();
    failoverEvent.migrationResults = migrationResults;
    failoverEvent.duration = failoverEvent.completedAt - failoverEvent.triggeredAt;
    
    // Step 6: Add to recovery queue
    this.recoveryQueue.set(serverId, {
      failoverEvent,
      recoveryStartTime: Date.now() + this.options.recoveryTimeout,
      retryCount: 0,
    });
    
    console.log(`✅ Failover completed for server ${serverId} in ${failoverEvent.duration}ms`);
    this.emit('server:failover-completed', failoverEvent);
  }

  async stopRoutingToServer(serverId) {
    // Update load balancer configuration
    await this.clusterManager.publishToCluster('scaling:events', {
      type: 'server_failed',
      serverId,
      action: 'stop_routing',
      timestamp: Date.now(),
    });
    
    // Update service registry
    const serviceKey = `sentient-edge:services:${serverId}`;
    const serviceData = await this.redis.get(serviceKey);
    if (serviceData) {
      const service = JSON.parse(serviceData);
      service.health.status = 'failed';
      service.metadata.acceptingConnections = false;
      await this.redis.setEx(serviceKey, 30, JSON.stringify(service));
    }
  }

  async getAffectedConnections(serverId) {
    // Get connections from server state
    const serverState = this.serverStates.get(serverId);
    if (!serverState || !serverState.connections) {
      return [];
    }
    
    const connections = [];
    for (const connectionId of serverState.connections) {
      const connectionState = this.connectionStates.get(connectionId);
      if (connectionState) {
        connections.push({
          id: connectionId,
          state: connectionState,
          priority: this.calculateMigrationPriority(connectionState),
        });
      }
    }
    
    // Sort by priority (high priority first)
    return connections.sort((a, b) => b.priority - a.priority);
  }

  calculateMigrationPriority(connectionState) {
    let priority = 0;
    
    // Drone connections have higher priority
    if (connectionState.droneId) priority += 100;
    
    // Admin/operator connections have higher priority
    if (connectionState.user?.role === 'admin') priority += 50;
    if (connectionState.user?.role === 'operator') priority += 30;
    
    // Active connections have higher priority
    const timeSinceActivity = Date.now() - connectionState.lastActivity;
    if (timeSinceActivity < 60000) priority += 20; // Active within last minute
    
    // Mission-critical connections
    if (connectionState.missionCritical) priority += 75;
    
    return priority;
  }

  async findHealthyTargetServers(excludeServerId) {
    const healthyServers = [];
    
    for (const [serverId, serverState] of this.serverStates) {
      if (serverId === excludeServerId) continue;
      
      const healthData = this.healthChecks.get(serverId);
      const circuitBreaker = this.circuitBreakers.get(serverId);
      
      if (serverState.status === 'healthy' && 
          healthData?.consecutiveSuccesses > 0 &&
          circuitBreaker?.state !== 'OPEN') {
        
        healthyServers.push({
          id: serverId,
          state: serverState,
          load: serverState.connections?.size || 0,
          capacity: serverState.maxConnections || 1000,
          responseTime: healthData.averageResponseTime || 0,
        });
      }
    }
    
    // Sort by load (least loaded first)
    return healthyServers.sort((a, b) => {
      const aLoad = a.load / a.capacity;
      const bLoad = b.load / b.capacity;
      return aLoad - bLoad;
    });
  }

  async migrateConnections(connections, targetServers, failoverEventId) {
    const migrationResults = {
      total: connections.length,
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    const migrationPromises = [];
    let serverIndex = 0;
    
    for (const connection of connections) {
      // Round-robin server selection
      const targetServer = targetServers[serverIndex % targetServers.length];
      serverIndex++;
      
      const migrationPromise = this.migrateConnection(
        connection,
        targetServer,
        failoverEventId
      ).then(result => {
        if (result.success) {
          migrationResults.successful++;
        } else {
          migrationResults.failed++;
          migrationResults.errors.push(result.error);
        }
        return result;
      });
      
      migrationPromises.push(migrationPromise);
      
      // Batch migrations to avoid overwhelming target servers
      if (migrationPromises.length >= 10) {
        await Promise.allSettled(migrationPromises.splice(0, 10));
      }
    }
    
    // Process remaining migrations
    if (migrationPromises.length > 0) {
      await Promise.allSettled(migrationPromises);
    }
    
    return migrationResults;
  }

  async migrateConnection(connection, targetServer, failoverEventId) {
    const migrationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Migrating connection ${connection.id} to server ${targetServer.id}`);
      
      // Store migration state
      this.pendingMigrations.set(connection.id, {
        id: migrationId,
        connectionId: connection.id,
        sourceServerId: connection.state.serverId,
        targetServerId: targetServer.id,
        failoverEventId,
        startTime,
        status: 'in_progress',
      });
      
      // Create reconnection instructions for client
      const reconnectionInfo = {
        type: 'reconnect_required',
        reason: 'server_failover',
        targetServer: {
          host: targetServer.state.host,
          port: targetServer.state.port,
          protocol: targetServer.state.protocol,
        },
        sessionInfo: {
          sessionId: connection.state.sessionId,
          userId: connection.state.user?.userId,
          droneId: connection.state.droneId,
          reconnectionToken: this.generateReconnectionToken(connection.state),
        },
        migrationId,
        timeout: this.options.connectionMigrationTimeout,
      };
      
      // Send reconnection instruction through cluster
      await this.clusterManager.publishToCluster('broadcast', {
        type: 'connection_migration',
        targetConnection: connection.id,
        payload: reconnectionInfo,
      });
      
      // Wait for reconnection or timeout
      const reconnected = await this.waitForReconnection(connection.id, migrationId);
      
      const migrationResult = {
        success: reconnected,
        connectionId: connection.id,
        migrationId,
        sourceServerId: connection.state.serverId,
        targetServerId: targetServer.id,
        duration: Date.now() - startTime,
        error: reconnected ? null : 'Reconnection timeout',
      };
      
      this.pendingMigrations.delete(connection.id);
      return migrationResult;
      
    } catch (error) {
      console.error(`❌ Connection migration failed for ${connection.id}:`, error);
      
      this.pendingMigrations.delete(connection.id);
      return {
        success: false,
        connectionId: connection.id,
        migrationId,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  generateReconnectionToken(connectionState) {
    const tokenData = {
      userId: connectionState.user?.userId,
      droneId: connectionState.droneId,
      sessionId: connectionState.sessionId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    
    // In a real implementation, this would be cryptographically signed
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  async waitForReconnection(connectionId, migrationId) {
    const timeout = this.options.connectionMigrationTimeout;
    const pollInterval = 500; // 500ms
    const maxAttempts = Math.floor(timeout / pollInterval);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if connection has been re-established
      const migration = this.pendingMigrations.get(connectionId);
      if (migration && migration.status === 'completed') {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    return false; // Timeout
  }

  // Server recovery
  async handleServerRecovery(serverId, serverState) {
    console.log(`🔄 Server recovery detected for ${serverId}`);
    
    const recoveryInfo = this.recoveryQueue.get(serverId);
    if (!recoveryInfo) {
      // No pending recovery - server never failed or already recovered
      return;
    }
    
    // Verify server is truly healthy
    const healthCheck = await this.checkServerHealth(serverId, serverState);
    if (!healthCheck.healthy) {
      console.warn(`⚠️ Server ${serverId} recovery check failed, keeping in failed state`);
      return;
    }
    
    // Update server state
    serverState.status = 'healthy';
    serverState.recoveredAt = Date.now();
    serverState.recoveryDuration = serverState.recoveredAt - serverState.failedAt;
    
    // Remove from recovery queue
    this.recoveryQueue.delete(serverId);
    
    // Re-enable routing to server
    await this.enableRoutingToServer(serverId);
    
    // Record recovery event
    const recoveryEvent = {
      serverId,
      recoveredAt: serverState.recoveredAt,
      failureDuration: serverState.recoveryDuration,
      originalFailure: recoveryInfo.failoverEvent,
    };
    
    console.log(`✅ Server ${serverId} recovered after ${serverState.recoveryDuration}ms`);
    this.emit('server:recovered', recoveryEvent);
  }

  async enableRoutingToServer(serverId) {
    // Update service registry
    const serviceKey = `sentient-edge:services:${serverId}`;
    const serviceData = await this.redis.get(serviceKey);
    if (serviceData) {
      const service = JSON.parse(serviceData);
      service.health.status = 'healthy';
      service.metadata.acceptingConnections = true;
      await this.redis.setEx(serviceKey, 30, JSON.stringify(service));
    }
    
    // Notify cluster
    await this.clusterManager.publishToCluster('scaling:events', {
      type: 'server_recovered',
      serverId,
      action: 'enable_routing',
      timestamp: Date.now(),
    });
  }

  // Connection state backup and recovery
  backupConnectionState(connectionId, connectionData) {
    const stateBackup = {
      id: connectionId,
      serverId: connectionData.serverId,
      userId: connectionData.user?.userId,
      droneId: connectionData.droneId,
      sessionId: connectionData.sessionId,
      user: connectionData.user,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      subscriptions: connectionData.subscriptions || [],
      metadata: connectionData.metadata || {},
      missionCritical: connectionData.missionCritical || false,
    };
    
    this.connectionStates.set(connectionId, stateBackup);
    
    // Also backup in Redis for cluster-wide recovery
    const backupKey = `failover:connection-backup:${connectionId}`;
    this.redis.setEx(backupKey, 3600, JSON.stringify(stateBackup)); // 1 hour TTL
  }

  cleanupConnectionState(connectionId) {
    this.connectionStates.delete(connectionId);
    this.pendingMigrations.delete(connectionId);
    
    // Clean up Redis backup
    const backupKey = `failover:connection-backup:${connectionId}`;
    this.redis.del(backupKey);
  }

  // Circuit breaker pattern
  updateCircuitBreaker(serverId, success) {
    const circuitBreaker = this.circuitBreakers.get(serverId) || {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailure: null,
      openedAt: null,
      halfOpenAt: null,
    };
    
    if (success) {
      circuitBreaker.successes++;
      circuitBreaker.failures = 0;
      
      if (circuitBreaker.state === 'HALF_OPEN') {
        // Successful call in half-open state - close circuit
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.halfOpenAt = null;
        console.log(`🔄 Circuit breaker closed for server ${serverId}`);
      }
      
    } else {
      circuitBreaker.failures++;
      circuitBreaker.successes = 0;
      circuitBreaker.lastFailure = Date.now();
      
      if (circuitBreaker.state === 'CLOSED' && circuitBreaker.failures >= 5) {
        // Open circuit breaker
        circuitBreaker.state = 'OPEN';
        circuitBreaker.openedAt = Date.now();
        console.log(`🚨 Circuit breaker opened for server ${serverId}`);
        
        // Schedule half-open attempt
        setTimeout(() => {
          if (circuitBreaker.state === 'OPEN') {
            circuitBreaker.state = 'HALF_OPEN';
            circuitBreaker.halfOpenAt = Date.now();
            console.log(`🔄 Circuit breaker half-open for server ${serverId}`);
          }
        }, 30000); // 30 seconds
      }
    }
    
    this.circuitBreakers.set(serverId, circuitBreaker);
  }

  // State replication for cluster coordination
  startStateReplication() {
    setInterval(() => {
      this.replicateState();
    }, this.options.stateReplicationInterval);
  }

  async replicateState() {
    try {
      const state = {
        nodeId: process.env.SERVER_ID || 'unknown',
        timestamp: Date.now(),
        isLeader: this.isLeader,
        serverStates: Object.fromEntries(this.serverStates),
        healthChecks: Object.fromEntries(this.healthChecks),
        circuitBreakers: Object.fromEntries(this.circuitBreakers),
        failoverHistory: this.failoverHistory.slice(-10), // Last 10 events
        recoveryQueue: Object.fromEntries(this.recoveryQueue),
      };
      
      const stateKey = `failover:state:${state.nodeId}`;
      await this.redis.setEx(stateKey, 30, JSON.stringify(state));
      
    } catch (error) {
      console.error('❌ State replication failed:', error);
    }
  }

  // Leader election for coordinated failover
  startLeaderElection() {
    setInterval(() => {
      this.performLeaderElection();
    }, 10000); // Every 10 seconds
  }

  async performLeaderElection() {
    if (this.leaderElectionInProgress) return;
    
    this.leaderElectionInProgress = true;
    
    try {
      const leaderKey = 'failover:leader';
      const nodeId = process.env.SERVER_ID || 'unknown';
      
      // Try to become leader
      const result = await this.redis.set(leaderKey, nodeId, 'EX', 30, 'NX');
      
      if (result === 'OK') {
        if (!this.isLeader) {
          console.log(`👑 Became failover leader: ${nodeId}`);
          this.isLeader = true;
          this.leaderId = nodeId;
          this.emit('leader:elected', nodeId);
        }
      } else {
        // Check current leader
        const currentLeader = await this.redis.get(leaderKey);
        if (currentLeader !== this.leaderId) {
          if (this.isLeader) {
            console.log(`👑 No longer failover leader, new leader: ${currentLeader}`);
            this.isLeader = false;
          }
          this.leaderId = currentLeader;
        }
      }
      
    } catch (error) {
      console.error('❌ Leader election failed:', error);
    } finally {
      this.leaderElectionInProgress = false;
    }
  }

  // Connection recovery processes
  startConnectionRecovery() {
    setInterval(() => {
      this.processConnectionRecovery();
    }, 5000); // Every 5 seconds
  }

  async processConnectionRecovery() {
    // Check for stalled migrations
    const now = Date.now();
    const stalledMigrations = [];
    
    for (const [connectionId, migration] of this.pendingMigrations) {
      if (now - migration.startTime > this.options.connectionMigrationTimeout * 2) {
        stalledMigrations.push(connectionId);
      }
    }
    
    // Clean up stalled migrations
    for (const connectionId of stalledMigrations) {
      console.warn(`⚠️ Cleaning up stalled migration for connection ${connectionId}`);
      this.pendingMigrations.delete(connectionId);
    }
    
    // Check recovery queue for retry attempts
    for (const [serverId, recoveryInfo] of this.recoveryQueue) {
      if (now >= recoveryInfo.recoveryStartTime && recoveryInfo.retryCount < this.options.maxRetryAttempts) {
        await this.attemptServerRecovery(serverId, recoveryInfo);
      }
    }
  }

  async attemptServerRecovery(serverId, recoveryInfo) {
    console.log(`🔄 Attempting recovery for server ${serverId} (attempt ${recoveryInfo.retryCount + 1})`);
    
    try {
      const serverState = this.serverStates.get(serverId);
      if (!serverState) {
        this.recoveryQueue.delete(serverId);
        return;
      }
      
      const healthCheck = await this.checkServerHealth(serverId, serverState);
      
      if (healthCheck.healthy) {
        await this.handleServerRecovery(serverId, serverState);
      } else {
        // Schedule next retry with exponential backoff
        recoveryInfo.retryCount++;
        const backoffDelay = this.options.retryInitialDelay * 
          Math.pow(this.options.retryBackoffMultiplier, recoveryInfo.retryCount);
        
        recoveryInfo.recoveryStartTime = Date.now() + backoffDelay;
        
        console.log(`⏳ Server ${serverId} still unhealthy, next retry in ${backoffDelay}ms`);
      }
      
    } catch (error) {
      console.error(`❌ Recovery attempt failed for server ${serverId}:`, error);
      
      recoveryInfo.retryCount++;
      if (recoveryInfo.retryCount >= this.options.maxRetryAttempts) {
        console.error(`❌ Max recovery attempts reached for server ${serverId}, giving up`);
        this.recoveryQueue.delete(serverId);
      }
    }
  }

  // Redis failure handling
  handleRedisFailure(error) {
    console.error('❌ Redis failure detected, switching to local-only mode');
    
    // Emit Redis failure event
    this.emit('redis:failed', error);
    
    // Continue with local failover capabilities only
    // In a production system, this might trigger additional fallback mechanisms
  }

  handleRedisReconnecting() {
    console.log('🔄 Redis reconnecting, preparing to sync state...');
    
    // When Redis reconnects, we'll need to:
    // 1. Re-register our services
    // 2. Sync failover state
    // 3. Re-establish leadership if we were leader
    
    this.emit('redis:reconnecting');
  }

  // API methods
  getFailoverStatus() {
    return {
      isLeader: this.isLeader,
      leaderId: this.leaderId,
      serverStates: Object.fromEntries(this.serverStates),
      healthChecks: Object.fromEntries(this.healthChecks),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      failoverHistory: this.failoverHistory.slice(-20), // Last 20 events
      activeRecoveries: this.recoveryQueue.size,
      pendingMigrations: this.pendingMigrations.size,
      connectionBackups: this.connectionStates.size,
    };
  }

  getServerHealth(serverId) {
    const serverState = this.serverStates.get(serverId);
    const healthData = this.healthChecks.get(serverId);
    const circuitBreaker = this.circuitBreakers.get(serverId);
    
    return {
      serverState,
      healthData,
      circuitBreaker,
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down Failover Manager...');
    
    // If we're the leader, try to transfer leadership
    if (this.isLeader) {
      try {
        await this.redis.del('failover:leader');
        console.log('👑 Released leadership lock');
      } catch (error) {
        console.error('❌ Failed to release leadership:', error);
      }
    }
    
    // Clean up state
    this.serverStates.clear();
    this.healthChecks.clear();
    this.circuitBreakers.clear();
    this.connectionStates.clear();
    this.pendingMigrations.clear();
    this.recoveryQueue.clear();
    
    console.log('✅ Failover Manager shutdown complete');
  }
}

module.exports = { FailoverManager };