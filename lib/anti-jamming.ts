// Anti-Jamming Measures for Drone Communications
// Comprehensive anti-jamming system with multiple countermeasures

import { 
  AntiJammingConfiguration,
  ElectronicCountermeasure,
  EWThreat,
  ThreatSeverity,
  CommunicationHealth,
  FrequencyHoppingPattern,
  EWEvent
} from './types';
import { webSocketService } from './websocket';
import { frequencyHopping } from './frequency-hopping';

// Anti-jamming technique parameters
const ANTI_JAMMING_PARAMS = {
  POWER_CONTROL: {
    MIN_POWER: 1,     // 1 dBm minimum
    MAX_POWER: 30,    // 30 dBm maximum
    STEP_SIZE: 3,     // 3 dB steps
    RESPONSE_TIME: 100 // 100ms response time
  },
  
  NULL_STEERING: {
    MAX_NULLS: 4,           // Maximum simultaneous nulls
    MIN_SEPARATION: 10,     // 10 degree minimum separation
    ADAPTATION_RATE: 0.1,   // Adaptation step size
    CONVERGENCE_THRESHOLD: -30 // -30dB null depth target
  },

  SPREAD_SPECTRUM: {
    PROCESSING_GAINS: [10, 13, 16, 20], // Available processing gains in dB
    MIN_CHIP_RATE: 1000000,             // 1 Mcps minimum
    MAX_CHIP_RATE: 10000000,            // 10 Mcps maximum
    CODE_FAMILIES: ['gold', 'kasami', 'walsh'] // Available spreading codes
  },

  INTERFERENCE_REJECTION: {
    NOTCH_DEPTH: -40,      // -40dB notch depth
    NOTCH_WIDTH: 1,        // 1 MHz notch width
    MAX_NOTCHES: 8,        // Maximum simultaneous notches
    ADAPTATION_TIME: 50    // 50ms adaptation time
  }
};

export class AntiJammingSystem {
  private static instance: AntiJammingSystem;
  private isActive: boolean = false;
  private configuration: AntiJammingConfiguration;
  private activeCountermeasures: Map<string, ElectronicCountermeasure> = new Map();
  private droneStates: Map<string, {
    currentPower: number;
    nullDirections: number[];
    spreadingCode: string;
    notchFilters: number[];
    lastUpdate: number;
    jammingLevel: number;
  }> = new Map();
  private performanceMetrics: Map<string, {
    powerAdjustments: number;
    nullSteerings: number;
    channelSwitches: number;
    successfulMitigations: number;
    avgResponseTime: number;
  }> = new Map();
  private adaptationInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): AntiJammingSystem {
    if (!AntiJammingSystem.instance) {
      AntiJammingSystem.instance = new AntiJammingSystem();
    }
    return AntiJammingSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for jamming threat notifications
      webSocketService.subscribe('jamming_threat_detected', (data) => {
        this.handleJammingThreat(data);
      });

      // Listen for communication health updates
      webSocketService.subscribe('communication_health_update', (data) => {
        this.updateCommunicationHealth(data);
      });

      // Listen for adaptive power control commands
      webSocketService.subscribe('activate_adaptive_power', (data) => {
        this.activateAdaptivePowerControl(data);
      });

      // Listen for null steering commands
      webSocketService.subscribe('activate_null_steering', (data) => {
        this.activateNullSteering(data);
      });

      // Listen for backup channel activation
      webSocketService.subscribe('activate_backup_channels', (data) => {
        this.activateBackupChannels(data);
      });

      // Listen for countermeasure feedback
      webSocketService.subscribe('countermeasure_feedback', (data) => {
        this.processCountermeasureFeedback(data);
      });
    }
  }

  public startAntiJamming(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Anti-Jamming System activated');

    // Start adaptive monitoring
    this.adaptationInterval = setInterval(() => {
      this.performAdaptiveAdjustments();
    }, 1000); // Adapt every second

    this.emitEvent('system_alert', 'low', 'Anti-Jamming System activated');
  }

  public stopAntiJamming(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
      this.adaptationInterval = null;
    }

    // Deactivate all countermeasures
    this.activeCountermeasures.forEach((countermeasure, id) => {
      this.deactivateCountermeasure(id);
    });

    console.log('Anti-Jamming System deactivated');
    this.emitEvent('system_alert', 'low', 'Anti-Jamming System deactivated');
  }

  public updateConfiguration(config: Partial<AntiJammingConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    console.log('Anti-jamming configuration updated');
    
    // Apply configuration changes to active systems
    this.applyConfigurationChanges();
  }

  public deployCountermeasure(
    type: ElectronicCountermeasure['category'],
    droneIds: string[],
    threatId?: string
  ): string {
    const countermeasureId = `${type}-${Date.now()}`;
    
    const countermeasure: ElectronicCountermeasure = {
      id: countermeasureId,
      name: this.getCountermeasureName(type),
      type: 'active',
      category: type,
      status: 'deploying',
      effectiveness: 0,
      resourceUsage: { cpu: 0, memory: 0, power: 0 },
      configuration: this.getCountermeasureConfiguration(type),
      triggers: {
        threatTypes: ['jamming'],
        severityThreshold: 'medium',
        automatic: true
      },
      performance: {
        successRate: 0,
        avgResponseTime: 0
      }
    };

    this.activeCountermeasures.set(countermeasureId, countermeasure);

    // Deploy to specific drones
    droneIds.forEach(droneId => {
      this.deployCountermeasureToDrone(countermeasure, droneId, threatId);
    });

    console.log(`Deployed ${type} countermeasure to ${droneIds.length} drones`);
    return countermeasureId;
  }

  public getCountermeasureStatus(countermeasureId: string): ElectronicCountermeasure | null {
    return this.activeCountermeasures.get(countermeasureId) || null;
  }

  public getActiveCountermeasures(): ElectronicCountermeasure[] {
    return Array.from(this.activeCountermeasures.values());
  }

  public getDroneAntiJammingStatus(droneId: string): any {
    const state = this.droneStates.get(droneId);
    const metrics = this.performanceMetrics.get(droneId);
    
    if (!state) return null;

    return {
      droneId,
      currentPower: state.currentPower,
      nullDirections: state.nullDirections,
      spreadingCode: state.spreadingCode,
      activeNotches: state.notchFilters.length,
      jammingLevel: state.jammingLevel,
      performance: metrics || {
        powerAdjustments: 0,
        nullSteerings: 0,
        channelSwitches: 0,
        successfulMitigations: 0,
        avgResponseTime: 0
      }
    };
  }

  private handleJammingThreat(threat: EWThreat): void {
    if (!this.isActive) return;

    console.log(`Processing jamming threat: ${threat.id}, severity: ${threat.severity}`);

    const affectedDrones = threat.impact.dronesAffected;
    const startTime = Date.now();

    // Deploy appropriate countermeasures based on threat characteristics
    this.selectAndDeployCountermeasures(threat, affectedDrones);

    // Update performance metrics
    affectedDrones.forEach(droneId => {
      this.updateResponseTimeMetrics(droneId, Date.now() - startTime);
    });
  }

  private selectAndDeployCountermeasures(threat: EWThreat, droneIds: string[]): void {
    const countermeasures: ElectronicCountermeasure['category'][] = [];

    // Select countermeasures based on threat characteristics
    if (threat.characteristics.power && threat.characteristics.power > -60) {
      // High power jammer - use multiple techniques
      if (this.configuration.adaptivePowerControl) {
        countermeasures.push('anti_jamming');
      }
      if (this.configuration.nullSteering && threat.source?.location) {
        countermeasures.push('anti_jamming');
      }
      if (this.configuration.frequencyHopping.enabled) {
        this.activateFrequencyHopping(droneIds, threat.id);
      }
    }

    // Barrage jamming - use spread spectrum
    if (threat.characteristics.bandwidth && threat.characteristics.bandwidth > 50) {
      if (this.configuration.spreadSpectrum.enabled) {
        this.activateSpreadSpectrum(droneIds, threat.id);
      }
    }

    // Narrowband jamming - use notch filters
    if (threat.characteristics.bandwidth && threat.characteristics.bandwidth < 10) {
      if (this.configuration.interferenceRejection.enabled) {
        this.activateNotchFilters(droneIds, threat.characteristics.frequency!, threat.id);
      }
    }

    // Deploy selected countermeasures
    countermeasures.forEach(type => {
      this.deployCountermeasure(type, droneIds, threat.id);
    });
  }

  private activateFrequencyHopping(droneIds: string[], threatId: string): void {
    if (!this.configuration.frequencyHopping.enabled) return;

    const pattern = this.configuration.frequencyHopping.currentPattern || 
                   this.configuration.frequencyHopping.patterns[0];

    if (pattern) {
      frequencyHopping.addDroneToHopping(droneIds[0], pattern);
      console.log(`Activated frequency hopping for threat ${threatId}`);
    }
  }

  private activateSpreadSpectrum(droneIds: string[], threatId: string): void {
    droneIds.forEach(droneId => {
      const state = this.getOrCreateDroneState(droneId);
      
      // Select spreading code
      const codeFamily = ANTI_JAMMING_PARAMS.SPREAD_SPECTRUM.CODE_FAMILIES[0];
      state.spreadingCode = this.generateSpreadingCode(codeFamily, droneId);

      if (webSocketService) {
        webSocketService.sendSecure('activate_spread_spectrum', {
          droneId,
          threatId,
          spreadingCode: state.spreadingCode,
          processingGain: this.configuration.spreadSpectrum.processingGain,
          chippingRate: this.configuration.spreadSpectrum.chippingRate,
          timestamp: Date.now()
        });
      }
    });

    console.log(`Activated spread spectrum for ${droneIds.length} drones`);
  }

  private activateNotchFilters(droneIds: string[], frequency: number, threatId: string): void {
    droneIds.forEach(droneId => {
      const state = this.getOrCreateDroneState(droneId);
      
      // Add notch filter if not already present
      if (!state.notchFilters.includes(frequency)) {
        state.notchFilters.push(frequency);
        
        if (webSocketService) {
          webSocketService.sendSecure('activate_notch_filter', {
            droneId,
            threatId,
            frequency,
            depth: ANTI_JAMMING_PARAMS.INTERFERENCE_REJECTION.NOTCH_DEPTH,
            width: ANTI_JAMMING_PARAMS.INTERFERENCE_REJECTION.NOTCH_WIDTH,
            timestamp: Date.now()
          });
        }
      }
    });

    console.log(`Activated notch filters at ${frequency} MHz for ${droneIds.length} drones`);
  }

  private activateAdaptivePowerControl(data: any): void {
    const { threatId, affectedDrones, powerIncrease } = data;
    
    affectedDrones.forEach((droneId: string) => {
      const state = this.getOrCreateDroneState(droneId);
      const metrics = this.getOrCreateMetrics(droneId);
      
      // Calculate new power level
      const newPower = Math.min(
        state.currentPower + powerIncrease,
        ANTI_JAMMING_PARAMS.POWER_CONTROL.MAX_POWER
      );
      
      if (newPower !== state.currentPower) {
        state.currentPower = newPower;
        metrics.powerAdjustments++;
        
        if (webSocketService) {
          webSocketService.sendSecure('adjust_transmit_power', {
            droneId,
            threatId,
            newPower,
            timestamp: Date.now()
          });
        }
        
        console.log(`Increased power for drone ${droneId} to ${newPower} dBm`);
      }
    });
  }

  private activateNullSteering(data: any): void {
    const { threatId, jammerLocation, frequency } = data;
    
    if (!jammerLocation) {
      console.warn('Cannot activate null steering without jammer location');
      return;
    }

    // Calculate bearing to jammer for each affected drone
    // This would normally use drone positions, but we'll use a simplified approach
    const jammerBearing = this.calculateBearing(jammerLocation);
    
    // Find drones that can implement null steering
    this.droneStates.forEach((state, droneId) => {
      if (state.nullDirections.length < ANTI_JAMMING_PARAMS.NULL_STEERING.MAX_NULLS) {
        // Check if this direction is sufficiently separated from existing nulls
        const minSeparation = ANTI_JAMMING_PARAMS.NULL_STEERING.MIN_SEPARATION;
        const tooClose = state.nullDirections.some(dir => 
          Math.abs(dir - jammerBearing) < minSeparation
        );
        
        if (!tooClose) {
          state.nullDirections.push(jammerBearing);
          this.getOrCreateMetrics(droneId).nullSteerings++;
          
          if (webSocketService) {
            webSocketService.sendSecure('activate_null_steering', {
              droneId,
              threatId,
              nullDirection: jammerBearing,
              frequency,
              adaptationRate: ANTI_JAMMING_PARAMS.NULL_STEERING.ADAPTATION_RATE,
              timestamp: Date.now()
            });
          }
          
          console.log(`Activated null steering for drone ${droneId} at bearing ${jammerBearing}°`);
        }
      }
    });
  }

  private activateBackupChannels(data: any): void {
    const { threatId, affectedDrones, primaryChannelAffected } = data;
    
    affectedDrones.forEach((droneId: string) => {
      const metrics = this.getOrCreateMetrics(droneId);
      metrics.channelSwitches++;
      
      if (webSocketService) {
        webSocketService.sendSecure('switch_backup_channel', {
          droneId,
          threatId,
          affectedFrequency: primaryChannelAffected,
          timestamp: Date.now()
        });
      }
    });
    
    console.log(`Activated backup channels for ${affectedDrones.length} drones`);
  }

  private updateCommunicationHealth(health: CommunicationHealth): void {
    const droneId = health.droneId;
    const state = this.getOrCreateDroneState(droneId);
    
    // Update jamming level assessment
    const jammingLevel = this.assessJammingLevel(health);
    state.jammingLevel = jammingLevel;
    state.lastUpdate = Date.now();
    
    // Trigger adaptive responses if jamming detected
    if (health.jamming.detected && jammingLevel > 0.3) {
      this.triggerAdaptiveResponse(droneId, health);
    }
  }

  private assessJammingLevel(health: CommunicationHealth): number {
    let jammingLevel = 0;
    
    // Signal quality degradation
    if (health.linkQuality < 50) jammingLevel += 0.3;
    else if (health.linkQuality < 70) jammingLevel += 0.2;
    
    // Packet loss
    if (health.packetLoss > 0.2) jammingLevel += 0.3;
    else if (health.packetLoss > 0.1) jammingLevel += 0.2;
    
    // High error rate
    if (health.errorRate > 0.1) jammingLevel += 0.2;
    
    // Explicit jamming detection
    if (health.jamming.detected) {
      jammingLevel += 0.4;
      
      // Additional weight based on jamming strength
      if (health.jamming.strength && health.jamming.strength > 0.8) {
        jammingLevel += 0.3;
      }
    }
    
    return Math.min(jammingLevel, 1.0);
  }

  private triggerAdaptiveResponse(droneId: string, health: CommunicationHealth): void {
    const state = this.droneStates.get(droneId);
    if (!state) return;

    // Adaptive power increase
    if (this.configuration.adaptivePowerControl) {
      const powerIncrease = this.calculateRequiredPowerIncrease(health);
      if (powerIncrease > 0) {
        this.adjustTransmitPower(droneId, powerIncrease);
      }
    }

    // Adaptive filtering
    if (this.configuration.interferenceRejection.adaptiveFiltering) {
      this.adaptInterferenceRejection(droneId, health);
    }
  }

  private calculateRequiredPowerIncrease(health: CommunicationHealth): number {
    // Calculate power increase based on signal degradation
    const qualityLoss = (100 - health.linkQuality) / 100;
    const snrLoss = health.jamming.strength || 0;
    
    // Simple calculation: increase power to compensate for losses
    const requiredIncrease = (qualityLoss + snrLoss) * 10; // Up to 10dB increase
    
    return Math.min(requiredIncrease, ANTI_JAMMING_PARAMS.POWER_CONTROL.STEP_SIZE);
  }

  private adjustTransmitPower(droneId: string, increase: number): void {
    const state = this.droneStates.get(droneId);
    if (!state) return;

    const newPower = Math.min(
      state.currentPower + increase,
      ANTI_JAMMING_PARAMS.POWER_CONTROL.MAX_POWER
    );
    
    if (newPower !== state.currentPower) {
      state.currentPower = newPower;
      this.getOrCreateMetrics(droneId).powerAdjustments++;
      
      if (webSocketService) {
        webSocketService.sendSecure('adjust_transmit_power', {
          droneId,
          newPower,
          reason: 'adaptive_response',
          timestamp: Date.now()
        });
      }
    }
  }

  private adaptInterferenceRejection(droneId: string, health: CommunicationHealth): void {
    // This would analyze the interference spectrum and adapt filters
    // For now, we'll implement a simplified version
    
    if (health.jamming.detected && health.jamming.type === 'spot') {
      // Estimate jammer frequency and add notch filter
      // This would normally require spectrum analysis
      console.log(`Adapting interference rejection for drone ${droneId}`);
    }
  }

  private performAdaptiveAdjustments(): void {
    if (!this.isActive) return;

    const now = Date.now();
    
    this.droneStates.forEach((state, droneId) => {
      // Check if drone needs attention (no updates for too long)
      if (now - state.lastUpdate > 30000) { // 30 seconds
        console.warn(`No updates from drone ${droneId} for 30 seconds`);
        return;
      }

      // Adaptive power management
      if (state.jammingLevel < 0.2 && state.currentPower > ANTI_JAMMING_PARAMS.POWER_CONTROL.MIN_POWER + 3) {
        // Reduce power if jamming is low
        this.adjustTransmitPower(droneId, -ANTI_JAMMING_PARAMS.POWER_CONTROL.STEP_SIZE);
      }

      // Clean up old null directions
      // (In a real system, this would be based on jammer movement)
      if (state.nullDirections.length > 0 && Math.random() < 0.1) {
        state.nullDirections = []; // Occasionally reset nulls
      }
    });
  }

  private deployCountermeasureToDrone(
    countermeasure: ElectronicCountermeasure,
    droneId: string,
    threatId?: string
  ): void {
    const state = this.getOrCreateDroneState(droneId);
    
    // Update countermeasure status
    countermeasure.status = 'active';
    countermeasure.deployedAt = new Date().toISOString();
    
    // Deploy based on category
    switch (countermeasure.category) {
      case 'anti_jamming':
        this.deployAntiJammingMeasures(droneId, countermeasure, threatId);
        break;
      case 'signal_protection':
        this.deploySignalProtection(droneId, countermeasure, threatId);
        break;
    }
    
    // Update resource usage (simplified)
    countermeasure.resourceUsage = {
      cpu: 10 + Math.random() * 20, // 10-30% CPU
      memory: 50 + Math.random() * 100, // 50-150 MB
      power: 2 + Math.random() * 3 // 2-5 watts additional
    };
  }

  private deployAntiJammingMeasures(droneId: string, countermeasure: ElectronicCountermeasure, threatId?: string): void {
    if (webSocketService) {
      webSocketService.sendSecure('deploy_anti_jamming', {
        droneId,
        countermeasureId: countermeasure.id,
        threatId,
        configuration: countermeasure.configuration,
        timestamp: Date.now()
      });
    }
  }

  private deploySignalProtection(droneId: string, countermeasure: ElectronicCountermeasure, threatId?: string): void {
    if (webSocketService) {
      webSocketService.sendSecure('deploy_signal_protection', {
        droneId,
        countermeasureId: countermeasure.id,
        threatId,
        configuration: countermeasure.configuration,
        timestamp: Date.now()
      });
    }
  }

  private deactivateCountermeasure(countermeasureId: string): void {
    const countermeasure = this.activeCountermeasures.get(countermeasureId);
    if (!countermeasure) return;

    countermeasure.status = 'inactive';
    
    if (webSocketService) {
      webSocketService.sendSecure('deactivate_countermeasure', {
        countermeasureId,
        timestamp: Date.now()
      });
    }

    console.log(`Deactivated countermeasure: ${countermeasure.name}`);
  }

  private processCountermeasureFeedback(data: any): void {
    const { countermeasureId, droneId, success, effectiveness, responseTime } = data;
    
    const countermeasure = this.activeCountermeasures.get(countermeasureId);
    if (countermeasure) {
      // Update effectiveness
      countermeasure.effectiveness = effectiveness;
      
      // Update performance metrics
      const metrics = this.getOrCreateMetrics(droneId);
      if (success) {
        metrics.successfulMitigations++;
      }
      
      // Update average response time
      if (responseTime) {
        this.updateResponseTimeMetrics(droneId, responseTime);
      }
    }
  }

  private applyConfigurationChanges(): void {
    // Apply configuration changes to active countermeasures
    console.log('Applying anti-jamming configuration changes');
    
    // Update frequency hopping configuration
    if (this.configuration.frequencyHopping.enabled) {
      // Notify frequency hopping system of config changes
    }
    
    // Update spread spectrum parameters
    if (this.configuration.spreadSpectrum.enabled) {
      // Apply new spread spectrum settings
    }
  }

  private getOrCreateDroneState(droneId: string) {
    if (!this.droneStates.has(droneId)) {
      this.droneStates.set(droneId, {
        currentPower: 20, // 20 dBm default
        nullDirections: [],
        spreadingCode: '',
        notchFilters: [],
        lastUpdate: Date.now(),
        jammingLevel: 0
      });
    }
    return this.droneStates.get(droneId)!;
  }

  private getOrCreateMetrics(droneId: string) {
    if (!this.performanceMetrics.has(droneId)) {
      this.performanceMetrics.set(droneId, {
        powerAdjustments: 0,
        nullSteerings: 0,
        channelSwitches: 0,
        successfulMitigations: 0,
        avgResponseTime: 0
      });
    }
    return this.performanceMetrics.get(droneId)!;
  }

  private updateResponseTimeMetrics(droneId: string, responseTime: number): void {
    const metrics = this.getOrCreateMetrics(droneId);
    
    // Update running average
    if (metrics.avgResponseTime === 0) {
      metrics.avgResponseTime = responseTime;
    } else {
      metrics.avgResponseTime = (metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    }
  }

  private generateSpreadingCode(family: string, droneId: string): string {
    // Generate pseudo-random spreading code based on drone ID
    // This is a simplified implementation
    const hash = this.simpleHash(droneId + family);
    return hash.toString(16).padStart(8, '0');
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateBearing(location: [number, number]): number {
    // Simplified bearing calculation
    // In a real system, this would use drone positions and proper geodetic calculations
    return Math.floor(Math.random() * 360); // Random bearing for demo
  }

  private getCountermeasureName(type: ElectronicCountermeasure['category']): string {
    const names = {
      'anti_jamming': 'Anti-Jamming Suite',
      'anti_spoofing': 'Anti-Spoofing Protection',
      'signal_protection': 'Signal Protection System',
      'cyber_defense': 'Cyber Defense Module'
    };
    return names[type] || 'Unknown Countermeasure';
  }

  private getCountermeasureConfiguration(type: ElectronicCountermeasure['category']): Record<string, any> {
    switch (type) {
      case 'anti_jamming':
        return {
          powerControl: this.configuration.adaptivePowerControl,
          nullSteering: this.configuration.nullSteering,
          frequencyHopping: this.configuration.frequencyHopping.enabled,
          spreadSpectrum: this.configuration.spreadSpectrum.enabled
        };
      case 'signal_protection':
        return {
          interferenceRejection: this.configuration.interferenceRejection.enabled,
          adaptiveFiltering: this.configuration.interferenceRejection.adaptiveFiltering
        };
      default:
        return {};
    }
  }

  private getDefaultConfiguration(): AntiJammingConfiguration {
    return {
      adaptivePowerControl: true,
      nullSteering: true,
      frequencyHopping: {
        enabled: true,
        patterns: ['default_pattern'],
        currentPattern: 'default_pattern',
        autoSwitch: true
      },
      spreadSpectrum: {
        enabled: true,
        chippingRate: 1000000,
        processingGain: 20
      },
      interferenceRejection: {
        enabled: true,
        notchFilters: [],
        adaptiveFiltering: true
      }
    };
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `anti-jamming-event-${Date.now()}`,
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
export const antiJamming = AntiJammingSystem.getInstance();

export function useAntiJamming() {
  const system = AntiJammingSystem.getInstance();
  
  return {
    startAntiJamming: () => system.startAntiJamming(),
    stopAntiJamming: () => system.stopAntiJamming(),
    updateConfiguration: (config: Partial<AntiJammingConfiguration>) => 
      system.updateConfiguration(config),
    deployCountermeasure: (type: ElectronicCountermeasure['category'], droneIds: string[], threatId?: string) => 
      system.deployCountermeasure(type, droneIds, threatId),
    getCountermeasureStatus: (countermeasureId: string) => 
      system.getCountermeasureStatus(countermeasureId),
    getActiveCountermeasures: () => system.getActiveCountermeasures(),
    getDroneAntiJammingStatus: (droneId: string) => 
      system.getDroneAntiJammingStatus(droneId),
  };
}