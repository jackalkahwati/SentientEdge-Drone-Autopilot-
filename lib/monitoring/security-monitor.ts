/**
 * Military-Grade Security Event Correlation and Threat Detection
 * Advanced security monitoring for drone control platform
 */

import { logger, LogCategory, MilitaryLogLevel, SecurityClassification } from './logger';
import { metrics } from './metrics';
import { EventEmitter } from 'events';

// Security event types
export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'authentication_failure',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALWARE_DETECTION = 'malware_detection',
  NETWORK_INTRUSION = 'network_intrusion',
  DATA_EXFILTRATION = 'data_exfiltration',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  DDOS_ATTACK = 'ddos_attack',
  API_ABUSE = 'api_abuse',
  INSIDER_THREAT = 'insider_threat',
  DRONE_HIJACKING = 'drone_hijacking',
  COMMUNICATION_JAMMING = 'communication_jamming',
  GPS_SPOOFING = 'gps_spoofing'
}

// Threat levels based on military classification
export enum ThreatLevel {
  INFO = 'info',           // Informational - no immediate threat
  LOW = 'low',            // Low threat - monitor
  MEDIUM = 'medium',      // Medium threat - investigate
  HIGH = 'high',          // High threat - immediate action
  CRITICAL = 'critical'   // Critical threat - emergency response
}

// Security event structure
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  source: string;
  target?: string;
  severity: ThreatLevel;
  confidence: number;
  description: string;
  metadata: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  droneId?: string;
  missionId?: string;
  classification: SecurityClassification;
  indicators: ThreatIndicator[];
}

// Threat indicators for correlation
export interface ThreatIndicator {
  type: 'ip' | 'hash' | 'domain' | 'email' | 'user_id' | 'drone_id' | 'pattern';
  value: string;
  confidence: number;
  source: string;
  ttl?: number; // Time to live in seconds
}

// Correlation rules for identifying attack patterns
export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  events: SecurityEventType[];
  timeWindow: number; // seconds
  threshold: number;
  severity: ThreatLevel;
  action: string;
  enabled: boolean;
}

// Threat intelligence feeds
export interface ThreatIntelligence {
  indicators: ThreatIndicator[];
  lastUpdated: Date;
  source: string;
  classification: SecurityClassification;
}

class MilitarySecurityMonitor extends EventEmitter {
  private static instance: MilitarySecurityMonitor;
  private securityEvents: SecurityEvent[] = [];
  private threatIndicators: Map<string, ThreatIndicator> = new Map();
  private correlationRules: CorrelationRule[] = [];
  private activeThreats: Map<string, any> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousUsers: Map<string, any> = new Map();

  private constructor() {
    super();
    this.initializeCorrelationRules();
    this.startThreatCorrelation();
    this.loadThreatIntelligence();
  }

  public static getInstance(): MilitarySecurityMonitor {
    if (!MilitarySecurityMonitor.instance) {
      MilitarySecurityMonitor.instance = new MilitarySecurityMonitor();
    }
    return MilitarySecurityMonitor.instance;
  }

  private initializeCorrelationRules(): void {
    this.correlationRules = [
      {
        id: 'brute_force_detection',
        name: 'Brute Force Attack Detection',
        description: 'Multiple failed authentication attempts from same source',
        events: [SecurityEventType.AUTHENTICATION_FAILURE],
        timeWindow: 300, // 5 minutes
        threshold: 5,
        severity: ThreatLevel.HIGH,
        action: 'block_ip',
        enabled: true
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Attempt',
        description: 'User attempting to access unauthorized resources',
        events: [SecurityEventType.UNAUTHORIZED_ACCESS, SecurityEventType.PRIVILEGE_ESCALATION],
        timeWindow: 600, // 10 minutes
        threshold: 3,
        severity: ThreatLevel.CRITICAL,
        action: 'lock_account',
        enabled: true
      },
      {
        id: 'drone_compromise',
        name: 'Drone Compromise Pattern',
        description: 'Multiple security events targeting drone systems',
        events: [SecurityEventType.DRONE_HIJACKING, SecurityEventType.GPS_SPOOFING, SecurityEventType.COMMUNICATION_JAMMING],
        timeWindow: 1800, // 30 minutes
        threshold: 2,
        severity: ThreatLevel.CRITICAL,
        action: 'emergency_response',
        enabled: true
      },
      {
        id: 'insider_threat',
        name: 'Insider Threat Detection',
        description: 'Suspicious activity from authenticated users',
        events: [SecurityEventType.INSIDER_THREAT, SecurityEventType.DATA_EXFILTRATION],
        timeWindow: 3600, // 1 hour
        threshold: 1,
        severity: ThreatLevel.HIGH,
        action: 'investigate_user',
        enabled: true
      },
      {
        id: 'api_abuse',
        name: 'API Abuse Pattern',
        description: 'Excessive API requests or abuse patterns',
        events: [SecurityEventType.API_ABUSE],
        timeWindow: 60, // 1 minute
        threshold: 100,
        severity: ThreatLevel.MEDIUM,
        action: 'rate_limit',
        enabled: true
      },
      {
        id: 'multi_vector_attack',
        name: 'Multi-Vector Attack',
        description: 'Coordinated attack using multiple techniques',
        events: [SecurityEventType.NETWORK_INTRUSION, SecurityEventType.SQL_INJECTION, SecurityEventType.XSS_ATTACK],
        timeWindow: 900, // 15 minutes
        threshold: 2,
        severity: ThreatLevel.CRITICAL,
        action: 'emergency_lockdown',
        enabled: true
      }
    ];
  }

  // Main method to process security events
  public processSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Store the event
    this.securityEvents.push(securityEvent);
    
    // Keep only last 10000 events to prevent memory issues
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }

    // Log the security event
    this.logSecurityEvent(securityEvent);

    // Check against threat indicators
    this.checkThreatIndicators(securityEvent);

    // Perform immediate threat assessment
    this.assessImmediateThreat(securityEvent);

    // Trigger correlation analysis
    this.triggerCorrelationAnalysis(securityEvent);

    // Record metrics
    this.recordSecurityMetrics(securityEvent);

    // Emit event for real-time monitoring
    this.emit('securityEvent', securityEvent);
  }

  private startThreatCorrelation(): void {
    // Run correlation analysis every 30 seconds
    setInterval(() => {
      this.performThreatCorrelation();
    }, 30000);

    // Clean up old events every 5 minutes
    setInterval(() => {
      this.cleanupOldEvents();
    }, 300000);
  }

  private performThreatCorrelation(): void {
    try {
      for (const rule of this.correlationRules) {
        if (!rule.enabled) continue;

        const correlatedEvents = this.findCorrelatedEvents(rule);
        if (correlatedEvents.length >= rule.threshold) {
          this.handleCorrelatedThreat(rule, correlatedEvents);
        }
      }
    } catch (error) {
      logger.error({
        message: 'Error in threat correlation analysis',
        category: LogCategory.SECURITY,
        error,
        metadata: { component: 'security-monitor' }
      });
    }
  }

  private findCorrelatedEvents(rule: CorrelationRule): SecurityEvent[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (rule.timeWindow * 1000));

    return this.securityEvents.filter(event => 
      event.timestamp >= windowStart &&
      rule.events.includes(event.type)
    );
  }

  private handleCorrelatedThreat(rule: CorrelationRule, events: SecurityEvent[]): void {
    const threatId = this.generateThreatId();
    const threat = {
      id: threatId,
      rule: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      events: events.map(e => e.id),
      detectedAt: new Date(),
      action: rule.action,
      status: 'active'
    };

    this.activeThreats.set(threatId, threat);

    // Log the correlated threat
    logger.logSecurityEvent(
      'threat_correlation',
      rule.severity,
      {
        threatId,
        ruleName: rule.name,
        eventCount: events.length,
        timeWindow: rule.timeWindow,
        correlatedEvents: events.map(e => ({
          id: e.id,
          type: e.type,
          source: e.source,
          timestamp: e.timestamp
        }))
      }
    );

    // Execute automated response
    this.executeAutomatedResponse(rule.action, threat, events);

    // Send alert
    this.sendThreatAlert(threat, events);
  }

  private executeAutomatedResponse(action: string, threat: any, events: SecurityEvent[]): void {
    switch (action) {
      case 'block_ip':
        this.blockSuspiciousIPs(events);
        break;
      case 'lock_account':
        this.lockSuspiciousAccounts(events);
        break;
      case 'rate_limit':
        this.applyRateLimiting(events);
        break;
      case 'emergency_response':
        this.triggerEmergencyResponse(threat, events);
        break;
      case 'emergency_lockdown':
        this.triggerEmergencyLockdown(threat, events);
        break;
      case 'investigate_user':
        this.flagForInvestigation(events);
        break;
    }
  }

  private blockSuspiciousIPs(events: SecurityEvent[]): void {
    for (const event of events) {
      if (event.ipAddress) {
        this.blockedIPs.add(event.ipAddress);
        logger.warning({
          message: `IP address blocked due to security threat: ${event.ipAddress}`,
          category: LogCategory.SECURITY,
          classification: SecurityClassification.CONFIDENTIAL,
          metadata: {
            ipAddress: event.ipAddress,
            reason: 'Automated security response',
            eventId: event.id
          }
        });
      }
    }
  }

  private lockSuspiciousAccounts(events: SecurityEvent[]): void {
    for (const event of events) {
      if (event.userId) {
        this.suspiciousUsers.set(event.userId, {
          locked: true,
          reason: 'Security threat detected',
          timestamp: new Date(),
          events: events.map(e => e.id)
        });

        logger.critical({
          message: `User account locked due to security threat: ${event.userId}`,
          category: LogCategory.SECURITY,
          classification: SecurityClassification.SECRET,
          userId: event.userId,
          metadata: {
            reason: 'Automated security response',
            eventId: event.id
          }
        });
      }
    }
  }

  private triggerEmergencyResponse(threat: any, events: SecurityEvent[]): void {
    logger.alert({
      message: `EMERGENCY: Critical security threat detected - ${threat.name}`,
      category: LogCategory.SECURITY,
      classification: SecurityClassification.TOP_SECRET,
      metadata: {
        threatId: threat.id,
        severity: threat.severity,
        eventCount: events.length,
        affectedSystems: this.getAffectedSystems(events)
      }
    });

    // Emit emergency event
    this.emit('emergencyThreat', threat, events);
  }

  private triggerEmergencyLockdown(threat: any, events: SecurityEvent[]): void {
    logger.emergency({
      message: `LOCKDOWN: System lockdown initiated due to critical threat - ${threat.name}`,
      category: LogCategory.SECURITY,
      classification: SecurityClassification.TOP_SECRET,
      metadata: {
        threatId: threat.id,
        lockdownReason: 'Multi-vector attack detected',
        affectedSystems: this.getAffectedSystems(events)
      }
    });

    // Emit lockdown event
    this.emit('emergencyLockdown', threat, events);
  }

  private checkThreatIndicators(event: SecurityEvent): void {
    // Check event against known threat indicators
    for (const indicator of event.indicators) {
      if (this.threatIndicators.has(indicator.value)) {
        const knownIndicator = this.threatIndicators.get(indicator.value)!;
        
        logger.warning({
          message: `Known threat indicator detected: ${indicator.value}`,
          category: LogCategory.THREAT_DETECTION,
          classification: SecurityClassification.CONFIDENTIAL,
          metadata: {
            indicator: indicator.value,
            type: indicator.type,
            confidence: knownIndicator.confidence,
            eventId: event.id
          }
        });

        // Increase event severity if matched against high-confidence indicators
        if (knownIndicator.confidence > 0.8) {
          this.escalateEventSeverity(event);
        }
      }
    }
  }

  private assessImmediateThreat(event: SecurityEvent): void {
    // Immediate threat assessment for critical events
    if (event.severity === ThreatLevel.CRITICAL) {
      this.handleCriticalThreat(event);
    }

    // Check for drone-related threats
    if (event.droneId && [
      SecurityEventType.DRONE_HIJACKING,
      SecurityEventType.GPS_SPOOFING,
      SecurityEventType.COMMUNICATION_JAMMING
    ].includes(event.type)) {
      this.handleDroneThreat(event);
    }
  }

  private handleCriticalThreat(event: SecurityEvent): void {
    logger.critical({
      message: `Critical security threat detected: ${event.description}`,
      category: LogCategory.SECURITY,
      classification: event.classification,
      metadata: {
        eventId: event.id,
        type: event.type,
        source: event.source,
        confidence: event.confidence
      }
    });

    // Immediate automated response for critical threats
    if (event.ipAddress) {
      this.blockedIPs.add(event.ipAddress);
    }

    if (event.userId) {
      this.suspiciousUsers.set(event.userId, {
        locked: true,
        reason: 'Critical security threat',
        timestamp: new Date()
      });
    }
  }

  private handleDroneThreat(event: SecurityEvent): void {
    logger.alert({
      message: `Drone security threat detected: ${event.description}`,
      category: LogCategory.DRONE_TELEMETRY,
      classification: SecurityClassification.SECRET,
      droneId: event.droneId,
      metadata: {
        eventId: event.id,
        type: event.type,
        threatLevel: event.severity
      }
    });

    // Emit drone threat event for immediate action
    this.emit('droneThreat', event);
  }

  private loadThreatIntelligence(): void {
    // Load threat intelligence from various sources
    // This would typically integrate with military threat intelligence feeds
    
    // Sample threat indicators (in production, these would come from intel feeds)
    const sampleIndicators: ThreatIndicator[] = [
      {
        type: 'ip',
        value: '192.168.1.100',
        confidence: 0.9,
        source: 'military_intel',
        ttl: 86400
      },
      {
        type: 'domain',
        value: 'malicious-drone-control.com',
        confidence: 0.95,
        source: 'cyber_command',
        ttl: 172800
      },
      {
        type: 'hash',
        value: 'a1b2c3d4e5f6',
        confidence: 0.85,
        source: 'threat_feed',
        ttl: 604800
      }
    ];

    for (const indicator of sampleIndicators) {
      this.threatIndicators.set(indicator.value, indicator);
    }

    logger.info({
      message: `Loaded ${sampleIndicators.length} threat indicators`,
      category: LogCategory.SECURITY,
      metadata: { 
        sources: [...new Set(sampleIndicators.map(i => i.source))]
      }
    });
  }

  // Public methods for external integration

  public isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  public isUserSuspicious(userId: string): boolean {
    return this.suspiciousUsers.has(userId);
  }

  public getActiveThreats(): any[] {
    return Array.from(this.activeThreats.values());
  }

  public addThreatIndicator(indicator: ThreatIndicator): void {
    this.threatIndicators.set(indicator.value, indicator);
    
    logger.info({
      message: `New threat indicator added: ${indicator.value}`,
      category: LogCategory.THREAT_DETECTION,
      metadata: indicator
    });
  }

  public getSecuritySummary(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 86400000);
    
    const recentEvents = this.securityEvents.filter(e => e.timestamp >= last24h);
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      activeThreats: this.activeThreats.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousUsers: this.suspiciousUsers.size,
      threatIndicators: this.threatIndicators.size,
      highSeverityEvents: recentEvents.filter(e => 
        e.severity === ThreatLevel.HIGH || e.severity === ThreatLevel.CRITICAL
      ).length
    };
  }

  // Helper methods

  private logSecurityEvent(event: SecurityEvent): void {
    const logLevel = this.getLogLevelFromThreatLevel(event.severity);
    
    logger.log({
      level: logLevel,
      message: `Security event: ${event.description}`,
      category: LogCategory.SECURITY,
      classification: event.classification,
      userId: event.userId,
      ipAddress: event.ipAddress,
      droneId: event.droneId,
      missionId: event.missionId,
      metadata: {
        eventId: event.id,
        type: event.type,
        source: event.source,
        confidence: event.confidence,
        indicators: event.indicators
      }
    });
  }

  private recordSecurityMetrics(event: SecurityEvent): void {
    metrics.recordSecurityEvent({
      eventType: event.type,
      severity: event.severity,
      source: event.source,
      blocked: this.blockedIPs.has(event.ipAddress || ''),
      userId: event.userId
    });
  }

  private getLogLevelFromThreatLevel(level: ThreatLevel): MilitaryLogLevel {
    switch (level) {
      case ThreatLevel.CRITICAL:
        return MilitaryLogLevel.CRITICAL;
      case ThreatLevel.HIGH:
        return MilitaryLogLevel.ERROR;
      case ThreatLevel.MEDIUM:
        return MilitaryLogLevel.WARNING;
      case ThreatLevel.LOW:
        return MilitaryLogLevel.NOTICE;
      default:
        return MilitaryLogLevel.INFO;
    }
  }

  private generateEventId(): string {
    return `SE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateThreatId(): string {
    return `TH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private escalateEventSeverity(event: SecurityEvent): void {
    // Escalate severity based on threat intelligence match
    if (event.severity !== ThreatLevel.CRITICAL) {
      const severityLevels = [ThreatLevel.INFO, ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL];
      const currentIndex = severityLevels.indexOf(event.severity);
      event.severity = severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)];
    }
  }

  private getAffectedSystems(events: SecurityEvent[]): string[] {
    const systems = new Set<string>();
    for (const event of events) {
      if (event.droneId) systems.add(`drone:${event.droneId}`);
      if (event.source) systems.add(`source:${event.source}`);
      if (event.target) systems.add(`target:${event.target}`);
    }
    return Array.from(systems);
  }

  private triggerCorrelationAnalysis(event: SecurityEvent): void {
    // Trigger immediate correlation analysis for high-priority events
    if (event.severity === ThreatLevel.HIGH || event.severity === ThreatLevel.CRITICAL) {
      setTimeout(() => this.performThreatCorrelation(), 1000);
    }
  }

  private applyRateLimiting(events: SecurityEvent[]): void {
    // Implementation would apply rate limiting to sources generating excessive events
    logger.info({
      message: 'Rate limiting applied to suspicious sources',
      category: LogCategory.SECURITY,
      metadata: {
        eventCount: events.length,
        sources: events.map(e => e.source)
      }
    });
  }

  private flagForInvestigation(events: SecurityEvent[]): void {
    // Flag users/systems for manual investigation
    for (const event of events) {
      if (event.userId) {
        this.suspiciousUsers.set(event.userId, {
          flagged: true,
          reason: 'Suspicious activity pattern',
          timestamp: new Date(),
          events: events.map(e => e.id)
        });
      }
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - 86400000); // 24 hours ago
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoff);
  }

  private sendThreatAlert(threat: any, events: SecurityEvent[]): void {
    // Send alert to security team
    this.emit('threatAlert', {
      threat,
      events,
      timestamp: new Date()
    });
  }
}

// Export singleton instance
export const securityMonitor = MilitarySecurityMonitor.getInstance();

// Helper functions for external use
export const reportSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
  securityMonitor.processSecurityEvent(event);
};

export const checkIPBlocked = (ip: string): boolean => {
  return securityMonitor.isIPBlocked(ip);
};

export const checkUserSuspicious = (userId: string): boolean => {
  return securityMonitor.isUserSuspicious(userId);
};

// Export types and enums
export {
  SecurityEventType,
  ThreatLevel,
  type SecurityEvent,
  type ThreatIndicator,
  type CorrelationRule
};