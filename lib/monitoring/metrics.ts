/**
 * Military-Grade Application Performance Monitoring (APM)
 * Prometheus metrics collection for comprehensive system monitoring
 */

import { Registry, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import { logger, LogCategory, MilitaryLogLevel } from './logger';

// Custom metric types for military operations
export interface DroneMetrics {
  droneId: string;
  missionId?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  batteryLevel?: number;
  signalStrength?: number;
  flightMode?: string;
  armed?: boolean;
  systemStatus?: string;
}

export interface MissionMetrics {
  missionId: string;
  status: string;
  threatLevel: number;
  dronesAssigned: number;
  duration?: number;
  success?: boolean;
}

export interface SecurityMetrics {
  eventType: string;
  severity: string;
  source: string;
  blocked?: boolean;
  userId?: string;
}

export interface PerformanceMetrics {
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  errorCode?: string;
}

class MilitaryMetricsCollector {
  private registry: Registry;
  private static instance: MilitaryMetricsCollector;

  // System-wide metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private websocketConnectionsTotal: Gauge<string>;
  private websocketMessagesTotal: Counter<string>;
  private databaseConnectionsActive: Gauge<string>;
  private databaseQueryDuration: Histogram<string>;
  private databaseQueryErrors: Counter<string>;

  // Drone-specific metrics
  private dronesActiveTotal: Gauge<string>;
  private droneTelemetryReceived: Counter<string>;
  private droneBatteryLevel: Gauge<string>;
  private droneSignalStrength: Gauge<string>;
  private droneFlightTime: Histogram<string>;
  private droneAnomalies: Counter<string>;

  // Mission metrics
  private missionsActiveTotal: Gauge<string>;
  private missionDuration: Histogram<string>;
  private missionSuccessRate: Gauge<string>;
  private missionThreatLevel: Histogram<string>;

  // Security metrics
  private securityEventsTotal: Counter<string>;
  private authenticationAttempts: Counter<string>;
  private authenticationFailures: Counter<string>;
  private apiKeyUsage: Counter<string>;
  private threatsDetected: Counter<string>;
  private threatsBlocked: Counter<string>;

  // Communication protocol metrics
  private mavlinkMessagesTotal: Counter<string>;
  private mavlinkErrorsTotal: Counter<string>;
  private cyphalMessagesTotal: Counter<string>;
  private cyphalErrorsTotal: Counter<string>;

  // Performance metrics
  private cpuUsage: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private diskUsage: Gauge<string>;
  private networkBytesTotal: Counter<string>;

  // Compliance and audit metrics
  private auditEventsTotal: Counter<string>;
  private complianceViolations: Counter<string>;

  private constructor() {
    this.registry = new Registry();
    this.initializeMetrics();
    this.startDefaultCollection();
  }

  public static getInstance(): MilitaryMetricsCollector {
    if (!MilitaryMetricsCollector.instance) {
      MilitaryMetricsCollector.instance = new MilitaryMetricsCollector();
    }
    return MilitaryMetricsCollector.instance;
  }

  private initializeMetrics(): void {
    // System-wide metrics
    this.httpRequestsTotal = new Counter({
      name: 'sentient_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new Histogram({
      name: 'sentient_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    });

    this.websocketConnectionsTotal = new Gauge({
      name: 'sentient_websocket_connections_total',
      help: 'Total number of active WebSocket connections',
      labelNames: ['user_role'],
      registers: [this.registry]
    });

    this.websocketMessagesTotal = new Counter({
      name: 'sentient_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'direction', 'user_role'],
      registers: [this.registry]
    });

    this.databaseConnectionsActive = new Gauge({
      name: 'sentient_database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database'],
      registers: [this.registry]
    });

    this.databaseQueryDuration = new Histogram({
      name: 'sentient_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });

    this.databaseQueryErrors = new Counter({
      name: 'sentient_database_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.registry]
    });

    // Drone-specific metrics
    this.dronesActiveTotal = new Gauge({
      name: 'sentient_drones_active_total',
      help: 'Total number of active drones',
      labelNames: ['status', 'type'],
      registers: [this.registry]
    });

    this.droneTelemetryReceived = new Counter({
      name: 'sentient_drone_telemetry_received_total',
      help: 'Total number of telemetry messages received from drones',
      labelNames: ['drone_id', 'message_type'],
      registers: [this.registry]
    });

    this.droneBatteryLevel = new Gauge({
      name: 'sentient_drone_battery_level_percent',
      help: 'Current battery level of drones in percent',
      labelNames: ['drone_id'],
      registers: [this.registry]
    });

    this.droneSignalStrength = new Gauge({
      name: 'sentient_drone_signal_strength_dbm',
      help: 'Signal strength of drone communication in dBm',
      labelNames: ['drone_id'],
      registers: [this.registry]
    });

    this.droneFlightTime = new Histogram({
      name: 'sentient_drone_flight_time_seconds',
      help: 'Flight time duration for drone missions',
      labelNames: ['drone_id', 'mission_id'],
      buckets: [60, 300, 600, 1800, 3600, 7200], // 1m to 2h
      registers: [this.registry]
    });

    this.droneAnomalies = new Counter({
      name: 'sentient_drone_anomalies_total',
      help: 'Total number of drone anomalies detected',
      labelNames: ['drone_id', 'anomaly_type', 'severity'],
      registers: [this.registry]
    });

    // Mission metrics
    this.missionsActiveTotal = new Gauge({
      name: 'sentient_missions_active_total',
      help: 'Total number of active missions',
      labelNames: ['status', 'priority'],
      registers: [this.registry]
    });

    this.missionDuration = new Histogram({
      name: 'sentient_mission_duration_seconds',
      help: 'Duration of missions in seconds',
      labelNames: ['mission_type', 'priority'],
      buckets: [300, 900, 1800, 3600, 7200, 14400], // 5m to 4h
      registers: [this.registry]
    });

    this.missionSuccessRate = new Gauge({
      name: 'sentient_mission_success_rate',
      help: 'Mission success rate percentage',
      labelNames: ['mission_type', 'threat_level'],
      registers: [this.registry]
    });

    this.missionThreatLevel = new Histogram({
      name: 'sentient_mission_threat_level',
      help: 'Distribution of mission threat levels',
      labelNames: ['mission_type'],
      buckets: [1, 2, 3, 4, 5],
      registers: [this.registry]
    });

    // Security metrics
    this.securityEventsTotal = new Counter({
      name: 'sentient_security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'source'],
      registers: [this.registry]
    });

    this.authenticationAttempts = new Counter({
      name: 'sentient_authentication_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'result', 'user_role'],
      registers: [this.registry]
    });

    this.authenticationFailures = new Counter({
      name: 'sentient_authentication_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['method', 'reason'],
      registers: [this.registry]
    });

    this.apiKeyUsage = new Counter({
      name: 'sentient_api_key_usage_total',
      help: 'Total API key usage',
      labelNames: ['key_type', 'operation'],
      registers: [this.registry]
    });

    this.threatsDetected = new Counter({
      name: 'sentient_threats_detected_total',
      help: 'Total number of threats detected',
      labelNames: ['threat_type', 'severity', 'source'],
      registers: [this.registry]
    });

    this.threatsBlocked = new Counter({
      name: 'sentient_threats_blocked_total',
      help: 'Total number of threats blocked',
      labelNames: ['threat_type', 'method'],
      registers: [this.registry]
    });

    // Communication protocol metrics
    this.mavlinkMessagesTotal = new Counter({
      name: 'sentient_mavlink_messages_total',
      help: 'Total MAVLink messages processed',
      labelNames: ['drone_id', 'message_type', 'direction'],
      registers: [this.registry]
    });

    this.mavlinkErrorsTotal = new Counter({
      name: 'sentient_mavlink_errors_total',
      help: 'Total MAVLink protocol errors',
      labelNames: ['drone_id', 'error_type'],
      registers: [this.registry]
    });

    this.cyphalMessagesTotal = new Counter({
      name: 'sentient_cyphal_messages_total',
      help: 'Total Cyphal messages processed',
      labelNames: ['node_id', 'message_type', 'direction'],
      registers: [this.registry]
    });

    this.cyphalErrorsTotal = new Counter({
      name: 'sentient_cyphal_errors_total',
      help: 'Total Cyphal protocol errors',
      labelNames: ['node_id', 'error_type'],
      registers: [this.registry]
    });

    // Compliance metrics
    this.auditEventsTotal = new Counter({
      name: 'sentient_audit_events_total',
      help: 'Total number of audit events',
      labelNames: ['action', 'resource', 'user_role'],
      registers: [this.registry]
    });

    this.complianceViolations = new Counter({
      name: 'sentient_compliance_violations_total',
      help: 'Total number of compliance violations',
      labelNames: ['regulation', 'violation_type', 'severity'],
      registers: [this.registry]
    });
  }

  private startDefaultCollection(): void {
    // Collect default system metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'sentient_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      eventLoopMonitoringPrecision: 5,
    });

    // Custom system metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 15000); // Every 15 seconds
  }

  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      if (!this.memoryUsage) {
        this.memoryUsage = new Gauge({
          name: 'sentient_memory_usage_bytes',
          help: 'Memory usage in bytes',
          labelNames: ['type'],
          registers: [this.registry]
        });
      }
      
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      // CPU usage (simplified)
      if (!this.cpuUsage) {
        this.cpuUsage = new Gauge({
          name: 'sentient_cpu_usage_percent',
          help: 'CPU usage percentage',
          registers: [this.registry]
        });
      }

      const cpuUsagePercent = process.cpuUsage();
      this.cpuUsage.set((cpuUsagePercent.user + cpuUsagePercent.system) / 1000000);

    } catch (error) {
      logger.error({
        message: 'Failed to collect system metrics',
        category: LogCategory.MONITORING,
        error,
        metadata: { component: 'metrics-collector' }
      });
    }
  }

  // Public methods for recording metrics

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number, userRole?: string): void {
    this.httpRequestsTotal.inc({ 
      method, 
      route, 
      status_code: statusCode.toString(),
      user_role: userRole || 'anonymous'
    });
    
    this.httpRequestDuration.observe({ 
      method, 
      route, 
      status_code: statusCode.toString()
    }, duration / 1000);
  }

  public recordWebSocketConnection(userRole: string, increment: boolean = true): void {
    if (increment) {
      this.websocketConnectionsTotal.inc({ user_role: userRole });
    } else {
      this.websocketConnectionsTotal.dec({ user_role: userRole });
    }
  }

  public recordWebSocketMessage(type: string, direction: 'inbound' | 'outbound', userRole: string): void {
    this.websocketMessagesTotal.inc({ type, direction, user_role: userRole });
  }

  public recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean, errorType?: string): void {
    this.databaseQueryDuration.observe({ operation, table }, duration / 1000);
    
    if (!success) {
      this.databaseQueryErrors.inc({ operation, table, error_type: errorType || 'unknown' });
    }
  }

  public recordDroneMetrics(metrics: DroneMetrics): void {
    if (metrics.batteryLevel !== undefined) {
      this.droneBatteryLevel.set({ drone_id: metrics.droneId }, metrics.batteryLevel);
    }

    if (metrics.signalStrength !== undefined) {
      this.droneSignalStrength.set({ drone_id: metrics.droneId }, metrics.signalStrength);
    }

    this.droneTelemetryReceived.inc({ 
      drone_id: metrics.droneId, 
      message_type: 'telemetry' 
    });
  }

  public recordDroneAnomaly(droneId: string, anomalyType: string, severity: string): void {
    this.droneAnomalies.inc({ drone_id: droneId, anomaly_type: anomalyType, severity });
  }

  public recordMissionMetrics(metrics: MissionMetrics): void {
    if (metrics.duration !== undefined && metrics.success !== undefined) {
      this.missionDuration.observe({ 
        mission_type: 'standard', 
        priority: 'normal' 
      }, metrics.duration);
    }

    this.missionThreatLevel.observe({ mission_type: 'standard' }, metrics.threatLevel);
  }

  public recordSecurityEvent(metrics: SecurityMetrics): void {
    this.securityEventsTotal.inc({
      event_type: metrics.eventType,
      severity: metrics.severity,
      source: metrics.source
    });

    if (metrics.eventType === 'threat_detected') {
      this.threatsDetected.inc({
        threat_type: metrics.eventType,
        severity: metrics.severity,
        source: metrics.source
      });

      if (metrics.blocked) {
        this.threatsBlocked.inc({
          threat_type: metrics.eventType,
          method: 'automatic'
        });
      }
    }
  }

  public recordAuthentication(method: string, success: boolean, userRole?: string, failureReason?: string): void {
    this.authenticationAttempts.inc({
      method,
      result: success ? 'success' : 'failure',
      user_role: userRole || 'unknown'
    });

    if (!success) {
      this.authenticationFailures.inc({
        method,
        reason: failureReason || 'unknown'
      });
    }
  }

  public recordAPIKeyUsage(keyType: string, operation: string): void {
    this.apiKeyUsage.inc({ key_type: keyType, operation });
  }

  public recordMAVLinkMessage(droneId: string, messageType: string, direction: 'inbound' | 'outbound', error?: string): void {
    this.mavlinkMessagesTotal.inc({ drone_id: droneId, message_type: messageType, direction });

    if (error) {
      this.mavlinkErrorsTotal.inc({ drone_id: droneId, error_type: error });
    }
  }

  public recordCyphalMessage(nodeId: string, messageType: string, direction: 'inbound' | 'outbound', error?: string): void {
    this.cyphalMessagesTotal.inc({ node_id: nodeId, message_type: messageType, direction });

    if (error) {
      this.cyphalErrorsTotal.inc({ node_id: nodeId, error_type: error });
    }
  }

  public recordAuditEvent(action: string, resource: string, userRole: string): void {
    this.auditEventsTotal.inc({ action, resource, user_role: userRole });
  }

  public recordComplianceViolation(regulation: string, violationType: string, severity: string): void {
    this.complianceViolations.inc({ regulation, violation_type: violationType, severity });
  }

  public getRegistry(): Registry {
    return this.registry;
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Health check method
  public getHealthMetrics(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      registry_metrics_count: this.registry.getMetricsSetNames().length,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const metrics = MilitaryMetricsCollector.getInstance();

// Helper functions for common metric operations
export const recordHttpMetrics = (req: any, res: any, duration: number) => {
  metrics.recordHttpRequest(
    req.method,
    req.route?.path || req.path,
    res.statusCode,
    duration,
    req.user?.role
  );
};

export const recordDatabaseMetrics = (operation: string, table: string, duration: number, success: boolean, error?: any) => {
  metrics.recordDatabaseQuery(operation, table, duration, success, error?.code);
};

// Export types
export { DroneMetrics, MissionMetrics, SecurityMetrics, PerformanceMetrics };