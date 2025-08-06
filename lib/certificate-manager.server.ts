// Military-Grade Certificate Lifecycle Management System
// Provides comprehensive PKI infrastructure for secure drone communications

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { 
  TLSCertificate, 
  CertificateAuthority 
} from './secure-websocket';
import { 
  CertificateStatus,
  generateSecureToken,
  militaryCrypto 
} from './military-crypto';

// Certificate request interface
export interface CertificateRequest {
  id: string;
  commonName: string;
  organization: string;
  organizationalUnit?: string;
  country: string;
  state?: string;
  locality?: string;
  emailAddress?: string;
  subjectAltNames: string[];
  keyUsage: string[];
  extendedKeyUsage: string[];
  validityPeriod: number; // days
  keySize: number;
  requestedBy: string;
  requestTime: Date;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  approvedBy?: string;
  approvalTime?: Date;
  publicKey?: Buffer;
  csr?: Buffer; // Certificate Signing Request
}

// Certificate revocation list entry
export interface CRLEntry {
  serialNumber: string;
  revocationDate: Date;
  reason: CertificateRevocationReason;
  revokedBy: string;
}

// Certificate revocation reasons (RFC 5280)
export enum CertificateRevocationReason {
  UNSPECIFIED = 0,
  KEY_COMPROMISE = 1,
  CA_COMPROMISE = 2,
  AFFILIATION_CHANGED = 3,
  SUPERSEDED = 4,
  CESSATION_OF_OPERATION = 5,
  CERTIFICATE_HOLD = 6,
  REMOVE_FROM_CRL = 8,
  PRIVILEGE_WITHDRAWN = 9,
  AA_COMPROMISE = 10,
}

// Certificate chain validation result
export interface CertificateValidationResult {
  valid: boolean;
  certificateStatus: CertificateStatus;
  chainTrusted: boolean;
  notBefore: Date;
  notAfter: Date;
  issuer: string;
  subject: string;
  keyUsageValid: boolean;
  extendedKeyUsageValid: boolean;
  revocationStatus: 'not_revoked' | 'revoked' | 'unknown';
  validationErrors: string[];
  trustScore: number; // 0-1
}

// OCSP (Online Certificate Status Protocol) response
export interface OCSPResponse {
  serialNumber: string;
  status: 'good' | 'revoked' | 'unknown';
  thisUpdate: Date;
  nextUpdate: Date;
  revocationTime?: Date;
  revocationReason?: CertificateRevocationReason;
}

// Certificate store interface
export interface CertificateStore {
  certificates: Map<string, TLSCertificate>;
  certificateRequests: Map<string, CertificateRequest>;
  revocationList: Map<string, CRLEntry>;
  trustedCAs: Map<string, CertificateAuthority>;
  intermediateCAs: Map<string, CertificateAuthority>;
}

// Certificate lifecycle management system
export class CertificateManager extends EventEmitter {
  private certificateStore: CertificateStore;
  private rootCA: CertificateAuthority | null = null;
  private intermediateCAs: Map<string, CertificateAuthority> = new Map();
  private serialNumberCounter: number = 1;
  
  // Certificate validation cache
  private validationCache: Map<string, { result: CertificateValidationResult; timestamp: number }> = new Map();
  private readonly VALIDATION_CACHE_TTL = 300000; // 5 minutes

  // Security policies
  private readonly MIN_KEY_SIZE = 2048;
  private readonly MAX_VALIDITY_PERIOD = 365; // days
  private readonly DEFAULT_VALIDITY_PERIOD = 90; // days
  private readonly CRL_UPDATE_INTERVAL = 86400000; // 24 hours
  private readonly CERT_ROTATION_WARNING_DAYS = 30;

  constructor() {
    super();
    
    this.certificateStore = {
      certificates: new Map(),
      certificateRequests: new Map(),
      revocationList: new Map(),
      trustedCAs: new Map(),
      intermediateCAs: new Map(),
    };

    this.initializeRootCA();
    this.startCertificateLifecycleMonitoring();
  }

  // Initialize Root Certificate Authority
  private initializeRootCA(): void {
    // Generate root CA key pair
    const rootKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create root CA certificate
    const rootCert = this.createRootCACertificate(rootKeyPair);

    this.rootCA = {
      id: 'root-ca-' + generateSecureToken(8),
      name: 'SentientEdge Root CA',
      certificate: Buffer.from(rootCert),
      privateKey: Buffer.from(rootKeyPair.privateKey),
      serialNumber: this.getNextSerialNumber(),
      validFrom: new Date(),
      validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
      isRoot: true,
    };

    this.certificateStore.trustedCAs.set(this.rootCA.id, this.rootCA);

    // Create intermediate CA for issuing end-entity certificates
    this.createIntermediateCA('operations', 'SentientEdge Operations CA');

    this.emit('root_ca_initialized', { 
      caId: this.rootCA.id,
      validTo: this.rootCA.validTo 
    });
  }

  // Create intermediate CA
  private createIntermediateCA(name: string, commonName: string): CertificateAuthority {
    if (!this.rootCA) {
      throw new Error('Root CA not initialized');
    }

    // Generate intermediate CA key pair
    const intermediateKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create intermediate CA certificate signed by root CA
    const intermediateCert = this.createIntermediateCACertificate(
      intermediateKeyPair,
      commonName,
      this.rootCA
    );

    const intermediateCA: CertificateAuthority = {
      id: `intermediate-ca-${name}-` + generateSecureToken(8),
      name: commonName,
      certificate: Buffer.from(intermediateCert),
      privateKey: Buffer.from(intermediateKeyPair.privateKey),
      serialNumber: this.getNextSerialNumber(),
      validFrom: new Date(),
      validTo: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
      isRoot: false,
    };

    this.intermediateCAs.set(intermediateCA.id, intermediateCA);
    this.certificateStore.intermediateCAs.set(intermediateCA.id, intermediateCA);

    this.emit('intermediate_ca_created', { 
      caId: intermediateCA.id,
      name: commonName 
    });

    return intermediateCA;
  }

  // Create root CA certificate
  private createRootCACertificate(keyPair: crypto.KeyPairSyncResult<string, string>): string {
    const cert = {
      version: 3,
      serialNumber: this.getNextSerialNumber().toString(),
      issuer: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      subject: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      publicKey: keyPair.publicKey,
      keyUsage: ['digitalSignature', 'keyCertSign', 'cRLSign'],
      basicConstraints: { isCA: true, pathLength: 1 },
      subjectKeyIdentifier: this.generateSubjectKeyIdentifier(keyPair.publicKey),
      authorityKeyIdentifier: this.generateSubjectKeyIdentifier(keyPair.publicKey),
    };

    // Self-sign the root certificate
    const certData = this.serializeCertificateData(cert);
    const signature = crypto.sign('sha256', Buffer.from(certData), keyPair.privateKey);
    
    return JSON.stringify({ ...cert, signature: signature.toString('base64') });
  }

  // Create intermediate CA certificate
  private createIntermediateCACertificate(
    keyPair: crypto.KeyPairSyncResult<string, string>,
    commonName: string,
    issuerCA: CertificateAuthority
  ): string {
    const cert = {
      version: 3,
      serialNumber: this.getNextSerialNumber().toString(),
      issuer: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      subject: `CN=${commonName},O=SentientEdge,C=US`,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      publicKey: keyPair.publicKey,
      keyUsage: ['digitalSignature', 'keyCertSign', 'cRLSign'],
      basicConstraints: { isCA: true, pathLength: 0 },
      subjectKeyIdentifier: this.generateSubjectKeyIdentifier(keyPair.publicKey),
      authorityKeyIdentifier: this.generateAuthorityKeyIdentifier(issuerCA.certificate),
    };

    // Sign with issuer CA private key
    const certData = this.serializeCertificateData(cert);
    const signature = crypto.sign('sha256', Buffer.from(certData), issuerCA.privateKey);
    
    return JSON.stringify({ ...cert, signature: signature.toString('base64') });
  }

  // Submit certificate request
  public submitCertificateRequest(request: Omit<CertificateRequest, 'id' | 'requestTime' | 'status'>): string {
    // Validate request
    this.validateCertificateRequest(request);

    const certRequest: CertificateRequest = {
      ...request,
      id: 'cert-req-' + generateSecureToken(8),
      requestTime: new Date(),
      status: 'pending',
      validityPeriod: Math.min(request.validityPeriod, this.MAX_VALIDITY_PERIOD),
      keySize: Math.max(request.keySize, this.MIN_KEY_SIZE),
    };

    this.certificateStore.certificateRequests.set(certRequest.id, certRequest);

    this.emit('certificate_request_submitted', { 
      requestId: certRequest.id,
      commonName: certRequest.commonName 
    });

    return certRequest.id;
  }

  // Validate certificate request
  private validateCertificateRequest(request: Partial<CertificateRequest>): void {
    if (!request.commonName || request.commonName.length === 0) {
      throw new Error('Common name is required');
    }

    if (!request.organization || request.organization.length === 0) {
      throw new Error('Organization is required');
    }

    if (!request.country || request.country.length !== 2) {
      throw new Error('Valid 2-letter country code is required');
    }

    if (request.keySize && request.keySize < this.MIN_KEY_SIZE) {
      throw new Error(`Key size must be at least ${this.MIN_KEY_SIZE} bits`);
    }

    if (request.validityPeriod && request.validityPeriod > this.MAX_VALIDITY_PERIOD) {
      throw new Error(`Validity period cannot exceed ${this.MAX_VALIDITY_PERIOD} days`);
    }

    if (!request.keyUsage || request.keyUsage.length === 0) {
      throw new Error('At least one key usage must be specified');
    }
  }

  // Approve certificate request
  public approveCertificateRequest(requestId: string, approvedBy: string): void {
    const request = this.certificateStore.certificateRequests.get(requestId);
    if (!request) {
      throw new Error(`Certificate request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request in status: ${request.status}`);
    }

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvalTime = new Date();

    this.emit('certificate_request_approved', { 
      requestId,
      approvedBy 
    });

    // Automatically issue the certificate
    this.issueCertificate(requestId);
  }

  // Issue certificate from approved request
  public issueCertificate(requestId: string): TLSCertificate {
    const request = this.certificateStore.certificateRequests.get(requestId);
    if (!request) {
      throw new Error(`Certificate request not found: ${requestId}`);
    }

    if (request.status !== 'approved') {
      throw new Error(`Cannot issue certificate for request in status: ${request.status}`);
    }

    // Generate key pair for the certificate
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: request.keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Select appropriate issuing CA (use intermediate CA for end-entity certificates)
    const issuerCA = Array.from(this.intermediateCAs.values())[0] || this.rootCA;
    if (!issuerCA) {
      throw new Error('No issuing CA available');
    }

    // Create the certificate
    const cert = this.createEndEntityCertificate(keyPair, request, issuerCA);
    
    const certificate: TLSCertificate = {
      id: 'cert-' + generateSecureToken(8),
      commonName: request.commonName,
      organization: request.organization,
      country: request.country,
      validFrom: new Date(),
      validTo: new Date(Date.now() + request.validityPeriod * 24 * 60 * 60 * 1000),
      keyUsage: request.keyUsage,
      subjectAltNames: request.subjectAltNames,
      publicKey: Buffer.from(keyPair.publicKey),
      privateKey: Buffer.from(keyPair.privateKey),
      certificate: Buffer.from(cert),
      status: CertificateStatus.VALID,
      fingerprint: this.calculateCertificateFingerprint(Buffer.from(cert)),
    };

    this.certificateStore.certificates.set(certificate.id, certificate);
    request.status = 'issued';

    this.emit('certificate_issued', { 
      certificateId: certificate.id,
      requestId,
      commonName: certificate.commonName 
    });

    return certificate;
  }

  // Create end-entity certificate
  private createEndEntityCertificate(
    keyPair: crypto.KeyPairSyncResult<string, string>,
    request: CertificateRequest,
    issuerCA: CertificateAuthority
  ): string {
    const subjectComponents = [
      `CN=${request.commonName}`,
      `O=${request.organization}`,
    ];

    if (request.organizationalUnit) {
      subjectComponents.push(`OU=${request.organizationalUnit}`);
    }

    if (request.state) {
      subjectComponents.push(`ST=${request.state}`);
    }

    if (request.locality) {
      subjectComponents.push(`L=${request.locality}`);
    }

    subjectComponents.push(`C=${request.country}`);

    if (request.emailAddress) {
      subjectComponents.push(`emailAddress=${request.emailAddress}`);
    }

    const cert = {
      version: 3,
      serialNumber: this.getNextSerialNumber().toString(),
      issuer: this.extractSubjectFromCertificate(issuerCA.certificate),
      subject: subjectComponents.join(','),
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + request.validityPeriod * 24 * 60 * 60 * 1000).toISOString(),
      publicKey: keyPair.publicKey,
      keyUsage: request.keyUsage,
      extendedKeyUsage: request.extendedKeyUsage,
      subjectAltNames: request.subjectAltNames,
      basicConstraints: { isCA: false },
      subjectKeyIdentifier: this.generateSubjectKeyIdentifier(keyPair.publicKey),
      authorityKeyIdentifier: this.generateAuthorityKeyIdentifier(issuerCA.certificate),
      crlDistributionPoints: [`http://localhost:4000/crl/${issuerCA.id}.crl`],
      ocspResponder: `http://localhost:4000/ocsp`,
    };

    // Sign with issuer CA private key
    const certData = this.serializeCertificateData(cert);
    const signature = crypto.sign('sha256', Buffer.from(certData), issuerCA.privateKey);
    
    return JSON.stringify({ ...cert, signature: signature.toString('base64') });
  }

  // Revoke certificate
  public revokeCertificate(
    certificateId: string, 
    reason: CertificateRevocationReason,
    revokedBy: string
  ): void {
    const certificate = this.certificateStore.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    if (certificate.status === CertificateStatus.REVOKED) {
      throw new Error('Certificate is already revoked');
    }

    // Update certificate status
    certificate.status = CertificateStatus.REVOKED;

    // Add to revocation list
    const serialNumber = this.extractSerialNumberFromCertificate(certificate.certificate);
    const crlEntry: CRLEntry = {
      serialNumber,
      revocationDate: new Date(),
      reason,
      revokedBy,
    };

    this.certificateStore.revocationList.set(serialNumber, crlEntry);

    // Update CRL
    this.updateCertificateRevocationList();

    this.emit('certificate_revoked', { 
      certificateId,
      serialNumber,
      reason,
      revokedBy 
    });
  }

  // Validate certificate chain
  public validateCertificateChain(certificate: Buffer): CertificateValidationResult {
    const certFingerprint = this.calculateCertificateFingerprint(certificate);
    
    // Check validation cache
    const cached = this.validationCache.get(certFingerprint);
    if (cached && (Date.now() - cached.timestamp) < this.VALIDATION_CACHE_TTL) {
      return cached.result;
    }

    const result = this.performCertificateValidation(certificate);
    
    // Cache the result
    this.validationCache.set(certFingerprint, { 
      result, 
      timestamp: Date.now() 
    });

    return result;
  }

  // Perform certificate validation
  private performCertificateValidation(certificate: Buffer): CertificateValidationResult {
    const result: CertificateValidationResult = {
      valid: false,
      certificateStatus: CertificateStatus.VALID,
      chainTrusted: false,
      notBefore: new Date(),
      notAfter: new Date(),
      issuer: '',
      subject: '',
      keyUsageValid: true,
      extendedKeyUsageValid: true,
      revocationStatus: 'unknown',
      validationErrors: [],
      trustScore: 0,
    };

    try {
      // Parse certificate
      const certData = JSON.parse(certificate.toString());
      
      result.notBefore = new Date(certData.validFrom);
      result.notAfter = new Date(certData.validTo);
      result.issuer = certData.issuer;
      result.subject = certData.subject;

      // Check validity period
      const now = new Date();
      if (now < result.notBefore) {
        result.validationErrors.push('Certificate not yet valid');
        result.trustScore -= 0.5;
      }

      if (now > result.notAfter) {
        result.validationErrors.push('Certificate has expired');
        result.certificateStatus = CertificateStatus.EXPIRED;
        result.trustScore -= 0.5;
      }

      // Verify signature chain
      if (this.verifyCertificateSignature(certificate)) {
        result.chainTrusted = true;
        result.trustScore += 0.3;
      } else {
        result.validationErrors.push('Certificate signature verification failed');
        result.trustScore -= 0.3;
      }

      // Check revocation status
      const serialNumber = this.extractSerialNumberFromCertificate(certificate);
      if (this.certificateStore.revocationList.has(serialNumber)) {
        result.revocationStatus = 'revoked';
        result.certificateStatus = CertificateStatus.REVOKED;
        result.validationErrors.push('Certificate has been revoked');
        result.trustScore -= 0.5;
      } else {
        result.revocationStatus = 'not_revoked';
        result.trustScore += 0.2;
      }

      // Validate key usage
      if (!this.validateKeyUsage(certData)) {
        result.keyUsageValid = false;
        result.validationErrors.push('Invalid key usage');
        result.trustScore -= 0.1;
      }

      // Calculate final validity
      result.trustScore = Math.max(0, Math.min(1, result.trustScore));
      result.valid = result.validationErrors.length === 0 && result.trustScore > 0.5;

    } catch (error) {
      result.validationErrors.push(`Certificate parsing error: ${error.message}`);
    }

    return result;
  }

  // Verify certificate signature
  private verifyCertificateSignature(certificate: Buffer): boolean {
    try {
      const certData = JSON.parse(certificate.toString());
      const signature = Buffer.from(certData.signature, 'base64');
      
      // Find issuer certificate
      const issuerCert = this.findIssuerCertificate(certData.issuer);
      if (!issuerCert) {
        return false;
      }

      // Extract public key from issuer certificate
      const issuerData = JSON.parse(issuerCert.toString());
      const publicKey = issuerData.publicKey;

      // Verify signature
      const certDataWithoutSignature = { ...certData };
      delete certDataWithoutSignature.signature;
      
      const dataToVerify = this.serializeCertificateData(certDataWithoutSignature);
      
      return crypto.verify('sha256', Buffer.from(dataToVerify), publicKey, signature);

    } catch (error) {
      return false;
    }
  }

  // Find issuer certificate
  private findIssuerCertificate(issuerDN: string): Buffer | null {
    // Check root CA
    if (this.rootCA) {
      const rootCertData = JSON.parse(this.rootCA.certificate.toString());
      if (rootCertData.subject === issuerDN) {
        return this.rootCA.certificate;
      }
    }

    // Check intermediate CAs
    for (const [_, intermediateCA] of this.intermediateCAs) {
      const intermediateCertData = JSON.parse(intermediateCA.certificate.toString());
      if (intermediateCertData.subject === issuerDN) {
        return intermediateCA.certificate;
      }
    }

    return null;
  }

  // Validate key usage
  private validateKeyUsage(certData: any): boolean {
    // This is a simplified validation
    // In production, implement proper key usage validation
    return Array.isArray(certData.keyUsage) && certData.keyUsage.length > 0;
  }

  // Generate and update Certificate Revocation List
  private updateCertificateRevocationList(): void {
    if (!this.rootCA) return;

    const crlEntries = Array.from(this.certificateStore.revocationList.values());
    
    const crl = {
      version: 2,
      issuer: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      thisUpdate: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + this.CRL_UPDATE_INTERVAL).toISOString(),
      revokedCertificates: crlEntries.map(entry => ({
        serialNumber: entry.serialNumber,
        revocationDate: entry.revocationDate.toISOString(),
        reason: entry.reason,
      })),
    };

    // Sign CRL with root CA private key
    const crlData = JSON.stringify(crl);
    const signature = crypto.sign('sha256', Buffer.from(crlData), this.rootCA.privateKey);
    
    const signedCRL = JSON.stringify({ ...crl, signature: signature.toString('base64') });

    this.emit('crl_updated', { 
      crlSize: crlEntries.length,
      nextUpdate: crl.nextUpdate 
    });
  }

  // OCSP responder
  public generateOCSPResponse(serialNumber: string): OCSPResponse {
    const crlEntry = this.certificateStore.revocationList.get(serialNumber);
    
    if (crlEntry) {
      return {
        serialNumber,
        status: 'revoked',
        thisUpdate: new Date(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        revocationTime: crlEntry.revocationDate,
        revocationReason: crlEntry.reason,
      };
    }

    // Check if certificate exists
    const certificateExists = Array.from(this.certificateStore.certificates.values())
      .some(cert => this.extractSerialNumberFromCertificate(cert.certificate) === serialNumber);

    return {
      serialNumber,
      status: certificateExists ? 'good' : 'unknown',
      thisUpdate: new Date(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  // Certificate lifecycle monitoring
  private startCertificateLifecycleMonitoring(): void {
    setInterval(() => {
      this.checkCertificateExpiration();
      this.performCertificateHealthCheck();
      this.cleanupValidationCache();
    }, 3600000); // Every hour

    // Daily CRL update
    setInterval(() => {
      this.updateCertificateRevocationList();
    }, this.CRL_UPDATE_INTERVAL);
  }

  // Check for certificates nearing expiration
  private checkCertificateExpiration(): void {
    const warningThreshold = Date.now() + (this.CERT_ROTATION_WARNING_DAYS * 24 * 60 * 60 * 1000);
    
    for (const [certId, certificate] of this.certificateStore.certificates) {
      if (certificate.status === CertificateStatus.VALID) {
        const daysUntilExpiry = (certificate.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        
        if (certificate.validTo.getTime() <= warningThreshold) {
          this.emit('certificate_expiring_soon', { 
            certificateId: certId,
            commonName: certificate.commonName,
            daysUntilExpiry: Math.floor(daysUntilExpiry)
          });
        }

        if (certificate.validTo.getTime() <= Date.now()) {
          certificate.status = CertificateStatus.EXPIRED;
          this.emit('certificate_expired', { 
            certificateId: certId,
            commonName: certificate.commonName 
          });
        }
      }
    }
  }

  // Perform certificate health check
  private performCertificateHealthCheck(): void {
    const healthData = {
      totalCertificates: this.certificateStore.certificates.size,
      validCertificates: Array.from(this.certificateStore.certificates.values())
        .filter(c => c.status === CertificateStatus.VALID).length,
      expiredCertificates: Array.from(this.certificateStore.certificates.values())
        .filter(c => c.status === CertificateStatus.EXPIRED).length,
      revokedCertificates: Array.from(this.certificateStore.certificates.values())
        .filter(c => c.status === CertificateStatus.REVOKED).length,
      pendingRequests: Array.from(this.certificateStore.certificateRequests.values())
        .filter(r => r.status === 'pending').length,
      crlSize: this.certificateStore.revocationList.size,
      timestamp: Date.now(),
    };

    this.emit('certificate_health_check', healthData);
  }

  // Clean up validation cache
  private cleanupValidationCache(): void {
    const now = Date.now();
    
    for (const [fingerprint, cached] of this.validationCache) {
      if (now - cached.timestamp > this.VALIDATION_CACHE_TTL) {
        this.validationCache.delete(fingerprint);
      }
    }
  }

  // Utility methods
  private getNextSerialNumber(): number {
    return this.serialNumberCounter++;
  }

  private generateSubjectKeyIdentifier(publicKey: string): string {
    return crypto.createHash('sha1').update(Buffer.from(publicKey)).digest('hex').toUpperCase();
  }

  private generateAuthorityKeyIdentifier(issuerCert: Buffer): string {
    try {
      const certData = JSON.parse(issuerCert.toString());
      return this.generateSubjectKeyIdentifier(certData.publicKey);
    } catch {
      return '';
    }
  }

  private calculateCertificateFingerprint(certificate: Buffer): string {
    return crypto.createHash('sha256').update(certificate).digest('hex').toUpperCase()
      .replace(/(.{2})/g, '$1:').slice(0, -1);
  }

  private extractSerialNumberFromCertificate(certificate: Buffer): string {
    try {
      const certData = JSON.parse(certificate.toString());
      return certData.serialNumber;
    } catch {
      return '';
    }
  }

  private extractSubjectFromCertificate(certificate: Buffer): string {
    try {
      const certData = JSON.parse(certificate.toString());
      return certData.subject;
    } catch {
      return '';
    }
  }

  private serializeCertificateData(certData: any): string {
    // Create a consistent serialization for signing
    const orderedData = {
      version: certData.version,
      serialNumber: certData.serialNumber,
      issuer: certData.issuer,
      subject: certData.subject,
      validFrom: certData.validFrom,
      validTo: certData.validTo,
      publicKey: certData.publicKey,
      keyUsage: certData.keyUsage,
      extendedKeyUsage: certData.extendedKeyUsage,
      basicConstraints: certData.basicConstraints,
      subjectAltNames: certData.subjectAltNames,
      subjectKeyIdentifier: certData.subjectKeyIdentifier,
      authorityKeyIdentifier: certData.authorityKeyIdentifier,
    };

    return JSON.stringify(orderedData);
  }

  // Public API methods
  public getCertificate(certificateId: string): TLSCertificate | null {
    return this.certificateStore.certificates.get(certificateId) || null;
  }

  public getCertificateByCommonName(commonName: string): TLSCertificate | null {
    for (const certificate of this.certificateStore.certificates.values()) {
      if (certificate.commonName === commonName && certificate.status === CertificateStatus.VALID) {
        return certificate;
      }
    }
    return null;
  }

  public listCertificates(status?: CertificateStatus): TLSCertificate[] {
    const certificates = Array.from(this.certificateStore.certificates.values());
    
    if (status) {
      return certificates.filter(cert => cert.status === status);
    }
    
    return certificates;
  }

  public listCertificateRequests(status?: string): CertificateRequest[] {
    const requests = Array.from(this.certificateStore.certificateRequests.values());
    
    if (status) {
      return requests.filter(req => req.status === status);
    }
    
    return requests;
  }

  public getRootCACertificate(): Buffer | null {
    return this.rootCA?.certificate || null;
  }

  public getIntermediateCACertificates(): Buffer[] {
    return Array.from(this.intermediateCAs.values()).map(ca => ca.certificate);
  }

  public getCertificateStats(): any {
    return {
      totalCertificates: this.certificateStore.certificates.size,
      validCertificates: this.listCertificates(CertificateStatus.VALID).length,
      expiredCertificates: this.listCertificates(CertificateStatus.EXPIRED).length,
      revokedCertificates: this.listCertificates(CertificateStatus.REVOKED).length,
      pendingRequests: this.listCertificateRequests('pending').length,
      approvedRequests: this.listCertificateRequests('approved').length,
      crlSize: this.certificateStore.revocationList.size,
      rootCAExpiry: this.rootCA?.validTo,
      intermediateCAs: this.intermediateCAs.size,
    };
  }

  // Export certificate in PEM format
  public exportCertificatePEM(certificateId: string): string | null {
    const certificate = this.getCertificate(certificateId);
    if (!certificate) return null;

    // Convert to PEM format (simplified)
    const base64Cert = certificate.certificate.toString('base64');
    const pemCert = base64Cert.match(/.{1,64}/g)?.join('\n') || '';
    
    return `-----BEGIN CERTIFICATE-----\n${pemCert}\n-----END CERTIFICATE-----`;
  }

  // Import certificate in PEM format
  public importCertificatePEM(pemCertificate: string): string {
    // Parse PEM format (simplified)
    const base64Data = pemCertificate
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\n/g, '');
    
    const certificateBuffer = Buffer.from(base64Data, 'base64');
    
    // Parse certificate data
    const certData = JSON.parse(certificateBuffer.toString());
    
    const certificate: TLSCertificate = {
      id: 'imported-cert-' + generateSecureToken(8),
      commonName: this.extractCommonNameFromSubject(certData.subject),
      organization: this.extractOrganizationFromSubject(certData.subject),
      country: this.extractCountryFromSubject(certData.subject),
      validFrom: new Date(certData.validFrom),
      validTo: new Date(certData.validTo),
      keyUsage: certData.keyUsage || [],
      subjectAltNames: certData.subjectAltNames || [],
      publicKey: Buffer.from(certData.publicKey),
      privateKey: Buffer.alloc(0), // Not available in imported cert
      certificate: certificateBuffer,
      status: CertificateStatus.VALID,
      fingerprint: this.calculateCertificateFingerprint(certificateBuffer),
    };

    this.certificateStore.certificates.set(certificate.id, certificate);
    
    this.emit('certificate_imported', { 
      certificateId: certificate.id,
      commonName: certificate.commonName 
    });

    return certificate.id;
  }

  // Extract information from certificate subject
  private extractCommonNameFromSubject(subject: string): string {
    const match = subject.match(/CN=([^,]+)/);
    return match ? match[1] : '';
  }

  private extractOrganizationFromSubject(subject: string): string {
    const match = subject.match(/O=([^,]+)/);
    return match ? match[1] : '';
  }

  private extractCountryFromSubject(subject: string): string {
    const match = subject.match(/C=([^,]+)/);
    return match ? match[1] : '';
  }

  // Shutdown cleanup
  public shutdown(): void {
    this.certificateStore.certificates.clear();
    this.certificateStore.certificateRequests.clear();
    this.certificateStore.revocationList.clear();
    this.certificateStore.trustedCAs.clear();
    this.certificateStore.intermediateCAs.clear();
    
    this.intermediateCAs.clear();
    this.validationCache.clear();
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const certificateManager = new CertificateManager();