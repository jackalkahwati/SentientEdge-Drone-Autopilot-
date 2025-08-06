// Cyber Attack Detection and Automated Response System
// Military-grade cybersecurity for drone communications and control systems

import { 
  CyberThreat,
  EWThreat,
  ThreatSeverity,
  EWEvent,
  ElectronicCountermeasure
} from './types';
import { webSocketService } from './websocket';

// Cyber threat detection patterns and signatures
const CYBER_ATTACK_PATTERNS = {
  INTRUSION_PATTERNS: {
    BRUTE_FORCE: {
      maxAttempts: 5,
      timeWindow: 60000, // 60 seconds
      indicators: ['repeated_login_failures', 'password_guessing']
    },
    PORT_SCAN: {
      portThreshold: 10,
      timeWindow: 30000, // 30 seconds
      indicators: ['sequential_port_access', 'service_enumeration']
    },
    PRIVILEGE_ESCALATION: {
      indicators: ['unexpected_admin_access', 'system_file_modification', 'kernel_exploitation']
    }
  },

  MALWARE_SIGNATURES: {
    KNOWN_HASHES: new Set([
      'a1b2c3d4e5f6789012345678901234567890abcd',
      'f9e8d7c6b5a49382716054938271605493827160'
    ]),
    BEHAVIORAL_PATTERNS: [
      'network_beacon_regular',
      'file_encryption_mass',
      'registry_modification_suspicious',
      'process_injection_detected'
    ]
  },

  NETWORK_ANOMALIES: {
    DATA_EXFILTRATION: {
      uploadThreshold: 10485760, // 10MB
      timeWindow: 300000, // 5 minutes
      suspiciousDestinations: ['tor_nodes', 'unknown_external']
    },
    DDoS_PATTERNS: {
      requestRate: 1000, // requests per second
      sourceVariation: 0.1, // low source IP variation
      timeWindow: 60000
    },
    MAN_IN_THE_MIDDLE: {
      indicators: ['certificate_mismatch', 'unexpected_proxy', 'dns_spoofing']
    }
  }
};

// Protocol-specific security checks
const PROTOCOL_SECURITY = {
  MAVLINK: {
    expectedPacketSizes: [8, 280], // Min/max packet sizes
    validSysIds: [1, 2, 3, 4, 5], // Expected system IDs
    commandWhitelist: [16, 20, 21, 22, 76, 400], // Allowed MAVLink commands
    encryptionRequired: true
  },
  CYPHAL: {
    validNodeIds: new Set([1, 2, 3, 4, 5, 255]),
    subjectIdRanges: [[0, 7999], [28672, 32767]], // Valid subject ID ranges
    encryptionRequired: true
  },
  WEBSOCKET: {
    maxMessageSize: 1048576, // 1MB
    rateLimitRps: 100, // 100 requests per second
    requiredOrigins: ['localhost', '127.0.0.1'],
    encryptionRequired: true
  }
};

export class CyberDefenseSystem {
  private static instance: CyberDefenseSystem;
  private isActive: boolean = false;
  private detectedThreats: Map<string, CyberThreat> = new Map();
  private activeDefenses: Map<string, ElectronicCountermeasure> = new Map();
  private securityMetrics: {
    intrusions: number;
    malwareDetected: number;
    dataExfiltrationAttempts: number;
    blockedConnections: number;
    quarantinedFiles: number;
  } = {
    intrusions: 0,
    malwareDetected: 0,
    dataExfiltrationAttempts: 0,
    blockedConnections: 0,
    quarantinedFiles: 0
  };
  private connectionAttempts: Map<string, { count: number; timestamp: number }> = new Map();
  private networkTraffic: Map<string, { bytes: number; timestamp: number }> = new Map();
  private systemEvents: Array<{ timestamp: number; type: string; source: string; details: any }> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private threatCallbacks: Array<(threat: CyberThreat) => void> = [];

  private constructor() {
    this.setupWebSocketHandlers();
  }

  public static getInstance(): CyberDefenseSystem {
    if (!CyberDefenseSystem.instance) {
      CyberDefenseSystem.instance = new CyberDefenseSystem();
    }
    return CyberDefenseSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Monitor WebSocket messages for suspicious activity
      webSocketService.subscribe('*', (data, messageType) => {
        this.analyzeNetworkMessage(messageType, data);
      });

      // Listen for security events
      webSocketService.subscribe('security_event', (data) => {
        this.processSecurityEvent(data);
      });

      // Listen for authentication events
      webSocketService.subscribe('authentication_attempt', (data) => {
        this.processAuthenticationAttempt(data);
      });

      // Listen for file system events
      webSocketService.subscribe('file_system_event', (data) => {
        this.processFileSystemEvent(data);
      });

      // Listen for process events
      webSocketService.subscribe('process_event', (data) => {
        this.processProcessEvent(data);
      });

      // Listen for network connection events
      webSocketService.subscribe('network_connection', (data) => {
        this.processNetworkConnection(data);
      });
    }
  }

  public startCyberDefense(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Cyber Defense System activated');

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.performContinuousAnalysis();
    }, 5000); // Check every 5 seconds

    // Initialize baseline security posture
    this.establishSecurityBaseline();

    this.emitEvent('system_alert', 'low', 'Cyber Defense System activated');
  }

  public stopCyberDefense(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Cyber Defense System deactivated');
    this.emitEvent('system_alert', 'low', 'Cyber Defense System deactivated');
  }

  public addThreatCallback(callback: (threat: CyberThreat) => void): () => void {
    this.threatCallbacks.push(callback);
    return () => {
      this.threatCallbacks = this.threatCallbacks.filter(cb => cb !== callback);
    };
  }

  public getSecurityMetrics(): typeof this.securityMetrics {
    return { ...this.securityMetrics };
  }

  public getActiveThreatCount(): number {
    return Array.from(this.detectedThreats.values()).filter(threat => 
      !threat.mitigated
    ).length;
  }

  public getCyberThreats(): CyberThreat[] {
    return Array.from(this.detectedThreats.values());
  }

  public mitigateThreat(threatId: string): boolean {
    const threat = this.detectedThreats.get(threatId);
    if (!threat) return false;

    const success = this.deployMitigation(threat);
    
    if (success) {
      threat.mitigated = true;
      threat.mitigation = {
        action: this.getMitigationAction(threat.type),
        timestamp: new Date().toISOString(),
        success: true
      };
      
      console.log(`Successfully mitigated cyber threat: ${threatId}`);
    }

    return success;
  }

  private analyzeNetworkMessage(messageType: string, data: any): void {
    if (!this.isActive) return;

    // Check message size
    const messageSize = JSON.stringify(data).length;
    if (messageSize > PROTOCOL_SECURITY.WEBSOCKET.maxMessageSize) {
      this.reportThreat({
        id: `oversized-message-${Date.now()}`,
        type: 'dos',
        severity: 'medium',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'websocket',
          component: 'message_handler',
          protocol: 'websocket'
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: false,
          dataExfiltration: false,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: false,
          systemAvailability: true,
          confidentiality: false
        },
        mitigated: false
      });
    }

    // Analyze MAVLink messages for security violations
    if (messageType === 'mavlink_message') {
      this.analyzeMavlinkSecurity(data);
    }

    // Check for injection attempts
    if (this.containsInjectionAttempt(data)) {
      this.reportThreat({
        id: `injection-attempt-${Date.now()}`,
        type: 'injection',
        severity: 'high',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'application',
          component: 'message_processor',
          protocol: messageType
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: true,
          dataExfiltration: false,
          systemCompromise: true
        },
        impact: {
          dataIntegrity: true,
          systemAvailability: true,
          confidentiality: true
        },
        mitigated: false
      });
    }

    // Rate limiting check
    this.checkRateLimit(messageType);
  }

  private analyzeMavlinkSecurity(data: any): void {
    const { sysid, compid, payload } = data;

    // Check for valid system IDs
    if (!PROTOCOL_SECURITY.MAVLINK.validSysIds.includes(sysid)) {
      this.reportThreat({
        id: `invalid-sysid-${Date.now()}`,
        type: 'intrusion',
        severity: 'medium',
        detectedAt: new Date().toISOString(),
        source: {
          fingerprint: `sysid-${sysid}-compid-${compid}`
        },
        target: {
          system: 'mavlink',
          component: 'protocol_handler',
          protocol: 'mavlink'
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: true,
          dataExfiltration: false,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: true,
          systemAvailability: false,
          confidentiality: false
        },
        mitigated: false
      });
    }

    // Check for command injection or unauthorized commands
    if (payload && payload.command) {
      if (!PROTOCOL_SECURITY.MAVLINK.commandWhitelist.includes(payload.command)) {
        this.reportThreat({
          id: `unauthorized-command-${Date.now()}`,
          type: 'intrusion',
          severity: 'high',
          detectedAt: new Date().toISOString(),
          source: {
            fingerprint: `sysid-${sysid}-command-${payload.command}`
          },
          target: {
            system: 'mavlink',
            component: 'command_processor',
            protocol: 'mavlink'
          },
          indicators: {
            anomalousTraffic: true,
            unauthorizedAccess: true,
            dataExfiltration: false,
            systemCompromise: true
          },
          impact: {
            dataIntegrity: true,
            systemAvailability: true,
            confidentiality: false
          },
          mitigated: false
        });
      }
    }
  }

  private containsInjectionAttempt(data: any): boolean {
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Common injection patterns
    const injectionPatterns = [
      /(<script|javascript:|vbscript:)/i,
      /(union\s+select|drop\s+table|delete\s+from)/i,
      /(exec\s*\(|system\s*\(|eval\s*\()/i,
      /(\$\{.*\}|#\{.*\})/i, // Template injection
      /(\.\.\/|\.\.\\|%2e%2e%2f)/i, // Path traversal
      /(<iframe|<object|<embed)/i
    ];

    return injectionPatterns.some(pattern => pattern.test(dataString));
  }

  private checkRateLimit(messageType: string): void {
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    // Clean old entries
    this.connectionAttempts.forEach((attempt, key) => {
      if (attempt.timestamp < windowStart) {
        this.connectionAttempts.delete(key);
      }
    });

    // Count current attempts
    const currentAttempts = Array.from(this.connectionAttempts.values())
      .filter(attempt => attempt.timestamp >= windowStart).length;

    if (currentAttempts > PROTOCOL_SECURITY.WEBSOCKET.rateLimitRps) {
      this.reportThreat({
        id: `rate-limit-exceeded-${Date.now()}`,
        type: 'dos',
        severity: 'medium',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'websocket',
          component: 'rate_limiter',
          protocol: 'websocket'
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: false,
          dataExfiltration: false,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: false,
          systemAvailability: true,
          confidentiality: false
        },
        mitigated: false
      });
    }

    // Track this attempt
    this.connectionAttempts.set(`${messageType}-${now}`, {
      count: 1,
      timestamp: now
    });
  }

  private processSecurityEvent(data: any): void {
    const { eventType, severity, source, details } = data;
    
    this.systemEvents.push({
      timestamp: Date.now(),
      type: eventType,
      source,
      details
    });

    // Analyze security event for threats
    if (eventType === 'malware_detected') {
      this.handleMalwareDetection(details);
    } else if (eventType === 'unauthorized_access') {
      this.handleUnauthorizedAccess(details);
    } else if (eventType === 'data_exfiltration') {
      this.handleDataExfiltration(details);
    }
  }

  private processAuthenticationAttempt(data: any): void {
    const { username, success, ip, timestamp } = data;
    const attemptKey = `${ip}-${username}`;
    const now = Date.now();

    if (!success) {
      // Track failed attempts
      const existing = this.connectionAttempts.get(attemptKey);
      if (existing) {
        existing.count++;
        existing.timestamp = now;
      } else {
        this.connectionAttempts.set(attemptKey, { count: 1, timestamp: now });
      }

      // Check for brute force
      const attempts = this.connectionAttempts.get(attemptKey);
      if (attempts && attempts.count >= CYBER_ATTACK_PATTERNS.INTRUSION_PATTERNS.BRUTE_FORCE.maxAttempts) {
        this.reportThreat({
          id: `brute-force-${Date.now()}`,
          type: 'intrusion',
          severity: 'high',
          detectedAt: new Date().toISOString(),
          source: {
            ip,
            fingerprint: attemptKey
          },
          target: {
            system: 'authentication',
            component: 'login_service'
          },
          indicators: {
            anomalousTraffic: true,
            unauthorizedAccess: true,
            dataExfiltration: false,
            systemCompromise: false
          },
          impact: {
            dataIntegrity: false,
            systemAvailability: false,
            confidentiality: true
          },
          mitigated: false
        });
      }
    } else {
      // Successful login - clear failed attempts
      this.connectionAttempts.delete(attemptKey);
    }
  }

  private processFileSystemEvent(data: any): void {
    const { eventType, path, process, hash } = data;

    // Check for malware signatures
    if (hash && CYBER_ATTACK_PATTERNS.MALWARE_SIGNATURES.KNOWN_HASHES.has(hash)) {
      this.reportThreat({
        id: `malware-hash-${Date.now()}`,
        type: 'malware',
        severity: 'critical',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'filesystem',
          component: 'file_monitor'
        },
        indicators: {
          anomalousTraffic: false,
          unauthorizedAccess: false,
          dataExfiltration: false,
          systemCompromise: true
        },
        impact: {
          dataIntegrity: true,
          systemAvailability: true,
          confidentiality: true
        },
        mitigated: false
      });
    }

    // Check for suspicious file operations
    if (eventType === 'file_encrypted' || eventType === 'mass_file_modification') {
      this.reportThreat({
        id: `suspicious-file-activity-${Date.now()}`,
        type: 'malware',
        severity: 'high',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'filesystem',
          component: 'file_monitor'
        },
        indicators: {
          anomalousTraffic: false,
          unauthorizedAccess: false,
          dataExfiltration: false,
          systemCompromise: true
        },
        impact: {
          dataIntegrity: true,
          systemAvailability: false,
          confidentiality: true
        },
        mitigated: false
      });
    }
  }

  private processProcessEvent(data: any): void {
    const { eventType, processName, parentProcess, commandLine } = data;

    // Check for process injection
    if (eventType === 'process_injection') {
      this.reportThreat({
        id: `process-injection-${Date.now()}`,
        type: 'malware',
        severity: 'high',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'process_monitor',
          component: 'process_tracker'
        },
        indicators: {
          anomalousTraffic: false,
          unauthorizedAccess: true,
          dataExfiltration: false,
          systemCompromise: true
        },
        impact: {
          dataIntegrity: true,
          systemAvailability: true,
          confidentiality: true
        },
        mitigated: false
      });
    }

    // Check for suspicious command lines
    if (commandLine && this.isSuspiciousCommandLine(commandLine)) {
      this.reportThreat({
        id: `suspicious-command-${Date.now()}`,
        type: 'intrusion',
        severity: 'medium',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'process_monitor',
          component: 'command_analyzer'
        },
        indicators: {
          anomalousTraffic: false,
          unauthorizedAccess: true,
          dataExfiltration: false,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: false,
          systemAvailability: false,
          confidentiality: true
        },
        mitigated: false
      });
    }
  }

  private processNetworkConnection(data: any): void {
    const { sourceIp, destIp, destPort, protocol, bytes } = data;

    // Track data transfer for exfiltration detection
    const connectionKey = `${sourceIp}-${destIp}-${destPort}`;
    const existing = this.networkTraffic.get(connectionKey);
    const now = Date.now();

    if (existing) {
      existing.bytes += bytes;
      existing.timestamp = now;
    } else {
      this.networkTraffic.set(connectionKey, { bytes, timestamp: now });
    }

    // Check for data exfiltration
    const traffic = this.networkTraffic.get(connectionKey);
    if (traffic && traffic.bytes > CYBER_ATTACK_PATTERNS.NETWORK_ANOMALIES.DATA_EXFILTRATION.uploadThreshold) {
      this.reportThreat({
        id: `data-exfiltration-${Date.now()}`,
        type: 'intrusion',
        severity: 'critical',
        detectedAt: new Date().toISOString(),
        source: {
          ip: sourceIp
        },
        target: {
          system: 'network',
          component: 'traffic_analyzer'
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: false,
          dataExfiltration: true,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: false,
          systemAvailability: false,
          confidentiality: true
        },
        mitigated: false
      });
    }
  }

  private handleMalwareDetection(details: any): void {
    this.securityMetrics.malwareDetected++;
    
    const threat: CyberThreat = {
      id: `malware-${Date.now()}`,
      type: 'malware',
      severity: 'critical',
      detectedAt: new Date().toISOString(),
      target: {
        system: details.system || 'unknown',
        component: details.component || 'unknown'
      },
      indicators: {
        anomalousTraffic: false,
        unauthorizedAccess: false,
        dataExfiltration: false,
        systemCompromise: true
      },
      impact: {
        dataIntegrity: true,
        systemAvailability: true,
        confidentiality: true
      },
      mitigated: false
    };

    this.reportThreat(threat);
  }

  private handleUnauthorizedAccess(details: any): void {
    this.securityMetrics.intrusions++;
    
    const threat: CyberThreat = {
      id: `unauthorized-access-${Date.now()}`,
      type: 'intrusion',
      severity: 'high',
      detectedAt: new Date().toISOString(),
      source: {
        ip: details.ip,
        fingerprint: details.fingerprint
      },
      target: {
        system: details.system || 'unknown',
        component: details.component || 'unknown'
      },
      indicators: {
        anomalousTraffic: true,
        unauthorizedAccess: true,
        dataExfiltration: false,
        systemCompromise: false
      },
      impact: {
        dataIntegrity: false,
        systemAvailability: false,
        confidentiality: true
      },
      mitigated: false
    };

    this.reportThreat(threat);
  }

  private handleDataExfiltration(details: any): void {
    this.securityMetrics.dataExfiltrationAttempts++;
    
    const threat: CyberThreat = {
      id: `data-exfiltration-${Date.now()}`,
      type: 'intrusion',
      severity: 'critical',
      detectedAt: new Date().toISOString(),
      source: {
        ip: details.sourceIp
      },
      target: {
        system: 'data_store',
        component: 'data_access_layer'
      },
      indicators: {
        anomalousTraffic: true,
        unauthorizedAccess: true,
        dataExfiltration: true,
        systemCompromise: false
      },
      impact: {
        dataIntegrity: false,
        systemAvailability: false,
        confidentiality: true
      },
      mitigated: false
    };

    this.reportThreat(threat);
  }

  private isSuspiciousCommandLine(commandLine: string): boolean {
    const suspiciousPatterns = [
      /powershell.*-encodedcommand/i,
      /cmd.*\/c.*echo/i,
      /wget.*http|curl.*http/i,
      /nc\s+-l\s+-p|netcat.*-l.*-p/i,
      /python.*-c.*import/i,
      /base64.*decode|openssl.*enc/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(commandLine));
  }

  private performContinuousAnalysis(): void {
    if (!this.isActive) return;

    // Clean up old tracking data
    this.cleanupOldData();

    // Analyze patterns in recent events
    this.analyzeEventPatterns();

    // Check for coordinated attacks
    this.detectCoordinatedAttacks();

    // Update threat severity based on current conditions
    this.updateThreatSeverity();
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Clean connection attempts
    this.connectionAttempts.forEach((attempt, key) => {
      if (now - attempt.timestamp > maxAge) {
        this.connectionAttempts.delete(key);
      }
    });

    // Clean network traffic data
    this.networkTraffic.forEach((traffic, key) => {
      if (now - traffic.timestamp > maxAge) {
        this.networkTraffic.delete(key);
      }
    });

    // Clean system events
    this.systemEvents = this.systemEvents.filter(event => 
      now - event.timestamp <= maxAge
    );
  }

  private analyzeEventPatterns(): void {
    const recentEvents = this.systemEvents.filter(event => 
      Date.now() - event.timestamp <= 300000 // Last 5 minutes
    );

    // Group events by source
    const eventsBySource = new Map<string, typeof recentEvents>();
    recentEvents.forEach(event => {
      if (!eventsBySource.has(event.source)) {
        eventsBySource.set(event.source, []);
      }
      eventsBySource.get(event.source)!.push(event);
    });

    // Look for suspicious patterns
    eventsBySource.forEach((events, source) => {
      if (events.length > 20) { // High activity from single source
        console.warn(`High activity detected from source: ${source}`);
      }

      // Check for escalation patterns
      const eventTypes = events.map(e => e.type);
      if (this.indicatesEscalation(eventTypes)) {
        console.warn(`Potential privilege escalation detected from: ${source}`);
      }
    });
  }

  private indicatesEscalation(eventTypes: string[]): boolean {
    // Look for patterns that suggest privilege escalation
    const escalationSequence = [
      'reconnaissance',
      'initial_access',
      'privilege_escalation',
      'persistence'
    ];

    let sequenceIndex = 0;
    for (const eventType of eventTypes) {
      if (eventType === escalationSequence[sequenceIndex]) {
        sequenceIndex++;
        if (sequenceIndex >= escalationSequence.length) {
          return true;
        }
      }
    }

    return false;
  }

  private detectCoordinatedAttacks(): void {
    // Look for multiple sources exhibiting similar behavior
    const sourceActivities = new Map<string, number>();
    
    this.connectionAttempts.forEach((attempt, key) => {
      const source = key.split('-')[0]; // Extract IP
      sourceActivities.set(source, (sourceActivities.get(source) || 0) + 1);
    });

    // Check for distributed attack patterns
    const highActivitySources = Array.from(sourceActivities.entries())
      .filter(([source, activity]) => activity > 10);

    if (highActivitySources.length > 5) {
      console.warn('Potential coordinated attack detected from multiple sources');
      
      this.reportThreat({
        id: `coordinated-attack-${Date.now()}`,
        type: 'dos',
        severity: 'critical',
        detectedAt: new Date().toISOString(),
        target: {
          system: 'network',
          component: 'traffic_analyzer'
        },
        indicators: {
          anomalousTraffic: true,
          unauthorizedAccess: true,
          dataExfiltration: false,
          systemCompromise: false
        },
        impact: {
          dataIntegrity: false,
          systemAvailability: true,
          confidentiality: false
        },
        mitigated: false
      });
    }
  }

  private updateThreatSeverity(): void {
    // Reassess threat severity based on current system state
    this.detectedThreats.forEach((threat, id) => {
      if (!threat.mitigated) {
        const newSeverity = this.calculateThreatSeverity(threat);
        if (newSeverity !== threat.severity) {
          threat.severity = newSeverity;
          console.log(`Updated threat ${id} severity to ${newSeverity}`);
        }
      }
    });
  }

  private calculateThreatSeverity(threat: CyberThreat): ThreatSeverity {
    let severityScore = 0;

    // Base severity
    switch (threat.type) {
      case 'malware':
        severityScore += 0.4;
        break;
      case 'intrusion':
        severityScore += 0.3;
        break;
      case 'dos':
        severityScore += 0.2;
        break;
      default:
        severityScore += 0.1;
    }

    // Impact assessment
    if (threat.impact.dataIntegrity) severityScore += 0.2;
    if (threat.impact.systemAvailability) severityScore += 0.2;
    if (threat.impact.confidentiality) severityScore += 0.2;

    // Indicator assessment
    if (threat.indicators.systemCompromise) severityScore += 0.3;
    if (threat.indicators.dataExfiltration) severityScore += 0.3;
    if (threat.indicators.unauthorizedAccess) severityScore += 0.2;

    // Convert score to severity level
    if (severityScore >= 0.8) return 'critical';
    if (severityScore >= 0.6) return 'high';
    if (severityScore >= 0.4) return 'medium';
    return 'low';
  }

  private deployMitigation(threat: CyberThreat): boolean {
    const mitigationAction = this.getMitigationAction(threat.type);
    
    switch (mitigationAction) {
      case 'block_ip':
        return this.blockIpAddress(threat.source?.ip);
      case 'quarantine_file':
        return this.quarantineFile(threat.target.component);
      case 'kill_process':
        return this.killSuspiciousProcess(threat.target.component);
      case 'rate_limit':
        return this.implementRateLimit(threat.source?.ip);
      case 'isolate_system':
        return this.isolateSystem(threat.target.system);
      default:
        return false;
    }
  }

  private getMitigationAction(threatType: CyberThreat['type']): string {
    const mitigations = {
      'intrusion': 'block_ip',
      'malware': 'quarantine_file',
      'dos': 'rate_limit',
      'mitm': 'isolate_system',
      'replay': 'block_ip',
      'injection': 'block_ip'
    };
    
    return mitigations[threatType] || 'isolate_system';
  }

  private blockIpAddress(ip?: string): boolean {
    if (!ip) return false;
    
    this.securityMetrics.blockedConnections++;
    console.log(`Blocked IP address: ${ip}`);
    
    if (webSocketService) {
      webSocketService.sendSecure('block_ip_address', {
        ip,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  private quarantineFile(component: string): boolean {
    this.securityMetrics.quarantinedFiles++;
    console.log(`Quarantined file/component: ${component}`);
    
    if (webSocketService) {
      webSocketService.sendSecure('quarantine_file', {
        component,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  private killSuspiciousProcess(processId: string): boolean {
    console.log(`Killed suspicious process: ${processId}`);
    
    if (webSocketService) {
      webSocketService.sendSecure('kill_process', {
        processId,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  private implementRateLimit(ip?: string): boolean {
    console.log(`Implemented rate limiting for: ${ip || 'all sources'}`);
    
    if (webSocketService) {
      webSocketService.sendSecure('implement_rate_limit', {
        ip,
        limit: 10, // 10 requests per second
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  private isolateSystem(system: string): boolean {
    console.log(`Isolated system: ${system}`);
    
    if (webSocketService) {
      webSocketService.sendSecure('isolate_system', {
        system,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  private establishSecurityBaseline(): void {
    // Initialize security baseline measurements
    console.log('Establishing security baseline');
    
    if (webSocketService) {
      webSocketService.sendSecure('establish_security_baseline', {
        timestamp: Date.now()
      });
    }
  }

  private reportThreat(threat: CyberThreat): void {
    this.detectedThreats.set(threat.id, threat);
    
    // Automatically attempt mitigation for high/critical threats
    if (threat.severity === 'high' || threat.severity === 'critical') {
      this.mitigateThreat(threat.id);
    }
    
    // Notify callbacks
    this.threatCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        console.error('Error in cyber threat callback:', error);
      }
    });

    // Send threat via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('cyber_threat_detected', threat);
    }

    this.emitEvent('threat_detected', threat.severity,
      `Cyber threat detected: ${threat.type} affecting ${threat.target.system}`);
    
    console.log(`Cyber threat detected: ${threat.id} (${threat.type}, ${threat.severity})`);
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `cyber-defense-event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      details: {},
      acknowledged: false
    };

    if (webSocketService) {
      webSocketService.send('ew_event', event);
    }
  }
}

// Export singleton instance and hook
export const cyberDefense = CyberDefenseSystem.getInstance();

export function useCyberDefense() {
  const system = CyberDefenseSystem.getInstance();
  
  return {
    startCyberDefense: () => system.startCyberDefense(),
    stopCyberDefense: () => system.stopCyberDefense(),
    addThreatCallback: (callback: (threat: CyberThreat) => void) => 
      system.addThreatCallback(callback),
    getSecurityMetrics: () => system.getSecurityMetrics(),
    getActiveThreatCount: () => system.getActiveThreatCount(),
    getCyberThreats: () => system.getCyberThreats(),
    mitigateThreat: (threatId: string) => system.mitigateThreat(threatId),
  };
}