/**
 * Real-Time Threat Detection Algorithms
 * Advanced threat detection system for operational security and cyber defense
 */

import { 
  AnomalyResult,
  AlertSeverity,
  ThreatConfidence,
  SecurityClassification,
  NetworkTrafficPattern,
  EnhancedTelemetryData
} from './advanced-anomaly-detection';

import { 
  EWThreat,
  ThreatType,
  ThreatSeverity,
  SignalType,
  RFSignalData,
  SpectrumAnalysis,
  CyberThreat
} from './types';

import { logger, LogCategory } from './monitoring/logger';
import { metrics } from './monitoring/metrics';

// Real-time threat detection interfaces
export interface ThreatSignature {
  id: string;
  name: string;
  type: ThreatType;
  patterns: {
    frequency?: { min: number; max: number };
    power?: { min: number; max: number };
    duration?: { min: number; max: number };
    sequence?: number[];
    protocol?: string[];
  };
  confidence: number;
  severity: ThreatSeverity;
  description: string;
  countermeasures: string[];
}

export interface ThreatContext {
  timestamp: Date;
  location?: [number, number];
  mission?: string;
  threatLevel: number;
  activeCountermeasures: string[];
  environmentalFactors: {
    weather: string;
    terrain: string;
    civilianTraffic: number;
    militaryActivity: number;
  };
}

export interface ThreatDetectionResult {
  id: string;
  timestamp: Date;
  threatType: ThreatType;
  severity: ThreatSeverity;
  confidence: ThreatConfidence;
  source?: {
    location: [number, number];
    estimated: boolean;
    accuracy?: number;
  };
  characteristics: {
    frequency?: number;
    bandwidth?: number;
    power?: number;
    duration?: number;
    pattern?: string;
  };
  affectedSystems: {
    droneIds: string[];
    systemTypes: SignalType[];
    impactLevel: 'minimal' | 'moderate' | 'severe' | 'critical';
  };
  correlatedEvents: string[];
  recommendedActions: string[];
  classification: SecurityClassification;
}

// GPS Spoofing Detection Algorithm
class GPSSpoofingDetector {
  private baselinePositions: Map<string, { lat: number; lon: number; alt: number; timestamp: Date }[]> = new Map();
  private signalStrengthBaseline: Map<string, number[]> = new Map();
  private clockBiasHistory: Map<string, number[]> = new Map();

  detect(droneId: string, telemetry: EnhancedTelemetryData): ThreatDetectionResult | null {
    const indicators = this.analyzeSpoofingIndicators(droneId, telemetry);
    const anomalyScore = this.calculateAnomalyScore(indicators);
    
    if (anomalyScore > 0.7) {
      return {
        id: `gps_spoof_${droneId}_${Date.now()}`,
        timestamp: new Date(),
        threatType: 'spoofing',
        severity: anomalyScore > 0.9 ? 'critical' : 'high',
        confidence: this.mapScoreToConfidence(anomalyScore),
        source: this.estimateSpoofingSource(telemetry),
        characteristics: {
          frequency: 1575.42, // L1 GPS frequency
          pattern: 'signal_substitution'
        },
        affectedSystems: {
          droneIds: [droneId],
          systemTypes: ['gps'],
          impactLevel: anomalyScore > 0.9 ? 'critical' : 'severe'
        },
        correlatedEvents: [],
        recommendedActions: [
          'Switch to INS navigation',
          'Activate GPS anti-spoofing measures',
          'Cross-reference with other positioning systems',
          'Initiate emergency return protocol if navigation compromised'
        ],
        classification: 'CONFIDENTIAL'
      };
    }
    
    return null;
  }

  private analyzeSpoofingIndicators(droneId: string, telemetry: EnhancedTelemetryData): any {
    // Position jump detection
    const positionJump = this.detectPositionJump(droneId, telemetry);
    
    // Signal strength anomalies
    const signalAnomaly = this.detectSignalStrengthAnomaly(droneId, telemetry.systems.signalStrength);
    
    // Timing inconsistencies
    const timingAnomaly = this.detectTimingInconsistencies(droneId, telemetry);
    
    // Velocity consistency check
    const velocityAnomaly = this.detectVelocityInconsistencies(telemetry);
    
    return {
      positionJump,
      signalAnomaly,
      timingAnomaly,
      velocityAnomaly
    };
  }

  private detectPositionJump(droneId: string, telemetry: EnhancedTelemetryData): number {
    if (!this.baselinePositions.has(droneId)) {
      this.baselinePositions.set(droneId, []);
    }
    
    const history = this.baselinePositions.get(droneId)!;
    const currentPos = {
      lat: telemetry.position.latitude,
      lon: telemetry.position.longitude,
      alt: telemetry.position.altitude,
      timestamp: telemetry.timestamp
    };
    
    if (history.length > 0) {
      const lastPos = history[history.length - 1];
      const distance = this.haversineDistance(
        lastPos.lat, lastPos.lon,
        currentPos.lat, currentPos.lon
      );
      
      const timeDiff = (currentPos.timestamp.getTime() - lastPos.timestamp.getTime()) / 1000;
      const maxPossibleDistance = this.calculateMaxPossibleDistance(timeDiff, telemetry);
      
      if (distance > maxPossibleDistance * 2) {
        return Math.min(1.0, distance / (maxPossibleDistance * 5));
      }
    }
    
    history.push(currentPos);
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    return 0;
  }

  private detectSignalStrengthAnomaly(droneId: string, signalStrength: number): number {
    if (!this.signalStrengthBaseline.has(droneId)) {
      this.signalStrengthBaseline.set(droneId, []);
    }
    
    const baseline = this.signalStrengthBaseline.get(droneId)!;
    baseline.push(signalStrength);
    
    if (baseline.length > 50) {
      baseline.splice(0, baseline.length - 50);
    }
    
    if (baseline.length >= 10) {
      const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
      const stdDev = Math.sqrt(
        baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length
      );
      
      const zScore = Math.abs((signalStrength - mean) / stdDev);
      return Math.min(1.0, zScore / 3); // Normalize to 0-1
    }
    
    return 0;
  }

  private detectTimingInconsistencies(droneId: string, telemetry: EnhancedTelemetryData): number {
    // Simplified timing analysis - in practice would analyze GPS timing data
    return 0;
  }

  private detectVelocityInconsistencies(telemetry: EnhancedTelemetryData): number {
    const velocity = Math.sqrt(
      Math.pow(telemetry.motion.velocity[0], 2) +
      Math.pow(telemetry.motion.velocity[1], 2) +
      Math.pow(telemetry.motion.velocity[2], 2)
    );
    
    // Check for impossible velocity changes
    const maxAcceleration = 20; // m/s^2 for typical drone
    const acceleration = Math.sqrt(
      Math.pow(telemetry.motion.acceleration[0], 2) +
      Math.pow(telemetry.motion.acceleration[1], 2) +
      Math.pow(telemetry.motion.acceleration[2], 2)
    );
    
    if (acceleration > maxAcceleration) {
      return Math.min(1.0, acceleration / (maxAcceleration * 2));
    }
    
    return 0;
  }

  private calculateAnomalyScore(indicators: any): number {
    const weights = {
      positionJump: 0.4,
      signalAnomaly: 0.25,
      timingAnomaly: 0.25,
      velocityAnomaly: 0.1
    };
    
    return (
      indicators.positionJump * weights.positionJump +
      indicators.signalAnomaly * weights.signalAnomaly +
      indicators.timingAnomaly * weights.timingAnomaly +
      indicators.velocityAnomaly * weights.velocityAnomaly
    );
  }

  private estimateSpoofingSource(telemetry: EnhancedTelemetryData): any {
    // Simplified source estimation - would use triangulation in practice
    return {
      location: [telemetry.position.longitude + 0.001, telemetry.position.latitude + 0.001] as [number, number],
      estimated: true,
      accuracy: 1000 // meters
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateMaxPossibleDistance(timeDiff: number, telemetry: EnhancedTelemetryData): number {
    const maxSpeed = 30; // m/s typical drone max speed
    return maxSpeed * timeDiff;
  }

  private mapScoreToConfidence(score: number): ThreatConfidence {
    if (score >= 0.9) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
}

// Communication Jamming Detection
class JammingDetector {
  private communicationBaseline: Map<string, {
    packetLoss: number[];
    latency: number[];
    signalStrength: number[];
    throughput: number[];
  }> = new Map();

  detect(droneId: string, telemetry: EnhancedTelemetryData): ThreatDetectionResult | null {
    const jammingScore = this.analyzeJammingIndicators(droneId, telemetry);
    
    if (jammingScore > 0.6) {
      return {
        id: `jamming_${droneId}_${Date.now()}`,
        timestamp: new Date(),
        threatType: 'jamming',
        severity: jammingScore > 0.8 ? 'critical' : 'high',
        confidence: this.mapScoreToConfidence(jammingScore),
        characteristics: {
          frequency: 2400, // Typical 2.4GHz communication
          pattern: 'signal_suppression',
          power: this.estimateJammingPower(telemetry)
        },
        affectedSystems: {
          droneIds: [droneId],
          systemTypes: ['communication'],
          impactLevel: jammingScore > 0.8 ? 'critical' : 'severe'
        },
        correlatedEvents: [],
        recommendedActions: [
          'Switch to backup communication frequency',
          'Activate frequency hopping protocol',
          'Increase transmission power if safe',
          'Consider autonomous operation mode'
        ],
        classification: 'CONFIDENTIAL'
      };
    }
    
    return null;
  }

  private analyzeJammingIndicators(droneId: string, telemetry: EnhancedTelemetryData): number {
    if (!this.communicationBaseline.has(droneId)) {
      this.communicationBaseline.set(droneId, {
        packetLoss: [],
        latency: [],
        signalStrength: [],
        throughput: []
      });
    }
    
    const baseline = this.communicationBaseline.get(droneId)!;
    const comm = telemetry.communication;
    
    // Update baselines
    baseline.packetLoss.push(comm.packetLoss);
    baseline.latency.push(comm.latency);
    baseline.signalStrength.push(telemetry.systems.signalStrength);
    baseline.throughput.push(comm.throughput);
    
    // Keep only recent data
    const maxSamples = 100;
    Object.values(baseline).forEach(array => {
      if (array.length > maxSamples) {
        array.splice(0, array.length - maxSamples);
      }
    });
    
    if (baseline.packetLoss.length < 10) return 0;
    
    // Calculate jamming indicators
    const packetLossAnomaly = this.calculateAnomalyScore(baseline.packetLoss, comm.packetLoss);
    const latencyAnomaly = this.calculateAnomalyScore(baseline.latency, comm.latency);
    const signalAnomaly = this.calculateAnomalyScore(baseline.signalStrength, telemetry.systems.signalStrength);
    const throughputAnomaly = this.calculateAnomalyScore(baseline.throughput, comm.throughput, true);
    
    // Weighted combination
    return (
      packetLossAnomaly * 0.35 +
      latencyAnomaly * 0.25 +
      signalAnomaly * 0.25 +
      throughputAnomaly * 0.15
    );
  }

  private calculateAnomalyScore(baseline: number[], currentValue: number, invert: boolean = false): number {
    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const stdDev = Math.sqrt(
      baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length
    );
    
    if (stdDev === 0) return 0;
    
    let zScore = Math.abs((currentValue - mean) / stdDev);
    
    // For throughput, we expect it to decrease during jamming
    if (invert && currentValue < mean) {
      zScore = (mean - currentValue) / stdDev;
    }
    
    return Math.min(1.0, zScore / 3);
  }

  private estimateJammingPower(telemetry: EnhancedTelemetryData): number {
    // Estimate based on signal degradation
    const normalSignalStrength = -50; // dBm
    const currentSignalStrength = telemetry.systems.signalStrength;
    const degradation = normalSignalStrength - currentSignalStrength;
    return Math.max(0, degradation); // Positive value indicates jamming power
  }

  private mapScoreToConfidence(score: number): ThreatConfidence {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}

// Cyber Attack Detection
class CyberAttackDetector {
  private networkPatterns: Map<string, NetworkTrafficPattern[]> = new Map();
  private systemBehaviorBaseline: Map<string, any> = new Map();

  detect(networkTraffic: NetworkTrafficPattern[]): ThreatDetectionResult[] {
    const threats: ThreatDetectionResult[] = [];
    
    for (const traffic of networkTraffic) {
      // Detect various cyber attack patterns
      const ddosScore = this.detectDDoS(traffic);
      const injectionScore = this.detectInjectionAttack(traffic);
      const exfiltrationScore = this.detectDataExfiltration(traffic);
      const reconScore = this.detectReconnaissance(traffic);
      
      // Process each threat type
      if (ddosScore > 0.6) {
        threats.push(this.createCyberThreat('dos', ddosScore, traffic));
      }
      
      if (injectionScore > 0.7) {
        threats.push(this.createCyberThreat('injection', injectionScore, traffic));
      }
      
      if (exfiltrationScore > 0.5) {
        threats.push(this.createCyberThreat('data_exfiltration', exfiltrationScore, traffic));
      }
      
      if (reconScore > 0.4) {
        threats.push(this.createCyberThreat('reconnaissance', reconScore, traffic));
      }
    }
    
    return threats;
  }

  private detectDDoS(traffic: NetworkTrafficPattern): number {
    // Analyze packet frequency and size patterns
    const suspiciousFrequency = traffic.frequency > 1000; // packets/sec
    const uniformPacketSize = traffic.packetSize < 100; // Small packets
    const lowPayloadComplexity = traffic.payloadPattern.length < 10;
    
    let score = 0;
    if (suspiciousFrequency) score += 0.4;
    if (uniformPacketSize) score += 0.3;
    if (lowPayloadComplexity) score += 0.3;
    
    return Math.min(1.0, score);
  }

  private detectInjectionAttack(traffic: NetworkTrafficPattern): number {
    // Look for suspicious payload patterns
    const suspiciousPatterns = [
      'SELECT', 'UNION', 'DROP', 'INSERT', // SQL injection
      '<script>', 'javascript:', 'eval(', // XSS
      '../', '..\\', '/etc/passwd', // Path traversal
      'cmd.exe', '/bin/sh', 'powershell' // Command injection
    ];
    
    let score = 0;
    for (const pattern of suspiciousPatterns) {
      if (traffic.payloadPattern.toLowerCase().includes(pattern.toLowerCase())) {
        score += 0.2;
      }
    }
    
    // Check for encoding attempts
    if (traffic.payloadPattern.includes('%') || traffic.payloadPattern.includes('\\x')) {
      score += 0.3;
    }
    
    return Math.min(1.0, score);
  }

  private detectDataExfiltration(traffic: NetworkTrafficPattern): number {
    // Look for unusual data volume and patterns
    const largePackets = traffic.packetSize > 1500;
    const highFrequency = traffic.frequency > 100;
    const encodedContent = this.detectEncoding(traffic.payloadPattern);
    
    let score = 0;
    if (largePackets && highFrequency) score += 0.4;
    if (encodedContent) score += 0.3;
    if (traffic.encryptionStrength < 0.5) score += 0.3; // Weak encryption
    
    return Math.min(1.0, score);
  }

  private detectReconnaissance(traffic: NetworkTrafficPattern): number {
    // Port scanning and network discovery patterns
    const reconnPatterns = [
      'nmap', 'scan', 'probe',
      'ping', 'traceroute',
      'banner', 'version'
    ];
    
    let score = 0;
    for (const pattern of reconnPatterns) {
      if (traffic.payloadPattern.toLowerCase().includes(pattern)) {
        score += 0.2;
      }
    }
    
    // Multiple small requests to different ports
    if (traffic.packetSize < 100 && traffic.frequency > 10) {
      score += 0.4;
    }
    
    return Math.min(1.0, score);
  }

  private detectEncoding(payload: string): boolean {
    // Check for base64, hex, or other encoding
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    const hexPattern = /^[0-9A-Fa-f]+$/;
    
    return base64Pattern.test(payload) || hexPattern.test(payload);
  }

  private createCyberThreat(threatType: string, score: number, traffic: NetworkTrafficPattern): ThreatDetectionResult {
    return {
      id: `cyber_${threatType}_${Date.now()}`,
      timestamp: new Date(),
      threatType: threatType as ThreatType,
      severity: score > 0.8 ? 'critical' : score > 0.6 ? 'high' : 'medium',
      confidence: this.mapScoreToConfidence(score),
      source: {
        location: [0, 0], // Would need geolocation
        estimated: true
      },
      characteristics: {
        frequency: 2400, // Default communication frequency
        pattern: threatType,
        power: score * 100
      },
      affectedSystems: {
        droneIds: [traffic.destinationId],
        systemTypes: ['communication', 'datalink'],
        impactLevel: score > 0.8 ? 'critical' : 'severe'
      },
      correlatedEvents: [],
      recommendedActions: this.getCyberRecommendations(threatType),
      classification: score > 0.7 ? 'SECRET' : 'CONFIDENTIAL'
    };
  }

  private getCyberRecommendations(threatType: string): string[] {
    const recommendations: Record<string, string[]> = {
      dos: [
        'Activate DDoS protection',
        'Rate limit incoming connections',
        'Block suspicious IP ranges',
        'Isolate affected systems'
      ],
      injection: [
        'Sanitize all input data',
        'Update security patches immediately',
        'Enable WAF protection',
        'Conduct security audit'
      ],
      data_exfiltration: [
        'Monitor outbound data flows',
        'Enhance encryption protocols',
        'Audit data access logs',
        'Implement data loss prevention'
      ],
      reconnaissance: [
        'Enable intrusion detection',
        'Limit service exposure',
        'Monitor access patterns',
        'Update firewall rules'
      ]
    };
    
    return recommendations[threatType] || ['Investigate and monitor'];
  }

  private mapScoreToConfidence(score: number): ThreatConfidence {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}

// Physical Threat Detection (Environmental and Kinetic)
class PhysicalThreatDetector {
  private environmentalBaseline: Map<string, any> = new Map();
  private kinematicBaseline: Map<string, any> = new Map();

  detect(droneId: string, telemetry: EnhancedTelemetryData): ThreatDetectionResult[] {
    const threats: ThreatDetectionResult[] = [];
    
    // Detect hostile interference
    const interferenceScore = this.detectHostileInterference(droneId, telemetry);
    if (interferenceScore > 0.6) {
      threats.push(this.createPhysicalThreat('interference', interferenceScore, droneId, telemetry));
    }
    
    // Detect kinetic threats (missiles, projectiles)
    const kineticScore = this.detectKineticThreat(droneId, telemetry);
    if (kineticScore > 0.7) {
      threats.push(this.createPhysicalThreat('kinetic', kineticScore, droneId, telemetry));
    }
    
    // Detect environmental hazards
    const environmentalScore = this.detectEnvironmentalHazard(droneId, telemetry);
    if (environmentalScore > 0.5) {
      threats.push(this.createPhysicalThreat('environmental', environmentalScore, droneId, telemetry));
    }
    
    return threats;
  }

  private detectHostileInterference(droneId: string, telemetry: EnhancedTelemetryData): number {
    // Analyze for electromagnetic interference patterns
    const signalDegradation = this.calculateSignalDegradation(telemetry);
    const controlAnomalies = this.detectControlAnomalies(telemetry);
    const systemMalfunctions = this.detectSystemMalfunctions(telemetry);
    
    return (signalDegradation * 0.4 + controlAnomalies * 0.35 + systemMalfunctions * 0.25);
  }

  private detectKineticThreat(droneId: string, telemetry: EnhancedTelemetryData): number {
    // Look for sudden acceleration patterns that might indicate incoming threats
    const acceleration = Math.sqrt(
      Math.pow(telemetry.motion.acceleration[0], 2) +
      Math.pow(telemetry.motion.acceleration[1], 2) +
      Math.pow(telemetry.motion.acceleration[2], 2)
    );
    
    // Unusual pressure changes might indicate nearby explosions or projectiles
    const pressureAnomaly = this.detectPressureAnomaly(telemetry);
    
    // Acoustic signatures (if available) could indicate incoming threats
    const acousticSignature = 0; // Would need acoustic sensors
    
    let score = 0;
    if (acceleration > 50) score += 0.6; // Very high acceleration
    if (pressureAnomaly > 0.5) score += 0.4;
    
    return Math.min(1.0, score);
  }

  private detectEnvironmentalHazard(droneId: string, telemetry: EnhancedTelemetryData): number {
    const env = telemetry.environment;
    let score = 0;
    
    // Severe weather conditions
    if (env.windSpeed > 15) score += 0.3; // High wind
    if (env.temperature < -20 || env.temperature > 50) score += 0.3; // Extreme temperature
    if (env.pressure < 900 || env.pressure > 1100) score += 0.2; // Extreme pressure
    if (env.humidity > 95) score += 0.2; // High humidity
    
    return Math.min(1.0, score);
  }

  private calculateSignalDegradation(telemetry: EnhancedTelemetryData): number {
    const normalSignalStrength = -50; // dBm
    const currentSignalStrength = telemetry.systems.signalStrength;
    const degradation = (normalSignalStrength - currentSignalStrength) / 40; // Normalize
    return Math.max(0, Math.min(1, degradation));
  }

  private detectControlAnomalies(telemetry: EnhancedTelemetryData): number {
    // Check for unexpected flight mode changes or control responses
    const flightMode = telemetry.mission.flightMode;
    const unexpectedModes = ['EMERGENCY', 'FAILSAFE', 'UNKNOWN'];
    
    if (unexpectedModes.includes(flightMode)) {
      return 0.8;
    }
    
    return 0;
  }

  private detectSystemMalfunctions(telemetry: EnhancedTelemetryData): number {
    let score = 0;
    
    // GPS accuracy degradation
    if (telemetry.systems.gpsAccuracy > 10) score += 0.3;
    
    // Compass heading inconsistencies
    const headingDrift = Math.abs(telemetry.systems.compassHeading - telemetry.motion.angularVelocity[2]);
    if (headingDrift > 30) score += 0.3;
    
    // System temperature anomalies
    if (telemetry.systems.motorTemperatures.some(temp => temp > 80)) score += 0.4;
    
    return Math.min(1.0, score);
  }

  private detectPressureAnomaly(telemetry: EnhancedTelemetryData): number {
    // Rapid pressure changes might indicate nearby explosions
    // This would require historical pressure data for comparison
    return 0; // Simplified
  }

  private createPhysicalThreat(threatType: string, score: number, droneId: string, telemetry: EnhancedTelemetryData): ThreatDetectionResult {
    return {
      id: `physical_${threatType}_${droneId}_${Date.now()}`,
      timestamp: new Date(),
      threatType: threatType as ThreatType,
      severity: score > 0.8 ? 'critical' : score > 0.6 ? 'high' : 'medium',
      confidence: this.mapScoreToConfidence(score),
      source: {
        location: [telemetry.position.longitude, telemetry.position.latitude],
        estimated: true,
        accuracy: 100
      },
      characteristics: {
        pattern: threatType
      },
      affectedSystems: {
        droneIds: [droneId],
        systemTypes: this.getAffectedSystemTypes(threatType),
        impactLevel: score > 0.8 ? 'critical' : 'severe'
      },
      correlatedEvents: [],
      recommendedActions: this.getPhysicalThreatRecommendations(threatType),
      classification: score > 0.7 ? 'SECRET' : 'CONFIDENTIAL'
    };
  }

  private getAffectedSystemTypes(threatType: string): SignalType[] {
    const systemTypes: Record<string, SignalType[]> = {
      interference: ['communication', 'gps', 'datalink'],
      kinetic: ['gps', 'communication', 'radar'],
      environmental: ['gps', 'communication']
    };
    
    return systemTypes[threatType] || ['communication'];
  }

  private getPhysicalThreatRecommendations(threatType: string): string[] {
    const recommendations: Record<string, string[]> = {
      interference: [
        'Switch to backup communication channels',
        'Activate electronic countermeasures',
        'Consider autonomous operation mode',
        'Relocate to area with better signal conditions'
      ],
      kinetic: [
        'Execute evasive maneuvers immediately',
        'Activate defensive countermeasures',
        'Notify command of hostile action',
        'Consider emergency return to base'
      ],
      environmental: [
        'Monitor weather conditions closely',
        'Adjust flight parameters for conditions',
        'Consider mission postponement if severe',
        'Ensure adequate power reserves'
      ]
    };
    
    return recommendations[threatType] || ['Monitor situation and take precautions'];
  }

  private mapScoreToConfidence(score: number): ThreatConfidence {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}

// Main Real-Time Threat Detection Engine
export class RealTimeThreatDetectionEngine {
  private static instance: RealTimeThreatDetectionEngine;
  
  private gpsSpoofingDetector = new GPSSpoofingDetector();
  private jammingDetector = new JammingDetector();
  private cyberAttackDetector = new CyberAttackDetector();
  private physicalThreatDetector = new PhysicalThreatDetector();
  
  private threatSignatures: Map<string, ThreatSignature> = new Map();
  private activeThreats: Map<string, ThreatDetectionResult> = new Map();
  private threatHistory: ThreatDetectionResult[] = [];
  
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeThreatSignatures();
  }

  public static getInstance(): RealTimeThreatDetectionEngine {
    if (!RealTimeThreatDetectionEngine.instance) {
      RealTimeThreatDetectionEngine.instance = new RealTimeThreatDetectionEngine();
    }
    return RealTimeThreatDetectionEngine.instance;
  }

  // ==================== Public API Methods ====================

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Process threats every second for real-time detection
    this.processingInterval = setInterval(() => {
      this.processActiveThreats();
    }, 1000);

    logger.info({
      message: 'Real-Time Threat Detection Engine started',
      category: LogCategory.ANOMALY,
      metadata: { signaturesLoaded: this.threatSignatures.size }
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info({
      message: 'Real-Time Threat Detection Engine stopped',
      category: LogCategory.ANOMALY
    });
  }

  /**
   * Analyze telemetry data for multiple threat types
   */
  public async analyzeTelemetryForThreats(droneId: string, telemetry: EnhancedTelemetryData): Promise<ThreatDetectionResult[]> {
    const threats: ThreatDetectionResult[] = [];
    
    try {
      // GPS spoofing detection
      const gpsSpoof = this.gpsSpoofingDetector.detect(droneId, telemetry);
      if (gpsSpoof) threats.push(gpsSpoof);
      
      // Communication jamming detection
      const jamming = this.jammingDetector.detect(droneId, telemetry);
      if (jamming) threats.push(jamming);
      
      // Physical threat detection
      const physicalThreats = this.physicalThreatDetector.detect(droneId, telemetry);
      threats.push(...physicalThreats);
      
      // Process and store detected threats
      for (const threat of threats) {
        await this.processThreatDetection(threat);
      }
      
    } catch (error) {
      logger.error({
        message: 'Error analyzing telemetry for threats',
        category: LogCategory.ANOMALY,
        error,
        metadata: { droneId }
      });
    }
    
    return threats;
  }

  /**
   * Analyze network traffic for cyber threats
   */
  public async analyzeNetworkForThreats(networkTraffic: NetworkTrafficPattern[]): Promise<ThreatDetectionResult[]> {
    const threats: ThreatDetectionResult[] = [];
    
    try {
      const cyberThreats = this.cyberAttackDetector.detect(networkTraffic);
      threats.push(...cyberThreats);
      
      for (const threat of threats) {
        await this.processThreatDetection(threat);
      }
      
    } catch (error) {
      logger.error({
        message: 'Error analyzing network for threats',
        category: LogCategory.ANOMALY,
        error
      });
    }
    
    return threats;
  }

  /**
   * Get current active threats
   */
  public getActiveThreats(): ThreatDetectionResult[] {
    return Array.from(this.activeThreats.values());
  }

  /**
   * Get threat history
   */
  public getThreatHistory(limit: number = 100): ThreatDetectionResult[] {
    return this.threatHistory.slice(-limit);
  }

  /**
   * Get threats affecting specific drone
   */
  public getThreatsForDrone(droneId: string): ThreatDetectionResult[] {
    return Array.from(this.activeThreats.values())
      .filter(threat => threat.affectedSystems.droneIds.includes(droneId));
  }

  /**
   * Acknowledge threat (mark as handled)
   */
  public acknowledgeThreat(threatId: string, userId: string): void {
    const threat = this.activeThreats.get(threatId);
    if (threat) {
      // Move to history and remove from active
      this.threatHistory.push(threat);
      this.activeThreats.delete(threatId);
      
      logger.info({
        message: `Threat acknowledged: ${threatId}`,
        category: LogCategory.ANOMALY,
        metadata: { threatId, userId, threatType: threat.threatType }
      });
    }
  }

  // ==================== Private Helper Methods ====================

  private initializeThreatSignatures(): void {
    // GPS spoofing signatures
    this.threatSignatures.set('gps_spoof_civilian', {
      id: 'gps_spoof_civilian',
      name: 'Civilian GPS Spoofing',
      type: 'spoofing',
      patterns: {
        frequency: { min: 1570, max: 1580 },
        power: { min: -130, max: -120 }
      },
      confidence: 0.7,
      severity: 'medium',
      description: 'Low-power GPS spoofing typical of civilian equipment',
      countermeasures: ['gps_anti_spoof', 'ins_backup']
    });

    this.threatSignatures.set('gps_spoof_military', {
      id: 'gps_spoof_military',
      name: 'Military GPS Spoofing',
      type: 'spoofing',
      patterns: {
        frequency: { min: 1570, max: 1580 },
        power: { min: -120, max: -100 }
      },
      confidence: 0.9,
      severity: 'critical',
      description: 'High-power GPS spoofing with military-grade equipment',
      countermeasures: ['emergency_nav', 'counterspoof_protocol']
    });

    // Jamming signatures
    this.threatSignatures.set('comm_jamming_basic', {
      id: 'comm_jamming_basic',
      name: 'Basic Communication Jamming',
      type: 'jamming',
      patterns: {
        frequency: { min: 2400, max: 2500 },
        power: { min: 10, max: 100 }
      },
      confidence: 0.8,
      severity: 'high',
      description: 'Basic jamming of 2.4GHz communication band',
      countermeasures: ['freq_hop', 'power_increase']
    });
  }

  private async processThreatDetection(threat: ThreatDetectionResult): Promise<void> {
    // Store active threat
    this.activeThreats.set(threat.id, threat);
    
    // Record metrics
    metrics.recordThreatDetection(threat.threatType, threat.severity, threat.confidence);
    
    // Log threat
    logger.warning({
      message: `Threat detected: ${threat.threatType}`,
      category: LogCategory.ANOMALY,
      classification: threat.classification,
      metadata: {
        threatId: threat.id,
        severity: threat.severity,
        confidence: threat.confidence,
        affectedDrones: threat.affectedSystems.droneIds
      }
    });
    
    // Trigger immediate response for critical threats
    if (threat.severity === 'critical') {
      await this.triggerEmergencyResponse(threat);
    }
  }

  private async triggerEmergencyResponse(threat: ThreatDetectionResult): Promise<void> {
    try {
      // Log critical threat
      logger.critical({
        message: `CRITICAL THREAT DETECTED: ${threat.threatType}`,
        category: LogCategory.ANOMALY,
        classification: threat.classification,
        metadata: {
          threatId: threat.id,
          affectedSystems: threat.affectedSystems,
          recommendedActions: threat.recommendedActions
        }
      });
      
      // Here you would implement automated responses:
      // - Notify command center
      // - Activate countermeasures
      // - Execute emergency protocols
      // - Alert affected drone operators
      
    } catch (error) {
      logger.error({
        message: 'Error triggering emergency response',
        category: LogCategory.ANOMALY,
        error,
        metadata: { threatId: threat.id }
      });
    }
  }

  private processActiveThreats(): void {
    const now = new Date();
    const threatTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Clean up old threats
    for (const [id, threat] of this.activeThreats) {
      if (now.getTime() - threat.timestamp.getTime() > threatTimeout) {
        this.threatHistory.push(threat);
        this.activeThreats.delete(id);
      }
    }
    
    // Keep threat history manageable
    if (this.threatHistory.length > 1000) {
      this.threatHistory.splice(0, this.threatHistory.length - 1000);
    }
  }

  // ==================== Public Status and Configuration ====================

  public getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      activeThreats: this.activeThreats.size,
      threatSignatures: this.threatSignatures.size,
      threatHistory: this.threatHistory.length,
      detectorStatus: {
        gpsSpoof: 'operational',
        jamming: 'operational',
        cyberAttack: 'operational',
        physicalThreat: 'operational'
      }
    };
  }

  public addThreatSignature(signature: ThreatSignature): void {
    this.threatSignatures.set(signature.id, signature);
    logger.info({
      message: `Threat signature added: ${signature.name}`,
      category: LogCategory.ANOMALY,
      metadata: { signatureId: signature.id }
    });
  }

  public removeThreatSignature(signatureId: string): void {
    this.threatSignatures.delete(signatureId);
    logger.info({
      message: `Threat signature removed: ${signatureId}`,
      category: LogCategory.ANOMALY,
      metadata: { signatureId }
    });
  }

  public getThreatSignatures(): ThreatSignature[] {
    return Array.from(this.threatSignatures.values());
  }
}

// Export singleton instance
export const realTimeThreatDetector = RealTimeThreatDetectionEngine.getInstance();