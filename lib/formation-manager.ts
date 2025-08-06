/**
 * Dynamic Formation Management System
 * 
 * Manages real-time formation control, adaptation, and optimization for drone swarms.
 * Handles formation transitions, obstacle avoidance, and dynamic reconfiguration
 * based on mission requirements and environmental conditions.
 */

import {
  Swarm,
  SwarmFormation,
  SwarmParameters,
  Vector3D,
  Drone,
  SwarmMessage,
  SwarmFormationTemplate,
  EnvironmentalData
} from './types';

import {
  Vector3,
  FormationControlAlgorithm,
  CollisionAvoidanceAlgorithm,
  EmergentBehaviorAlgorithm,
  SwarmCoordinationEngine
} from './swarm-algorithms';

// ============================================================================
// FORMATION TEMPLATES AND DEFINITIONS
// ============================================================================

export class FormationTemplates {
  private static readonly DEFAULT_SPACING = 25; // meters
  private static readonly DEFAULT_ALTITUDE = 100; // meters
  private static readonly DEFAULT_SPEED = 15; // m/s

  /**
   * Get predefined formation templates
   */
  static getFormationTemplate(formation: SwarmFormation, droneCount: number): SwarmFormationTemplate {
    const baseParameters: SwarmParameters = {
      spacing: this.DEFAULT_SPACING,
      altitude: this.DEFAULT_ALTITUDE,
      speed: this.DEFAULT_SPEED,
      cohesion: 0.7,
      separation: 15, // meters
      alignment: 0.8,
      adaptiveThreshold: 0.3,
      collisionAvoidanceRadius: 20,
      communicationRange: 200
    };

    switch (formation) {
      case 'grid':
        return this.createGridTemplate(droneCount, baseParameters);
      case 'circle':
        return this.createCircleTemplate(droneCount, baseParameters);
      case 'line':
        return this.createLineTemplate(droneCount, baseParameters);
      case 'vee':
        return this.createVeeTemplate(droneCount, baseParameters);
      case 'diamond':
        return this.createDiamondTemplate(droneCount, baseParameters);
      case 'wedge':
        return this.createWedgeTemplate(droneCount, baseParameters);
      case 'echelon':
        return this.createEchelonTemplate(droneCount, baseParameters);
      case 'column':
        return this.createColumnTemplate(droneCount, baseParameters);
      default:
        return this.createGridTemplate(droneCount, baseParameters);
    }
  }

  private static createGridTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    const cols = Math.ceil(Math.sqrt(droneCount));
    const rows = Math.ceil(droneCount / cols);
    
    for (let i = 0; i < droneCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      positions.push({
        x: (col - (cols - 1) / 2) * params.spacing,
        y: (row - (rows - 1) / 2) * params.spacing,
        z: 0
      });
    }

    return {
      formation: 'grid',
      positions,
      minDrones: 2,
      maxDrones: 100,
      parameters: params
    };
  }

  private static createCircleTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    const radius = (params.spacing * droneCount) / (2 * Math.PI);
    
    for (let i = 0; i < droneCount; i++) {
      const angle = (2 * Math.PI * i) / droneCount;
      positions.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: 0
      });
    }

    return {
      formation: 'circle',
      positions,
      minDrones: 3,
      maxDrones: 50,
      parameters: { ...params, spacing: Math.max(params.spacing, 20) }
    };
  }

  private static createLineTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    
    for (let i = 0; i < droneCount; i++) {
      positions.push({
        x: (i - (droneCount - 1) / 2) * params.spacing,
        y: 0,
        z: 0
      });
    }

    return {
      formation: 'line',
      positions,
      minDrones: 2,
      maxDrones: 30,
      parameters: params
    };
  }

  private static createVeeTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    
    // Leader at the front
    positions.push({ x: 0, y: 0, z: 0 });
    
    // Followers in V formation
    for (let i = 1; i < droneCount; i++) {
      const side = (i - 1) % 2 === 0 ? 1 : -1;
      const position = Math.floor((i - 1) / 2) + 1;
      
      positions.push({
        x: -position * params.spacing * 0.5,
        y: side * position * params.spacing * 0.866, // 60-degree angle
        z: 0
      });
    }

    return {
      formation: 'vee',
      positions,
      minDrones: 3,
      maxDrones: 25,
      parameters: params
    };
  }

  private static createDiamondTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    
    if (droneCount >= 1) positions.push({ x: 0, y: 0, z: 0 }); // Center
    if (droneCount >= 2) positions.push({ x: 0, y: params.spacing, z: 0 }); // Front
    if (droneCount >= 3) positions.push({ x: 0, y: -params.spacing, z: 0 }); // Back
    if (droneCount >= 4) positions.push({ x: -params.spacing, y: 0, z: 0 }); // Left
    if (droneCount >= 5) positions.push({ x: params.spacing, y: 0, z: 0 }); // Right
    
    // Additional drones in outer layers
    for (let i = 5; i < droneCount; i++) {
      const angle = (2 * Math.PI * (i - 5)) / Math.max(droneCount - 5, 1);
      const radius = params.spacing * 1.5;
      positions.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: 0
      });
    }

    return {
      formation: 'diamond',
      positions,
      minDrones: 2,
      maxDrones: 20,
      parameters: params
    };
  }

  private static createWedgeTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    const layerSize = Math.ceil(Math.sqrt(droneCount));
    
    for (let i = 0; i < droneCount; i++) {
      const layer = Math.floor(i / layerSize);
      const posInLayer = i % layerSize;
      
      positions.push({
        x: -layer * params.spacing,
        y: (posInLayer - (layerSize - 1) / 2) * params.spacing,
        z: 0
      });
    }

    return {
      formation: 'wedge',
      positions,
      minDrones: 3,
      maxDrones: 40,
      parameters: params
    };
  }

  private static createEchelonTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    
    for (let i = 0; i < droneCount; i++) {
      positions.push({
        x: -i * params.spacing * 0.5,
        y: -i * params.spacing * 0.866, // 60-degree echelon
        z: 0
      });
    }

    return {
      formation: 'echelon',
      positions,
      minDrones: 2,
      maxDrones: 25,
      parameters: params
    };
  }

  private static createColumnTemplate(droneCount: number, params: SwarmParameters): SwarmFormationTemplate {
    const positions: Vector3D[] = [];
    
    for (let i = 0; i < droneCount; i++) {
      positions.push({
        x: 0,
        y: -i * params.spacing,
        z: 0
      });
    }

    return {
      formation: 'column',
      positions,
      minDrones: 2,
      maxDrones: 30,
      parameters: params
    };
  }
}

// ============================================================================
// FORMATION TRANSITION MANAGER
// ============================================================================

export class FormationTransitionManager {
  private static readonly TRANSITION_SPEED = 0.1; // Interpolation speed
  private static readonly STABILITY_THRESHOLD = 5; // meters

  /**
   * Plan formation transition between two formations
   */
  static planFormationTransition(
    currentFormation: SwarmFormationTemplate,
    targetFormation: SwarmFormationTemplate,
    dronePositions: Array<{ droneId: string; position: Vector3D }>
  ): {
    assignments: Array<{ droneId: string; targetPosition: Vector3D; transitionTime: number }>;
    totalTransitionTime: number;
    conflictResolution: Array<{ droneId: string; intermediatePositions: Vector3D[] }>;
  } {
    const assignments: Array<{ droneId: string; targetPosition: Vector3D; transitionTime: number }> = [];
    const conflictResolution: Array<{ droneId: string; intermediatePositions: Vector3D[] }> = [];

    // Find optimal assignment using Hungarian algorithm approximation
    const costMatrix = this.calculateTransitionCostMatrix(dronePositions, targetFormation.positions);
    const assignment = this.solveAssignmentProblem(costMatrix);

    let maxTransitionTime = 0;

    for (let i = 0; i < dronePositions.length && i < targetFormation.positions.length; i++) {
      const dronePos = dronePositions[i];
      const targetIndex = assignment[i];
      const targetPos = targetFormation.positions[targetIndex];

      const distance = Vector3.from(dronePos.position).distance(Vector3.from(targetPos));
      const transitionTime = distance / targetFormation.parameters.speed;

      assignments.push({
        droneId: dronePos.droneId,
        targetPosition: targetPos,
        transitionTime
      });

      maxTransitionTime = Math.max(maxTransitionTime, transitionTime);

      // Check for potential conflicts and plan intermediate positions
      const intermediates = this.planConflictFreeTrajectory(
        dronePos.position,
        targetPos,
        dronePositions,
        targetFormation.positions
      );

      if (intermediates.length > 0) {
        conflictResolution.push({
          droneId: dronePos.droneId,
          intermediatePositions: intermediates
        });
      }
    }

    return {
      assignments,
      totalTransitionTime: maxTransitionTime,
      conflictResolution
    };
  }

  private static calculateTransitionCostMatrix(
    dronePositions: Array<{ droneId: string; position: Vector3D }>,
    targetPositions: Vector3D[]
  ): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < dronePositions.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < targetPositions.length; j++) {
        const distance = Vector3.from(dronePositions[i].position).distance(Vector3.from(targetPositions[j]));
        matrix[i][j] = distance;
      }
    }

    return matrix;
  }

  private static solveAssignmentProblem(costMatrix: number[]): number[] {
    // Simplified assignment - in production would use Hungarian algorithm
    const assignment: number[] = [];
    const used = new Set<number>();

    for (let i = 0; i < costMatrix.length; i++) {
      let minCost = Infinity;
      let bestIndex = 0;

      for (let j = 0; j < costMatrix[i].length; j++) {
        if (!used.has(j) && costMatrix[i][j] < minCost) {
          minCost = costMatrix[i][j];
          bestIndex = j;
        }
      }

      assignment[i] = bestIndex;
      used.add(bestIndex);
    }

    return assignment;
  }

  private static planConflictFreeTrajectory(
    start: Vector3D,
    target: Vector3D,
    allDronePositions: Array<{ droneId: string; position: Vector3D }>,
    allTargetPositions: Vector3D[]
  ): Vector3D[] {
    const intermediates: Vector3D[] = [];
    const startV = Vector3.from(start);
    const targetV = Vector3.from(target);
    
    // Simple conflict detection - check if path intersects with other trajectories
    const directPath = targetV.subtract(startV);
    const pathLength = directPath.magnitude();
    
    if (pathLength < this.STABILITY_THRESHOLD) {
      return intermediates; // No intermediate points needed
    }

    // Check for potential intersections and add waypoints if needed
    const numCheckpoints = Math.ceil(pathLength / 50); // Checkpoint every 50 meters
    
    for (let i = 1; i < numCheckpoints; i++) {
      const progress = i / numCheckpoints;
      const checkpoint = startV.add(directPath.multiply(progress));
      
      // Check if this checkpoint is too close to other drones' paths
      let needsAdjustment = false;
      
      for (const otherDrone of allDronePositions) {
        if (otherDrone.position === start) continue; // Skip self
        
        const otherPos = Vector3.from(otherDrone.position);
        if (checkpoint.distance(otherPos) < 15) { // 15-meter safety margin
          needsAdjustment = true;
          break;
        }
      }
      
      if (needsAdjustment) {
        // Adjust checkpoint to avoid conflict
        const avoidanceOffset = new Vector3(10, 10, 0); // Simple avoidance
        intermediates.push(checkpoint.add(avoidanceOffset).toVector3D());
      }
    }

    return intermediates;
  }

  /**
   * Generate transition commands for swarm
   */
  static generateTransitionCommands(
    swarmId: string,
    transition: {
      assignments: Array<{ droneId: string; targetPosition: Vector3D; transitionTime: number }>;
      totalTransitionTime: number;
      conflictResolution: Array<{ droneId: string; intermediatePositions: Vector3D[] }>;
    }
  ): SwarmMessage[] {
    const commands: SwarmMessage[] = [];

    for (const assignment of transition.assignments) {
      const conflictResolution = transition.conflictResolution.find(
        cr => cr.droneId === assignment.droneId
      );

      commands.push({
        id: `formation_command_${Date.now()}_${assignment.droneId}`,
        senderId: swarmId,
        receiverId: assignment.droneId,
        type: 'formation_command',
        payload: {
          command: 'transition_to_position',
          targetPosition: assignment.targetPosition,
          transitionTime: assignment.transitionTime,
          intermediatePositions: conflictResolution?.intermediatePositions || [],
          priority: 'normal',
          acknowledgmentRequired: true
        },
        timestamp: new Date().toISOString(),
        priority: 'high',
        encrypted: true,
        ackRequired: true,
        ttl: Math.ceil(transition.totalTransitionTime) + 30
      });
    }

    return commands;
  }
}

// ============================================================================
// ADAPTIVE FORMATION CONTROLLER
// ============================================================================

export class AdaptiveFormationController {
  /**
   * Adapt formation based on environmental conditions
   */
  static adaptFormationToEnvironment(
    currentTemplate: SwarmFormationTemplate,
    environmentalData: EnvironmentalData,
    obstacles: Array<{ position: Vector3D; radius: number }>
  ): SwarmFormationTemplate {
    const adaptedTemplate = JSON.parse(JSON.stringify(currentTemplate)); // Deep copy
    
    // Adapt to wind conditions
    if (environmentalData.wind.speed > 20) { // Strong wind
      // Increase separation for stability
      adaptedTemplate.parameters.separation *= 1.5;
      adaptedTemplate.parameters.spacing *= 1.2;
      
      // Adjust formation based on wind direction
      const windDirection = this.parseWindDirection(environmentalData.wind.direction);
      adaptedTemplate.positions = this.rotateFormation(
        adaptedTemplate.positions,
        windDirection
      );
    }
    
    // Adapt to visibility conditions
    if (environmentalData.visibility < 1) { // Poor visibility
      // Reduce spacing for better coordination
      adaptedTemplate.parameters.spacing *= 0.8;
      adaptedTemplate.parameters.communicationRange *= 1.2;
    }
    
    // Adapt to obstacles
    if (obstacles.length > 0) {
      adaptedTemplate.positions = this.avoidObstacles(
        adaptedTemplate.positions,
        obstacles
      );
    }
    
    return adaptedTemplate;
  }

  private static parseWindDirection(direction: string): number {
    const directionMap: Record<string, number> = {
      'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
      'S': 180, 'SW': 225, 'W': 270, 'NW': 315
    };
    return directionMap[direction] || 0;
  }

  private static rotateFormation(positions: Vector3D[], angleDegrees: number): Vector3D[] {
    const angleRad = angleDegrees * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    return positions.map(pos => ({
      x: pos.x * cos - pos.y * sin,
      y: pos.x * sin + pos.y * cos,
      z: pos.z
    }));
  }

  private static avoidObstacles(
    positions: Vector3D[],
    obstacles: Array<{ position: Vector3D; radius: number }>
  ): Vector3D[] {
    return positions.map(pos => {
      let adjustedPos = { ...pos };
      
      for (const obstacle of obstacles) {
        const distance = Vector3.from(pos).distance(Vector3.from(obstacle.position));
        const safeDistance = obstacle.radius + 20; // 20m safety margin
        
        if (distance < safeDistance) {
          // Move position away from obstacle
          const direction = Vector3.from(pos).subtract(Vector3.from(obstacle.position)).normalize();
          const adjustment = direction.multiply(safeDistance - distance + 10);
          adjustedPos = Vector3.from(pos).add(adjustment).toVector3D();
        }
      }
      
      return adjustedPos;
    });
  }

  /**
   * Optimize formation for specific mission type
   */
  static optimizeFormationForMission(
    baseTemplate: SwarmFormationTemplate,
    missionType: string,
    threatLevel: number
  ): SwarmFormationTemplate {
    const optimizedTemplate = JSON.parse(JSON.stringify(baseTemplate));
    
    switch (missionType) {
      case 'surveillance':
        // Spread out for better coverage
        optimizedTemplate.parameters.spacing *= 1.5;
        if (baseTemplate.formation === 'grid') {
          // Keep grid for systematic coverage
        } else {
          // Switch to line formation for sweep patterns
          const lineTemplate = FormationTemplates.getFormationTemplate('line', baseTemplate.positions.length);
          return this.mergeTemplates(optimizedTemplate, lineTemplate);
        }
        break;
        
      case 'reconnaissance':
        // Use echelon formation for progressive reconnaissance
        if (baseTemplate.formation !== 'echelon') {
          const echelonTemplate = FormationTemplates.getFormationTemplate('echelon', baseTemplate.positions.length);
          return this.mergeTemplates(optimizedTemplate, echelonTemplate);
        }
        break;
        
      case 'escort':
        // Use diamond or wedge formation for protection
        if (!['diamond', 'wedge', 'vee'].includes(baseTemplate.formation)) {
          const protectiveTemplate = FormationTemplates.getFormationTemplate('diamond', baseTemplate.positions.length);
          return this.mergeTemplates(optimizedTemplate, protectiveTemplate);
        }
        break;
        
      case 'patrol':
        // Use line or column for systematic patrol
        if (!['line', 'column'].includes(baseTemplate.formation)) {
          const patrolTemplate = FormationTemplates.getFormationTemplate('line', baseTemplate.positions.length);
          return this.mergeTemplates(optimizedTemplate, patrolTemplate);
        }
        break;
    }
    
    // Adjust parameters based on threat level
    if (threatLevel > 2) {
      // High threat - tighter formation, better coordination
      optimizedTemplate.parameters.spacing *= 0.8;
      optimizedTemplate.parameters.cohesion = Math.min(optimizedTemplate.parameters.cohesion * 1.2, 1.0);
      optimizedTemplate.parameters.communicationRange *= 1.1;
    }
    
    return optimizedTemplate;
  }

  private static mergeTemplates(
    base: SwarmFormationTemplate,
    overlay: SwarmFormationTemplate
  ): SwarmFormationTemplate {
    return {
      ...base,
      formation: overlay.formation,
      positions: overlay.positions,
      parameters: {
        ...base.parameters,
        spacing: overlay.parameters.spacing,
        // Keep other parameters from base
      }
    };
  }
}

// ============================================================================
// MAIN FORMATION MANAGER
// ============================================================================

export class FormationManager {
  private currentFormation: SwarmFormationTemplate | null = null;
  private transitionInProgress = false;
  private lastUpdate = Date.now();

  /**
   * Initialize formation for swarm
   */
  initializeFormation(
    swarm: Swarm,
    drones: Drone[],
    centerPosition: Vector3D
  ): SwarmFormationTemplate {
    const template = FormationTemplates.getFormationTemplate(
      swarm.formation,
      swarm.drones.length
    );
    
    // Adjust positions relative to center
    template.positions = template.positions.map(pos => ({
      x: pos.x + centerPosition.x,
      y: pos.y + centerPosition.y,
      z: pos.z + centerPosition.z
    }));
    
    this.currentFormation = template;
    return template;
  }

  /**
   * Update formation dynamically
   */
  updateFormation(
    swarm: Swarm,
    drones: Drone[],
    environmentalData: EnvironmentalData | null,
    obstacles: Array<{ position: Vector3D; radius: number }> = []
  ): {
    updatedTemplate: SwarmFormationTemplate;
    transitionCommands: SwarmMessage[];
    stabilityScore: number;
  } {
    if (!this.currentFormation) {
      throw new Error('Formation not initialized');
    }

    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id));
    
    // Check if formation needs adaptation
    let needsAdaptation = false;
    let adaptedTemplate = this.currentFormation;
    
    // Environmental adaptation
    if (environmentalData) {
      const environmentAdapted = AdaptiveFormationController.adaptFormationToEnvironment(
        this.currentFormation,
        environmentalData,
        obstacles
      );
      
      if (this.formationsDiffer(this.currentFormation, environmentAdapted)) {
        adaptedTemplate = environmentAdapted;
        needsAdaptation = true;
      }
    }
    
    // Mission-based optimization
    if (swarm.missionId) {
      // In a real implementation, this would fetch mission details
      const missionOptimized = AdaptiveFormationController.optimizeFormationForMission(
        adaptedTemplate,
        'surveillance', // Default mission type
        2 // Default threat level
      );
      
      if (this.formationsDiffer(adaptedTemplate, missionOptimized)) {
        adaptedTemplate = missionOptimized;
        needsAdaptation = true;
      }
    }
    
    // Calculate stability score
    const stabilityScore = this.calculateFormationStability(swarmDrones, adaptedTemplate);
    
    let transitionCommands: SwarmMessage[] = [];
    
    // Generate transition commands if adaptation is needed
    if (needsAdaptation && !this.transitionInProgress) {
      const dronePositions = swarmDrones
        .filter(d => d.location)
        .map(d => ({
          droneId: d.id,
          position: {
            x: d.location![0],
            y: d.location![1],
            z: d.altitude || 100
          } as Vector3D
        }));
      
      const transition = FormationTransitionManager.planFormationTransition(
        this.currentFormation,
        adaptedTemplate,
        dronePositions
      );
      
      transitionCommands = FormationTransitionManager.generateTransitionCommands(
        swarm.id,
        transition
      );
      
      this.transitionInProgress = true;
      this.currentFormation = adaptedTemplate;
      
      // Reset transition flag after transition time
      setTimeout(() => {
        this.transitionInProgress = false;
      }, transition.totalTransitionTime * 1000 + 5000); // Add 5s buffer
    }
    
    return {
      updatedTemplate: adaptedTemplate,
      transitionCommands,
      stabilityScore
    };
  }

  private formationsDiffer(
    formation1: SwarmFormationTemplate,
    formation2: SwarmFormationTemplate
  ): boolean {
    if (formation1.formation !== formation2.formation) return true;
    
    // Check if positions differ significantly
    for (let i = 0; i < Math.min(formation1.positions.length, formation2.positions.length); i++) {
      const pos1 = Vector3.from(formation1.positions[i]);
      const pos2 = Vector3.from(formation2.positions[i]);
      
      if (pos1.distance(pos2) > 5) { // 5-meter threshold
        return true;
      }
    }
    
    return false;
  }

  private calculateFormationStability(
    drones: Drone[],
    template: SwarmFormationTemplate
  ): number {
    if (drones.length === 0) return 0;
    
    let totalError = 0;
    let count = 0;
    
    for (let i = 0; i < drones.length && i < template.positions.length; i++) {
      const drone = drones[i];
      if (!drone.location) continue;
      
      const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
      const desiredPos = Vector3.from(template.positions[i]);
      
      totalError += dronePos.distance(desiredPos);
      count++;
    }
    
    if (count === 0) return 0;
    
    const averageError = totalError / count;
    const maxAcceptableError = template.parameters.spacing * 0.3; // 30% of spacing
    
    return Math.max(0, 1 - (averageError / maxAcceptableError));
  }

  /**
   * Get current formation status
   */
  getFormationStatus(): {
    currentFormation: SwarmFormationTemplate | null;
    transitionInProgress: boolean;
    lastUpdate: number;
  } {
    return {
      currentFormation: this.currentFormation,
      transitionInProgress: this.transitionInProgress,
      lastUpdate: this.lastUpdate
    };
  }
}

export default {
  FormationTemplates,
  FormationTransitionManager,
  AdaptiveFormationController,
  FormationManager
};