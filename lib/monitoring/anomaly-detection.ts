/**
 * Military-Grade Anomaly Detection System
 * Advanced anomaly detection for drone telemetry and system behavior
 */

import { logger, LogCategory, MilitaryLogLevel, SecurityClassification } from './logger';
import { metrics } from './metrics';

// Anomaly types and their severity levels
export enum AnomalyType {
  DRONE_BEHAVIOR = 'drone_behavior',
  TELEMETRY_PATTERN = 'telemetry_pattern',
  COMMUNICATION = 'communication',
  MISSION_DEVIATION = 'mission_deviation',
  SYSTEM_PERFORMANCE = 'system_performance',
  SECURITY_BREACH = 'security_breach',
  NETWORK_INTRUSION = 'network_intrusion',
  DATA_INTEGRITY = 'data_integrity'
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AnomalyDetectionResult {
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number;
  description: string;
  metadata: Record<string, any>;
  recommendedAction: string;
  classification: SecurityClassification;
}

export interface TelemetryData {
  droneId: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  batteryLevel?: number;
  signalStrength?: number;
  groundSpeed?: number;
  flightMode?: string;
  armed?: boolean;
  systemStatus?: string;
  sensorData?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  errorRate: number;
}

class MilitaryAnomalyDetector {
  private static instance: MilitaryAnomalyDetector;
  private telemetryHistory: Map<string, TelemetryData[]> = new Map();
  private systemMetricsHistory: SystemMetrics[] = [];
  private anomalyThresholds: Map<string, any> = new Map();
  private learningModels: Map<string, any> = new Map();

  private constructor() {
    this.initializeThresholds();
    this.startPeriodicAnalysis();
  }

  public static getInstance(): MilitaryAnomalyDetector {
    if (!MilitaryAnomalyDetector.instance) {
      MilitaryAnomalyDetector.instance = new MilitaryAnomalyDetector();
    }
    return MilitaryAnomalyDetector.instance;
  }

  private initializeThresholds(): void {
    // Initialize default thresholds for anomaly detection
    this.anomalyThresholds.set('battery_critical', 10);
    this.anomalyThresholds.set('battery_low', 20);
    this.anomalyThresholds.set('signal_weak', -80);
    this.anomalyThresholds.set('signal_critical', -90);
    this.anomalyThresholds.set('altitude_max', 1000);
    this.anomalyThresholds.set('speed_max', 50);
    this.anomalyThresholds.set('cpu_high', 80);
    this.anomalyThresholds.set('memory_high', 90);
    this.anomalyThresholds.set('error_rate_high', 5);
    this.anomalyThresholds.set('response_time_high', 2000);
  }

  private startPeriodicAnalysis(): void {
    // Run comprehensive analysis every 30 seconds
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 30000);

    // Run lightweight checks every 5 seconds
    setInterval(() => {
      this.performRealTimeChecks();
    }, 5000);
  }

  // Main method to analyze drone telemetry data
  public analyzeDroneTelemetry(data: TelemetryData): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Store telemetry data for historical analysis
    if (!this.telemetryHistory.has(data.droneId)) {
      this.telemetryHistory.set(data.droneId, []);
    }
    
    const history = this.telemetryHistory.get(data.droneId)!;
    history.push(data);
    
    // Keep only last 1000 data points per drone
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Perform various anomaly checks
    anomalies.push(...this.checkBatteryAnomalies(data));
    anomalies.push(...this.checkSignalAnomalies(data));
    anomalies.push(...this.checkFlightBehaviorAnomalies(data, history));
    anomalies.push(...this.checkLocationAnomalies(data, history));
    anomalies.push(...this.checkSystemStatusAnomalies(data));

    // Log and report detected anomalies
    for (const anomaly of anomalies) {
      this.reportAnomaly(anomaly, data);
    }

    return anomalies;
  }

  // Analyze system performance metrics
  public analyzeSystemMetrics(metrics: SystemMetrics): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Store system metrics for historical analysis
    this.systemMetricsHistory.push(metrics);
    if (this.systemMetricsHistory.length > 500) {
      this.systemMetricsHistory.splice(0, this.systemMetricsHistory.length - 500);
    }

    // Perform system anomaly checks
    anomalies.push(...this.checkPerformanceAnomalies(metrics));
    anomalies.push(...this.checkResourceAnomalies(metrics));
    anomalies.push(...this.checkNetworkAnomalies(metrics));

    return anomalies;
  }

  private checkBatteryAnomalies(data: TelemetryData): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    if (data.batteryLevel !== undefined) {
      if (data.batteryLevel <= this.anomalyThresholds.get('battery_critical')) {
        anomalies.push({
          type: AnomalyType.DRONE_BEHAVIOR,
          severity: AnomalySeverity.CRITICAL,
          confidence: 0.95,
          description: `Critical battery level: ${data.batteryLevel}%`,
          metadata: {
            droneId: data.droneId,
            batteryLevel: data.batteryLevel,
            threshold: this.anomalyThresholds.get('battery_critical')
          },
          recommendedAction: 'Immediate return-to-base (RTB) required',
          classification: SecurityClassification.CONFIDENTIAL
        });
      } else if (data.batteryLevel <= this.anomalyThresholds.get('battery_low')) {
        anomalies.push({
          type: AnomalyType.DRONE_BEHAVIOR,
          severity: AnomalySeverity.HIGH,
          confidence: 0.85,
          description: `Low battery level: ${data.batteryLevel}%`,
          metadata: {
            droneId: data.droneId,
            batteryLevel: data.batteryLevel,
            threshold: this.anomalyThresholds.get('battery_low')
          },
          recommendedAction: 'Plan return-to-base within 10 minutes',
          classification: SecurityClassification.UNCLASSIFIED
        });
      }
    }

    return anomalies;
  }

  private checkSignalAnomalies(data: TelemetryData): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    if (data.signalStrength !== undefined) {
      if (data.signalStrength <= this.anomalyThresholds.get('signal_critical')) {
        anomalies.push({
          type: AnomalyType.COMMUNICATION,
          severity: AnomalySeverity.CRITICAL,
          confidence: 0.90,
          description: `Critical signal strength: ${data.signalStrength} dBm`,
          metadata: {
            droneId: data.droneId,
            signalStrength: data.signalStrength,
            threshold: this.anomalyThresholds.get('signal_critical')
          },
          recommendedAction: 'Activate backup communication protocol',
          classification: SecurityClassification.CONFIDENTIAL
        });
      } else if (data.signalStrength <= this.anomalyThresholds.get('signal_weak')) {
        anomalies.push({
          type: AnomalyType.COMMUNICATION,
          severity: AnomalySeverity.MEDIUM,
          confidence: 0.75,
          description: `Weak signal strength: ${data.signalStrength} dBm`,
          metadata: {
            droneId: data.droneId,
            signalStrength: data.signalStrength,
            threshold: this.anomalyThresholds.get('signal_weak')
          },
          recommendedAction: 'Monitor communication quality closely',
          classification: SecurityClassification.UNCLASSIFIED
        });
      }
    }

    return anomalies;
  }

  private checkFlightBehaviorAnomalies(data: TelemetryData, history: TelemetryData[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    if (history.length < 5) return anomalies; // Need enough history

    // Check for erratic altitude changes
    if (data.altitude !== undefined) {
      const recentAltitudes = history.slice(-5).map(d => d.altitude).filter(a => a !== undefined);
      if (recentAltitudes.length >= 3) {
        const altitudeVariance = this.calculateVariance(recentAltitudes as number[]);
        if (altitudeVariance > 100) { // High altitude variance
          anomalies.push({
            type: AnomalyType.DRONE_BEHAVIOR,
            severity: AnomalySeverity.MEDIUM,
            confidence: 0.70,
            description: 'Erratic altitude changes detected',
            metadata: {
              droneId: data.droneId,
              currentAltitude: data.altitude,
              altitudeVariance,
              recentAltitudes
            },
            recommendedAction: 'Investigate flight stability systems',
            classification: SecurityClassification.UNCLASSIFIED
          });
        }
      }
    }

    // Check for sudden speed changes
    if (data.groundSpeed !== undefined) {
      const recentSpeeds = history.slice(-3).map(d => d.groundSpeed).filter(s => s !== undefined);
      if (recentSpeeds.length >= 2) {
        const speedChange = Math.abs(data.groundSpeed - (recentSpeeds[recentSpeeds.length - 1] as number));
        if (speedChange > 20) { // Sudden speed change > 20 m/s
          anomalies.push({
            type: AnomalyType.DRONE_BEHAVIOR,
            severity: AnomalySeverity.HIGH,
            confidence: 0.80,
            description: `Sudden speed change: ${speedChange} m/s`,
            metadata: {
              droneId: data.droneId,
              currentSpeed: data.groundSpeed,
              speedChange,
              recentSpeeds
            },
            recommendedAction: 'Check for flight control system issues',
            classification: SecurityClassification.CONFIDENTIAL
          });
        }
      }
    }

    return anomalies;
  }

  private checkLocationAnomalies(data: TelemetryData, history: TelemetryData[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    if (data.latitude !== undefined && data.longitude !== undefined) {
      // Check if drone has moved outside operational area (simplified check)
      const operationalBounds = {
        latMin: 35.0, latMax: 45.0,
        lonMin: -125.0, lonMax: -115.0
      };

      if (data.latitude < operationalBounds.latMin || data.latitude > operationalBounds.latMax ||
          data.longitude < operationalBounds.lonMin || data.longitude > operationalBounds.lonMax) {
        anomalies.push({
          type: AnomalyType.MISSION_DEVIATION,
          severity: AnomalySeverity.CRITICAL,
          confidence: 0.95,
          description: 'Drone outside operational boundaries',
          metadata: {
            droneId: data.droneId,
            currentLocation: { lat: data.latitude, lon: data.longitude },
            operationalBounds
          },
          recommendedAction: 'Immediate course correction required',
          classification: SecurityClassification.SECRET
        });
      }
    }

    return anomalies;
  }

  private checkSystemStatusAnomalies(data: TelemetryData): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Check for unexpected system status changes
    if (data.systemStatus && data.systemStatus.toLowerCase().includes('error')) {
      anomalies.push({
        type: AnomalyType.SYSTEM_PERFORMANCE,
        severity: AnomalySeverity.HIGH,
        confidence: 0.90,
        description: `System error status: ${data.systemStatus}`,
        metadata: {
          droneId: data.droneId,
          systemStatus: data.systemStatus
        },
        recommendedAction: 'Investigate system error immediately',
        classification: SecurityClassification.CONFIDENTIAL
      });
    }

    // Check for unexpected flight mode changes
    const validFlightModes = ['MANUAL', 'STABILIZE', 'GUIDED', 'AUTO', 'RTL', 'LOITER'];
    if (data.flightMode && !validFlightModes.includes(data.flightMode.toUpperCase())) {
      anomalies.push({
        type: AnomalyType.DRONE_BEHAVIOR,
        severity: AnomalySeverity.MEDIUM,
        confidence: 0.75,
        description: `Unknown flight mode: ${data.flightMode}`,
        metadata: {
          droneId: data.droneId,
          flightMode: data.flightMode,
          validModes: validFlightModes
        },
        recommendedAction: 'Verify flight control software integrity',
        classification: SecurityClassification.UNCLASSIFIED
      });
    }

    return anomalies;
  }

  private checkPerformanceAnomalies(metrics: SystemMetrics): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // High CPU usage
    if (metrics.cpuUsage > this.anomalyThresholds.get('cpu_high')) {
      anomalies.push({
        type: AnomalyType.SYSTEM_PERFORMANCE,
        severity: AnomalySeverity.MEDIUM,
        confidence: 0.80,
        description: `High CPU usage: ${metrics.cpuUsage}%`,
        metadata: {
          cpuUsage: metrics.cpuUsage,
          threshold: this.anomalyThresholds.get('cpu_high')
        },
        recommendedAction: 'Investigate high CPU usage processes',
        classification: SecurityClassification.UNCLASSIFIED
      });
    }

    // High memory usage
    if (metrics.memoryUsage > this.anomalyThresholds.get('memory_high')) {
      anomalies.push({
        type: AnomalyType.SYSTEM_PERFORMANCE,
        severity: AnomalySeverity.HIGH,
        confidence: 0.85,
        description: `High memory usage: ${metrics.memoryUsage}%`,
        metadata: {
          memoryUsage: metrics.memoryUsage,
          threshold: this.anomalyThresholds.get('memory_high')
        },
        recommendedAction: 'Check for memory leaks or restart services',
        classification: SecurityClassification.UNCLASSIFIED
      });
    }

    return anomalies;
  }

  private checkResourceAnomalies(metrics: SystemMetrics): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // High error rate
    if (metrics.errorRate > this.anomalyThresholds.get('error_rate_high')) {
      anomalies.push({
        type: AnomalyType.SYSTEM_PERFORMANCE,
        severity: AnomalySeverity.HIGH,
        confidence: 0.90,
        description: `High error rate: ${metrics.errorRate}%`,
        metadata: {
          errorRate: metrics.errorRate,
          threshold: this.anomalyThresholds.get('error_rate_high')
        },
        recommendedAction: 'Investigate system errors and failures',
        classification: SecurityClassification.CONFIDENTIAL
      });
    }

    return anomalies;
  }

  private checkNetworkAnomalies(metrics: SystemMetrics): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // High network latency
    if (metrics.networkLatency > this.anomalyThresholds.get('response_time_high')) {
      anomalies.push({
        type: AnomalyType.SYSTEM_PERFORMANCE,
        severity: AnomalySeverity.MEDIUM,
        confidence: 0.75,
        description: `High network latency: ${metrics.networkLatency}ms`,
        metadata: {
          networkLatency: metrics.networkLatency,
          threshold: this.anomalyThresholds.get('response_time_high')
        },
        recommendedAction: 'Check network connectivity and bandwidth',
        classification: SecurityClassification.UNCLASSIFIED
      });
    }

    return anomalies;
  }

  private performPeriodicAnalysis(): void {
    try {
      // Analyze patterns across all drones
      for (const [droneId, history] of this.telemetryHistory) {
        if (history.length >= 10) {
          this.analyzeHistoricalPatterns(droneId, history);
        }
      }

      // Analyze system performance trends
      if (this.systemMetricsHistory.length >= 10) {
        this.analyzeSystemTrends();
      }

    } catch (error) {
      logger.error({
        message: 'Error in periodic anomaly analysis',
        category: LogCategory.ANOMALY,
        error,
        metadata: { component: 'anomaly-detector' }
      });
    }
  }

  private performRealTimeChecks(): void {
    // Lightweight real-time checks for immediate threats
    // This would include checks for sudden communication loss, 
    // security breaches, etc.
  }

  private analyzeHistoricalPatterns(droneId: string, history: TelemetryData[]): void {
    // Implement machine learning-based pattern analysis
    // This would use statistical methods to identify unusual patterns
    // in flight behavior, battery usage, communication patterns, etc.
  }

  private analyzeSystemTrends(): void {
    // Analyze system performance trends over time
    // Look for gradual degradation, cyclic patterns, etc.
  }

  private reportAnomaly(anomaly: AnomalyDetectionResult, data: TelemetryData): void {
    // Log the anomaly
    logger.logAnomalyDetection(
      anomaly.type,
      anomaly.severity,
      {
        ...anomaly,
        droneId: data.droneId,
        timestamp: data.timestamp
      }
    );

    // Record metrics
    metrics.recordDroneAnomaly(data.droneId, anomaly.type, anomaly.severity);

    // Send real-time alerts for critical anomalies
    if (anomaly.severity === AnomalySeverity.CRITICAL) {
      this.sendCriticalAlert(anomaly, data);
    }
  }

  private sendCriticalAlert(anomaly: AnomalyDetectionResult, data: TelemetryData): void {
    // Implementation would send immediate alerts via WebSocket, 
    // email, SMS, or other notification channels
    logger.critical({
      message: `Critical anomaly detected: ${anomaly.description}`,
      category: LogCategory.ANOMALY,
      classification: anomaly.classification,
      droneId: data.droneId,
      metadata: {
        anomaly,
        telemetryData: data,
        recommendedAction: anomaly.recommendedAction
      }
    });
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  // Public method to update thresholds based on operational requirements
  public updateThreshold(key: string, value: any): void {
    this.anomalyThresholds.set(key, value);
    logger.info({
      message: `Anomaly detection threshold updated: ${key} = ${value}`,
      category: LogCategory.MONITORING,
      metadata: { threshold: key, value }
    });
  }

  // Get current system health based on anomaly detection
  public getSystemHealth(): { status: string; anomalies: number; criticalAnomalies: number } {
    // Implementation would analyze recent anomalies and provide system health status
    return {
      status: 'healthy',
      anomalies: 0,
      criticalAnomalies: 0
    };
  }
}

// Export singleton instance
export const anomalyDetector = MilitaryAnomalyDetector.getInstance();

// Helper functions
export const analyzeTelemetryData = (data: TelemetryData) => {
  return anomalyDetector.analyzeDroneTelemetry(data);
};

export const analyzeSystemMetrics = (metrics: SystemMetrics) => {
  return anomalyDetector.analyzeSystemMetrics(metrics);
};