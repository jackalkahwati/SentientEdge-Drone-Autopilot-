// Communication Jamming Detection and Response System
// Military-grade jamming detection and automated countermeasures

import { 
  CommunicationHealth, 
  EWThreat, 
  ThreatSeverity,
  RFSignalData,
  SpectrumAnalysis,
  EWEvent,
  AntiJammingConfiguration,
  ElectronicCountermeasure
} from './types';
import { webSocketService } from './websocket';

// Jamming detection thresholds and parameters
const JAMMING_THRESHOLDS = {
  SIGNAL_DEGRADATION: {
    MINOR: 0.15,    // 15% signal quality drop
    MODERATE: 0.35, // 35% signal quality drop
    SEVERE: 0.60,   // 60% signal quality drop
    CRITICAL: 0.80  // 80% signal quality drop
  },
  PACKET_LOSS: {
    MINOR: 0.05,    // 5% packet loss
    MODERATE: 0.15, // 15% packet loss
    SEVERE: 0.35,   // 35% packet loss
    CRITICAL: 0.60  // 60% packet loss
  },
  LATENCY_INCREASE: {
    MINOR: 1.5,     // 1.5x normal latency
    MODERATE: 3.0,  // 3x normal latency
    SEVERE: 5.0,    // 5x normal latency
    CRITICAL: 10.0  // 10x normal latency
  },
  SNR_DEGRADATION: {
    MINOR: -3,      // 3dB SNR drop
    MODERATE: -6,   // 6dB SNR drop
    SEVERE: -10,    // 10dB SNR drop
    CRITICAL: -15   // 15dB SNR drop
  },
  NOISE_FLOOR_INCREASE: 10 // dB increase above baseline
};

// Communication frequency bands for different protocols
const COMM_FREQUENCIES = {
  mavlink: { center: 915, bandwidth: 26 }, // MHz, ISM band
  cyphal: { center: 2400, bandwidth: 80 }, // 2.4GHz ISM
  control: { center: 5800, bandwidth: 20 }, // 5.8GHz
  video: { center: 1200, bandwidth: 50 },  // 1.2GHz
  telemetry: { center: 433, bandwidth: 1 } // 433MHz
};

export class JammingDetectionSystem {
  private static instance: JammingDetectionSystem;
  private isActive: boolean = false;
  private commHealthHistory: Map<string, CommunicationHealth[]> = new Map();
  private baselineMetrics: Map<string, CommunicationHealth> = new Map();
  private activeJammingThreats: Map<string, EWThreat> = new Map();
  private detectionCallbacks: Array<(threat: EWThreat) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private spectrumAnalysisInterval: NodeJS.Timeout | null = null;
  private antiJammingConfig: AntiJammingConfiguration;

  private constructor() {
    this.antiJammingConfig = this.getDefaultAntiJammingConfig();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): JammingDetectionSystem {
    if (!JammingDetectionSystem.instance) {
      JammingDetectionSystem.instance = new JammingDetectionSystem();
    }
    return JammingDetectionSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for communication health data
      webSocketService.subscribe('communication_health', (data) => {
        this.processCommunicationHealth(data);
      });

      // Listen for spectrum analysis data
      webSocketService.subscribe('spectrum_analysis', (data) => {
        this.processSpectrumAnalysis(data);
      });

      // Listen for RF signal data
      webSocketService.subscribe('rf_signal_data', (data) => {
        this.processRFSignalData(data);
      });
    }
  }

  public startMonitoring(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Jamming Detection System activated');

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.performContinuousAnalysis();
    }, 2000); // Check every 2 seconds

    // Start spectrum analysis monitoring
    this.spectrumAnalysisInterval = setInterval(() => {
      this.requestSpectrumAnalysis();
    }, 5000); // Request spectrum sweep every 5 seconds

    this.emitEvent('system_alert', 'low', 'Jamming Detection System activated');
  }

  public stopMonitoring(): void {
    if (!this.isActive) return;

    this.isActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.spectrumAnalysisInterval) {
      clearInterval(this.spectrumAnalysisInterval);
      this.spectrumAnalysisInterval = null;
    }

    console.log('Jamming Detection System deactivated');
    this.emitEvent('system_alert', 'low', 'Jamming Detection System deactivated');
  }

  public addDetectionCallback(callback: (threat: EWThreat) => void): () => void {
    this.detectionCallbacks.push(callback);
    return () => {
      this.detectionCallbacks = this.detectionCallbacks.filter(cb => cb !== callback);
    };
  }

  public getActiveJammingCount(): number {
    return this.activeJammingThreats.size;
  }

  public updateAntiJammingConfig(config: Partial<AntiJammingConfiguration>): void {
    this.antiJammingConfig = { ...this.antiJammingConfig, ...config };
    
    if (webSocketService) {
      webSocketService.sendSecure('anti_jamming_config_update', this.antiJammingConfig);
    }
  }

  private processCommunicationHealth(data: CommunicationHealth): void {
    if (!this.isActive) return;

    const droneId = data.droneId;
    
    // Store historical data
    this.storeCommunicationHistory(droneId, data);

    // Perform jamming analysis
    const jammingAnalysis = this.analyzeJammingIndicators(droneId, data);
    
    if (jammingAnalysis.jammingDetected) {
      this.handleJammingDetection(droneId, data, jammingAnalysis);
    }

    // Update baseline if communication appears normal
    if (!jammingAnalysis.jammingDetected && data.linkQuality > 85) {
      this.updateBaseline(droneId, data);
    }
  }

  private processSpectrumAnalysis(data: SpectrumAnalysis): void {
    if (!this.isActive) return;

    // Analyze spectrum for jamming signatures
    if (data.jammingDetected || data.interferenceDetected) {
      this.analyzeSpectrumJamming(data);
    }

    // Check for suspicious signals
    data.signals.forEach(signal => {
      if (this.isJammingSignature(signal)) {
        this.handleSpectrumJamming(signal, data);
      }
    });
  }

  private processRFSignalData(data: RFSignalData): void {
    if (!this.isActive) return;

    // Check if this signal could be a jammer
    if (this.isJammingSignature(data)) {
      console.log('Potential jamming signal detected:', {
        frequency: data.frequency,
        power: data.signalStrength,
        classification: data.classification
      });
    }
  }

  private analyzeJammingIndicators(droneId: string, health: CommunicationHealth): {
    jammingDetected: boolean;
    jammingType?: string;
    severity: ThreatSeverity;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let jammingScore = 0;
    let jammingType = 'unknown';

    // 1. Signal Quality Analysis
    const baseline = this.baselineMetrics.get(droneId);
    if (baseline) {
      const qualityDrop = (baseline.linkQuality - health.linkQuality) / baseline.linkQuality;
      
      if (qualityDrop > JAMMING_THRESHOLDS.SIGNAL_DEGRADATION.CRITICAL) {
        jammingScore += 0.4;
        indicators.push('Critical signal quality degradation');
      } else if (qualityDrop > JAMMING_THRESHOLDS.SIGNAL_DEGRADATION.SEVERE) {
        jammingScore += 0.3;
        indicators.push('Severe signal quality degradation');
      } else if (qualityDrop > JAMMING_THRESHOLDS.SIGNAL_DEGRADATION.MODERATE) {
        jammingScore += 0.2;
        indicators.push('Moderate signal quality degradation');
      }
    }

    // 2. Packet Loss Analysis
    if (health.packetLoss > JAMMING_THRESHOLDS.PACKET_LOSS.CRITICAL) {
      jammingScore += 0.3;
      indicators.push('Critical packet loss detected');
      jammingType = 'barrage'; // High packet loss suggests barrage jamming
    } else if (health.packetLoss > JAMMING_THRESHOLDS.PACKET_LOSS.SEVERE) {
      jammingScore += 0.25;
      indicators.push('Severe packet loss detected');
    }

    // 3. Latency Analysis
    if (baseline) {
      const latencyIncrease = health.latency / baseline.latency;
      
      if (latencyIncrease > JAMMING_THRESHOLDS.LATENCY_INCREASE.CRITICAL) {
        jammingScore += 0.25;
        indicators.push('Critical latency increase');
      } else if (latencyIncrease > JAMMING_THRESHOLDS.LATENCY_INCREASE.SEVERE) {
        jammingScore += 0.2;
        indicators.push('Severe latency increase');
      }
    }

    // 4. Error Rate Analysis
    if (health.errorRate > 0.1) { // 10% error rate
      jammingScore += 0.2;
      indicators.push('High bit error rate');
    }

    // 5. Signal Strength Analysis
    if (baseline) {
      const signalDrop = baseline.signalStrength - health.signalStrength;
      if (signalDrop > 10) { // 10dB drop
        jammingScore += 0.15;
        indicators.push('Significant signal strength drop');
      }
    }

    // 6. Pattern Analysis from History
    const patternAnalysis = this.analyzeJammingPatterns(droneId, health);
    if (patternAnalysis.suspiciousPattern) {
      jammingScore += patternAnalysis.confidence * 0.3;
      indicators.push(...patternAnalysis.indicators);
      if (patternAnalysis.type) {
        jammingType = patternAnalysis.type;
      }
    }

    // 7. Check for explicit jamming detection
    if (health.jamming.detected) {
      jammingScore += 0.5;
      indicators.push('Explicit jamming detection by radio');
      if (health.jamming.type) {
        jammingType = health.jamming.type;
      }
    }

    // Determine severity based on score and indicators
    let severity: ThreatSeverity = 'low';
    if (jammingScore > 0.8) {
      severity = 'critical';
    } else if (jammingScore > 0.6) {
      severity = 'high';
    } else if (jammingScore > 0.4) {
      severity = 'medium';
    }

    const jammingDetected = jammingScore > 0.3; // 30% confidence threshold

    return {
      jammingDetected,
      jammingType: jammingDetected ? jammingType : undefined,
      severity,
      confidence: Math.min(jammingScore, 1.0),
      indicators
    };
  }

  private analyzeJammingPatterns(droneId: string, currentHealth: CommunicationHealth): {
    suspiciousPattern: boolean;
    confidence: number;
    indicators: string[];
    type?: string;
  } {
    const history = this.commHealthHistory.get(droneId) || [];
    if (history.length < 5) {
      return { suspiciousPattern: false, confidence: 0, indicators: [] };
    }

    const indicators: string[] = [];
    let confidence = 0;
    let jammingType: string | undefined;

    const recentHistory = history.slice(-10);

    // 1. Periodic jamming pattern detection
    const periodicPattern = this.detectPeriodicJamming(recentHistory);
    if (periodicPattern.detected) {
      confidence += 0.4;
      indicators.push('Periodic jamming pattern detected');
      jammingType = 'pulse';
    }

    // 2. Sweep jamming detection
    const sweepPattern = this.detectSweepJamming(recentHistory);
    if (sweepPattern.detected) {
      confidence += 0.5;
      indicators.push('Sweep jamming pattern detected');
      jammingType = 'sweep';
    }

    // 3. Sudden onset detection
    const suddenOnset = this.detectSuddenJammingOnset(recentHistory, currentHealth);
    if (suddenOnset.detected) {
      confidence += 0.3;
      indicators.push('Sudden jamming onset detected');
    }

    // 4. Frequency-selective jamming
    const selectiveJamming = this.detectSelectiveJamming(recentHistory);
    if (selectiveJamming.detected) {
      confidence += 0.4;
      indicators.push('Frequency-selective jamming detected');
      jammingType = 'spot';
    }

    return {
      suspiciousPattern: confidence > 0.3,
      confidence: Math.min(confidence, 1.0),
      indicators,
      type: jammingType
    };
  }

  private detectPeriodicJamming(history: CommunicationHealth[]): { detected: boolean; period?: number } {
    if (history.length < 8) return { detected: false };

    // Look for periodic patterns in link quality
    const qualities = history.map(h => h.linkQuality);
    const periods = [2, 3, 4, 5]; // Check for these period lengths

    for (const period of periods) {
      let correlation = 0;
      let samples = 0;

      for (let i = period; i < qualities.length; i++) {
        const current = qualities[i];
        const previous = qualities[i - period];
        
        // Check if there's a correlation in degradation
        if (Math.abs(current - previous) < 10) { // Similar quality levels
          correlation++;
        }
        samples++;
      }

      if (samples > 0 && correlation / samples > 0.7) { // 70% correlation
        return { detected: true, period };
      }
    }

    return { detected: false };
  }

  private detectSweepJamming(history: CommunicationHealth[]): { detected: boolean } {
    if (history.length < 6) return { detected: false };

    // Look for systematic signal strength changes suggesting frequency sweeping
    const signalStrengths = history.map(h => h.signalStrength);
    let sweepIndications = 0;

    for (let i = 1; i < signalStrengths.length - 1; i++) {
      const prev = signalStrengths[i - 1];
      const curr = signalStrengths[i];
      const next = signalStrengths[i + 1];

      // Look for V-shaped patterns (signal drop then recovery)
      if (curr < prev - 5 && next > curr + 3) {
        sweepIndications++;
      }
    }

    return { detected: sweepIndications >= 2 };
  }

  private detectSuddenJammingOnset(history: CommunicationHealth[], current: CommunicationHealth): { detected: boolean } {
    if (history.length < 3) return { detected: false };

    const recentAvg = history.slice(-3).reduce((sum, h) => sum + h.linkQuality, 0) / 3;
    const qualityDrop = (recentAvg - current.linkQuality) / recentAvg;

    // Sudden drop of more than 40% indicates possible jamming onset
    return { detected: qualityDrop > 0.4 };
  }

  private detectSelectiveJamming(history: CommunicationHealth[]): { detected: boolean } {
    // This would analyze if only specific frequency bands are being jammed
    // For now, we'll use a simplified heuristic based on error patterns
    
    if (history.length < 5) return { detected: false };

    const errorRates = history.map(h => h.errorRate);
    const avgError = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;
    
    // Look for consistently high error rates without complete signal loss
    const highErrorCount = errorRates.filter(rate => rate > 0.05).length;
    
    return { 
      detected: highErrorCount > history.length * 0.6 && avgError < 0.3 
    };
  }

  private isJammingSignature(signal: RFSignalData): boolean {
    // Check if signal characteristics match known jamming signatures
    
    // 1. Check power levels - jammers often have high power
    if (signal.signalStrength > -60) { // Very strong signal
      return true;
    }

    // 2. Check for signals in communication bands
    for (const [protocol, freq] of Object.entries(COMM_FREQUENCIES)) {
      const lowerBound = freq.center - freq.bandwidth / 2;
      const upperBound = freq.center + freq.bandwidth / 2;
      
      if (signal.frequency >= lowerBound && signal.frequency <= upperBound) {
        // Signal in communication band with suspicious characteristics
        if (signal.bandwidth > freq.bandwidth * 2) { // Abnormally wide bandwidth
          return true;
        }
        
        if (signal.classification === 'hostile' || signal.classification === 'unknown') {
          return true;
        }
      }
    }

    // 3. Check for noise-like characteristics (barrage jamming)
    if (signal.snr < -10 && signal.bandwidth > 20) { // Wide, noisy signal
      return true;
    }

    return false;
  }

  private analyzeSpectrumJamming(spectrum: SpectrumAnalysis): void {
    const jammingSignals = spectrum.signals.filter(signal => this.isJammingSignature(signal));
    
    if (jammingSignals.length > 0) {
      jammingSignals.forEach(signal => {
        this.handleSpectrumJamming(signal, spectrum);
      });
    }
  }

  private handleSpectrumJamming(signal: RFSignalData, spectrum: SpectrumAnalysis): void {
    const threatId = `spectrum-jamming-${Date.now()}`;
    
    const threat: EWThreat = {
      id: threatId,
      type: 'jamming',
      severity: this.calculateJammingSeverity(signal),
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: signal.sourceLocation ? {
        location: signal.sourceLocation,
        estimated: true
      } : undefined,
      affectedSystems: this.determineAffectedSystems(signal.frequency),
      characteristics: {
        frequency: signal.frequency,
        bandwidth: signal.bandwidth,
        power: signal.signalStrength,
        signature: signal.signature
      },
      impact: {
        dronesAffected: [], // Will be filled based on affected systems
        communicationLoss: true,
        navigationDegraded: false,
        missionCompromised: true
      },
      confidence: 0.8, // High confidence from spectrum analysis
      countermeasuresDeployed: []
    };

    this.reportThreat(threat);
    this.initiateJammingCountermeasures(threat);
  }

  private handleJammingDetection(droneId: string, health: CommunicationHealth, analysis: any): void {
    const threatId = `comm-jamming-${droneId}-${Date.now()}`;
    
    const threat: EWThreat = {
      id: threatId,
      type: 'jamming',
      severity: analysis.severity,
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      affectedSystems: ['communication'],
      characteristics: {
        signature: this.generateJammingSignature(health, analysis)
      },
      impact: {
        dronesAffected: [droneId],
        communicationLoss: analysis.severity === 'critical' || analysis.severity === 'high',
        navigationDegraded: false,
        missionCompromised: analysis.severity === 'critical'
      },
      confidence: analysis.confidence,
      countermeasuresDeployed: []
    };

    this.reportThreat(threat);
    this.initiateJammingCountermeasures(threat);
  }

  private initiateJammingCountermeasures(threat: EWThreat): void {
    const countermeasures: string[] = [];

    // 1. Activate frequency hopping if configured
    if (this.antiJammingConfig.frequencyHopping.enabled) {
      this.activateFrequencyHopping(threat);
      countermeasures.push('frequency_hopping');
    }

    // 2. Increase transmission power if needed
    if (this.antiJammingConfig.adaptivePowerControl) {
      this.activateAdaptivePowerControl(threat);
      countermeasures.push('adaptive_power_control');
    }

    // 3. Switch to backup communication channels
    this.activateBackupChannels(threat);
    countermeasures.push('backup_channels');

    // 4. Implement null steering if available
    if (this.antiJammingConfig.nullSteering) {
      this.activateNullSteering(threat);
      countermeasures.push('null_steering');
    }

    // 5. For severe jamming, activate emergency protocols
    if (threat.severity === 'critical' || threat.severity === 'high') {
      this.activateEmergencyCommProtocols(threat);
      countermeasures.push('emergency_protocols');
    }

    // Update threat with deployed countermeasures
    threat.countermeasuresDeployed = countermeasures;
    this.activeJammingThreats.set(threat.id, threat);

    console.log(`Jamming countermeasures activated:`, countermeasures);
  }

  private activateFrequencyHopping(threat: EWThreat): void {
    if (webSocketService) {
      webSocketService.sendSecure('activate_frequency_hopping', {
        threatId: threat.id,
        affectedDrones: threat.impact.dronesAffected,
        pattern: this.antiJammingConfig.frequencyHopping.currentPattern,
        autoSwitch: this.antiJammingConfig.frequencyHopping.autoSwitch,
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateAdaptivePowerControl(threat: EWThreat): void {
    if (webSocketService) {
      webSocketService.sendSecure('activate_adaptive_power', {
        threatId: threat.id,
        affectedDrones: threat.impact.dronesAffected,
        powerIncrease: this.calculateRequiredPowerIncrease(threat),
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateBackupChannels(threat: EWThreat): void {
    if (webSocketService) {
      webSocketService.sendSecure('activate_backup_channels', {
        threatId: threat.id,
        affectedDrones: threat.impact.dronesAffected,
        primaryChannelAffected: threat.characteristics.frequency,
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateNullSteering(threat: EWThreat): void {
    if (webSocketService && threat.source?.location) {
      webSocketService.sendSecure('activate_null_steering', {
        threatId: threat.id,
        jammerLocation: threat.source.location,
        frequency: threat.characteristics.frequency,
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateEmergencyCommProtocols(threat: EWThreat): void {
    if (webSocketService) {
      webSocketService.sendSecure('emergency_comm_protocol', {
        threatId: threat.id,
        affectedDrones: threat.impact.dronesAffected,
        protocol: 'jamming_resilience',
        actions: ['reduce_data_rate', 'increase_error_correction', 'switch_protocols'],
        timestamp: new Date().toISOString()
      });
    }
  }

  private calculateJammingSeverity(signal: RFSignalData): ThreatSeverity {
    let severityScore = 0;

    // High power signals are more concerning
    if (signal.signalStrength > -50) severityScore += 0.4;
    else if (signal.signalStrength > -70) severityScore += 0.3;
    else if (signal.signalStrength > -90) severityScore += 0.2;

    // Wide bandwidth suggests barrage jamming
    if (signal.bandwidth > 50) severityScore += 0.3;
    else if (signal.bandwidth > 20) severityScore += 0.2;

    // Low SNR indicates effective jamming
    if (signal.snr < -10) severityScore += 0.3;
    else if (signal.snr < -5) severityScore += 0.2;

    if (severityScore > 0.8) return 'critical';
    if (severityScore > 0.6) return 'high';
    if (severityScore > 0.4) return 'medium';
    return 'low';
  }

  private calculateRequiredPowerIncrease(threat: EWThreat): number {
    // Calculate required power increase based on jamming strength
    const jammerPower = threat.characteristics.power || -80;
    const requiredSNR = 10; // 10dB minimum SNR for reliable communication
    
    // Simple calculation: increase power to overcome jamming + required SNR
    return Math.max(0, Math.abs(jammerPower) + requiredSNR - 20); // 20dBm typical transmit power
  }

  private determineAffectedSystems(frequency: number): Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> {
    const affected: Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> = [];

    // Check which systems operate in this frequency range
    if (frequency >= 1575 && frequency <= 1580) affected.push('gps');
    if (frequency >= 900 && frequency <= 950) affected.push('communication');
    if (frequency >= 2400 && frequency <= 2500) affected.push('communication');
    if (frequency >= 5700 && frequency <= 5900) affected.push('communication');
    if (frequency >= 400 && frequency <= 470) affected.push('telemetry');

    return affected.length > 0 ? affected : ['communication'];
  }

  private performContinuousAnalysis(): void {
    // Analyze trends across all monitored drones
    this.commHealthHistory.forEach((history, droneId) => {
      if (history.length > 3) {
        const recentHealth = history.slice(-3);
        const trendAnalysis = this.analyzeCommunicationTrends(recentHealth);
        
        if (trendAnalysis.deteriorating) {
          console.log(`Communication deteriorating for ${droneId}:`, trendAnalysis.indicators);
        }
      }
    });

    // Clean up old threats
    this.cleanupOldThreats();
  }

  private requestSpectrumAnalysis(): void {
    if (webSocketService) {
      webSocketService.send('request_spectrum_analysis', {
        frequencyRange: [400, 6000], // 400MHz to 6GHz
        priority: 'high',
        timestamp: new Date().toISOString()
      });
    }
  }

  private analyzeCommunicationTrends(healthData: CommunicationHealth[]): {
    deteriorating: boolean;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let deteriorating = false;

    // Analyze quality trend
    const qualities = healthData.map(h => h.linkQuality);
    const qualityTrend = this.calculateTrend(qualities);
    
    if (qualityTrend < -5) { // Decreasing quality
      deteriorating = true;
      indicators.push('Link quality deteriorating');
    }

    // Analyze latency trend
    const latencies = healthData.map(h => h.latency);
    const latencyTrend = this.calculateTrend(latencies);
    
    if (latencyTrend > 10) { // Increasing latency
      deteriorating = true;
      indicators.push('Latency increasing');
    }

    return { deteriorating, indicators };
  }

  private cleanupOldThreats(): void {
    const now = new Date();
    const threatsToRemove: string[] = [];

    this.activeJammingThreats.forEach((threat, id) => {
      const age = now.getTime() - new Date(threat.detectedAt).getTime();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      if (age > maxAge) {
        threatsToRemove.push(id);
      }
    });

    threatsToRemove.forEach(id => {
      this.activeJammingThreats.delete(id);
    });
  }

  private storeCommunicationHistory(droneId: string, health: CommunicationHealth): void {
    if (!this.commHealthHistory.has(droneId)) {
      this.commHealthHistory.set(droneId, []);
    }

    const history = this.commHealthHistory.get(droneId)!;
    history.push(health);

    // Keep only recent history (last 50 readings)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  private updateBaseline(droneId: string, health: CommunicationHealth): void {
    this.baselineMetrics.set(droneId, health);
  }

  private reportThreat(threat: EWThreat): void {
    this.activeJammingThreats.set(threat.id, threat);
    
    // Notify all callbacks
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        console.error('Error in jamming detection callback:', error);
      }
    });

    // Send threat data via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('ew_threat_detected', threat);
    }

    this.emitEvent('threat_detected', threat.severity,
      `Communication jamming detected affecting ${threat.impact.dronesAffected.length} drone(s)`);
  }

  private generateJammingSignature(health: CommunicationHealth, analysis: any): string {
    const signatureData = {
      linkQuality: health.linkQuality,
      packetLoss: health.packetLoss,
      latency: health.latency,
      jammingType: analysis.jammingType,
      indicators: analysis.indicators
    };

    return Buffer.from(JSON.stringify(signatureData)).toString('base64');
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private getDefaultAntiJammingConfig(): AntiJammingConfiguration {
    return {
      adaptivePowerControl: true,
      nullSteering: true,
      frequencyHopping: {
        enabled: true,
        patterns: ['pattern_1', 'pattern_2', 'pattern_3'],
        currentPattern: 'pattern_1',
        autoSwitch: true
      },
      spreadSpectrum: {
        enabled: true,
        chippingRate: 1000000, // 1 Mcps
        processingGain: 20 // 20dB
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
      id: `jamming-event-${Date.now()}`,
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
export const jammingDetection = JammingDetectionSystem.getInstance();

export function useJammingDetection() {
  const system = JammingDetectionSystem.getInstance();
  
  return {
    startMonitoring: () => system.startMonitoring(),
    stopMonitoring: () => system.stopMonitoring(),
    addDetectionCallback: (callback: (threat: EWThreat) => void) => 
      system.addDetectionCallback(callback),
    getActiveJammingCount: () => system.getActiveJammingCount(),
    updateAntiJammingConfig: (config: Partial<AntiJammingConfiguration>) => 
      system.updateAntiJammingConfig(config),
  };
}