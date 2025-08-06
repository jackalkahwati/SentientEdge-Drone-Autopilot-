// Example Usage of the Unified Protocol Translation Gateway
// Demonstrates integration and usage patterns

import ProtocolIntegration, { ProtocolIntegrationConfig } from './protocol-integration';
import { ProtocolType, MessagePriority, RoutingStrategy } from './protocol-gateway';
import { LoadBalancingAlgorithm } from './protocol-router';

// Example configuration for mixed drone fleet
const exampleConfig: ProtocolIntegrationConfig = {
  enableGateway: true,
  defaultRoutingStrategy: RoutingStrategy.ADAPTIVE,
  
  // Enable both MAVLink and Cyphal protocols
  mavlink: {
    enabled: true,
    url: 'ws://localhost:5760',
    timeout: 5000
  },
  
  cyphal: {
    enabled: true,
    nodeId: 100, // Ground Control Station ID
    port: 9382,
    multicastAddress: '239.65.83.72',
    redundantPorts: [9383, 9384] // Backup ports for redundancy
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
  }
};

// Example usage class
export class DroneFleetManager {
  private protocolIntegration: ProtocolIntegration;
  private activeOperations: Map<string, any> = new Map();

  constructor() {
    this.protocolIntegration = new ProtocolIntegration(exampleConfig);
    this.setupEventHandlers();
  }

  // Initialize the fleet management system
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Drone Fleet Manager...');
      await this.protocolIntegration.initialize();
      console.log('Drone Fleet Manager ready');
    } catch (error) {
      console.error('Failed to initialize fleet manager:', error);
      throw error;
    }
  }

  // Example: Mixed fleet operations
  public async demonstrateMixedFleetOperations(): Promise<void> {
    console.log('\n=== Demonstrating Mixed Fleet Operations ===');
    
    // Get all available drones from both protocols
    const allDrones = this.protocolIntegration.getAllDrones();
    console.log(`Found ${allDrones.length} drones across all protocols`);
    
    for (const drone of allDrones) {
      console.log(`- ${drone.name} (${drone.id}): ${drone.type} - Status: ${drone.status}`);
    }
    
    // Example operations on different types of drones
    await this.performSurveillanceMission();
    await this.coordinateSwarmFormation();
    await this.handleEmergencyResponse();
  }

  // Example: Surveillance mission using protocol translation
  private async performSurveillanceMission(): Promise<void> {
    console.log('\n--- Surveillance Mission ---');
    
    const surveillanceDrones = this.protocolIntegration.getAllDrones()
      .filter(drone => drone.type === 'surveillance' && drone.status === 'active');
    
    if (surveillanceDrones.length === 0) {
      console.log('No surveillance drones available');
      return;
    }
    
    const drone = surveillanceDrones[0];
    console.log(`Assigning surveillance mission to ${drone.name}`);
    
    // Send mission commands that will be automatically translated
    const missionCommands = [
      {
        type: 'command' as const,
        data: {
          command: 'set_mode',
          mode: 'AUTO',
          parameters: { safety_check: true }
        },
        priority: MessagePriority.HIGH
      },
      {
        type: 'mission' as const,
        data: {
          waypoints: [
            { lat: 32.7157, lon: -117.1611, alt: 100 },
            { lat: 32.7200, lon: -117.1650, alt: 100 },
            { lat: 32.7180, lon: -117.1630, alt: 100 }
          ],
          mission_type: 'surveillance',
          camera_settings: {
            resolution: '4K',
            zoom: 'auto',
            recording: true
          }
        },
        priority: MessagePriority.NORMAL
      }
    ];
    
    for (const command of missionCommands) {
      const success = await this.protocolIntegration.sendMessage(
        drone.id,
        command,
        {
          strategy: RoutingStrategy.FAILOVER,
          priority: command.priority
        }
      );
      
      console.log(`Command ${command.type}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }

  // Example: Swarm coordination across protocols
  private async coordinateSwarmFormation(): Promise<void> {
    console.log('\n--- Swarm Formation Coordination ---');
    
    const availableDrones = this.protocolIntegration.getAllDrones()
      .filter(drone => drone.status === 'active')
      .slice(0, 4); // Use up to 4 drones
    
    if (availableDrones.length < 2) {
      console.log('Not enough drones for swarm formation');
      return;
    }
    
    console.log(`Coordinating ${availableDrones.length} drones in formation`);
    
    // Define formation parameters
    const formation = {
      type: 'diamond',
      spacing: 50, // meters
      altitude: 100,
      speed: 10 // m/s
    };
    
    // Send swarm coordination commands
    for (let i = 0; i < availableDrones.length; i++) {
      const drone = availableDrones[i];
      const position = this.calculateFormationPosition(i, formation);
      
      const swarmCommand = {
        type: 'mission' as const,
        data: {
          command: 'join_formation',
          formation_id: 'diamond_01',
          position_in_formation: i,
          target_position: position,
          formation_parameters: formation,
          coordination_protocol: 'cyphal' // Prefer Cyphal for swarm coordination
        },
        priority: MessagePriority.HIGH
      };
      
      // Use redundant sending for critical swarm commands
      const success = await this.protocolIntegration.sendMessage(
        drone.id,
        swarmCommand,
        {
          strategy: RoutingStrategy.REDUNDANT,
          priority: MessagePriority.HIGH
        }
      );
      
      console.log(`Formation command for ${drone.name}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
  }

  // Example: Emergency response with automatic failover
  private async handleEmergencyResponse(): Promise<void> {
    console.log('\n--- Emergency Response Scenario ---');
    
    // Simulate emergency: drone lost communication
    const emergencyDrone = this.protocolIntegration.getAllDrones()
      .find(drone => drone.status === 'active');
    
    if (!emergencyDrone) {
      console.log('No drones available for emergency response');
      return;
    }
    
    console.log(`Emergency: Lost communication with ${emergencyDrone.name}`);
    
    // Try multiple protocols with escalating priority
    const emergencyCommands = [
      {
        type: 'command' as const,
        data: {
          command: 'emergency_stop',
          reason: 'communication_loss',
          safe_mode: true
        },
        priority: MessagePriority.CRITICAL
      },
      {
        type: 'command' as const,
        data: {
          command: 'rtl',
          emergency: true,
          altitude: 150 // Higher altitude for safety
        },
        priority: MessagePriority.CRITICAL
      }
    ];
    
    for (const command of emergencyCommands) {
      console.log(`Sending emergency command: ${command.data.command}`);
      
      // Use all available protocols with maximum redundancy
      const success = await this.protocolIntegration.sendMessage(
        emergencyDrone.id,
        command,
        {
          strategy: RoutingStrategy.REDUNDANT,
          priority: MessagePriority.CRITICAL
        }
      );
      
      if (success) {
        console.log('Emergency command acknowledged');
        break;
      } else {
        console.log('Emergency command failed, trying alternative protocols...');
      }
    }
  }

  // Example: Protocol switching based on conditions
  public async demonstrateProtocolSwitching(): Promise<void> {
    console.log('\n=== Demonstrating Dynamic Protocol Switching ===');
    
    const drones = this.protocolIntegration.getAllDrones();
    
    for (const drone of drones) {
      console.log(`\nAnalyzing ${drone.name}:`);
      
      // Get current routing status
      const routingStatus = this.protocolIntegration.getRoutingStatus();
      console.log('Current protocol metrics:', routingStatus.metrics);
      
      // Simulate condition-based protocol switching
      if (drone.signal < 50) {
        console.log('Low signal detected, switching to Cyphal mesh networking');
        await this.protocolIntegration.switchDroneProtocol(drone.id, ProtocolType.CYPHAL);
      } else if (drone.battery < 20) {
        console.log('Low battery detected, switching to MAVLink for efficiency');
        await this.protocolIntegration.switchDroneProtocol(drone.id, ProtocolType.MAVLINK);
      }
    }
  }

  // Example: Performance monitoring and optimization
  public async demonstratePerformanceMonitoring(): Promise<void> {
    console.log('\n=== Performance Monitoring ===');
    
    const metrics = this.protocolIntegration.getPerformanceMetrics();
    console.log('Protocol Gateway Performance:');
    console.log(`- Total Messages: ${metrics.totalMessages}`);
    console.log(`- Success Rate: ${((metrics.successfulTranslations / metrics.totalMessages) * 100).toFixed(1)}%`);
    console.log(`- Average Latency: ${metrics.averageLatency.toFixed(1)}ms`);
    console.log(`- Protocol Switches: ${metrics.protocolSwitches}`);
    console.log(`- Cache Hit Rate: ${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)}%`);
    
    // Run health check
    console.log('\nRunning Health Check...');
    const healthResults = await this.protocolIntegration.runHealthCheck();
    
    for (const [protocol, healthy] of healthResults) {
      console.log(`- ${protocol}: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    }
  }

  // Shutdown the system
  public async shutdown(): Promise<void> {
    console.log('Shutting down Drone Fleet Manager...');
    await this.protocolIntegration.shutdown();
    console.log('Fleet Manager shut down successfully');
  }

  // Private helper methods

  private setupEventHandlers(): void {
    this.protocolIntegration.on('gateway:ready', () => {
      console.log('Protocol Gateway is ready for operations');
    });
    
    this.protocolIntegration.on('protocol:switched', (data) => {
      console.log(`Protocol switched for ${data.droneId} to ${data.protocol}`);
    });
    
    this.protocolIntegration.on('protocol:unhealthy', (data) => {
      console.warn(`Protocol ${data.protocol} is unhealthy`);
    });
    
    this.protocolIntegration.on('protocol:circuit_breaker', (data) => {
      console.error(`Circuit breaker activated for ${data.protocol}`);
    });
  }

  private calculateFormationPosition(index: number, formation: any): { lat: number; lon: number; alt: number } {
    // Simple formation calculation (diamond pattern)
    const basePosition = { lat: 32.7157, lon: -117.1611, alt: formation.altitude };
    const spacing = formation.spacing / 111000; // Convert meters to approximate degrees
    
    switch (index) {
      case 0: // Lead
        return basePosition;
      case 1: // Right
        return { ...basePosition, lat: basePosition.lat + spacing };
      case 2: // Left
        return { ...basePosition, lat: basePosition.lat - spacing };
      case 3: // Rear
        return { ...basePosition, lon: basePosition.lon - spacing };
      default:
        return { ...basePosition, lat: basePosition.lat + (index % 2 === 0 ? spacing : -spacing) };
    }
  }
}

// Example usage
export async function runProtocolGatewayDemo(): Promise<void> {
  console.log('Starting Protocol Translation Gateway Demo');
  console.log('==========================================');
  
  const fleetManager = new DroneFleetManager();
  
  try {
    // Initialize the system
    await fleetManager.initialize();
    
    // Wait for system to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run demonstrations
    await fleetManager.demonstrateMixedFleetOperations();
    await fleetManager.demonstrateProtocolSwitching();
    await fleetManager.demonstratePerformanceMonitoring();
    
    console.log('\n=== Demo completed successfully ===');
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    await fleetManager.shutdown();
  }
}

// Export for use in other modules
export default DroneFleetManager;

// Uncomment to run the demo
// runProtocolGatewayDemo().catch(console.error);
