// Sticky Session Manager for WebSocket Load Balancing
// Ensures WebSocket connections maintain session affinity across server instances

const crypto = require('crypto');
const { EventEmitter } = require('events');

class StickySessionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      sessionTimeout: options.sessionTimeout || 3600000, // 1 hour
      maxSessionsPerServer: options.maxSessionsPerServer || 5000,
      hashAlgorithm: options.hashAlgorithm || 'sha256',
      consistentHashingReplicas: options.consistentHashingReplicas || 160,
      sessionCookieName: options.sessionCookieName || 'ws-session-id',
      serverHealthCheckInterval: options.serverHealthCheckInterval || 30000,
      sessionRebalanceThreshold: options.sessionRebalanceThreshold || 0.8, // 80%
    };
    
    // Session tracking
    this.sessions = new Map(); // sessionId -> session data
    this.serverSessions = new Map(); // serverId -> Set of sessionIds
    this.userSessions = new Map(); // userId -> sessionId
    this.droneSessions = new Map(); // droneId -> sessionId
    
    // Server pool management
    this.servers = new Map(); // serverId -> server info
    this.consistentHashRing = new Map(); // hashValue -> serverId
    this.serverHealthStatus = new Map(); // serverId -> health status
    
    // Load balancing metrics
    this.loadMetrics = {
      totalSessions: 0,
      serverLoads: new Map(), // serverId -> load percentage
      rebalanceOperations: 0,
      stickyViolations: 0,
    };
    
    // Initialize consistent hashing ring
    this.initializeHashRing();
    
    // Start monitoring processes
    this.startServerHealthMonitoring();
    this.startSessionCleanup();
    
    console.log('🔄 Sticky Session Manager initialized');
  }

  // Consistent hashing implementation for load balancing
  initializeHashRing() {
    this.consistentHashRing.clear();
    
    for (const [serverId, serverInfo] of this.servers) {
      if (serverInfo.status === 'healthy') {
        this.addServerToHashRing(serverId, serverInfo.weight || 1);
      }
    }
    
    console.log(`🔄 Hash ring updated with ${this.consistentHashRing.size} virtual nodes`);
  }

  addServerToHashRing(serverId, weight = 1) {
    const replicas = Math.floor(this.options.consistentHashingReplicas * weight);
    
    for (let i = 0; i < replicas; i++) {
      const virtualNodeId = `${serverId}:${i}`;
      const hash = this.hashString(virtualNodeId);
      this.consistentHashRing.set(hash, serverId);
    }
  }

  removeServerFromHashRing(serverId) {
    const keysToRemove = [];
    for (const [hash, serverIdInRing] of this.consistentHashRing) {
      if (serverIdInRing === serverId) {
        keysToRemove.push(hash);
      }
    }
    
    for (const key of keysToRemove) {
      this.consistentHashRing.delete(key);
    }
  }

  hashString(str) {
    return crypto.createHash(this.options.hashAlgorithm)
      .update(str)
      .digest('hex');
  }

  // Server management
  addServer(serverId, serverInfo) {
    const server = {
      id: serverId,
      host: serverInfo.host,
      port: serverInfo.port,
      weight: serverInfo.weight || 1,
      maxSessions: serverInfo.maxSessions || this.options.maxSessionsPerServer,
      status: 'healthy',
      registeredAt: Date.now(),
      lastHealthCheck: Date.now(),
      currentSessions: 0,
      ...serverInfo,
    };
    
    this.servers.set(serverId, server);
    this.serverSessions.set(serverId, new Set());
    this.serverHealthStatus.set(serverId, { status: 'healthy', lastCheck: Date.now() });
    this.loadMetrics.serverLoads.set(serverId, 0);
    
    // Update consistent hashing ring
    this.addServerToHashRing(serverId, server.weight);
    
    console.log(`✅ Server added to load balancer: ${serverId}`);
    this.emit('server:added', server);
    
    return server;
  }

  removeServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return false;
    
    // Remove from hash ring
    this.removeServerFromHashRing(serverId);
    
    // Handle existing sessions
    const serverSessions = this.serverSessions.get(serverId) || new Set();
    if (serverSessions.size > 0) {
      console.log(`🔄 Rebalancing ${serverSessions.size} sessions from removed server ${serverId}`);
      this.rebalanceSessionsFromServer(serverId);
    }
    
    // Clean up tracking
    this.servers.delete(serverId);
    this.serverSessions.delete(serverId);
    this.serverHealthStatus.delete(serverId);
    this.loadMetrics.serverLoads.delete(serverId);
    
    console.log(`🗑️ Server removed from load balancer: ${serverId}`);
    this.emit('server:removed', { serverId, server });
    
    return true;
  }

  // Session management
  createSession(connectionData) {
    const sessionId = crypto.randomUUID();
    const userId = connectionData.user?.userId;
    const droneId = connectionData.droneId;
    
    // Check for existing user session
    if (userId && this.userSessions.has(userId)) {
      const existingSessionId = this.userSessions.get(userId);
      const existingSession = this.sessions.get(existingSessionId);
      
      if (existingSession && this.isSessionValid(existingSession)) {
        // Return existing session for sticky behavior
        console.log(`🔄 Reusing existing session for user ${userId}: ${existingSessionId}`);
        return existingSession;
      } else {
        // Clean up invalid session
        this.removeSession(existingSessionId);
      }
    }
    
    // Check for existing drone session
    if (droneId && this.droneSessions.has(droneId)) {
      const existingSessionId = this.droneSessions.get(droneId);
      const existingSession = this.sessions.get(existingSessionId);
      
      if (existingSession && this.isSessionValid(existingSession)) {
        console.log(`🔄 Reusing existing session for drone ${droneId}: ${existingSessionId}`);
        return existingSession;
      } else {
        this.removeSession(existingSessionId);
      }
    }
    
    // Select optimal server using consistent hashing
    const serverId = this.selectServerForSession(sessionId, connectionData);
    if (!serverId) {
      console.error('❌ No healthy servers available for new session');
      return null;
    }
    
    const session = {
      id: sessionId,
      serverId: serverId,
      userId: userId,
      droneId: droneId,
      connectionData: connectionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      connectionCount: 1,
      messageCount: 0,
      status: 'active',
      stickyHash: this.generateStickyHash(connectionData),
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    this.serverSessions.get(serverId).add(sessionId);
    
    if (userId) {
      this.userSessions.set(userId, sessionId);
    }
    
    if (droneId) {
      this.droneSessions.set(droneId, sessionId);
    }
    
    // Update server load
    this.updateServerLoad(serverId);
    this.loadMetrics.totalSessions++;
    
    console.log(`✅ New session created: ${sessionId} -> ${serverId}`);
    this.emit('session:created', session);
    
    return session;
  }

  selectServerForSession(sessionId, connectionData) {
    // Use consistent hashing based on session characteristics
    const hashKey = this.generateHashKey(sessionId, connectionData);
    const hash = this.hashString(hashKey);
    
    // Find the first server in the ring >= hash
    const sortedHashes = Array.from(this.consistentHashRing.keys()).sort();
    let selectedHash = sortedHashes.find(h => h >= hash);
    
    // Wrap around if no hash found
    if (!selectedHash) {
      selectedHash = sortedHashes[0];
    }
    
    const serverId = this.consistentHashRing.get(selectedHash);
    const server = this.servers.get(serverId);
    
    // Check if server is healthy and has capacity
    if (!server || server.status !== 'healthy') {
      return this.selectFallbackServer();
    }
    
    const currentLoad = this.serverSessions.get(serverId).size;
    if (currentLoad >= server.maxSessions) {
      console.warn(`⚠️ Server ${serverId} at capacity, selecting fallback`);
      return this.selectFallbackServer();
    }
    
    return serverId;
  }

  selectFallbackServer() {
    // Find server with lowest load
    let bestServer = null;
    let lowestLoad = Infinity;
    
    for (const [serverId, serverInfo] of this.servers) {
      if (serverInfo.status !== 'healthy') continue;
      
      const currentLoad = this.serverSessions.get(serverId).size;
      const loadPercentage = currentLoad / serverInfo.maxSessions;
      
      if (loadPercentage < lowestLoad) {
        lowestLoad = loadPercentage;
        bestServer = serverId;
      }
    }
    
    return bestServer;
  }

  generateHashKey(sessionId, connectionData) {
    // Create hash key that promotes stickiness
    const components = [
      connectionData.user?.userId || '',
      connectionData.droneId || '',
      connectionData.clientIP || '',
      sessionId,
    ];
    
    return components.join(':');
  }

  generateStickyHash(connectionData) {
    // Generate hash for session affinity validation
    const stickyComponents = [
      connectionData.user?.userId || '',
      connectionData.droneId || '',
      connectionData.user?.role || '',
    ];
    
    return this.hashString(stickyComponents.join(':'));
  }

  // Session validation and maintenance
  isSessionValid(session) {
    const now = Date.now();
    const sessionAge = now - session.createdAt;
    const timeSinceActivity = now - session.lastActivity;
    
    return sessionAge < this.options.sessionTimeout && 
           timeSinceActivity < this.options.sessionTimeout &&
           session.status === 'active';
  }

  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.messageCount++;
    }
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    // Remove from all tracking structures
    this.sessions.delete(sessionId);
    
    const serverId = session.serverId;
    if (this.serverSessions.has(serverId)) {
      this.serverSessions.get(serverId).delete(sessionId);
    }
    
    if (session.userId) {
      this.userSessions.delete(session.userId);
    }
    
    if (session.droneId) {
      this.droneSessions.delete(session.droneId);
    }
    
    // Update metrics
    this.loadMetrics.totalSessions--;
    this.updateServerLoad(serverId);
    
    console.log(`🗑️ Session removed: ${sessionId}`);
    this.emit('session:removed', session);
    
    return true;
  }

  // Load balancing and rebalancing
  updateServerLoad(serverId) {
    const server = this.servers.get(serverId);
    const sessionCount = this.serverSessions.get(serverId)?.size || 0;
    
    if (server) {
      const loadPercentage = sessionCount / server.maxSessions;
      this.loadMetrics.serverLoads.set(serverId, loadPercentage);
      server.currentSessions = sessionCount;
    }
  }

  checkRebalanceNeeded() {
    const serverLoads = Array.from(this.loadMetrics.serverLoads.values());
    if (serverLoads.length < 2) return false;
    
    const avgLoad = serverLoads.reduce((sum, load) => sum + load, 0) / serverLoads.length;
    const maxLoad = Math.max(...serverLoads);
    const minLoad = Math.min(...serverLoads);
    
    // Check if load imbalance exceeds threshold
    const imbalance = maxLoad - minLoad;
    return imbalance > 0.3 || maxLoad > this.options.sessionRebalanceThreshold;
  }

  async rebalanceSessionsFromServer(serverId) {
    const sessionsToRebalance = Array.from(this.serverSessions.get(serverId) || []);
    const rebalancePromises = [];
    
    for (const sessionId of sessionsToRebalance) {
      const session = this.sessions.get(sessionId);
      if (!session) continue;
      
      // Find new server for session
      const newServerId = this.selectFallbackServer();
      if (newServerId && newServerId !== serverId) {
        rebalancePromises.push(this.migrateSession(sessionId, newServerId));
      }
    }
    
    const results = await Promise.allSettled(rebalancePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`🔄 Rebalanced ${successful}/${sessionsToRebalance.length} sessions from ${serverId}`);
    this.loadMetrics.rebalanceOperations++;
    
    return successful;
  }

  async migrateSession(sessionId, newServerId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const oldServerId = session.serverId;
    
    try {
      // Update session server assignment
      session.serverId = newServerId;
      
      // Update tracking structures
      this.serverSessions.get(oldServerId)?.delete(sessionId);
      this.serverSessions.get(newServerId).add(sessionId);
      
      // Update server loads
      this.updateServerLoad(oldServerId);
      this.updateServerLoad(newServerId);
      
      console.log(`🔄 Session migrated: ${sessionId} (${oldServerId} -> ${newServerId})`);
      this.emit('session:migrated', { sessionId, oldServerId, newServerId });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to migrate session ${sessionId}:`, error);
      return false;
    }
  }

  // Health monitoring
  startServerHealthMonitoring() {
    setInterval(() => {
      this.performServerHealthChecks();
    }, this.options.serverHealthCheckInterval);
  }

  async performServerHealthChecks() {
    const healthCheckPromises = [];
    
    for (const [serverId, serverInfo] of this.servers) {
      healthCheckPromises.push(this.checkServerHealth(serverId, serverInfo));
    }
    
    const results = await Promise.allSettled(healthCheckPromises);
    
    // Process health check results
    results.forEach((result, index) => {
      const serverId = Array.from(this.servers.keys())[index];
      if (result.status === 'fulfilled' && result.value) {
        this.updateServerHealthStatus(serverId, 'healthy');
      } else {
        this.updateServerHealthStatus(serverId, 'unhealthy');
      }
    });
    
    // Check if rebalancing is needed
    if (this.checkRebalanceNeeded()) {
      console.log('🔄 Load imbalance detected, considering rebalancing...');
      this.emit('rebalance:needed');
    }
  }

  async checkServerHealth(serverId, serverInfo) {
    try {
      // In a real implementation, this would ping the server
      // For now, we'll simulate health check
      const healthCheck = {
        serverId,
        timestamp: Date.now(),
        responseTime: Math.random() * 100, // Simulated response time
        status: 'healthy',
      };
      
      return healthCheck;
      
    } catch (error) {
      console.error(`❌ Health check failed for server ${serverId}:`, error);
      return null;
    }
  }

  updateServerHealthStatus(serverId, status) {
    const currentStatus = this.serverHealthStatus.get(serverId);
    const server = this.servers.get(serverId);
    
    if (!server) return;
    
    if (currentStatus?.status !== status) {
      console.log(`🏥 Server ${serverId} health status changed: ${currentStatus?.status} -> ${status}`);
      
      if (status === 'unhealthy') {
        server.status = 'unhealthy';
        this.removeServerFromHashRing(serverId);
        
        // Trigger session migration from unhealthy server
        const sessionCount = this.serverSessions.get(serverId)?.size || 0;
        if (sessionCount > 0) {
          this.rebalanceSessionsFromServer(serverId);
        }
        
      } else if (status === 'healthy' && server.status !== 'healthy') {
        server.status = 'healthy';
        this.addServerToHashRing(serverId, server.weight);
      }
    }
    
    this.serverHealthStatus.set(serverId, {
      status,
      lastCheck: Date.now(),
    });
    
    server.lastHealthCheck = Date.now();
  }

  // Session cleanup
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Every minute
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (!this.isSessionValid(session)) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      this.removeSession(sessionId);
    }
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Load balancer integration
  getServerForConnection(connectionData) {
    // Create or retrieve session
    const session = this.createSession(connectionData);
    if (!session) {
      return null;
    }
    
    const server = this.servers.get(session.serverId);
    if (!server || server.status !== 'healthy') {
      // Try to migrate to healthy server
      const newServerId = this.selectFallbackServer();
      if (newServerId) {
        this.migrateSession(session.id, newServerId);
        return this.servers.get(newServerId);
      }
      return null;
    }
    
    return server;
  }

  validateStickySession(sessionId, connectionData) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const expectedHash = this.generateStickyHash(connectionData);
    const isValid = session.stickyHash === expectedHash;
    
    if (!isValid) {
      this.loadMetrics.stickyViolations++;
      console.warn(`⚠️ Sticky session violation detected for ${sessionId}`);
    }
    
    return isValid;
  }

  // Statistics and monitoring
  getLoadBalancerStats() {
    const serverStats = {};
    for (const [serverId, server] of this.servers) {
      const sessionCount = this.serverSessions.get(serverId)?.size || 0;
      serverStats[serverId] = {
        sessionCount,
        loadPercentage: this.loadMetrics.serverLoads.get(serverId) || 0,
        status: server.status,
        maxSessions: server.maxSessions,
        lastHealthCheck: server.lastHealthCheck,
      };
    }
    
    return {
      totalSessions: this.loadMetrics.totalSessions,
      totalServers: this.servers.size,
      healthyServers: Array.from(this.servers.values()).filter(s => s.status === 'healthy').length,
      rebalanceOperations: this.loadMetrics.rebalanceOperations,
      stickyViolations: this.loadMetrics.stickyViolations,
      hashRingSize: this.consistentHashRing.size,
      serverStats,
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down sticky session manager...');
    
    // Clear all intervals and cleanup
    // (In a real implementation, you'd store interval references)
    
    // Optionally persist session data for recovery
    const sessionData = {
      sessions: Object.fromEntries(this.sessions),
      timestamp: Date.now(),
    };
    
    // Clear all data structures
    this.sessions.clear();
    this.serverSessions.clear();
    this.userSessions.clear();
    this.droneSessions.clear();
    this.servers.clear();
    this.consistentHashRing.clear();
    this.serverHealthStatus.clear();
    this.loadMetrics.serverLoads.clear();
    
    console.log('✅ Sticky session manager shutdown complete');
    return sessionData;
  }
}

module.exports = { StickySessionManager };