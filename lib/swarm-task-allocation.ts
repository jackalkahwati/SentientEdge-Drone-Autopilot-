/**
 * Distributed Task Allocation and Mission Coordination System
 * 
 * Implements intelligent task distribution algorithms for drone swarms,
 * including auction-based allocation, consensus-driven task assignment,
 * dynamic load balancing, and mission orchestration protocols.
 */

import {
  SwarmTask,
  SwarmTaskType,
  Drone,
  DroneType,
  Swarm,
  SwarmMessage,
  Vector3D,
  Mission
} from './types';

import { SwarmCommunicationManager } from './swarm-communication';
import { Vector3 } from './swarm-algorithms';

// ============================================================================
// TASK CAPABILITY MATCHING
// ============================================================================

interface TaskCapabilityRequirement {
  skillType: string;
  proficiencyLevel: number; // 0-1
  priority: number; // 0-10
}

interface DroneCapability {
  skillType: string;
  proficiencyLevel: number;
  availability: number; // 0-1, current availability
  efficiency: number; // 0-1, how efficiently drone performs this task
}

export class TaskCapabilityMatcher {
  private static readonly DRONE_CAPABILITIES: Record<DroneType, DroneCapability[]> = {
    surveillance: [
      { skillType: 'visual_monitoring', proficiencyLevel: 0.9, availability: 1.0, efficiency: 0.9 },
      { skillType: 'area_scanning', proficiencyLevel: 0.8, availability: 1.0, efficiency: 0.8 },
      { skillType: 'threat_detection', proficiencyLevel: 0.7, availability: 1.0, efficiency: 0.75 },
      { skillType: 'data_collection', proficiencyLevel: 0.6, availability: 1.0, efficiency: 0.7 }
    ],
    recon: [
      { skillType: 'reconnaissance', proficiencyLevel: 0.9, availability: 1.0, efficiency: 0.9 },
      { skillType: 'path_finding', proficiencyLevel: 0.8, availability: 1.0, efficiency: 0.85 },
      { skillType: 'terrain_mapping', proficiencyLevel: 0.8, availability: 1.0, efficiency: 0.8 },
      { skillType: 'intelligence_gathering', proficiencyLevel: 0.7, availability: 1.0, efficiency: 0.75 }
    ],
    attack: [
      { skillType: 'threat_neutralization', proficiencyLevel: 0.9, availability: 1.0, efficiency: 0.9 },
      { skillType: 'target_engagement', proficiencyLevel: 0.8, availability: 1.0, efficiency: 0.85 },
      { skillType: 'force_protection', proficiencyLevel: 0.7, availability: 1.0, efficiency: 0.8 },
      { skillType: 'area_denial', proficiencyLevel: 0.6, availability: 1.0, efficiency: 0.7 }
    ],
    transport: [
      { skillType: 'cargo_delivery', proficiencyLevel: 0.9, availability: 1.0, efficiency: 0.9 },
      { skillType: 'supply_transport', proficiencyLevel: 0.8, availability: 1.0, efficiency: 0.85 },
      { skillType: 'evacuation_support', proficiencyLevel: 0.6, availability: 1.0, efficiency: 0.7 },
      { skillType: 'logistics_coordination', proficiencyLevel: 0.5, availability: 1.0, efficiency: 0.6 }
    ],
    multi: [
      { skillType: 'adaptive_operations', proficiencyLevel: 0.7, availability: 1.0, efficiency: 0.75 },
      { skillType: 'versatile_support', proficiencyLevel: 0.7, availability: 1.0, efficiency: 0.7 },
      { skillType: 'backup_operations', proficiencyLevel: 0.6, availability: 1.0, efficiency: 0.65 },
      { skillType: 'coordination_relay', proficiencyLevel: 0.6, availability: 1.0, efficiency: 0.7 }
    ]
  };

  /**
   * Calculate compatibility score between drone and task
   */
  static calculateCompatibilityScore(
    drone: Drone,
    task: SwarmTask,
    currentWorkload: number = 0
  ): number {
    const droneCapabilities = this.DRONE_CAPABILITIES[drone.type];
    const taskRequirements = this.extractTaskRequirements(task);
    
    let totalScore = 0;
    let totalWeight = 0;

    // Evaluate each requirement
    for (const requirement of taskRequirements) {
      const capability = droneCapabilities.find(cap => cap.skillType === requirement.skillType);
      
      if (capability) {
        // Calculate how well the drone meets this requirement
        const proficiencyMatch = Math.min(capability.proficiencyLevel / requirement.proficiencyLevel, 1.0);
        const availabilityFactor = capability.availability * (1 - currentWorkload);
        const efficiencyFactor = capability.efficiency;
        
        const requirementScore = (proficiencyMatch * 0.4 + availabilityFactor * 0.3 + efficiencyFactor * 0.3);
        
        totalScore += requirementScore * requirement.priority;
        totalWeight += requirement.priority;
      }
    }

    // Base compatibility score
    let compatibilityScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Apply additional factors
    compatibilityScore *= this.calculateLocationScore(drone, task);
    compatibilityScore *= this.calculateResourceScore(drone, task);
    compatibilityScore *= this.calculateTimingScore(drone, task);

    return Math.min(compatibilityScore, 1.0);
  }

  private static extractTaskRequirements(task: SwarmTask): TaskCapabilityRequirement[] {
    const requirements: TaskCapabilityRequirement[] = [];

    switch (task.type) {
      case 'surveillance':
        requirements.push(
          { skillType: 'visual_monitoring', proficiencyLevel: 0.8, priority: 10 },
          { skillType: 'area_scanning', proficiencyLevel: 0.7, priority: 8 },
          { skillType: 'threat_detection', proficiencyLevel: 0.6, priority: 7 }
        );
        break;
      case 'reconnaissance':
        requirements.push(
          { skillType: 'reconnaissance', proficiencyLevel: 0.8, priority: 10 },
          { skillType: 'path_finding', proficiencyLevel: 0.7, priority: 8 },
          { skillType: 'intelligence_gathering', proficiencyLevel: 0.6, priority: 7 }
        );
        break;
      case 'search_and_rescue':
        requirements.push(
          { skillType: 'area_scanning', proficiencyLevel: 0.8, priority: 10 },
          { skillType: 'evacuation_support', proficiencyLevel: 0.7, priority: 9 },
          { skillType: 'coordination_relay', proficiencyLevel: 0.6, priority: 7 }
        );
        break;
      case 'patrol':
        requirements.push(
          { skillType: 'visual_monitoring', proficiencyLevel: 0.7, priority: 9 },
          { skillType: 'threat_detection', proficiencyLevel: 0.7, priority: 8 },
          { skillType: 'path_finding', proficiencyLevel: 0.6, priority: 6 }
        );
        break;
      case 'escort':
        requirements.push(
          { skillType: 'force_protection', proficiencyLevel: 0.8, priority: 10 },
          { skillType: 'threat_neutralization', proficiencyLevel: 0.7, priority: 8 },
          { skillType: 'coordination_relay', proficiencyLevel: 0.6, priority: 6 }
        );
        break;
      case 'supply_delivery':
        requirements.push(
          { skillType: 'cargo_delivery', proficiencyLevel: 0.9, priority: 10 },
          { skillType: 'supply_transport', proficiencyLevel: 0.8, priority: 9 },
          { skillType: 'path_finding', proficiencyLevel: 0.6, priority: 6 }
        );
        break;
      default:
        requirements.push(
          { skillType: 'adaptive_operations', proficiencyLevel: 0.6, priority: 7 }
        );
    }

    return requirements;
  }

  private static calculateLocationScore(drone: Drone, task: SwarmTask): number {
    if (!drone.location || !task.requirements.location) {
      return 1.0; // No location penalty if positions unknown
    }

    const dronePos = new Vector3(drone.location[0], drone.location[1], drone.altitude || 100);
    const taskPos = new Vector3(task.requirements.location[0], task.requirements.location[1], 100);
    
    const distance = dronePos.distance(taskPos);
    const maxEffectiveDistance = 1000; // 1km
    
    return Math.max(0.1, 1 - (distance / maxEffectiveDistance));
  }

  private static calculateResourceScore(drone: Drone, task: SwarmTask): number {
    let resourceScore = 1.0;

    // Battery consideration
    if (drone.battery < 30) {
      resourceScore *= 0.5; // Low battery penalty
    } else if (drone.battery > 80) {
      resourceScore *= 1.1; // High battery bonus
    }

    // Signal strength consideration
    if (drone.signal < 50) {
      resourceScore *= 0.7; // Poor signal penalty
    }

    // Maintenance status
    if (drone.status === 'maintenance') {
      resourceScore = 0; // Cannot assign tasks
    } else if (drone.status === 'idle') {
      resourceScore *= 1.2; // Bonus for available drones
    }

    return Math.min(resourceScore, 1.0);
  }

  private static calculateTimingScore(drone: Drone, task: SwarmTask): number {
    if (!task.deadline) {
      return 1.0; // No timing constraint
    }

    const now = new Date();
    const deadline = new Date(task.deadline);
    const timeToDeadline = deadline.getTime() - now.getTime();
    
    if (timeToDeadline <= 0) {
      return 0; // Task overdue
    }

    // Estimate task completion time based on task requirements
    const estimatedDuration = this.estimateTaskDuration(task);
    
    if (timeToDeadline < estimatedDuration) {
      return 0.1; // Insufficient time
    } else if (timeToDeadline > estimatedDuration * 3) {
      return 1.0; // Plenty of time
    } else {
      return timeToDeadline / (estimatedDuration * 3);
    }
  }

  private static estimateTaskDuration(task: SwarmTask): number {
    const baseDurations = {
      surveillance: 3600, // 1 hour
      reconnaissance: 1800, // 30 minutes
      search_and_rescue: 7200, // 2 hours
      patrol: 5400, // 1.5 hours
      escort: 3600, // 1 hour
      formation_flight: 1800, // 30 minutes
      area_denial: 7200, // 2 hours
      perimeter_defense: 14400, // 4 hours
      supply_delivery: 2700, // 45 minutes
      communication_relay: 1800 // 30 minutes
    };

    return baseDurations[task.type] || 3600; // Default 1 hour
  }
}

// ============================================================================
// AUCTION-BASED TASK ALLOCATION
// ============================================================================

export class TaskAuctionSystem {
  private activeAuctions: Map<string, TaskAuction> = new Map();
  private communicationManager: SwarmCommunicationManager;

  constructor(communicationManager: SwarmCommunicationManager) {
    this.communicationManager = communicationManager;
  }

  /**
   * Initiate task auction
   */
  async initiateAuction(
    task: SwarmTask,
    eligibleDrones: Drone[],
    auctionDuration: number = 30000 // 30 seconds
  ): Promise<string> {
    const auctionId = `auction_${task.id}_${Date.now()}`;
    const deadline = new Date(Date.now() + auctionDuration);

    const auction: TaskAuction = {
      id: auctionId,
      task,
      eligibleBidders: eligibleDrones.map(d => d.id),
      bids: [],
      deadline,
      status: 'active'
    };

    this.activeAuctions.set(auctionId, auction);

    // Broadcast auction announcement
    await this.communicationManager.sendEmergencyAlert(
      'task_auction',
      'normal',
      {
        auctionId,
        task: {
          id: task.id,
          type: task.type,
          priority: task.priority,
          requirements: task.requirements,
          deadline: task.deadline
        },
        deadline: deadline.toISOString(),
        eligibleBidders: auction.eligibleBidders
      }
    );

    // Set auction resolution timer
    setTimeout(() => {
      this.resolveAuction(auctionId);
    }, auctionDuration);

    return auctionId;
  }

  /**
   * Submit bid for auction
   */
  submitBid(
    auctionId: string,
    droneId: string,
    bidValue: number,
    capabilities: Record<string, number>,
    estimatedCompletionTime: number
  ): boolean {
    const auction = this.activeAuctions.get(auctionId);
    
    if (!auction || auction.status !== 'active' || new Date() > auction.deadline) {
      return false;
    }

    if (!auction.eligibleBidders.includes(droneId)) {
      return false;
    }

    // Remove existing bid from same drone
    auction.bids = auction.bids.filter(bid => bid.droneId !== droneId);

    // Add new bid
    auction.bids.push({
      droneId,
      bidValue,
      capabilities,
      estimatedCompletionTime,
      submissionTime: new Date()
    });

    return true;
  }

  /**
   * Resolve auction and select winner
   */
  private async resolveAuction(auctionId: string): Promise<void> {
    const auction = this.activeAuctions.get(auctionId);
    
    if (!auction || auction.status !== 'active') {
      return;
    }

    auction.status = 'resolving';

    if (auction.bids.length === 0) {
      auction.status = 'failed';
      console.warn(`Auction ${auctionId} failed - no bids received`);
      return;
    }

    // Evaluate bids using multi-criteria decision making
    const winner = this.evaluateBids(auction);
    
    if (winner) {
      auction.status = 'completed';
      auction.winner = winner;

      // Assign task to winner
      await this.assignTaskToWinner(auction.task, winner);

      // Notify all participants
      await this.notifyAuctionResults(auction);
    } else {
      auction.status = 'failed';
      console.warn(`Auction ${auctionId} failed - no suitable winner found`);
    }

    // Clean up completed auction after delay
    setTimeout(() => {
      this.activeAuctions.delete(auctionId);
    }, 60000); // Keep for 1 minute for reference
  }

  private evaluateBids(auction: TaskAuction): TaskBid | null {
    if (auction.bids.length === 0) return null;

    // Multi-criteria evaluation
    let bestBid: TaskBid | null = null;
    let bestScore = -1;

    for (const bid of auction.bids) {
      let score = 0;
      let weightSum = 0;

      // Bid value (normalized, higher is better)
      const maxBidValue = Math.max(...auction.bids.map(b => b.bidValue));
      if (maxBidValue > 0) {
        score += (bid.bidValue / maxBidValue) * 0.3;
        weightSum += 0.3;
      }

      // Capability match (average of all capabilities)
      const capabilityValues = Object.values(bid.capabilities);
      if (capabilityValues.length > 0) {
        const avgCapability = capabilityValues.reduce((sum, val) => sum + val, 0) / capabilityValues.length;
        score += avgCapability * 0.4;
        weightSum += 0.4;
      }

      // Time efficiency (lower completion time is better)
      const minCompletionTime = Math.min(...auction.bids.map(b => b.estimatedCompletionTime));
      if (minCompletionTime > 0) {
        score += (minCompletionTime / bid.estimatedCompletionTime) * 0.2;
        weightSum += 0.2;
      }

      // Task priority consideration
      score += (auction.task.priority / 10) * 0.1;
      weightSum += 0.1;

      const normalizedScore = weightSum > 0 ? score / weightSum : 0;

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestBid = bid;
      }
    }

    return bestBid;
  }

  private async assignTaskToWinner(task: SwarmTask, winner: TaskBid): Promise<void> {
    await this.communicationManager.sendFormationCommand(
      winner.droneId,
      'task_assignment',
      {
        taskId: task.id,
        taskType: task.type,
        requirements: task.requirements,
        priority: task.priority,
        deadline: task.deadline,
        estimatedDuration: winner.estimatedCompletionTime,
        assignmentTime: new Date().toISOString()
      }
    );
  }

  private async notifyAuctionResults(auction: TaskAuction): Promise<void> {
    const resultMessage = {
      auctionId: auction.id,
      taskId: auction.task.id,
      winner: auction.winner?.droneId,
      totalBids: auction.bids.length,
      completionTime: new Date().toISOString()
    };

    // Notify all participants
    for (const bidderId of auction.eligibleBidders) {
      await this.communicationManager.sendFormationCommand(
        bidderId,
        'auction_result',
        resultMessage
      );
    }
  }

  /**
   * Get active auctions
   */
  getActiveAuctions(): TaskAuction[] {
    return Array.from(this.activeAuctions.values())
      .filter(auction => auction.status === 'active');
  }

  /**
   * Get auction statistics
   */
  getAuctionStats(): {
    totalAuctions: number;
    activeAuctions: number;
    completedAuctions: number;
    failedAuctions: number;
    averageBidsPerAuction: number;
  } {
    const auctions = Array.from(this.activeAuctions.values());
    const totalBids = auctions.reduce((sum, a) => sum + a.bids.length, 0);

    return {
      totalAuctions: auctions.length,
      activeAuctions: auctions.filter(a => a.status === 'active').length,
      completedAuctions: auctions.filter(a => a.status === 'completed').length,
      failedAuctions: auctions.filter(a => a.status === 'failed').length,
      averageBidsPerAuction: auctions.length > 0 ? totalBids / auctions.length : 0
    };
  }
}

interface TaskAuction {
  id: string;
  task: SwarmTask;
  eligibleBidders: string[];
  bids: TaskBid[];
  deadline: Date;
  status: 'active' | 'resolving' | 'completed' | 'failed';
  winner?: TaskBid;
}

interface TaskBid {
  droneId: string;
  bidValue: number;
  capabilities: Record<string, number>;
  estimatedCompletionTime: number;
  submissionTime: Date;
}

// ============================================================================
// WORKLOAD BALANCING SYSTEM
// ============================================================================

export class WorkloadBalancer {
  private droneWorkloads: Map<string, DroneWorkload> = new Map();
  private taskQueues: Map<string, SwarmTask[]> = new Map();

  /**
   * Update drone workload
   */
  updateDroneWorkload(
    droneId: string,
    activeTasks: SwarmTask[],
    capabilities: DroneCapability[]
  ): void {
    const totalTaskLoad = activeTasks.reduce((sum, task) => {
      return sum + (task.priority / 10) * this.estimateTaskComplexity(task);
    }, 0);

    const averageCapability = capabilities.reduce((sum, cap) => sum + cap.proficiencyLevel, 0) / capabilities.length;
    const utilizationRate = Math.min(totalTaskLoad / averageCapability, 1.0);

    this.droneWorkloads.set(droneId, {
      droneId,
      activeTasks: activeTasks.length,
      totalComplexity: totalTaskLoad,
      utilizationRate,
      averageCapability,
      lastUpdate: new Date()
    });
  }

  /**
   * Find optimal drone assignment considering workload balance
   */
  findOptimalAssignment(
    task: SwarmTask,
    availableDrones: Drone[]
  ): {
    droneId: string;
    expectedUtilization: number;
    balanceScore: number;
  } | null {
    const candidates: Array<{
      droneId: string;
      compatibilityScore: number;
      currentWorkload: number;
      expectedUtilization: number;
      balanceScore: number;
    }> = [];

    for (const drone of availableDrones) {
      const workload = this.droneWorkloads.get(drone.id);
      const currentWorkload = workload ? workload.utilizationRate : 0;

      // Skip overloaded drones
      if (currentWorkload > 0.9) continue;

      const compatibilityScore = TaskCapabilityMatcher.calculateCompatibilityScore(
        drone,
        task,
        currentWorkload
      );

      // Skip incompatible drones
      if (compatibilityScore < 0.3) continue;

      const taskComplexity = this.estimateTaskComplexity(task);
      const expectedUtilization = currentWorkload + (taskComplexity * 0.1);

      // Calculate balance score (prefer balanced utilization across swarm)
      const balanceScore = this.calculateBalanceScore(drone.id, expectedUtilization);

      candidates.push({
        droneId: drone.id,
        compatibilityScore,
        currentWorkload,
        expectedUtilization,
        balanceScore
      });
    }

    if (candidates.length === 0) return null;

    // Multi-objective optimization: compatibility + workload balance
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      overallScore: (candidate.compatibilityScore * 0.6) + (candidate.balanceScore * 0.4)
    }));

    scoredCandidates.sort((a, b) => b.overallScore - a.overallScore);
    const best = scoredCandidates[0];

    return {
      droneId: best.droneId,
      expectedUtilization: best.expectedUtilization,
      balanceScore: best.balanceScore
    };
  }

  private estimateTaskComplexity(task: SwarmTask): number {
    const baseComplexity = {
      surveillance: 0.3,
      reconnaissance: 0.4,
      search_and_rescue: 0.8,
      patrol: 0.5,
      escort: 0.6,
      formation_flight: 0.2,
      area_denial: 0.7,
      perimeter_defense: 0.9,
      supply_delivery: 0.4,
      communication_relay: 0.2
    };

    let complexity = baseComplexity[task.type] || 0.5;
    
    // Adjust for priority
    complexity *= (1 + task.priority / 20);
    
    // Adjust for requirements
    if (task.requirements.droneCount > 1) {
      complexity *= (1 + task.requirements.droneCount * 0.1);
    }

    return Math.min(complexity, 2.0);
  }

  private calculateBalanceScore(droneId: string, expectedUtilization: number): number {
    const allWorkloads = Array.from(this.droneWorkloads.values());
    
    if (allWorkloads.length === 0) return 1.0;

    // Calculate utilization variance with this assignment
    const utilisations = allWorkloads.map(w => 
      w.droneId === droneId ? expectedUtilization : w.utilizationRate
    );

    const mean = utilisations.reduce((sum, u) => sum + u, 0) / utilisations.length;
    const variance = utilisations.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / utilisations.length;

    // Lower variance is better (more balanced)
    return Math.max(0, 1 - variance);
  }

  /**
   * Rebalance workloads across swarm
   */
  rebalanceWorkloads(swarmDrones: Drone[]): Array<{
    fromDroneId: string;
    toDroneId: string;
    tasks: SwarmTask[];
    reason: string;
  }> {
    const rebalanceActions: Array<{
      fromDroneId: string;
      toDroneId: string;
      tasks: SwarmTask[];
      reason: string;
    }> = [];

    const workloads = Array.from(this.droneWorkloads.values())
      .filter(w => swarmDrones.some(d => d.id === w.droneId))
      .sort((a, b) => b.utilizationRate - a.utilizationRate);

    // Identify overloaded and underloaded drones
    const overloadedThreshold = 0.8;
    const underloadedThreshold = 0.3;

    const overloaded = workloads.filter(w => w.utilizationRate > overloadedThreshold);
    const underloaded = workloads.filter(w => w.utilizationRate < underloadedThreshold);

    // Attempt to move tasks from overloaded to underloaded drones
    for (const overloadedDrone of overloaded) {
      const droneTaskQueue = this.taskQueues.get(overloadedDrone.droneId) || [];
      
      // Find moveable tasks (lower priority, non-critical timing)
      const moveableTasks = droneTaskQueue
        .filter(task => task.priority < 7 && task.status === 'assigned')
        .sort((a, b) => a.priority - b.priority); // Move lowest priority first

      for (const task of moveableTasks) {
        // Find suitable underloaded drone
        const suitableTarget = underloaded.find(underloadedDrone => {
          const drone = swarmDrones.find(d => d.id === underloadedDrone.droneId);
          if (!drone) return false;

          const compatibility = TaskCapabilityMatcher.calculateCompatibilityScore(
            drone,
            task,
            underloadedDrone.utilizationRate
          );

          return compatibility > 0.5;
        });

        if (suitableTarget) {
          rebalanceActions.push({
            fromDroneId: overloadedDrone.droneId,
            toDroneId: suitableTarget.droneId,
            tasks: [task],
            reason: `Rebalance from overloaded (${overloadedDrone.utilizationRate.toFixed(2)}) to underloaded (${suitableTarget.utilizationRate.toFixed(2)})`
          });

          // Update workload estimates
          overloadedDrone.utilizationRate -= this.estimateTaskComplexity(task) * 0.1;
          suitableTarget.utilizationRate += this.estimateTaskComplexity(task) * 0.1;

          // Stop if balance is achieved
          if (overloadedDrone.utilizationRate <= overloadedThreshold) break;
        }
      }
    }

    return rebalanceActions;
  }

  /**
   * Get workload statistics
   */
  getWorkloadStats(): {
    totalDrones: number;
    averageUtilization: number;
    utilizationVariance: number;
    overloadedDrones: number;
    underloadedDrones: number;
  } {
    const workloads = Array.from(this.droneWorkloads.values());
    
    if (workloads.length === 0) {
      return {
        totalDrones: 0,
        averageUtilization: 0,
        utilizationVariance: 0,
        overloadedDrones: 0,
        underloadedDrones: 0
      };
    }

    const utilizations = workloads.map(w => w.utilizationRate);
    const averageUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const utilizationVariance = utilizations.reduce((sum, u) => sum + Math.pow(u - averageUtilization, 2), 0) / utilizations.length;

    return {
      totalDrones: workloads.length,
      averageUtilization,
      utilizationVariance,
      overloadedDrones: workloads.filter(w => w.utilizationRate > 0.8).length,
      underloadedDrones: workloads.filter(w => w.utilizationRate < 0.3).length
    };
  }
}

interface DroneWorkload {
  droneId: string;
  activeTasks: number;
  totalComplexity: number;
  utilizationRate: number;
  averageCapability: number;
  lastUpdate: Date;
}

// ============================================================================
// MISSION ORCHESTRATION SYSTEM
// ============================================================================

export class MissionOrchestrator {
  private taskAuctionSystem: TaskAuctionSystem;
  private workloadBalancer: WorkloadBalancer;
  private communicationManager: SwarmCommunicationManager;
  private activeMissions: Map<string, MissionExecution> = new Map();

  constructor(communicationManager: SwarmCommunicationManager) {
    this.communicationManager = communicationManager;
    this.taskAuctionSystem = new TaskAuctionSystem(communicationManager);
    this.workloadBalancer = new WorkloadBalancer();
  }

  /**
   * Decompose mission into swarm tasks
   */
  decomposeMission(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];
    const missionType = this.inferMissionType(mission);

    switch (missionType) {
      case 'area_surveillance':
        tasks.push(...this.createSurveillanceTasks(mission, swarm, availableDrones));
        break;
      case 'search_and_rescue':
        tasks.push(...this.createSearchAndRescueTasks(mission, swarm, availableDrones));
        break;
      case 'reconnaissance':
        tasks.push(...this.createReconnaissanceTasks(mission, swarm, availableDrones));
        break;
      case 'patrol_mission':
        tasks.push(...this.createPatrolTasks(mission, swarm, availableDrones));
        break;
      case 'escort_mission':
        tasks.push(...this.createEscortTasks(mission, swarm, availableDrones));
        break;
      default:
        tasks.push(...this.createGenericTasks(mission, swarm, availableDrones));
    }

    return tasks;
  }

  private inferMissionType(mission: Mission): string {
    const missionName = mission.name.toLowerCase();
    const missionDescription = mission.description.toLowerCase();
    const combined = `${missionName} ${missionDescription}`;

    if (combined.includes('surveillance') || combined.includes('monitor')) {
      return 'area_surveillance';
    } else if (combined.includes('search') || combined.includes('rescue')) {
      return 'search_and_rescue';
    } else if (combined.includes('reconnaissance') || combined.includes('recon')) {
      return 'reconnaissance';
    } else if (combined.includes('patrol')) {
      return 'patrol_mission';
    } else if (combined.includes('escort') || combined.includes('protect')) {
      return 'escort_mission';
    }

    return 'generic_mission';
  }

  private createSurveillanceTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];
    const surveillanceDrones = availableDrones.filter(d => 
      d.type === 'surveillance' || d.type === 'multi'
    );

    // Create area coverage tasks
    const taskCount = Math.min(surveillanceDrones.length, 4); // Max 4 surveillance areas
    
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: `surveillance_${mission.id}_${i}`,
        type: 'surveillance',
        priority: 7 + mission.threatLevel, // Higher priority for higher threats
        requirements: {
          droneCount: 1,
          droneTypes: ['surveillance', 'multi'],
          skills: ['visual_monitoring', 'threat_detection'],
          location: mission.coordinates,
          duration: parseInt(mission.duration) * 60 // Convert hours to seconds
        },
        assignedDrones: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
        progress: 0
      });
    }

    return tasks;
  }

  private createSearchAndRescueTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];

    // Search coordination task
    tasks.push({
      id: `search_coord_${mission.id}`,
      type: 'search_and_rescue',
      priority: 9,
      requirements: {
        droneCount: Math.min(3, availableDrones.length),
        droneTypes: ['surveillance', 'recon', 'multi'],
        skills: ['area_scanning', 'coordination_relay'],
        location: mission.coordinates,
        duration: parseInt(mission.duration) * 60
      },
      assignedDrones: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
      progress: 0
    });

    // Rescue support task
    const transportDrones = availableDrones.filter(d => d.type === 'transport');
    if (transportDrones.length > 0) {
      tasks.push({
        id: `rescue_support_${mission.id}`,
        type: 'search_and_rescue',
        priority: 8,
        requirements: {
          droneCount: Math.min(2, transportDrones.length),
          droneTypes: ['transport', 'multi'],
          skills: ['evacuation_support', 'cargo_delivery'],
          location: mission.coordinates,
          duration: parseInt(mission.duration) * 60
        },
        assignedDrones: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
        progress: 0
      });
    }

    return tasks;
  }

  private createReconnaissanceTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];
    const reconDrones = availableDrones.filter(d => 
      d.type === 'recon' || d.type === 'surveillance'
    );

    // Primary reconnaissance
    tasks.push({
      id: `recon_primary_${mission.id}`,
      type: 'reconnaissance',
      priority: 8,
      requirements: {
        droneCount: Math.min(2, reconDrones.length),
        droneTypes: ['recon', 'surveillance'],
        skills: ['reconnaissance', 'intelligence_gathering'],
        location: mission.coordinates,
        duration: parseInt(mission.duration) * 60
      },
      assignedDrones: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
      progress: 0
    });

    return tasks;
  }

  private createPatrolTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];

    // Create patrol sectors
    const sectorCount = Math.min(Math.ceil(availableDrones.length / 2), 3);
    
    for (let i = 0; i < sectorCount; i++) {
      tasks.push({
        id: `patrol_sector_${mission.id}_${i}`,
        type: 'patrol',
        priority: 6,
        requirements: {
          droneCount: 2,
          droneTypes: ['surveillance', 'recon', 'multi'],
          skills: ['visual_monitoring', 'path_finding'],
          location: mission.coordinates,
          duration: parseInt(mission.duration) * 60
        },
        assignedDrones: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
        progress: 0
      });
    }

    return tasks;
  }

  private createEscortTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];

    // Main escort task
    tasks.push({
      id: `escort_main_${mission.id}`,
      type: 'escort',
      priority: 8,
      requirements: {
        droneCount: Math.min(4, availableDrones.length),
        droneTypes: ['attack', 'surveillance', 'multi'],
        skills: ['force_protection', 'threat_neutralization'],
        location: mission.coordinates,
        duration: parseInt(mission.duration) * 60
      },
      assignedDrones: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
      progress: 0
    });

    return tasks;
  }

  private createGenericTasks(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): SwarmTask[] {
    const tasks: SwarmTask[] = [];

    // Generic mission support
    tasks.push({
      id: `generic_support_${mission.id}`,
      type: 'formation_flight',
      priority: 5,
      requirements: {
        droneCount: Math.min(availableDrones.length, swarm.drones.length),
        location: mission.coordinates,
        duration: parseInt(mission.duration) * 60
      },
      assignedDrones: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + parseInt(mission.duration) * 3600000).toISOString(),
      progress: 0
    });

    return tasks;
  }

  /**
   * Execute mission with task allocation
   */
  async executeMission(
    mission: Mission,
    swarm: Swarm,
    availableDrones: Drone[]
  ): Promise<string> {
    const missionExecutionId = `mission_exec_${mission.id}_${Date.now()}`;
    
    // Decompose mission into tasks
    const tasks = this.decomposeMission(mission, swarm, availableDrones);
    
    const missionExecution: MissionExecution = {
      id: missionExecutionId,
      missionId: mission.id,
      swarmId: swarm.id,
      tasks,
      assignedDrones: new Map(),
      status: 'executing',
      startTime: new Date(),
      progress: 0
    };

    this.activeMissions.set(missionExecutionId, missionExecution);
    
    // Allocate tasks to drones
    for (const task of tasks) {
      try {
        await this.allocateTask(task, availableDrones, swarm);
      } catch (error) {
        console.error(`Failed to allocate task ${task.id}:`, error);
      }
    }

    return missionExecutionId;
  }

  private async allocateTask(
    task: SwarmTask,
    availableDrones: Drone[],
    swarm: Swarm
  ): Promise<void> {
    // Filter eligible drones
    const eligibleDrones = availableDrones.filter(drone => {
      if (!task.requirements.droneTypes || task.requirements.droneTypes.includes(drone.type)) {
        return drone.status === 'active' || drone.status === 'idle';
      }
      return false;
    });

    if (eligibleDrones.length === 0) {
      console.warn(`No eligible drones for task ${task.id}`);
      return;
    }

    // Use auction system for complex tasks, direct assignment for simple ones
    if (task.priority >= 7 || task.requirements.droneCount > 1) {
      await this.taskAuctionSystem.initiateAuction(task, eligibleDrones);
    } else {
      // Direct assignment using workload balancer
      const assignment = this.workloadBalancer.findOptimalAssignment(task, eligibleDrones);
      
      if (assignment) {
        await this.communicationManager.sendFormationCommand(
          assignment.droneId,
          'task_assignment',
          {
            taskId: task.id,
            taskType: task.type,
            requirements: task.requirements,
            priority: task.priority,
            deadline: task.deadline
          }
        );

        task.assignedDrones = [assignment.droneId];
        task.status = 'assigned';
      }
    }
  }

  /**
   * Get mission execution status
   */
  getMissionStatus(missionExecutionId: string): MissionExecution | null {
    return this.activeMissions.get(missionExecutionId) || null;
  }

  /**
   * Get all active missions
   */
  getActiveMissions(): MissionExecution[] {
    return Array.from(this.activeMissions.values());
  }
}

interface MissionExecution {
  id: string;
  missionId: string;
  swarmId: string;
  tasks: SwarmTask[];
  assignedDrones: Map<string, string[]>; // droneId -> taskIds
  status: 'planning' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-1
}

export default {
  TaskCapabilityMatcher,
  TaskAuctionSystem,
  WorkloadBalancer,
  MissionOrchestrator
};