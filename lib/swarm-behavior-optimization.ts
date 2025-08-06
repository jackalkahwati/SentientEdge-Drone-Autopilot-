/**
 * Swarm Behavior Optimization System
 * 
 * Implements intelligent behavior adaptation and optimization algorithms
 * that dynamically adjust swarm parameters, formations, and coordination
 * strategies based on mission requirements, environmental conditions,
 * and performance metrics.
 */

import {
  Swarm,
  SwarmParameters,
  SwarmFormation,
  SwarmTaskType,
  Drone,
  Mission,
  EnvironmentalData,
  Vector3D,
  SwarmIntelligenceMetrics
} from './types';

import {
  Vector3,
  EmergentBehaviorAlgorithm,
  SwarmCoordinationEngine
} from './swarm-algorithms';

import { FormationTemplates } from './formation-manager';

// ============================================================================
// BEHAVIOR OPTIMIZATION ENGINE
// ============================================================================

export interface BehaviorProfile {
  id: string;
  name: string;
  missionTypes: SwarmTaskType[];
  optimalParameters: SwarmParameters;
  formationPreferences: SwarmFormation[];
  environmentalAdaptations: {
    wind: { threshold: number; parameterAdjustments: Partial<SwarmParameters> };
    visibility: { threshold: number; parameterAdjustments: Partial<SwarmParameters> };
    terrain: { type: string; parameterAdjustments: Partial<SwarmParameters> };
  };
  performanceWeights: {
    cohesion: number;
    efficiency: number;
    safety: number;
    missionSuccess: number;
  };
}

export class SwarmBehaviorOptimizer {
  private behaviorProfiles: Map<string, BehaviorProfile> = new Map();
  private performanceHistory: Map<string, PerformanceRecord[]> = new Map();
  private optimizationStrategies: Map<string, OptimizationStrategy> = new Map();

  constructor() {
    this.initializeBehaviorProfiles();
    this.initializeOptimizationStrategies();
  }

  /**
   * Optimize swarm behavior for specific mission type
   */
  optimizeForMission(
    swarm: Swarm,
    missionType: SwarmTaskType,
    environmentalConditions: EnvironmentalData | null,
    constraints: OptimizationConstraints = {}
  ): {
    optimizedParameters: SwarmParameters;
    recommendedFormation: SwarmFormation;
    behaviorAdjustments: BehaviorAdjustment[];
    expectedPerformance: PerformanceProjection;
  } {
    // Select appropriate behavior profile
    const profile = this.selectBehaviorProfile(missionType, environmentalConditions);
    
    // Get performance history for learning
    const history = this.performanceHistory.get(swarm.id) || [];
    
    // Apply optimization strategy
    const strategy = this.optimizationStrategies.get(missionType) || this.getDefaultStrategy();
    const optimization = strategy.optimize(
      swarm.parameters,
      profile,
      environmentalConditions,
      history,
      constraints
    );
    
    // Calculate behavior adjustments
    const behaviorAdjustments = this.calculateBehaviorAdjustments(
      swarm.parameters,
      optimization.parameters,
      missionType
    );
    
    // Project performance
    const expectedPerformance = this.projectPerformance(
      optimization.parameters,
      optimization.formation,
      missionType,
      environmentalConditions
    );

    return {
      optimizedParameters: optimization.parameters,
      recommendedFormation: optimization.formation,
      behaviorAdjustments,
      expectedPerformance
    };
  }

  /**
   * Adaptive parameter tuning during mission execution
   */
  adaptiveTuning(
    swarm: Swarm,
    currentMetrics: SwarmIntelligenceMetrics,
    missionType: SwarmTaskType,
    targetPerformance: { [key: string]: number }
  ): {
    parameterAdjustments: Partial<SwarmParameters>;
    adjustmentReason: string;
    expectedImprovement: number;
  } {
    // Analyze current performance vs targets
    const performanceGaps = this.analyzePerformanceGaps(currentMetrics, targetPerformance);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(currentMetrics, performanceGaps);
    
    // Generate parameter adjustments
    const adjustments = this.generateParameterAdjustments(
      swarm.parameters,
      bottlenecks,
      missionType
    );

    // Estimate improvement
    const expectedImprovement = this.estimateImprovement(
      currentMetrics,
      adjustments,
      missionType
    );

    return {
      parameterAdjustments: adjustments,
      adjustmentReason: bottlenecks.map(b => b.type).join(', '),
      expectedImprovement
    };
  }

  /**
   * Multi-objective optimization considering multiple performance criteria
   */
  multiObjectiveOptimization(
    swarm: Swarm,
    objectives: Array<{
      name: string;
      weight: number;
      target: number;
      constraint?: { min?: number; max?: number };
    }>,
    missionType: SwarmTaskType
  ): {
    paretoOptimalSolutions: Array<{
      parameters: SwarmParameters;
      objectiveValues: { [key: string]: number };
      dominanceRank: number;
    }>;
    recommendedSolution: SwarmParameters;
    tradeoffAnalysis: { [objective: string]: number };
  } {
    // Generate candidate solutions
    const candidates = this.generateCandidateSolutions(swarm.parameters, 50);
    
    // Evaluate each candidate against objectives
    const evaluatedCandidates = candidates.map(params => ({
      parameters: params,
      objectiveValues: this.evaluateObjectives(params, objectives, missionType),
      dominanceRank: 0
    }));

    // Perform non-dominated sorting (NSGA-II style)
    const paretoFronts = this.nonDominatedSorting(evaluatedCandidates, objectives);
    
    // Select recommended solution from first Pareto front
    const firstFront = paretoFronts[0] || [];
    const recommendedSolution = this.selectPreferredSolution(firstFront, objectives);
    
    // Analyze tradeoffs
    const tradeoffAnalysis = this.analyzeTradeoffs(firstFront, objectives);

    return {
      paretoOptimalSolutions: firstFront,
      recommendedSolution: recommendedSolution.parameters,
      tradeoffAnalysis
    };
  }

  /**
   * Formation optimization for specific operational scenarios
   */
  optimizeFormation(
    swarm: Swarm,
    scenario: OperationalScenario,
    drones: Drone[],
    constraints: FormationConstraints = {}
  ): {
    optimalFormation: SwarmFormation;
    formationParameters: SwarmParameters;
    positionAssignments: Array<{ droneId: string; position: Vector3D; role: string }>;
    formationMetrics: FormationMetrics;
  } {
    const swarmDrones = drones.filter(d => swarm.drones.includes(d.id));
    
    // Evaluate formation candidates
    const formationCandidates = this.getFormationCandidates(scenario, swarmDrones.length);
    const evaluations = formationCandidates.map(formation => 
      this.evaluateFormation(formation, scenario, swarmDrones, constraints)
    );
    
    // Select optimal formation
    const optimalEvaluation = evaluations.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );
    
    // Generate position assignments
    const positionAssignments = this.generatePositionAssignments(
      optimalEvaluation.formation,
      swarmDrones,
      scenario
    );
    
    return {
      optimalFormation: optimalEvaluation.formation,
      formationParameters: optimalEvaluation.parameters,
      positionAssignments,
      formationMetrics: optimalEvaluation.metrics
    };
  }

  /**
   * Swarm size optimization
   */
  optimizeSwarmSize(
    mission: Mission,
    availableDrones: Drone[],
    missionType: SwarmTaskType,
    constraints: SizeOptimizationConstraints = {}
  ): {
    optimalSize: number;
    selectedDrones: Drone[];
    sizeJustification: string;
    performanceProjection: PerformanceProjection;
  } {
    const minSize = constraints.minSize || 2;
    const maxSize = constraints.maxSize || Math.min(availableDrones.length, 20);
    
    const sizeEvaluations: Array<{
      size: number;
      drones: Drone[];
      performance: PerformanceProjection;
      costBenefit: number;
    }> = [];

    // Evaluate different swarm sizes
    for (let size = minSize; size <= maxSize; size++) {
      const selectedDrones = this.selectOptimalDrones(availableDrones, size, missionType);
      const performance = this.projectPerformanceForSize(selectedDrones, missionType, mission);
      const costBenefit = this.calculateCostBenefitRatio(performance, size, constraints);
      
      sizeEvaluations.push({
        size,
        drones: selectedDrones,
        performance,
        costBenefit
      });
    }

    // Find optimal size based on diminishing returns
    const optimalEvaluation = this.findOptimalSize(sizeEvaluations, constraints);
    
    const sizeJustification = this.generateSizeJustification(
      optimalEvaluation,
      sizeEvaluations,
      missionType
    );

    return {
      optimalSize: optimalEvaluation.size,
      selectedDrones: optimalEvaluation.drones,
      sizeJustification,
      performanceProjection: optimalEvaluation.performance
    };
  }

  private selectBehaviorProfile(
    missionType: SwarmTaskType,
    environmentalConditions: EnvironmentalData | null
  ): BehaviorProfile {
    // Find profiles that support this mission type
    const compatibleProfiles = Array.from(this.behaviorProfiles.values())
      .filter(profile => profile.missionTypes.includes(missionType));
    
    if (compatibleProfiles.length === 0) {
      return this.getDefaultProfile();
    }
    
    if (compatibleProfiles.length === 1) {
      return compatibleProfiles[0];
    }
    
    // Select best profile based on environmental conditions
    if (environmentalConditions) {
      return this.selectEnvironmentallyOptimalProfile(compatibleProfiles, environmentalConditions);
    }
    
    return compatibleProfiles[0];
  }

  private selectEnvironmentallyOptimalProfile(
    profiles: BehaviorProfile[],
    conditions: EnvironmentalData
  ): BehaviorProfile {
    let bestProfile = profiles[0];
    let bestScore = 0;

    for (const profile of profiles) {
      let score = 1.0;
      
      // Wind adaptation
      if (conditions.wind.speed > profile.environmentalAdaptations.wind.threshold) {
        score *= 0.8; // Penalty for profiles not well-suited to wind
      } else {
        score *= 1.2; // Bonus for wind-appropriate profiles
      }
      
      // Visibility adaptation
      if (conditions.visibility < profile.environmentalAdaptations.visibility.threshold) {
        score *= 0.8; // Penalty for profiles not suited to low visibility
      } else {
        score *= 1.1; // Bonus for visibility-appropriate profiles
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestProfile = profile;
      }
    }

    return bestProfile;
  }

  private calculateBehaviorAdjustments(
    currentParams: SwarmParameters,
    optimizedParams: SwarmParameters,
    missionType: SwarmTaskType
  ): BehaviorAdjustment[] {
    const adjustments: BehaviorAdjustment[] = [];
    
    const paramKeys = Object.keys(currentParams) as Array<keyof SwarmParameters>;
    
    for (const key of paramKeys) {
      const currentValue = currentParams[key];
      const optimizedValue = optimizedParams[key];
      
      if (typeof currentValue === 'number' && typeof optimizedValue === 'number') {
        const difference = Math.abs(optimizedValue - currentValue);
        const percentChange = (difference / currentValue) * 100;
        
        if (percentChange > 5) { // Only significant changes
          adjustments.push({
            parameter: key,
            currentValue,
            optimizedValue,
            change: optimizedValue - currentValue,
            percentChange,
            reason: this.getAdjustmentReason(key, currentValue, optimizedValue, missionType)
          });
        }
      }
    }
    
    return adjustments;
  }

  private getAdjustmentReason(
    parameter: keyof SwarmParameters,
    current: number,
    optimized: number,
    missionType: SwarmTaskType
  ): string {
    const increase = optimized > current;
    
    const reasons: Record<keyof SwarmParameters, { increase: string; decrease: string }> = {
      spacing: {
        increase: 'Increased spacing for better coverage and reduced collision risk',
        decrease: 'Reduced spacing for tighter coordination and communication'
      },
      altitude: {
        increase: 'Higher altitude for better surveillance range and obstacle avoidance',
        decrease: 'Lower altitude for better target resolution and stealth'
      },
      speed: {
        increase: 'Increased speed for faster mission completion and threat response',
        decrease: 'Reduced speed for better precision and energy conservation'
      },
      cohesion: {
        increase: 'Enhanced cohesion for better swarm coordination',
        decrease: 'Reduced cohesion for more independent operation'
      },
      separation: {
        increase: 'Increased separation for safety and independent maneuvering',
        decrease: 'Reduced separation for tighter formation and coordination'
      },
      alignment: {
        increase: 'Improved alignment for coordinated movement',
        decrease: 'Reduced alignment for more flexible individual responses'
      },
      adaptiveThreshold: {
        increase: 'Higher adaptive threshold for more stable behavior',
        decrease: 'Lower adaptive threshold for more responsive adaptation'
      },
      collisionAvoidanceRadius: {
        increase: 'Expanded safety margins for collision avoidance',
        decrease: 'Reduced safety margins for closer operations'
      },
      communicationRange: {
        increase: 'Extended communication range for better coordination',
        decrease: 'Reduced communication range for focused local coordination'
      }
    };

    return reasons[parameter]?.[increase ? 'increase' : 'decrease'] || 'Parameter optimization';
  }

  private projectPerformance(
    parameters: SwarmParameters,
    formation: SwarmFormation,
    missionType: SwarmTaskType,
    environmentalConditions: EnvironmentalData | null
  ): PerformanceProjection {
    // Base performance estimation
    let cohesion = 0.8;
    let efficiency = 0.7;
    let safety = 0.9;
    let missionSuccess = 0.75;

    // Formation impact
    const formationBonuses = {
      grid: { efficiency: 0.1, cohesion: 0.05 },
      circle: { cohesion: 0.15, safety: 0.05 },
      line: { efficiency: 0.05, missionSuccess: 0.1 },
      vee: { missionSuccess: 0.15, efficiency: 0.05 },
      diamond: { safety: 0.1, cohesion: 0.1 },
      wedge: { missionSuccess: 0.1, safety: 0.05 },
      echelon: { efficiency: 0.08, missionSuccess: 0.07 },
      column: { efficiency: 0.05, cohesion: 0.1 },
      custom: { efficiency: 0.02 }
    };

    const bonus = formationBonuses[formation] || {};
    cohesion += bonus.cohesion || 0;
    efficiency += bonus.efficiency || 0;
    safety += bonus.safety || 0;
    missionSuccess += bonus.missionSuccess || 0;

    // Mission type impact
    const missionBonuses = {
      surveillance: { efficiency: 0.1 },
      reconnaissance: { missionSuccess: 0.1 },
      search_and_rescue: { safety: 0.05, missionSuccess: 0.05 },
      patrol: { efficiency: 0.05, cohesion: 0.05 },
      escort: { safety: 0.15 },
      formation_flight: { cohesion: 0.2 },
      area_denial: { missionSuccess: 0.1 },
      perimeter_defense: { safety: 0.1 },
      supply_delivery: { efficiency: 0.1 },
      communication_relay: { efficiency: 0.05 }
    };

    const missionBonus = missionBonuses[missionType] || {};
    cohesion += missionBonus.cohesion || 0;
    efficiency += missionBonus.efficiency || 0;
    safety += missionBonus.safety || 0;
    missionSuccess += missionBonus.missionSuccess || 0;

    // Environmental impact
    if (environmentalConditions) {
      if (environmentalConditions.wind.speed > 20) {
        cohesion *= 0.9;
        safety *= 0.95;
      }
      if (environmentalConditions.visibility < 1) {
        efficiency *= 0.9;
        safety *= 0.9;
      }
    }

    // Parameter impact
    cohesion += (parameters.cohesion - 0.7) * 0.3;
    efficiency += (parameters.speed - 15) / 30 * 0.2;
    safety += (parameters.collisionAvoidanceRadius - 20) / 20 * 0.1;

    // Clamp values
    cohesion = Math.max(0, Math.min(1, cohesion));
    efficiency = Math.max(0, Math.min(1, efficiency));
    safety = Math.max(0, Math.min(1, safety));
    missionSuccess = Math.max(0, Math.min(1, missionSuccess));

    return {
      cohesion,
      efficiency,
      safety,
      missionSuccess,
      overall: (cohesion + efficiency + safety + missionSuccess) / 4,
      confidence: 0.8 // Confidence in the projection
    };
  }

  private analyzePerformanceGaps(
    currentMetrics: SwarmIntelligenceMetrics,
    targets: { [key: string]: number }
  ): { [key: string]: number } {
    const gaps: { [key: string]: number } = {};
    
    if (targets.cohesion !== undefined) {
      gaps.cohesion = targets.cohesion - currentMetrics.cohesion;
    }
    if (targets.efficiency !== undefined) {
      gaps.efficiency = targets.efficiency - currentMetrics.efficiency;
    }
    if (targets.adaptability !== undefined) {
      gaps.adaptability = targets.adaptability - currentMetrics.adaptability;
    }
    if (targets.resilience !== undefined) {
      gaps.resilience = targets.resilience - currentMetrics.resilience;
    }
    
    return gaps;
  }

  private identifyBottlenecks(
    metrics: SwarmIntelligenceMetrics,
    gaps: { [key: string]: number }
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Identify significant negative gaps
    for (const [metric, gap] of Object.entries(gaps)) {
      if (gap > 0.1) { // 10% gap threshold
        bottlenecks.push({
          type: metric,
          severity: Math.min(gap, 1.0),
          currentValue: (metrics as any)[metric] || 0,
          targetValue: (metrics as any)[metric] + gap
        });
      }
    }
    
    // Sort by severity
    return bottlenecks.sort((a, b) => b.severity - a.severity);
  }

  private generateParameterAdjustments(
    currentParams: SwarmParameters,
    bottlenecks: Bottleneck[],
    missionType: SwarmTaskType
  ): Partial<SwarmParameters> {
    const adjustments: Partial<SwarmParameters> = {};
    
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'cohesion':
          adjustments.cohesion = Math.min(1.0, currentParams.cohesion + bottleneck.severity * 0.2);
          adjustments.communicationRange = currentParams.communicationRange * (1 + bottleneck.severity * 0.1);
          break;
          
        case 'efficiency':
          adjustments.speed = Math.min(30, currentParams.speed + bottleneck.severity * 5);
          adjustments.spacing = Math.max(10, currentParams.spacing - bottleneck.severity * 5);
          break;
          
        case 'adaptability':
          adjustments.adaptiveThreshold = Math.max(0.1, currentParams.adaptiveThreshold - bottleneck.severity * 0.1);
          break;
          
        case 'resilience':
          adjustments.separation = Math.min(30, currentParams.separation + bottleneck.severity * 5);
          adjustments.collisionAvoidanceRadius = Math.min(50, currentParams.collisionAvoidanceRadius + bottleneck.severity * 10);
          break;
      }
    }
    
    return adjustments;
  }

  private estimateImprovement(
    currentMetrics: SwarmIntelligenceMetrics,
    adjustments: Partial<SwarmParameters>,
    missionType: SwarmTaskType
  ): number {
    // Simplified improvement estimation
    let improvementScore = 0;
    let adjustmentCount = 0;
    
    for (const [param, value] of Object.entries(adjustments)) {
      if (typeof value === 'number') {
        // Estimate improvement based on parameter change magnitude
        improvementScore += Math.min(0.2, Math.abs(value) * 0.1); // Max 20% improvement per parameter
        adjustmentCount++;
      }
    }
    
    return adjustmentCount > 0 ? improvementScore / adjustmentCount : 0;
  }

  private generateCandidateSolutions(
    baseParams: SwarmParameters,
    count: number
  ): SwarmParameters[] {
    const candidates: SwarmParameters[] = [];
    
    for (let i = 0; i < count; i++) {
      const candidate = { ...baseParams };
      
      // Add random variations
      candidate.spacing *= (0.8 + Math.random() * 0.4); // ±20%
      candidate.speed *= (0.8 + Math.random() * 0.4);
      candidate.cohesion = Math.max(0, Math.min(1, candidate.cohesion + (Math.random() - 0.5) * 0.4));
      candidate.separation *= (0.8 + Math.random() * 0.4);
      candidate.alignment = Math.max(0, Math.min(1, candidate.alignment + (Math.random() - 0.5) * 0.4));
      
      candidates.push(candidate);
    }
    
    return candidates;
  }

  private evaluateObjectives(
    parameters: SwarmParameters,
    objectives: Array<{ name: string; weight: number; target: number }>,
    missionType: SwarmTaskType
  ): { [key: string]: number } {
    const values: { [key: string]: number } = {};
    
    // Project performance with these parameters
    const performance = this.projectPerformance(parameters, 'grid', missionType, null);
    
    for (const objective of objectives) {
      switch (objective.name) {
        case 'cohesion':
          values[objective.name] = performance.cohesion;
          break;
        case 'efficiency':
          values[objective.name] = performance.efficiency;
          break;
        case 'safety':
          values[objective.name] = performance.safety;
          break;
        case 'mission_success':
          values[objective.name] = performance.missionSuccess;
          break;
        default:
          values[objective.name] = 0.5; // Default neutral value
      }
    }
    
    return values;
  }

  private nonDominatedSorting(
    candidates: Array<{
      parameters: SwarmParameters;
      objectiveValues: { [key: string]: number };
      dominanceRank: number;
    }>,
    objectives: Array<{ name: string; weight: number; target: number }>
  ): Array<Array<typeof candidates[0]>> {
    const fronts: Array<Array<typeof candidates[0]>> = [];
    
    // Simple non-dominated sorting implementation
    for (let i = 0; i < candidates.length; i++) {
      candidates[i].dominanceRank = 0;
      
      for (let j = 0; j < candidates.length; j++) {
        if (i !== j && this.dominates(candidates[j], candidates[i], objectives)) {
          candidates[i].dominanceRank++;
        }
      }
    }
    
    // Group by rank
    const rankGroups = new Map<number, Array<typeof candidates[0]>>();
    for (const candidate of candidates) {
      if (!rankGroups.has(candidate.dominanceRank)) {
        rankGroups.set(candidate.dominanceRank, []);
      }
      rankGroups.get(candidate.dominanceRank)!.push(candidate);
    }
    
    // Convert to fronts array
    const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);
    for (const rank of sortedRanks) {
      fronts.push(rankGroups.get(rank)!);
    }
    
    return fronts;
  }

  private dominates(
    a: { objectiveValues: { [key: string]: number } },
    b: { objectiveValues: { [key: string]: number } },
    objectives: Array<{ name: string }>
  ): boolean {
    let allBetterOrEqual = true;
    let atLeastOneBetter = false;
    
    for (const objective of objectives) {
      const aValue = a.objectiveValues[objective.name] || 0;
      const bValue = b.objectiveValues[objective.name] || 0;
      
      if (aValue < bValue) {
        allBetterOrEqual = false;
        break;
      } else if (aValue > bValue) {
        atLeastOneBetter = true;
      }
    }
    
    return allBetterOrEqual && atLeastOneBetter;
  }

  private selectPreferredSolution(
    frontCandidates: Array<{
      parameters: SwarmParameters;
      objectiveValues: { [key: string]: number };
    }>,
    objectives: Array<{ name: string; weight: number }>
  ): typeof frontCandidates[0] {
    if (frontCandidates.length === 0) {
      throw new Error('No candidates in Pareto front');
    }
    
    // Use weighted sum to select preferred solution
    let bestCandidate = frontCandidates[0];
    let bestScore = 0;
    
    for (const candidate of frontCandidates) {
      let weightedScore = 0;
      let totalWeight = 0;
      
      for (const objective of objectives) {
        weightedScore += (candidate.objectiveValues[objective.name] || 0) * objective.weight;
        totalWeight += objective.weight;
      }
      
      const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestCandidate = candidate;
      }
    }
    
    return bestCandidate;
  }

  private analyzeTradeoffs(
    frontCandidates: Array<{
      objectiveValues: { [key: string]: number };
    }>,
    objectives: Array<{ name: string }>
  ): { [objective: string]: number } {
    const tradeoffs: { [objective: string]: number } = {};
    
    for (const objective of objectives) {
      const values = frontCandidates.map(c => c.objectiveValues[objective.name] || 0);
      const range = Math.max(...values) - Math.min(...values);
      tradeoffs[objective.name] = range; // Higher range indicates more tradeoff potential
    }
    
    return tradeoffs;
  }

  private getFormationCandidates(
    scenario: OperationalScenario,
    droneCount: number
  ): SwarmFormation[] {
    const allFormations: SwarmFormation[] = [
      'grid', 'circle', 'line', 'vee', 'diamond', 'wedge', 'echelon', 'column'
    ];
    
    // Filter formations based on scenario and drone count
    return allFormations.filter(formation => {
      const template = FormationTemplates.getFormationTemplate(formation, droneCount);
      return droneCount >= template.minDrones && droneCount <= template.maxDrones;
    });
  }

  private evaluateFormation(
    formation: SwarmFormation,
    scenario: OperationalScenario,
    drones: Drone[],
    constraints: FormationConstraints
  ): FormationEvaluation {
    const template = FormationTemplates.getFormationTemplate(formation, drones.length);
    
    // Score formation based on scenario requirements
    let coverageScore = 0.5;
    let coordinationScore = 0.5;
    let safetyScore = 0.5;
    let efficiencyScore = 0.5;
    
    switch (formation) {
      case 'grid':
        coverageScore = 0.9;
        coordinationScore = 0.7;
        break;
      case 'circle':
        coordinationScore = 0.9;
        safetyScore = 0.8;
        break;
      case 'line':
        coverageScore = 0.8;
        efficiencyScore = 0.7;
        break;
      case 'vee':
        efficiencyScore = 0.8;
        coordinationScore = 0.7;
        break;
      case 'diamond':
        safetyScore = 0.9;
        coordinationScore = 0.8;
        break;
    }
    
    // Adjust scores based on scenario
    if (scenario.primaryObjective === 'surveillance') {
      coverageScore *= 1.2;
    } else if (scenario.primaryObjective === 'protection') {
      safetyScore *= 1.2;
    }
    
    const overallScore = (coverageScore + coordinationScore + safetyScore + efficiencyScore) / 4;
    
    return {
      formation,
      parameters: template.parameters,
      overallScore,
      metrics: {
        coverage: coverageScore,
        coordination: coordinationScore,
        safety: safetyScore,
        efficiency: efficiencyScore
      }
    };
  }

  private generatePositionAssignments(
    formation: SwarmFormation,
    drones: Drone[],
    scenario: OperationalScenario
  ): Array<{ droneId: string; position: Vector3D; role: string }> {
    const template = FormationTemplates.getFormationTemplate(formation, drones.length);
    const assignments: Array<{ droneId: string; position: Vector3D; role: string }> = [];
    
    // Assign roles based on drone capabilities
    const sortedDrones = drones.slice().sort((a, b) => {
      // Prioritize by battery, signal, and mission count
      const scoreA = a.battery + a.signal + a.missionCount * 5;
      const scoreB = b.battery + b.signal + b.missionCount * 5;
      return scoreB - scoreA;
    });
    
    for (let i = 0; i < Math.min(sortedDrones.length, template.positions.length); i++) {
      const drone = sortedDrones[i];
      const position = template.positions[i];
      
      let role = 'follower';
      if (i === 0) role = 'leader';
      else if (i < 3) role = 'sub_leader';
      else if (drone.type === 'surveillance') role = 'observer';
      else if (drone.type === 'attack') role = 'guardian';
      
      assignments.push({
        droneId: drone.id,
        position,
        role
      });
    }
    
    return assignments;
  }

  private selectOptimalDrones(
    availableDrones: Drone[],
    size: number,
    missionType: SwarmTaskType
  ): Drone[] {
    // Score drones based on suitability for mission type
    const scoredDrones = availableDrones.map(drone => ({
      drone,
      score: this.calculateDroneSuitabilityScore(drone, missionType)
    }));
    
    // Sort by score and select top drones
    scoredDrones.sort((a, b) => b.score - a.score);
    
    return scoredDrones.slice(0, size).map(sd => sd.drone);
  }

  private calculateDroneSuitabilityScore(drone: Drone, missionType: SwarmTaskType): number {
    let score = 0;
    
    // Base score from drone status
    score += drone.battery * 0.3; // 30% weight for battery
    score += drone.signal * 0.2; // 20% weight for signal
    score += Math.min(drone.missionCount / 10, 5) * 0.1; // Experience bonus
    
    // Status penalty/bonus
    if (drone.status === 'active') score += 20;
    else if (drone.status === 'idle') score += 30;
    else if (drone.status === 'maintenance') score -= 50;
    else if (drone.status === 'offline') score -= 100;
    
    // Mission type compatibility
    const typeCompatibility = {
      surveillance: { surveillance: 1.0, recon: 0.8, multi: 0.7, attack: 0.3, transport: 0.2 },
      reconnaissance: { recon: 1.0, surveillance: 0.8, multi: 0.7, attack: 0.4, transport: 0.3 },
      search_and_rescue: { transport: 1.0, multi: 0.9, surveillance: 0.7, recon: 0.6, attack: 0.3 },
      patrol: { surveillance: 0.9, recon: 0.8, multi: 0.8, attack: 0.6, transport: 0.4 },
      escort: { attack: 1.0, multi: 0.8, surveillance: 0.6, recon: 0.5, transport: 0.4 }
    };
    
    const compatibility = typeCompatibility[missionType as keyof typeof typeCompatibility];
    if (compatibility) {
      score += (compatibility[drone.type as keyof typeof compatibility] || 0.5) * 30;
    }
    
    return score;
  }

  private projectPerformanceForSize(
    drones: Drone[],
    missionType: SwarmTaskType,
    mission: Mission
  ): PerformanceProjection {
    const size = drones.length;
    
    // Base performance increases with size but with diminishing returns
    const sizeEfficiency = Math.log(size + 1) / Math.log(11); // Normalized to 0-1 for size 1-10
    
    let cohesion = 0.5 + sizeEfficiency * 0.3;
    let efficiency = 0.6 + sizeEfficiency * 0.2;
    let safety = 0.7 + Math.min(size / 10, 1) * 0.2; // Safety improves with redundancy
    let missionSuccess = 0.6 + sizeEfficiency * 0.3;
    
    // Apply mission type modifiers
    const missionModifiers = {
      surveillance: { efficiency: 1.1, missionSuccess: 1.2 },
      reconnaissance: { efficiency: 1.2, safety: 0.9 },
      search_and_rescue: { safety: 1.1, missionSuccess: 1.1 },
      patrol: { efficiency: 1.1, cohesion: 1.1 },
      escort: { safety: 1.2, cohesion: 1.1 }
    };
    
    const modifier = missionModifiers[missionType as keyof typeof missionModifiers] || {};
    cohesion *= modifier.cohesion || 1;
    efficiency *= modifier.efficiency || 1;
    safety *= modifier.safety || 1;
    missionSuccess *= modifier.missionSuccess || 1;
    
    // Threat level impact
    const threatPenalty = mission.threatLevel * 0.05;
    safety *= (1 - threatPenalty);
    
    // Clamp values
    cohesion = Math.max(0, Math.min(1, cohesion));
    efficiency = Math.max(0, Math.min(1, efficiency));
    safety = Math.max(0, Math.min(1, safety));
    missionSuccess = Math.max(0, Math.min(1, missionSuccess));
    
    return {
      cohesion,
      efficiency,
      safety,
      missionSuccess,
      overall: (cohesion + efficiency + safety + missionSuccess) / 4,
      confidence: 0.7
    };
  }

  private calculateCostBenefitRatio(
    performance: PerformanceProjection,
    size: number,
    constraints: SizeOptimizationConstraints
  ): number {
    const benefit = performance.overall;
    const cost = size / (constraints.maxSize || 20); // Normalized cost
    
    return benefit / Math.max(cost, 0.1); // Avoid division by zero
  }

  private findOptimalSize(
    evaluations: Array<{
      size: number;
      drones: Drone[];
      performance: PerformanceProjection;
      costBenefit: number;
    }>,
    constraints: SizeOptimizationConstraints
  ): typeof evaluations[0] {
    // Find size with best cost-benefit ratio, considering diminishing returns
    let bestEvaluation = evaluations[0];
    let bestScore = 0;
    
    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];
      let score = evaluation.costBenefit;
      
      // Check for diminishing returns
      if (i > 0) {
        const previousPerformance = evaluations[i - 1].performance.overall;
        const currentPerformance = evaluation.performance.overall;
        const marginalImprovement = currentPerformance - previousPerformance;
        
        // Penalize if marginal improvement is too small
        if (marginalImprovement < 0.05) {
          score *= 0.8; // 20% penalty for low marginal improvement
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestEvaluation = evaluation;
      }
    }
    
    return bestEvaluation;
  }

  private generateSizeJustification(
    optimal: {
      size: number;
      performance: PerformanceProjection;
      costBenefit: number;
    },
    allEvaluations: Array<{
      size: number;
      performance: PerformanceProjection;
      costBenefit: number;
    }>,
    missionType: SwarmTaskType
  ): string {
    const reasons: string[] = [];
    
    reasons.push(`Optimal size of ${optimal.size} drones provides best cost-benefit ratio (${optimal.costBenefit.toFixed(2)})`);
    reasons.push(`Expected overall performance: ${(optimal.performance.overall * 100).toFixed(1)}%`);
    
    // Compare with other sizes
    const smallerSizes = allEvaluations.filter(e => e.size < optimal.size);
    const largerSizes = allEvaluations.filter(e => e.size > optimal.size);
    
    if (smallerSizes.length > 0) {
      const lastSmaller = smallerSizes[smallerSizes.length - 1];
      const improvement = (optimal.performance.overall - lastSmaller.performance.overall) * 100;
      reasons.push(`${improvement.toFixed(1)}% performance improvement over ${lastSmaller.size} drones`);
    }
    
    if (largerSizes.length > 0) {
      const nextLarger = largerSizes[0];
      const marginalGain = (nextLarger.performance.overall - optimal.performance.overall) * 100;
      reasons.push(`Diminishing returns: only ${marginalGain.toFixed(1)}% additional performance from ${nextLarger.size} drones`);
    }
    
    return reasons.join('. ');
  }

  private initializeBehaviorProfiles(): void {
    // Surveillance profile
    this.behaviorProfiles.set('surveillance', {
      id: 'surveillance',
      name: 'Surveillance Operations',
      missionTypes: ['surveillance', 'patrol'],
      optimalParameters: {
        spacing: 30,
        altitude: 150,
        speed: 12,
        cohesion: 0.6,
        separation: 25,
        alignment: 0.7,
        adaptiveThreshold: 0.4,
        collisionAvoidanceRadius: 25,
        communicationRange: 300
      },
      formationPreferences: ['grid', 'line', 'circle'],
      environmentalAdaptations: {
        wind: { threshold: 25, parameterAdjustments: { spacing: 35, cohesion: 0.7 } },
        visibility: { threshold: 1.0, parameterAdjustments: { spacing: 25, communicationRange: 250 } },
        terrain: { type: 'urban', parameterAdjustments: { altitude: 200, collisionAvoidanceRadius: 30 } }
      },
      performanceWeights: {
        cohesion: 0.2,
        efficiency: 0.3,
        safety: 0.2,
        missionSuccess: 0.3
      }
    });

    // Attack/Combat profile
    this.behaviorProfiles.set('combat', {
      id: 'combat',
      name: 'Combat Operations',
      missionTypes: ['escort', 'area_denial', 'perimeter_defense'],
      optimalParameters: {
        spacing: 20,
        altitude: 100,
        speed: 18,
        cohesion: 0.8,
        separation: 15,
        alignment: 0.9,
        adaptiveThreshold: 0.2,
        collisionAvoidanceRadius: 20,
        communicationRange: 200
      },
      formationPreferences: ['vee', 'diamond', 'wedge'],
      environmentalAdaptations: {
        wind: { threshold: 20, parameterAdjustments: { cohesion: 0.9, alignment: 0.95 } },
        visibility: { threshold: 0.5, parameterAdjustments: { spacing: 15, communicationRange: 150 } },
        terrain: { type: 'combat', parameterAdjustments: { altitude: 80, speed: 15 } }
      },
      performanceWeights: {
        cohesion: 0.3,
        efficiency: 0.2,
        safety: 0.3,
        missionSuccess: 0.2
      }
    });

    // Search and Rescue profile
    this.behaviorProfiles.set('search_rescue', {
      id: 'search_rescue',
      name: 'Search and Rescue',
      missionTypes: ['search_and_rescue'],
      optimalParameters: {
        spacing: 40,
        altitude: 120,
        speed: 15,
        cohesion: 0.7,
        separation: 30,
        alignment: 0.6,
        adaptiveThreshold: 0.3,
        collisionAvoidanceRadius: 35,
        communicationRange: 400
      },
      formationPreferences: ['grid', 'line', 'echelon'],
      environmentalAdaptations: {
        wind: { threshold: 30, parameterAdjustments: { spacing: 50, altitude: 150 } },
        visibility: { threshold: 0.8, parameterAdjustments: { spacing: 30, communicationRange: 300 } },
        terrain: { type: 'emergency', parameterAdjustments: { altitude: 100, adaptiveThreshold: 0.2 } }
      },
      performanceWeights: {
        cohesion: 0.15,
        efficiency: 0.35,
        safety: 0.25,
        missionSuccess: 0.25
      }
    });
  }

  private initializeOptimizationStrategies(): void {
    // Implement optimization strategies for different mission types
    this.optimizationStrategies.set('surveillance', new SurveillanceOptimizationStrategy());
    this.optimizationStrategies.set('reconnaissance', new ReconnaissanceOptimizationStrategy());
    this.optimizationStrategies.set('escort', new EscortOptimizationStrategy());
    // Add more strategies as needed
  }

  private getDefaultProfile(): BehaviorProfile {
    return {
      id: 'default',
      name: 'General Operations',
      missionTypes: ['formation_flight'],
      optimalParameters: {
        spacing: 25,
        altitude: 100,
        speed: 15,
        cohesion: 0.7,
        separation: 20,
        alignment: 0.8,
        adaptiveThreshold: 0.3,
        collisionAvoidanceRadius: 25,
        communicationRange: 200
      },
      formationPreferences: ['grid', 'vee'],
      environmentalAdaptations: {
        wind: { threshold: 25, parameterAdjustments: { cohesion: 0.8 } },
        visibility: { threshold: 1.0, parameterAdjustments: { spacing: 20 } },
        terrain: { type: 'general', parameterAdjustments: {} }
      },
      performanceWeights: {
        cohesion: 0.25,
        efficiency: 0.25,
        safety: 0.25,
        missionSuccess: 0.25
      }
    };
  }

  private getDefaultStrategy(): OptimizationStrategy {
    return new DefaultOptimizationStrategy();
  }
}

// ============================================================================
// OPTIMIZATION STRATEGIES
// ============================================================================

abstract class OptimizationStrategy {
  abstract optimize(
    currentParams: SwarmParameters,
    profile: BehaviorProfile,
    environmental: EnvironmentalData | null,
    history: PerformanceRecord[],
    constraints: OptimizationConstraints
  ): {
    parameters: SwarmParameters;
    formation: SwarmFormation;
  };
}

class SurveillanceOptimizationStrategy extends OptimizationStrategy {
  optimize(
    currentParams: SwarmParameters,
    profile: BehaviorProfile,
    environmental: EnvironmentalData | null,
    history: PerformanceRecord[],
    constraints: OptimizationConstraints
  ): { parameters: SwarmParameters; formation: SwarmFormation } {
    // Optimize for coverage and efficiency
    const optimizedParams = { ...profile.optimalParameters };
    
    // Adjust for environmental conditions
    if (environmental) {
      if (environmental.wind.speed > 20) {
        optimizedParams.spacing *= 1.2;
        optimizedParams.cohesion = Math.min(1.0, optimizedParams.cohesion + 0.1);
      }
      if (environmental.visibility < 1.0) {
        optimizedParams.communicationRange *= 0.9;
      }
    }
    
    // Learn from history
    if (history.length > 0) {
      const avgEfficiency = history.reduce((sum, r) => sum + r.efficiency, 0) / history.length;
      if (avgEfficiency < 0.7) {
        optimizedParams.speed *= 1.1; // Increase speed if efficiency is low
      }
    }
    
    return {
      parameters: optimizedParams,
      formation: 'grid' // Best for surveillance coverage
    };
  }
}

class ReconnaissanceOptimizationStrategy extends OptimizationStrategy {
  optimize(
    currentParams: SwarmParameters,
    profile: BehaviorProfile,
    environmental: EnvironmentalData | null,
    history: PerformanceRecord[],
    constraints: OptimizationConstraints
  ): { parameters: SwarmParameters; formation: SwarmFormation } {
    const optimizedParams = { ...profile.optimalParameters };
    
    // Reconnaissance prioritizes speed and adaptability
    optimizedParams.speed *= 1.1;
    optimizedParams.adaptiveThreshold *= 0.9;
    
    return {
      parameters: optimizedParams,
      formation: 'echelon' // Good for progressive reconnaissance
    };
  }
}

class EscortOptimizationStrategy extends OptimizationStrategy {
  optimize(
    currentParams: SwarmParameters,
    profile: BehaviorProfile,
    environmental: EnvironmentalData | null,
    history: PerformanceRecord[],
    constraints: OptimizationConstraints
  ): { parameters: SwarmParameters; formation: SwarmFormation } {
    const optimizedParams = { ...profile.optimalParameters };
    
    // Escort missions prioritize cohesion and safety
    optimizedParams.cohesion = Math.min(1.0, optimizedParams.cohesion + 0.1);
    optimizedParams.collisionAvoidanceRadius *= 1.2;
    
    return {
      parameters: optimizedParams,
      formation: 'diamond' // Good for protection
    };
  }
}

class DefaultOptimizationStrategy extends OptimizationStrategy {
  optimize(
    currentParams: SwarmParameters,
    profile: BehaviorProfile,
    environmental: EnvironmentalData | null,
    history: PerformanceRecord[],
    constraints: OptimizationConstraints
  ): { parameters: SwarmParameters; formation: SwarmFormation } {
    return {
      parameters: profile.optimalParameters,
      formation: 'grid'
    };
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface OptimizationConstraints {
  maxSpeed?: number;
  minSpacing?: number;
  maxSpacing?: number;
  requiredFormations?: SwarmFormation[];
  environmentalLimits?: {
    maxWindSpeed?: number;
    minVisibility?: number;
  };
}

interface BehaviorAdjustment {
  parameter: keyof SwarmParameters;
  currentValue: number;
  optimizedValue: number;
  change: number;
  percentChange: number;
  reason: string;
}

interface PerformanceProjection {
  cohesion: number;
  efficiency: number;
  safety: number;
  missionSuccess: number;
  overall: number;
  confidence: number;
}

interface PerformanceRecord {
  timestamp: string;
  parameters: SwarmParameters;
  formation: SwarmFormation;
  missionType: SwarmTaskType;
  cohesion: number;
  efficiency: number;
  safety: number;
  missionSuccess: number;
}

interface Bottleneck {
  type: string;
  severity: number;
  currentValue: number;
  targetValue: number;
}

interface OperationalScenario {
  primaryObjective: 'surveillance' | 'protection' | 'reconnaissance' | 'transport';
  threatLevel: number;
  environmentalChallenges: string[];
  timeConstraints: number;
  resourceLimitations: string[];
}

interface FormationConstraints {
  minDroneDistance?: number;
  maxFormationSize?: number;
  allowedAltitudeRange?: [number, number];
  avoidanceZones?: Array<{ center: Vector3D; radius: number }>;
}

interface FormationEvaluation {
  formation: SwarmFormation;
  parameters: SwarmParameters;
  overallScore: number;
  metrics: FormationMetrics;
}

interface FormationMetrics {
  coverage: number;
  coordination: number;
  safety: number;
  efficiency: number;
}

interface SizeOptimizationConstraints {
  minSize?: number;
  maxSize?: number;
  budgetLimit?: number;
  missionCriticality?: 'low' | 'medium' | 'high' | 'critical';
}

export default {
  SwarmBehaviorOptimizer
};