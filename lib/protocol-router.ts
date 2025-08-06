// Advanced Protocol Routing and Failover System
// Provides intelligent routing, load balancing, and automatic failover

import { EventEmitter } from 'events';
import { 
  ProtocolType, 
  UnifiedMessage, 
  MessagePriority, 
  RoutingStrategy,
  DroneCapabilities 
} from './protocol-gateway';

// Routing metrics for protocol selection
interface RoutingMetrics {
  protocol: ProtocolType;
  latency: number;
  successRate: number;
  bandwidth: number;
  reliability: number;
  cost: number; // Resource cost
  congestion: number; // Current load
  lastUpdated: number;
}

// Route quality assessment
interface RouteQuality {
  protocol: ProtocolType;
  score: number; // 0-100 quality score
  factors: {
    latency: number;
    reliability: number;
    bandwidth: number;
    congestion: number;
    cost: number;
  };
  recommendation: 'primary' | 'backup' | 'avoid';
}

// Failover configuration
interface FailoverConfig {
  enabled: boolean;
  maxRetries: number;
  retryInterval: number;
  fallbackTimeout: number;
  circuitBreakerThreshold: number;
  recoveryTime: number;
}

// Load balancing algorithms
export enum LoadBalancingAlgorithm {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  LEAST_LATENCY = 'least_latency',
  RESOURCE_BASED = 'resource_based',
  ADAPTIVE = 'adaptive'
}

// Circuit breaker states
enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, don't use
  HALF_OPEN = 'half_open' // Testing recovery
}

// Circuit breaker for protocol health
interface CircuitBreaker {
  protocol: ProtocolType;
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
  threshold: number;
  timeout: number;
}

export class ProtocolRouter extends EventEmitter {
  private routingMetrics: Map<ProtocolType, RoutingMetrics> = new Map();
  private circuitBreakers: Map<ProtocolType, CircuitBreaker> = new Map();
  private routingHistory: Map<string, RouteQuality[]> = new Map();
  private loadBalancingState: Map<LoadBalancingAlgorithm, any> = new Map();
  private failoverConfig: FailoverConfig;
  private performanceWindow: number = 300000; // 5 minutes
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(failoverConfig?: Partial<FailoverConfig>) {
    super();
    
    this.failoverConfig = {
      enabled: true,
      maxRetries: 3,
      retryInterval: 1000,
      fallbackTimeout: 5000,
      circuitBreakerThreshold: 5,
      recoveryTime: 30000,
      ...failoverConfig
    };
    
    this.initializeLoadBalancingState();
    this.startMetricsCollection();
  }

  // Initialize routing metrics for a protocol
  public initializeProtocol(protocol: ProtocolType): void {
    if (!this.routingMetrics.has(protocol)) {
      this.routingMetrics.set(protocol, {
        protocol,
        latency: 100, // Default 100ms
        successRate: 1.0, // Start optimistic
        bandwidth: 1000, // Default bandwidth
        reliability: 0.99, // 99% reliability
        cost: 1.0, // Normalized cost
        congestion: 0.0, // No congestion initially
        lastUpdated: Date.now()
      });
    }

    if (!this.circuitBreakers.has(protocol)) {
      this.circuitBreakers.set(protocol, {
        protocol,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        threshold: this.failoverConfig.circuitBreakerThreshold,
        timeout: this.failoverConfig.recoveryTime
      });
    }

    console.log(`Initialized routing for protocol: ${protocol}`);
  }

  // Select the best protocol for a message
  public selectProtocol(
    message: UnifiedMessage,
    capabilities: DroneCapabilities,
    strategy: RoutingStrategy = RoutingStrategy.DIRECT
  ): ProtocolType | null {
    const availableProtocols = this.getAvailableProtocols(capabilities);
    
    if (availableProtocols.length === 0) {
      console.warn(`No available protocols for drone ${message.droneId}`);
      return null;
    }

    switch (strategy) {
      case RoutingStrategy.DIRECT:
        return this.selectBestProtocol(availableProtocols, message);
      
      case RoutingStrategy.REDUNDANT:
        // For redundant, return the primary protocol (others will be used too)
        return this.selectBestProtocol(availableProtocols, message);
      
      case RoutingStrategy.MESH:
        // Prefer protocols that support mesh networking
        const meshCapable = availableProtocols.filter(p => 
          p === ProtocolType.CYPHAL || capabilities.meshCapable
        );
        return meshCapable.length > 0 
          ? this.selectBestProtocol(meshCapable, message)
          : this.selectBestProtocol(availableProtocols, message);
      
      case RoutingStrategy.FAILOVER:
        return this.selectWithFailover(availableProtocols, message);
      
      default:
        return this.selectBestProtocol(availableProtocols, message);
    }
  }

  // Get multiple protocols for redundant routing
  public selectProtocolsForRedundancy(
    message: UnifiedMessage,
    capabilities: DroneCapabilities,
    maxProtocols: number = 3
  ): ProtocolType[] {
    const availableProtocols = this.getAvailableProtocols(capabilities);
    const rankedProtocols = this.rankProtocols(availableProtocols, message);
    
    return rankedProtocols
      .slice(0, Math.min(maxProtocols, rankedProtocols.length))
      .map(quality => quality.protocol);
  }

  // Load balance message across protocols
  public loadBalanceProtocol(
    message: UnifiedMessage,
    capabilities: DroneCapabilities,
    algorithm: LoadBalancingAlgorithm = LoadBalancingAlgorithm.ADAPTIVE
  ): ProtocolType | null {
    const availableProtocols = this.getAvailableProtocols(capabilities);
    
    if (availableProtocols.length === 0) {
      return null;
    }

    switch (algorithm) {
      case LoadBalancingAlgorithm.ROUND_ROBIN:
        return this.roundRobinSelect(availableProtocols);
      
      case LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobinSelect(availableProtocols);
      
      case LoadBalancingAlgorithm.LEAST_CONNECTIONS:
        return this.leastConnectionsSelect(availableProtocols);
      
      case LoadBalancingAlgorithm.LEAST_LATENCY:
        return this.leastLatencySelect(availableProtocols);
      
      case LoadBalancingAlgorithm.RESOURCE_BASED:
        return this.resourceBasedSelect(availableProtocols, message);
      
      case LoadBalancingAlgorithm.ADAPTIVE:
        return this.adaptiveSelect(availableProtocols, message);
      
      default:
        return this.selectBestProtocol(availableProtocols, message);
    }
  }

  // Record success/failure for routing metrics
  public recordRoutingResult(
    protocol: ProtocolType,
    success: boolean,
    latency: number,
    messageSize: number = 0
  ): void {
    const metrics = this.routingMetrics.get(protocol);
    const circuitBreaker = this.circuitBreakers.get(protocol);
    
    if (!metrics || !circuitBreaker) {
      console.warn(`No metrics/circuit breaker found for protocol ${protocol}`);
      return;
    }

    // Update metrics with exponential moving average
    const alpha = 0.1; // Smoothing factor
    metrics.latency = alpha * latency + (1 - alpha) * metrics.latency;
    
    if (success) {
      metrics.successRate = alpha * 1.0 + (1 - alpha) * metrics.successRate;
      
      // Reset circuit breaker on success
      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        circuitBreaker.state = CircuitBreakerState.CLOSED;
        circuitBreaker.failureCount = 0;
        console.log(`Circuit breaker for ${protocol} closed (recovered)`);
      }
    } else {
      metrics.successRate = alpha * 0.0 + (1 - alpha) * metrics.successRate;
      
      // Update circuit breaker
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();
      
      if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
        circuitBreaker.state = CircuitBreakerState.OPEN;
        circuitBreaker.nextRetryTime = Date.now() + circuitBreaker.timeout;
        console.warn(`Circuit breaker for ${protocol} opened (too many failures)`);
        this.emit('circuit_breaker:opened', { protocol, failureCount: circuitBreaker.failureCount });
      }
    }

    // Update bandwidth estimate
    if (messageSize > 0 && latency > 0) {
      const throughput = messageSize / (latency / 1000); // bytes per second
      metrics.bandwidth = alpha * throughput + (1 - alpha) * metrics.bandwidth;
    }

    metrics.lastUpdated = Date.now();
    
    // Emit metrics update
    this.emit('metrics:updated', { protocol, metrics, success, latency });
  }

  // Update congestion level for a protocol
  public updateCongestion(protocol: ProtocolType, congestionLevel: number): void {
    const metrics = this.routingMetrics.get(protocol);
    if (metrics) {
      metrics.congestion = Math.max(0, Math.min(1, congestionLevel));
      metrics.lastUpdated = Date.now();
    }
  }

  // Check if protocol is available (circuit breaker)
  public isProtocolAvailable(protocol: ProtocolType): boolean {
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (!circuitBreaker) {
      return true; // Assume available if no circuit breaker
    }

    const now = Date.now();
    
    switch (circuitBreaker.state) {
      case CircuitBreakerState.CLOSED:
        return true;
      
      case CircuitBreakerState.OPEN:
        if (now >= circuitBreaker.nextRetryTime) {
          circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
          console.log(`Circuit breaker for ${protocol} half-open (testing recovery)`);
          return true;
        }
        return false;
      
      case CircuitBreakerState.HALF_OPEN:
        return true; // Allow one test request
      
      default:
        return false;
    }
  }

  // Get routing quality assessment
  public getRouteQuality(protocol: ProtocolType, message: UnifiedMessage): RouteQuality {
    const metrics = this.routingMetrics.get(protocol);
    
    if (!metrics) {
      return {
        protocol,
        score: 0,
        factors: { latency: 0, reliability: 0, bandwidth: 0, congestion: 0, cost: 0 },
        recommendation: 'avoid'
      };
    }

    // Calculate component scores (0-100)
    const latencyScore = Math.max(0, 100 - (metrics.latency / 10)); // Penalty for high latency
    const reliabilityScore = metrics.successRate * 100;
    const bandwidthScore = Math.min(100, metrics.bandwidth / 100); // Normalize bandwidth
    const congestionScore = Math.max(0, 100 - (metrics.congestion * 100));
    const costScore = Math.max(0, 100 - (metrics.cost * 50)); // Lower cost is better

    // Weight factors based on message priority
    const weights = this.getWeightsByPriority(message.priority);
    
    const overallScore = (
      latencyScore * weights.latency +
      reliabilityScore * weights.reliability +
      bandwidthScore * weights.bandwidth +
      congestionScore * weights.congestion +
      costScore * weights.cost
    ) / 100;

    let recommendation: 'primary' | 'backup' | 'avoid';
    if (overallScore >= 80) {
      recommendation = 'primary';
    } else if (overallScore >= 50) {
      recommendation = 'backup';
    } else {
      recommendation = 'avoid';
    }

    return {
      protocol,
      score: overallScore,
      factors: {
        latency: latencyScore,
        reliability: reliabilityScore,
        bandwidth: bandwidthScore,
        congestion: congestionScore,
        cost: costScore
      },
      recommendation
    };
  }

  // Get all routing metrics
  public getRoutingMetrics(): Map<ProtocolType, RoutingMetrics> {
    return new Map(this.routingMetrics);
  }

  // Get circuit breaker status
  public getCircuitBreakerStatus(): Map<ProtocolType, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  // Private methods

  private getAvailableProtocols(capabilities: DroneCapabilities): ProtocolType[] {
    return capabilities.supportedProtocols.filter(protocol => 
      this.isProtocolAvailable(protocol)
    );
  }

  private selectBestProtocol(protocols: ProtocolType[], message: UnifiedMessage): ProtocolType | null {
    if (protocols.length === 0) return null;
    if (protocols.length === 1) return protocols[0];

    const rankedProtocols = this.rankProtocols(protocols, message);
    return rankedProtocols.length > 0 ? rankedProtocols[0].protocol : null;
  }

  private selectWithFailover(protocols: ProtocolType[], message: UnifiedMessage): ProtocolType | null {
    // Sort by reliability first, then by overall quality
    return protocols
      .map(protocol => ({ protocol, quality: this.getRouteQuality(protocol, message) }))
      .sort((a, b) => {
        // Prioritize reliability for failover
        const reliabilityDiff = b.quality.factors.reliability - a.quality.factors.reliability;
        if (Math.abs(reliabilityDiff) > 10) {
          return reliabilityDiff;
        }
        return b.quality.score - a.quality.score;
      })
      .map(item => item.protocol)[0] || null;
  }

  private rankProtocols(protocols: ProtocolType[], message: UnifiedMessage): RouteQuality[] {
    return protocols
      .map(protocol => this.getRouteQuality(protocol, message))
      .sort((a, b) => b.score - a.score);
  }

  private getWeightsByPriority(priority: MessagePriority): Record<string, number> {
    switch (priority) {
      case MessagePriority.CRITICAL:
        return { latency: 0.4, reliability: 0.4, bandwidth: 0.1, congestion: 0.05, cost: 0.05 };
      
      case MessagePriority.HIGH:
        return { latency: 0.3, reliability: 0.3, bandwidth: 0.2, congestion: 0.1, cost: 0.1 };
      
      case MessagePriority.NORMAL:
        return { latency: 0.2, reliability: 0.25, bandwidth: 0.25, congestion: 0.15, cost: 0.15 };
      
      case MessagePriority.LOW:
        return { latency: 0.1, reliability: 0.2, bandwidth: 0.3, congestion: 0.2, cost: 0.2 };
      
      case MessagePriority.BACKGROUND:
        return { latency: 0.05, reliability: 0.15, bandwidth: 0.3, congestion: 0.25, cost: 0.25 };
      
      default:
        return { latency: 0.2, reliability: 0.25, bandwidth: 0.25, congestion: 0.15, cost: 0.15 };
    }
  }

  // Load balancing algorithms

  private roundRobinSelect(protocols: ProtocolType[]): ProtocolType {
    const state = this.loadBalancingState.get(LoadBalancingAlgorithm.ROUND_ROBIN) || { index: 0 };
    const protocol = protocols[state.index % protocols.length];
    state.index = (state.index + 1) % protocols.length;
    this.loadBalancingState.set(LoadBalancingAlgorithm.ROUND_ROBIN, state);
    return protocol;
  }

  private weightedRoundRobinSelect(protocols: ProtocolType[]): ProtocolType {
    // Weight by inverse latency and success rate
    const weights = protocols.map(protocol => {
      const metrics = this.routingMetrics.get(protocol);
      if (!metrics) return 1;
      return (1 / (metrics.latency + 1)) * metrics.successRate;
    });
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < protocols.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return protocols[i];
      }
    }
    
    return protocols[0]; // Fallback
  }

  private leastConnectionsSelect(protocols: ProtocolType[]): ProtocolType {
    // Select protocol with lowest congestion
    return protocols.reduce((best, current) => {
      const bestMetrics = this.routingMetrics.get(best);
      const currentMetrics = this.routingMetrics.get(current);
      
      if (!bestMetrics) return current;
      if (!currentMetrics) return best;
      
      return currentMetrics.congestion < bestMetrics.congestion ? current : best;
    });
  }

  private leastLatencySelect(protocols: ProtocolType[]): ProtocolType {
    return protocols.reduce((best, current) => {
      const bestMetrics = this.routingMetrics.get(best);
      const currentMetrics = this.routingMetrics.get(current);
      
      if (!bestMetrics) return current;
      if (!currentMetrics) return best;
      
      return currentMetrics.latency < bestMetrics.latency ? current : best;
    });
  }

  private resourceBasedSelect(protocols: ProtocolType[], message: UnifiedMessage): ProtocolType {
    // Consider resource cost and current load
    return protocols.reduce((best, current) => {
      const bestQuality = this.getRouteQuality(best, message);
      const currentQuality = this.getRouteQuality(current, message);
      
      // Prioritize cost and congestion factors
      const bestScore = bestQuality.factors.cost * 0.6 + bestQuality.factors.congestion * 0.4;
      const currentScore = currentQuality.factors.cost * 0.6 + currentQuality.factors.congestion * 0.4;
      
      return currentScore > bestScore ? current : best;
    });
  }

  private adaptiveSelect(protocols: ProtocolType[], message: UnifiedMessage): ProtocolType {
    // Adaptive selection based on current network conditions and message characteristics
    const rankedProtocols = this.rankProtocols(protocols, message);
    
    // Apply randomization to avoid thundering herd
    if (rankedProtocols.length > 1) {
      const topProtocols = rankedProtocols.filter(quality => 
        quality.score >= rankedProtocols[0].score * 0.9 // Within 90% of best
      );
      
      if (topProtocols.length > 1) {
        const randomIndex = Math.floor(Math.random() * topProtocols.length);
        return topProtocols[randomIndex].protocol;
      }
    }
    
    return rankedProtocols[0]?.protocol || protocols[0];
  }

  private initializeLoadBalancingState(): void {
    this.loadBalancingState.set(LoadBalancingAlgorithm.ROUND_ROBIN, { index: 0 });
    this.loadBalancingState.set(LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN, { weights: new Map() });
    this.loadBalancingState.set(LoadBalancingAlgorithm.LEAST_CONNECTIONS, { connections: new Map() });
  }

  private startMetricsCollection(): void {
    // Periodically clean up old metrics and update derived values
    this.metricsUpdateInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [protocol, metrics] of this.routingMetrics) {
        // Age out old metrics
        if (now - metrics.lastUpdated > this.performanceWindow) {
          // Gradually decay metrics toward defaults
          const alpha = 0.01; // Very slow decay
          metrics.successRate = alpha * 0.99 + (1 - alpha) * metrics.successRate;
          metrics.latency = alpha * 100 + (1 - alpha) * metrics.latency;
          metrics.congestion = alpha * 0.0 + (1 - alpha) * metrics.congestion;
        }
        
        // Update reliability based on recent success rate
        metrics.reliability = Math.max(0.5, metrics.successRate); // Minimum 50% reliability
      }
      
      // Check circuit breakers for recovery
      for (const [protocol, breaker] of this.circuitBreakers) {
        if (breaker.state === CircuitBreakerState.OPEN && now >= breaker.nextRetryTime) {
          breaker.state = CircuitBreakerState.HALF_OPEN;
          console.log(`Circuit breaker for ${protocol} moved to half-open for testing`);
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Cleanup
  public shutdown(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    
    this.removeAllListeners();
    console.log('Protocol router shut down');
  }
}

export default ProtocolRouter;
