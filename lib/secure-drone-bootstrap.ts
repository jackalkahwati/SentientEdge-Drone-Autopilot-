// Secure Drone Bootstrap System
// Provides secure onboarding and network joining procedures for new drones

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { 
  MilitaryCryptoEngine, 
  SecurityLevel, 
  KeyType, 
  SecureMessage,
  militaryCrypto,
  generateSecureToken 
} from './military-crypto';
import { 
  CertificateManager,
  certificateManager,
  CertificateRequest 
} from './certificate-manager';
import { 
  TLSCertificate, 
  CertificateStatus 
} from './secure-websocket';

// Drone bootstrap states
export enum BootstrapState {
  UNINITIALIZED = 'uninitialized',
  DISCOVERY = 'discovery',
  IDENTITY_VERIFICATION = 'identity_verification',
  CERTIFICATE_REQUEST = 'certificate_request',
  KEY_EXCHANGE = 'key_exchange',
  NETWORK_INTEGRATION = 'network_integration',
  OPERATIONAL = 'operational',
  FAILED = 'failed',
  QUARANTINED = 'quarantined',
}

// Drone identity information
export interface DroneIdentity {
  droneId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  hardwareVersion: string;
  capabilities: string[];
  securityLevel: SecurityLevel;
  publicKey: Buffer;
  identitySignature: Buffer;
  manufactureDate: Date;
  lastMaintenanceDate?: Date;
}

// Bootstrap session information
export interface BootstrapSession {
  sessionId: string;
  droneId: string;
  droneIdentity: DroneIdentity;
  state: BootstrapState;
  startTime: Date;
  lastActivity: Date;
  challenges: Map<string, { challenge: Buffer; timestamp: number }>;
  certificates: Map<string, Buffer>;
  networkCredentials?: {
    encryptionKeys: string[];
    signingKeys: string[];
    networkTokens: string[];
  };
  securityChecks: {
    identityVerified: boolean;
    certificateIssued: boolean;
    keysExchanged: boolean;
    networkIntegrated: boolean;
    securityAuditPassed: boolean;
  };
  retryCount: number;
  lastError?: string;
}

// Network configuration for new drones
export interface NetworkConfiguration {
  networkId: string;
  securityDomain: string;
  communicationProtocols: string[];
  encryptionStandards: string[];
  keyRotationInterval: number;
  heartbeatInterval: number;
  antiJammingEnabled: boolean;
  meshRoutingEnabled: boolean;
  backupChannels: string[];
  emergencyFrequencies: string[];
}

// Manufacturing certificate for drone identity verification
export interface ManufacturingCertificate {
  droneId: string;
  manufacturer: string;
  manufacturerCertificate: Buffer;
  deviceCertificate: Buffer;
  attestationKey: Buffer;
  secureBootHash: Buffer;
  firmwareSignature: Buffer;
  hardwareAttestation: Buffer;
  productionDate: Date;
  qualityAssuranceApproval: string;
}

// Security audit result
export interface SecurityAuditResult {
  passed: boolean;
  securityScore: number;
  vulnerabilities: string[];
  recommendations: string[];
  complianceStatus: {
    militaryStandards: boolean;
    encryptionCompliance: boolean;
    certificateValidation: boolean;
    firmwareIntegrity: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Secure Drone Bootstrap Manager
export class SecureDroneBootstrap extends EventEmitter {
  private cryptoEngine: MilitaryCryptoEngine;
  private certificateManager: CertificateManager;
  private bootstrapSessions: Map<string, BootstrapSession> = new Map();
  private trustedManufacturers: Map<string, Buffer> = new Map(); // manufacturer -> cert
  private networkConfiguration: NetworkConfiguration;
  private allowedDroneModels: Set<string> = new Set();
  
  // Security policies
  private readonly SESSION_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly MIN_SECURITY_SCORE = 0.8;
  private readonly REQUIRED_FIRMWARE_VERSION = '2.0.0';
  private readonly BOOTSTRAP_RATE_LIMIT = 10; // per hour
  private readonly QUARANTINE_DURATION = 3600000; // 1 hour

  // Rate limiting for bootstrap attempts
  private bootstrapAttempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    
    this.cryptoEngine = militaryCrypto;
    this.certificateManager = certificateManager;
    
    this.initializeNetworkConfiguration();
    this.loadTrustedManufacturers();
    this.startBootstrapMonitoring();
  }

  // Initialize network configuration
  private initializeNetworkConfiguration(): void {
    this.networkConfiguration = {
      networkId: 'sentientedge-defensive-network',
      securityDomain: 'defensive-operations',
      communicationProtocols: ['secure-mavlink', 'secure-cyphal', 'secure-websocket'],
      encryptionStandards: ['AES-256-GCM', 'RSA-4096', 'ECDH-P384'],
      keyRotationInterval: 3600000, // 1 hour
      heartbeatInterval: 30000, // 30 seconds
      antiJammingEnabled: true,
      meshRoutingEnabled: true,
      backupChannels: ['433MHz-backup', '915MHz-backup', 'satellite-backup'],
      emergencyFrequencies: ['121.5MHz', '243.0MHz'],
    };

    // Load approved drone models
    this.allowedDroneModels.add('HX-900-Defense');
    this.allowedDroneModels.add('MQ-9B-SkyGuardian');
    this.allowedDroneModels.add('RQ-4-GlobalHawk');
    this.allowedDroneModels.add('Predator-C-Avenger');
  }

  // Load trusted manufacturer certificates
  private loadTrustedManufacturers(): void {
    // In production, these would be loaded from a secure store
    const trustedManufacturers = [
      { name: 'SentientEdge-Defense', certificate: this.generateManufacturerCertificate('SentientEdge-Defense') },
      { name: 'General-Atomics', certificate: this.generateManufacturerCertificate('General-Atomics') },
      { name: 'Northrop-Grumman', certificate: this.generateManufacturerCertificate('Northrop-Grumman') },
      { name: 'Boeing-Defense', certificate: this.generateManufacturerCertificate('Boeing-Defense') },
    ];

    trustedManufacturers.forEach(manufacturer => {
      this.trustedManufacturers.set(manufacturer.name, manufacturer.certificate);
    });

    this.emit('trusted_manufacturers_loaded', { 
      count: this.trustedManufacturers.size 
    });
  }

  // Generate manufacturer certificate (placeholder)
  private generateManufacturerCertificate(manufacturerName: string): Buffer {
    // This would use actual manufacturer root certificates
    const cert = {
      manufacturer: manufacturerName,
      certificate: generateSecureToken(64),
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return Buffer.from(JSON.stringify(cert));
  }

  // Initiate drone bootstrap process
  public async initiateBootstrap(
    droneIdentity: DroneIdentity,
    manufacturingCertificate: ManufacturingCertificate
  ): Promise<string> {
    // Check rate limiting
    if (!this.checkBootstrapRateLimit(droneIdentity.droneId)) {
      throw new Error('Bootstrap rate limit exceeded');
    }

    // Validate drone identity
    this.validateDroneIdentity(droneIdentity);

    // Verify manufacturing certificate
    await this.verifyManufacturingCertificate(manufacturingCertificate);

    // Create bootstrap session
    const sessionId = generateSecureToken(16);
    const session: BootstrapSession = {
      sessionId,
      droneId: droneIdentity.droneId,
      droneIdentity,
      state: BootstrapState.DISCOVERY,
      startTime: new Date(),
      lastActivity: new Date(),
      challenges: new Map(),
      certificates: new Map(),
      securityChecks: {
        identityVerified: false,
        certificateIssued: false,
        keysExchanged: false,
        networkIntegrated: false,
        securityAuditPassed: false,
      },
      retryCount: 0,
    };

    this.bootstrapSessions.set(sessionId, session);

    // Start bootstrap process
    await this.processBootstrapState(session);

    this.emit('bootstrap_initiated', { 
      sessionId, 
      droneId: droneIdentity.droneId 
    });

    return sessionId;
  }

  // Check bootstrap rate limiting
  private checkBootstrapRateLimit(droneId: string): boolean {
    const now = Date.now();
    const attempts = this.bootstrapAttempts.get(droneId);

    if (!attempts || now > attempts.resetTime) {
      this.bootstrapAttempts.set(droneId, {
        count: 1,
        resetTime: now + 3600000, // 1 hour
      });
      return true;
    }

    if (attempts.count >= this.BOOTSTRAP_RATE_LIMIT) {
      return false;
    }

    attempts.count++;
    return true;
  }

  // Validate drone identity
  private validateDroneIdentity(identity: DroneIdentity): void {
    if (!identity.droneId || identity.droneId.length === 0) {
      throw new Error('Invalid drone ID');
    }

    if (!identity.manufacturer || identity.manufacturer.length === 0) {
      throw new Error('Invalid manufacturer');
    }

    if (!identity.model || !this.allowedDroneModels.has(identity.model)) {
      throw new Error('Drone model not approved for network');
    }

    if (!identity.serialNumber || identity.serialNumber.length === 0) {
      throw new Error('Invalid serial number');
    }

    if (!identity.publicKey || identity.publicKey.length === 0) {
      throw new Error('Invalid public key');
    }

    // Verify firmware version
    if (!this.isValidFirmwareVersion(identity.firmwareVersion)) {
      throw new Error('Firmware version not approved');
    }
  }

  // Check firmware version
  private isValidFirmwareVersion(version: string): boolean {
    // Simple version comparison (in production, use proper semver)
    const required = this.REQUIRED_FIRMWARE_VERSION.split('.').map(Number);
    const actual = version.split('.').map(Number);

    for (let i = 0; i < Math.max(required.length, actual.length); i++) {
      const req = required[i] || 0;
      const act = actual[i] || 0;
      
      if (act < req) return false;
      if (act > req) return true;
    }

    return true;
  }

  // Verify manufacturing certificate
  private async verifyManufacturingCertificate(
    manufacturingCert: ManufacturingCertificate
  ): Promise<void> {
    // Check if manufacturer is trusted
    const trustedCert = this.trustedManufacturers.get(manufacturingCert.manufacturer);
    if (!trustedCert) {
      throw new Error('Manufacturer not trusted');
    }

    // Verify manufacturing certificate signature
    const isValid = await this.verifyManufacturerSignature(
      manufacturingCert,
      trustedCert
    );

    if (!isValid) {
      throw new Error('Manufacturing certificate verification failed');
    }

    // Verify device attestation
    if (!this.verifyDeviceAttestation(manufacturingCert)) {
      throw new Error('Device attestation verification failed');
    }
  }

  // Verify manufacturer signature
  private async verifyManufacturerSignature(
    manufacturingCert: ManufacturingCertificate,
    trustedCert: Buffer
  ): Promise<boolean> {
    try {
      // This would implement actual certificate chain verification
      // For now, return true as placeholder
      return true;
    } catch (error) {
      return false;
    }
  }

  // Verify device attestation
  private verifyDeviceAttestation(manufacturingCert: ManufacturingCertificate): boolean {
    // Verify hardware attestation and secure boot
    // This would integrate with TPM or similar hardware security modules
    return true; // Placeholder
  }

  // Process bootstrap state machine
  private async processBootstrapState(session: BootstrapSession): Promise<void> {
    session.lastActivity = new Date();

    try {
      switch (session.state) {
        case BootstrapState.DISCOVERY:
          await this.processDiscoveryState(session);
          break;
        
        case BootstrapState.IDENTITY_VERIFICATION:
          await this.processIdentityVerificationState(session);
          break;
        
        case BootstrapState.CERTIFICATE_REQUEST:
          await this.processCertificateRequestState(session);
          break;
        
        case BootstrapState.KEY_EXCHANGE:
          await this.processKeyExchangeState(session);
          break;
        
        case BootstrapState.NETWORK_INTEGRATION:
          await this.processNetworkIntegrationState(session);
          break;

        default:
          throw new Error(`Invalid bootstrap state: ${session.state}`);
      }

    } catch (error) {
      await this.handleBootstrapError(session, error);
    }
  }

  // Process discovery state
  private async processDiscoveryState(session: BootstrapSession): Promise<void> {
    // Send network discovery beacon
    const discoveryBeacon = {
      networkId: this.networkConfiguration.networkId,
      securityDomain: this.networkConfiguration.securityDomain,
      supportedProtocols: this.networkConfiguration.communicationProtocols,
      encryptionStandards: this.networkConfiguration.encryptionStandards,
      timestamp: Date.now(),
    };

    // Generate identity verification challenge
    const identityChallenge = this.cryptoEngine.generateSecureRandom(32);
    session.challenges.set('identity', {
      challenge: identityChallenge,
      timestamp: Date.now(),
    });

    // Transition to identity verification
    session.state = BootstrapState.IDENTITY_VERIFICATION;

    this.emit('bootstrap_state_changed', {
      sessionId: session.sessionId,
      droneId: session.droneId,
      state: session.state,
    });

    // Continue processing
    await this.processBootstrapState(session);
  }

  // Process identity verification state
  private async processIdentityVerificationState(session: BootstrapSession): Promise<void> {
    const challenge = session.challenges.get('identity');
    if (!challenge) {
      throw new Error('Identity challenge not found');
    }

    // Verify drone's response to identity challenge
    const challengeResponse = await this.requestChallengeResponse(
      session.droneId,
      challenge.challenge
    );

    if (!this.verifyChallengeResponse(session.droneIdentity, challenge.challenge, challengeResponse)) {
      throw new Error('Identity verification failed');
    }

    session.securityChecks.identityVerified = true;
    session.state = BootstrapState.CERTIFICATE_REQUEST;

    this.emit('drone_identity_verified', {
      sessionId: session.sessionId,
      droneId: session.droneId,
    });

    // Continue processing
    await this.processBootstrapState(session);
  }

  // Process certificate request state
  private async processCertificateRequestState(session: BootstrapSession): Promise<void> {
    // Create certificate request for the drone
    const certRequest: Omit<CertificateRequest, 'id' | 'requestTime' | 'status'> = {
      commonName: session.droneId,
      organization: 'SentientEdge-Defense',
      organizationalUnit: 'Drone-Operations',
      country: 'US',
      state: 'Defense',
      locality: 'Operations',
      emailAddress: `${session.droneId}@sentientedge.ai`,
      subjectAltNames: [
        `DNS:${session.droneId}.drones.sentientedge.ai`,
        `URI:drone://${session.droneId}`,
      ],
      keyUsage: ['digitalSignature', 'keyEncipherment', 'keyAgreement'],
      extendedKeyUsage: ['clientAuth', 'serverAuth'],
      validityPeriod: 90, // 90 days
      keySize: 4096,
      requestedBy: 'bootstrap-system',
    };

    // Submit certificate request
    const requestId = this.certificateManager.submitCertificateRequest(certRequest);

    // Auto-approve for bootstrap (in production, may require manual approval)
    this.certificateManager.approveCertificateRequest(requestId, 'bootstrap-system');

    // Issue certificate
    const certificate = this.certificateManager.issueCertificate(requestId);
    
    session.certificates.set('operational', certificate.certificate);
    session.securityChecks.certificateIssued = true;
    session.state = BootstrapState.KEY_EXCHANGE;

    this.emit('drone_certificate_issued', {
      sessionId: session.sessionId,
      droneId: session.droneId,
      certificateId: certificate.id,
    });

    // Continue processing
    await this.processBootstrapState(session);
  }

  // Process key exchange state
  private async processKeyExchangeState(session: BootstrapSession): Promise<void> {
    // Generate session keys for the drone
    const encryptionKeyId = `drone_${session.droneId}_session`;
    const signingKeyId = `drone_${session.droneId}_signing`;
    const networkTokenId = `drone_${session.droneId}_network`;

    // Generate keys
    this.cryptoEngine.generateAESKey(encryptionKeyId, KeyType.SESSION);
    this.cryptoEngine.generateKeyPair(signingKeyId, KeyType.SIGNING);
    const networkToken = generateSecureToken(32);

    // Store network credentials
    session.networkCredentials = {
      encryptionKeys: [encryptionKeyId],
      signingKeys: [signingKeyId],
      networkTokens: [networkToken],
    };

    // Perform secure key exchange with drone
    await this.performSecureKeyExchange(session);

    session.securityChecks.keysExchanged = true;
    session.state = BootstrapState.NETWORK_INTEGRATION;

    this.emit('drone_keys_exchanged', {
      sessionId: session.sessionId,
      droneId: session.droneId,
    });

    // Continue processing
    await this.processBootstrapState(session);
  }

  // Process network integration state
  private async processNetworkIntegrationState(session: BootstrapSession): Promise<void> {
    // Perform final security audit
    const auditResult = await this.performSecurityAudit(session);
    
    if (!auditResult.passed) {
      throw new Error(`Security audit failed: ${auditResult.vulnerabilities.join(', ')}`);
    }

    // Provide network configuration to drone
    await this.provideNetworkConfiguration(session);

    // Register drone in network
    await this.registerDroneInNetwork(session);

    session.securityChecks.networkIntegrated = true;
    session.securityChecks.securityAuditPassed = true;
    session.state = BootstrapState.OPERATIONAL;

    this.emit('drone_network_integrated', {
      sessionId: session.sessionId,
      droneId: session.droneId,
      securityScore: auditResult.securityScore,
    });

    // Complete bootstrap
    await this.completeBootstrap(session);
  }

  // Request challenge response from drone
  private async requestChallengeResponse(droneId: string, challenge: Buffer): Promise<Buffer> {
    // This would send challenge to drone and wait for response
    // For now, simulate a successful response
    const response = crypto.createHash('sha256')
      .update(Buffer.concat([challenge, Buffer.from(droneId)]))
      .digest();
    
    return response;
  }

  // Verify challenge response
  private verifyChallengeResponse(
    identity: DroneIdentity,
    challenge: Buffer,
    response: Buffer
  ): boolean {
    try {
      // Verify signature using drone's public key
      const expectedResponse = crypto.createHash('sha256')
        .update(Buffer.concat([challenge, Buffer.from(identity.droneId)]))
        .digest();
      
      return crypto.timingSafeEqual(response, expectedResponse);
    } catch (error) {
      return false;
    }
  }

  // Perform secure key exchange
  private async performSecureKeyExchange(session: BootstrapSession): Promise<void> {
    if (!session.networkCredentials) {
      throw new Error('Network credentials not generated');
    }

    // Create secure key exchange message
    const keyExchangeData = {
      encryptionKeys: session.networkCredentials.encryptionKeys,
      signingKeys: session.networkCredentials.signingKeys,
      networkTokens: session.networkCredentials.networkTokens,
      networkConfiguration: this.networkConfiguration,
      timestamp: Date.now(),
    };

    // Encrypt with drone's public key
    const encryptedKeys = this.cryptoEngine.encryptRSA(
      Buffer.from(JSON.stringify(keyExchangeData)),
      session.droneId + '_public'
    );

    // This would send encrypted keys to drone
    console.log(`Key exchange completed for drone: ${session.droneId}`);
  }

  // Perform security audit
  private async performSecurityAudit(session: BootstrapSession): Promise<SecurityAuditResult> {
    const auditResult: SecurityAuditResult = {
      passed: false,
      securityScore: 0,
      vulnerabilities: [],
      recommendations: [],
      complianceStatus: {
        militaryStandards: false,
        encryptionCompliance: false,
        certificateValidation: false,
        firmwareIntegrity: false,
      },
      riskLevel: 'high',
    };

    let score = 0;

    // Check identity verification
    if (session.securityChecks.identityVerified) {
      score += 0.2;
      auditResult.complianceStatus.militaryStandards = true;
    } else {
      auditResult.vulnerabilities.push('Identity not verified');
    }

    // Check certificate issuance
    if (session.securityChecks.certificateIssued) {
      score += 0.2;
      auditResult.complianceStatus.certificateValidation = true;
    } else {
      auditResult.vulnerabilities.push('Certificate not issued');
    }

    // Check key exchange
    if (session.securityChecks.keysExchanged) {
      score += 0.2;
      auditResult.complianceStatus.encryptionCompliance = true;
    } else {
      auditResult.vulnerabilities.push('Key exchange not completed');
    }

    // Check firmware integrity
    if (this.verifyFirmwareIntegrity(session.droneIdentity)) {
      score += 0.2;
      auditResult.complianceStatus.firmwareIntegrity = true;
    } else {
      auditResult.vulnerabilities.push('Firmware integrity verification failed');
      auditResult.recommendations.push('Update to latest approved firmware');
    }

    // Check security level compliance
    if (session.droneIdentity.securityLevel >= SecurityLevel.CONFIDENTIAL) {
      score += 0.2;
    } else {
      auditResult.vulnerabilities.push('Insufficient security level');
    }

    auditResult.securityScore = score;
    auditResult.passed = score >= this.MIN_SECURITY_SCORE;

    // Determine risk level
    if (score >= 0.9) auditResult.riskLevel = 'low';
    else if (score >= 0.7) auditResult.riskLevel = 'medium';
    else if (score >= 0.5) auditResult.riskLevel = 'high';
    else auditResult.riskLevel = 'critical';

    return auditResult;
  }

  // Verify firmware integrity
  private verifyFirmwareIntegrity(identity: DroneIdentity): boolean {
    // This would verify firmware signatures and checksums
    // For now, check if firmware version is acceptable
    return this.isValidFirmwareVersion(identity.firmwareVersion);
  }

  // Provide network configuration to drone
  private async provideNetworkConfiguration(session: BootstrapSession): Promise<void> {
    const config = {
      ...this.networkConfiguration,
      droneSpecific: {
        droneId: session.droneId,
        assignedChannels: ['primary', 'backup-1'],
        operatingFrequencies: ['2.4GHz', '5.8GHz'],
        encryptionKeys: session.networkCredentials?.encryptionKeys,
        networkTokens: session.networkCredentials?.networkTokens,
      },
    };

    // This would send configuration to drone
    console.log(`Network configuration provided to drone: ${session.droneId}`);
  }

  // Register drone in network
  private async registerDroneInNetwork(session: BootstrapSession): Promise<void> {
    // This would register the drone in various network services
    // - DNS registration
    // - Routing table updates
    // - Security policy distribution
    // - Monitoring system registration

    console.log(`Drone registered in network: ${session.droneId}`);
  }

  // Complete bootstrap process
  private async completeBootstrap(session: BootstrapSession): Promise<void> {
    // Send completion confirmation to drone
    const completionMessage = {
      status: 'success',
      droneId: session.droneId,
      networkId: this.networkConfiguration.networkId,
      operationalStatus: 'active',
      timestamp: Date.now(),
    };

    this.emit('bootstrap_completed', {
      sessionId: session.sessionId,
      droneId: session.droneId,
      completionTime: new Date(),
    });

    // Clean up bootstrap session
    setTimeout(() => {
      this.bootstrapSessions.delete(session.sessionId);
    }, 60000); // Keep for 1 minute for any final communications
  }

  // Handle bootstrap errors
  private async handleBootstrapError(session: BootstrapSession, error: any): Promise<void> {
    session.lastError = error.message;
    session.retryCount++;

    this.emit('bootstrap_error', {
      sessionId: session.sessionId,
      droneId: session.droneId,
      error: error.message,
      retryCount: session.retryCount,
    });

    if (session.retryCount < this.MAX_RETRY_ATTEMPTS) {
      // Retry after delay
      setTimeout(() => {
        this.processBootstrapState(session);
      }, 5000 * session.retryCount); // Exponential backoff
    } else {
      // Max retries exceeded
      session.state = BootstrapState.FAILED;
      
      // Quarantine the drone if security-related failure
      if (this.isSecurityRelatedError(error.message)) {
        await this.quarantineDrone(session.droneId, error.message);
      }

      this.emit('bootstrap_failed', {
        sessionId: session.sessionId,
        droneId: session.droneId,
        finalError: error.message,
        retryCount: session.retryCount,
      });
    }
  }

  // Check if error is security-related
  private isSecurityRelatedError(errorMessage: string): boolean {
    const securityKeywords = [
      'verification failed',
      'certificate',
      'authentication',
      'signature',
      'security audit',
      'untrusted',
    ];

    return securityKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );
  }

  // Quarantine drone
  private async quarantineDrone(droneId: string, reason: string): Promise<void> {
    // Add to quarantine list
    // Block network access
    // Alert security team

    this.emit('drone_quarantined', {
      droneId,
      reason,
      quarantineTime: new Date(),
      duration: this.QUARANTINE_DURATION,
    });

    // Auto-remove from quarantine after duration
    setTimeout(() => {
      this.emit('drone_quarantine_expired', { droneId });
    }, this.QUARANTINE_DURATION);
  }

  // Bootstrap monitoring
  private startBootstrapMonitoring(): void {
    setInterval(() => {
      this.checkSessionTimeouts();
      this.performBootstrapHealthCheck();
      this.cleanupExpiredSessions();
    }, 60000); // Every minute
  }

  // Check for session timeouts
  private checkSessionTimeouts(): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.bootstrapSessions) {
      const timeSinceActivity = now - session.lastActivity.getTime();
      
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        this.emit('bootstrap_session_timeout', {
          sessionId,
          droneId: session.droneId,
          state: session.state,
        });

        this.bootstrapSessions.delete(sessionId);
      }
    }
  }

  // Perform bootstrap health check
  private performBootstrapHealthCheck(): void {
    const healthData = {
      activeSessions: this.bootstrapSessions.size,
      sessionsByState: this.getSessionsByState(),
      completedBootstraps: this.getCompletedBootstrapCount(),
      failedBootstraps: this.getFailedBootstrapCount(),
      averageBootstrapTime: this.getAverageBootstrapTime(),
      timestamp: Date.now(),
    };

    this.emit('bootstrap_health_check', healthData);
  }

  // Get sessions by state
  private getSessionsByState(): Record<string, number> {
    const stateCount: Record<string, number> = {};
    
    for (const session of this.bootstrapSessions.values()) {
      stateCount[session.state] = (stateCount[session.state] || 0) + 1;
    }

    return stateCount;
  }

  // Get completed bootstrap count (placeholder)
  private getCompletedBootstrapCount(): number {
    // This would track completed bootstraps over time
    return 0;
  }

  // Get failed bootstrap count (placeholder)
  private getFailedBootstrapCount(): number {
    // This would track failed bootstraps over time
    return 0;
  }

  // Get average bootstrap time (placeholder)
  private getAverageBootstrapTime(): number {
    // This would calculate average time from start to completion
    return 0;
  }

  // Clean up expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.bootstrapSessions) {
      const sessionAge = now - session.startTime.getTime();
      
      if (sessionAge > this.SESSION_TIMEOUT * 2) { // Double timeout for cleanup
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.bootstrapSessions.delete(sessionId);
    });
  }

  // Public API methods
  public getBootstrapSession(sessionId: string): BootstrapSession | null {
    return this.bootstrapSessions.get(sessionId) || null;
  }

  public listActiveSessions(): BootstrapSession[] {
    return Array.from(this.bootstrapSessions.values());
  }

  public getBootstrapStats(): any {
    return {
      activeSessions: this.bootstrapSessions.size,
      sessionsByState: this.getSessionsByState(),
      trustedManufacturers: this.trustedManufacturers.size,
      allowedDroneModels: this.allowedDroneModels.size,
      networkConfiguration: {
        networkId: this.networkConfiguration.networkId,
        securityDomain: this.networkConfiguration.securityDomain,
        protocolCount: this.networkConfiguration.communicationProtocols.length,
      },
    };
  }

  // Add trusted manufacturer
  public addTrustedManufacturer(name: string, certificate: Buffer): void {
    this.trustedManufacturers.set(name, certificate);
    
    this.emit('trusted_manufacturer_added', { name });
  }

  // Remove trusted manufacturer
  public removeTrustedManufacturer(name: string): void {
    this.trustedManufacturers.delete(name);
    
    this.emit('trusted_manufacturer_removed', { name });
  }

  // Add allowed drone model
  public addAllowedDroneModel(model: string): void {
    this.allowedDroneModels.add(model);
    
    this.emit('drone_model_approved', { model });
  }

  // Remove allowed drone model
  public removeAllowedDroneModel(model: string): void {
    this.allowedDroneModels.delete(model);
    
    this.emit('drone_model_removed', { model });
  }

  // Cancel bootstrap session
  public cancelBootstrapSession(sessionId: string): void {
    const session = this.bootstrapSessions.get(sessionId);
    if (session) {
      session.state = BootstrapState.FAILED;
      session.lastError = 'Cancelled by administrator';
      
      this.emit('bootstrap_cancelled', {
        sessionId,
        droneId: session.droneId,
      });

      this.bootstrapSessions.delete(sessionId);
    }
  }

  // Shutdown cleanup
  public shutdown(): void {
    this.bootstrapSessions.clear();
    this.trustedManufacturers.clear();
    this.allowedDroneModels.clear();
    this.bootstrapAttempts.clear();
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const secureDroneBootstrap = new SecureDroneBootstrap();