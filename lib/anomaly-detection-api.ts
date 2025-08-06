/**
 * Anomaly Detection API Integration
 * Express.js API endpoints for the anomaly detection system
 */

import { Request, Response, NextFunction } from 'express';
import { integratedAnomalySystem, createEnhancedTelemetryFromDrone } from './integrated-anomaly-system';
import { alertEscalationEngine } from './automated-alert-escalation';
import { predictiveFailureAnalyzer } from './predictive-failure-analysis';
import { realTimeThreatDetector } from './real-time-threat-detection';
import { insiderThreatDetector } from './insider-threat-detection';
import { logger, LogCategory } from './monitoring/logger';

// API middleware for anomaly detection
export const anomalyDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Track user activity for insider threat detection
  if (req.user) {
    integratedAnomalySystem.trackUserActivity(
      req.user.id,
      req.method.toLowerCase(),
      req.path,
      req.ip,
      true,
      {
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      }
    );
  }

  next();
};

// API routes for anomaly detection system
export const setupAnomalyDetectionRoutes = (app: any) => {
  
  // System health and status endpoints
  app.get('/api/anomaly-detection/health', async (req: Request, res: Response) => {
    try {
      const health = await integratedAnomalySystem.performHealthCheck();
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error({
        message: 'Error getting system health',
        category: LogCategory.ANOMALY,
        error
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get system health'
      });
    }
  });

  app.get('/api/anomaly-detection/status', (req: Request, res: Response) => {
    try {
      const status = integratedAnomalySystem.getSystemStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get system status'
      });
    }
  });

  // Alert management endpoints
  app.get('/api/anomaly-detection/alerts', (req: Request, res: Response) => {
    try {
      const alerts = alertEscalationEngine.getActiveAlerts();
      const limit = parseInt(req.query.limit as string) || 50;
      const severity = req.query.severity as string;
      const type = req.query.type as string;

      let filteredAlerts = alerts;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
      }

      res.json({
        success: true,
        data: {
          alerts: filteredAlerts.slice(0, limit),
          total: filteredAlerts.length,
          statistics: integratedAnomalySystem.getAnomalyStatistics()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts'
      });
    }
  });

  app.post('/api/anomaly-detection/alerts/:alertId/acknowledge', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { notes } = req.body;
      const userId = req.user?.id || 'unknown';

      const success = alertEscalationEngine.acknowledgeAlert(alertId, userId, notes);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  });

  app.post('/api/anomaly-detection/alerts/:alertId/resolve', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      const userId = req.user?.id || 'unknown';

      const success = alertEscalationEngine.resolveAlert(alertId, userId, resolution);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  });

  app.post('/api/anomaly-detection/alerts/:alertId/suppress', (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { durationMinutes, reason } = req.body;
      const userId = req.user?.id || 'unknown';

      const success = alertEscalationEngine.suppressAlert(alertId, userId, durationMinutes, reason);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert suppressed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to suppress alert'
      });
    }
  });

  // Drone-specific anomaly endpoints
  app.get('/api/anomaly-detection/drones/:droneId/anomalies', async (req: Request, res: Response) => {
    try {
      const { droneId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const anomalies = await integratedAnomalySystem.getDroneAnomalies(droneId, limit);
      
      res.json({
        success: true,
        data: {
          droneId,
          anomalies,
          count: anomalies.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get drone anomalies'
      });
    }
  });

  app.get('/api/anomaly-detection/drones/:droneId/predictions', async (req: Request, res: Response) => {
    try {
      const { droneId } = req.params;

      const predictions = await predictiveFailureAnalyzer.getPredictions(droneId);
      
      res.json({
        success: true,
        data: {
          droneId,
          predictions,
          count: predictions.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get failure predictions'
      });
    }
  });

  app.get('/api/anomaly-detection/drones/:droneId/threats', (req: Request, res: Response) => {
    try {
      const { droneId } = req.params;

      const threats = realTimeThreatDetector.getThreatsForDrone(droneId);
      
      res.json({
        success: true,
        data: {
          droneId,
          threats,
          count: threats.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get drone threats'
      });
    }
  });

  // User behavior analysis endpoints
  app.get('/api/anomaly-detection/users/:userId/threats', (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const threats = insiderThreatDetector.getUserThreats(userId);
      const baseline = insiderThreatDetector.getUserBaseline(userId);
      
      res.json({
        success: true,
        data: {
          userId,
          threats,
          baseline,
          threatCount: threats.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user threats'
      });
    }
  });

  app.get('/api/anomaly-detection/users/high-risk', (req: Request, res: Response) => {
    try {
      const highRiskUsers = insiderThreatDetector.getHighRiskUsers();
      
      res.json({
        success: true,
        data: {
          users: highRiskUsers,
          count: highRiskUsers.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get high-risk users'
      });
    }
  });

  // Maintenance and configuration endpoints
  app.get('/api/anomaly-detection/maintenance/schedule', (req: Request, res: Response) => {
    try {
      // Get all drones and generate maintenance schedule
      // This would typically come from your drone management system
      const droneIds = req.query.droneIds as string[] || [];
      const schedule = predictiveFailureAnalyzer.generateMaintenanceSchedule(droneIds);
      
      res.json({
        success: true,
        data: {
          schedule,
          count: schedule.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get maintenance schedule'
      });
    }
  });

  app.post('/api/anomaly-detection/telemetry/ingest', (req: Request, res: Response) => {
    try {
      const { droneData } = req.body;
      
      if (!droneData) {
        return res.status(400).json({
          success: false,
          error: 'Drone data is required'
        });
      }

      // Convert drone data to enhanced telemetry format
      const telemetry = createEnhancedTelemetryFromDrone(droneData);
      integratedAnomalySystem.processTelemetryData(telemetry);
      
      res.json({
        success: true,
        message: 'Telemetry data processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process telemetry data'
      });
    }
  });

  app.post('/api/anomaly-detection/network-traffic', (req: Request, res: Response) => {
    try {
      const { trafficData } = req.body;
      
      if (!trafficData) {
        return res.status(400).json({
          success: false,
          error: 'Traffic data is required'
        });
      }

      integratedAnomalySystem.addNetworkTraffic(trafficData);
      
      res.json({
        success: true,
        message: 'Network traffic data processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process network traffic data'
      });
    }
  });

  // Configuration endpoints
  app.get('/api/anomaly-detection/config', (req: Request, res: Response) => {
    try {
      const status = integratedAnomalySystem.getSystemStatus();
      
      res.json({
        success: true,
        data: {
          config: status.config,
          isRunning: status.isRunning
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration'
      });
    }
  });

  app.put('/api/anomaly-detection/config', (req: Request, res: Response) => {
    try {
      const { config } = req.body;
      
      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Configuration is required'
        });
      }

      integratedAnomalySystem.updateConfiguration(config);
      
      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  });

  // System control endpoints
  app.post('/api/anomaly-detection/start', async (req: Request, res: Response) => {
    try {
      await integratedAnomalySystem.start();
      
      res.json({
        success: true,
        message: 'Anomaly detection system started successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start anomaly detection system'
      });
    }
  });

  app.post('/api/anomaly-detection/stop', async (req: Request, res: Response) => {
    try {
      await integratedAnomalySystem.stop();
      
      res.json({
        success: true,
        message: 'Anomaly detection system stopped successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to stop anomaly detection system'
      });
    }
  });

  // Statistics and reporting endpoints
  app.get('/api/anomaly-detection/statistics', (req: Request, res: Response) => {
    try {
      const statistics = integratedAnomalySystem.getAnomalyStatistics();
      const systemHealth = integratedAnomalySystem.getSystemHealth();
      
      res.json({
        success: true,
        data: {
          anomalies: statistics,
          systemMetrics: systemHealth.metrics,
          componentHealth: systemHealth.components
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  });

  app.get('/api/anomaly-detection/threats/active', (req: Request, res: Response) => {
    try {
      const activeThreats = realTimeThreatDetector.getActiveThreats();
      
      res.json({
        success: true,
        data: {
          threats: activeThreats,
          count: activeThreats.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get active threats'
      });
    }
  });

  app.post('/api/anomaly-detection/threats/:threatId/acknowledge', (req: Request, res: Response) => {
    try {
      const { threatId } = req.params;
      const userId = req.user?.id || 'unknown';

      realTimeThreatDetector.acknowledgeThreat(threatId, userId);
      
      res.json({
        success: true,
        message: 'Threat acknowledged successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge threat'
      });
    }
  });

  logger.info({
    message: 'Anomaly Detection API routes configured',
    category: LogCategory.MONITORING,
    metadata: { endpointCount: 20 }
  });
};

// WebSocket event handlers for real-time updates
export const setupAnomalyDetectionWebSocket = (io: any) => {
  
  io.on('connection', (socket: any) => {
    logger.info({
      message: 'Client connected to anomaly detection WebSocket',
      category: LogCategory.MONITORING,
      metadata: { socketId: socket.id }
    });

    // Send initial system status
    socket.emit('system_status', integratedAnomalySystem.getSystemStatus());

    // Handle client requests for specific data
    socket.on('request_drone_anomalies', async (data: { droneId: string; limit?: number }) => {
      try {
        const anomalies = await integratedAnomalySystem.getDroneAnomalies(
          data.droneId, 
          data.limit || 50
        );
        socket.emit('drone_anomalies', { droneId: data.droneId, anomalies });
      } catch (error) {
        socket.emit('error', { message: 'Failed to get drone anomalies' });
      }
    });

    socket.on('request_system_health', async () => {
      try {
        const health = await integratedAnomalySystem.performHealthCheck();
        socket.emit('system_health', health);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get system health' });
      }
    });

    socket.on('request_active_alerts', () => {
      try {
        const alerts = alertEscalationEngine.getActiveAlerts();
        socket.emit('active_alerts', alerts);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get active alerts' });
      }
    });

    socket.on('request_threat_status', () => {
      try {
        const threats = realTimeThreatDetector.getActiveThreats();
        socket.emit('threat_status', threats);
      } catch (error) {
        socket.emit('error', { message: 'Failed to get threat status' });
      }
    });

    socket.on('disconnect', () => {
      logger.info({
        message: 'Client disconnected from anomaly detection WebSocket',
        category: LogCategory.MONITORING,
        metadata: { socketId: socket.id }
      });
    });
  });

  logger.info({
    message: 'Anomaly Detection WebSocket handlers configured',
    category: LogCategory.MONITORING
  });
};

// Initialize the anomaly detection system
export const initializeAnomalyDetectionSystem = async () => {
  try {
    logger.info({
      message: 'Initializing Integrated Anomaly Detection System',
      category: LogCategory.MONITORING,
      classification: 'CONFIDENTIAL'
    });

    // Start the integrated system
    await integratedAnomalySystem.start();

    logger.info({
      message: 'Integrated Anomaly Detection System initialized successfully',
      category: LogCategory.MONITORING,
      classification: 'CONFIDENTIAL'
    });

    return true;
  } catch (error) {
    logger.error({
      message: 'Failed to initialize Anomaly Detection System',
      category: LogCategory.MONITORING,
      error
    });
    return false;
  }
};

// Graceful shutdown
export const shutdownAnomalyDetectionSystem = async () => {
  try {
    logger.info({
      message: 'Shutting down Integrated Anomaly Detection System',
      category: LogCategory.MONITORING
    });

    await integratedAnomalySystem.stop();

    logger.info({
      message: 'Integrated Anomaly Detection System shut down successfully',
      category: LogCategory.MONITORING
    });

    return true;
  } catch (error) {
    logger.error({
      message: 'Error shutting down Anomaly Detection System',
      category: LogCategory.MONITORING,
      error
    });
    return false;
  }
};