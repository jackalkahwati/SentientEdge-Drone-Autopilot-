/**
 * Advanced Swarm Intelligence Algorithms
 * 
 * This module implements sophisticated bio-inspired swarm coordination algorithms
 * including flocking, consensus protocols, distributed decision making, and
 * emergent behavior patterns for autonomous drone swarms.
 * 
 * Based on proven algorithms from nature including:
 * - Boids flocking (Reynolds, 1987)
 * - Ant Colony Optimization
 * - Particle Swarm Optimization
 * - Byzantine Fault Tolerance
 * - Distributed Consensus (Raft, PBFT)
 */

import { 
  Vector3D, 
  Drone, 
  Swarm, 
  SwarmParameters, 
  SwarmCoordinationState,
  SwarmMessage,
  SwarmMessageType 
} from './types';

// ============================================================================
// MATHEMATICAL UTILITIES
// ============================================================================

export class Vector3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}

  static from(v: Vector3D): Vector3 {
    return new Vector3(v.x, v.y, v.z);
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number): Vector3 {
    if (scalar === 0) return new Vector3(0, 0, 0);
    return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return this.divide(mag);
  }

  distance(v: Vector3): number {
    return this.subtract(v).magnitude();
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  toVector3D(): Vector3D {
    return { x: this.x, y: this.y, z: this.z };
  }
}

// ============================================================================
// FLOCKING ALGORITHMS (Bio-inspired from bird flocks)
// ============================================================================

export class FlockingAlgorithm {
  /**
   * Calculate cohesion force - tendency to move toward center of local flockmates
   */
  static calculateCohesion(
    drone: Drone, 
    neighbors: Drone[], 
    maxDistance: number,
    weight: number = 1.0
  ): Vector3 {
    if (neighbors.length === 0) return new Vector3(0, 0, 0);

    // Calculate center of mass of nearby drones
    let centerOfMass = new Vector3(0, 0, 0);
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor.id === drone.id || !neighbor.location) continue;
      
      const neighborPos = new Vector3(neighbor.location[0], neighbor.location[1], neighbor.altitude || 100);
      const dronePos = new Vector3(drone.location?.[0] || 0, drone.location?.[1] || 0, drone.altitude || 100);
      
      if (dronePos.distance(neighborPos) <= maxDistance) {
        centerOfMass = centerOfMass.add(neighborPos);
        count++;
      }
    }

    if (count === 0) return new Vector3(0, 0, 0);

    centerOfMass = centerOfMass.divide(count);
    const dronePos = new Vector3(drone.location?.[0] || 0, drone.location?.[1] || 0, drone.altitude || 100);
    
    return centerOfMass.subtract(dronePos).normalize().multiply(weight);
  }

  /**
   * Calculate separation force - avoid crowding local flockmates
   */
  static calculateSeparation(
    drone: Drone,
    neighbors: Drone[],
    minDistance: number,
    weight: number = 1.0
  ): Vector3 {
    const dronePos = new Vector3(drone.location?.[0] || 0, drone.location?.[1] || 0, drone.altitude || 100);
    let separationForce = new Vector3(0, 0, 0);
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor.id === drone.id || !neighbor.location) continue;
      
      const neighborPos = new Vector3(neighbor.location[0], neighbor.location[1], neighbor.altitude || 100);
      const distance = dronePos.distance(neighborPos);
      
      if (distance < minDistance && distance > 0) {
        // Calculate repulsion force inversely proportional to distance
        const repulsion = dronePos.subtract(neighborPos).normalize().divide(distance);
        separationForce = separationForce.add(repulsion);
        count++;
      }
    }

    if (count === 0) return new Vector3(0, 0, 0);
    
    return separationForce.divide(count).normalize().multiply(weight);
  }

  /**
   * Calculate alignment force - steer towards average heading of neighbors
   */
  static calculateAlignment(
    drone: Drone,
    neighbors: Drone[],
    maxDistance: number,
    weight: number = 1.0
  ): Vector3 {
    const dronePos = new Vector3(drone.location?.[0] || 0, drone.location?.[1] || 0, drone.altitude || 100);
    let averageVelocity = new Vector3(0, 0, 0);
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor.id === drone.id || !neighbor.location) continue;
      
      const neighborPos = new Vector3(neighbor.location[0], neighbor.location[1], neighbor.altitude || 100);
      
      if (dronePos.distance(neighborPos) <= maxDistance) {
        // Convert heading and speed to velocity vector
        const heading = (neighbor.heading || 0) * Math.PI / 180; // Convert to radians
        const speed = neighbor.speed || 0;
        const velocity = new Vector3(
          Math.cos(heading) * speed,
          Math.sin(heading) * speed,
          0 // Assume level flight for alignment
        );
        
        averageVelocity = averageVelocity.add(velocity);
        count++;
      }
    }

    if (count === 0) return new Vector3(0, 0, 0);
    
    averageVelocity = averageVelocity.divide(count);
    const droneHeading = (drone.heading || 0) * Math.PI / 180;
    const droneSpeed = drone.speed || 0;
    const droneVelocity = new Vector3(
      Math.cos(droneHeading) * droneSpeed,
      Math.sin(droneHeading) * droneSpeed,
      0
    );
    
    return averageVelocity.subtract(droneVelocity).normalize().multiply(weight);
  }

  /**
   * Calculate combined flocking force
   */
  static calculateFlockingForce(
    drone: Drone,
    neighbors: Drone[],
    parameters: SwarmParameters
  ): Vector3 {
    const cohesion = this.calculateCohesion(
      drone, 
      neighbors, 
      parameters.communicationRange, 
      parameters.cohesion
    );
    
    const separation = this.calculateSeparation(
      drone, 
      neighbors, 
      parameters.separation, 
      2.0 // Higher weight for safety
    );
    
    const alignment = this.calculateAlignment(
      drone, 
      neighbors, 
      parameters.communicationRange, 
      parameters.alignment
    );

    return cohesion.add(separation).add(alignment);
  }
}

// ============================================================================
// CONSENSUS ALGORITHMS (Byzantine Fault Tolerant)
// ============================================================================

export class ConsensusAlgorithm {
  private static readonly CONSENSUS_TIMEOUT = 30000; // 30 seconds
  private static readonly MIN_QUORUM_RATIO = 0.51; // 51% for majority

  /**
   * Initiate leader election using Raft-inspired algorithm
   */
  static initiateLeaderElection(
    swarm: Swarm,
    initiatingDroneId: string,
    drones: Drone[]
  ): SwarmMessage {
    const currentTerm = Date.now(); // Use timestamp as term for simplicity
    
    return {
      id: `election_${currentTerm}_${initiatingDroneId}`,
      senderId: initiatingDroneId,
      type: 'leader_election',
      payload: {
        term: currentTerm,
        candidateId: initiatingDroneId,
        candidateScore: this.calculateLeadershipScore(
          drones.find(d => d.id === initiatingDroneId)!
        )
      },
      timestamp: new Date().toISOString(),
      priority: 'high',
      encrypted: true,
      ackRequired: true,
      ttl: 30
    };
  }

  /**
   * Calculate leadership score based on drone capabilities
   */
  static calculateLeadershipScore(drone: Drone): number {
    let score = 0;
    
    // Battery level (40% weight)
    score += (drone.battery / 100) * 0.4;
    
    // Signal strength (20% weight)
    score += (drone.signal / 100) * 0.2;
    
    // Experience (mission count) (20% weight)
    score += Math.min(drone.missionCount / 100, 1) * 0.2;
    
    // Drone type capabilities (20% weight)
    const typeScores = {
      'multi': 1.0,      // Highest capability
      'recon': 0.8,      // Good for leadership
      'surveillance': 0.7,
      'transport': 0.5,
      'attack': 0.6      // Specialized role
    };
    score += (typeScores[drone.type] || 0.5) * 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Process leader election vote
   */
  static processLeaderElectionVote(
    message: SwarmMessage,
    votingDrone: Drone,
    swarm: Swarm
  ): SwarmMessage | null {
    const { term, candidateId, candidateScore } = message.payload;
    
    // Check if this drone can vote (not the candidate)
    if (votingDrone.id === candidateId) return null;
    
    // Calculate own leadership score for comparison
    const ownScore = this.calculateLeadershipScore(votingDrone);
    
    // Vote for candidate if they have higher score or if scores are equal and candidate has lower ID (deterministic)
    const vote = candidateScore > ownScore || 
                 (candidateScore === ownScore && candidateId < votingDrone.id);
    
    return {
      id: `vote_${term}_${votingDrone.id}`,
      senderId: votingDrone.id,
      receiverId: candidateId,
      type: 'consensus_vote',
      payload: {
        term,
        candidateId,
        vote,
        voterScore: ownScore
      },
      timestamp: new Date().toISOString(),
      priority: 'high',
      encrypted: true,
      ackRequired: false,
      ttl: 25
    };
  }

  /**
   * Determine election winner based on votes
   */
  static determineElectionWinner(
    votes: SwarmMessage[],
    swarm: Swarm,
    allDrones: Drone[]
  ): string | null {
    const activeDrones = allDrones.filter(d => 
      swarm.drones.includes(d.id) && d.status === 'active'
    );
    
    const requiredQuorum = Math.ceil(activeDrones.length * this.MIN_QUORUM_RATIO);
    
    // Count votes by candidate
    const voteCount = votes.reduce((acc, vote) => {
      if (vote.payload.vote) {
        acc[vote.payload.candidateId] = (acc[vote.payload.candidateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    // Find candidate with most votes meeting quorum
    let winner: string | null = null;
    let maxVotes = 0;
    
    for (const [candidateId, votes] of Object.entries(voteCount)) {
      if (votes >= requiredQuorum && votes > maxVotes) {
        winner = candidateId;
        maxVotes = votes;
      }
    }
    
    return winner;
  }

  /**
   * Initiate distributed consensus for swarm decision
   */
  static initiateConsensusVote(
    swarm: Swarm,
    proposalId: string,
    proposal: any,
    initiatingDroneId: string
  ): SwarmMessage {
    return {
      id: `consensus_${proposalId}_${Date.now()}`,
      senderId: initiatingDroneId,
      type: 'consensus_vote',
      payload: {
        proposalId,
        proposal,
        phase: 'prepare',
        term: Date.now()
      },
      timestamp: new Date().toISOString(),
      priority: 'normal',
      encrypted: true,
      ackRequired: true,
      ttl: 60
    };
  }
}

// ============================================================================
// COLLISION AVOIDANCE ALGORITHMS
// ============================================================================

export class CollisionAvoidanceAlgorithm {
  private static readonly COLLISION_PREDICTION_TIME = 10; // seconds
  private static readonly SAFETY_MARGIN = 1.5; // safety factor

  /**
   * Predict potential collisions using velocity vectors
   */
  static predictCollisions(
    drone: Drone,
    neighbors: Drone[],
    predictionTime: number = this.COLLISION_PREDICTION_TIME
  ): Array<{ droneId: string; timeToCollision: number; severity: number }> {
    const collisions: Array<{ droneId: string; timeToCollision: number; severity: number }> = [];
    
    if (!drone.location) return collisions;
    
    const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
    const droneHeading = (drone.heading || 0) * Math.PI / 180;
    const droneVel = new Vector3(
      Math.cos(droneHeading) * (drone.speed || 0),
      Math.sin(droneHeading) * (drone.speed || 0),
      0
    );
    
    for (const neighbor of neighbors) {
      if (neighbor.id === drone.id || !neighbor.location) continue;
      
      const neighborPos = new Vector3(neighbor.location[0], neighbor.location[1], neighbor.altitude || 100);
      const neighborHeading = (neighbor.heading || 0) * Math.PI / 180;
      const neighborVel = new Vector3(
        Math.cos(neighborHeading) * (neighbor.speed || 0),
        Math.sin(neighborHeading) * (neighbor.speed || 0),
        0
      );
      
      // Calculate relative position and velocity
      const relativePos = neighborPos.subtract(dronePos);
      const relativeVel = neighborVel.subtract(droneVel);
      
      // Calculate time to closest approach
      const relativeSpeed = relativeVel.magnitude();
      if (relativeSpeed === 0) continue; // No relative motion
      
      const timeToClosest = -relativePos.dot(relativeVel) / (relativeSpeed * relativeSpeed);
      
      if (timeToClosest < 0 || timeToClosest > predictionTime) continue; // Moving away or too far in future
      
      // Calculate closest distance
      const closestPos = relativePos.add(relativeVel.multiply(timeToClosest));
      const closestDistance = closestPos.magnitude();
      
      // Determine if collision risk exists
      const minSafeDistance = 10; // 10 meters minimum
      if (closestDistance < minSafeDistance * this.SAFETY_MARGIN) {
        const severity = 1 - (closestDistance / (minSafeDistance * this.SAFETY_MARGIN));
        collisions.push({
          droneId: neighbor.id,
          timeToCollision: timeToClosest,
          severity
        });
      }
    }
    
    return collisions.sort((a, b) => a.timeToCollision - b.timeToCollision);
  }

  /**
   * Calculate avoidance force using velocity obstacles method
   */
  static calculateAvoidanceForce(
    drone: Drone,
    collisions: Array<{ droneId: string; timeToCollision: number; severity: number }>,
    neighbors: Drone[]
  ): Vector3 {
    if (collisions.length === 0) return new Vector3(0, 0, 0);
    
    if (!drone.location) return new Vector3(0, 0, 0);
    
    const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
    let totalAvoidance = new Vector3(0, 0, 0);
    
    for (const collision of collisions) {
      const neighbor = neighbors.find(n => n.id === collision.droneId);
      if (!neighbor || !neighbor.location) continue;
      
      const neighborPos = new Vector3(neighbor.location[0], neighbor.location[1], neighbor.altitude || 100);
      const toNeighbor = neighborPos.subtract(dronePos);
      
      // Calculate avoidance direction (perpendicular to collision course)
      const avoidanceDir = new Vector3(-toNeighbor.y, toNeighbor.x, 0).normalize();
      
      // Scale by severity and inverse time to collision
      const urgency = collision.severity / Math.max(collision.timeToCollision, 0.1);
      const avoidanceForce = avoidanceDir.multiply(urgency * 100); // Scale factor
      
      totalAvoidance = totalAvoidance.add(avoidanceForce);
    }
    
    return totalAvoidance.normalize().multiply(Math.min(totalAvoidance.magnitude(), 50)); // Cap max force
  }

  /**
   * Generate collision warning message
   */
  static generateCollisionWarning(
    senderId: string,
    collision: { droneId: string; timeToCollision: number; severity: number }
  ): SwarmMessage {
    return {
      id: `collision_warning_${Date.now()}_${senderId}`,
      senderId,
      receiverId: collision.droneId,
      type: 'collision_warning',
      payload: {
        timeToCollision: collision.timeToCollision,
        severity: collision.severity,
        recommendedAction: collision.severity > 0.7 ? 'immediate_evasion' : 'gradual_adjustment'
      },
      timestamp: new Date().toISOString(),
      priority: collision.severity > 0.7 ? 'critical' : 'high',
      encrypted: false, // Speed is critical for collision avoidance
      ackRequired: false,
      ttl: Math.max(collision.timeToCollision * 2, 5)
    };
  }
}

// ============================================================================
// FORMATION CONTROL ALGORITHMS
// ============================================================================

export class FormationControlAlgorithm {
  /**
   * Calculate desired position for drone in formation
   */
  static calculateFormationPosition(
    droneIndex: number,
    totalDrones: number,
    formation: string,
    spacing: number,
    centerPosition: Vector3
  ): Vector3 {
    switch (formation) {
      case 'grid':
        return this.calculateGridPosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'circle':
        return this.calculateCirclePosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'line':
        return this.calculateLinePosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'vee':
        return this.calculateVeePosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'diamond':
        return this.calculateDiamondPosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'wedge':
        return this.calculateWedgePosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'echelon':
        return this.calculateEchelonPosition(droneIndex, totalDrones, spacing, centerPosition);
      case 'column':
        return this.calculateColumnPosition(droneIndex, totalDrones, spacing, centerPosition);
      default:
        return centerPosition;
    }
  }

  private static calculateGridPosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const x = center.x + (col - (cols - 1) / 2) * spacing;
    const y = center.y + (row - (rows - 1) / 2) * spacing;
    
    return new Vector3(x, y, center.z);
  }

  private static calculateCirclePosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const radius = (spacing * total) / (2 * Math.PI);
    const angle = (2 * Math.PI * index) / total;
    
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    
    return new Vector3(x, y, center.z);
  }

  private static calculateLinePosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const x = center.x + (index - (total - 1) / 2) * spacing;
    return new Vector3(x, center.y, center.z);
  }

  private static calculateVeePosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    if (index === 0) return center; // Leader at the point
    
    const side = (index - 1) % 2 === 0 ? 1 : -1; // Alternate sides
    const position = Math.floor((index - 1) / 2) + 1;
    
    const x = center.x - position * spacing * 0.5; // Behind leader
    const y = center.y + side * position * spacing * 0.866; // 60-degree angle
    
    return new Vector3(x, y, center.z);
  }

  private static calculateDiamondPosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    if (total < 5) return this.calculateGridPosition(index, total, spacing, center);
    
    // Diamond formation: center, front, back, left, right, then fill in layers
    const positions = [
      { x: 0, y: 0 },        // Center
      { x: 0, y: spacing },   // Front
      { x: 0, y: -spacing },  // Back
      { x: -spacing, y: 0 },  // Left
      { x: spacing, y: 0 }    // Right
    ];
    
    if (index < positions.length) {
      const pos = positions[index];
      return new Vector3(center.x + pos.x, center.y + pos.y, center.z);
    }
    
    // Additional drones in outer layers
    return this.calculateCirclePosition(index - 5, total - 5, spacing * 1.5, center);
  }

  private static calculateWedgePosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const layerSize = Math.floor(Math.sqrt(total));
    const layer = Math.floor(index / layerSize);
    const posInLayer = index % layerSize;
    
    const x = center.x - layer * spacing;
    const y = center.y + (posInLayer - (layerSize - 1) / 2) * spacing;
    
    return new Vector3(x, y, center.z);
  }

  private static calculateEchelonPosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const x = center.x - index * spacing * 0.5;
    const y = center.y - index * spacing * 0.866; // 60-degree echelon
    
    return new Vector3(x, y, center.z);
  }

  private static calculateColumnPosition(index: number, total: number, spacing: number, center: Vector3): Vector3 {
    const y = center.y - index * spacing;
    return new Vector3(center.x, y, center.z);
  }

  /**
   * Calculate formation keeping force
   */
  static calculateFormationForce(
    drone: Drone,
    desiredPosition: Vector3,
    weight: number = 1.0
  ): Vector3 {
    if (!drone.location) return new Vector3(0, 0, 0);
    
    const currentPos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
    const error = desiredPosition.subtract(currentPos);
    
    // Proportional control with maximum force limit
    const maxForce = 20; // Maximum formation force
    const force = error.multiply(weight);
    
    return force.magnitude() > maxForce ? force.normalize().multiply(maxForce) : force;
  }
}

// ============================================================================
// EMERGENT BEHAVIOR ALGORITHMS
// ============================================================================

export class EmergentBehaviorAlgorithm {
  /**
   * Calculate emergent swarm center of mass
   */
  static calculateCenterOfMass(drones: Drone[]): Vector3 {
    let centerOfMass = new Vector3(0, 0, 0);
    let count = 0;
    
    for (const drone of drones) {
      if (drone.location && drone.status === 'active') {
        centerOfMass = centerOfMass.add(
          new Vector3(drone.location[0], drone.location[1], drone.altitude || 100)
        );
        count++;
      }
    }
    
    return count > 0 ? centerOfMass.divide(count) : new Vector3(0, 0, 0);
  }

  /**
   * Calculate swarm's average velocity
   */
  static calculateAverageVelocity(drones: Drone[]): Vector3 {
    let averageVel = new Vector3(0, 0, 0);
    let count = 0;
    
    for (const drone of drones) {
      if (drone.status === 'active' && drone.heading !== undefined && drone.speed !== undefined) {
        const heading = drone.heading * Math.PI / 180;
        const velocity = new Vector3(
          Math.cos(heading) * drone.speed,
          Math.sin(heading) * drone.speed,
          0
        );
        averageVel = averageVel.add(velocity);
        count++;
      }
    }
    
    return count > 0 ? averageVel.divide(count) : new Vector3(0, 0, 0);
  }

  /**
   * Detect emergent swarm patterns
   */
  static detectEmergentPatterns(drones: Drone[]): {
    isFlocking: boolean;
    isConverging: boolean;
    isDiverging: boolean;
    entropy: number;
  } {
    if (drones.length < 3) {
      return { isFlocking: false, isConverging: false, isDiverging: false, entropy: 0 };
    }
    
    const activeDrones = drones.filter(d => d.status === 'active' && d.location);
    if (activeDrones.length < 3) {
      return { isFlocking: false, isConverging: false, isDiverging: false, entropy: 0 };
    }
    
    const centerOfMass = this.calculateCenterOfMass(activeDrones);
    const averageVel = this.calculateAverageVelocity(activeDrones);
    
    // Calculate alignment metric
    let alignmentSum = 0;
    let cohesionSum = 0;
    let velocityVariance = 0;
    
    for (const drone of activeDrones) {
      if (!drone.location || drone.heading === undefined || drone.speed === undefined) continue;
      
      const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
      const heading = drone.heading * Math.PI / 180;
      const droneVel = new Vector3(
        Math.cos(heading) * drone.speed,
        Math.sin(heading) * drone.speed,
        0
      );
      
      // Alignment: how aligned is this drone with average velocity
      if (averageVel.magnitude() > 0 && droneVel.magnitude() > 0) {
        alignmentSum += droneVel.normalize().dot(averageVel.normalize());
      }
      
      // Cohesion: distance from center of mass
      cohesionSum += dronePos.distance(centerOfMass);
      
      // Velocity variance
      const velDiff = droneVel.subtract(averageVel);
      velocityVariance += velDiff.magnitude();
    }
    
    const alignment = alignmentSum / activeDrones.length;
    const averageCohesion = cohesionSum / activeDrones.length;
    const velVariance = velocityVariance / activeDrones.length;
    
    // Detect patterns
    const isFlocking = alignment > 0.7 && averageCohesion < 100 && velVariance < 20;
    
    // Calculate convergence/divergence by comparing current and previous positions
    // This would require historical data in a real implementation
    const isConverging = averageCohesion < 50; // Simplified
    const isDiverging = averageCohesion > 200; // Simplified
    
    // Calculate entropy (measure of disorder)
    const entropy = Math.min(velVariance / 50 + (1 - alignment), 1);
    
    return { isFlocking, isConverging, isDiverging, entropy };
  }
}

// ============================================================================
// MAIN SWARM COORDINATION ENGINE
// ============================================================================

export class SwarmCoordinationEngine {
  /**
   * Calculate comprehensive swarm control forces
   */
  static calculateSwarmForces(
    drone: Drone,
    neighbors: Drone[],
    swarm: Swarm,
    desiredPosition?: Vector3
  ): {
    flockingForce: Vector3;
    formationForce: Vector3;
    avoidanceForce: Vector3;
    combinedForce: Vector3;
  } {
    // Calculate flocking forces
    const flockingForce = FlockingAlgorithm.calculateFlockingForce(
      drone, 
      neighbors, 
      swarm.parameters
    );
    
    // Calculate formation keeping force
    let formationForce = new Vector3(0, 0, 0);
    if (desiredPosition) {
      formationForce = FormationControlAlgorithm.calculateFormationForce(
        drone, 
        desiredPosition, 
        1.0
      );
    }
    
    // Calculate collision avoidance force
    const collisions = CollisionAvoidanceAlgorithm.predictCollisions(drone, neighbors);
    const avoidanceForce = CollisionAvoidanceAlgorithm.calculateAvoidanceForce(
      drone, 
      collisions, 
      neighbors
    );
    
    // Combine forces with appropriate weights
    const combinedForce = flockingForce
      .multiply(0.3)
      .add(formationForce.multiply(0.4))
      .add(avoidanceForce.multiply(0.3));
    
    return {
      flockingForce,
      formationForce,
      avoidanceForce,
      combinedForce
    };
  }

  /**
   * Update swarm coordination state
   */
  static updateCoordinationState(
    swarm: Swarm,
    drones: Drone[]
  ): SwarmCoordinationState {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id));
    
    // Update flocking state
    const centerOfMass = EmergentBehaviorAlgorithm.calculateCenterOfMass(swarmDrones);
    const averageVelocity = EmergentBehaviorAlgorithm.calculateAverageVelocity(swarmDrones);
    
    // Update consensus state (simplified)
    const consensusState = {
      leaderElection: !swarm.leadDrone,
      votingInProgress: false,
      currentVote: undefined,
      voteResults: {}
    };
    
    // Update emergency protocols
    const patterns = EmergentBehaviorAlgorithm.detectEmergentPatterns(swarmDrones);
    const emergencyActive = patterns.entropy > 0.8 || patterns.isDiverging;
    
    return {
      consensus: consensusState,
      flocking: {
        cohesionWeight: swarm.parameters.cohesion,
        separationWeight: 1.0,
        alignmentWeight: swarm.parameters.alignment,
        centerOfMass: centerOfMass.toVector3D(),
        averageVelocity: averageVelocity.toVector3D()
      },
      emergencyProtocols: {
        emergencyActive,
        emergencyType: emergencyActive ? 'communication_loss' : undefined,
        emergencyResponse: 'rally',
        recoveryInProgress: false
      }
    };
  }
}

export default {
  Vector3,
  FlockingAlgorithm,
  ConsensusAlgorithm,
  CollisionAvoidanceAlgorithm,
  FormationControlAlgorithm,
  EmergentBehaviorAlgorithm,
  SwarmCoordinationEngine
};