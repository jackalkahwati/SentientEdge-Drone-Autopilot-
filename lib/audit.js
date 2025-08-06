const fs = require('fs');
const path = require('path');

const AuditAction = {
  // Authentication & Authorization
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  ACCESS_DENIED: 'ACCESS_DENIED',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',

  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_PERMISSIONS_CHANGED: 'USER_PERMISSIONS_CHANGED',

  // Drone Operations
  DRONE_STATUS_CHANGED: 'DRONE_STATUS_CHANGED',
  DRONE_ASSIGNED: 'DRONE_ASSIGNED',
  DRONE_CONTROL_TAKEN: 'DRONE_CONTROL_TAKEN',
  DRONE_MAINTENANCE_SCHEDULED: 'DRONE_MAINTENANCE_SCHEDULED',
  DRONE_EMERGENCY_STOP: 'DRONE_EMERGENCY_STOP',

  // Mission Operations
  MISSION_CREATED: 'MISSION_CREATED',
  MISSION_UPDATED: 'MISSION_UPDATED',
  MISSION_DELETED: 'MISSION_DELETED',
  MISSION_STARTED: 'MISSION_STARTED',
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  MISSION_ABORTED: 'MISSION_ABORTED',

  // System Security
  SECURITY_ERROR: 'SECURITY_ERROR',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  DATA_EXPORT: 'DATA_EXPORT',
  CONFIG_CHANGED: 'CONFIG_CHANGED',

  // Communications
  SECURE_CHANNEL_CREATED: 'SECURE_CHANNEL_CREATED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  BROADCAST_SENT: 'BROADCAST_SENT',
  ENCRYPTION_KEY_ROTATED: 'ENCRYPTION_KEY_ROTATED',

  // General API
  API_REQUEST: 'API_REQUEST',
  DATA_ACCESS: 'DATA_ACCESS',
  
  // API Key Management
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_USED: 'API_KEY_USED',
};

// In-memory audit log store (replace with database in production)
const auditLogs = [];
const MAX_MEMORY_LOGS = 10000;

// File-based audit logging for development
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || './logs';
const AUDIT_LOG_ENABLED = process.env.AUDIT_LOG_ENABLED === 'true';

/**
 * Initialize audit logging system
 */
function initAuditLogging() {
  if (!AUDIT_LOG_ENABLED) return;

  // Ensure log directory exists
  if (!fs.existsSync(AUDIT_LOG_DIR)) {
    fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
  }

  console.log('Audit logging initialized');
}

/**
 * Determine severity level based on action
 */
function getSeverity(action) {
  const criticalActions = [
    AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    AuditAction.ACCOUNT_LOCKED,
    AuditAction.DRONE_EMERGENCY_STOP,
    AuditAction.MISSION_ABORTED,
    AuditAction.SECURITY_ERROR,
  ];

  const highActions = [
    AuditAction.LOGIN_FAILED,
    AuditAction.ACCESS_DENIED,
    AuditAction.USER_ROLE_CHANGED,
    AuditAction.DRONE_CONTROL_TAKEN,
    AuditAction.MISSION_DELETED,
    AuditAction.SUSPICIOUS_ACTIVITY,
    AuditAction.CONFIG_CHANGED,
  ];

  const mediumActions = [
    AuditAction.LOGIN_SUCCESS,
    AuditAction.PASSWORD_RESET_REQUEST,
    AuditAction.USER_CREATED,
    AuditAction.USER_UPDATED,
    AuditAction.MISSION_CREATED,
    AuditAction.DRONE_STATUS_CHANGED,
    AuditAction.DATA_EXPORT,
  ];

  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  if (mediumActions.includes(action)) return 'medium';
  return 'low';
}

/**
 * Log audit event
 */
function auditLog(options) {
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action: options.action,
    userId: options.userId,
    username: options.username,
    resource: options.resource,
    details: options.details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    correlationId: options.correlationId,
    severity: getSeverity(options.action),
    success: options.success !== false, // Default to true unless explicitly false
  };

  // Add to in-memory store
  auditLogs.unshift(entry);
  
  // Maintain memory limit
  if (auditLogs.length > MAX_MEMORY_LOGS) {
    auditLogs.splice(MAX_MEMORY_LOGS);
  }

  // Log to console for development
  if (process.env.NODE_ENV === 'development' || entry.severity === 'critical') {
    console.log(`[AUDIT:${entry.severity.toUpperCase()}]`, {
      action: entry.action,
      userId: entry.userId,
      resource: entry.resource,
      timestamp: entry.timestamp,
      correlationId: entry.correlationId,
    });
  }

  // Write to file if enabled
  if (AUDIT_LOG_ENABLED) {
    writeAuditLogToFile(entry);
  }

  // Trigger alerts for critical actions
  if (entry.severity === 'critical') {
    handleCriticalAuditEvent(entry);
  }
}

/**
 * Write audit log entry to file
 */
function writeAuditLogToFile(entry) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(AUDIT_LOG_DIR, `audit-${date}.log`);
    const logLine = JSON.stringify(entry) + '\n';
    
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Failed to write audit log to file:', error);
  }
}

/**
 * Handle critical audit events
 */
function handleCriticalAuditEvent(entry) {
  // In production, this would trigger alerts, notifications, etc.
  console.error('[CRITICAL AUDIT EVENT]', {
    action: entry.action,
    userId: entry.userId,
    resource: entry.resource,
    timestamp: entry.timestamp,
    details: entry.details,
  });

  // Example: Send to monitoring system, security team notification, etc.
  // alertService.sendCriticalAlert(entry);
}

/**
 * Query audit logs
 */
function queryAuditLogs(query = {}) {
  let filtered = [...auditLogs];

  // Apply filters
  if (query.userId) {
    filtered = filtered.filter(log => log.userId === query.userId);
  }

  if (query.action) {
    filtered = filtered.filter(log => log.action === query.action);
  }

  if (query.resource) {
    filtered = filtered.filter(log => log.resource.includes(query.resource));
  }

  if (query.severity) {
    filtered = filtered.filter(log => log.severity === query.severity);
  }

  if (query.startDate) {
    filtered = filtered.filter(log => log.timestamp >= query.startDate);
  }

  if (query.endDate) {
    filtered = filtered.filter(log => log.timestamp <= query.endDate);
  }

  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || 100;

  return filtered.slice(offset, offset + limit);
}

/**
 * Get audit log statistics
 */
function getAuditLogStats() {
  const stats = {
    total: auditLogs.length,
    bySeverity: {},
    byAction: {},
    recentCritical: 0,
  };

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  auditLogs.forEach(log => {
    // Count by severity
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    
    // Count recent critical events
    if (log.severity === 'critical' && log.timestamp >= last24Hours) {
      stats.recentCritical++;
    }
  });

  return stats;
}

/**
 * Export audit logs for compliance/analysis
 */
function exportAuditLogs(query = {}, format = 'json') {
  const logs = queryAuditLogs(query);

  if (format === 'csv') {
    const headers = [
      'Timestamp',
      'Action',
      'User ID',
      'Username',
      'Resource',
      'Severity',
      'Success',
      'IP Address',
      'Correlation ID',
      'Details'
    ];

    const csvLines = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        log.action,
        log.userId,
        log.username || '',
        log.resource,
        log.severity,
        log.success,
        log.ipAddress || '',
        log.correlationId || '',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ].join(','))
    ];

    return csvLines.join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

// Initialize audit logging on module load
initAuditLogging();

module.exports = {
  AuditAction,
  auditLog,
  queryAuditLogs,
  getAuditLogStats,
  exportAuditLogs,
  initAuditLogging,
};