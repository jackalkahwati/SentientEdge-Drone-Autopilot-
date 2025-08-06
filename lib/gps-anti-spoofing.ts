// GPS Anti-Spoofing Detection and Mitigation System
// Military-grade GPS spoofing detection for drone operations

import { 
  GPSSignalAnalysis, 
  GNSSConstellation, 
  EWThreat, 
  ThreatSeverity,
  EWEvent 
} from './types';
import { webSocketService } from './websocket';

// GPS spoofing detection thresholds
const SPOOFING_THRESHOLDS = {
  SIGNAL_POWER_ANOMALY: 6.0, // dB difference threshold
  CLOCK_BIAS_JUMP: 1000, // microseconds
  CARRIER_PHASE_INCONSISTENCY: 0.1, // meters
  DOP_INCONSISTENCY: 2.0, // DOP unit threshold
  SIGNAL_CORRELATION_MIN: 0.8, // Minimum correlation coefficient
  SATELLITE_COUNT_DROP: 4, // Minimum satellite count drop to flag
  POSITION_JUMP_THRESHOLD: 50, // meters per second
  VELOCITY_CONSISTENCY_THRESHOLD: 5.0, // m/s
};

// Multi-constellation signal patterns
const CONSTELLATION_FREQUENCIES = {
  gps: { l1: 1575.42, l2: 1227.60, l5: 1176.45 }, // MHz
  glonass: { l1: 1602.0, l2: 1246.0, l3: 1202.025 },
  galileo: { e1: 1575.42, e5a: 1176.45, e5b: 1207.14, e6: 1278.75 },
  beidou: { b1: 1561.098, b2: 1207.14, b3: 1268.52 },
  qzss: { l1: 1575.42, l2: 1227.60, l5: 1176.45 }
};

export class GPSAntiSpoofingSystem {
  private static instance: GPSAntiSpoofingSystem;
  private isActive: boolean = false;
  private detectionHistory: Map<string, GPSSignalAnalysis[]> = new Map();
  private baselineSignals: Map<string, GPSSignalAnalysis> = new Map();
  private spoofingThreats: Map<string, EWThreat> = new Map();
  private detectionCallbacks: Array<(threat: EWThreat) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupWebSocketHandlers();
  }

  public static getInstance(): GPSAntiSpoofingSystem {
    if (!GPSAntiSpoofingSystem.instance) {
      GPSAntiSpoofingSystem.instance = new GPSAntiSpoofingSystem();
    }
    return GPSAntiSpoofingSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for GPS signal data from drones
      webSocketService.subscribe('gps_signal_data', (data) => {
        this.processGPSSignalData(data);
      });

      // Listen for GNSS constellation data
      webSocketService.subscribe('gnss_constellation_data', (data) => {
        this.processGNSSConstellationData(data);
      });
    }
  }

  public startMonitoring(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('GPS Anti-Spoofing monitoring activated');

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.performContinuousAnalysis();
    }, 1000); // Check every second

    // Send activation event
    this.emitEvent('system_alert', 'low', 'GPS Anti-Spoofing system activated');
  }

  public stopMonitoring(): void {
    if (!this.isActive) return;

    this.isActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('GPS Anti-Spoofing monitoring deactivated');
    this.emitEvent('system_alert', 'low', 'GPS Anti-Spoofing system deactivated');
  }

  public addDetectionCallback(callback: (threat: EWThreat) => void): () => void {
    this.detectionCallbacks.push(callback);
    return () => {
      this.detectionCallbacks = this.detectionCallbacks.filter(cb => cb !== callback);
    };
  }

  public getActiveThreatCount(): number {
    return Array.from(this.spoofingThreats.values()).filter(threat => 
      threat.severity !== 'low'
    ).length;
  }

  public getDetectionHistory(droneId: string): GPSSignalAnalysis[] {
    return this.detectionHistory.get(droneId) || [];
  }

  private processGPSSignalData(data: GPSSignalAnalysis): void {
    if (!this.isActive) return;

    const droneId = this.extractDroneId(data);
    if (!droneId) return;

    // Store historical data
    this.storeSignalHistory(droneId, data);

    // Perform spoofing detection analysis
    const spoofingDetected = this.analyzeSpoofingIndicators(droneId, data);
    
    if (spoofingDetected) {
      this.handleSpoofingDetection(droneId, data);
    }

    // Update baseline if signal appears legitimate
    if (data.confidenceScore > 0.9 && !spoofingDetected) {
      this.updateBaseline(droneId, data);
    }
  }

  private processGNSSConstellationData(data: { droneId: string; constellations: GNSSConstellation[] }): void {
    if (!this.isActive) return;

    // Analyze multi-constellation consistency
    const inconsistencies = this.analyzeConstellationConsistency(data.constellations);
    
    if (inconsistencies.length > 0) {
      const threat = this.createSpoofingThreat(
        data.droneId,
        'spoofing',
        'medium',
        `GNSS constellation inconsistencies detected: ${inconsistencies.join(', ')}`
      );
      
      this.reportThreat(threat);
    }
  }

  private analyzeSpoofingIndicators(droneId: string, signal: GPSSignalAnalysis): boolean {
    const indicators = signal.spoofingIndicators;
    let spoofingScore = 0;
    const detectionReasons: string[] = [];

    // 1. Signal Power Anomaly Detection
    if (indicators.signalPowerAnomalies) {
      spoofingScore += 0.3;
      detectionReasons.push('Signal power anomalies detected');
    }

    // 2. Clock Bias Jump Detection
    if (indicators.clockBiasJumps) {
      spoofingScore += 0.25;
      detectionReasons.push('Clock bias jumps detected');
    }

    // 3. Carrier Phase Inconsistency
    if (indicators.carrierPhaseInconsistencies) {
      spoofingScore += 0.2;
      detectionReasons.push('Carrier phase inconsistencies');
    }

    // 4. DOP Inconsistency Analysis
    if (indicators.dopInconsistencies) {
      spoofingScore += 0.15;
      detectionReasons.push('DOP inconsistencies detected');
    }

    // 5. Multiple Signal Source Detection
    if (indicators.multipleSignalSources) {
      spoofingScore += 0.4; // High weight as this is a strong indicator
      detectionReasons.push('Multiple signal sources detected');
    }

    // 6. Historical Comparison Analysis
    const historicalInconsistency = this.analyzeHistoricalInconsistency(droneId, signal);
    if (historicalInconsistency > 0.3) {
      spoofingScore += historicalInconsistency * 0.3;
      detectionReasons.push('Historical signal pattern inconsistency');
    }

    // 7. Satellite Geometry Analysis
    const geometryInconsistency = this.analyzeSatelliteGeometry(signal);
    if (geometryInconsistency > 0.3) {
      spoofingScore += geometryInconsistency * 0.2;
      detectionReasons.push('Satellite geometry inconsistency');
    }

    // 8. Signal Correlation Analysis
    const correlationIssues = this.analyzeSignalCorrelation(signal);
    if (correlationIssues > 0.3) {
      spoofingScore += correlationIssues * 0.25;
      detectionReasons.push('Signal correlation issues');
    }

    // Determine if spoofing is detected based on total score
    const spoofingDetected = spoofingScore > 0.5;

    if (spoofingDetected) {
      console.log(`GPS spoofing detected for ${droneId}:`, {
        score: spoofingScore,
        reasons: detectionReasons,
        confidence: signal.confidenceScore
      });
    }

    return spoofingDetected;
  }

  private analyzeHistoricalInconsistency(droneId: string, currentSignal: GPSSignalAnalysis): number {
    const history = this.detectionHistory.get(droneId) || [];
    if (history.length < 3) return 0; // Need sufficient history

    const recentHistory = history.slice(-10); // Last 10 readings
    let inconsistencyScore = 0;

    // Check for sudden position jumps
    const lastSignal = recentHistory[recentHistory.length - 1];
    if (lastSignal) {
      const positionJump = this.calculateDistance(
        [lastSignal.longitude, lastSignal.latitude],
        [currentSignal.longitude, currentSignal.latitude]
      );

      const timeDiff = (new Date(currentSignal.timestamp).getTime() - 
                       new Date(lastSignal.timestamp).getTime()) / 1000; // seconds

      if (timeDiff > 0) {
        const velocity = positionJump / timeDiff;
        if (velocity > SPOOFING_THRESHOLDS.POSITION_JUMP_THRESHOLD) {
          inconsistencyScore += 0.5;
        }
      }
    }

    // Check for signal strength patterns
    const avgSignalStrength = recentHistory.reduce((sum, s) => sum + s.signalStrength, 0) / recentHistory.length;
    const signalStrengthDiff = Math.abs(currentSignal.signalStrength - avgSignalStrength);
    
    if (signalStrengthDiff > SPOOFING_THRESHOLDS.SIGNAL_POWER_ANOMALY) {
      inconsistencyScore += 0.3;
    }

    return Math.min(inconsistencyScore, 1.0);
  }

  private analyzeSatelliteGeometry(signal: GPSSignalAnalysis): number {
    let geometryScore = 0;

    // Check for impossible satellite configurations
    if (signal.hdop < 0.5 || signal.hdop > 20) {
      geometryScore += 0.4; // HDOP values outside normal range
    }

    if (signal.vdop < 0.5 || signal.vdop > 20) {
      geometryScore += 0.4; // VDOP values outside normal range
    }

    // Check satellite count consistency with DOP values
    if (signal.satelliteCount > 12 && signal.hdop > 5) {
      geometryScore += 0.3; // Many satellites but poor geometry
    }

    if (signal.satelliteCount < 4 && signal.hdop < 2) {
      geometryScore += 0.5; // Too few satellites for good geometry
    }

    return Math.min(geometryScore, 1.0);
  }

  private analyzeSignalCorrelation(signal: GPSSignalAnalysis): number {
    let correlationScore = 0;

    // Analyze constellation signal consistency
    const totalConstellations = signal.constellations.length;
    if (totalConstellations === 0) {
      return 0.8; // High suspicion if no constellation data
    }

    let strongSignals = 0;
    let weakSignals = 0;

    signal.constellations.forEach(constellation => {
      if (constellation.signalStrength > -140) { // Strong signal threshold
        strongSignals++;
      } else if (constellation.signalStrength < -160) { // Weak signal threshold
        weakSignals++;
      }
    });

    // Suspicious if all signals are uniformly strong (potential spoofer)
    if (strongSignals === totalConstellations && totalConstellations > 6) {
      correlationScore += 0.4;
    }

    // Suspicious if signal strengths don't vary naturally
    const signalStrengths = signal.constellations.map(c => c.signalStrength);
    const variance = this.calculateVariance(signalStrengths);
    if (variance < 10) { // Too little variation in signal strength
      correlationScore += 0.3;
    }

    return Math.min(correlationScore, 1.0);
  }

  private analyzeConstellationConsistency(constellations: GNSSConstellation[]): string[] {
    const inconsistencies: string[] = [];

    // Check for impossible satellite counts
    constellations.forEach(constellation => {
      const maxSatellites = {
        gps: 32,
        glonass: 24,
        galileo: 30,
        beidou: 35,
        qzss: 7
      };

      if (constellation.satellites > maxSatellites[constellation.type]) {
        inconsistencies.push(`${constellation.type}: impossible satellite count`);
      }

      // Check for signal strength consistency
      if (constellation.signalStrength > -120 || constellation.signalStrength < -180) {
        inconsistencies.push(`${constellation.type}: abnormal signal strength`);
      }
    });

    return inconsistencies;
  }

  private handleSpoofingDetection(droneId: string, signal: GPSSignalAnalysis): void {
    const threatId = `gps-spoof-${droneId}-${Date.now()}`;
    
    // Determine threat severity based on confidence and impact
    let severity: ThreatSeverity = 'medium';
    if (signal.confidenceScore < 0.3) {
      severity = 'high';
    } else if (signal.confidenceScore < 0.1) {
      severity = 'critical';
    }

    const threat: EWThreat = {
      id: threatId,
      type: 'spoofing',
      severity,
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: {
        location: [signal.longitude, signal.latitude],
        estimated: true
      },
      affectedSystems: ['gps'],
      characteristics: {
        frequency: 1575.42, // GPS L1 frequency
        signature: this.generateSpoofingSignature(signal)
      },
      impact: {
        dronesAffected: [droneId],
        communicationLoss: false,
        navigationDegraded: true,
        missionCompromised: severity === 'critical' || severity === 'high'
      },
      confidence: 1 - signal.confidenceScore,
      countermeasuresDeployed: []
    };

    this.reportThreat(threat);
    this.initiateMitigationMeasures(droneId, threat);
  }

  private initiateMitigationMeasures(droneId: string, threat: EWThreat): void {
    const mitigationActions: string[] = [];

    // 1. Switch to INS/Dead Reckoning
    this.activateInertialNavigation(droneId);
    mitigationActions.push('inertial_navigation');

    // 2. Cross-reference with other navigation sources
    this.activateAlternativeNavigation(droneId);
    mitigationActions.push('alternative_navigation');

    // 3. Alert mission control
    this.alertMissionControl(droneId, threat);
    mitigationActions.push('mission_control_alert');

    // 4. For critical threats, implement emergency protocols
    if (threat.severity === 'critical') {
      this.activateEmergencyProtocols(droneId);
      mitigationActions.push('emergency_protocols');
    }

    // Update threat with deployed countermeasures
    threat.countermeasuresDeployed = mitigationActions;
    this.spoofingThreats.set(threat.id, threat);

    console.log(`GPS spoofing mitigation activated for ${droneId}:`, mitigationActions);
  }

  private activateInertialNavigation(droneId: string): void {
    if (webSocketService) {
      webSocketService.sendSecure('activate_ins_navigation', {
        droneId,
        reason: 'gps_spoofing_detected',
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateAlternativeNavigation(droneId: string): void {
    if (webSocketService) {
      webSocketService.sendSecure('activate_alternative_nav', {
        droneId,
        sources: ['ins', 'visual_odometry', 'terrain_matching'],
        timestamp: new Date().toISOString()
      });
    }
  }

  private alertMissionControl(droneId: string, threat: EWThreat): void {
    if (webSocketService) {
      webSocketService.sendSecure('gps_spoofing_alert', {
        droneId,
        threat,
        recommendedAction: this.getRecommendedAction(threat.severity),
        timestamp: new Date().toISOString()
      });
    }
  }

  private activateEmergencyProtocols(droneId: string): void {
    if (webSocketService) {
      webSocketService.sendSecure('emergency_navigation_protocol', {
        droneId,
        protocol: 'gps_denial',
        actions: ['maintain_altitude', 'reduce_speed', 'return_to_base'],
        timestamp: new Date().toISOString()
      });
    }
  }

  private getRecommendedAction(severity: ThreatSeverity): string {
    switch (severity) {
      case 'critical':
        return 'immediate_manual_control_takeover';
      case 'high':
        return 'switch_to_alternative_navigation';
      case 'medium':
        return 'monitor_closely_with_backup_nav';
      default:
        return 'continue_monitoring';
    }
  }

  private reportThreat(threat: EWThreat): void {
    this.spoofingThreats.set(threat.id, threat);
    
    // Notify all callbacks
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        console.error('Error in GPS spoofing detection callback:', error);
      }
    });

    // Send threat data via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('ew_threat_detected', threat);
    }

    this.emitEvent('threat_detected', threat.severity, 
      `GPS spoofing detected affecting ${threat.impact.dronesAffected.length} drone(s)`);
  }

  private performContinuousAnalysis(): void {
    // Analyze trends across all monitored drones
    this.detectionHistory.forEach((history, droneId) => {
      if (history.length > 5) {
        const recentSignals = history.slice(-5);
        const trendAnalysis = this.analyzeTrends(recentSignals);
        
        if (trendAnalysis.suspiciousPattern) {
          console.log(`Suspicious GPS pattern detected for ${droneId}:`, trendAnalysis.reasons);
        }
      }
    });

    // Clean up old threats
    this.cleanupOldThreats();
  }

  private analyzeTrends(signals: GPSSignalAnalysis[]): { suspiciousPattern: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let suspiciousPattern = false;

    // Check for gradual signal degradation (potential meaconing attack)
    const confidenceScores = signals.map(s => s.confidenceScore);
    const confidenceTrend = this.calculateTrend(confidenceScores);
    
    if (confidenceTrend < -0.1) { // Decreasing confidence
      suspiciousPattern = true;
      reasons.push('Gradual signal confidence degradation');
    }

    // Check for coordinated constellation changes
    const satelliteCounts = signals.map(s => s.satelliteCount);
    const maxCount = Math.max(...satelliteCounts);
    const minCount = Math.min(...satelliteCounts);
    
    if (maxCount - minCount > SPOOFING_THRESHOLDS.SATELLITE_COUNT_DROP) {
      suspiciousPattern = true;
      reasons.push('Unusual satellite count variations');
    }

    return { suspiciousPattern, reasons };
  }

  private cleanupOldThreats(): void {
    const now = new Date();
    const threatsToRemove: string[] = [];

    this.spoofingThreats.forEach((threat, id) => {
      const age = now.getTime() - new Date(threat.detectedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age > maxAge) {
        threatsToRemove.push(id);
      }
    });

    threatsToRemove.forEach(id => {
      this.spoofingThreats.delete(id);
    });
  }

  private storeSignalHistory(droneId: string, signal: GPSSignalAnalysis): void {
    if (!this.detectionHistory.has(droneId)) {
      this.detectionHistory.set(droneId, []);
    }

    const history = this.detectionHistory.get(droneId)!;
    history.push(signal);

    // Keep only recent history (last 100 readings)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private updateBaseline(droneId: string, signal: GPSSignalAnalysis): void {
    this.baselineSignals.set(droneId, signal);
  }

  private generateSpoofingSignature(signal: GPSSignalAnalysis): string {
    // Create a unique signature for this spoofing attempt
    const signatureData = {
      signalStrength: Math.round(signal.signalStrength),
      satelliteCount: signal.satelliteCount,
      hdop: Math.round(signal.hdop * 10) / 10,
      indicators: signal.spoofingIndicators
    };

    return Buffer.from(JSON.stringify(signatureData)).toString('base64');
  }

  private extractDroneId(data: any): string | null {
    return data.droneId || data.vehicleId || data.systemId || null;
  }

  private calculateDistance(pos1: [number, number], pos2: [number, number]): number {
    const R = 6371000; // Earth radius in meters
    const lat1Rad = pos1[1] * Math.PI / 180;
    const lat2Rad = pos2[1] * Math.PI / 180;
    const deltaLatRad = (pos2[1] - pos1[1]) * Math.PI / 180;
    const deltaLonRad = (pos2[0] - pos1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = n * (n - 1) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6; // Sum of squares of indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `gps-event-${Date.now()}`,
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
export const gpsAntiSpoofing = GPSAntiSpoofingSystem.getInstance();

export function useGPSAntiSpoofing() {
  const system = GPSAntiSpoofingSystem.getInstance();
  
  return {
    startMonitoring: () => system.startMonitoring(),
    stopMonitoring: () => system.stopMonitoring(),
    addDetectionCallback: (callback: (threat: EWThreat) => void) => 
      system.addDetectionCallback(callback),
    getActiveThreatCount: () => system.getActiveThreatCount(),
    getDetectionHistory: (droneId: string) => system.getDetectionHistory(droneId),
  };
}