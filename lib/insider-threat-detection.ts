/**
 * Insider Threat and Compromise Detection System
 * Advanced behavioral analysis and anomaly detection for insider threats
 */

import { 
  InsiderThreatIndicator,
  AnomalyResult,
  AlertSeverity,
  SecurityClassification,
  User
} from './advanced-anomaly-detection';

import { logger, LogCategory } from './monitoring/logger';
import { metrics } from './monitoring/metrics';

// User behavior tracking interfaces
export interface UserActivity {
  userId: string;
  timestamp: Date;
  activityType: 'login' | 'logout' | 'file_access' | 'command_execution' | 'data_transfer' | 'system_access';
  resource: string;
  sourceIP: string;
  userAgent?: string;
  sessionId: string;
  success: boolean;
  metadata: Record<string, any>;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  sourceIP: string;
  location?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  activities: UserActivity[];
  riskScore: number;
  anomalies: string[];
}

export interface AccessPattern {
  userId: string;
  timeOfDay: number[]; // Hour histogram (0-23)
  dayOfWeek: number[]; // Day histogram (0-6)
  resourceTypes: Map<string, number>;
  ipAddresses: Set<string>;
  userAgents: Set<string>;
  averageSessionDuration: number;
  commandFrequency: Map<string, number>;
  dataVolumePattern: number[];
}

export interface BehaviorBaseline {
  userId: string;
  period: { start: Date; end: Date };
  loginFrequency: {
    daily: number;
    hourly: number[];
    weekdays: number[];
  };
  accessPatterns: {
    resourceTypes: Record<string, number>;
    commands: Record<string, number>;
    dataVolume: { mean: number; stdDev: number };
  };
  networkBehavior: {
    ipAddresses: string[];
    locations: string[];
    deviceFingerprints: string[];
  };
  performanceMetrics: {
    avgSessionDuration: number;
    actionsPerSession: number;
    errorRate: number;
  };
  lastUpdated: Date;
}

export interface CompromiseIndicator {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'credential_compromise' | 'account_takeover' | 'privilege_escalation' | 'lateral_movement' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: {
    anomalousActivities: string[];
    riskFactors: string[];
    correlatedEvents: string[];
  };
  impact: {
    affectedSystems: string[];
    dataAtRisk: string[];
    privilegesCompromised: string[];
  };
  recommendedActions: string[];
}

// Machine Learning models for behavior analysis
class UserBehaviorModel {
  private userId: string;
  private baseline: BehaviorBaseline | null = null;
  private activityHistory: UserActivity[] = [];
  private sessionHistory: UserSession[] = [];
  private anomalyThresholds: Map<string, number> = new Map();

  constructor(userId: string) {
    this.userId = userId;
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    this.anomalyThresholds.set('time_deviation', 2.0);
    this.anomalyThresholds.set('location_deviation', 3.0);
    this.anomalyThresholds.set('volume_deviation', 2.5);
    this.anomalyThresholds.set('frequency_deviation', 2.0);
    this.anomalyThresholds.set('command_deviation', 3.0);
  }

  public updateBaseline(activities: UserActivity[]): void {
    if (activities.length < 100) return; // Need sufficient data

    const sessions = this.groupActivitiesIntoSessions(activities);
    
    this.baseline = {
      userId: this.userId,
      period: {
        start: new Date(Math.min(...activities.map(a => a.timestamp.getTime()))),
        end: new Date(Math.max(...activities.map(a => a.timestamp.getTime())))
      },
      loginFrequency: this.calculateLoginFrequency(activities),
      accessPatterns: this.calculateAccessPatterns(activities),
      networkBehavior: this.calculateNetworkBehavior(activities),
      performanceMetrics: this.calculatePerformanceMetrics(sessions),
      lastUpdated: new Date()
    };
  }

  public analyzeActivity(activity: UserActivity): { riskScore: number; anomalies: string[] } {
    if (!this.baseline) {
      return { riskScore: 0, anomalies: [] };
    }

    const anomalies: string[] = [];
    let riskScore = 0;

    // Time-based anomaly detection
    const timeAnomaly = this.detectTimeAnomaly(activity);
    if (timeAnomaly.score > this.anomalyThresholds.get('time_deviation')!) {
      anomalies.push(timeAnomaly.description);
      riskScore += timeAnomaly.score * 0.2;
    }

    // Location-based anomaly detection
    const locationAnomaly = this.detectLocationAnomaly(activity);
    if (locationAnomaly.score > this.anomalyThresholds.get('location_deviation')!) {
      anomalies.push(locationAnomaly.description);
      riskScore += locationAnomaly.score * 0.25;
    }

    // Access pattern anomaly detection
    const accessAnomaly = this.detectAccessAnomaly(activity);
    if (accessAnomaly.score > this.anomalyThresholds.get('frequency_deviation')!) {
      anomalies.push(accessAnomaly.description);
      riskScore += accessAnomaly.score * 0.3;
    }

    // Command pattern anomaly detection
    if (activity.activityType === 'command_execution') {
      const commandAnomaly = this.detectCommandAnomaly(activity);
      if (commandAnomaly.score > this.anomalyThresholds.get('command_deviation')!) {
        anomalies.push(commandAnomaly.description);
        riskScore += commandAnomaly.score * 0.25;
      }
    }

    return { riskScore: Math.min(1.0, riskScore), anomalies };
  }

  private detectTimeAnomaly(activity: UserActivity): { score: number; description: string } {
    if (!this.baseline) return { score: 0, description: '' };

    const hour = activity.timestamp.getHours();
    const dayOfWeek = activity.timestamp.getDay();

    const normalHourFreq = this.baseline.loginFrequency.hourly[hour] || 0;
    const normalDayFreq = this.baseline.loginFrequency.weekdays[dayOfWeek] || 0;

    // Calculate z-scores for time patterns
    const avgHourFreq = this.baseline.loginFrequency.hourly.reduce((sum, freq) => sum + freq, 0) / 24;
    const avgDayFreq = this.baseline.loginFrequency.weekdays.reduce((sum, freq) => sum + freq, 0) / 7;

    const hourZScore = normalHourFreq > 0 ? Math.abs((normalHourFreq - avgHourFreq) / avgHourFreq) : 2;
    const dayZScore = normalDayFreq > 0 ? Math.abs((normalDayFreq - avgDayFreq) / avgDayFreq) : 2;

    const maxScore = Math.max(hourZScore, dayZScore);
    
    if (maxScore > 2) {
      return {
        score: maxScore,
        description: `Unusual activity time: ${hour}:00 on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}`
      };
    }

    return { score: 0, description: '' };
  }

  private detectLocationAnomaly(activity: UserActivity): { score: number; description: string } {
    if (!this.baseline) return { score: 0, description: '' };

    const currentIP = activity.sourceIP;
    const knownIPs = this.baseline.networkBehavior.ipAddresses;

    if (!knownIPs.includes(currentIP)) {
      // New IP address - calculate risk based on geolocation difference
      const riskScore = this.calculateIPRisk(currentIP, knownIPs);
      
      if (riskScore > 0.5) {
        return {
          score: riskScore * 5, // Amplify for z-score comparison
          description: `Access from new IP address: ${currentIP}`
        };
      }
    }

    return { score: 0, description: '' };
  }

  private detectAccessAnomaly(activity: UserActivity): { score: number; description: string } {
    if (!this.baseline) return { score: 0, description: '' };

    const resourceType = this.extractResourceType(activity.resource);
    const normalFreq = this.baseline.accessPatterns.resourceTypes[resourceType] || 0;
    const avgFreq = Object.values(this.baseline.accessPatterns.resourceTypes)
      .reduce((sum, freq) => sum + freq, 0) / Object.keys(this.baseline.accessPatterns.resourceTypes).length;

    if (normalFreq === 0 && avgFreq > 0) {
      return {
        score: 3.0,
        description: `Access to unusual resource type: ${resourceType}`
      };
    }

    const zScore = normalFreq > 0 ? Math.abs((normalFreq - avgFreq) / avgFreq) : 0;
    
    if (zScore > 2) {
      return {
        score: zScore,
        description: `Unusual access pattern to: ${resourceType}`
      };
    }

    return { score: 0, description: '' };
  }

  private detectCommandAnomaly(activity: UserActivity): { score: number; description: string } {
    if (!this.baseline) return { score: 0, description: '' };

    const command = activity.metadata.command || '';
    const commandType = this.extractCommandType(command);
    
    const normalFreq = this.baseline.accessPatterns.commands[commandType] || 0;
    const avgFreq = Object.values(this.baseline.accessPatterns.commands)
      .reduce((sum, freq) => sum + freq, 0) / Object.keys(this.baseline.accessPatterns.commands).length;

    // Check for dangerous commands
    const dangerousCommands = ['rm', 'del', 'format', 'dd', 'kill', 'sudo', 'su', 'chmod', 'chown'];
    if (dangerousCommands.some(cmd => command.toLowerCase().includes(cmd))) {
      return {
        score: 4.0,
        description: `Potentially dangerous command executed: ${commandType}`
      };
    }

    if (normalFreq === 0 && avgFreq > 0) {
      return {
        score: 3.0,
        description: `Unusual command type executed: ${commandType}`
      };
    }

    return { score: 0, description: '' };
  }

  private groupActivitiesIntoSessions(activities: UserActivity[]): UserSession[] {
    const sessions: UserSession[] = [];
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    let currentSession: UserSession | null = null;

    for (const activity of activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
      if (!currentSession || 
          activity.timestamp.getTime() - currentSession.activities[currentSession.activities.length - 1].timestamp.getTime() > sessionTimeout) {
        
        // Start new session
        if (currentSession) {
          currentSession.endTime = currentSession.activities[currentSession.activities.length - 1].timestamp;
          sessions.push(currentSession);
        }

        currentSession = {
          sessionId: activity.sessionId || `session_${Date.now()}`,
          userId: activity.userId,
          startTime: activity.timestamp,
          sourceIP: activity.sourceIP,
          activities: [activity],
          riskScore: 0,
          anomalies: []
        };
      } else {
        currentSession.activities.push(activity);
      }
    }

    if (currentSession) {
      currentSession.endTime = currentSession.activities[currentSession.activities.length - 1].timestamp;
      sessions.push(currentSession);
    }

    return sessions;
  }

  private calculateLoginFrequency(activities: UserActivity[]): any {
    const loginActivities = activities.filter(a => a.activityType === 'login');
    const hourly = new Array(24).fill(0);
    const weekdays = new Array(7).fill(0);

    for (const activity of loginActivities) {
      hourly[activity.timestamp.getHours()]++;
      weekdays[activity.timestamp.getDay()]++;
    }

    return {
      daily: loginActivities.length / 30, // Assume 30-day period
      hourly,
      weekdays
    };
  }

  private calculateAccessPatterns(activities: UserActivity[]): any {
    const resourceTypes: Record<string, number> = {};
    const commands: Record<string, number> = {};
    const dataVolumes: number[] = [];

    for (const activity of activities) {
      const resourceType = this.extractResourceType(activity.resource);
      resourceTypes[resourceType] = (resourceTypes[resourceType] || 0) + 1;

      if (activity.activityType === 'command_execution') {
        const commandType = this.extractCommandType(activity.metadata.command || '');
        commands[commandType] = (commands[commandType] || 0) + 1;
      }

      if (activity.metadata.dataSize) {
        dataVolumes.push(activity.metadata.dataSize);
      }
    }

    const avgDataVolume = dataVolumes.length > 0 ? 
      dataVolumes.reduce((sum, vol) => sum + vol, 0) / dataVolumes.length : 0;
    const stdDevDataVolume = dataVolumes.length > 0 ?
      Math.sqrt(dataVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgDataVolume, 2), 0) / dataVolumes.length) : 0;

    return {
      resourceTypes,
      commands,
      dataVolume: { mean: avgDataVolume, stdDev: stdDevDataVolume }
    };
  }

  private calculateNetworkBehavior(activities: UserActivity[]): any {
    const ipAddresses = [...new Set(activities.map(a => a.sourceIP))];
    const userAgents = [...new Set(activities.map(a => a.userAgent).filter(ua => ua))];
    
    return {
      ipAddresses,
      locations: [], // Would be populated from IP geolocation
      deviceFingerprints: userAgents
    };
  }

  private calculatePerformanceMetrics(sessions: UserSession[]): any {
    const durations = sessions
      .filter(s => s.endTime)
      .map(s => s.endTime!.getTime() - s.startTime.getTime());
    
    const avgSessionDuration = durations.length > 0 ? 
      durations.reduce((sum, dur) => sum + dur, 0) / durations.length : 0;

    const actionsPerSession = sessions.length > 0 ?
      sessions.reduce((sum, s) => sum + s.activities.length, 0) / sessions.length : 0;

    const errorRate = sessions.length > 0 ?
      sessions.reduce((sum, s) => sum + s.activities.filter(a => !a.success).length, 0) / 
      sessions.reduce((sum, s) => sum + s.activities.length, 0) : 0;

    return {
      avgSessionDuration,
      actionsPerSession,
      errorRate
    };
  }

  private extractResourceType(resource: string): string {
    // Extract resource type from resource path/identifier
    if (resource.includes('/api/')) return 'api';
    if (resource.includes('/drone/')) return 'drone';
    if (resource.includes('/mission/')) return 'mission';
    if (resource.includes('/file/')) return 'file';
    if (resource.includes('/admin/')) return 'admin';
    return 'other';
  }

  private extractCommandType(command: string): string {
    const cmd = command.toLowerCase().split(' ')[0];
    const categories = {
      'file': ['ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir'],
      'system': ['ps', 'top', 'kill', 'killall', 'systemctl', 'service'],
      'network': ['ping', 'wget', 'curl', 'ssh', 'scp', 'ftp'],
      'admin': ['sudo', 'su', 'chmod', 'chown', 'passwd', 'useradd'],
      'data': ['grep', 'find', 'sort', 'uniq', 'awk', 'sed']
    };

    for (const [category, commands] of Object.entries(categories)) {
      if (commands.includes(cmd)) return category;
    }

    return 'other';
  }

  private calculateIPRisk(newIP: string, knownIPs: string[]): number {
    // Simplified IP risk calculation
    // In practice, would use geolocation and threat intelligence
    const ipParts = newIP.split('.');
    const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    
    // Check if from same subnet as known IPs
    for (const knownIP of knownIPs) {
      const knownParts = knownIP.split('.');
      const knownSubnet = `${knownParts[0]}.${knownParts[1]}.${knownParts[2]}`;
      if (subnet === knownSubnet) return 0.2; // Same subnet, low risk
    }

    // Different subnet/location
    return 0.8;
  }
}

// Compromise detection using multiple indicators
class CompromiseDetector {
  private indicators: Map<string, CompromiseIndicator[]> = new Map();
  private suspiciousPatterns = {
    credentialCompromise: [
      'multiple_failed_logins',
      'login_from_new_location',
      'unusual_login_time',
      'concurrent_sessions'
    ],
    privilegeEscalation: [
      'admin_command_execution',
      'permission_changes',
      'service_modifications',
      'user_creation'
    ],
    lateralMovement: [
      'cross_system_access',
      'network_scanning',
      'credential_reuse',
      'remote_connections'
    ],
    dataExfiltration: [
      'large_data_transfers',
      'unusual_file_access',
      'compression_activities',
      'external_communications'
    ]
  };

  public analyzeForCompromise(userId: string, activities: UserActivity[], riskScore: number): CompromiseIndicator[] {
    const indicators: CompromiseIndicator[] = [];

    // Analyze each compromise type
    if (this.detectCredentialCompromise(activities, riskScore)) {
      indicators.push(this.createCompromiseIndicator(userId, 'credential_compromise', activities));
    }

    if (this.detectPrivilegeEscalation(activities)) {
      indicators.push(this.createCompromiseIndicator(userId, 'privilege_escalation', activities));
    }

    if (this.detectLateralMovement(activities)) {
      indicators.push(this.createCompromiseIndicator(userId, 'lateral_movement', activities));
    }

    if (this.detectDataExfiltration(activities)) {
      indicators.push(this.createCompromiseIndicator(userId, 'data_exfiltration', activities));
    }

    // Store indicators
    if (indicators.length > 0) {
      this.indicators.set(userId, indicators);
    }

    return indicators;
  }

  private detectCredentialCompromise(activities: UserActivity[], riskScore: number): boolean {
    const recentActivities = activities.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    // Multiple failed logins
    const failedLogins = recentActivities.filter(a => 
      a.activityType === 'login' && !a.success
    ).length;

    // Logins from multiple IPs
    const uniqueIPs = new Set(recentActivities
      .filter(a => a.activityType === 'login' && a.success)
      .map(a => a.sourceIP)
    ).size;

    // High overall risk score
    const highRisk = riskScore > 0.7;

    return failedLogins > 5 || uniqueIPs > 3 || highRisk;
  }

  private detectPrivilegeEscalation(activities: UserActivity[]): boolean {
    const recentActivities = activities.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Admin commands
    const adminCommands = recentActivities.filter(a => 
      a.activityType === 'command_execution' && 
      (a.metadata.command?.includes('sudo') || 
       a.metadata.command?.includes('su') ||
       a.metadata.command?.includes('chmod') ||
       a.resource.includes('/admin/'))
    ).length;

    // System modifications
    const systemMods = recentActivities.filter(a =>
      a.resource.includes('/system/') || 
      a.resource.includes('/config/')
    ).length;

    return adminCommands > 5 || systemMods > 10;
  }

  private detectLateralMovement(activities: UserActivity[]): boolean {
    const recentActivities = activities.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Cross-system access
    const systemAccess = new Set(recentActivities.map(a => 
      this.extractSystemFromResource(a.resource)
    )).size;

    // Network-related activities
    const networkActivities = recentActivities.filter(a =>
      a.metadata.command?.includes('ssh') ||
      a.metadata.command?.includes('scp') ||
      a.metadata.command?.includes('ping') ||
      a.metadata.command?.includes('nmap')
    ).length;

    return systemAccess > 5 || networkActivities > 10;
  }

  private detectDataExfiltration(activities: UserActivity[]): boolean {
    const recentActivities = activities.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Large data transfers
    const totalDataSize = recentActivities
      .filter(a => a.metadata.dataSize)
      .reduce((sum, a) => sum + (a.metadata.dataSize || 0), 0);

    // File compression activities
    const compressionActivities = recentActivities.filter(a =>
      a.metadata.command?.includes('zip') ||
      a.metadata.command?.includes('tar') ||
      a.metadata.command?.includes('gzip')
    ).length;

    // External communications
    const externalComms = recentActivities.filter(a =>
      a.activityType === 'data_transfer' &&
      !this.isInternalIP(a.metadata.destinationIP)
    ).length;

    return totalDataSize > 100 * 1024 * 1024 || // 100MB
           compressionActivities > 5 ||
           externalComms > 10;
  }

  private createCompromiseIndicator(
    userId: string, 
    type: CompromiseIndicator['type'], 
    activities: UserActivity[]
  ): CompromiseIndicator {
    const severity = this.calculateSeverity(type, activities);
    const confidence = this.calculateConfidence(type, activities);

    return {
      id: `compromise_${type}_${userId}_${Date.now()}`,
      userId,
      timestamp: new Date(),
      type,
      severity,
      confidence,
      description: this.getCompromiseDescription(type),
      evidence: {
        anomalousActivities: this.extractAnomalousActivities(activities),
        riskFactors: this.extractRiskFactors(type, activities),
        correlatedEvents: []
      },
      impact: {
        affectedSystems: this.getAffectedSystems(activities),
        dataAtRisk: this.getDataAtRisk(activities),
        privilegesCompromised: this.getPrivilegesCompromised(activities)
      },
      recommendedActions: this.getRecommendedActions(type)
    };
  }

  private extractSystemFromResource(resource: string): string {
    // Extract system identifier from resource path
    const parts = resource.split('/');
    return parts.length > 1 ? parts[1] : 'unknown';
  }

  private isInternalIP(ip: string): boolean {
    if (!ip) return true;
    
    // Check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./
    ];

    return privateRanges.some(range => range.test(ip));
  }

  private calculateSeverity(type: CompromiseIndicator['type'], activities: UserActivity[]): CompromiseIndicator['severity'] {
    const criticalTypes = ['privilege_escalation', 'data_exfiltration'];
    const highTypes = ['credential_compromise', 'lateral_movement'];

    if (criticalTypes.includes(type)) return 'critical';
    if (highTypes.includes(type)) return 'high';
    return 'medium';
  }

  private calculateConfidence(type: CompromiseIndicator['type'], activities: UserActivity[]): number {
    // Simplified confidence calculation based on evidence strength
    const evidenceCount = this.extractRiskFactors(type, activities).length;
    return Math.min(1.0, evidenceCount * 0.2 + 0.3);
  }

  private getCompromiseDescription(type: CompromiseIndicator['type']): string {
    const descriptions = {
      credential_compromise: 'Potential credential compromise detected based on login anomalies',
      account_takeover: 'Possible account takeover indicated by behavioral changes',
      privilege_escalation: 'Unauthorized privilege escalation attempts detected',
      lateral_movement: 'Suspicious lateral movement across systems detected',
      data_exfiltration: 'Potential data exfiltration activities identified'
    };

    return descriptions[type] || 'Unknown compromise type detected';
  }

  private extractAnomalousActivities(activities: UserActivity[]): string[] {
    return activities
      .filter(a => !a.success || a.metadata.anomalous)
      .map(a => `${a.activityType} on ${a.resource} at ${a.timestamp.toISOString()}`)
      .slice(0, 10); // Limit to top 10
  }

  private extractRiskFactors(type: CompromiseIndicator['type'], activities: UserActivity[]): string[] {
    const patterns = this.suspiciousPatterns[type as keyof typeof this.suspiciousPatterns] || [];
    return patterns.filter(pattern => this.patternExists(pattern, activities));
  }

  private patternExists(pattern: string, activities: UserActivity[]): boolean {
    // Simplified pattern matching
    switch (pattern) {
      case 'multiple_failed_logins':
        return activities.filter(a => a.activityType === 'login' && !a.success).length > 3;
      case 'admin_command_execution':
        return activities.some(a => a.metadata.command?.includes('sudo'));
      case 'large_data_transfers':
        return activities.some(a => (a.metadata.dataSize || 0) > 10 * 1024 * 1024);
      default:
        return false;
    }
  }

  private getAffectedSystems(activities: UserActivity[]): string[] {
    return [...new Set(activities.map(a => this.extractSystemFromResource(a.resource)))];
  }

  private getDataAtRisk(activities: UserActivity[]): string[] {
    return activities
      .filter(a => a.activityType === 'file_access')
      .map(a => a.resource)
      .slice(0, 10);
  }

  private getPrivilegesCompromised(activities: UserActivity[]): string[] {
    const privileges = new Set<string>();
    
    activities.forEach(a => {
      if (a.resource.includes('/admin/')) privileges.add('admin');
      if (a.resource.includes('/drone/')) privileges.add('drone_control');
      if (a.resource.includes('/mission/')) privileges.add('mission_planning');
      if (a.metadata.command?.includes('sudo')) privileges.add('root');
    });

    return Array.from(privileges);
  }

  private getRecommendedActions(type: CompromiseIndicator['type']): string[] {
    const actions: Record<CompromiseIndicator['type'], string[]> = {
      credential_compromise: [
        'Force password reset for affected user',
        'Enable multi-factor authentication',
        'Review recent login activity',
        'Monitor for continued suspicious activity'
      ],
      account_takeover: [
        'Immediately suspend user account',
        'Initiate incident response procedure',
        'Audit all recent user activities',
        'Reset all authentication credentials'
      ],
      privilege_escalation: [
        'Review and audit user privileges',
        'Check system configuration changes',
        'Implement principle of least privilege',
        'Monitor for unauthorized administrative actions'
      ],
      lateral_movement: [
        'Isolate affected systems from network',
        'Audit cross-system access patterns',
        'Implement network segmentation',
        'Review service account activities'
      ],
      data_exfiltration: [
        'Implement data loss prevention controls',
        'Audit all data access and transfers',
        'Review encryption and access controls',
        'Monitor outbound network traffic'
      ]
    };

    return actions[type] || ['Investigate and monitor user activity'];
  }
}

// Main Insider Threat Detection Engine
export class InsiderThreatDetectionEngine {
  private static instance: InsiderThreatDetectionEngine;
  
  private userModels: Map<string, UserBehaviorModel> = new Map();
  private compromiseDetector = new CompromiseDetector();
  private activityBuffer: Map<string, UserActivity[]> = new Map();
  private threatIndicators: Map<string, InsiderThreatIndicator[]> = new Map();
  
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): InsiderThreatDetectionEngine {
    if (!InsiderThreatDetectionEngine.instance) {
      InsiderThreatDetectionEngine.instance = new InsiderThreatDetectionEngine();
    }
    return InsiderThreatDetectionEngine.instance;
  }

  // ==================== Public API Methods ====================

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Run analysis every 5 minutes
    this.analysisInterval = setInterval(() => {
      this.performScheduledAnalysis();
    }, 5 * 60 * 1000);

    logger.info({
      message: 'Insider Threat Detection Engine started',
      category: LogCategory.ANOMALY,
      metadata: { usersMonitored: this.userModels.size }
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    logger.info({
      message: 'Insider Threat Detection Engine stopped',
      category: LogCategory.ANOMALY
    });
  }

  /**
   * Add user activity for analysis
   */
  public addUserActivity(activity: UserActivity): void {
    // Store activity
    if (!this.activityBuffer.has(activity.userId)) {
      this.activityBuffer.set(activity.userId, []);
    }
    
    const buffer = this.activityBuffer.get(activity.userId)!;
    buffer.push(activity);
    
    // Keep buffer size manageable
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }

    // Initialize user model if needed
    if (!this.userModels.has(activity.userId)) {
      this.userModels.set(activity.userId, new UserBehaviorModel(activity.userId));
    }

    // Analyze activity in real-time for critical threats
    this.analyzeActivityRealTime(activity);
  }

  /**
   * Get threat indicators for a specific user
   */
  public getUserThreats(userId: string): InsiderThreatIndicator[] {
    return this.threatIndicators.get(userId) || [];
  }

  /**
   * Get all active threat indicators
   */
  public getAllThreats(): InsiderThreatIndicator[] {
    const allThreats: InsiderThreatIndicator[] = [];
    for (const threats of this.threatIndicators.values()) {
      allThreats.push(...threats);
    }
    return allThreats.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Train user behavior baseline
   */
  public async trainUserBaseline(userId: string): Promise<void> {
    const activities = this.activityBuffer.get(userId);
    if (!activities || activities.length < 100) {
      logger.warning({
        message: `Insufficient data to train baseline for user: ${userId}`,
        category: LogCategory.ANOMALY,
        metadata: { userId, activityCount: activities?.length || 0 }
      });
      return;
    }

    const model = this.userModels.get(userId);
    if (model) {
      model.updateBaseline(activities);
      
      logger.info({
        message: `User behavior baseline updated: ${userId}`,
        category: LogCategory.ANOMALY,
        metadata: { userId, activityCount: activities.length }
      });
    }
  }

  /**
   * Analyze user for compromise indicators
   */
  public analyzeUserForCompromise(userId: string): CompromiseIndicator[] {
    const activities = this.activityBuffer.get(userId);
    if (!activities) return [];

    const userThreats = this.getUserThreats(userId);
    const avgRiskScore = userThreats.length > 0 ? 
      userThreats.reduce((sum, t) => sum + t.riskScore, 0) / userThreats.length : 0;

    return this.compromiseDetector.analyzeForCompromise(userId, activities, avgRiskScore);
  }

  // ==================== Private Helper Methods ====================

  private async analyzeActivityRealTime(activity: UserActivity): Promise<void> {
    try {
      const model = this.userModels.get(activity.userId);
      if (!model) return;

      const analysis = model.analyzeActivity(activity);
      
      if (analysis.riskScore > 0.5 || analysis.anomalies.length > 0) {
        await this.createThreatIndicator(activity, analysis);
      }

    } catch (error) {
      logger.error({
        message: 'Error in real-time activity analysis',
        category: LogCategory.ANOMALY,
        error,
        metadata: { userId: activity.userId }
      });
    }
  }

  private async createThreatIndicator(
    activity: UserActivity, 
    analysis: { riskScore: number; anomalies: string[] }
  ): Promise<void> {
    const indicator: InsiderThreatIndicator = {
      id: `threat_${activity.userId}_${Date.now()}`,
      userId: activity.userId,
      timestamp: new Date(),
      riskScore: analysis.riskScore,
      behaviorCategory: this.categorizeBehavior(activity),
      deviationMetrics: {
        accessFrequency: analysis.riskScore * 0.3,
        unusualHours: activity.timestamp.getHours() < 6 || activity.timestamp.getHours() > 22 ? 0.8 : 0,
        privilegeEscalation: activity.resource.includes('/admin/') ? 0.7 : 0,
        dataVolumeAnomaly: (activity.metadata.dataSize || 0) > 50 * 1024 * 1024 ? 0.9 : 0
      },
      baselineComparison: {
        normalRange: [0, 0.3],
        currentValue: analysis.riskScore,
        percentileRank: Math.min(99, analysis.riskScore * 100)
      },
      contextualFactors: {
        missionCriticality: this.assessMissionCriticality(activity),
        teamCollaboration: 0.5, // Would calculate from team activities
        stressIndicators: analysis.anomalies
      }
    };

    // Store threat indicator
    if (!this.threatIndicators.has(activity.userId)) {
      this.threatIndicators.set(activity.userId, []);
    }
    
    const userThreats = this.threatIndicators.get(activity.userId)!;
    userThreats.push(indicator);
    
    // Keep only recent threats
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const recentThreats = userThreats.filter(t => 
      new Date(t.timestamp).getTime() > cutoffTime
    );
    this.threatIndicators.set(activity.userId, recentThreats);

    // Log high-risk indicators
    if (analysis.riskScore > 0.7) {
      logger.warning({
        message: `High-risk insider threat indicator: ${activity.userId}`,
        category: LogCategory.ANOMALY,
        classification: SecurityClassification.CONFIDENTIAL,
        metadata: {
          userId: activity.userId,
          riskScore: analysis.riskScore,
          anomalies: analysis.anomalies,
          activity: {
            type: activity.activityType,
            resource: activity.resource,
            timestamp: activity.timestamp
          }
        }
      });
    }

    // Record metrics
    metrics.recordInsiderThreat(activity.userId, analysis.riskScore);
  }

  private categorizeBehavior(activity: UserActivity): InsiderThreatIndicator['behaviorCategory'] {
    if (activity.timestamp.getHours() < 6 || activity.timestamp.getHours() > 22) {
      return 'timing_anomaly';
    }
    
    if ((activity.metadata.dataSize || 0) > 10 * 1024 * 1024) {
      return 'data_usage';
    }
    
    if (activity.resource.includes('/admin/') || activity.resource.includes('/system/')) {
      return 'system_interaction';
    }
    
    return 'access_pattern';
  }

  private assessMissionCriticality(activity: UserActivity): string {
    if (activity.resource.includes('/mission/') || activity.resource.includes('/drone/')) {
      return 'high';
    }
    
    if (activity.resource.includes('/tactical/') || activity.resource.includes('/intel/')) {
      return 'critical';
    }
    
    return 'medium';
  }

  private async performScheduledAnalysis(): Promise<void> {
    try {
      // Update user baselines
      for (const [userId, activities] of this.activityBuffer) {
        if (activities.length >= 100) {
          await this.trainUserBaseline(userId);
        }
      }

      // Analyze for compromise indicators
      for (const userId of this.userModels.keys()) {
        const compromiseIndicators = this.analyzeUserForCompromise(userId);
        
        if (compromiseIndicators.length > 0) {
          logger.warning({
            message: `Compromise indicators detected for user: ${userId}`,
            category: LogCategory.ANOMALY,
            classification: SecurityClassification.SECRET,
            metadata: {
              userId,
              indicatorCount: compromiseIndicators.length,
              indicators: compromiseIndicators.map(i => ({
                type: i.type,
                severity: i.severity,
                confidence: i.confidence
              }))
            }
          });
        }
      }

    } catch (error) {
      logger.error({
        message: 'Error in scheduled insider threat analysis',
        category: LogCategory.ANOMALY,
        error
      });
    }
  }

  // ==================== Public Status and Management Methods ====================

  public getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      usersMonitored: this.userModels.size,
      totalActivities: Array.from(this.activityBuffer.values())
        .reduce((sum, activities) => sum + activities.length, 0),
      activeThreatIndicators: Array.from(this.threatIndicators.values())
        .reduce((sum, threats) => sum + threats.length, 0),
      highRiskUsers: this.getHighRiskUsers().length
    };
  }

  public getHighRiskUsers(): { userId: string; avgRiskScore: number }[] {
    const riskUsers: { userId: string; avgRiskScore: number }[] = [];
    
    for (const [userId, threats] of this.threatIndicators) {
      if (threats.length > 0) {
        const avgRiskScore = threats.reduce((sum, t) => sum + t.riskScore, 0) / threats.length;
        if (avgRiskScore > 0.6) {
          riskUsers.push({ userId, avgRiskScore });
        }
      }
    }
    
    return riskUsers.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }

  public getUserBaseline(userId: string): BehaviorBaseline | null {
    const model = this.userModels.get(userId);
    return model ? (model as any).baseline : null;
  }

  public clearUserData(userId: string): void {
    this.userModels.delete(userId);
    this.activityBuffer.delete(userId);
    this.threatIndicators.delete(userId);
    
    logger.info({
      message: `User data cleared: ${userId}`,
      category: LogCategory.ANOMALY,
      metadata: { userId }
    });
  }
}

// Export singleton instance and utility functions
export const insiderThreatDetector = InsiderThreatDetectionEngine.getInstance();

// Helper function to create user activity from system events
export function createUserActivity(
  userId: string,
  activityType: UserActivity['activityType'],
  resource: string,
  sourceIP: string,
  success: boolean = true,
  metadata: Record<string, any> = {}
): UserActivity {
  return {
    userId,
    timestamp: new Date(),
    activityType,
    resource,
    sourceIP,
    sessionId: metadata.sessionId || `session_${Date.now()}`,
    success,
    metadata,
    userAgent: metadata.userAgent
  };
}