/**
 * Automated Alert Generation and Escalation System
 * Comprehensive alerting and escalation framework for anomaly detection
 */

import { 
  AnomalyResult,
  AlertSeverity,
  AlertRule,
  SecurityClassification
} from './advanced-anomaly-detection';

import { 
  ThreatDetectionResult
} from './real-time-threat-detection';

import { 
  InsiderThreatIndicator,
  CompromiseIndicator
} from './insider-threat-detection';

import { 
  FailurePrediction
} from './predictive-failure-analysis';

import { logger, LogCategory } from './monitoring/logger';
import { metrics } from './monitoring/metrics';

// Alert system interfaces
export interface Alert {
  id: string;
  timestamp: Date;
  type: 'anomaly' | 'threat' | 'insider_threat' | 'failure_prediction' | 'system_health';
  severity: AlertSeverity;
  title: string;
  description: string;
  source: {
    system: string;
    component: string;
    identifier: string;
  };
  classification: SecurityClassification;
  metadata: Record<string, any>;
  correlatedAlerts: string[];
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated' | 'suppressed';
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  suppressUntil?: Date;
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    severityThreshold: AlertSeverity;
    unacknowledgedTime: number; // minutes
    alertTypes: string[];
    repeatOccurrences: number;
    timeWindow: number; // minutes
  };
  escalationPath: EscalationLevel[];
  isActive: boolean;
  cooldownPeriod: number; // minutes
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  recipients: NotificationRecipient[];
  actions: EscalationAction[];
  requiresAcknowledgment: boolean;
  autoResolve: boolean;
  autoResolveDelay?: number; // minutes
}

export interface NotificationRecipient {
  id: string;
  name: string;
  type: 'user' | 'group' | 'external_system';
  contactMethods: ContactMethod[];
  availability: {
    timezone: string;
    workingHours: { start: string; end: string };
    workingDays: number[]; // 0-6, Sunday-Saturday
    onCall: boolean;
  };
  escalationDelay?: number; // minutes before escalating to next level
}

export interface ContactMethod {
  type: 'email' | 'sms' | 'phone' | 'webhook' | 'slack' | 'teams' | 'pager';
  address: string;
  priority: number;
  isActive: boolean;
  retryAttempts: number;
  retryInterval: number; // minutes
}

export interface EscalationAction {
  type: 'notification' | 'automation' | 'ticket_creation' | 'containment' | 'recovery';
  parameters: Record<string, any>;
  condition?: string; // Optional condition to execute action
  delay?: number; // minutes
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'dashboard';
  subject: string;
  body: string;
  format: 'text' | 'html' | 'json';
  variables: string[]; // Available template variables
}

export interface AlertCorrelation {
  id: string;
  timeWindow: number; // minutes
  rules: CorrelationRule[];
  isActive: boolean;
}

export interface CorrelationRule {
  name: string;
  pattern: {
    alertTypes: string[];
    severities: AlertSeverity[];
    sources: string[];
    maxTimeDiff: number; // minutes
    minOccurrences: number;
  };
  action: 'suppress_duplicates' | 'create_incident' | 'escalate_severity' | 'merge_alerts';
  parameters: Record<string, any>;
}

// Notification delivery system
class NotificationDeliverySystem {
  private pendingNotifications: Map<string, any> = new Map();
  private deliveryHistory: any[] = [];
  private retryQueue: any[] = [];

  async sendNotification(
    recipient: NotificationRecipient,
    alert: Alert,
    template: NotificationTemplate,
    escalationLevel: number
  ): Promise<boolean> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Select best contact method based on availability and priority
      const contactMethod = this.selectBestContactMethod(recipient, alert.severity);
      if (!contactMethod) {
        logger.warning({
          message: `No available contact method for recipient: ${recipient.name}`,
          category: LogCategory.ANOMALY,
          metadata: { recipientId: recipient.id, alertId: alert.id }
        });
        return false;
      }

      // Render notification content
      const content = this.renderNotificationContent(alert, template, recipient, escalationLevel);
      
      // Attempt delivery
      const success = await this.deliverNotification(contactMethod, content, notificationId);
      
      // Log delivery attempt
      const deliveryRecord = {
        id: notificationId,
        alertId: alert.id,
        recipientId: recipient.id,
        method: contactMethod.type,
        success,
        timestamp: new Date(),
        escalationLevel,
        retryCount: 0
      };
      
      this.deliveryHistory.push(deliveryRecord);
      
      if (!success && contactMethod.retryAttempts > 0) {
        this.scheduleRetry(deliveryRecord, contactMethod, content);
      }

      return success;

    } catch (error) {
      logger.error({
        message: 'Error sending notification',
        category: LogCategory.ANOMALY,
        error,
        metadata: { recipientId: recipient.id, alertId: alert.id }
      });
      return false;
    }
  }

  private selectBestContactMethod(recipient: NotificationRecipient, severity: AlertSeverity): ContactMethod | null {
    const availableMethods = recipient.contactMethods
      .filter(method => method.isActive)
      .sort((a, b) => {
        // For critical alerts, prioritize immediate methods
        if (severity === 'critical' || severity === 'emergency') {
          const immediateTypes = ['phone', 'sms', 'pager'];
          const aImmediate = immediateTypes.includes(a.type);
          const bImmediate = immediateTypes.includes(b.type);
          if (aImmediate && !bImmediate) return -1;
          if (!aImmediate && bImmediate) return 1;
        }
        return a.priority - b.priority;
      });

    // Check availability based on working hours
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    if (recipient.availability.onCall || severity === 'emergency') {
      return availableMethods[0] || null;
    }

    // Check if within working hours
    const workStart = parseInt(recipient.availability.workingHours.start.split(':')[0]);
    const workEnd = parseInt(recipient.availability.workingHours.end.split(':')[0]);
    const isWorkingDay = recipient.availability.workingDays.includes(currentDay);
    const isWorkingHour = currentHour >= workStart && currentHour <= workEnd;

    if (isWorkingDay && isWorkingHour) {
      return availableMethods[0] || null;
    }

    // Outside working hours - use less intrusive methods or escalate
    const nonIntrusiveMethods = availableMethods.filter(m => 
      ['email', 'webhook', 'slack', 'teams'].includes(m.type)
    );

    return nonIntrusiveMethods[0] || availableMethods[0] || null;
  }

  private renderNotificationContent(
    alert: Alert,
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    escalationLevel: number
  ): any {
    const variables = {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      timestamp: alert.timestamp.toISOString(),
      source: alert.source,
      recipientName: recipient.name,
      escalationLevel,
      classification: alert.classification,
      status: alert.status
    };

    let subject = template.subject;
    let body = template.body;

    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return {
      subject,
      body,
      format: template.format,
      metadata: {
        alertId: alert.id,
        templateId: template.id,
        recipientId: recipient.id
      }
    };
  }

  private async deliverNotification(
    method: ContactMethod,
    content: any,
    notificationId: string
  ): Promise<boolean> {
    try {
      switch (method.type) {
        case 'email':
          return await this.sendEmail(method.address, content);
        case 'sms':
          return await this.sendSMS(method.address, content);
        case 'webhook':
          return await this.sendWebhook(method.address, content);
        case 'slack':
          return await this.sendSlack(method.address, content);
        case 'teams':
          return await this.sendTeams(method.address, content);
        case 'phone':
          return await this.makePhoneCall(method.address, content);
        case 'pager':
          return await this.sendPage(method.address, content);
        default:
          logger.warning({
            message: `Unsupported notification method: ${method.type}`,
            category: LogCategory.ANOMALY,
            metadata: { method: method.type, notificationId }
          });
          return false;
      }
    } catch (error) {
      logger.error({
        message: `Failed to deliver notification via ${method.type}`,
        category: LogCategory.ANOMALY,
        error,
        metadata: { method: method.type, notificationId }
      });
      return false;
    }
  }

  private async sendEmail(address: string, content: any): Promise<boolean> {
    // Implementation would use email service (SendGrid, AWS SES, etc.)
    logger.info({
      message: `Email notification sent to: ${address}`,
      category: LogCategory.ANOMALY,
      metadata: { address, subject: content.subject }
    });
    return true;
  }

  private async sendSMS(phone: string, content: any): Promise<boolean> {
    // Implementation would use SMS service (Twilio, AWS SNS, etc.)
    logger.info({
      message: `SMS notification sent to: ${phone}`,
      category: LogCategory.ANOMALY,
      metadata: { phone }
    });
    return true;
  }

  private async sendWebhook(url: string, content: any): Promise<boolean> {
    // Implementation would make HTTP POST to webhook URL
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async sendSlack(channel: string, content: any): Promise<boolean> {
    // Implementation would use Slack API
    logger.info({
      message: `Slack notification sent to: ${channel}`,
      category: LogCategory.ANOMALY,
      metadata: { channel }
    });
    return true;
  }

  private async sendTeams(webhook: string, content: any): Promise<boolean> {
    // Implementation would use Teams webhook
    logger.info({
      message: `Teams notification sent`,
      category: LogCategory.ANOMALY,
      metadata: { webhook }
    });
    return true;
  }

  private async makePhoneCall(phone: string, content: any): Promise<boolean> {
    // Implementation would use voice service (Twilio Voice, etc.)
    logger.info({
      message: `Phone call initiated to: ${phone}`,
      category: LogCategory.ANOMALY,
      metadata: { phone }
    });
    return true;
  }

  private async sendPage(pagerNumber: string, content: any): Promise<boolean> {
    // Implementation would use paging service
    logger.info({
      message: `Page sent to: ${pagerNumber}`,
      category: LogCategory.ANOMALY,
      metadata: { pagerNumber }
    });
    return true;
  }

  private scheduleRetry(
    deliveryRecord: any,
    method: ContactMethod,
    content: any
  ): void {
    if (deliveryRecord.retryCount < method.retryAttempts) {
      const retryDelay = method.retryInterval * 60 * 1000; // Convert to milliseconds
      
      setTimeout(() => {
        deliveryRecord.retryCount++;
        this.deliverNotification(method, content, deliveryRecord.id)
          .then(success => {
            if (success) {
              logger.info({
                message: `Notification retry successful`,
                category: LogCategory.ANOMALY,
                metadata: { 
                  notificationId: deliveryRecord.id, 
                  retryCount: deliveryRecord.retryCount 
                }
              });
            } else if (deliveryRecord.retryCount < method.retryAttempts) {
              this.scheduleRetry(deliveryRecord, method, content);
            }
          });
      }, retryDelay);
    }
  }
}

// Alert correlation engine
class AlertCorrelationEngine {
  private correlationRules: Map<string, AlertCorrelation> = new Map();
  private recentAlerts: Alert[] = [];
  private correlatedIncidents: Map<string, Alert[]> = new Map();

  addCorrelationRule(correlation: AlertCorrelation): void {
    this.correlationRules.set(correlation.id, correlation);
  }

  analyzeAlert(alert: Alert): { correlatedAlerts: Alert[]; action: string | null } {
    this.recentAlerts.push(alert);
    
    // Keep only recent alerts within correlation window
    const maxAge = Math.max(...Array.from(this.correlationRules.values())
      .map(rule => rule.timeWindow)) * 60 * 1000;
    
    const cutoff = Date.now() - maxAge;
    this.recentAlerts = this.recentAlerts.filter(a => a.timestamp.getTime() > cutoff);

    // Check each correlation rule
    for (const correlation of this.correlationRules.values()) {
      if (!correlation.isActive) continue;

      for (const rule of correlation.rules) {
        const correlatedAlerts = this.findCorrelatedAlerts(alert, rule, correlation.timeWindow);
        
        if (correlatedAlerts.length >= rule.pattern.minOccurrences) {
          return { correlatedAlerts, action: rule.action };
        }
      }
    }

    return { correlatedAlerts: [], action: null };
  }

  private findCorrelatedAlerts(alert: Alert, rule: CorrelationRule, timeWindow: number): Alert[] {
    const windowStart = alert.timestamp.getTime() - (timeWindow * 60 * 1000);
    
    return this.recentAlerts.filter(a => {
      // Check time window
      if (a.timestamp.getTime() < windowStart) return false;
      
      // Check alert type
      if (rule.pattern.alertTypes.length > 0 && 
          !rule.pattern.alertTypes.includes(a.type)) return false;
      
      // Check severity
      if (rule.pattern.severities.length > 0 && 
          !rule.pattern.severities.includes(a.severity)) return false;
      
      // Check source
      if (rule.pattern.sources.length > 0 && 
          !rule.pattern.sources.some(source => 
            a.source.system.includes(source) || 
            a.source.component.includes(source))) return false;
      
      return true;
    });
  }
}

// Main Alert and Escalation Engine
export class AutomatedAlertEscalationEngine {
  private static instance: AutomatedAlertEscalationEngine;
  
  private activeAlerts: Map<string, Alert> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private recipients: Map<string, NotificationRecipient> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private notificationSystem = new NotificationDeliverySystem();
  private correlationEngine = new AlertCorrelationEngine();
  
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultTemplates();
  }

  public static getInstance(): AutomatedAlertEscalationEngine {
    if (!AutomatedAlertEscalationEngine.instance) {
      AutomatedAlertEscalationEngine.instance = new AutomatedAlertEscalationEngine();
    }
    return AutomatedAlertEscalationEngine.instance;
  }

  // ==================== Public API Methods ====================

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Process alerts and escalations every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processAlertEscalations();
    }, 30000);

    logger.info({
      message: 'Automated Alert Escalation Engine started',
      category: LogCategory.ANOMALY,
      metadata: { 
        rulesLoaded: this.escalationRules.size,
        templatesLoaded: this.templates.size,
        recipientsConfigured: this.recipients.size
      }
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Clear escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    logger.info({
      message: 'Automated Alert Escalation Engine stopped',
      category: LogCategory.ANOMALY
    });
  }

  /**
   * Create alert from anomaly detection result
   */
  public async createAlertFromAnomaly(anomaly: AnomalyResult): Promise<Alert> {
    const alert: Alert = {
      id: `alert_anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'anomaly',
      severity: anomaly.severity,
      title: `Anomaly Detected: ${anomaly.type}`,
      description: anomaly.description,
      source: {
        system: 'anomaly_detection',
        component: anomaly.modelUsed,
        identifier: anomaly.id
      },
      classification: anomaly.classification,
      metadata: {
        anomaly,
        confidence: anomaly.confidence,
        threatScore: anomaly.threatScore,
        affectedSystems: anomaly.affectedSystems,
        features: anomaly.features
      },
      correlatedAlerts: [],
      status: 'active',
      escalationLevel: 0
    };

    await this.processNewAlert(alert);
    return alert;
  }

  /**
   * Create alert from threat detection result
   */
  public async createAlertFromThreat(threat: ThreatDetectionResult): Promise<Alert> {
    const alert: Alert = {
      id: `alert_threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'threat',
      severity: this.mapThreatSeverityToAlert(threat.severity),
      title: `Threat Detected: ${threat.threatType}`,
      description: `${threat.threatType} threat detected with ${threat.confidence} confidence`,
      source: {
        system: 'threat_detection',
        component: 'real_time_detector',
        identifier: threat.id
      },
      classification: threat.classification,
      metadata: {
        threat,
        threatType: threat.threatType,
        confidence: threat.confidence,
        affectedSystems: threat.affectedSystems,
        characteristics: threat.characteristics
      },
      correlatedAlerts: [],
      status: 'active',
      escalationLevel: 0
    };

    await this.processNewAlert(alert);
    return alert;
  }

  /**
   * Create alert from insider threat indicator
   */
  public async createAlertFromInsiderThreat(indicator: InsiderThreatIndicator): Promise<Alert> {
    const severity: AlertSeverity = indicator.riskScore > 0.8 ? 'critical' :
                                   indicator.riskScore > 0.6 ? 'high' :
                                   indicator.riskScore > 0.4 ? 'warning' : 'info';

    const alert: Alert = {
      id: `alert_insider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'insider_threat',
      severity,
      title: `Insider Threat Indicator: ${indicator.behaviorCategory}`,
      description: `User ${indicator.userId} showing anomalous behavior (risk score: ${indicator.riskScore.toFixed(2)})`,
      source: {
        system: 'insider_threat_detection',
        component: 'behavior_analysis',
        identifier: indicator.id
      },
      classification: indicator.riskScore > 0.7 ? 'CONFIDENTIAL' : 'UNCLASSIFIED',
      metadata: {
        indicator,
        userId: indicator.userId,
        riskScore: indicator.riskScore,
        behaviorCategory: indicator.behaviorCategory,
        deviationMetrics: indicator.deviationMetrics
      },
      correlatedAlerts: [],
      status: 'active',
      escalationLevel: 0
    };

    await this.processNewAlert(alert);
    return alert;
  }

  /**
   * Create alert from failure prediction
   */
  public async createAlertFromFailurePrediction(prediction: FailurePrediction): Promise<Alert> {
    const severity: AlertSeverity = prediction.remainingUsefulLife < 24 ? 'critical' :
                                   prediction.remainingUsefulLife < 72 ? 'high' :
                                   prediction.remainingUsefulLife < 168 ? 'warning' : 'info';

    const alert: Alert = {
      id: `alert_failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'failure_prediction',
      severity,
      title: `Component Failure Predicted: ${prediction.componentType}`,
      description: `${prediction.componentType} failure predicted in ${prediction.remainingUsefulLife.toFixed(1)} hours`,
      source: {
        system: 'predictive_analysis',
        component: 'failure_predictor',
        identifier: prediction.id
      },
      classification: 'CONFIDENTIAL',
      metadata: {
        prediction,
        droneId: prediction.droneId,
        componentId: prediction.componentId,
        remainingUsefulLife: prediction.remainingUsefulLife,
        healthScore: prediction.currentHealthScore
      },
      correlatedAlerts: [],
      status: 'active',
      escalationLevel: 0
    };

    await this.processNewAlert(alert);
    return alert;
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string, userId: string, notes?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    
    if (notes) {
      alert.metadata.acknowledgmentNotes = notes;
    }

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    logger.info({
      message: `Alert acknowledged: ${alertId}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId, userId, escalationLevel: alert.escalationLevel }
    });

    metrics.recordAlertAcknowledgment(alert.type, alert.severity);
    return true;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string, userId: string, resolution: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    alert.metadata.resolution = resolution;

    // Cancel escalation timer and remove from active alerts
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    this.activeAlerts.delete(alertId);

    logger.info({
      message: `Alert resolved: ${alertId}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId, userId, resolution }
    });

    metrics.recordAlertResolution(alert.type, alert.severity);
    return true;
  }

  /**
   * Suppress alert for specified duration
   */
  public suppressAlert(alertId: string, userId: string, durationMinutes: number, reason: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'suppressed';
    alert.suppressUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    alert.metadata.suppressionReason = reason;
    alert.metadata.suppressedBy = userId;

    // Cancel current escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    logger.info({
      message: `Alert suppressed: ${alertId}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId, userId, durationMinutes, reason }
    });

    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = ['emergency', 'critical', 'high', 'warning', 'info'];
        const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  // ==================== Configuration Management ====================

  public addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.set(rule.id, rule);
    logger.info({
      message: `Escalation rule added: ${rule.name}`,
      category: LogCategory.ANOMALY,
      metadata: { ruleId: rule.id }
    });
  }

  public addNotificationRecipient(recipient: NotificationRecipient): void {
    this.recipients.set(recipient.id, recipient);
    logger.info({
      message: `Notification recipient added: ${recipient.name}`,
      category: LogCategory.ANOMALY,
      metadata: { recipientId: recipient.id }
    });
  }

  public addNotificationTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info({
      message: `Notification template added: ${template.name}`,
      category: LogCategory.ANOMALY,
      metadata: { templateId: template.id }
    });
  }

  // ==================== Private Helper Methods ====================

  private async processNewAlert(alert: Alert): Promise<void> {
    try {
      // Store alert
      this.activeAlerts.set(alert.id, alert);

      // Analyze for correlations
      const correlation = this.correlationEngine.analyzeAlert(alert);
      alert.correlatedAlerts = correlation.correlatedAlerts.map(a => a.id);

      // Apply correlation actions
      if (correlation.action) {
        await this.applyCorrelationAction(alert, correlation.action, correlation.correlatedAlerts);
      }

      // Start escalation process
      await this.startEscalation(alert);

      // Record metrics
      metrics.recordAlertCreation(alert.type, alert.severity);

      logger.info({
        message: `Alert created: ${alert.title}`,
        category: LogCategory.ANOMALY,
        classification: alert.classification,
        metadata: {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          source: alert.source
        }
      });

    } catch (error) {
      logger.error({
        message: 'Error processing new alert',
        category: LogCategory.ANOMALY,
        error,
        metadata: { alertId: alert.id }
      });
    }
  }

  private async startEscalation(alert: Alert): Promise<void> {
    // Find applicable escalation rules
    const applicableRules = Array.from(this.escalationRules.values())
      .filter(rule => this.isRuleApplicable(rule, alert));

    if (applicableRules.length === 0) {
      logger.warning({
        message: `No escalation rule found for alert: ${alert.id}`,
        category: LogCategory.ANOMALY,
        metadata: { alertId: alert.id, type: alert.type, severity: alert.severity }
      });
      return;
    }

    // Use the most specific rule (first match)
    const rule = applicableRules[0];
    
    // Start with first escalation level
    if (rule.escalationPath.length > 0) {
      await this.scheduleEscalationLevel(alert, rule, 0);
    }
  }

  private async scheduleEscalationLevel(alert: Alert, rule: EscalationRule, levelIndex: number): Promise<void> {
    if (levelIndex >= rule.escalationPath.length) return;

    const level = rule.escalationPath[levelIndex];
    const delay = level.delayMinutes * 60 * 1000; // Convert to milliseconds

    const timer = setTimeout(async () => {
      // Check if alert is still active
      const currentAlert = this.activeAlerts.get(alert.id);
      if (!currentAlert || currentAlert.status !== 'active') {
        this.escalationTimers.delete(alert.id);
        return;
      }

      // Execute escalation level
      await this.executeEscalationLevel(currentAlert, rule, level, levelIndex);

      // Schedule next level if exists and alert still unacknowledged
      if (levelIndex + 1 < rule.escalationPath.length && 
          currentAlert.status === 'active') {
        await this.scheduleEscalationLevel(currentAlert, rule, levelIndex + 1);
      }
    }, delay);

    this.escalationTimers.set(alert.id, timer);
  }

  private async executeEscalationLevel(
    alert: Alert, 
    rule: EscalationRule, 
    level: EscalationLevel, 
    levelIndex: number
  ): Promise<void> {
    try {
      alert.escalationLevel = level.level;

      logger.warning({
        message: `Escalating alert to level ${level.level}: ${alert.title}`,
        category: LogCategory.ANOMALY,
        classification: alert.classification,
        metadata: {
          alertId: alert.id,
          escalationLevel: level.level,
          ruleId: rule.id
        }
      });

      // Send notifications to recipients
      for (const recipient of level.recipients) {
        const recipientConfig = this.recipients.get(recipient.id);
        if (recipientConfig) {
          const template = this.selectNotificationTemplate(alert, recipientConfig);
          if (template) {
            await this.notificationSystem.sendNotification(
              recipientConfig,
              alert,
              template,
              level.level
            );
          }
        }
      }

      // Execute escalation actions
      for (const action of level.actions) {
        await this.executeEscalationAction(alert, action);
      }

      // Auto-resolve if configured
      if (level.autoResolve && level.autoResolveDelay) {
        setTimeout(() => {
          if (this.activeAlerts.has(alert.id)) {
            this.resolveAlert(alert.id, 'system', 'Auto-resolved by escalation rule');
          }
        }, level.autoResolveDelay * 60 * 1000);
      }

      metrics.recordAlertEscalation(alert.type, alert.severity, level.level);

    } catch (error) {
      logger.error({
        message: 'Error executing escalation level',
        category: LogCategory.ANOMALY,
        error,
        metadata: { alertId: alert.id, escalationLevel: level.level }
      });
    }
  }

  private isRuleApplicable(rule: EscalationRule, alert: Alert): boolean {
    if (!rule.isActive) return false;

    // Check severity threshold
    const severityOrder = ['info', 'warning', 'high', 'critical', 'emergency'];
    const alertSeverityIndex = severityOrder.indexOf(alert.severity);
    const thresholdIndex = severityOrder.indexOf(rule.conditions.severityThreshold);
    
    if (alertSeverityIndex < thresholdIndex) return false;

    // Check alert types
    if (rule.conditions.alertTypes.length > 0 && 
        !rule.conditions.alertTypes.includes(alert.type)) return false;

    return true;
  }

  private selectNotificationTemplate(alert: Alert, recipient: NotificationRecipient): NotificationTemplate | null {
    // Select template based on alert type and recipient preferences
    const templateId = `${alert.type}_${alert.severity}`;
    return this.templates.get(templateId) || this.templates.get('default') || null;
  }

  private async executeEscalationAction(alert: Alert, action: EscalationAction): Promise<void> {
    try {
      switch (action.type) {
        case 'notification':
          // Additional notification handling if needed
          break;
        case 'automation':
          await this.executeAutomationAction(alert, action.parameters);
          break;
        case 'ticket_creation':
          await this.createTicket(alert, action.parameters);
          break;
        case 'containment':
          await this.executeContainmentAction(alert, action.parameters);
          break;
        case 'recovery':
          await this.executeRecoveryAction(alert, action.parameters);
          break;
      }
    } catch (error) {
      logger.error({
        message: `Error executing escalation action: ${action.type}`,
        category: LogCategory.ANOMALY,
        error,
        metadata: { alertId: alert.id, actionType: action.type }
      });
    }
  }

  private async applyCorrelationAction(
    alert: Alert, 
    action: string, 
    correlatedAlerts: Alert[]
  ): Promise<void> {
    switch (action) {
      case 'suppress_duplicates':
        // Suppress duplicate alerts
        for (const correlatedAlert of correlatedAlerts) {
          if (correlatedAlert.id !== alert.id) {
            correlatedAlert.status = 'suppressed';
            correlatedAlert.metadata.suppressionReason = 'Duplicate of ' + alert.id;
          }
        }
        break;
      case 'escalate_severity':
        // Escalate severity based on correlation
        if (correlatedAlerts.length > 3) {
          alert.severity = 'critical';
        } else if (correlatedAlerts.length > 1) {
          alert.severity = 'high';
        }
        break;
      case 'create_incident':
        // Create incident for correlated alerts
        await this.createIncident(alert, correlatedAlerts);
        break;
    }
  }

  private processAlertEscalations(): void {
    // Check for suppressed alerts that should be reactivated
    for (const alert of this.activeAlerts.values()) {
      if (alert.status === 'suppressed' && alert.suppressUntil && 
          new Date() > alert.suppressUntil) {
        alert.status = 'active';
        delete alert.suppressUntil;
        delete alert.metadata.suppressionReason;
        
        logger.info({
          message: `Alert reactivated after suppression: ${alert.id}`,
          category: LogCategory.ANOMALY,
          metadata: { alertId: alert.id }
        });
      }
    }
  }

  private initializeDefaultRules(): void {
    // Critical alert escalation rule
    const criticalRule: EscalationRule = {
      id: 'critical_immediate_escalation',
      name: 'Critical Alert Immediate Escalation',
      description: 'Immediate escalation for critical and emergency alerts',
      conditions: {
        severityThreshold: 'critical',
        unacknowledgedTime: 0,
        alertTypes: [],
        repeatOccurrences: 1,
        timeWindow: 5
      },
      escalationPath: [
        {
          level: 1,
          delayMinutes: 0,
          recipients: [],
          actions: [
            { type: 'notification', parameters: { immediate: true } }
          ],
          requiresAcknowledgment: true,
          autoResolve: false
        },
        {
          level: 2,
          delayMinutes: 15,
          recipients: [],
          actions: [
            { type: 'ticket_creation', parameters: { priority: 'critical' } }
          ],
          requiresAcknowledgment: true,
          autoResolve: false
        }
      ],
      isActive: true,
      cooldownPeriod: 30
    };

    this.escalationRules.set(criticalRule.id, criticalRule);
  }

  private initializeDefaultTemplates(): void {
    // Default email template
    const defaultTemplate: NotificationTemplate = {
      id: 'default',
      name: 'Default Alert Template',
      type: 'email',
      subject: '[{{severity}}] {{title}}',
      body: `Alert Details:
ID: {{alertId}}
Severity: {{severity}}
Classification: {{classification}}
Timestamp: {{timestamp}}
Source: {{source.system}}/{{source.component}}

Description:
{{description}}

Status: {{status}}
Escalation Level: {{escalationLevel}}

Please acknowledge this alert in the system dashboard.`,
      format: 'text',
      variables: ['alertId', 'severity', 'title', 'description', 'timestamp', 'source', 'classification', 'status', 'escalationLevel']
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
  }

  private mapThreatSeverityToAlert(threatSeverity: string): AlertSeverity {
    const mapping: Record<string, AlertSeverity> = {
      'low': 'info',
      'medium': 'warning',
      'high': 'high',
      'critical': 'critical'
    };
    return mapping[threatSeverity] || 'warning';
  }

  // Placeholder implementations for complex actions
  private async executeAutomationAction(alert: Alert, parameters: any): Promise<void> {
    logger.info({
      message: `Executing automation action for alert: ${alert.id}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId: alert.id, parameters }
    });
  }

  private async createTicket(alert: Alert, parameters: any): Promise<void> {
    logger.info({
      message: `Creating ticket for alert: ${alert.id}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId: alert.id, parameters }
    });
  }

  private async executeContainmentAction(alert: Alert, parameters: any): Promise<void> {
    logger.info({
      message: `Executing containment action for alert: ${alert.id}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId: alert.id, parameters }
    });
  }

  private async executeRecoveryAction(alert: Alert, parameters: any): Promise<void> {
    logger.info({
      message: `Executing recovery action for alert: ${alert.id}`,
      category: LogCategory.ANOMALY,
      metadata: { alertId: alert.id, parameters }
    });
  }

  private async createIncident(alert: Alert, correlatedAlerts: Alert[]): Promise<void> {
    logger.info({
      message: `Creating incident for correlated alerts`,
      category: LogCategory.ANOMALY,
      metadata: { 
        primaryAlert: alert.id, 
        correlatedCount: correlatedAlerts.length 
      }
    });
  }

  // ==================== Public Status Methods ====================

  public getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      activeAlerts: this.activeAlerts.size,
      escalationRules: this.escalationRules.size,
      recipients: this.recipients.size,
      templates: this.templates.size,
      activeEscalations: this.escalationTimers.size
    };
  }
}

// Export singleton instance
export const alertEscalationEngine = AutomatedAlertEscalationEngine.getInstance();