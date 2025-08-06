/**
 * Military-Grade Monitoring Middleware
 * Comprehensive monitoring integration for Express and Next.js services
 */

import { Request, Response, NextFunction } from 'express';
import { logger, LogCategory, MilitaryLogLevel, extractRequestMetadata, sanitizeForLogging } from './logger';
import { metrics, recordHttpMetrics, recordDatabaseMetrics } from './metrics';
import { securityMonitor, SecurityEventType, ThreatLevel, SecurityClassification } from './security-monitor';
import { anomalyDetector } from './anomaly-detection';
import { v4 as uuidv4 } from 'uuid';

// Monitoring configuration interface
export interface MonitoringConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  enableSecurity: boolean;
  enableTracing: boolean;
  enableAnomalyDetection: boolean;
  logLevel: MilitaryLogLevel;
  excludePaths: string[];
  sensitiveHeaders: string[];
  maxRequestBodySize: number;
  samplingRate: number;
}

// Default monitoring configuration
const defaultConfig: MonitoringConfig = {
  enableLogging: true,
  enableMetrics: true,
  enableSecurity: true,
  enableTracing: true,
  enableAnomalyDetection: true,
  logLevel: MilitaryLogLevel.INFO,
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  maxRequestBodySize: 1048576, // 1MB
  samplingRate: 1.0 // 100% sampling
};

// Extended request interface with monitoring data
export interface MonitoredRequest extends Request {
  startTime: number;
  correlationId: string;
  monitoring: {
    metrics: any;
    logs: any[];
    securityEvents: any[];
  };
}

class MonitoringMiddleware {
  private config: MonitoringConfig;
  private static instance: MonitoringMiddleware;

  private constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  public static getInstance(config?: Partial<MonitoringConfig>): MonitoringMiddleware {
    if (!MonitoringMiddleware.instance) {
      MonitoringMiddleware.instance = new MonitoringMiddleware(config);
    }
    return MonitoringMiddleware.instance;
  }

  // Main Express middleware function
  public expressMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip monitoring for excluded paths
      if (this.shouldSkipPath(req.path)) {
        return next();
      }

      // Initialize monitoring context
      const monitoredReq = this.initializeMonitoringContext(req as MonitoredRequest);
      
      // Start request monitoring
      this.startRequestMonitoring(monitoredReq, res);
      
      // Set up response monitoring
      this.setupResponseMonitoring(monitoredReq, res);
      
      // Continue to next middleware
      next();
    };
  }

  // Next.js API route middleware
  public nextApiMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Similar to Express middleware but with Next.js specific handling
      const monitoredReq = this.initializeMonitoringContext(req as MonitoredRequest);
      
      this.startRequestMonitoring(monitoredReq, res);
      this.setupResponseMonitoring(monitoredReq, res);
      
      next();
    };
  }

  // Database operation monitoring
  public databaseMiddleware() {
    return {
      beforeQuery: (operation: string, table: string, query?: string) => {
        const startTime = Date.now();
        
        if (this.config.enableLogging) {
          logger.debug({
            message: `Database query started: ${operation} on ${table}`,
            category: LogCategory.DATABASE,
            metadata: {
              operation,
              table,
              query: this.sanitizeQuery(query)
            }
          });
        }

        return startTime;
      },

      afterQuery: (startTime: number, operation: string, table: string, success: boolean, error?: any) => {
        const duration = Date.now() - startTime;
        
        if (this.config.enableMetrics) {
          recordDatabaseMetrics(operation, table, duration, success, error);
        }

        if (this.config.enableLogging) {
          const logLevel = success ? MilitaryLogLevel.DEBUG : MilitaryLogLevel.ERROR;
          logger.log({
            level: logLevel,
            message: `Database query ${success ? 'completed' : 'failed'}: ${operation} on ${table}`,
            category: LogCategory.DATABASE,
            duration,
            success,
            error: error ? sanitizeForLogging(error) : undefined,
            metadata: {
              operation,
              table,
              duration
            }
          });
        }

        // Anomaly detection for slow queries
        if (this.config.enableAnomalyDetection && duration > 5000) { // 5 seconds
          anomalyDetector.analyzeSystemMetrics({
            timestamp: new Date(),
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkLatency: duration,
            activeConnections: 0,
            errorRate: success ? 0 : 100
          });
        }
      }
    };
  }

  // WebSocket connection monitoring
  public websocketMiddleware() {
    return {
      onConnection: (userId?: string, userRole?: string) => {
        if (this.config.enableLogging) {
          logger.info({
            message: 'WebSocket connection established',
            category: LogCategory.WEBSOCKET,
            userId,
            metadata: {
              userRole,
              connectionType: 'websocket'
            }
          });
        }

        if (this.config.enableMetrics) {
          metrics.recordWebSocketConnection(userRole || 'anonymous', true);
        }
      },

      onDisconnection: (userId?: string, userRole?: string, reason?: string) => {
        if (this.config.enableLogging) {
          logger.info({
            message: 'WebSocket connection closed',
            category: LogCategory.WEBSOCKET,
            userId,
            metadata: {
              userRole,
              reason,
              connectionType: 'websocket'
            }
          });
        }

        if (this.config.enableMetrics) {
          metrics.recordWebSocketConnection(userRole || 'anonymous', false);
        }
      },

      onMessage: (type: string, userId?: string, userRole?: string, messageSize?: number) => {
        if (this.config.enableLogging && Math.random() < this.config.samplingRate) {
          logger.debug({
            message: `WebSocket message received: ${type}`,
            category: LogCategory.WEBSOCKET,
            userId,
            metadata: {
              messageType: type,
              userRole,
              messageSize
            }
          });
        }

        if (this.config.enableMetrics) {
          metrics.recordWebSocketMessage(type, 'inbound', userRole || 'anonymous');
        }
      },

      onError: (error: Error, userId?: string) => {
        logger.error({
          message: 'WebSocket error occurred',
          category: LogCategory.WEBSOCKET,
          userId,
          error,
          metadata: {
            errorType: 'websocket_error'
          }
        });
      }
    };
  }

  // Authentication monitoring
  public authenticationMiddleware() {
    return {
      onLogin: (userId: string, method: string, success: boolean, ipAddress?: string, userAgent?: string, failureReason?: string) => {
        if (this.config.enableLogging) {
          logger.info({
            message: `Authentication attempt: ${success ? 'success' : 'failure'}`,
            category: LogCategory.SECURITY,
            userId: success ? userId : undefined,
            ipAddress,
            userAgent,
            metadata: {
              method,
              success,
              failureReason
            }
          });
        }

        if (this.config.enableMetrics) {
          metrics.recordAuthentication(method, success, undefined, failureReason);
        }

        if (this.config.enableSecurity && !success) {
          securityMonitor.processSecurityEvent({
            type: SecurityEventType.AUTHENTICATION_FAILURE,
            source: ipAddress || 'unknown',
            severity: ThreatLevel.LOW,
            confidence: 0.8,
            description: `Failed authentication attempt for user: ${userId}`,
            metadata: {
              userId,
              method,
              failureReason,
              userAgent
            },
            userId,
            ipAddress,
            userAgent,
            classification: SecurityClassification.UNCLASSIFIED,
            indicators: ipAddress ? [{
              type: 'ip' as const,
              value: ipAddress,
              confidence: 0.6,
              source: 'auth_failure'
            }] : []
          });
        }
      },

      onLogout: (userId: string, reason?: string) => {
        if (this.config.enableLogging) {
          logger.info({
            message: 'User logged out',
            category: LogCategory.SECURITY,
            userId,
            metadata: {
              reason: reason || 'user_initiated'
            }
          });
        }
      },

      onTokenRefresh: (userId: string, success: boolean) => {
        if (this.config.enableLogging) {
          logger.debug({
            message: `Token refresh: ${success ? 'success' : 'failure'}`,
            category: LogCategory.SECURITY,
            userId,
            metadata: {
              operation: 'token_refresh',
              success
            }
          });
        }
      }
    };
  }

  // Performance monitoring decorator
  public performanceMonitor<T extends (...args: any[]) => any>(
    fn: T,
    operationName: string,
    category: LogCategory = LogCategory.PERFORMANCE
  ): T {
    return ((...args: any[]) => {
      const startTime = Date.now();
      const correlationId = uuidv4();

      try {
        const result = fn(...args);
        
        // Handle both sync and async functions
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              this.recordPerformance(operationName, category, startTime, true, correlationId);
              return value;
            })
            .catch((error: any) => {
              this.recordPerformance(operationName, category, startTime, false, correlationId, error);
              throw error;
            });
        } else {
          this.recordPerformance(operationName, category, startTime, true, correlationId);
          return result;
        }
      } catch (error) {
        this.recordPerformance(operationName, category, startTime, false, correlationId, error);
        throw error;
      }
    }) as T;
  }

  // Health check endpoint with monitoring metrics
  public healthCheckEndpoint() {
    return (req: Request, res: Response) => {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        monitoring: {
          logging: this.config.enableLogging,
          metrics: this.config.enableMetrics,
          security: this.config.enableSecurity,
          tracing: this.config.enableTracing,
          anomalyDetection: this.config.enableAnomalyDetection
        },
        metrics: metrics.getHealthMetrics()
      };

      res.json(healthData);
    };
  }

  // Metrics endpoint for Prometheus
  public metricsEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const metricsData = await metrics.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metricsData);
      } catch (error) {
        logger.error({
          message: 'Failed to retrieve metrics',
          category: LogCategory.MONITORING,
          error
        });
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    };
  }

  // Private helper methods

  private initializeMonitoringContext(req: MonitoredRequest): MonitoredRequest {
    req.startTime = Date.now();
    req.correlationId = uuidv4();
    req.monitoring = {
      metrics: {},
      logs: [],
      securityEvents: []
    };

    return req;
  }

  private startRequestMonitoring(req: MonitoredRequest, res: Response): void {
    if (this.config.enableLogging && Math.random() < this.config.samplingRate) {
      logger.info({
        message: `${req.method} ${req.path} - Request started`,
        category: LogCategory.API,
        correlationId: req.correlationId,
        ...extractRequestMetadata(req),
        metadata: {
          method: req.method,
          path: req.path,
          query: sanitizeForLogging(req.query),
          headers: this.sanitizeHeaders(req.headers)
        }
      });
    }

    // Security monitoring for suspicious patterns
    if (this.config.enableSecurity) {
      this.checkRequestSecurity(req, res);
    }
  }

  private setupResponseMonitoring(req: MonitoredRequest, res: Response): void {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send to capture response
    res.send = function(data) {
      if (res.headersSent) return originalSend.call(this, data);
      
      const duration = Date.now() - req.startTime;
      monitoringInstance.recordRequestCompletion(req, res, duration, data);
      
      return originalSend.call(this, data);
    };

    // Override res.json to capture JSON responses
    res.json = function(data) {
      if (res.headersSent) return originalJson.call(this, data);
      
      const duration = Date.now() - req.startTime;
      monitoringInstance.recordRequestCompletion(req, res, duration, data);
      
      return originalJson.call(this, data);
    };
  }

  private recordRequestCompletion(req: MonitoredRequest, res: Response, duration: number, responseData?: any): void {
    // Record HTTP metrics
    if (this.config.enableMetrics) {
      recordHttpMetrics(req, res, duration);
    }

    // Log request completion
    if (this.config.enableLogging && Math.random() < this.config.samplingRate) {
      const logLevel = res.statusCode >= 500 ? MilitaryLogLevel.ERROR :
                      res.statusCode >= 400 ? MilitaryLogLevel.WARNING :
                      MilitaryLogLevel.INFO;

      logger.log({
        level: logLevel,
        message: `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
        category: LogCategory.API,
        correlationId: req.correlationId,
        duration,
        success: res.statusCode < 400,
        ...extractRequestMetadata(req),
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          responseSize: responseData ? JSON.stringify(responseData).length : undefined
        }
      });
    }

    // Anomaly detection for slow requests
    if (this.config.enableAnomalyDetection && duration > 5000) {
      anomalyDetector.analyzeSystemMetrics({
        timestamp: new Date(),
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: duration,
        activeConnections: 0,
        errorRate: res.statusCode >= 400 ? 1 : 0
      });
    }
  }

  private checkRequestSecurity(req: MonitoredRequest, res: Response): void {
    // Check for suspicious patterns in request
    const suspiciousPatterns = [
      /union.*select/i,  // SQL injection
      /<script/i,        // XSS
      /\.\.\//,          // Path traversal
      /cmd\.exe/i,       // Command injection
      /eval\(/i          // Code injection
    ];

    const requestData = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        securityMonitor.processSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          source: req.ip || 'unknown',
          severity: ThreatLevel.MEDIUM,
          confidence: 0.7,
          description: `Suspicious pattern detected in request: ${pattern.source}`,
          metadata: {
            pattern: pattern.source,
            method: req.method,
            path: req.path,
            userAgent: req.headers['user-agent']
          },
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          classification: SecurityClassification.CONFIDENTIAL,
          indicators: req.ip ? [{
            type: 'ip' as const,
            value: req.ip,
            confidence: 0.5,
            source: 'suspicious_pattern'
          }] : []
        });
        break;
      }
    }

    // Rate limiting check
    const userKey = req.user?.userId || req.ip || 'anonymous';
    // Implementation would check rate limiting here
  }

  private recordPerformance(
    operationName: string,
    category: LogCategory,
    startTime: number,
    success: boolean,
    correlationId: string,
    error?: any
  ): void {
    const duration = Date.now() - startTime;

    if (this.config.enableLogging) {
      logger.info({
        message: `Operation ${operationName} ${success ? 'completed' : 'failed'} (${duration}ms)`,
        category,
        correlationId,
        duration,
        success,
        error: error ? sanitizeForLogging(error) : undefined,
        metadata: {
          operation: operationName,
          duration,
          success
        }
      });
    }

    if (this.config.enableMetrics) {
      metrics.recordPerformanceMetric({
        name: `operation_${operationName}_duration`,
        value: duration,
        unit: 'milliseconds',
        tags: {
          operation: operationName,
          success: success.toString()
        }
      });
    }
  }

  private shouldSkipPath(path: string): boolean {
    return this.config.excludePaths.some(excludePath => 
      path.startsWith(excludePath)
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    for (const header of this.config.sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private sanitizeQuery(query?: string): string | undefined {
    if (!query) return undefined;
    
    // Remove potentially sensitive information from SQL queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/key\s*=\s*'[^']*'/gi, "key='[REDACTED]'");
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// Export singleton instance
const monitoringInstance = MonitoringMiddleware.getInstance();

// Export middleware functions
export const monitoring = monitoringInstance;
export const expressMonitoring = () => monitoringInstance.expressMiddleware();
export const nextApiMonitoring = () => monitoringInstance.nextApiMiddleware();
export const databaseMonitoring = () => monitoringInstance.databaseMiddleware();
export const websocketMonitoring = () => monitoringInstance.websocketMiddleware();
export const authMonitoring = () => monitoringInstance.authenticationMiddleware();
export const performanceMonitor = <T extends (...args: any[]) => any>(
  fn: T,
  operationName: string,
  category?: LogCategory
) => monitoringInstance.performanceMonitor(fn, operationName, category);
export const healthCheck = () => monitoringInstance.healthCheckEndpoint();
export const metricsEndpoint = () => monitoringInstance.metricsEndpoint();

// Export types
export { MonitoringConfig, MonitoredRequest };