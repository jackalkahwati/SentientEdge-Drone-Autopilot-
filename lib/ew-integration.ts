// Electronic Warfare Integration System
// Central integration hub for all EW countermeasures with existing secure communications

import { 
  EWSystemStatus,
  EWThreat,
  EWEvent,
  ThreatSeverity,
  ElectronicCountermeasure
} from './types';
import { webSocketService } from './websocket';
import { gpsAntiSpoofing, useGPSAntiSpoofing } from './gps-anti-spoofing';
import { jammingDetection, useJammingDetection } from './jamming-detection';
import { antiJamming, useAntiJamming } from './anti-jamming';
import { frequencyHopping, useFrequencyHopping } from './frequency-hopping';
import { signalAnalysis, useSignalAnalysis } from './signal-analysis';
import { cyberDefense, useCyberDefense } from './cyber-defense';
import { fallbackProtocols, useFallbackProtocols } from './fallback-protocols';
import { signatureIdentification, useSignatureIdentification } from './signature-identification';
import { countermeasureDeployment, useCountermeasureDeployment } from './countermeasure-deployment';

// Integration configuration
const INTEGRATION_CONFIG = {
  STARTUP_SEQUENCE_DELAY: 2000,    // 2 second delay between system startups
  HEALTH_CHECK_INTERVAL: 10000,   // 10 seconds
  STATUS_BROADCAST_INTERVAL: 5000, // 5 seconds
  SYSTEM_COORDINATION_TIMEOUT: 30000, // 30 seconds
  AUTO_RECOVERY_ENABLED: true,
  CROSS_SYSTEM_VALIDATION: true
};

// System health tracking
interface SystemHealth {
  systemId: string;
  status: 'operational' | 'degraded' | 'failed' | 'starting' | 'stopping';
  lastUpdate: number;
  errors: string[];
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

export class EWIntegrationSystem {
  private static instance: EWIntegrationSystem;
  private isActive: boolean = false;
  private systemsHealth: Map<string, SystemHealth> = new Map();
  private consolidatedThreats: Map<string, EWThreat> = new Map();
  private systemEvents: EWEvent[] = [];
  private integrationCallbacks: Array<(event: any) => void> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private statusBroadcastInterval: NodeJS.Timeout | null = null;
  private startupSequence: Array<{ name: string; startFn: () => void; stopFn: () => void }> = [];

  private constructor() {
    this.initializeSystemsRegistry();
    this.setupWebSocketHandlers();
    this.setupCrossSystemCallbacks();
  }

  public static getInstance(): EWIntegrationSystem {
    if (!EWIntegrationSystem.instance) {
      EWIntegrationSystem.instance = new EWIntegrationSystem();
    }
    return EWIntegrationSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for system status requests
      webSocketService.subscribe('request_ew_system_status', () => {
        this.broadcastSystemStatus();
      });

      // Listen for emergency shutdown requests
      webSocketService.subscribe('emergency_ew_shutdown', () => {
        this.emergencyShutdown();
      });

      // Listen for system recovery requests
      webSocketService.subscribe('recover_ew_systems', () => {
        this.recoverFailedSystems();
      });

      // Listen for integration commands
      webSocketService.subscribe('ew_integration_command', (data) => {
        this.handleIntegrationCommand(data);
      });
    }
  }

  private setupCrossSystemCallbacks(): void {
    // Set up callbacks between systems for coordination
    
    // GPS Anti-Spoofing -> Signal Analysis coordination
    gpsAntiSpoofing.addDetectionCallback((threat) => {
      this.coordinateSignalAnalysis('gps_spoofing', threat);
    });

    // Jamming Detection -> Anti-Jamming coordination
    jammingDetection.addDetectionCallback((threat) => {
      this.coordinateAntiJamming('jamming', threat);
    });

    // Signal Analysis -> Signature Identification coordination
    signalAnalysis.addThreatCallback((threat) => {
      this.coordinateSignatureIdentification('signal_anomaly', threat);
    });

    // Signature Identification -> Countermeasure Deployment coordination
    signatureIdentification.addDetectionCallback((signature, confidence) => {
      this.coordinateCountermeasureDeployment('signature_match', { signature, confidence });
    });

    // Countermeasure Deployment status updates
    countermeasureDeployment.addDeploymentCallback((event) => {
      this.handleCountermeasureDeploymentEvent(event);
    });

    // Cyber Defense -> Fallback Protocols coordination
    cyberDefense.addThreatCallback((threat) => {
      this.coordinateFallbackProtocols('cyber_threat', threat);
    });
  }

  public async startAllSystems(): Promise<void> {
    if (this.isActive) return;

    console.log('Starting Electronic Warfare Integration System');
    this.isActive = true;

    try {
      // Start systems in coordinated sequence
      await this.executeStartupSequence();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start status broadcasting
      this.startStatusBroadcasting();

      console.log('All EW systems started successfully');
      this.emitIntegrationEvent('systems_started', 'low', 'All EW systems operational');

    } catch (error) {
      console.error('Failed to start EW systems:', error);
      this.emitIntegrationEvent('startup_failed', 'critical', `EW system startup failed: ${error}`);
      throw error;
    }
  }

  public async stopAllSystems(): Promise<void> {
    if (!this.isActive) return;

    console.log('Stopping Electronic Warfare Integration System');
    
    try {
      // Stop health monitoring
      this.stopHealthMonitoring();
      this.stopStatusBroadcasting();

      // Stop all systems in reverse order
      await this.executeShutdownSequence();

      this.isActive = false;
      console.log('All EW systems stopped successfully');
      this.emitIntegrationEvent('systems_stopped', 'low', 'All EW systems stopped');

    } catch (error) {
      console.error('Error during EW systems shutdown:', error);
      this.emitIntegrationEvent('shutdown_error', 'high', `EW system shutdown error: ${error}`);
    }
  }

  public getSystemStatus(): EWSystemStatus {
    const allThreats = Array.from(this.consolidatedThreats.values());
    const activeThreatCount = allThreats.filter(t => 
      !t.countermeasuresDeployed || t.countermeasuresDeployed.length === 0
    ).length;

    const overallThreatLevel = this.calculateOverallThreatLevel(allThreats);
    const activeCountermeasures = countermeasureDeployment.getActiveCountermeasures();

    return {
      timestamp: new Date().toISOString(),
      overallThreatLevel,
      activeThreatCount,
      countermeasuresActive: activeCountermeasures.length,
      systemHealth: {
        signalAnalysis: this.getSystemHealthStatus('signal-analysis'),
        threatDetection: this.getSystemHealthStatus('threat-detection'),
        countermeasures: this.getSystemHealthStatus('countermeasures'),
        communications: this.getSystemHealthStatus('communications')
      },
      performance: {
        detectionLatency: this.calculateAverageDetectionLatency(),
        falseAlarmRate: this.calculateFalseAlarmRate(),
        threatNeutralizationRate: this.calculateThreatNeutralizationRate(),
        systemResponseTime: this.calculateAverageResponseTime()
      },
      resourceUtilization: {
        cpu: this.calculateCPUUtilization(),
        memory: this.calculateMemoryUtilization(),
        bandwidth: this.calculateBandwidthUtilization()
      }
    };
  }

  public getConsolidatedThreats(): EWThreat[] {
    return Array.from(this.consolidatedThreats.values());
  }

  public getSystemsHealth(): SystemHealth[] {
    return Array.from(this.systemsHealth.values());
  }

  public addIntegrationCallback(callback: (event: any) => void): () => void {
    this.integrationCallbacks.push(callback);
    return () => {
      this.integrationCallbacks = this.integrationCallbacks.filter(cb => cb !== callback);
    };
  }

  public async recoverFailedSystems(): Promise<void> {
    console.log('Attempting to recover failed EW systems');

    const failedSystems = Array.from(this.systemsHealth.values())
      .filter(health => health.status === 'failed');

    if (failedSystems.length === 0) {
      console.log('No failed systems to recover');
      return;
    }

    for (const failedSystem of failedSystems) {
      try {
        console.log(`Attempting to recover system: ${failedSystem.systemId}`);
        
        // Find and restart the failed system
        const systemEntry = this.startupSequence.find(s => s.name === failedSystem.systemId);
        if (systemEntry) {
          // Stop and restart
          systemEntry.stopFn();
          await this.delay(2000); // Wait 2 seconds
          systemEntry.startFn();
          
          console.log(`System ${failedSystem.systemId} recovery initiated`);
        }
      } catch (error) {
        console.error(`Failed to recover system ${failedSystem.systemId}:`, error);
      }
    }

    this.emitIntegrationEvent('recovery_attempted', 'medium', 
      `Recovery attempted for ${failedSystems.length} failed systems`);
  }

  public emergencyShutdown(): void {
    console.log('EMERGENCY SHUTDOWN: Stopping all EW systems immediately');

    // Stop all systems without waiting
    this.startupSequence.forEach(system => {
      try {
        system.stopFn();
      } catch (error) {
        console.error(`Error stopping ${system.name} during emergency shutdown:`, error);
      }
    });

    this.isActive = false;
    this.emitIntegrationEvent('emergency_shutdown', 'critical', 'Emergency shutdown executed');
  }

  private initializeSystemsRegistry(): void {
    // Register all EW subsystems in startup order
    this.startupSequence = [
      {
        name: 'signal-analysis',
        startFn: () => signalAnalysis.startMonitoring(),
        stopFn: () => signalAnalysis.stopMonitoring()
      },
      {
        name: 'signature-identification', 
        startFn: () => signatureIdentification.startSignatureIdentification(),
        stopFn: () => signatureIdentification.stopSignatureIdentification()
      },
      {
        name: 'gps-anti-spoofing',
        startFn: () => gpsAntiSpoofing.startMonitoring(),
        stopFn: () => gpsAntiSpoofing.stopMonitoring()
      },
      {
        name: 'jamming-detection',
        startFn: () => jammingDetection.startMonitoring(),
        stopFn: () => jammingDetection.stopMonitoring()
      },
      {
        name: 'anti-jamming',
        startFn: () => antiJamming.startAntiJamming(),
        stopFn: () => antiJamming.stopAntiJamming()
      },
      {
        name: 'cyber-defense',
        startFn: () => cyberDefense.startCyberDefense(),
        stopFn: () => cyberDefense.stopCyberDefense()
      },
      {
        name: 'fallback-protocols',
        startFn: () => fallbackProtocols.startFallbackMonitoring(),
        stopFn: () => fallbackProtocols.stopFallbackMonitoring()
      },
      {
        name: 'countermeasure-deployment',
        startFn: () => countermeasureDeployment.startAutomatedDeployment(),
        stopFn: () => countermeasureDeployment.stopAutomatedDeployment()
      }
    ];

    // Initialize health tracking for all systems
    this.startupSequence.forEach(system => {
      this.systemsHealth.set(system.name, {
        systemId: system.name,
        status: 'operational',
        lastUpdate: Date.now(),
        errors: [],
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 0
        }
      });
    });
  }

  private async executeStartupSequence(): Promise<void> {
    for (const system of this.startupSequence) {
      try {
        console.log(`Starting system: ${system.name}`);
        
        // Update status to starting
        const health = this.systemsHealth.get(system.name);
        if (health) {
          health.status = 'starting';
          health.lastUpdate = Date.now();
        }

        // Start the system
        system.startFn();
        
        // Update status to operational
        setTimeout(() => {
          const health = this.systemsHealth.get(system.name);
          if (health) {
            health.status = 'operational';
            health.lastUpdate = Date.now();
          }
        }, 1000);

        // Wait before starting next system
        await this.delay(INTEGRATION_CONFIG.STARTUP_SEQUENCE_DELAY);

      } catch (error) {
        console.error(`Failed to start system ${system.name}:`, error);
        
        const health = this.systemsHealth.get(system.name);
        if (health) {
          health.status = 'failed';
          health.errors.push(`Startup error: ${error}`);
          health.lastUpdate = Date.now();
        }

        throw new Error(`System startup failed: ${system.name}`);
      }
    }
  }

  private async executeShutdownSequence(): Promise<void> {
    // Shutdown in reverse order
    const shutdownOrder = [...this.startupSequence].reverse();
    
    for (const system of shutdownOrder) {
      try {
        console.log(`Stopping system: ${system.name}`);
        
        // Update status to stopping
        const health = this.systemsHealth.get(system.name);
        if (health) {
          health.status = 'stopping';
          health.lastUpdate = Date.now();
        }

        // Stop the system
        system.stopFn();
        
        // Wait before stopping next system
        await this.delay(1000);

      } catch (error) {
        console.error(`Error stopping system ${system.name}:`, error);
        
        const health = this.systemsHealth.get(system.name);
        if (health) {
          health.errors.push(`Shutdown error: ${error}`);
          health.lastUpdate = Date.now();
        }
      }
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, INTEGRATION_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private startStatusBroadcasting(): void {
    this.statusBroadcastInterval = setInterval(() => {
      this.broadcastSystemStatus();
    }, INTEGRATION_CONFIG.STATUS_BROADCAST_INTERVAL);
  }

  private stopStatusBroadcasting(): void {
    if (this.statusBroadcastInterval) {
      clearInterval(this.statusBroadcastInterval);
      this.statusBroadcastInterval = null;
    }
  }

  private performHealthChecks(): void {
    this.systemsHealth.forEach((health, systemId) => {
      const now = Date.now();
      const timeSinceUpdate = now - health.lastUpdate;

      // Check if system is responsive
      if (timeSinceUpdate > INTEGRATION_CONFIG.HEALTH_CHECK_INTERVAL * 2) {
        if (health.status === 'operational') {
          console.warn(`System ${systemId} appears unresponsive`);
          health.status = 'degraded';
          health.errors.push('System unresponsive');
        }
      }

      // Auto-recovery for failed systems
      if (INTEGRATION_CONFIG.AUTO_RECOVERY_ENABLED && health.status === 'failed') {
        const timeSinceFailed = now - health.lastUpdate;
        if (timeSinceFailed > 60000) { // 1 minute
          console.log(`Attempting auto-recovery for ${systemId}`);
          this.attemptSystemRecovery(systemId);
        }
      }
    });
  }

  private attemptSystemRecovery(systemId: string): void {
    const systemEntry = this.startupSequence.find(s => s.name === systemId);
    if (systemEntry) {
      try {
        console.log(`Auto-recovery: Restarting ${systemId}`);
        systemEntry.stopFn();
        setTimeout(() => {
          systemEntry.startFn();
          const health = this.systemsHealth.get(systemId);
          if (health) {
            health.status = 'starting';
            health.lastUpdate = Date.now();
          }
        }, 2000);
      } catch (error) {
        console.error(`Auto-recovery failed for ${systemId}:`, error);
      }
    }
  }

  private broadcastSystemStatus(): void {
    const status = this.getSystemStatus();
    
    if (webSocketService) {
      webSocketService.send('ew_system_status', status);
    }

    // Log critical status changes
    if (status.overallThreatLevel === 'critical') {
      console.warn('CRITICAL THREAT LEVEL DETECTED');
    }
  }

  private coordinateSignalAnalysis(eventType: string, data: any): void {
    console.log(`Coordinating signal analysis for ${eventType}`);
    
    // Request focused spectrum analysis on GPS frequencies
    if (eventType === 'gps_spoofing') {
      signalAnalysis.configureSweepParameters({
        startFreq: 1570,
        endFreq: 1580,
        stepSize: 0.1
      });
    }
  }

  private coordinateAntiJamming(eventType: string, threat: EWThreat): void {
    console.log(`Coordinating anti-jamming measures for ${eventType}`);
    
    // Automatically deploy anti-jamming countermeasures
    const affectedDrones = threat.impact.dronesAffected;
    if (affectedDrones.length > 0) {
      antiJamming.deployCountermeasure('anti_jamming', affectedDrones, threat.id);
    }
  }

  private coordinateSignatureIdentification(eventType: string, threat: EWThreat): void {
    console.log(`Coordinating signature identification for ${eventType}`);
    
    // Add signal data to signature identification system
    // This would normally pass the raw signal data
  }

  private coordinateCountermeasureDeployment(eventType: string, data: any): void {
    console.log(`Coordinating countermeasure deployment for ${eventType}`);
    
    if (eventType === 'signature_match') {
      const { signature, confidence } = data;
      
      // Create threat from signature match
      const threat: EWThreat = {
        id: `sig_threat_${Date.now()}`,
        type: signature.type,
        severity: signature.threatLevel,
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        affectedSystems: ['communication'],
        characteristics: {
          signature: signature.id
        },
        impact: {
          dronesAffected: [],
          communicationLoss: signature.type === 'jamming',
          navigationDegraded: signature.type === 'spoofing',
          missionCompromised: signature.threatLevel === 'critical'
        },
        confidence,
        countermeasuresDeployed: []
      };

      this.consolidatedThreats.set(threat.id, threat);
    }
  }

  private coordinateFallbackProtocols(eventType: string, threat: any): void {
    console.log(`Coordinating fallback protocols for ${eventType}`);
    
    // Activate fallback communication channels for cyber threats
    if (eventType === 'cyber_threat' && threat.impact?.systemAvailability) {
      // This would trigger fallback protocol activation
    }
  }

  private handleCountermeasureDeploymentEvent(event: any): void {
    console.log(`Countermeasure deployment event: ${event.type}`);
    
    // Update threat status based on countermeasure deployment
    if (event.type === 'countermeasures_deployed') {
      const threat = this.consolidatedThreats.get(event.threatId);
      if (threat) {
        threat.countermeasuresDeployed = event.countermeasures;
        threat.lastUpdated = new Date().toISOString();
      }
    }
  }

  private handleIntegrationCommand(data: any): void {
    const { command, parameters } = data;
    
    switch (command) {
      case 'start_system':
        this.startSpecificSystem(parameters.systemId);
        break;
      case 'stop_system':
        this.stopSpecificSystem(parameters.systemId);
        break;
      case 'restart_system':
        this.restartSpecificSystem(parameters.systemId);
        break;
      case 'configure_system':
        this.configureSystem(parameters.systemId, parameters.configuration);
        break;
    }
  }

  private startSpecificSystem(systemId: string): void {
    const systemEntry = this.startupSequence.find(s => s.name === systemId);
    if (systemEntry) {
      try {
        systemEntry.startFn();
        const health = this.systemsHealth.get(systemId);
        if (health) {
          health.status = 'operational';
          health.lastUpdate = Date.now();
        }
        console.log(`Started system: ${systemId}`);
      } catch (error) {
        console.error(`Failed to start system ${systemId}:`, error);
      }
    }
  }

  private stopSpecificSystem(systemId: string): void {
    const systemEntry = this.startupSequence.find(s => s.name === systemId);
    if (systemEntry) {
      try {
        systemEntry.stopFn();
        console.log(`Stopped system: ${systemId}`);
      } catch (error) {
        console.error(`Failed to stop system ${systemId}:`, error);
      }
    }
  }

  private restartSpecificSystem(systemId: string): void {
    this.stopSpecificSystem(systemId);
    setTimeout(() => {
      this.startSpecificSystem(systemId);
    }, 2000);
  }

  private configureSystem(systemId: string, configuration: any): void {
    console.log(`Configuring system ${systemId}:`, configuration);
    
    // Route configuration to appropriate system
    switch (systemId) {
      case 'signal-analysis':
        signalAnalysis.configureSweepParameters(configuration);
        break;
      case 'anti-jamming':
        antiJamming.updateConfiguration(configuration);
        break;
      // Add other system configurations as needed
    }
  }

  private getSystemHealthStatus(category: string): 'operational' | 'degraded' | 'failed' {
    // Map categories to actual systems
    const systemMapping = {
      'signal-analysis': ['signal-analysis'],
      'threat-detection': ['gps-anti-spoofing', 'jamming-detection', 'cyber-defense'],
      'countermeasures': ['anti-jamming', 'countermeasure-deployment'],
      'communications': ['fallback-protocols']
    };

    const systems = systemMapping[category as keyof typeof systemMapping] || [];
    const healthStatuses = systems.map(sysId => {
      const health = this.systemsHealth.get(sysId);
      return health?.status || 'failed';
    });

    // Return worst status
    if (healthStatuses.includes('failed')) return 'failed';
    if (healthStatuses.includes('degraded')) return 'degraded';
    return 'operational';
  }

  private calculateOverallThreatLevel(threats: EWThreat[]): ThreatSeverity {
    if (threats.length === 0) return 'low';
    
    const levels = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    const maxLevel = Math.max(...threats.map(t => levels[t.severity]));
    
    const levelNames: ThreatSeverity[] = ['low', 'medium', 'high', 'critical'];
    return levelNames[maxLevel];
  }

  private calculateAverageDetectionLatency(): number {
    // Simplified calculation - would normally aggregate from all systems
    return 1500; // 1.5 seconds
  }

  private calculateFalseAlarmRate(): number {
    // Simplified calculation - would normally aggregate from all systems
    return 0.05; // 5%
  }

  private calculateThreatNeutralizationRate(): number {
    const threats = Array.from(this.consolidatedThreats.values());
    if (threats.length === 0) return 1.0;
    
    const neutralized = threats.filter(t => t.countermeasuresDeployed.length > 0).length;
    return neutralized / threats.length;
  }

  private calculateAverageResponseTime(): number {
    // Simplified calculation - would normally aggregate from all systems
    return 3000; // 3 seconds
  }

  private calculateCPUUtilization(): number {
    // Aggregate CPU usage from all active countermeasures
    const activeCountermeasures = countermeasureDeployment.getActiveCountermeasures();
    return activeCountermeasures.reduce((total, cm) => total + cm.resourceUsage.cpu, 0);
  }

  private calculateMemoryUtilization(): number {
    // Simplified calculation
    return Math.min(40 + (this.consolidatedThreats.size * 5), 80); // 40-80%
  }

  private calculateBandwidthUtilization(): number {
    // Simplified calculation based on active systems
    const activeSystems = Array.from(this.systemsHealth.values())
      .filter(h => h.status === 'operational').length;
    return Math.min(activeSystems * 8, 60); // 8% per system, max 60%
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitIntegrationEvent(type: string, severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `integration-event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: type as EWEvent['type'],
      severity,
      message,
      details: {},
      acknowledged: false
    };

    this.systemEvents.push(event);
    
    // Keep only recent events
    if (this.systemEvents.length > 1000) {
      this.systemEvents = this.systemEvents.slice(-1000);
    }

    // Notify callbacks
    this.integrationCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in integration callback:', error);
      }
    });

    if (webSocketService) {
      webSocketService.send('ew_event', event);
    }
  }
}

// Export singleton instance and hooks
export const ewIntegration = EWIntegrationSystem.getInstance();

export function useEWIntegration() {
  const system = EWIntegrationSystem.getInstance();
  
  return {
    startAllSystems: () => system.startAllSystems(),
    stopAllSystems: () => system.stopAllSystems(),
    getSystemStatus: () => system.getSystemStatus(),
    getConsolidatedThreats: () => system.getConsolidatedThreats(),
    getSystemsHealth: () => system.getSystemsHealth(),
    addIntegrationCallback: (callback: (event: any) => void) => 
      system.addIntegrationCallback(callback),
    recoverFailedSystems: () => system.recoverFailedSystems(),
    emergencyShutdown: () => system.emergencyShutdown(),
  };
}

// Convenient hook that provides access to all EW subsystems
export function useAllEWCountermeasures() {
  return {
    integration: useEWIntegration(),
    gpsAntiSpoofing: useGPSAntiSpoofing(),
    jammingDetection: useJammingDetection(),
    antiJamming: useAntiJamming(),
    frequencyHopping: useFrequencyHopping(),
    signalAnalysis: useSignalAnalysis(),
    cyberDefense: useCyberDefense(),
    fallbackProtocols: useFallbackProtocols(),
    signatureIdentification: useSignatureIdentification(),
    countermeasureDeployment: useCountermeasureDeployment(),
  };
}