/**
 * Integrated Anomaly Detection System
 * Central orchestrator that integrates all anomaly detection components
 */

import { webSocketService } from './websocket';
import { 
  AdvancedAnomalyDetectionEngine,
  EnhancedTelemetryData,
  advancedAnomalyDetector
} from './advanced-anomaly-detection';

import { 
  PredictiveFailureAnalysisEngine,
  predictiveFailureAnalyzer,
  ComponentHealthMetrics,
  telemetryToComponentMetrics
} from './predictive-failure-analysis';

import { 
  RealTimeThreatDetectionEngine,
  realTimeThreatDetector,
  ThreatDetectionResult
} from './real-time-threat-detection';

import { 
  InsiderThreatDetectionEngine,
  insiderThreatDetector,
  createUserActivity
} from './insider-threat-detection';

import { 
  AutomatedAlertEscalationEngine,
  alertEscalationEngine
} from './automated-alert-escalation';

import { logger, LogCategory } from './monitoring/logger';
import { metrics } from './monitoring/metrics';
import { Drone, User, Mission } from './types';

// Integration configuration
export interface IntegrationConfig {
  telemetryProcessing: {
    enabled: boolean;
    batchSize: number;
    processingInterval: number; // milliseconds
    bufferSize: number;
  };
  anomalyDetection: {
    enabled: boolean;
    confidenceThreshold: number;
    realTimeProcessing: boolean;
  };
  predictiveAnalysis: {
    enabled: boolean;
    analysisInterval: number; // minutes
    minDataPoints: number;
  };
  threatDetection: {
    enabled: boolean;
    realTimeMonitoring: boolean;
    threatCorrelation: boolean;
  };
  insiderThreatMonitoring: {
    enabled: boolean;
    userActivityTracking: boolean;
    baselineUpdateInterval: number; // hours
  };
  alerting: {
    enabled: boolean;
    immediateEscalation: boolean;
    correlationEnabled: boolean;
  };
  integration: {
    webSocketEnabled: boolean;
    apiEndpoints: boolean;
    dashboardUpdates: boolean;
    externalSystems: string[];
  };
}

// System health and status monitoring
export interface SystemHealthStatus {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    anomalyDetection: ComponentStatus;
    predictiveAnalysis: ComponentStatus;
    threatDetection: ComponentStatus;
    insiderThreatDetection: ComponentStatus;
    alertingSystem: ComponentStatus;
    dataIngestion: ComponentStatus;
  };
  metrics: {
    totalAnomaliesDetected: number;
    threatsIdentified: number;
    predictionsGenerated: number;
    alertsTriggered: number;
    processingLatency: number; // milliseconds
    throughput: number; // events per second
  };
  alerts: {
    active: number;
    critical: number;
    acknowledged: number;
    escalated: number;
  };
}

export interface ComponentStatus {
  status: 'operational' | 'degraded' | 'failed' | 'disabled';
  lastUpdate: Date;
  errorCount: number;
  performance: {
    avgProcessingTime: number;
    successRate: number;
    throughput: number;
  };
  details?: Record<string, any>;
}

// Data processing pipeline
class TelemetryDataPipeline {
  private processingQueue: EnhancedTelemetryData[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private config: IntegrationConfig['telemetryProcessing'];

  constructor(config: IntegrationConfig['telemetryProcessing']) {
    this.config = config;
  }

  start(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processBatch();
    }, this.config.processingInterval);

    logger.info({
      message: 'Telemetry data pipeline started',
      category: LogCategory.MONITORING,
      metadata: { config: this.config }
    });
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  addTelemetryData(data: EnhancedTelemetryData): void {
    if (this.processingQueue.length >= this.config.bufferSize) {
      // Remove oldest data to make room
      this.processingQueue.shift();
      logger.warning({
        message: 'Telemetry buffer full, dropping oldest data',
        category: LogCategory.MONITORING,
        metadata: { bufferSize: this.config.bufferSize }
      });
    }

    this.processingQueue.push(data);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;
    const batchSize = Math.min(this.config.batchSize, this.processingQueue.length);
    const batch = this.processingQueue.splice(0, batchSize);

    try {
      const startTime = Date.now();

      // Process each telemetry data point
      const results = await Promise.allSettled(
        batch.map(data => this.processTelemetryData(data))
      );

      // Log processing results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const processingTime = Date.now() - startTime;

      metrics.recordTelemetryProcessing(successful, failed, processingTime);

      if (failed > 0) {
        logger.warning({
          message: `Telemetry batch processing completed with errors`,
          category: LogCategory.MONITORING,
          metadata: { successful, failed, processingTime, batchSize }
        });
      }

    } catch (error) {
      logger.error({
        message: 'Error processing telemetry batch',
        category: LogCategory.MONITORING,
        error,
        metadata: { batchSize }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTelemetryData(data: EnhancedTelemetryData): Promise<void> {
    try {
      // Send to anomaly detection
      const anomalies = await advancedAnomalyDetector.analyzeBehavioralAnomalies(data);
      
      // Send to threat detection
      const threats = await realTimeThreatDetector.analyzeTelemetryForThreats(data.droneId, data);
      
      // Convert to component health metrics for predictive analysis
      const componentTypes: Array<'battery' | 'motor' | 'sensor' | 'communication' | 'flight_controller'> = 
        ['battery', 'motor', 'sensor', 'communication', 'flight_controller'];
      
      for (const componentType of componentTypes) {
        const healthMetrics = telemetryToComponentMetrics(data, componentType);
        predictiveFailureAnalyzer.addComponentMetrics(healthMetrics);
      }

      // Process results
      await this.processDetectionResults(data, anomalies, threats);

    } catch (error) {
      logger.error({
        message: 'Error processing individual telemetry data',
        category: LogCategory.MONITORING,
        error,
        metadata: { droneId: data.droneId }
      });
      throw error;
    }
  }

  private async processDetectionResults(
    data: EnhancedTelemetryData,
    anomalies: any[],
    threats: ThreatDetectionResult[]
  ): Promise<void> {
    // Create alerts for anomalies
    for (const anomaly of anomalies) {
      await alertEscalationEngine.createAlertFromAnomaly(anomaly);
    }

    // Create alerts for threats
    for (const threat of threats) {
      await alertEscalationEngine.createAlertFromThreat(threat);
    }

    // Broadcast results via WebSocket
    if (webSocketService) {
      webSocketService.broadcast('anomaly_detection_results', {
        droneId: data.droneId,
        timestamp: data.timestamp,
        anomalies: anomalies.length,
        threats: threats.length,
        severity: this.calculateOverallSeverity(anomalies, threats)
      });
    }
  }

  private calculateOverallSeverity(anomalies: any[], threats: ThreatDetectionResult[]): string {
    const severities = [
      ...anomalies.map(a => a.severity),
      ...threats.map(t => t.severity)
    ];

    if (severities.includes('emergency')) return 'emergency';
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('warning')) return 'warning';
    return 'info';
  }
}

// User activity monitoring integration
class UserActivityMonitor {
  private activityBuffer: any[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private config: IntegrationConfig['insiderThreatMonitoring'];

  constructor(config: IntegrationConfig['insiderThreatMonitoring']) {
    this.config = config;
  }

  start(): void {
    if (!this.config.enabled) return;

    // Process user activities every minute
    this.processingInterval = setInterval(() => {
      this.processUserActivities();
    }, 60000);

    // Update baselines periodically
    setInterval(() => {
      this.updateUserBaselines();
    }, this.config.baselineUpdateInterval * 60 * 60 * 1000);

    logger.info({
      message: 'User activity monitor started',
      category: LogCategory.MONITORING,
      metadata: { config: this.config }
    });
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  trackUserActivity(
    userId: string,
    activityType: string,
    resource: string,
    sourceIP: string,
    success: boolean = true,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.config.userActivityTracking) return;

    const activity = createUserActivity(
      userId,
      activityType as any,
      resource,
      sourceIP,
      success,
      metadata
    );

    insiderThreatDetector.addUserActivity(activity);
    this.activityBuffer.push(activity);
  }

  private async processUserActivities(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    try {
      // Get user threat indicators
      const userIds = [...new Set(this.activityBuffer.map(a => a.userId))];
      
      for (const userId of userIds) {
        const threats = insiderThreatDetector.getUserThreats(userId);
        const highRiskThreats = threats.filter(t => t.riskScore > 0.7);
        
        if (highRiskThreats.length > 0) {
          // Create alerts for high-risk insider threats
          for (const threat of highRiskThreats) {
            await alertEscalationEngine.createAlertFromInsiderThreat(threat);
          }

          // Analyze for compromise indicators
          const compromiseIndicators = insiderThreatDetector.analyzeUserForCompromise(userId);
          
          if (compromiseIndicators.length > 0) {
            logger.critical({
              message: `Compromise indicators detected for user: ${userId}`,
              category: LogCategory.ANOMALY,
              classification: 'SECRET',
              metadata: {
                userId,
                indicatorCount: compromiseIndicators.length,
                indicators: compromiseIndicators
              }
            });
          }
        }
      }

      // Clear processed activities
      this.activityBuffer = [];

    } catch (error) {
      logger.error({
        message: 'Error processing user activities',
        category: LogCategory.MONITORING,
        error
      });
    }
  }

  private async updateUserBaselines(): Promise<void> {
    try {
      const highRiskUsers = insiderThreatDetector.getHighRiskUsers();
      
      for (const user of highRiskUsers) {
        await insiderThreatDetector.trainUserBaseline(user.userId);
      }

      logger.info({
        message: `Updated baselines for ${highRiskUsers.length} users`,
        category: LogCategory.MONITORING,
        metadata: { userCount: highRiskUsers.length }
      });

    } catch (error) {
      logger.error({
        message: 'Error updating user baselines',
        category: LogCategory.MONITORING,
        error
      });
    }
  }
}

// Network traffic monitoring integration
class NetworkTrafficMonitor {
  private trafficBuffer: any[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  start(): void {
    this.processingInterval = setInterval(() => {
      this.processNetworkTraffic();
    }, 30000); // Process every 30 seconds

    logger.info({
      message: 'Network traffic monitor started',
      category: LogCategory.MONITORING
    });
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  addNetworkTraffic(traffic: any): void {
    this.trafficBuffer.push(traffic);
    
    // Keep buffer size manageable
    if (this.trafficBuffer.length > 10000) {
      this.trafficBuffer.splice(0, this.trafficBuffer.length - 10000);
    }
  }

  private async processNetworkTraffic(): Promise<void> {
    if (this.trafficBuffer.length === 0) return;

    try {
      const traffic = [...this.trafficBuffer];
      this.trafficBuffer = [];

      // Analyze for cyber threats
      const threats = await realTimeThreatDetector.analyzeNetworkForThreats(traffic);
      
      if (threats.length > 0) {
        for (const threat of threats) {
          await alertEscalationEngine.createAlertFromThreat(threat);
        }

        logger.warning({
          message: `Network threats detected: ${threats.length}`,
          category: LogCategory.ANOMALY,
          metadata: { threatCount: threats.length }
        });
      }

    } catch (error) {
      logger.error({
        message: 'Error processing network traffic',
        category: LogCategory.MONITORING,
        error
      });
    }
  }
}

// Main Integrated Anomaly System
export class IntegratedAnomalySystem {
  private static instance: IntegratedAnomalySystem;
  
  private config: IntegrationConfig;
  private telemetryPipeline: TelemetryDataPipeline;
  private userActivityMonitor: UserActivityMonitor;
  private networkTrafficMonitor: NetworkTrafficMonitor;
  
  private isRunning: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private systemHealth: SystemHealthStatus;

  private constructor() {
    // Default configuration
    this.config = {
      telemetryProcessing: {
        enabled: true,
        batchSize: 10,
        processingInterval: 5000,
        bufferSize: 1000
      },
      anomalyDetection: {
        enabled: true,
        confidenceThreshold: 0.7,
        realTimeProcessing: true
      },
      predictiveAnalysis: {
        enabled: true,
        analysisInterval: 15,
        minDataPoints: 100
      },
      threatDetection: {
        enabled: true,
        realTimeMonitoring: true,
        threatCorrelation: true
      },
      insiderThreatMonitoring: {
        enabled: true,
        userActivityTracking: true,
        baselineUpdateInterval: 24
      },
      alerting: {
        enabled: true,
        immediateEscalation: true,
        correlationEnabled: true
      },
      integration: {
        webSocketEnabled: true,
        apiEndpoints: true,
        dashboardUpdates: true,
        externalSystems: []
      }
    };

    this.telemetryPipeline = new TelemetryDataPipeline(this.config.telemetryProcessing);
    this.userActivityMonitor = new UserActivityMonitor(this.config.insiderThreatMonitoring);
    this.networkTrafficMonitor = new NetworkTrafficMonitor();

    this.systemHealth = this.initializeSystemHealth();
  }

  public static getInstance(): IntegratedAnomalySystem {
    if (!IntegratedAnomalySystem.instance) {
      IntegratedAnomalySystem.instance = new IntegratedAnomalySystem();
    }
    return IntegratedAnomalySystem.instance;
  }

  // ==================== Public API Methods ====================

  /**
   * Start the integrated anomaly detection system
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isRunning = true;

      // Start all subsystems
      if (this.config.anomalyDetection.enabled) {
        advancedAnomalyDetector.start();
      }

      if (this.config.predictiveAnalysis.enabled) {
        predictiveFailureAnalyzer.start();
      }

      if (this.config.threatDetection.enabled) {
        realTimeThreatDetector.start();
      }

      if (this.config.insiderThreatMonitoring.enabled) {
        insiderThreatDetector.start();
      }

      if (this.config.alerting.enabled) {
        alertEscalationEngine.start();
      }

      // Start integration components
      this.telemetryPipeline.start();
      this.userActivityMonitor.start();
      this.networkTrafficMonitor.start();

      // Start health monitoring
      this.startHealthMonitoring();

      // Set up WebSocket integration
      if (this.config.integration.webSocketEnabled) {
        this.setupWebSocketIntegration();
      }

      logger.info({
        message: 'Integrated Anomaly Detection System started successfully',
        category: LogCategory.MONITORING,
        classification: 'CONFIDENTIAL',
        metadata: { 
          config: this.config,
          subsystemsStarted: this.getStartedSubsystems()
        }
      });

    } catch (error) {
      this.isRunning = false;
      logger.error({
        message: 'Failed to start Integrated Anomaly Detection System',
        category: LogCategory.MONITORING,
        error
      });
      throw error;
    }
  }

  /**
   * Stop the integrated system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.isRunning = false;

      // Stop all subsystems
      advancedAnomalyDetector.stop?.();
      predictiveFailureAnalyzer.stop();
      realTimeThreatDetector.stop();
      insiderThreatDetector.stop();
      alertEscalationEngine.stop();

      // Stop integration components
      this.telemetryPipeline.stop();
      this.userActivityMonitor.stop();
      this.networkTrafficMonitor.stop();

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      logger.info({
        message: 'Integrated Anomaly Detection System stopped',
        category: LogCategory.MONITORING
      });

    } catch (error) {
      logger.error({
        message: 'Error stopping Integrated Anomaly Detection System',
        category: LogCategory.MONITORING,
        error
      });
    }
  }

  /**
   * Process telemetry data from drones
   */
  public processTelemetryData(data: EnhancedTelemetryData): void {
    if (!this.isRunning || !this.config.telemetryProcessing.enabled) return;

    this.telemetryPipeline.addTelemetryData(data);
    
    // Update system health metrics
    this.systemHealth.metrics.throughput++;
  }

  /**
   * Track user activity
   */
  public trackUserActivity(
    userId: string,
    activityType: string,
    resource: string,
    sourceIP: string,
    success: boolean = true,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.isRunning) return;

    this.userActivityMonitor.trackUserActivity(
      userId,
      activityType,
      resource,
      sourceIP,
      success,
      metadata
    );
  }

  /**
   * Add network traffic for analysis
   */
  public addNetworkTraffic(traffic: any): void {
    if (!this.isRunning) return;

    this.networkTrafficMonitor.addNetworkTraffic(traffic);
  }

  /**
   * Get current system health status
   */
  public getSystemHealth(): SystemHealthStatus {
    return { ...this.systemHealth };
  }

  /**
   * Get comprehensive system status
   */
  public getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      config: this.config,
      health: this.systemHealth,
      subsystems: {
        anomalyDetection: advancedAnomalyDetector.getSystemStatus?.() || { status: 'unknown' },
        predictiveAnalysis: predictiveFailureAnalyzer.getSystemStatus(),
        threatDetection: realTimeThreatDetector.getSystemStatus(),
        insiderThreatDetection: insiderThreatDetector.getSystemStatus(),
        alerting: alertEscalationEngine.getSystemStatus()
      }
    };
  }

  /**
   * Update system configuration
   */
  public updateConfiguration(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info({
      message: 'System configuration updated',
      category: LogCategory.MONITORING,
      metadata: { updatedFields: Object.keys(newConfig) }
    });
  }

  // ==================== Private Helper Methods ====================

  private initializeSystemHealth(): SystemHealthStatus {
    return {
      timestamp: new Date(),
      overallStatus: 'healthy',
      components: {
        anomalyDetection: this.createComponentStatus(),
        predictiveAnalysis: this.createComponentStatus(),
        threatDetection: this.createComponentStatus(),
        insiderThreatDetection: this.createComponentStatus(),
        alertingSystem: this.createComponentStatus(),
        dataIngestion: this.createComponentStatus()
      },
      metrics: {
        totalAnomaliesDetected: 0,
        threatsIdentified: 0,
        predictionsGenerated: 0,
        alertsTriggered: 0,
        processingLatency: 0,
        throughput: 0
      },
      alerts: {
        active: 0,
        critical: 0,
        acknowledged: 0,
        escalated: 0
      }
    };
  }

  private createComponentStatus(): ComponentStatus {
    return {
      status: 'operational',
      lastUpdate: new Date(),
      errorCount: 0,
      performance: {
        avgProcessingTime: 0,
        successRate: 100,
        throughput: 0
      }
    };
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.updateSystemHealth();
    }, 30000); // Update every 30 seconds
  }

  private updateSystemHealth(): void {
    try {
      const now = new Date();
      this.systemHealth.timestamp = now;

      // Update component statuses
      this.updateComponentHealth();

      // Update metrics
      this.updateSystemMetrics();

      // Update alert statistics
      this.updateAlertStatistics();

      // Determine overall status
      this.calculateOverallStatus();

      // Log health status if degraded or critical
      if (this.systemHealth.overallStatus !== 'healthy') {
        logger.warning({
          message: `System health status: ${this.systemHealth.overallStatus}`,
          category: LogCategory.MONITORING,
          metadata: { health: this.systemHealth }
        });
      }

      // Broadcast health status via WebSocket
      if (webSocketService && this.config.integration.dashboardUpdates) {
        webSocketService.broadcast('system_health', this.systemHealth);
      }

    } catch (error) {
      logger.error({
        message: 'Error updating system health',
        category: LogCategory.MONITORING,
        error
      });
    }
  }

  private updateComponentHealth(): void {
    // Get status from each subsystem
    const subsystemStatuses = {
      anomalyDetection: advancedAnomalyDetector.getSystemStatus?.() || {},
      predictiveAnalysis: predictiveFailureAnalyzer.getSystemStatus(),
      threatDetection: realTimeThreatDetector.getSystemStatus(),
      insiderThreatDetection: insiderThreatDetector.getSystemStatus(),
      alertingSystem: alertEscalationEngine.getSystemStatus()
    };

    // Update component health based on subsystem status
    for (const [component, status] of Object.entries(subsystemStatuses)) {
      const componentHealth = this.systemHealth.components[component as keyof typeof this.systemHealth.components];
      if (componentHealth) {
        componentHealth.lastUpdate = new Date();
        componentHealth.status = this.determineComponentStatus(status);
        componentHealth.details = status;
      }
    }
  }

  private determineComponentStatus(subsystemStatus: any): ComponentStatus['status'] {
    if (!subsystemStatus.isRunning) return 'disabled';
    if (subsystemStatus.errorRate > 0.1) return 'degraded';
    if (subsystemStatus.processingLatency > 5000) return 'degraded';
    return 'operational';
  }

  private updateSystemMetrics(): void {
    // Aggregate metrics from subsystems
    const activeAlerts = alertEscalationEngine.getActiveAlerts();
    
    this.systemHealth.metrics.alertsTriggered = activeAlerts.length;
    this.systemHealth.metrics.totalAnomaliesDetected = metrics.getAnomalyCount?.() || 0;
    this.systemHealth.metrics.threatsIdentified = metrics.getThreatCount?.() || 0;
    
    // Calculate processing latency (simplified)
    this.systemHealth.metrics.processingLatency = 
      this.systemHealth.components.dataIngestion.performance.avgProcessingTime;
  }

  private updateAlertStatistics(): void {
    const activeAlerts = alertEscalationEngine.getActiveAlerts();
    
    this.systemHealth.alerts.active = activeAlerts.length;
    this.systemHealth.alerts.critical = activeAlerts.filter(a => 
      a.severity === 'critical' || a.severity === 'emergency'
    ).length;
    this.systemHealth.alerts.acknowledged = activeAlerts.filter(a => 
      a.status === 'acknowledged'
    ).length;
    this.systemHealth.alerts.escalated = activeAlerts.filter(a => 
      a.escalationLevel > 1
    ).length;
  }

  private calculateOverallStatus(): void {
    const componentStatuses = Object.values(this.systemHealth.components)
      .map(c => c.status);

    if (componentStatuses.includes('failed')) {
      this.systemHealth.overallStatus = 'critical';
    } else if (componentStatuses.includes('degraded')) {
      this.systemHealth.overallStatus = 'degraded';
    } else if (componentStatuses.some(s => s === 'disabled')) {
      this.systemHealth.overallStatus = 'degraded';
    } else {
      this.systemHealth.overallStatus = 'healthy';
    }

    // Consider alert levels in overall status
    if (this.systemHealth.alerts.critical > 5) {
      this.systemHealth.overallStatus = 'critical';
    } else if (this.systemHealth.alerts.critical > 0) {
      this.systemHealth.overallStatus = 'degraded';
    }
  }

  private setupWebSocketIntegration(): void {
    if (!webSocketService) return;

    // Subscribe to relevant WebSocket events
    webSocketService.subscribe('mavlink_message', (data) => {
      // Convert MAVLink message to enhanced telemetry data
      const telemetry = this.convertMAVLinkToTelemetry(data);
      if (telemetry) {
        this.processTelemetryData(telemetry);
      }
    });

    webSocketService.subscribe('user_activity', (data) => {
      this.trackUserActivity(
        data.userId,
        data.activityType,
        data.resource,
        data.sourceIP,
        data.success,
        data.metadata
      );
    });

    webSocketService.subscribe('network_traffic', (data) => {
      this.addNetworkTraffic(data);
    });

    logger.info({
      message: 'WebSocket integration configured',
      category: LogCategory.MONITORING
    });
  }

  private convertMAVLinkToTelemetry(mavlinkData: any): EnhancedTelemetryData | null {
    // Convert MAVLink message to enhanced telemetry format
    // This is a simplified conversion - real implementation would be more comprehensive
    try {
      return {
        droneId: `drone-${mavlinkData.sysid}`,
        timestamp: new Date(),
        position: {
          latitude: mavlinkData.payload?.lat / 10000000 || 0,
          longitude: mavlinkData.payload?.lon / 10000000 || 0,
          altitude: mavlinkData.payload?.alt / 1000 || 0
        },
        motion: {
          velocity: [
            mavlinkData.payload?.vx / 100 || 0,
            mavlinkData.payload?.vy / 100 || 0,
            mavlinkData.payload?.vz / 100 || 0
          ],
          acceleration: [0, 0, 0],
          angularVelocity: [0, 0, 0]
        },
        systems: {
          batteryVoltage: mavlinkData.payload?.voltage_battery / 1000 || 0,
          batteryTemperature: 25,
          motorTemperatures: [40, 40, 40, 40],
          signalStrength: -50,
          gpsAccuracy: 3,
          compassHeading: mavlinkData.payload?.hdg / 100 || 0
        },
        environment: {
          windSpeed: 5,
          windDirection: 0,
          temperature: 20,
          pressure: 1013,
          humidity: 50
        },
        mission: {
          flightMode: 'AUTO',
          armed: true,
          missionProgress: 0.5,
          currentWaypoint: 1
        },
        communication: {
          packetsReceived: 100,
          packetsSent: 100,
          packetLoss: mavlinkData.payload?.drop_rate_comm || 0,
          latency: 50,
          throughput: 1000
        }
      };
    } catch (error) {
      logger.warning({
        message: 'Failed to convert MAVLink to telemetry',
        category: LogCategory.MONITORING,
        error,
        metadata: { mavlinkData }
      });
      return null;
    }
  }

  private getStartedSubsystems(): string[] {
    const subsystems: string[] = [];
    
    if (this.config.anomalyDetection.enabled) subsystems.push('anomaly_detection');
    if (this.config.predictiveAnalysis.enabled) subsystems.push('predictive_analysis');
    if (this.config.threatDetection.enabled) subsystems.push('threat_detection');
    if (this.config.insiderThreatMonitoring.enabled) subsystems.push('insider_threat_detection');
    if (this.config.alerting.enabled) subsystems.push('alerting');
    
    return subsystems;
  }

  // ==================== API Integration Methods ====================

  /**
   * Get anomalies for a specific drone
   */
  public async getDroneAnomalies(droneId: string, limit: number = 50): Promise<any[]> {
    // This would typically query a database or cache
    // For now, return from active alerts
    const alerts = alertEscalationEngine.getActiveAlerts()
      .filter(alert => 
        alert.metadata.droneIds?.includes(droneId) ||
        alert.metadata.affectedSystems?.includes(droneId)
      )
      .slice(0, limit);

    return alerts;
  }

  /**
   * Get system-wide anomaly statistics
   */
  public getAnomalyStatistics(): any {
    const activeAlerts = alertEscalationEngine.getActiveAlerts();
    
    return {
      total: activeAlerts.length,
      bySeverity: {
        emergency: activeAlerts.filter(a => a.severity === 'emergency').length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length
      },
      byType: {
        anomaly: activeAlerts.filter(a => a.type === 'anomaly').length,
        threat: activeAlerts.filter(a => a.type === 'threat').length,
        insider_threat: activeAlerts.filter(a => a.type === 'insider_threat').length,
        failure_prediction: activeAlerts.filter(a => a.type === 'failure_prediction').length
      },
      byStatus: {
        active: activeAlerts.filter(a => a.status === 'active').length,
        acknowledged: activeAlerts.filter(a => a.status === 'acknowledged').length,
        escalated: activeAlerts.filter(a => a.escalationLevel > 1).length
      }
    };
  }

  /**
   * Force system health check
   */
  public async performHealthCheck(): Promise<SystemHealthStatus> {
    this.updateSystemHealth();
    return this.getSystemHealth();
  }
}

// Export singleton instance
export const integratedAnomalySystem = IntegratedAnomalySystem.getInstance();

// Helper functions for external integration
export function createEnhancedTelemetryFromDrone(drone: Drone): EnhancedTelemetryData {
  return {
    droneId: drone.id,
    timestamp: new Date(),
    position: {
      latitude: drone.location?.[1] || 0,
      longitude: drone.location?.[0] || 0,
      altitude: drone.altitude || 0
    },
    motion: {
      velocity: [drone.speed || 0, 0, 0],
      acceleration: [0, 0, 0],
      angularVelocity: [0, 0, drone.heading || 0]
    },
    systems: {
      batteryVoltage: (drone.battery / 100) * 12.6, // Estimate voltage from percentage
      batteryTemperature: 25,
      motorTemperatures: [40, 40, 40, 40],
      signalStrength: (drone.signal / 100) * -40 - 50, // Convert to dBm
      gpsAccuracy: 3,
      compassHeading: drone.heading || 0
    },
    environment: {
      windSpeed: 5,
      windDirection: 0,
      temperature: 20,
      pressure: 1013,
      humidity: 50
    },
    mission: {
      flightMode: drone.status === 'active' ? 'AUTO' : 'MANUAL',
      armed: drone.status === 'active',
      missionProgress: 0.5,
      currentWaypoint: 1
    },
    communication: {
      packetsReceived: 100,
      packetsSent: 100,
      packetLoss: (100 - drone.signal) / 10,
      latency: 50,
      throughput: 1000
    }
  };
}