// Automated Countermeasure Deployment System
// Central orchestration system for automated electronic warfare countermeasures

import { 
  ElectronicCountermeasure,
  EWThreat,
  ThreatSeverity,
  CountermeasureStatus,
  AttackSignature,
  EWEvent,
  EWSystemStatus
} from './types';
import { webSocketService } from './websocket';
import { gpsAntiSpoofing } from './gps-anti-spoofing';
import { jammingDetection } from './jamming-detection';
import { antiJamming } from './anti-jamming';
import { frequencyHopping } from './frequency-hopping';
import { signalAnalysis } from './signal-analysis';
import { cyberDefense } from './cyber-defense';
import { fallbackProtocols } from './fallback-protocols';
import { signatureIdentification } from './signature-identification';

// Countermeasure deployment rules and priorities
const DEPLOYMENT_RULES = {
  THREAT_RESPONSE_MATRIX: {
    'spoofing': {
      'gps': ['gps_anti_spoofing', 'ins_fallback', 'multi_constellation'],
      'communication': ['signal_authentication', 'frequency_hopping', 'encryption_upgrade']
    },
    'jamming': {
      'barrage': ['frequency_hopping', 'spread_spectrum', 'power_increase'],
      'spot': ['notch_filtering', 'frequency_shift', 'null_steering'],
      'sweep': ['frequency_hopping', 'adaptive_filtering', 'channel_switching']
    },
    'cyber': {
      'intrusion': ['access_control', 'network_isolation', 'authentication'],
      'malware': ['quarantine', 'system_restore', 'behavioral_blocking'],
      'dos': ['rate_limiting', 'traffic_shaping', 'load_balancing']
    },
    'interference': {
      'unintentional': ['notch_filtering', 'frequency_coordination', 'power_management'],
      'intentional': ['frequency_hopping', 'directional_antennas', 'channel_switching']
    }
  },

  DEPLOYMENT_PRIORITIES: {
    'critical': {
      maxDeploymentTime: 5000,    // 5 seconds
      simultaneousCountermeasures: 5,
      resourceAllocation: 0.8     // 80% of available resources
    },
    'high': {
      maxDeploymentTime: 10000,   // 10 seconds
      simultaneousCountermeasures: 3,
      resourceAllocation: 0.6     // 60% of available resources
    },
    'medium': {
      maxDeploymentTime: 30000,   // 30 seconds
      simultaneousCountermeasures: 2,
      resourceAllocation: 0.4     // 40% of available resources
    },
    'low': {
      maxDeploymentTime: 60000,   // 60 seconds
      simultaneousCountermeasures: 1,
      resourceAllocation: 0.2     // 20% of available resources
    }
  },

  RESOURCE_LIMITS: {
    maxCpuUsage: 70,        // 70% CPU
    maxMemoryUsage: 80,     // 80% memory
    maxPowerUsage: 15,      // 15 watts
    maxBandwidthUsage: 60   // 60% bandwidth
  }
};

// Countermeasure effectiveness tracking
interface CountermeasureEffectiveness {
  countermeasureId: string;
  threatType: string;
  deploymentCount: number;
  successCount: number;
  averageResponseTime: number;
  resourceEfficiency: number;
  lastUsed: number;
}

export class CountermeasureDeploymentSystem {
  private static instance: CountermeasureDeploymentSystem;
  private isActive: boolean = false;
  private activeCountermeasures: Map<string, ElectronicCountermeasure> = new Map();
  private deploymentQueue: Array<{
    threatId: string;
    threat: EWThreat;
    countermeasures: string[];
    priority: number;
    timestamp: number;
  }> = [];
  private effectivenessTracker: Map<string, CountermeasureEffectiveness> = new Map();
  private systemResources: {
    cpu: number;
    memory: number;
    power: number;
    bandwidth: number;
  } = { cpu: 0, memory: 0, power: 0, bandwidth: 0 };
  private deploymentCallbacks: Array<(event: any) => void> = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupWebSocketHandlers();
    this.initializeEffectivenessTracking();
  }

  public static getInstance(): CountermeasureDeploymentSystem {
    if (!CountermeasureDeploymentSystem.instance) {
      CountermeasureDeploymentSystem.instance = new CountermeasureDeploymentSystem();
    }
    return CountermeasureDeploymentSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for threat detections from all subsystems
      webSocketService.subscribe('ew_threat_detected', (data) => {
        this.handleThreatDetection(data);
      });

      // Listen for signature detections
      webSocketService.subscribe('signature_detected', (data) => {
        this.handleSignatureDetection(data);
      });

      // Listen for countermeasure status updates
      webSocketService.subscribe('countermeasure_status_update', (data) => {
        this.updateCountermeasureStatus(data);
      });

      // Listen for system resource updates
      webSocketService.subscribe('system_resources_update', (data) => {
        this.updateSystemResources(data);
      });

      // Listen for manual countermeasure requests
      webSocketService.subscribe('deploy_countermeasure_request', (data) => {
        this.handleManualDeploymentRequest(data);
      });

      // Listen for countermeasure effectiveness feedback
      webSocketService.subscribe('countermeasure_effectiveness_feedback', (data) => {
        this.updateEffectivenessMetrics(data);
      });
    }
  }

  public startAutomatedDeployment(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Automated Countermeasure Deployment System activated');

    // Start processing deployment queue
    this.processingInterval = setInterval(() => {
      this.processDeploymentQueue();
    }, 1000); // Process every second

    // Start monitoring active countermeasures
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveCountermeasures();
      this.optimizeDeployments();
    }, 5000); // Monitor every 5 seconds

    this.emitEvent('system_alert', 'low', 'Automated Countermeasure Deployment activated');
  }

  public stopAutomatedDeployment(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Deactivate all active countermeasures
    this.deactivateAllCountermeasures();

    console.log('Automated Countermeasure Deployment System deactivated');
    this.emitEvent('system_alert', 'low', 'Automated Countermeasure Deployment deactivated');
  }

  public addDeploymentCallback(callback: (event: any) => void): () => void {
    this.deploymentCallbacks.push(callback);
    return () => {
      this.deploymentCallbacks = this.deploymentCallbacks.filter(cb => cb !== callback);
    };
  }

  public getSystemStatus(): EWSystemStatus {
    const activeThreatCount = this.deploymentQueue.length;
    const countermeasuresActive = this.activeCountermeasures.size;

    // Calculate overall threat level
    let overallThreatLevel: ThreatSeverity = 'low';
    this.deploymentQueue.forEach(item => {
      if (this.escalateThreatLevel(overallThreatLevel, item.threat.severity) !== overallThreatLevel) {
        overallThreatLevel = item.threat.severity;
      }
    });

    return {
      timestamp: new Date().toISOString(),
      overallThreatLevel,
      activeThreatCount,
      countermeasuresActive,
      systemHealth: {
        signalAnalysis: 'operational',
        threatDetection: 'operational',
        countermeasures: this.systemResources.cpu > 80 ? 'degraded' : 'operational',
        communications: 'operational'
      },
      performance: {
        detectionLatency: this.calculateAverageDetectionLatency(),
        falseAlarmRate: this.calculateFalseAlarmRate(),
        threatNeutralizationRate: this.calculateNeutralizationRate(),
        systemResponseTime: this.calculateAverageResponseTime()
      },
      resourceUtilization: {
        cpu: this.systemResources.cpu,
        memory: this.systemResources.memory,
        bandwidth: this.systemResources.bandwidth
      }
    };
  }

  public getActiveCountermeasures(): ElectronicCountermeasure[] {
    return Array.from(this.activeCountermeasures.values());
  }

  public getEffectivenessMetrics(): CountermeasureEffectiveness[] {
    return Array.from(this.effectivenessTracker.values());
  }

  public deployCountermeasure(
    countermeasureType: string,
    threat: EWThreat,
    targetDrones?: string[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const countermeasureId = `cm_${Date.now()}`;
      
      const countermeasure: ElectronicCountermeasure = {
        id: countermeasureId,
        name: this.getCountermeasureName(countermeasureType),
        type: 'active',
        category: this.getCountermeasureCategory(countermeasureType),
        status: 'deploying',
        effectiveness: 0,
        resourceUsage: { cpu: 0, memory: 0, power: 0 },
        configuration: this.getCountermeasureConfiguration(countermeasureType, threat),
        triggers: {
          threatTypes: [threat.type],
          severityThreshold: threat.severity,
          automatic: true
        },
        performance: {
          successRate: 0,
          avgResponseTime: 0
        }
      };

      // Check resource availability
      if (!this.checkResourceAvailability(countermeasure)) {
        reject(new Error('Insufficient resources for countermeasure deployment'));
        return;
      }

      this.activeCountermeasures.set(countermeasureId, countermeasure);
      
      // Deploy the countermeasure
      this.executeCountermeasureDeployment(countermeasure, threat, targetDrones)
        .then(() => {
          countermeasure.status = 'active';
          countermeasure.deployedAt = new Date().toISOString();
          resolve(countermeasureId);
        })
        .catch(error => {
          countermeasure.status = 'failed';
          reject(error);
        });
    });
  }

  public deactivateCountermeasure(countermeasureId: string): boolean {
    const countermeasure = this.activeCountermeasures.get(countermeasureId);
    if (!countermeasure) return false;

    countermeasure.status = 'inactive';
    
    // Send deactivation command
    if (webSocketService) {
      webSocketService.sendSecure('deactivate_countermeasure', {
        countermeasureId,
        timestamp: Date.now()
      });
    }

    // Update resource usage
    this.updateResourceUsage(countermeasure, false);

    this.activeCountermeasures.delete(countermeasureId);
    
    console.log(`Deactivated countermeasure: ${countermeasure.name}`);
    return true;
  }

  private handleThreatDetection(threat: EWThreat): void {
    if (!this.isActive) return;

    console.log(`Processing threat detection: ${threat.id} (${threat.type}, ${threat.severity})`);

    // Determine appropriate countermeasures
    const countermeasures = this.selectCountermeasures(threat);
    
    if (countermeasures.length === 0) {
      console.warn(`No countermeasures available for threat: ${threat.id}`);
      return;
    }

    // Calculate priority based on threat severity and impact
    const priority = this.calculateThreatPriority(threat);

    // Add to deployment queue
    this.deploymentQueue.push({
      threatId: threat.id,
      threat,
      countermeasures,
      priority,
      timestamp: Date.now()
    });

    // Sort queue by priority
    this.deploymentQueue.sort((a, b) => b.priority - a.priority);

    console.log(`Queued ${countermeasures.length} countermeasures for threat ${threat.id} (priority: ${priority})`);
  }

  private handleSignatureDetection(data: any): void {
    const { signature, confidence, sourceData } = data;
    
    // Create threat from signature detection
    const threat: EWThreat = {
      id: `sig_threat_${Date.now()}`,
      type: signature.type,
      severity: signature.threatLevel,
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      affectedSystems: this.determineAffectedSystems(signature, sourceData),
      characteristics: {
        signature: signature.id,
        frequency: sourceData.frequency,
        power: sourceData.signalStrength
      },
      impact: {
        dronesAffected: this.determineDronesAffected(sourceData),
        communicationLoss: signature.type === 'jamming',
        navigationDegraded: signature.type === 'spoofing',
        missionCompromised: signature.threatLevel === 'critical'
      },
      confidence,
      countermeasuresDeployed: []
    };

    this.handleThreatDetection(threat);
  }

  private selectCountermeasures(threat: EWThreat): string[] {
    const countermeasures: string[] = [];
    
    // Get countermeasures from threat response matrix
    const threatCategory = this.getThreatCategory(threat);
    const responseMatrix = DEPLOYMENT_RULES.THREAT_RESPONSE_MATRIX[threat.type];
    
    if (responseMatrix && responseMatrix[threatCategory]) {
      countermeasures.push(...responseMatrix[threatCategory]);
    } else if (responseMatrix && responseMatrix['default']) {
      countermeasures.push(...responseMatrix['default']);
    }

    // Add signature-specific countermeasures if available
    if (threat.characteristics.signature) {
      const signature = signatureIdentification.getKnownSignatures()
        .find(sig => sig.id === threat.characteristics.signature);
      
      if (signature) {
        countermeasures.push(...signature.countermeasures);
      }
    }

    // Remove duplicates and filter based on availability
    const uniqueCountermeasures = [...new Set(countermeasures)];
    return uniqueCountermeasures.filter(cm => this.isCountermeasureAvailable(cm));
  }

  private getThreatCategory(threat: EWThreat): string {
    // Determine specific threat category for more precise countermeasure selection
    if (threat.type === 'jamming') {
      if (threat.characteristics.bandwidth && threat.characteristics.bandwidth > 50) {
        return 'barrage';
      } else if (threat.characteristics.bandwidth && threat.characteristics.bandwidth < 10) {
        return 'spot';
      } else {
        return 'sweep';
      }
    }
    
    if (threat.type === 'spoofing') {
      if (threat.affectedSystems.includes('gps')) {
        return 'gps';
      } else {
        return 'communication';
      }
    }

    return 'default';
  }

  private calculateThreatPriority(threat: EWThreat): number {
    let priority = 0;

    // Base priority from severity
    const severityScores = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    priority += severityScores[threat.severity] * 25;

    // Impact assessment
    if (threat.impact.missionCompromised) priority += 20;
    if (threat.impact.communicationLoss) priority += 15;
    if (threat.impact.navigationDegraded) priority += 10;

    // Number of affected drones
    priority += Math.min(threat.impact.dronesAffected.length * 5, 25);

    // Confidence factor
    priority += threat.confidence * 10;

    return Math.min(priority, 100); // Cap at 100
  }

  private processDeploymentQueue(): void {
    if (!this.isActive || this.deploymentQueue.length === 0) return;

    const deployment = this.deploymentQueue.shift()!;
    const { threat, countermeasures, priority } = deployment;

    console.log(`Processing deployment for threat ${threat.id} (priority: ${priority})`);

    // Deploy countermeasures based on priority and resources
    const deploymentLimit = DEPLOYMENT_RULES.DEPLOYMENT_PRIORITIES[threat.severity].simultaneousCountermeasures;
    const countermeasuresToDeploy = countermeasures.slice(0, deploymentLimit);

    const deploymentPromises = countermeasuresToDeploy.map(cm => 
      this.deployCountermeasure(cm, threat, threat.impact.dronesAffected)
        .catch(error => {
          console.error(`Failed to deploy countermeasure ${cm}:`, error);
          return null;
        })
    );

    Promise.allSettled(deploymentPromises).then(results => {
      const successfulDeployments = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<string>).value);

      console.log(`Deployed ${successfulDeployments.length}/${countermeasuresToDeploy.length} countermeasures for threat ${threat.id}`);

      // Update threat with deployed countermeasures
      threat.countermeasuresDeployed = successfulDeployments;

      // Notify deployment completion
      this.notifyDeploymentCompletion(threat, successfulDeployments);
    });
  }

  private executeCountermeasureDeployment(
    countermeasure: ElectronicCountermeasure,
    threat: EWThreat,
    targetDrones?: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Route to appropriate subsystem based on countermeasure category
      switch (countermeasure.category) {
        case 'anti_jamming':
          this.deployAntiJammingCountermeasure(countermeasure, threat, targetDrones);
          break;
        case 'anti_spoofing':
          this.deployAntiSpoofingCountermeasure(countermeasure, threat, targetDrones);
          break;
        case 'signal_protection':
          this.deploySignalProtectionCountermeasure(countermeasure, threat, targetDrones);
          break;
        case 'cyber_defense':
          this.deployCyberDefenseCountermeasure(countermeasure, threat, targetDrones);
          break;
        default:
          reject(new Error(`Unknown countermeasure category: ${countermeasure.category}`));
          return;
      }

      // Update resource usage
      this.updateResourceUsage(countermeasure, true);

      // Update effectiveness tracking
      this.updateEffectivenessTracking(countermeasure.id, threat.type, startTime);

      resolve();
    });
  }

  private deployAntiJammingCountermeasure(
    countermeasure: ElectronicCountermeasure,
    threat: EWThreat,
    targetDrones?: string[]
  ): void {
    const drones = targetDrones || threat.impact.dronesAffected;
    
    // Deploy through anti-jamming system
    antiJamming.deployCountermeasure('anti_jamming', drones, threat.id);
    
    console.log(`Deployed anti-jamming countermeasure for ${drones.length} drones`);
  }

  private deployAntiSpoofingCountermeasure(
    countermeasure: ElectronicCountermeasure,
    threat: EWThreat,
    targetDrones?: string[]
  ): void {
    // GPS anti-spoofing is handled automatically by the GPS system
    // Additional measures can be deployed here
    
    console.log(`Deployed anti-spoofing countermeasure for threat ${threat.id}`);
  }

  private deploySignalProtectionCountermeasure(
    countermeasure: ElectronicCountermeasure,
    threat: EWThreat,
    targetDrones?: string[]
  ): void {
    const drones = targetDrones || threat.impact.dronesAffected;
    
    // Deploy frequency hopping if appropriate
    if (countermeasure.name.includes('Frequency Hopping')) {
      const patterns = frequencyHopping.getActivePatterns();
      if (patterns.length > 0) {
        frequencyHopping.startFrequencyHopping(patterns[0].id, drones);
      }
    }

    // Deploy communication fallback protocols
    drones.forEach(droneId => {
      const channels = fallbackProtocols.getAvailableChannels();
      const backupChannels = channels.filter(ch => ch.type === 'backup').map(ch => ch.id);
      if (backupChannels.length > 0) {
        fallbackProtocols.switchChannel(droneId, backupChannels[0], `countermeasure_${countermeasure.id}`);
      }
    });
    
    console.log(`Deployed signal protection countermeasure for ${drones.length} drones`);
  }

  private deployCyberDefenseCountermeasure(
    countermeasure: ElectronicCountermeasure,
    threat: EWThreat,
    targetDrones?: string[]
  ): void {
    // Cyber defense countermeasures are handled by the cyber defense system
    // Additional coordination can be added here
    
    console.log(`Deployed cyber defense countermeasure for threat ${threat.id}`);
  }

  private monitorActiveCountermeasures(): void {
    this.activeCountermeasures.forEach((countermeasure, id) => {
      // Check countermeasure health and effectiveness
      if (countermeasure.status === 'active') {
        const timeSinceDeployment = Date.now() - (new Date(countermeasure.deployedAt || 0).getTime());
        
        // Check if countermeasure has been active too long without success
        if (timeSinceDeployment > 300000 && countermeasure.effectiveness < 0.3) { // 5 minutes, <30% effective
          console.warn(`Countermeasure ${id} showing low effectiveness, considering replacement`);
          this.considerCountermeasureReplacement(id);
        }
      }
    });
  }

  private optimizeDeployments(): void {
    // Analyze effectiveness metrics and optimize future deployments
    const ineffectiveCountermeasures = Array.from(this.effectivenessTracker.values())
      .filter(tracker => tracker.successCount / Math.max(tracker.deploymentCount, 1) < 0.5);

    ineffectiveCountermeasures.forEach(tracker => {
      console.log(`Countermeasure ${tracker.countermeasureId} showing low success rate: ${
        (tracker.successCount / tracker.deploymentCount * 100).toFixed(1)
      }%`);
    });
  }

  private considerCountermeasureReplacement(countermeasureId: string): void {
    const countermeasure = this.activeCountermeasures.get(countermeasureId);
    if (!countermeasure) return;

    // Find alternative countermeasures
    const alternatives = this.findAlternativeCountermeasures(countermeasure);
    
    if (alternatives.length > 0) {
      console.log(`Replacing ineffective countermeasure ${countermeasureId} with ${alternatives[0]}`);
      this.deactivateCountermeasure(countermeasureId);
      // Alternative deployment would be triggered by ongoing threat detection
    }
  }

  private findAlternativeCountermeasures(countermeasure: ElectronicCountermeasure): string[] {
    // Find alternative countermeasures for the same threat type
    const alternatives: string[] = [];
    
    // This would normally use machine learning or expert rules
    // For now, return some basic alternatives
    if (countermeasure.category === 'anti_jamming') {
      alternatives.push('frequency_hopping', 'spread_spectrum', 'null_steering');
    } else if (countermeasure.category === 'anti_spoofing') {
      alternatives.push('multi_constellation', 'ins_fallback', 'terrain_navigation');
    }
    
    return alternatives.filter(alt => this.isCountermeasureAvailable(alt));
  }

  private updateResourceUsage(countermeasure: ElectronicCountermeasure, activate: boolean): void {
    const multiplier = activate ? 1 : -1;
    
    this.systemResources.cpu += countermeasure.resourceUsage.cpu * multiplier;
    this.systemResources.memory += countermeasure.resourceUsage.memory * multiplier;
    this.systemResources.power += countermeasure.resourceUsage.power * multiplier;
    
    // Ensure resources don't go negative
    this.systemResources.cpu = Math.max(0, this.systemResources.cpu);
    this.systemResources.memory = Math.max(0, this.systemResources.memory);
    this.systemResources.power = Math.max(0, this.systemResources.power);
  }

  private checkResourceAvailability(countermeasure: ElectronicCountermeasure): boolean {
    const limits = DEPLOYMENT_RULES.RESOURCE_LIMITS;
    
    return (
      this.systemResources.cpu + countermeasure.resourceUsage.cpu <= limits.maxCpuUsage &&
      this.systemResources.memory + countermeasure.resourceUsage.memory <= limits.maxMemoryUsage &&
      this.systemResources.power + countermeasure.resourceUsage.power <= limits.maxPowerUsage
    );
  }

  private updateEffectivenessTracking(countermeasureId: string, threatType: string, startTime: number): void {
    const tracker = this.effectivenessTracker.get(countermeasureId) || {
      countermeasureId,
      threatType,
      deploymentCount: 0,
      successCount: 0,
      averageResponseTime: 0,
      resourceEfficiency: 0,
      lastUsed: 0
    };

    tracker.deploymentCount++;
    tracker.lastUsed = Date.now();
    
    const responseTime = Date.now() - startTime;
    tracker.averageResponseTime = (tracker.averageResponseTime * (tracker.deploymentCount - 1) + responseTime) / tracker.deploymentCount;

    this.effectivenessTracker.set(countermeasureId, tracker);
  }

  private updateEffectivenessMetrics(data: any): void {
    const { countermeasureId, success, effectiveness, responseTime } = data;
    
    const tracker = this.effectivenessTracker.get(countermeasureId);
    if (tracker) {
      if (success) {
        tracker.successCount++;
      }
      
      if (responseTime) {
        tracker.averageResponseTime = (tracker.averageResponseTime + responseTime) / 2;
      }

      // Update active countermeasure effectiveness
      const countermeasure = this.activeCountermeasures.get(countermeasureId);
      if (countermeasure && effectiveness !== undefined) {
        countermeasure.effectiveness = effectiveness;
      }
    }
  }

  private updateCountermeasureStatus(data: any): void {
    const { countermeasureId, status, resourceUsage } = data;
    
    const countermeasure = this.activeCountermeasures.get(countermeasureId);
    if (countermeasure) {
      countermeasure.status = status;
      
      if (resourceUsage) {
        countermeasure.resourceUsage = resourceUsage;
      }
    }
  }

  private updateSystemResources(data: any): void {
    this.systemResources = { ...this.systemResources, ...data };
  }

  private handleManualDeploymentRequest(data: any): void {
    const { countermeasureType, threatId, targetDrones } = data;
    
    // Find the threat
    const queueItem = this.deploymentQueue.find(item => item.threatId === threatId);
    if (queueItem) {
      this.deployCountermeasure(countermeasureType, queueItem.threat, targetDrones);
    }
  }

  private isCountermeasureAvailable(countermeasureType: string): boolean {
    // Check if countermeasure is available based on system capabilities
    // This would normally check hardware availability, software licensing, etc.
    return true; // Simplified for now
  }

  private getCountermeasureName(type: string): string {
    const names: Record<string, string> = {
      'frequency_hopping': 'Frequency Hopping System',
      'spread_spectrum': 'Spread Spectrum Protection',
      'null_steering': 'Adaptive Null Steering',
      'gps_anti_spoofing': 'GPS Anti-Spoofing System',
      'multi_constellation': 'Multi-Constellation GNSS',
      'ins_fallback': 'Inertial Navigation Fallback',
      'notch_filtering': 'Adaptive Notch Filtering',
      'channel_switching': 'Emergency Channel Switch',
      'power_increase': 'Adaptive Power Control',
      'signal_authentication': 'Signal Authentication',
      'encryption_upgrade': 'Enhanced Encryption'
    };
    
    return names[type] || `Countermeasure: ${type}`;
  }

  private getCountermeasureCategory(type: string): ElectronicCountermeasure['category'] {
    if (type.includes('jamming') || type.includes('frequency') || type.includes('power')) {
      return 'anti_jamming';
    } else if (type.includes('spoofing') || type.includes('gps') || type.includes('constellation')) {
      return 'anti_spoofing';
    } else if (type.includes('signal') || type.includes('encryption') || type.includes('authentication')) {
      return 'signal_protection';
    } else if (type.includes('cyber') || type.includes('intrusion') || type.includes('malware')) {
      return 'cyber_defense';
    }
    
    return 'signal_protection';
  }

  private getCountermeasureConfiguration(type: string, threat: EWThreat): Record<string, any> {
    return {
      threatId: threat.id,
      threatType: threat.type,
      severity: threat.severity,
      autoActivate: true,
      timeout: 300000 // 5 minutes
    };
  }

  private determineAffectedSystems(signature: AttackSignature, sourceData: any): Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> {
    const systems: Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> = [];
    
    if (signature.type === 'spoofing' && sourceData.frequency && Math.abs(sourceData.frequency - 1575.42) < 10) {
      systems.push('gps');
    } else if (signature.type === 'jamming') {
      systems.push('communication');
    }
    
    return systems.length > 0 ? systems : ['communication'];
  }

  private determineDronesAffected(sourceData: any): string[] {
    // This would normally determine which drones are affected based on location, frequency, etc.
    // For now, return empty array
    return [];
  }

  private deactivateAllCountermeasures(): void {
    const countermeasureIds = Array.from(this.activeCountermeasures.keys());
    countermeasureIds.forEach(id => this.deactivateCountermeasure(id));
  }

  private notifyDeploymentCompletion(threat: EWThreat, deployedCountermeasures: string[]): void {
    const event = {
      type: 'countermeasures_deployed',
      threatId: threat.id,
      countermeasures: deployedCountermeasures,
      timestamp: Date.now()
    };

    this.deploymentCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in deployment callback:', error);
      }
    });

    if (webSocketService) {
      webSocketService.send('countermeasures_deployed', event);
    }
  }

  private calculateAverageDetectionLatency(): number {
    // Calculate average time from threat detection to countermeasure deployment
    return 2000; // Simplified: 2 seconds
  }

  private calculateFalseAlarmRate(): number {
    const totalDetections = this.effectivenessTracker.size;
    const falsePositives = Array.from(this.effectivenessTracker.values())
      .reduce((sum, tracker) => sum + (tracker.deploymentCount - tracker.successCount), 0);
    
    return totalDetections > 0 ? falsePositives / totalDetections : 0;
  }

  private calculateNeutralizationRate(): number {
    const totalDeployments = Array.from(this.effectivenessTracker.values())
      .reduce((sum, tracker) => sum + tracker.deploymentCount, 0);
    const successfulNeutralizations = Array.from(this.effectivenessTracker.values())
      .reduce((sum, tracker) => sum + tracker.successCount, 0);
    
    return totalDeployments > 0 ? successfulNeutralizations / totalDeployments : 0;
  }

  private calculateAverageResponseTime(): number {
    const trackers = Array.from(this.effectivenessTracker.values());
    if (trackers.length === 0) return 0;
    
    const totalResponseTime = trackers.reduce((sum, tracker) => sum + tracker.averageResponseTime, 0);
    return totalResponseTime / trackers.length;
  }

  private escalateThreatLevel(current: ThreatSeverity, candidate: ThreatSeverity): ThreatSeverity {
    const levels = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    return levels[candidate] > levels[current] ? candidate : current;
  }

  private initializeEffectivenessTracking(): void {
    // Initialize effectiveness tracking for common countermeasures
    const commonCountermeasures = [
      'frequency_hopping', 'spread_spectrum', 'null_steering',
      'gps_anti_spoofing', 'multi_constellation', 'ins_fallback',
      'notch_filtering', 'channel_switching', 'power_increase'
    ];

    commonCountermeasures.forEach(cm => {
      this.effectivenessTracker.set(cm, {
        countermeasureId: cm,
        threatType: 'general',
        deploymentCount: 0,
        successCount: 0,
        averageResponseTime: 0,
        resourceEfficiency: 0,
        lastUsed: 0
      });
    });
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `deployment-event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      details: {},
      acknowledged: false
    };

    if (webSocketService) {
      webSocketService.send('ew_event', event);
    }
  }
}

// Export singleton instance and hook
export const countermeasureDeployment = CountermeasureDeploymentSystem.getInstance();

export function useCountermeasureDeployment() {
  const system = CountermeasureDeploymentSystem.getInstance();
  
  return {
    startAutomatedDeployment: () => system.startAutomatedDeployment(),
    stopAutomatedDeployment: () => system.stopAutomatedDeployment(),
    addDeploymentCallback: (callback: (event: any) => void) => 
      system.addDeploymentCallback(callback),
    getSystemStatus: () => system.getSystemStatus(),
    getActiveCountermeasures: () => system.getActiveCountermeasures(),
    getEffectivenessMetrics: () => system.getEffectivenessMetrics(),
    deployCountermeasure: (type: string, threat: EWThreat, targetDrones?: string[]) => 
      system.deployCountermeasure(type, threat, targetDrones),
    deactivateCountermeasure: (countermeasureId: string) => 
      system.deactivateCountermeasure(countermeasureId),
  };
}