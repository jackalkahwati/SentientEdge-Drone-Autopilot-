// Service Discovery and Horizontal Scaling Manager
// Dynamic server registration, health monitoring, and auto-scaling for WebSocket infrastructure

const { EventEmitter } = require('events');
const crypto = require('crypto');
const os = require('os');
const { performance } = require('perf_hooks');

class ServiceDiscoveryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      serviceName: options.serviceName || 'sentient-edge-websocket',
      namespace: options.namespace || 'sentient-edge',
      registrationTTL: options.registrationTTL || 30, // seconds
      healthCheckInterval: options.healthCheckInterval || 15000, // ms
      discoveryInterval: options.discoveryInterval || 10000, // ms
      scaleUpThreshold: options.scaleUpThreshold || 0.8, // 80% utilization
      scaleDownThreshold: options.scaleDownThreshold || 0.3, // 30% utilization
      minInstances: options.minInstances || 2,
      maxInstances: options.maxInstances || 20,
      scaleUpCooldown: options.scaleUpCooldown || 300000, // 5 minutes
      scaleDownCooldown: options.scaleDownCooldown || 600000, // 10 minutes
      deregistrationDelay: options.deregistrationDelay || 30000, // 30 seconds
    };
    
    // Service registry
    this.serviceRegistry = new Map(); // serviceId -> service info
    this.localServices = new Set(); // Services running on this node
    this.healthStatus = new Map(); // serviceId -> health data
    
    // Scaling state
    this.scalingHistory = [];
    this.lastScaleAction = 0;
    this.scalingInProgress = false;
    
    // Load balancing weights
    this.serviceWeights = new Map(); // serviceId -> weight
    this.trafficDistribution = new Map(); // serviceId -> traffic percentage
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      totalConnections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      servicesOnline: 0,
      servicesHealthy: 0,
    };
    
    // Node information
    this.nodeId = `${os.hostname()}-${process.pid}`;
    this.nodeInfo = {
      id: this.nodeId,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: os.totalmem(),
      pid: process.pid,
      startTime: Date.now(),
    };
    
    console.log(`🔄 Service Discovery Manager initialized for node: ${this.nodeId}`);
  }

  async initialize(redisClient) {
    this.redis = redisClient;
    
    // Start service discovery processes
    this.startHealthMonitoring();
    this.startServiceDiscovery();
    this.startAutoScaling();
    
    // Register shutdown handlers
    this.setupGracefulShutdown();
    
    console.log('✅ Service Discovery Manager initialized');
    this.emit('discovery:ready');
  }

  // Service registration
  async registerService(serviceInfo) {
    const serviceId = serviceInfo.id || crypto.randomUUID();
    const timestamp = Date.now();
    
    const service = {
      id: serviceId,
      name: serviceInfo.name || this.options.serviceName,
      version: serviceInfo.version || '1.0.0',
      host: serviceInfo.host || 'localhost',
      port: serviceInfo.port,
      protocol: serviceInfo.protocol || 'http',
      tags: serviceInfo.tags || [],
      metadata: {
        nodeId: this.nodeId,
        capabilities: serviceInfo.capabilities || [],
        maxConnections: serviceInfo.maxConnections || 1000,
        currentConnections: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        ...serviceInfo.metadata,
      },
      health: {
        status: 'unknown',
        lastCheck: timestamp,
        checkUrl: serviceInfo.healthCheckUrl || `/health`,
        checkInterval: serviceInfo.healthCheckInterval || this.options.healthCheckInterval,
        failures: 0,
        successes: 0,
      },
      registration: {
        registeredAt: timestamp,
        registeredBy: this.nodeId,
        ttl: this.options.registrationTTL,
        renewalCount: 0,
      },
      load: {
        weight: serviceInfo.weight || 100,
        currentLoad: 0,
        averageResponseTime: 0,
        requestRate: 0,
        errorRate: 0,
      },
      scaling: {
        canScale: serviceInfo.canScale !== false,
        minInstances: serviceInfo.minInstances || 1,
        maxInstances: serviceInfo.maxInstances || 5,
        scaleMetric: serviceInfo.scaleMetric || 'connections',
      },
    };
    
    // Store in local registry
    this.serviceRegistry.set(serviceId, service);
    this.localServices.add(serviceId);
    
    // Register in Redis for cluster-wide discovery
    await this.registerServiceInRedis(service);
    
    // Start health monitoring for this service
    this.startServiceHealthCheck(serviceId);
    
    console.log(`✅ Service registered: ${serviceId} (${service.host}:${service.port})`);
    this.emit('service:registered', service);
    
    return service;
  }

  async registerServiceInRedis(service) {
    const key = `${this.options.namespace}:services:${service.id}`;
    const value = JSON.stringify(service);
    
    // Set with expiration
    await this.redis.setEx(key, this.options.registrationTTL, value);
    
    // Add to service set for discovery
    await this.redis.sAdd(
      `${this.options.namespace}:service-list:${service.name}`,
      service.id
    );
    
    // Schedule renewal
    setTimeout(() => {
      this.renewServiceRegistration(service.id);
    }, (this.options.registrationTTL / 2) * 1000);
  }

  async renewServiceRegistration(serviceId) {
    const service = this.serviceRegistry.get(serviceId);
    if (!service || !this.localServices.has(serviceId)) {
      return; // Service no longer exists locally
    }
    
    try {
      // Update service info
      service.registration.renewalCount++;
      service.metadata.currentConnections = await this.getCurrentConnections(serviceId);
      service.metadata.cpuUsage = await this.getCPUUsage();
      service.metadata.memoryUsage = await this.getMemoryUsage();
      
      // Renew registration
      await this.registerServiceInRedis(service);
      
      console.log(`🔄 Service registration renewed: ${serviceId}`);
      
    } catch (error) {
      console.error(`❌ Failed to renew service registration for ${serviceId}:`, error);
    }
  }

  async deregisterService(serviceId, graceful = true) {
    const service = this.serviceRegistry.get(serviceId);
    if (!service) return false;
    
    if (graceful) {
      // Mark as draining
      service.health.status = 'draining';
      await this.registerServiceInRedis(service);
      
      // Wait for connections to drain
      console.log(`🔄 Gracefully draining service ${serviceId}...`);
      await this.waitForConnectionDrain(serviceId);
    }
    
    // Remove from Redis
    const key = `${this.options.namespace}:services:${service.id}`;
    await this.redis.del(key);
    await this.redis.sRem(
      `${this.options.namespace}:service-list:${service.name}`,
      service.id
    );
    
    // Remove from local registry
    this.serviceRegistry.delete(serviceId);
    this.localServices.delete(serviceId);
    this.healthStatus.delete(serviceId);
    this.serviceWeights.delete(serviceId);
    
    console.log(`🗑️ Service deregistered: ${serviceId}`);
    this.emit('service:deregistered', { serviceId, service });
    
    return true;
  }

  async waitForConnectionDrain(serviceId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const connections = await this.getCurrentConnections(serviceId);
      if (connections === 0) {
        console.log(`✅ Service ${serviceId} connections drained`);
        return true;
      }
      
      console.log(`⏳ Waiting for ${connections} connections to drain from ${serviceId}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.warn(`⚠️ Service ${serviceId} drain timeout - forcing deregistration`);
    return false;
  }

  // Service discovery
  async discoverServices(serviceName = null) {
    const pattern = serviceName 
      ? `${this.options.namespace}:service-list:${serviceName}`
      : `${this.options.namespace}:service-list:*`;
    
    const serviceListKeys = await this.redis.keys(pattern);
    const allServices = new Map();
    
    for (const listKey of serviceListKeys) {
      const serviceIds = await this.redis.sMembers(listKey);
      
      for (const serviceId of serviceIds) {
        const serviceKey = `${this.options.namespace}:services:${serviceId}`;
        const serviceData = await this.redis.get(serviceKey);
        
        if (serviceData) {
          try {
            const service = JSON.parse(serviceData);
            allServices.set(serviceId, service);
          } catch (error) {
            console.error(`❌ Failed to parse service data for ${serviceId}:`, error);
          }
        }
      }
    }
    
    return allServices;
  }

  startServiceDiscovery() {
    setInterval(async () => {
      try {
        const discoveredServices = await this.discoverServices();
        
        // Update local service registry with discovered services
        for (const [serviceId, service] of discoveredServices) {
          if (!this.localServices.has(serviceId)) {
            // This is a remote service
            this.serviceRegistry.set(serviceId, service);
          }
        }
        
        // Remove services that are no longer registered
        for (const [serviceId, service] of this.serviceRegistry) {
          if (!this.localServices.has(serviceId) && !discoveredServices.has(serviceId)) {
            this.serviceRegistry.delete(serviceId);
            this.healthStatus.delete(serviceId);
            this.serviceWeights.delete(serviceId);
          }
        }
        
        this.updateMetrics();
        this.emit('services:discovered', Array.from(discoveredServices.values()));
        
      } catch (error) {
        console.error('❌ Service discovery failed:', error);
      }
    }, this.options.discoveryInterval);
  }

  // Health monitoring
  startHealthMonitoring() {
    setInterval(async () => {
      const healthCheckPromises = [];
      
      for (const [serviceId, service] of this.serviceRegistry) {
        healthCheckPromises.push(this.checkServiceHealth(serviceId, service));
      }
      
      await Promise.allSettled(healthCheckPromises);
      this.updateHealthMetrics();
      
    }, this.options.healthCheckInterval);
  }

  startServiceHealthCheck(serviceId) {
    // Individual service health check is handled in the main health monitoring loop
    console.log(`🏥 Health monitoring started for service: ${serviceId}`);
  }

  async checkServiceHealth(serviceId, service) {
    try {
      const startTime = performance.now();
      
      // Perform health check based on service type
      let healthResult;
      if (this.localServices.has(serviceId)) {
        // Local service - check directly
        healthResult = await this.checkLocalServiceHealth(service);
      } else {
        // Remote service - HTTP health check
        healthResult = await this.checkRemoteServiceHealth(service);
      }
      
      const responseTime = performance.now() - startTime;
      
      // Update health status
      const healthData = this.healthStatus.get(serviceId) || {
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastFailure: null,
        averageResponseTime: 0,
        checkCount: 0,
      };
      
      healthData.checkCount++;
      healthData.lastCheck = Date.now();
      healthData.averageResponseTime = 
        (healthData.averageResponseTime * (healthData.checkCount - 1) + responseTime) / healthData.checkCount;
      
      if (healthResult.healthy) {
        healthData.consecutiveSuccesses++;
        healthData.consecutiveFailures = 0;
        service.health.status = 'healthy';
        service.health.successes++;
      } else {
        healthData.consecutiveFailures++;
        healthData.consecutiveSuccesses = 0;
        healthData.lastFailure = Date.now();
        service.health.status = 'unhealthy';
        service.health.failures++;
      }
      
      service.health.lastCheck = Date.now();
      service.load.averageResponseTime = healthData.averageResponseTime;
      
      this.healthStatus.set(serviceId, healthData);
      
      // Emit health status change events
      if (healthData.consecutiveFailures === 3) {
        console.error(`❌ Service ${serviceId} marked as unhealthy`);
        this.emit('service:unhealthy', { serviceId, service });
      } else if (healthData.consecutiveSuccesses === 2 && service.health.failures > 0) {
        console.log(`✅ Service ${serviceId} recovered to healthy`);
        this.emit('service:recovered', { serviceId, service });
      }
      
    } catch (error) {
      console.error(`❌ Health check failed for service ${serviceId}:`, error);
      
      const healthData = this.healthStatus.get(serviceId) || { consecutiveFailures: 0 };
      healthData.consecutiveFailures++;
      this.healthStatus.set(serviceId, healthData);
    }
  }

  async checkLocalServiceHealth(service) {
    // For local services, check process health, memory usage, etc.
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      healthy: memUsage.heapUsed < (memUsage.heapTotal * 0.9), // 90% memory threshold
      metrics: {
        memory: memUsage,
        cpu: cpuUsage,
      },
    };
  }

  async checkRemoteServiceHealth(service) {
    // HTTP health check for remote services
    const healthUrl = `${service.protocol}://${service.host}:${service.port}${service.health.checkUrl}`;
    
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000,
      });
      
      return {
        healthy: response.ok,
        statusCode: response.status,
        responseTime: performance.now(),
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  // Auto-scaling logic
  startAutoScaling() {
    setInterval(() => {
      this.evaluateScaling();
    }, 30000); // Check every 30 seconds
  }

  async evaluateScaling() {
    if (this.scalingInProgress) {
      return; // Scaling operation already in progress
    }
    
    const now = Date.now();
    const timeSinceLastScale = now - this.lastScaleAction;
    
    // Calculate cluster-wide metrics
    const clusterMetrics = this.calculateClusterMetrics();
    
    // Determine if scaling is needed
    const scaleDecision = this.makeScaleDecision(clusterMetrics, timeSinceLastScale);
    
    if (scaleDecision.action === 'scale_up') {
      await this.scaleUp(scaleDecision.reason, scaleDecision.targetInstances);
    } else if (scaleDecision.action === 'scale_down') {
      await this.scaleDown(scaleDecision.reason, scaleDecision.targetInstances);
    }
  }

  calculateClusterMetrics() {
    const services = Array.from(this.serviceRegistry.values());
    const healthyServices = services.filter(s => s.health.status === 'healthy');
    
    let totalConnections = 0;
    let totalCapacity = 0;
    let totalResponseTime = 0;
    let totalRequestRate = 0;
    let totalErrorRate = 0;
    
    for (const service of healthyServices) {
      totalConnections += service.metadata.currentConnections || 0;
      totalCapacity += service.metadata.maxConnections || 1000;
      totalResponseTime += service.load.averageResponseTime || 0;
      totalRequestRate += service.load.requestRate || 0;
      totalErrorRate += service.load.errorRate || 0;
    }
    
    const utilizationRate = totalCapacity > 0 ? totalConnections / totalCapacity : 0;
    const averageResponseTime = healthyServices.length > 0 ? totalResponseTime / healthyServices.length : 0;
    const averageErrorRate = healthyServices.length > 0 ? totalErrorRate / healthyServices.length : 0;
    
    return {
      totalServices: services.length,
      healthyServices: healthyServices.length,
      utilizationRate,
      totalConnections,
      totalCapacity,
      averageResponseTime,
      totalRequestRate,
      averageErrorRate,
    };
  }

  makeScaleDecision(metrics, timeSinceLastScale) {
    const { utilizationRate, healthyServices, averageResponseTime, averageErrorRate } = metrics;
    
    // Scale up conditions
    if (utilizationRate > this.options.scaleUpThreshold && 
        timeSinceLastScale > this.options.scaleUpCooldown &&
        healthyServices < this.options.maxInstances) {
      
      const targetInstances = Math.min(
        healthyServices + Math.ceil(healthyServices * 0.5), // Scale up by 50%
        this.options.maxInstances
      );
      
      return {
        action: 'scale_up',
        reason: `High utilization: ${(utilizationRate * 100).toFixed(1)}%`,
        targetInstances,
      };
    }
    
    // Scale up on high response time
    if (averageResponseTime > 1000 && // 1 second threshold
        timeSinceLastScale > this.options.scaleUpCooldown &&
        healthyServices < this.options.maxInstances) {
      
      return {
        action: 'scale_up',
        reason: `High response time: ${averageResponseTime.toFixed(0)}ms`,
        targetInstances: healthyServices + 1,
      };
    }
    
    // Scale up on high error rate
    if (averageErrorRate > 0.05 && // 5% error rate threshold
        timeSinceLastScale > this.options.scaleUpCooldown &&
        healthyServices < this.options.maxInstances) {
      
      return {
        action: 'scale_up',
        reason: `High error rate: ${(averageErrorRate * 100).toFixed(1)}%`,
        targetInstances: healthyServices + 1,
      };
    }
    
    // Scale down conditions
    if (utilizationRate < this.options.scaleDownThreshold &&
        timeSinceLastScale > this.options.scaleDownCooldown &&
        healthyServices > this.options.minInstances) {
      
      const targetInstances = Math.max(
        healthyServices - 1,
        this.options.minInstances
      );
      
      return {
        action: 'scale_down',
        reason: `Low utilization: ${(utilizationRate * 100).toFixed(1)}%`,
        targetInstances,
      };
    }
    
    return { action: 'none' };
  }

  async scaleUp(reason, targetInstances) {
    this.scalingInProgress = true;
    console.log(`📈 Scaling up: ${reason} (target: ${targetInstances} instances)`);
    
    try {
      // In a real implementation, this would:
      // 1. Launch new container/VM instances
      // 2. Wait for them to become healthy
      // 3. Add them to the load balancer
      
      const scaleEvent = {
        action: 'scale_up',
        reason,
        timestamp: Date.now(),
        beforeInstances: this.metrics.servicesHealthy,
        targetInstances,
        initiatedBy: this.nodeId,
      };
      
      this.scalingHistory.push(scaleEvent);
      this.lastScaleAction = Date.now();
      
      // Simulate scaling delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Emit scaling event for external orchestration
      this.emit('scaling:up', scaleEvent);
      
      console.log(`✅ Scale up completed: ${targetInstances} instances`);
      
    } catch (error) {
      console.error('❌ Scale up failed:', error);
      this.emit('scaling:failed', { action: 'scale_up', error });
    } finally {
      this.scalingInProgress = false;
    }
  }

  async scaleDown(reason, targetInstances) {
    this.scalingInProgress = true;
    console.log(`📉 Scaling down: ${reason} (target: ${targetInstances} instances)`);
    
    try {
      // Select services to scale down (prefer least utilized)
      const services = Array.from(this.serviceRegistry.values())
        .filter(s => s.health.status === 'healthy' && !this.localServices.has(s.id))
        .sort((a, b) => (a.metadata.currentConnections || 0) - (b.metadata.currentConnections || 0));
      
      const servicesToRemove = services.slice(0, services.length - targetInstances);
      
      for (const service of servicesToRemove) {
        await this.gracefullyRemoveService(service.id);
      }
      
      const scaleEvent = {
        action: 'scale_down',
        reason,
        timestamp: Date.now(),
        beforeInstances: this.metrics.servicesHealthy,
        targetInstances,
        removedServices: servicesToRemove.map(s => s.id),
        initiatedBy: this.nodeId,
      };
      
      this.scalingHistory.push(scaleEvent);
      this.lastScaleAction = Date.now();
      
      this.emit('scaling:down', scaleEvent);
      
      console.log(`✅ Scale down completed: ${targetInstances} instances`);
      
    } catch (error) {
      console.error('❌ Scale down failed:', error);
      this.emit('scaling:failed', { action: 'scale_down', error });
    } finally {
      this.scalingInProgress = false;
    }
  }

  async gracefullyRemoveService(serviceId) {
    console.log(`🔄 Gracefully removing service: ${serviceId}`);
    
    // Mark service for removal (this would signal container orchestration)
    const service = this.serviceRegistry.get(serviceId);
    if (service) {
      service.metadata.scheduledForRemoval = true;
      await this.registerServiceInRedis(service);
    }
    
    // In a real implementation, this would:
    // 1. Stop routing new connections to the service
    // 2. Wait for existing connections to drain
    // 3. Terminate the service instance
    // 4. Remove from service registry
    
    this.emit('service:removing', { serviceId });
  }

  // Utility methods
  async getCurrentConnections(serviceId) {
    // In a real implementation, this would query the actual service
    return Math.floor(Math.random() * 100); // Simulated
  }

  async getCPUUsage() {
    const cpuUsage = process.cpuUsage();
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  async getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024; // Convert to MB
  }

  updateMetrics() {
    const services = Array.from(this.serviceRegistry.values());
    const healthyServices = services.filter(s => s.health.status === 'healthy');
    
    this.metrics.servicesOnline = services.length;
    this.metrics.servicesHealthy = healthyServices.length;
    
    // Calculate other metrics
    let totalConnections = 0;
    let totalResponseTime = 0;
    let totalErrorRate = 0;
    
    for (const service of services) {
      totalConnections += service.metadata.currentConnections || 0;
      totalResponseTime += service.load.averageResponseTime || 0;
      totalErrorRate += service.load.errorRate || 0;
    }
    
    this.metrics.totalConnections = totalConnections;
    this.metrics.averageResponseTime = services.length > 0 ? totalResponseTime / services.length : 0;
    this.metrics.errorRate = services.length > 0 ? totalErrorRate / services.length : 0;
  }

  updateHealthMetrics() {
    const healthySvcs = Array.from(this.serviceRegistry.values())
      .filter(s => s.health.status === 'healthy').length;
    this.metrics.servicesHealthy = healthySvcs;
  }

  // API methods
  getServiceById(serviceId) {
    return this.serviceRegistry.get(serviceId);
  }

  getServicesByName(serviceName) {
    return Array.from(this.serviceRegistry.values())
      .filter(s => s.name === serviceName);
  }

  getHealthyServices(serviceName = null) {
    return Array.from(this.serviceRegistry.values())
      .filter(s => s.health.status === 'healthy' && 
                   (serviceName ? s.name === serviceName : true));
  }

  getServiceMetrics() {
    return {
      ...this.metrics,
      nodeInfo: this.nodeInfo,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 events
      lastScaleAction: this.lastScaleAction,
      scalingInProgress: this.scalingInProgress,
    };
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`🔄 Received ${signal}, gracefully shutting down services...`);
      
      // Deregister all local services
      const deregistrationPromises = [];
      for (const serviceId of this.localServices) {
        deregistrationPromises.push(this.deregisterService(serviceId, true));
      }
      
      await Promise.all(deregistrationPromises);
      
      console.log('✅ Service Discovery Manager shutdown complete');
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

module.exports = { ServiceDiscoveryManager };