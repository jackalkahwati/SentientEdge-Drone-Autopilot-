/**
 * Military-Grade Structured Logging System
 * Provides comprehensive logging with security, audit, and compliance features
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define security classification levels
export enum SecurityClassification {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET'
}

// Define log severity levels for military operations
export enum MilitaryLogLevel {
  EMERGENCY = 'emergency',    // System is unusable - immediate action required
  ALERT = 'alert',           // Action must be taken immediately
  CRITICAL = 'critical',     // Critical conditions - mission-critical failures
  ERROR = 'error',           // Error conditions - significant issues
  WARNING = 'warning',       // Warning conditions - potential issues
  NOTICE = 'notice',         // Normal but significant conditions
  INFO = 'info',            // Informational messages
  DEBUG = 'debug'           // Debug-level messages
}

// Define log categories for drone operations
export enum LogCategory {
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  AUDIT = 'AUDIT',
  DRONE_TELEMETRY = 'DRONE_TELEMETRY',
  MISSION = 'MISSION',
  COMMUNICATION = 'COMMUNICATION',
  PERFORMANCE = 'PERFORMANCE',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  API = 'API',
  WEBSOCKET = 'WEBSOCKET',
  MAVLINK = 'MAVLINK',
  CYPHAL = 'CYPHAL',
  THREAT_DETECTION = 'THREAT_DETECTION',
  ANOMALY = 'ANOMALY',
  COMPLIANCE = 'COMPLIANCE',
  BACKUP = 'BACKUP',
  MONITORING = 'MONITORING'
}

// Interface for structured log entries
export interface LogEntry {
  level: MilitaryLogLevel;
  message: string;
  category: LogCategory;
  classification?: SecurityClassification;
  timestamp?: Date;
  correlationId?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  droneId?: string;
  missionId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  success?: boolean;
  error?: Error | string;
  metadata?: Record<string, any>;
  tags?: string[];
  location?: {
    lat?: number;
    lon?: number;
    altitude?: number;
  };
  securityContext?: {
    clearanceLevel?: string;
    compartment?: string;
    needToKnow?: string[];
  };
}

// Interface for performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp?: Date;
}

class MilitaryLogger {
  private logger: winston.Logger;
  private metricsLogger: winston.Logger;
  private auditLogger: winston.Logger;
  private securityLogger: winston.Logger;
  private static instance: MilitaryLogger;

  private constructor() {
    this.logger = this.createMainLogger();
    this.metricsLogger = this.createMetricsLogger();
    this.auditLogger = this.createAuditLogger();
    this.securityLogger = this.createSecurityLogger();
  }

  public static getInstance(): MilitaryLogger {
    if (!MilitaryLogger.instance) {
      MilitaryLogger.instance = new MilitaryLogger();
    }
    return MilitaryLogger.instance;
  }

  private createMainLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs');
    
    // Create custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, category, classification, ...meta } = info;
        return JSON.stringify({
          '@timestamp': timestamp,
          level: level.toUpperCase(),
          message,
          category,
          classification: classification || SecurityClassification.UNCLASSIFIED,
          correlationId: meta.correlationId || uuidv4(),
          ...meta
        });
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: structuredFormat,
      defaultMeta: {
        service: 'sentient-edge',
        version: process.env.APP_VERSION || '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME || require('os').hostname()
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: path.join(logDir, 'sentient-edge-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '30d',
          zippedArchive: true,
          format: structuredFormat
        }),

        // Error-only log file
        new DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '50m',
          maxFiles: '90d',
          zippedArchive: true,
          format: structuredFormat
        })
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(logDir, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '90d',
          zippedArchive: true
        })
      ],
      
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(logDir, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '90d',
          zippedArchive: true
        })
      ]
    });
  }

  private createMetricsLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs', 'metrics');
    
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: path.join(logDir, 'metrics-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '500m',
          maxFiles: '7d',
          zippedArchive: true
        })
      ]
    });
  }

  private createAuditLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs', 'audit');
    
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: path.join(logDir, 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '365d', // Keep audit logs for 1 year
          zippedArchive: true
        })
      ]
    });
  }

  private createSecurityLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs', 'security');
    
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: path.join(logDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '365d', // Keep security logs for 1 year
          zippedArchive: true
        })
      ]
    });
  }

  // Main logging methods
  public emergency(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.EMERGENCY });
  }

  public alert(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.ALERT });
  }

  public critical(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.CRITICAL });
  }

  public error(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.ERROR });
  }

  public warning(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.WARNING });
  }

  public notice(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.NOTICE });
  }

  public info(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.INFO });
  }

  public debug(entry: Omit<LogEntry, 'level'>): void {
    this.log({ ...entry, level: MilitaryLogLevel.DEBUG });
  }

  private log(entry: LogEntry): void {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
      correlationId: entry.correlationId || uuidv4()
    };

    // Log to main logger
    this.logger.log(entry.level, entry.message, logEntry);

    // Log to specialized loggers based on category
    if (entry.category === LogCategory.AUDIT || entry.category === LogCategory.COMPLIANCE) {
      this.auditLogger.info('audit', logEntry);
    }

    if (entry.category === LogCategory.SECURITY || entry.category === LogCategory.THREAT_DETECTION) {
      this.securityLogger.info('security', logEntry);
    }
  }

  // Specialized logging methods
  public logDroneTelemetry(droneId: string, telemetryData: any, metadata?: Record<string, any>): void {
    this.info({
      message: `Drone telemetry received`,
      category: LogCategory.DRONE_TELEMETRY,
      droneId,
      metadata: {
        telemetry: telemetryData,
        ...metadata
      }
    });
  }

  public logMissionEvent(missionId: string, event: string, details?: any): void {
    this.info({
      message: `Mission event: ${event}`,
      category: LogCategory.MISSION,
      missionId,
      metadata: details
    });
  }

  public logSecurityEvent(event: string, severity: MilitaryLogLevel, details?: any): void {
    this.log({
      level: severity,
      message: `Security event: ${event}`,
      category: LogCategory.SECURITY,
      classification: SecurityClassification.CONFIDENTIAL,
      metadata: details
    });
  }

  public logPerformanceMetric(metric: PerformanceMetric): void {
    this.metricsLogger.info('metric', {
      timestamp: metric.timestamp || new Date(),
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      tags: metric.tags || {}
    });
  }

  public logAPIRequest(method: string, path: string, statusCode: number, duration: number, userId?: string, metadata?: any): void {
    this.info({
      message: `API ${method} ${path} - ${statusCode}`,
      category: LogCategory.API,
      userId,
      duration,
      success: statusCode < 400,
      metadata: {
        method,
        path,
        statusCode,
        ...metadata
      }
    });
  }

  public logWebSocketEvent(event: string, userId?: string, metadata?: any): void {
    this.info({
      message: `WebSocket event: ${event}`,
      category: LogCategory.WEBSOCKET,
      userId,
      metadata
    });
  }

  public logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, error?: any): void {
    this.info({
      message: `Database ${operation} on ${table}`,
      category: LogCategory.DATABASE,
      duration,
      success,
      error,
      metadata: {
        operation,
        table
      }
    });
  }

  public logAnomalyDetection(anomalyType: string, severity: string, details: any): void {
    this.warning({
      message: `Anomaly detected: ${anomalyType}`,
      category: LogCategory.ANOMALY,
      classification: SecurityClassification.CONFIDENTIAL,
      metadata: {
        anomalyType,
        severity,
        details
      }
    });
  }

  // Compliance and audit logging
  public logComplianceEvent(event: string, regulation: string, details: any): void {
    this.notice({
      message: `Compliance event: ${event}`,
      category: LogCategory.COMPLIANCE,
      classification: SecurityClassification.CONFIDENTIAL,
      metadata: {
        regulation,
        details
      }
    });
  }

  // Performance and health monitoring
  public logHealthCheck(component: string, status: 'healthy' | 'unhealthy' | 'degraded', details?: any): void {
    const level = status === 'healthy' ? MilitaryLogLevel.INFO : 
                  status === 'degraded' ? MilitaryLogLevel.WARNING : MilitaryLogLevel.ERROR;
    
    this.log({
      level,
      message: `Health check: ${component} is ${status}`,
      category: LogCategory.MONITORING,
      component,
      success: status === 'healthy',
      metadata: details
    });
  }

  // Network monitoring
  public logNetworkEvent(event: string, source: string, destination: string, details?: any): void {
    this.info({
      message: `Network event: ${event}`,
      category: LogCategory.NETWORK,
      metadata: {
        source,
        destination,
        ...details
      }
    });
  }

  // Communication protocol logging
  public logMAVLinkMessage(droneId: string, messageType: string, details: any): void {
    this.debug({
      message: `MAVLink message: ${messageType}`,
      category: LogCategory.MAVLINK,
      droneId,
      metadata: {
        messageType,
        details
      }
    });
  }

  public logCyphalMessage(nodeId: string, messageType: string, details: any): void {
    this.debug({
      message: `Cyphal message: ${messageType}`,
      category: LogCategory.CYPHAL,
      metadata: {
        nodeId,
        messageType,
        details
      }
    });
  }
}

// Export singleton instance and utilities
export const logger = MilitaryLogger.getInstance();

// Helper function to create correlation ID
export const createCorrelationId = (): string => uuidv4();

// Helper function to extract request metadata
export const extractRequestMetadata = (req: any) => ({
  correlationId: req.correlationId || createCorrelationId(),
  userId: req.user?.userId,
  username: req.user?.username,
  sessionId: req.sessionId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  method: req.method,
  path: req.path,
  query: req.query,
  headers: {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? '[REDACTED]' : undefined
  }
});

// Helper function to sanitize sensitive data for logging
export const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'key', 'secret', 'authorization', 'cookie'];
  const sanitized = { ...data };

  for (const [key, value] of Object.entries(sanitized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    }
  }

  return sanitized;
};

// Export types and enums
export {
  MilitaryLogLevel as LogLevel,
  LogCategory,
  SecurityClassification,
  type LogEntry,
  type PerformanceMetric
};