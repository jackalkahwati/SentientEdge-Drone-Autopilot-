/**
 * Swarm Leadership and Election System
 * 
 * Implements dynamic leader-follower relationships with automatic leader election,
 * fault tolerance, and leadership transition protocols. Handles hierarchical
 * command structures and distributed decision making for drone swarms.
 */

import {
  Swarm,
  Drone,
  SwarmMessage,
  SwarmCoordinationState,
  Vector3D
} from './types';

import {
  ConsensusAlgorithm,
  EmergentBehaviorAlgorithm
} from './swarm-algorithms';

import { SwarmCommunicationManager } from './swarm-communication';

// ============================================================================
// LEADERSHIP MODELS
// ============================================================================

export interface LeadershipCapabilities {
  communicationReliability: number; // 0-1
  computationalPower: number; // 0-1
  experienceLevel: number; // 0-1
  batteryReserve: number; // 0-1
  sensorCapabilities: number; // 0-1
  missionSpecialization: number; // 0-1
  networkCentrality: number; // 0-1
}

export interface LeadershipRole {
  id: string;
  type: 'primary' | 'backup' | 'specialist';
  responsibilities: string[];
  authorityLevel: number; // 0-10
  jurisdiction: {
    droneIds: string[];
    geographicBounds?: {
      center: Vector3D;
      radius: number;
    };
    missionPhases: string[];
  };
}

export interface LeadershipHierarchy {
  levels: Array<{
    level: number;
    leaders: Array<{
      droneId: string;
      role: LeadershipRole;
      subordinates: string[];
      capabilities: LeadershipCapabilities;
    }>;
  }>;
  commandStructure: Map<string, string[]>; // leaderId -> subordinateIds
  emergencySuccession: Map<string, string[]>; // leaderId -> backup leaderIds
}

// ============================================================================
// LEADER ELECTION ALGORITHMS
// ============================================================================

export class LeaderElectionManager {
  private static readonly ELECTION_TIMEOUT = 30000; // 30 seconds
  private static readonly STABILITY_PERIOD = 10000; // 10 seconds
  private static readonly MIN_VOTING_THRESHOLD = 0.51; // 51% quorum

  /**
   * Initiate leader election process
   */
  static initiateElection(
    swarm: Swarm,
    availableDrones: Drone[],
    electionTrigger: 'leader_failure' | 'performance_degradation' | 'network_partition' | 'manual'
  ): {
    electionId: string;
    candidates: Array<{
      droneId: string;
      capabilities: LeadershipCapabilities;
      score: number;
    }>;
    votingDeadline: Date;
  } {
    const electionId = `election_${Date.now()}_${swarm.id}`;
    const votingDeadline = new Date(Date.now() + this.ELECTION_TIMEOUT);

    // Evaluate candidates
    const candidates = availableDrones
      .filter(drone => drone.status === 'active' && drone.battery > 20) // Minimum requirements
      .map(drone => {
        const capabilities = this.evaluateLeadershipCapabilities(drone, swarm, availableDrones);
        const score = this.calculateLeadershipScore(capabilities, electionTrigger);
        
        return {
          droneId: drone.id,
          capabilities,
          score
        };
      })
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, Math.min(5, Math.ceil(availableDrones.length * 0.3))); // Top candidates only

    return {
      electionId,
      candidates,
      votingDeadline
    };
  }

  /**
   * Evaluate leadership capabilities of a drone
   */
  private static evaluateLeadershipCapabilities(
    drone: Drone,
    swarm: Swarm,
    allDrones: Drone[]
  ): LeadershipCapabilities {
    // Communication reliability based on signal strength and connectivity
    const communicationReliability = Math.min(drone.signal / 100, 1.0);

    // Computational power based on drone type and capabilities
    const typeComputationScores = {
      'multi': 0.9,
      'recon': 0.8,
      'surveillance': 0.7,
      'transport': 0.4,
      'attack': 0.6
    };
    const computationalPower = typeComputationScores[drone.type] || 0.5;

    // Experience level based on mission count and success rate
    const experienceLevel = Math.min(drone.missionCount / 50, 1.0); // Normalize to 50 missions

    // Battery reserve - critical for leadership stability
    const batteryReserve = drone.battery / 100;

    // Sensor capabilities based on drone type
    const typeSensorScores = {
      'surveillance': 0.9,
      'recon': 0.8,
      'multi': 0.7,
      'attack': 0.6,
      'transport': 0.3
    };
    const sensorCapabilities = typeSensorScores[drone.type] || 0.5;

    // Mission specialization - how well suited for current mission
    let missionSpecialization = 0.5; // Default
    if (swarm.missionId) {
      // In production, this would analyze mission requirements vs drone capabilities
      missionSpecialization = 0.7;
    }

    // Network centrality - position in communication network
    const networkCentrality = this.calculateNetworkCentrality(drone, allDrones, swarm.parameters.communicationRange);

    return {
      communicationReliability,
      computationalPower,
      experienceLevel,
      batteryReserve,
      sensorCapabilities,
      missionSpecialization,
      networkCentrality
    };
  }

  /**
   * Calculate network centrality for a drone
   */
  private static calculateNetworkCentrality(
    drone: Drone,
    allDrones: Drone[],
    communicationRange: number
  ): number {
    if (!drone.location) return 0;

    const dronePos = { x: drone.location[0], y: drone.location[1], z: drone.altitude || 100 };
    let connections = 0;
    let totalDistance = 0;

    for (const other of allDrones) {
      if (other.id === drone.id || !other.location || other.status !== 'active') continue;

      const otherPos = { x: other.location[0], y: other.location[1], z: other.altitude || 100 };
      const distance = Math.sqrt(
        Math.pow(dronePos.x - otherPos.x, 2) +
        Math.pow(dronePos.y - otherPos.y, 2) +
        Math.pow(dronePos.z - otherPos.z, 2)
      );

      if (distance <= communicationRange) {
        connections++;
        totalDistance += distance;
      }
    }

    if (connections === 0) return 0;

    // Higher score for more connections and shorter average distance
    const connectivityScore = connections / allDrones.length;
    const proximityScore = 1 - (totalDistance / connections) / communicationRange;

    return (connectivityScore + proximityScore) / 2;
  }

  /**
   * Calculate overall leadership score
   */
  private static calculateLeadershipScore(
    capabilities: LeadershipCapabilities,
    electionTrigger: string
  ): number {
    // Base weights for different capabilities
    let weights = {
      communicationReliability: 0.20,
      computationalPower: 0.15,
      experienceLevel: 0.15,
      batteryReserve: 0.20,
      sensorCapabilities: 0.10,
      missionSpecialization: 0.10,
      networkCentrality: 0.10
    };

    // Adjust weights based on election trigger
    switch (electionTrigger) {
      case 'leader_failure':
        weights.batteryReserve = 0.25; // Emphasize reliability
        weights.communicationReliability = 0.25;
        break;
      case 'performance_degradation':
        weights.computationalPower = 0.20;
        weights.experienceLevel = 0.20;
        break;
      case 'network_partition':
        weights.networkCentrality = 0.20;
        weights.communicationReliability = 0.25;
        break;
    }

    // Calculate weighted score
    return (
      capabilities.communicationReliability * weights.communicationReliability +
      capabilities.computationalPower * weights.computationalPower +
      capabilities.experienceLevel * weights.experienceLevel +
      capabilities.batteryReserve * weights.batteryReserve +
      capabilities.sensorCapabilities * weights.sensorCapabilities +
      capabilities.missionSpecialization * weights.missionSpecialization +
      capabilities.networkCentrality * weights.networkCentrality
    );
  }

  /**
   * Process election votes and determine winner
   */
  static processElectionResults(
    electionId: string,
    votes: Array<{
      voterId: string;
      candidateId: string;
      confidence: number; // 0-1
      timestamp: Date;
    }>,
    totalEligibleVoters: number
  ): {
    winner: string | null;
    results: Map<string, number>;
    validElection: boolean;
    quorumMet: boolean;
  } {
    const results = new Map<string, number>();
    const voterSet = new Set<string>();

    // Count votes and validate
    for (const vote of votes) {
      // Prevent double voting
      if (voterSet.has(vote.voterId)) continue;
      voterSet.add(vote.voterId);

      // Weight vote by confidence
      const weightedVote = vote.confidence;
      results.set(vote.candidateId, (results.get(vote.candidateId) || 0) + weightedVote);
    }

    const totalVotes = voterSet.size;
    const quorumMet = totalVotes >= Math.ceil(totalEligibleVoters * this.MIN_VOTING_THRESHOLD);

    // Find winner
    let winner: string | null = null;
    let maxVotes = 0;

    for (const [candidateId, voteCount] of results) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winner = candidateId;
      }
    }

    // Validate election
    const validElection = quorumMet && winner !== null && 
      maxVotes >= Math.ceil(totalVotes * this.MIN_VOTING_THRESHOLD);

    return {
      winner: validElection ? winner : null,
      results,
      validElection,
      quorumMet
    };
  }
}

// ============================================================================
// HIERARCHICAL COMMAND STRUCTURE
// ============================================================================

export class HierarchicalCommandManager {
  private hierarchy: LeadershipHierarchy;
  private communicationManager: SwarmCommunicationManager;

  constructor(
    swarmId: string,
    communicationManager: SwarmCommunicationManager
  ) {
    this.communicationManager = communicationManager;
    this.hierarchy = {
      levels: [],
      commandStructure: new Map(),
      emergencySuccession: new Map()
    };
  }

  /**
   * Establish hierarchical command structure
   */
  establishHierarchy(
    swarm: Swarm,
    drones: Drone[],
    maxLevels: number = 3
  ): LeadershipHierarchy {
    const activeDrones = drones.filter(d => 
      swarm.drones.includes(d.id) && d.status === 'active'
    );

    if (activeDrones.length === 0) {
      return this.hierarchy;
    }

    // Calculate optimal span of control (number of subordinates per leader)
    const spanOfControl = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(activeDrones.length))));
    
    // Build hierarchy levels
    const levels: LeadershipHierarchy['levels'] = [];
    let currentLevel = activeDrones.slice();
    let levelNumber = 0;

    while (currentLevel.length > 1 && levelNumber < maxLevels) {
      const leaders: Array<{
        droneId: string;
        role: LeadershipRole;
        subordinates: string[];
        capabilities: LeadershipCapabilities;
      }> = [];

      const leaderCount = Math.ceil(currentLevel.length / spanOfControl);
      const selectedLeaders: Drone[] = [];

      // Select leaders based on capabilities
      for (let i = 0; i < leaderCount && i < currentLevel.length; i++) {
        const leaderCandidates = currentLevel
          .filter(d => !selectedLeaders.includes(d))
          .map(drone => ({
            drone,
            capabilities: LeaderElectionManager['evaluateLeadershipCapabilities'](drone, swarm, activeDrones),
          }))
          .sort((a, b) => {
            const scoreA = LeaderElectionManager['calculateLeadershipScore'](a.capabilities, 'manual');
            const scoreB = LeaderElectionManager['calculateLeadershipScore'](b.capabilities, 'manual');
            return scoreB - scoreA;
          });

        if (leaderCandidates.length > 0) {
          const leader = leaderCandidates[0].drone;
          selectedLeaders.push(leader);

          // Assign subordinates
          const subordinates: string[] = [];
          const remainingDrones = currentLevel.filter(d => !selectedLeaders.includes(d));
          
          for (let j = 0; j < spanOfControl && j < remainingDrones.length; j++) {
            subordinates.push(remainingDrones[j].id);
          }

          // Create leadership role
          const role: LeadershipRole = {
            id: `leader_${levelNumber}_${leader.id}`,
            type: i === 0 ? 'primary' : 'backup',
            responsibilities: this.getLeadershipResponsibilities(levelNumber, leader.type),
            authorityLevel: Math.max(1, maxLevels - levelNumber),
            jurisdiction: {
              droneIds: subordinates,
              missionPhases: ['all']
            }
          };

          leaders.push({
            droneId: leader.id,
            role,
            subordinates,
            capabilities: leaderCandidates[0].capabilities
          });

          // Update command structure
          this.hierarchy.commandStructure.set(leader.id, subordinates);
        }
      }

      levels.push({ level: levelNumber, leaders });
      currentLevel = selectedLeaders;
      levelNumber++;
    }

    // Establish emergency succession
    this.establishEmergencySuccession(levels);

    this.hierarchy.levels = levels;
    return this.hierarchy;
  }

  private getLeadershipResponsibilities(level: number, droneType: string): string[] {
    const baseResponsibilities = [
      'coordinate_subordinates',
      'relay_commands',
      'monitor_performance',
      'report_status'
    ];

    const levelResponsibilities = {
      0: ['tactical_execution', 'immediate_response'],
      1: ['operational_coordination', 'resource_allocation'],
      2: ['strategic_oversight', 'mission_adaptation']
    };

    const typeResponsibilities = {
      'surveillance': ['intelligence_gathering', 'threat_assessment'],
      'recon': ['area_mapping', 'route_planning'],
      'multi': ['versatile_support', 'backup_leadership'],
      'attack': ['threat_neutralization', 'force_protection'],
      'transport': ['logistics_coordination', 'supply_management']
    };

    return [
      ...baseResponsibilities,
      ...(levelResponsibilities[level as keyof typeof levelResponsibilities] || []),
      ...(typeResponsibilities[droneType as keyof typeof typeResponsibilities] || [])
    ];
  }

  private establishEmergencySuccession(
    levels: LeadershipHierarchy['levels']
  ): void {
    for (const level of levels) {
      const leaders = level.leaders;
      
      for (let i = 0; i < leaders.length; i++) {
        const leader = leaders[i];
        const backups: string[] = [];

        // Primary backup: next leader in same level
        if (i + 1 < leaders.length) {
          backups.push(leaders[i + 1].droneId);
        }

        // Secondary backup: previous leader in same level
        if (i - 1 >= 0) {
          backups.push(leaders[i - 1].droneId);
        }

        // Tertiary backup: leader from level below (if exists)
        if (level.level > 0) {
          const lowerLevel = levels.find(l => l.level === level.level - 1);
          if (lowerLevel && lowerLevel.leaders.length > 0) {
            backups.push(lowerLevel.leaders[0].droneId);
          }
        }

        this.hierarchy.emergencySuccession.set(leader.droneId, backups);
      }
    }
  }

  /**
   * Handle leadership transition
   */
  async handleLeadershipTransition(
    oldLeaderId: string,
    newLeaderId: string,
    transitionReason: 'failure' | 'election' | 'emergency'
  ): Promise<boolean> {
    // Find leadership role being transitioned
    let leadershipRole: LeadershipRole | null = null;
    let subordinates: string[] = [];

    for (const level of this.hierarchy.levels) {
      const leader = level.leaders.find(l => l.droneId === oldLeaderId);
      if (leader) {
        leadershipRole = leader.role;
        subordinates = leader.subordinates;
        
        // Update hierarchy
        leader.droneId = newLeaderId;
        this.hierarchy.commandStructure.set(newLeaderId, subordinates);
        this.hierarchy.commandStructure.delete(oldLeaderId);
        break;
      }
    }

    if (!leadershipRole) {
      console.error(`Leadership role not found for drone ${oldLeaderId}`);
      return false;
    }

    // Notify subordinates of leadership change
    const transitionMessage: SwarmMessage = {
      id: `leadership_transition_${Date.now()}`,
      senderId: newLeaderId,
      type: 'formation_command',
      payload: {
        command: 'leadership_transition',
        oldLeader: oldLeaderId,
        newLeader: newLeaderId,
        transitionReason,
        role: leadershipRole,
        timestamp: Date.now()
      },
      timestamp: new Date().toISOString(),
      priority: 'critical',
      encrypted: true,
      ackRequired: true,
      ttl: 300
    };

    // Send to all subordinates
    const promises = subordinates.map(subordinateId =>
      this.communicationManager.sendFormationCommand(
        subordinateId,
        'leadership_transition',
        transitionMessage.payload
      )
    );

    try {
      await Promise.all(promises);
      console.log(`Leadership successfully transitioned from ${oldLeaderId} to ${newLeaderId}`);
      return true;
    } catch (error) {
      console.error('Leadership transition failed:', error);
      return false;
    }
  }

  /**
   * Monitor leadership health and performance
   */
  monitorLeadershipHealth(
    drones: Drone[]
  ): Array<{
    leaderId: string;
    healthScore: number;
    issues: string[];
    recommendedAction: 'none' | 'monitor' | 'prepare_succession' | 'immediate_replacement';
  }> {
    const healthReports: Array<{
      leaderId: string;
      healthScore: number;
      issues: string[];
      recommendedAction: 'none' | 'monitor' | 'prepare_succession' | 'immediate_replacement';
    }> = [];

    for (const level of this.hierarchy.levels) {
      for (const leader of level.leaders) {
        const drone = drones.find(d => d.id === leader.droneId);
        if (!drone) continue;

        const issues: string[] = [];
        let healthScore = 1.0;

        // Check battery level
        if (drone.battery < 30) {
          issues.push('Low battery');
          healthScore *= 0.7;
        }
        if (drone.battery < 15) {
          issues.push('Critical battery');
          healthScore *= 0.3;
        }

        // Check signal strength
        if (drone.signal < 50) {
          issues.push('Weak signal');
          healthScore *= 0.8;
        }
        if (drone.signal < 20) {
          issues.push('Critical signal loss');
          healthScore *= 0.4;
        }

        // Check drone status
        if (drone.status !== 'active') {
          issues.push(`Drone status: ${drone.status}`);
          healthScore = 0;
        }

        // Determine recommended action
        let recommendedAction: 'none' | 'monitor' | 'prepare_succession' | 'immediate_replacement' = 'none';
        
        if (healthScore < 0.3) {
          recommendedAction = 'immediate_replacement';
        } else if (healthScore < 0.5) {
          recommendedAction = 'prepare_succession';
        } else if (healthScore < 0.8) {
          recommendedAction = 'monitor';
        }

        healthReports.push({
          leaderId: leader.droneId,
          healthScore,
          issues,
          recommendedAction
        });
      }
    }

    return healthReports;
  }

  /**
   * Get current hierarchy structure
   */
  getHierarchy(): LeadershipHierarchy {
    return JSON.parse(JSON.stringify(this.hierarchy)); // Deep copy
  }

  /**
   * Get leader for a specific drone
   */
  getLeaderForDrone(droneId: string): string | null {
    for (const [leaderId, subordinates] of this.hierarchy.commandStructure) {
      if (subordinates.includes(droneId)) {
        return leaderId;
      }
    }
    return null;
  }

  /**
   * Get subordinates for a leader
   */
  getSubordinates(leaderId: string): string[] {
    return this.hierarchy.commandStructure.get(leaderId) || [];
  }
}

// ============================================================================
// MAIN LEADERSHIP COORDINATOR
// ============================================================================

export class SwarmLeadershipCoordinator {
  private electionManager: typeof LeaderElectionManager;
  private hierarchyManager: HierarchicalCommandManager;
  private communicationManager: SwarmCommunicationManager;
  private currentElections: Map<string, any> = new Map();
  private leadershipMonitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    swarmId: string,
    communicationManager: SwarmCommunicationManager
  ) {
    this.electionManager = LeaderElectionManager;
    this.hierarchyManager = new HierarchicalCommandManager(swarmId, communicationManager);
    this.communicationManager = communicationManager;
  }

  /**
   * Initialize leadership for swarm
   */
  initializeLeadership(
    swarm: Swarm,
    drones: Drone[]
  ): LeadershipHierarchy {
    // Establish initial hierarchy
    const hierarchy = this.hierarchyManager.establishHierarchy(swarm, drones);
    
    // Start monitoring leadership health
    this.startLeadershipMonitoring(swarm, drones);
    
    return hierarchy;
  }

  /**
   * Trigger leader election
   */
  async triggerElection(
    swarm: Swarm,
    drones: Drone[],
    trigger: 'leader_failure' | 'performance_degradation' | 'network_partition' | 'manual'
  ): Promise<string | null> {
    const activeDrones = drones.filter(d => 
      swarm.drones.includes(d.id) && d.status === 'active'
    );

    if (activeDrones.length === 0) {
      return null;
    }

    // Initiate election
    const election = this.electionManager.initiateElection(swarm, activeDrones, trigger);
    this.currentElections.set(election.electionId, election);

    // Broadcast election initiation
    await this.communicationManager.sendEmergencyAlert(
      'leader_election',
      'high',
      {
        electionId: election.electionId,
        candidates: election.candidates.map(c => ({
          droneId: c.droneId,
          score: c.score
        })),
        votingDeadline: election.votingDeadline.toISOString(),
        trigger
      }
    );

    // Collect votes (simplified - in production would handle async voting)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate voting results
        const votes = this.simulateVoting(election, activeDrones);
        const results = this.electionManager.processElectionResults(
          election.electionId,
          votes,
          activeDrones.length
        );

        this.currentElections.delete(election.electionId);

        if (results.validElection && results.winner) {
          // Handle leadership transition
          this.hierarchyManager.handleLeadershipTransition(
            swarm.leadDrone || '',
            results.winner,
            'election'
          ).then(() => {
            resolve(results.winner);
          });
        } else {
          console.warn('Election failed or invalid');
          resolve(null);
        }
      }, 10000); // 10 second simulation
    });
  }

  private simulateVoting(
    election: any,
    voters: Drone[]
  ): Array<{
    voterId: string;
    candidateId: string;
    confidence: number;
    timestamp: Date;
  }> {
    const votes: Array<{
      voterId: string;
      candidateId: string;
      confidence: number;
      timestamp: Date;
    }> = [];

    for (const voter of voters) {
      // Simulate intelligent voting based on voter's assessment
      const bestCandidate = election.candidates.reduce((best: any, current: any) => 
        current.score > best.score ? current : best
      );

      votes.push({
        voterId: voter.id,
        candidateId: bestCandidate.droneId,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0 confidence
        timestamp: new Date()
      });
    }

    return votes;
  }

  /**
   * Start leadership health monitoring
   */
  private startLeadershipMonitoring(swarm: Swarm, drones: Drone[]): void {
    if (this.leadershipMonitoringInterval) {
      clearInterval(this.leadershipMonitoringInterval);
    }

    this.leadershipMonitoringInterval = setInterval(() => {
      const healthReports = this.hierarchyManager.monitorLeadershipHealth(drones);
      
      for (const report of healthReports) {
        if (report.recommendedAction === 'immediate_replacement') {
          console.warn(`Immediate leadership replacement needed for ${report.leaderId}`);
          this.triggerElection(swarm, drones, 'leader_failure');
        } else if (report.recommendedAction === 'prepare_succession') {
          console.warn(`Preparing succession for leader ${report.leaderId}`);
          // Could pre-select backup leaders here
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop leadership monitoring
   */
  stopLeadershipMonitoring(): void {
    if (this.leadershipMonitoringInterval) {
      clearInterval(this.leadershipMonitoringInterval);
      this.leadershipMonitoringInterval = null;
    }
  }

  /**
   * Get current leadership status
   */
  getLeadershipStatus(): {
    hierarchy: LeadershipHierarchy;
    activeElections: any[];
    healthReports: any[];
  } {
    return {
      hierarchy: this.hierarchyManager.getHierarchy(),
      activeElections: Array.from(this.currentElections.values()),
      healthReports: [] // Would get from monitoring
    };
  }
}

export default {
  LeaderElectionManager,
  HierarchicalCommandManager,
  SwarmLeadershipCoordinator
};