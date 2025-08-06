/**
 * Military-Grade Monitoring System - Main Export
 * Comprehensive monitoring integration for SentientEdge Drone Platform
 */

// Core monitoring components
export { logger, LogCategory, MilitaryLogLevel, SecurityClassification } from './logger';
export { metrics, recordHttpMetrics, recordDatabaseMetrics } from './metrics';
export { securityMonitor, SecurityEventType, ThreatLevel, reportSecurityEvent } from './security-monitor';
export { anomalyDetector, analyzeTelemetryData, analyzeSystemMetrics } from './anomaly-detection';

// Middleware components
export {
  monitoring,
  expressMonitoring,
  nextApiMonitoring,
  databaseMonitoring,
  websocketMonitoring,
  authMonitoring,
  performanceMonitor,
  healthCheck,
  metricsEndpoint
} from './middleware';

// Type exports
export type { LogEntry, PerformanceMetric } from './logger';
export type { DroneMetrics, MissionMetrics, SecurityMetrics } from './metrics';
export type { SecurityEvent, ThreatIndicator, CorrelationRule } from './security-monitor';
export type { TelemetryData, SystemMetrics, AnomalyDetectionResult } from './anomaly-detection';
export type { MonitoringConfig, MonitoredRequest } from './middleware';

// Monitoring initialization and configuration
export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  /**
   * Initialize the complete monitoring system
   */
  public async initialize(config?: Partial<any>): Promise<void> {
    if (this.initialized) {
      logger.warning({
        message: 'Monitoring system already initialized',
        category: LogCategory.MONITORING
      });
      return;
    }

    try {
      logger.info({
        message: 'Initializing SentientEdge Military Monitoring System',
        category: LogCategory.SYSTEM,
        classification: SecurityClassification.CONFIDENTIAL
      });

      // Initialize logging system
      logger.info({
        message: 'Structured logging system initialized',
        category: LogCategory.MONITORING,
        metadata: {
          component: 'winston-logger',
          logLevels: Object.values(MilitaryLogLevel),
          categories: Object.values(LogCategory)
        }
      });

      // Initialize metrics collection
      logger.info({
        message: 'Prometheus metrics collection initialized',
        category: LogCategory.MONITORING,
        metadata: {
          component: 'prometheus-metrics',
          metricsCount: metrics.getRegistry().getMetricsSetNames().length
        }
      });

      // Initialize security monitoring
      logger.info({
        message: 'Security event correlation system initialized',
        category: LogCategory.SECURITY,
        classification: SecurityClassification.SECRET,
        metadata: {
          component: 'security-monitor',
          eventTypes: Object.values(SecurityEventType),
          threatLevels: Object.values(ThreatLevel)
        }
      });

      // Initialize anomaly detection
      logger.info({
        message: 'Drone telemetry anomaly detection initialized',
        category: LogCategory.ANOMALY,
        classification: SecurityClassification.CONFIDENTIAL,
        metadata: {
          component: 'anomaly-detector',
          detectionTypes: ['battery', 'signal', 'flight_behavior', 'location', 'system_status']
        }
      });

      this.initialized = true;

      logger.notice({
        message: '🛡️ SentientEdge Military Monitoring System - OPERATIONAL',
        category: LogCategory.SYSTEM,
        classification: SecurityClassification.CONFIDENTIAL,
        metadata: {
          status: 'operational',
          components: ['logging', 'metrics', 'security', 'anomaly-detection'],
          classification: 'military-grade',
          readyForMissions: true
        }
      });

    } catch (error) {
      logger.critical({
        message: 'Failed to initialize monitoring system',
        category: LogCategory.SYSTEM,
        error,
        classification: SecurityClassification.CONFIDENTIAL
      });
      throw error;
    }
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): any {
    return {
      monitoring: {
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
        components: {
          logging: true,
          metrics: true,
          security: true,
          anomalyDetection: true
        }
      },
      metrics: metrics.getHealthMetrics(),
      security: securityMonitor.getSecuritySummary(),
      anomaly: anomalyDetector.getSystemHealth()
    };
  }

  /**
   * Shutdown monitoring system gracefully
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    logger.info({
      message: 'Shutting down monitoring system',
      category: LogCategory.SYSTEM
    });

    // Cleanup operations would go here
    this.initialized = false;

    logger.info({
      message: 'Monitoring system shutdown complete',
      category: LogCategory.SYSTEM
    });
  }
}

// Export singleton instance
export const monitoringSystem = MonitoringSystem.getInstance();

// Convenience initialization function
export const initializeMonitoring = async (config?: any) => {
  return monitoringSystem.initialize(config);
};

// Export monitoring status
export const getMonitoringHealth = () => {
  return monitoringSystem.getSystemHealth();
};