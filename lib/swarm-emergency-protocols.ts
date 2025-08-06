/**
 * Emergency Swarm Breaking and Recovery Protocols
 * 
 * Implements comprehensive emergency response systems for drone swarms,
 * including threat detection, emergency breaking, individual drone recovery,
 * and coordinated emergency responses to various crisis scenarios.
 */

import {
  Swarm,
  SwarmStatus,
  Drone,
  DroneStatus,
  SwarmMessage,
  Vector3D,
  EnvironmentalData,
  SwarmCoordinationState
} from './types';

import {
  Vector3,
  CollisionAvoidanceAlgorithm,
  EmergentBehaviorAlgorithm
} from './swarm-algorithms';

import { SwarmCommunicationManager } from './swarm-communication';
import { FormationManager } from './formation-manager';

// ============================================================================
// EMERGENCY DETECTION SYSTEM
// ============================================================================

export interface EmergencyThreat {
  id: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  location?: Vector3D;
  radius?: number; // meters
  detectedAt: Date;
  source: string; // drone ID or system that detected it
  confidence: number; // 0-1
  timeToImpact?: number; // seconds
  affectedDrones: string[];
  metadata: Record<string, any>;
}

export type EmergencyType = 
  | 'collision_imminent'
  | 'weather_severe'
  | 'communication_failure'
  | 'power_critical'
  | 'mechanical_failure'
  | 'hostile_threat'
  | 'airspace_violation'
  | 'terrain_obstacle'
  | 'electromagnetic_interference'
  | 'gps_jamming'
  | 'swarm_fragmentation'
  | 'leader_failure';

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

export type EmergencyResponse = 
  | 'continue_mission'
  | 'alter_course'
  | 'emergency_scatter'
  | 'emergency_land'
  | 'return_to_base'
  | 'form_defensive'
  | 'initiate_recovery'
  | 'request_assistance';

export class EmergencyDetectionSystem {
  private readonly DETECTION_THRESHOLDS = {
    battery_critical: 15, // percentage
    signal_loss: 20, // percentage
    collision_time: 10, // seconds
    weather_wind_speed: 30, // knots
    fragmentation_distance: 500, // meters from center
    leader_timeout: 60 // seconds without leader communication
  };

  /**
   * Continuous monitoring and threat detection
   */
  detectThreats(
    swarm: Swarm,
    drones: Drone[],
    environmentalData: EnvironmentalData | null,
    obstacles: Array<{ position: Vector3D; radius: number }> = []
  ): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id));

    // Battery threats
    threats.push(...this.detectBatteryThreats(swarmDrones));

    // Communication threats
    threats.push(...this.detectCommunicationThreats(swarmDrones));

    // Collision threats
    threats.push(...this.detectCollisionThreats(swarmDrones));

    // Weather threats
    if (environmentalData) {
      threats.push(...this.detectWeatherThreats(swarmDrones, environmentalData));
    }

    // Mechanical threats
    threats.push(...this.detectMechanicalThreats(swarmDrones));

    // Formation/coordination threats
    threats.push(...this.detectCoordinationThreats(swarm, swarmDrones));

    // Obstacle threats
    threats.push(...this.detectObstacleThreats(swarmDrones, obstacles));

    return threats.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private detectBatteryThreats(drones: Drone[]): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    for (const drone of drones) {
      if (drone.battery <= this.DETECTION_THRESHOLDS.battery_critical) {
        threats.push({
          id: `battery_critical_${drone.id}_${Date.now()}`,
          type: 'power_critical',
          severity: drone.battery < 10 ? 'critical' : 'high',
          detectedAt: new Date(),
          source: drone.id,
          confidence: 1.0,
          affectedDrones: [drone.id],
          metadata: {
            batteryLevel: drone.battery,
            estimatedFlightTime: this.estimateRemainingFlightTime(drone)
          }
        });
      }
    }

    return threats;
  }

  private detectCommunicationThreats(drones: Drone[]): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    for (const drone of drones) {
      if (drone.signal <= this.DETECTION_THRESHOLDS.signal_loss) {
        threats.push({
          id: `comm_failure_${drone.id}_${Date.now()}`,
          type: 'communication_failure',
          severity: drone.signal < 10 ? 'critical' : 'high',
          detectedAt: new Date(),
          source: 'system',
          confidence: 0.9,
          affectedDrones: [drone.id],
          metadata: {
            signalStrength: drone.signal,
            lastCommunication: new Date().toISOString()
          }
        });
      }
    }

    return threats;
  }

  private detectCollisionThreats(drones: Drone[]): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    for (const drone of drones) {
      const neighbors = drones.filter(d => d.id !== drone.id);
      const collisions = CollisionAvoidanceAlgorithm.predictCollisions(
        drone,
        neighbors,
        this.DETECTION_THRESHOLDS.collision_time
      );

      for (const collision of collisions) {
        if (collision.severity > 0.7) {
          threats.push({
            id: `collision_${drone.id}_${collision.droneId}_${Date.now()}`,
            type: 'collision_imminent',
            severity: collision.severity > 0.9 ? 'critical' : 'high',
            detectedAt: new Date(),
            source: drone.id,
            confidence: collision.severity,
            timeToImpact: collision.timeToCollision,
            affectedDrones: [drone.id, collision.droneId],
            metadata: {
              timeToCollision: collision.timeToCollision,
              collisionSeverity: collision.severity
            }
          });
        }
      }
    }

    return threats;
  }

  private detectWeatherThreats(
    drones: Drone[],
    environmentalData: EnvironmentalData
  ): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    // Severe wind conditions
    if (environmentalData.wind.speed > this.DETECTION_THRESHOLDS.weather_wind_speed) {
      const severity: EmergencySeverity = 
        environmentalData.wind.speed > 50 ? 'critical' :
        environmentalData.wind.speed > 40 ? 'high' : 'medium';

      threats.push({
        id: `weather_wind_${Date.now()}`,
        type: 'weather_severe',
        severity,
        location: { x: environmentalData.location[0], y: environmentalData.location[1], z: 0 },
        detectedAt: new Date(),
        source: 'weather_system',
        confidence: 0.8,
        affectedDrones: drones.map(d => d.id),
        metadata: {
          windSpeed: environmentalData.wind.speed,
          windDirection: environmentalData.wind.direction,
          visibility: environmentalData.visibility
        }
      });
    }

    // Poor visibility
    if (environmentalData.visibility < 0.5) {
      threats.push({
        id: `weather_visibility_${Date.now()}`,
        type: 'weather_severe',
        severity: environmentalData.visibility < 0.1 ? 'high' : 'medium',
        detectedAt: new Date(),
        source: 'weather_system',
        confidence: 0.9,
        affectedDrones: drones.map(d => d.id),
        metadata: {
          visibility: environmentalData.visibility,
          precipitation: environmentalData.precipitation
        }
      });
    }

    return threats;
  }

  private detectMechanicalThreats(drones: Drone[]): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    for (const drone of drones) {
      // Drone status indicates mechanical issues
      if (drone.status === 'maintenance') {
        threats.push({
          id: `mechanical_${drone.id}_${Date.now()}`,
          type: 'mechanical_failure',
          severity: 'high',
          detectedAt: new Date(),
          source: drone.id,
          confidence: 1.0,
          affectedDrones: [drone.id],
          metadata: {
            droneStatus: drone.status,
            lastMaintenance: drone.nextMaintenance
          }
        });
      }

      // Detect anomalous behavior patterns
      if (this.detectAnomalousBehavior(drone)) {
        threats.push({
          id: `behavior_anomaly_${drone.id}_${Date.now()}`,
          type: 'mechanical_failure',
          severity: 'medium',
          detectedAt: new Date(),
          source: 'system',
          confidence: 0.6,
          affectedDrones: [drone.id],
          metadata: {
            anomalyType: 'behavior_pattern',
            details: 'Unusual flight characteristics detected'
          }
        });
      }
    }

    return threats;
  }

  private detectCoordinationThreats(swarm: Swarm, drones: Drone[]): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    // Leader failure detection
    if (swarm.leadDrone) {
      const leader = drones.find(d => d.id === swarm.leadDrone);
      if (!leader || leader.status !== 'active') {
        threats.push({
          id: `leader_failure_${swarm.leadDrone}_${Date.now()}`,
          type: 'leader_failure',
          severity: 'high',
          detectedAt: new Date(),
          source: 'system',
          confidence: 1.0,
          affectedDrones: swarm.drones,
          metadata: {
            failedLeader: swarm.leadDrone,
            swarmSize: swarm.drones.length
          }
        });
      }
    }

    // Swarm fragmentation detection
    const activeDrones = drones.filter(d => swarm.drones.includes(d.id) && d.status === 'active');
    if (activeDrones.length > 2) {
      const centerOfMass = EmergentBehaviorAlgorithm.calculateCenterOfMass(activeDrones);
      const fragmentedDrones = activeDrones.filter(drone => {
        if (!drone.location) return false;
        const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
        return dronePos.distance(centerOfMass) > this.DETECTION_THRESHOLDS.fragmentation_distance;
      });

      if (fragmentedDrones.length > 0) {
        threats.push({
          id: `fragmentation_${swarm.id}_${Date.now()}`,
          type: 'swarm_fragmentation',
          severity: fragmentedDrones.length > swarm.drones.length / 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          source: 'system',
          confidence: 0.8,
          affectedDrones: fragmentedDrones.map(d => d.id),
          metadata: {
            fragmentedCount: fragmentedDrones.length,
            totalSwarmSize: swarm.drones.length,
            maxDistance: Math.max(...fragmentedDrones.map(d => {
              const pos = new Vector3(d.location![0], d.location![1], d.altitude || 100);
              return pos.distance(centerOfMass);
            }))
          }
        });
      }
    }

    return threats;
  }

  private detectObstacleThreats(
    drones: Drone[],
    obstacles: Array<{ position: Vector3D; radius: number }>
  ): EmergencyThreat[] {
    const threats: EmergencyThreat[] = [];

    for (const drone of drones) {
      if (!drone.location) continue;

      const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);

      for (const obstacle of obstacles) {
        const obstaclePos = Vector3.from(obstacle.position);
        const distance = dronePos.distance(obstaclePos);
        const dangerZone = obstacle.radius + 50; // 50m safety margin

        if (distance < dangerZone) {
          const severity: EmergencySeverity = 
            distance < obstacle.radius + 20 ? 'critical' :
            distance < obstacle.radius + 35 ? 'high' : 'medium';

          threats.push({
            id: `obstacle_${drone.id}_${Date.now()}`,
            type: 'terrain_obstacle',
            severity,
            location: obstacle.position,
            detectedAt: new Date(),
            source: drone.id,
            confidence: 0.9,
            affectedDrones: [drone.id],
            metadata: {
              obstacleDistance: distance,
              obstacleRadius: obstacle.radius,
              safetyMargin: dangerZone - distance
            }
          });
        }
      }
    }

    return threats;
  }

  private estimateRemainingFlightTime(drone: Drone): number {
    // Simplified estimation - in reality would consider flight profile, weather, etc.
    const baseFlightTime = 3600; // 1 hour at 100% battery
    return (drone.battery / 100) * baseFlightTime;
  }

  private detectAnomalousBehavior(drone: Drone): boolean {
    // Simplified anomaly detection - would use ML models in production
    // Check for impossible or erratic values
    if (drone.speed !== undefined && (drone.speed < 0 || drone.speed > 100)) return true;
    if (drone.altitude !== undefined && (drone.altitude < 0 || drone.altitude > 10000)) return true;
    if (drone.heading !== undefined && (drone.heading < 0 || drone.heading >= 360)) return true;
    
    return false;
  }
}

// ============================================================================
// EMERGENCY RESPONSE COORDINATOR
// ============================================================================

export class EmergencyResponseCoordinator {
  private communicationManager: SwarmCommunicationManager;
  private formationManager: FormationManager;
  private activeEmergencies: Map<string, ActiveEmergency> = new Map();
  private responseStrategies: Map<EmergencyType, EmergencyResponseStrategy> = new Map();

  constructor(
    communicationManager: SwarmCommunicationManager,
    formationManager: FormationManager
  ) {
    this.communicationManager = communicationManager;
    this.formationManager = formationManager;
    this.initializeResponseStrategies();
  }

  /**
   * Handle detected emergency threats
   */
  async handleEmergency(
    swarm: Swarm,
    threat: EmergencyThreat,
    availableDrones: Drone[]
  ): Promise<string> {
    const emergencyId = `emergency_${threat.id}_${Date.now()}`;
    
    // Determine response strategy
    const strategy = this.determineResponseStrategy(threat, swarm, availableDrones);
    
    const activeEmergency: ActiveEmergency = {
      id: emergencyId,
      threat,
      swarmId: swarm.id,
      strategy,
      status: 'responding',
      startTime: new Date(),
      affectedDrones: threat.affectedDrones,
      responseActions: []
    };

    this.activeEmergencies.set(emergencyId, activeEmergency);

    try {
      // Execute emergency response
      await this.executeEmergencyResponse(activeEmergency, swarm, availableDrones);
      activeEmergency.status = 'resolved';
    } catch (error) {
      console.error(`Emergency response failed for ${emergencyId}:`, error);
      activeEmergency.status = 'failed';
      
      // Escalate to higher-level emergency protocols
      await this.escalateEmergency(activeEmergency, swarm, availableDrones);
    }

    return emergencyId;
  }

  private determineResponseStrategy(
    threat: EmergencyThreat,
    swarm: Swarm,
    availableDrones: Drone[]
  ): EmergencyResponseStrategy {
    const baseStrategy = this.responseStrategies.get(threat.type);
    if (!baseStrategy) {
      return this.getDefaultResponseStrategy(threat);
    }

    // Adapt strategy based on threat severity and swarm conditions
    const adaptedStrategy = { ...baseStrategy };
    
    if (threat.severity === 'critical') {
      adaptedStrategy.immediateActions.push('emergency_broadcast');
      adaptedStrategy.timeToRespond = Math.min(adaptedStrategy.timeToRespond, 5); // Max 5 seconds
    }

    // Consider swarm size and capabilities
    const activeDrones = availableDrones.filter(d => 
      swarm.drones.includes(d.id) && d.status === 'active'
    );

    if (activeDrones.length < 3) {
      // Small swarm - prioritize individual safety
      adaptedStrategy.coordinationLevel = 'individual';
    } else if (activeDrones.length > 10) {
      // Large swarm - can afford complex coordination
      adaptedStrategy.coordinationLevel = 'hierarchical';
    }

    return adaptedStrategy;
  }

  private async executeEmergencyResponse(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    const { strategy, threat } = emergency;

    // Execute immediate actions
    for (const action of strategy.immediateActions) {
      const actionResult = await this.executeEmergencyAction(
        action,
        emergency,
        swarm,
        availableDrones
      );
      
      emergency.responseActions.push({
        action,
        result: actionResult,
        timestamp: new Date()
      });
    }

    // Execute coordinated response
    await this.executeCoordinatedResponse(emergency, swarm, availableDrones);

    // Monitor and adapt response
    setTimeout(() => {
      this.monitorEmergencyProgress(emergency.id);
    }, strategy.timeToRespond * 1000);
  }

  private async executeEmergencyAction(
    action: string,
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<boolean> {
    switch (action) {
      case 'emergency_broadcast':
        return await this.broadcastEmergencyAlert(emergency, swarm);
      
      case 'immediate_scatter':
        return await this.executeEmergencyScatter(emergency, swarm, availableDrones);
      
      case 'formation_break':
        return await this.executeFormationBreak(emergency, swarm);
      
      case 'emergency_land':
        return await this.executeEmergencyLanding(emergency, availableDrones);
      
      case 'return_to_base':
        return await this.executeReturnToBase(emergency, availableDrones);
      
      case 'leader_transition':
        return await this.executeLeaderTransition(emergency, swarm, availableDrones);
      
      case 'isolate_affected':
        return await this.isolateAffectedDrones(emergency, swarm);
      
      case 'request_assistance':
        return await this.requestExternalAssistance(emergency);
      
      default:
        console.warn(`Unknown emergency action: ${action}`);
        return false;
    }
  }

  private async broadcastEmergencyAlert(
    emergency: ActiveEmergency,
    swarm: Swarm
  ): Promise<boolean> {
    try {
      await this.communicationManager.sendEmergencyAlert(
        emergency.threat.type,
        emergency.threat.severity === 'critical' ? 'critical' : 'high',
        {
          emergencyId: emergency.id,
          threatType: emergency.threat.type,
          severity: emergency.threat.severity,
          affectedDrones: emergency.affectedDrones,
          timeDetected: emergency.threat.detectedAt.toISOString(),
          responseRequired: emergency.strategy.response
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to broadcast emergency alert:', error);
      return false;
    }
  }

  private async executeEmergencyScatter(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<boolean> {
    const scatterCommands: Promise<boolean>[] = [];

    for (const droneId of emergency.affectedDrones) {
      const drone = availableDrones.find(d => d.id === droneId);
      if (!drone || !drone.location) continue;

      // Calculate scatter direction (away from threat center)
      let scatterDirection = this.calculateScatterDirection(drone, emergency.threat);
      
      scatterCommands.push(
        this.communicationManager.sendFormationCommand(
          droneId,
          'emergency_scatter',
          {
            emergencyId: emergency.id,
            scatterDirection,
            scatterDistance: 200, // 200 meters
            maxScatterSpeed: 20, // m/s
            maintainAltitude: true
          }
        )
      );
    }

    const results = await Promise.all(scatterCommands);
    return results.every(r => r);
  }

  private calculateScatterDirection(drone: Drone, threat: EmergencyThreat): Vector3D {
    if (!drone.location) {
      // Random direction if no position known
      const angle = Math.random() * 2 * Math.PI;
      return {
        x: Math.cos(angle),
        y: Math.sin(angle),
        z: 0
      };
    }

    const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
    
    if (threat.location) {
      // Move away from threat
      const threatPos = Vector3.from(threat.location);
      const awayDirection = dronePos.subtract(threatPos).normalize();
      return awayDirection.toVector3D();
    } else {
      // Scatter in random direction
      const angle = Math.random() * 2 * Math.PI;
      return {
        x: Math.cos(angle),
        y: Math.sin(angle),
        z: 0
      };
    }
  }

  private async executeFormationBreak(
    emergency: ActiveEmergency,
    swarm: Swarm
  ): Promise<boolean> {
    try {
      // Command all drones to break formation
      for (const droneId of swarm.drones) {
        await this.communicationManager.sendFormationCommand(
          droneId,
          'formation_break',
          {
            emergencyId: emergency.id,
            reason: emergency.threat.type,
            resumeFormation: false
          }
        );
      }
      return true;
    } catch (error) {
      console.error('Failed to execute formation break:', error);
      return false;
    }
  }

  private async executeEmergencyLanding(
    emergency: ActiveEmergency,
    availableDrones: Drone[]
  ): Promise<boolean> {
    const landingCommands: Promise<boolean>[] = [];

    for (const droneId of emergency.affectedDrones) {
      landingCommands.push(
        this.communicationManager.sendFormationCommand(
          droneId,
          'emergency_land',
          {
            emergencyId: emergency.id,
            landingType: 'immediate',
            selectSafeLandingZone: true
          }
        )
      );
    }

    const results = await Promise.all(landingCommands);
    return results.every(r => r);
  }

  private async executeReturnToBase(
    emergency: ActiveEmergency,
    availableDrones: Drone[]
  ): Promise<boolean> {
    const rtbCommands: Promise<boolean>[] = [];

    for (const droneId of emergency.affectedDrones) {
      rtbCommands.push(
        this.communicationManager.sendFormationCommand(
          droneId,
          'return_to_base',
          {
            emergencyId: emergency.id,
            priority: 'high',
            route: 'direct'
          }
        )
      );
    }

    const results = await Promise.all(rtbCommands);
    return results.every(r => r);
  }

  private async executeLeaderTransition(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<boolean> {
    // Find suitable replacement leader
    const eligibleDrones = availableDrones.filter(d => 
      swarm.drones.includes(d.id) && 
      d.status === 'active' && 
      !emergency.affectedDrones.includes(d.id) &&
      d.battery > 30
    );

    if (eligibleDrones.length === 0) return false;

    // Select best candidate (simplified selection)
    const newLeader = eligibleDrones.reduce((best, current) => 
      current.battery > best.battery ? current : best
    );

    try {
      await this.communicationManager.sendFormationCommand(
        newLeader.id,
        'assume_leadership',
        {
          emergencyId: emergency.id,
          previousLeader: swarm.leadDrone,
          transitionReason: 'emergency_response'
        }
      );

      // Notify swarm of leadership change
      for (const droneId of swarm.drones) {
        if (droneId !== newLeader.id) {
          await this.communicationManager.sendFormationCommand(
            droneId,
            'new_leader',
            {
              newLeaderId: newLeader.id,
              emergencyId: emergency.id
            }
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to execute leader transition:', error);
      return false;
    }
  }

  private async isolateAffectedDrones(
    emergency: ActiveEmergency,
    swarm: Swarm
  ): Promise<boolean> {
    try {
      // Remove affected drones from active swarm operations
      for (const droneId of emergency.affectedDrones) {
        await this.communicationManager.sendFormationCommand(
          droneId,
          'isolate',
          {
            emergencyId: emergency.id,
            isolationReason: emergency.threat.type,
            allowRecovery: true
          }
        );
      }
      return true;
    } catch (error) {
      console.error('Failed to isolate affected drones:', error);
      return false;
    }
  }

  private async requestExternalAssistance(emergency: ActiveEmergency): Promise<boolean> {
    try {
      // Send assistance request to control station or nearby swarms
      await this.communicationManager.sendEmergencyAlert(
        'assistance_request',
        'critical',
        {
          emergencyId: emergency.id,
          threatType: emergency.threat.type,
          affectedSwarm: emergency.swarmId,
          assistanceType: 'recovery_support',
          urgency: emergency.threat.severity
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to request external assistance:', error);
      return false;
    }
  }

  private async executeCoordinatedResponse(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    const { strategy } = emergency;

    switch (strategy.coordinationLevel) {
      case 'individual':
        await this.executeIndividualResponse(emergency, availableDrones);
        break;
      case 'swarm':
        await this.executeSwarmResponse(emergency, swarm, availableDrones);
        break;
      case 'hierarchical':
        await this.executeHierarchicalResponse(emergency, swarm, availableDrones);
        break;
    }
  }

  private async executeIndividualResponse(
    emergency: ActiveEmergency,
    availableDrones: Drone[]
  ): Promise<void> {
    // Each drone responds independently
    for (const droneId of emergency.affectedDrones) {
      await this.communicationManager.sendFormationCommand(
        droneId,
        'individual_response',
        {
          emergencyId: emergency.id,
          responseType: emergency.strategy.response,
          autonomousMode: true
        }
      );
    }
  }

  private async executeSwarmResponse(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    // Coordinated swarm-level response
    const responseMessage = {
      emergencyId: emergency.id,
      responseType: emergency.strategy.response,
      coordinatedAction: true,
      swarmId: swarm.id
    };

    for (const droneId of swarm.drones) {
      await this.communicationManager.sendFormationCommand(
        droneId,
        'swarm_response',
        responseMessage
      );
    }
  }

  private async executeHierarchicalResponse(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    // Leader coordinates response for subordinates
    if (swarm.leadDrone && !emergency.affectedDrones.includes(swarm.leadDrone)) {
      await this.communicationManager.sendFormationCommand(
        swarm.leadDrone,
        'coordinate_emergency_response',
        {
          emergencyId: emergency.id,
          affectedDrones: emergency.affectedDrones,
          responseStrategy: emergency.strategy
        }
      );
    }
  }

  private async escalateEmergency(
    emergency: ActiveEmergency,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    // Escalate to more aggressive response
    const escalatedStrategy = this.getEscalatedStrategy(emergency.strategy);
    emergency.strategy = escalatedStrategy;
    emergency.status = 'escalated';

    await this.executeEmergencyResponse(emergency, swarm, availableDrones);
  }

  private getEscalatedStrategy(originalStrategy: EmergencyResponseStrategy): EmergencyResponseStrategy {
    return {
      ...originalStrategy,
      response: originalStrategy.response === 'alter_course' ? 'emergency_scatter' :
                originalStrategy.response === 'emergency_scatter' ? 'emergency_land' :
                'return_to_base',
      immediateActions: [...originalStrategy.immediateActions, 'request_assistance'],
      timeToRespond: Math.max(originalStrategy.timeToRespond / 2, 1)
    };
  }

  private monitorEmergencyProgress(emergencyId: string): void {
    const emergency = this.activeEmergencies.get(emergencyId);
    if (!emergency || emergency.status !== 'responding') return;

    // Check if emergency is resolved or needs further action
    // This would involve checking drone status, threat persistence, etc.
    
    // Simplified monitoring - in production would have sophisticated monitoring
    setTimeout(() => {
      if (emergency.status === 'responding') {
        emergency.status = 'monitoring';
      }
    }, 30000); // Monitor for 30 seconds
  }

  private initializeResponseStrategies(): void {
    this.responseStrategies.set('collision_imminent', {
      response: 'emergency_scatter',
      immediateActions: ['emergency_broadcast', 'immediate_scatter'],
      coordinationLevel: 'individual',
      timeToRespond: 2,
      recoveryPossible: true
    });

    this.responseStrategies.set('weather_severe', {
      response: 'alter_course',
      immediateActions: ['emergency_broadcast', 'formation_break'],
      coordinationLevel: 'swarm',
      timeToRespond: 10,
      recoveryPossible: true
    });

    this.responseStrategies.set('power_critical', {
      response: 'return_to_base',
      immediateActions: ['emergency_broadcast', 'isolate_affected'],
      coordinationLevel: 'individual',
      timeToRespond: 5,
      recoveryPossible: false
    });

    this.responseStrategies.set('leader_failure', {
      response: 'continue_mission',
      immediateActions: ['leader_transition', 'emergency_broadcast'],
      coordinationLevel: 'hierarchical',
      timeToRespond: 15,
      recoveryPossible: true
    });

    this.responseStrategies.set('communication_failure', {
      response: 'return_to_base',
      immediateActions: ['isolate_affected'],
      coordinationLevel: 'individual',
      timeToRespond: 30,
      recoveryPossible: true
    });

    this.responseStrategies.set('swarm_fragmentation', {
      response: 'form_defensive',
      immediateActions: ['emergency_broadcast', 'formation_break'],
      coordinationLevel: 'swarm',
      timeToRespond: 20,
      recoveryPossible: true
    });
  }

  private getDefaultResponseStrategy(threat: EmergencyThreat): EmergencyResponseStrategy {
    return {
      response: threat.severity === 'critical' ? 'emergency_land' : 'alter_course',
      immediateActions: ['emergency_broadcast'],
      coordinationLevel: 'swarm',
      timeToRespond: 15,
      recoveryPossible: true
    };
  }

  /**
   * Get active emergencies
   */
  getActiveEmergencies(): ActiveEmergency[] {
    return Array.from(this.activeEmergencies.values())
      .filter(e => e.status === 'responding' || e.status === 'escalated');
  }

  /**
   * Get emergency statistics
   */
  getEmergencyStats(): {
    totalEmergencies: number;
    activeEmergencies: number;
    resolvedEmergencies: number;
    failedEmergencies: number;
    averageResponseTime: number;
  } {
    const emergencies = Array.from(this.activeEmergencies.values());
    const resolved = emergencies.filter(e => e.status === 'resolved');
    const responseTimes = resolved
      .map(e => e.endTime ? e.endTime.getTime() - e.startTime.getTime() : 0)
      .filter(t => t > 0);

    return {
      totalEmergencies: emergencies.length,
      activeEmergencies: emergencies.filter(e => e.status === 'responding' || e.status === 'escalated').length,
      resolvedEmergencies: resolved.length,
      failedEmergencies: emergencies.filter(e => e.status === 'failed').length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0
    };
  }
}

interface EmergencyResponseStrategy {
  response: EmergencyResponse;
  immediateActions: string[];
  coordinationLevel: 'individual' | 'swarm' | 'hierarchical';
  timeToRespond: number; // seconds
  recoveryPossible: boolean;
}

interface ActiveEmergency {
  id: string;
  threat: EmergencyThreat;
  swarmId: string;
  strategy: EmergencyResponseStrategy;
  status: 'responding' | 'escalated' | 'resolved' | 'failed' | 'monitoring';
  startTime: Date;
  endTime?: Date;
  affectedDrones: string[];
  responseActions: Array<{
    action: string;
    result: boolean;
    timestamp: Date;
  }>;
}

// ============================================================================
// RECOVERY COORDINATION SYSTEM
// ============================================================================

export class SwarmRecoveryCoordinator {
  private communicationManager: SwarmCommunicationManager;
  private recoveryOperations: Map<string, RecoveryOperation> = new Map();

  constructor(communicationManager: SwarmCommunicationManager) {
    this.communicationManager = communicationManager;
  }

  /**
   * Initiate recovery operation for failed or isolated drones
   */
  async initiateRecovery(
    swarm: Swarm,
    failedDrones: string[],
    availableDrones: Drone[],
    recoveryType: 'formation_rejoin' | 'individual_recovery' | 'assisted_recovery' = 'formation_rejoin'
  ): Promise<string> {
    const recoveryId = `recovery_${Date.now()}`;
    
    const recoveryOperation: RecoveryOperation = {
      id: recoveryId,
      swarmId: swarm.id,
      failedDrones,
      recoveryType,
      status: 'planning',
      startTime: new Date(),
      assignedRescuers: [],
      recoveryPlan: await this.createRecoveryPlan(failedDrones, availableDrones, recoveryType)
    };

    this.recoveryOperations.set(recoveryId, recoveryOperation);

    try {
      await this.executeRecoveryOperation(recoveryOperation, swarm, availableDrones);
      recoveryOperation.status = 'in_progress';
    } catch (error) {
      console.error(`Recovery operation failed: ${error}`);
      recoveryOperation.status = 'failed';
    }

    return recoveryId;
  }

  private async createRecoveryPlan(
    failedDrones: string[],
    availableDrones: Drone[],
    recoveryType: string
  ): Promise<RecoveryPlan> {
    const plan: RecoveryPlan = {
      phases: [],
      estimatedDuration: 0,
      resourceRequirements: {
        rescuerDrones: 0,
        fuelReserve: 0,
        communicationRange: 1000
      }
    };

    switch (recoveryType) {
      case 'formation_rejoin':
        plan.phases = [
          { phase: 'locate', duration: 300, description: 'Locate failed drones' },
          { phase: 'communicate', duration: 120, description: 'Establish communication' },
          { phase: 'guide', duration: 600, description: 'Guide back to formation' },
          { phase: 'integrate', duration: 180, description: 'Reintegrate into swarm' }
        ];
        plan.resourceRequirements.rescuerDrones = Math.min(2, Math.floor(availableDrones.length / 2));
        break;

      case 'individual_recovery':
        plan.phases = [
          { phase: 'assess', duration: 180, description: 'Assess drone condition' },
          { phase: 'stabilize', duration: 300, description: 'Stabilize drone systems' },
          { phase: 'navigate', duration: 900, description: 'Navigate to safe location' }
        ];
        plan.resourceRequirements.rescuerDrones = 1;
        break;

      case 'assisted_recovery':
        plan.phases = [
          { phase: 'deploy', duration: 600, description: 'Deploy rescue drones' },
          { phase: 'assist', duration: 1200, description: 'Provide assistance' },
          { phase: 'escort', duration: 900, description: 'Escort to safety' }
        ];
        plan.resourceRequirements.rescuerDrones = Math.min(3, availableDrones.length);
        break;
    }

    plan.estimatedDuration = plan.phases.reduce((sum, phase) => sum + phase.duration, 0);

    return plan;
  }

  private async executeRecoveryOperation(
    operation: RecoveryOperation,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<void> {
    const { recoveryPlan } = operation;

    // Select and assign rescuer drones
    const rescuers = this.selectRescuerDrones(
      availableDrones.filter(d => swarm.drones.includes(d.id) && d.status === 'active'),
      operation.recoveryPlan.resourceRequirements.rescuerDrones
    );

    operation.assignedRescuers = rescuers.map(d => d.id);

    // Execute recovery phases
    for (const phase of recoveryPlan.phases) {
      await this.executeRecoveryPhase(operation, phase, rescuers);
    }
  }

  private selectRescuerDrones(
    availableDrones: Drone[],
    requiredCount: number
  ): Drone[] {
    // Select drones with best rescue capabilities
    return availableDrones
      .filter(d => d.battery > 50 && d.signal > 60) // Good condition
      .sort((a, b) => {
        // Prioritize multi-role and transport drones for rescue
        const typeScores = { multi: 3, transport: 2, recon: 1, surveillance: 1, attack: 0 };
        const scoreA = (typeScores[a.type] || 0) + (a.battery / 100) + (a.signal / 100);
        const scoreB = (typeScores[b.type] || 0) + (b.battery / 100) + (b.signal / 100);
        return scoreB - scoreA;
      })
      .slice(0, requiredCount);
  }

  private async executeRecoveryPhase(
    operation: RecoveryOperation,
    phase: RecoveryPhase,
    rescuers: Drone[]
  ): Promise<void> {
    console.log(`Executing recovery phase: ${phase.phase} for operation ${operation.id}`);

    switch (phase.phase) {
      case 'locate':
        await this.executeLocatePhase(operation, rescuers);
        break;
      case 'communicate':
        await this.executeCommunicatePhase(operation, rescuers);
        break;
      case 'guide':
        await this.executeGuidePhase(operation, rescuers);
        break;
      case 'integrate':
        await this.executeIntegratePhase(operation, rescuers);
        break;
      case 'assess':
        await this.executeAssessPhase(operation, rescuers);
        break;
      case 'stabilize':
        await this.executeStabilizePhase(operation, rescuers);
        break;
      case 'navigate':
        await this.executeNavigatePhase(operation, rescuers);
        break;
      case 'deploy':
        await this.executeDeployPhase(operation, rescuers);
        break;
      case 'assist':
        await this.executeAssistPhase(operation, rescuers);
        break;
      case 'escort':
        await this.executeEscortPhase(operation, rescuers);
        break;
    }

    // Wait for phase duration
    await new Promise(resolve => setTimeout(resolve, phase.duration * 1000));
  }

  private async executeLocatePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'search_and_locate',
        {
          recoveryId: operation.id,
          targetDrones: operation.failedDrones,
          searchPattern: 'expanding_spiral',
          maxSearchRadius: 2000
        }
      );
    }
  }

  private async executeCommunicatePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const failedDroneId of operation.failedDrones) {
      for (const rescuer of rescuers) {
        await this.communicationManager.sendFormationCommand(
          rescuer.id,
          'establish_communication',
          {
            recoveryId: operation.id,
            targetDrone: failedDroneId,
            communicationMode: 'emergency_frequency'
          }
        );
      }
    }
  }

  private async executeGuidePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'guide_drones',
        {
          recoveryId: operation.id,
          targetDrones: operation.failedDrones,
          guidanceType: 'formation_return',
          safetyDistance: 50
        }
      );
    }
  }

  private async executeIntegratePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    // Notify swarm of returning drones
    for (const failedDroneId of operation.failedDrones) {
      await this.communicationManager.sendFormationCommand(
        failedDroneId,
        'rejoin_swarm',
        {
          recoveryId: operation.id,
          swarmId: operation.swarmId,
          formationPosition: 'rear_guard' // Safe position initially
        }
      );
    }
    
    operation.status = 'completed';
    operation.endTime = new Date();
  }

  private async executeAssessPhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'assess_condition',
        {
          recoveryId: operation.id,
          targetDrones: operation.failedDrones,
          assessmentType: 'full_diagnostic'
        }
      );
    }
  }

  private async executeStabilizePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'provide_assistance',
        {
          recoveryId: operation.id,
          assistanceType: 'system_stabilization',
          targetDrones: operation.failedDrones
        }
      );
    }
  }

  private async executeNavigatePhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'navigation_assist',
        {
          recoveryId: operation.id,
          targetDrones: operation.failedDrones,
          destination: 'safe_zone',
          navigationMode: 'assisted'
        }
      );
    }
  }

  private async executeDeployPhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'deploy_for_rescue',
        {
          recoveryId: operation.id,
          deploymentType: 'rescue_formation',
          targetArea: 'failed_drone_vicinity'
        }
      );
    }
  }

  private async executeAssistPhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'active_assistance',
        {
          recoveryId: operation.id,
          assistanceType: 'comprehensive_support',
          targetDrones: operation.failedDrones
        }
      );
    }
  }

  private async executeEscortPhase(operation: RecoveryOperation, rescuers: Drone[]): Promise<void> {
    for (const rescuer of rescuers) {
      await this.communicationManager.sendFormationCommand(
        rescuer.id,
        'escort_to_safety',
        {
          recoveryId: operation.id,
          escortFormation: 'protective',
          destination: 'base',
          targetDrones: operation.failedDrones
        }
      );
    }
    
    operation.status = 'completed';
    operation.endTime = new Date();
  }

  /**
   * Get recovery operation status
   */
  getRecoveryStatus(recoveryId: string): RecoveryOperation | null {
    return this.recoveryOperations.get(recoveryId) || null;
  }

  /**
   * Get all active recovery operations
   */
  getActiveRecoveries(): RecoveryOperation[] {
    return Array.from(this.recoveryOperations.values())
      .filter(op => op.status === 'planning' || op.status === 'in_progress');
  }
}

interface RecoveryOperation {
  id: string;
  swarmId: string;
  failedDrones: string[];
  recoveryType: string;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  assignedRescuers: string[];
  recoveryPlan: RecoveryPlan;
}

interface RecoveryPlan {
  phases: RecoveryPhase[];
  estimatedDuration: number;
  resourceRequirements: {
    rescuerDrones: number;
    fuelReserve: number;
    communicationRange: number;
  };
}

interface RecoveryPhase {
  phase: string;
  duration: number;
  description: string;
}

export default {
  EmergencyDetectionSystem,
  EmergencyResponseCoordinator,
  SwarmRecoveryCoordinator
};