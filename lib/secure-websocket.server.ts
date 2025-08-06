// Secure WebSocket Implementation with Military-Grade Encryption and Certificate Management
// Provides WSS (WebSocket Secure) with end-to-end encryption for drone control communications

import WebSocket from 'ws';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { 
  MilitaryCryptoEngine, 
  SecurityLevel, 
  KeyType, 
  SecureMessage,
  militaryCrypto,
  generateSecureToken,
  Certificate,
  CertificateStatus 
} from './military-crypto';

// Certificate management interfaces
export interface TLSCertificate {
  id: string;
  commonName: string;
  organization: string;
  country: string;
  validFrom: Date;
  validTo: Date;
  keyUsage: string[];
  subjectAltNames: string[];
  publicKey: Buffer;
  privateKey: Buffer;
  certificate: Buffer;
  status: CertificateStatus;
  fingerprint: string;
}

export interface CertificateAuthority {
  id: string;
  name: string;
  certificate: Buffer;
  privateKey: Buffer;
  serialNumber: number;
  validFrom: Date;
  validTo: Date;
  isRoot: boolean;
}

// Secure WebSocket connection information
export interface SecureConnection {
  id: string;
  socket: WebSocket;
  clientCertificate?: Buffer;
  securityLevel: SecurityLevel;
  encryptionKeyId: string;
  authenticated: boolean;
  lastHeartbeat: number;
  messageCount: number;
  bytesSent: number;
  bytesReceived: number;
  remoteAddress: string;
  userAgent?: string;
  sessionToken?: string;
}

// Message callback types
type SecureMessageCallback = (data: any, connection: SecureConnection) => void;
type SecurityStatusCallback = (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void;

// Secure WebSocket Service with military-grade encryption
export class SecureWebSocketService extends EventEmitter {
  private connections: Map<string, SecureConnection> = new Map();
  private messageHandlers: Map<string, SecureMessageCallback[]> = new Map();
  private statusHandlers: SecurityStatusCallback[] = [];
  private cryptoEngine: MilitaryCryptoEngine;
  private certificateAuthority: CertificateAuthority | null = null;
  private serverCertificate: TLSCertificate | null = null;
  private trustedCertificates: Map<string, TLSCertificate> = new Map();
  
  // Security configuration
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 1 minute
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_MESSAGES = 100;

  // Connection tracking for rate limiting
  private connectionRateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.cryptoEngine = militaryCrypto;
    this.initializeCertificateAuthority();
    this.startSecurityMonitoring();
  }

  // Initialize Certificate Authority for internal certificate management
  private initializeCertificateAuthority(): void {
    // Generate CA key pair
    const caKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create CA certificate
    const caCert = this.createRootCertificate(caKeyPair);
    
    this.certificateAuthority = {
      id: 'root-ca-' + generateSecureToken(8),
      name: 'SentientEdge Root CA',
      certificate: Buffer.from(caCert),
      privateKey: Buffer.from(caKeyPair.privateKey),
      serialNumber: 1,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
      isRoot: true,
    };

    // Generate server certificate
    this.generateServerCertificate();

    this.emit('ca_initialized', { caId: this.certificateAuthority.id });
  }

  // Create root CA certificate
  private createRootCertificate(keyPair: crypto.KeyPairSyncResult<string, string>): string {
    // This is a simplified implementation
    // In production, would use proper X.509 certificate generation
    const cert = {
      version: 3,
      serialNumber: '1',
      issuer: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      subject: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      publicKey: keyPair.publicKey,
      keyUsage: ['keyEncipherment', 'digitalSignature', 'keyCertSign'],
      basicConstraints: { isCA: true },
    };

    // Sign certificate with private key
    const certData = JSON.stringify(cert);
    const signature = crypto.sign('sha256', Buffer.from(certData), keyPair.privateKey);
    
    return JSON.stringify({ ...cert, signature: signature.toString('base64') });
  }

  // Generate server certificate for WSS
  private generateServerCertificate(): void {
    if (!this.certificateAuthority) {
      throw new Error('Certificate Authority not initialized');
    }

    // Generate server key pair
    const serverKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create server certificate
    const serverCert = this.createServerCertificate(serverKeyPair);
    
    this.serverCertificate = {
      id: 'server-cert-' + generateSecureToken(8),
      commonName: 'localhost',
      organization: 'SentientEdge',
      country: 'US',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      keyUsage: ['keyEncipherment', 'digitalSignature'],
      subjectAltNames: ['localhost', '127.0.0.1', '::1'],
      publicKey: Buffer.from(serverKeyPair.publicKey),
      privateKey: Buffer.from(serverKeyPair.privateKey),
      certificate: Buffer.from(serverCert),
      status: CertificateStatus.VALID,
      fingerprint: this.calculateCertificateFingerprint(Buffer.from(serverCert)),
    };

    this.emit('server_certificate_generated', { 
      certId: this.serverCertificate.id,
      commonName: this.serverCertificate.commonName 
    });
  }

  // Create server certificate signed by CA
  private createServerCertificate(keyPair: crypto.KeyPairSyncResult<string, string>): string {
    if (!this.certificateAuthority) {
      throw new Error('Certificate Authority not available');
    }

    const cert = {
      version: 3,
      serialNumber: (this.certificateAuthority.serialNumber++).toString(),
      issuer: 'CN=SentientEdge Root CA,O=SentientEdge,C=US',
      subject: 'CN=localhost,O=SentientEdge,C=US',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      publicKey: keyPair.publicKey,
      keyUsage: ['keyEncipherment', 'digitalSignature'],
      extKeyUsage: ['serverAuth'],
      subjectAltNames: ['DNS:localhost', 'IP:127.0.0.1', 'IP:::1'],
    };

    // Sign with CA private key
    const certData = JSON.stringify(cert);
    const signature = crypto.sign('sha256', Buffer.from(certData), this.certificateAuthority.privateKey);
    
    return JSON.stringify({ ...cert, signature: signature.toString('base64') });
  }

  // Calculate certificate fingerprint
  private calculateCertificateFingerprint(certificate: Buffer): string {
    return crypto.createHash('sha256').update(certificate).digest('hex').toUpperCase()
      .replace(/(.{2})/g, '$1:').slice(0, -1);
  }

  // Create HTTPS server with secure configuration
  private createSecureServer(port: number): https.Server {
    if (!this.serverCertificate) {
      throw new Error('Server certificate not available');
    }

    const httpsOptions: https.ServerOptions = {
      key: this.serverCertificate.privateKey,
      cert: this.serverCertificate.certificate,
      ca: this.certificateAuthority?.certificate,
      requestCert: true, // Request client certificates
      rejectUnauthorized: false, // We'll verify manually for flexibility
      ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'AES256-GCM-SHA384',
        'AES128-GCM-SHA256',
      ].join(':'),
      secureProtocol: 'TLSv1_3_method',
      honorCipherOrder: true,
      secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | 
                     crypto.constants.SSL_OP_NO_SSLv3 |
                     crypto.constants.SSL_OP_NO_TLSv1 |
                     crypto.constants.SSL_OP_NO_TLSv1_1,
    };

    const server = https.createServer(httpsOptions);
    
    server.on('secureConnection', (tlsSocket) => {
      this.handleSecureConnection(tlsSocket);
    });

    return server;
  }

  // Handle secure TLS connection establishment
  private handleSecureConnection(tlsSocket: any): void {
    const clientCert = tlsSocket.getPeerCertificate(true);
    const cipher = tlsSocket.getCipher();
    
    this.emit('secure_connection_established', {
      clientCert: clientCert?.subject,
      cipher: cipher?.name,
      protocol: tlsSocket.getProtocol(),
    });
  }

  // Create secure WebSocket server
  public createSecureWebSocketServer(port: number): WebSocket.Server {
    const httpsServer = this.createSecureServer(port);
    
    const wss = new WebSocket.Server({
      server: httpsServer,
      verifyClient: (info) => this.verifyClient(info),
      perMessageDeflate: false, // Disable compression for security
      maxPayload: this.MAX_MESSAGE_SIZE,
    });

    wss.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    wss.on('error', (error) => {
      this.emit('websocket_server_error', { error: error.message });
    });

    httpsServer.listen(port, () => {
      console.log(`Secure WebSocket server listening on port ${port}`);
      this.emit('server_started', { port, secure: true });
    });

    return wss;
  }

  // Verify client connection before establishing WebSocket
  private verifyClient(info: { origin: string; secure: boolean; req: any }): boolean {
    const req = info.req;
    const clientIP = req.socket.remoteAddress;

    // Check rate limiting
    if (!this.checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for ${clientIP}`);
      return false;
    }

    // Verify TLS connection
    if (!info.secure) {
      console.log(`Insecure connection rejected from ${clientIP}`);
      return false;
    }

    // Check client certificate if available
    const clientCert = req.socket.getPeerCertificate?.(true);
    if (clientCert && !this.verifyClientCertificate(clientCert)) {
      console.log(`Invalid client certificate from ${clientIP}`);
      return false;
    }

    return true;
  }

  // Rate limiting check
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const rateLimit = this.connectionRateLimits.get(clientIP);

    if (!rateLimit || now > rateLimit.resetTime) {
      this.connectionRateLimits.set(clientIP, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (rateLimit.count >= this.RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }

    rateLimit.count++;
    return true;
  }

  // Verify client certificate
  private verifyClientCertificate(clientCert: any): boolean {
    if (!clientCert || !clientCert.raw) {
      return false;
    }

    try {
      const certBuffer = Buffer.from(clientCert.raw);
      const fingerprint = this.calculateCertificateFingerprint(certBuffer);
      
      // Check against trusted certificates
      for (const [_, trustedCert] of this.trustedCertificates) {
        if (trustedCert.fingerprint === fingerprint && 
            trustedCert.status === CertificateStatus.VALID) {
          return true;
        }
      }

      // For demo purposes, accept self-signed certificates
      // In production, implement proper certificate chain validation
      return true;

    } catch (error) {
      console.error('Certificate verification error:', error);
      return false;
    }
  }

  // Handle new WebSocket connection
  private handleWebSocketConnection(ws: WebSocket, req: any): void {
    const connectionId = generateSecureToken(16);
    const clientIP = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Generate encryption key for this connection
    const encryptionKeyId = `ws_connection_${connectionId}`;
    this.cryptoEngine.generateAESKey(encryptionKeyId, KeyType.SESSION);

    // Create secure connection record
    const connection: SecureConnection = {
      id: connectionId,
      socket: ws,
      clientCertificate: req.socket.getPeerCertificate?.(true)?.raw,
      securityLevel: SecurityLevel.CONFIDENTIAL,
      encryptionKeyId,
      authenticated: false,
      lastHeartbeat: Date.now(),
      messageCount: 0,
      bytesSent: 0,
      bytesReceived: 0,
      remoteAddress: clientIP,
      userAgent,
    };

    this.connections.set(connectionId, connection);

    // Set up WebSocket event handlers
    this.setupWebSocketHandlers(ws, connection);

    // Start authentication process
    this.initiateAuthentication(connection);

    this.emit('connection_established', { 
      connectionId, 
      remoteAddress: clientIP,
      securityLevel: connection.securityLevel 
    });
  }

  // Set up WebSocket event handlers for a connection
  private setupWebSocketHandlers(ws: WebSocket, connection: SecureConnection): void {
    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleIncomingMessage(connection, data);
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      this.handleConnectionClose(connection, code, reason);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      this.handleConnectionError(connection, error);
    });

    // Handle pong responses
    ws.on('pong', () => {
      connection.lastHeartbeat = Date.now();
    });

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring(connection);
  }

  // Initiate authentication for new connection
  private async initiateAuthentication(connection: SecureConnection): Promise<void> {
    // Generate authentication challenge
    const challenge = this.cryptoEngine.generateSecureRandom(32);
    
    // Send encrypted challenge
    const challengeMessage = this.cryptoEngine.createSecureMessage(
      challenge,
      'auth_challenge',
      connection.encryptionKeyId,
      SecurityLevel.SECRET
    );

    await this.sendSecureMessage(connection, 'auth_challenge', challengeMessage);

    // Set authentication timeout
    setTimeout(() => {
      if (!connection.authenticated) {
        this.handleAuthenticationTimeout(connection);
      }
    }, 30000); // 30 second timeout
  }

  // Handle incoming WebSocket messages
  private async handleIncomingMessage(connection: SecureConnection, data: WebSocket.RawData): Promise<void> {
    try {
      connection.messageCount++;
      connection.bytesReceived += data.length;

      // Parse message
      const messageStr = data.toString();
      const message = JSON.parse(messageStr);

      if (!message.type || !message.payload) {
        throw new Error('Invalid message format');
      }

      // Handle authentication messages
      if (message.type === 'auth_response') {
        await this.handleAuthenticationResponse(connection, message.payload);
        return;
      }

      // Require authentication for all other messages
      if (!connection.authenticated) {
        throw new Error('Connection not authenticated');
      }

      // Decrypt secure messages
      if (message.encrypted) {
        const decryptedPayload = this.cryptoEngine.verifyAndDecryptMessage(message.payload);
        message.payload = JSON.parse(decryptedPayload.toString());
      }

      // Dispatch message to handlers
      await this.dispatchMessage(connection, message.type, message.payload);

      this.emit('message_received', { 
        connectionId: connection.id,
        messageType: message.type,
        encrypted: !!message.encrypted 
      });

    } catch (error) {
      this.handleMessageError(connection, error);
    }
  }

  // Handle authentication response
  private async handleAuthenticationResponse(
    connection: SecureConnection, 
    encryptedResponse: any
  ): Promise<void> {
    try {
      // Decrypt response
      const decryptedResponse = this.cryptoEngine.verifyAndDecryptMessage(encryptedResponse);
      const response = JSON.parse(decryptedResponse.toString());

      // Verify authentication token or challenge response
      if (this.verifyAuthenticationResponse(response)) {
        connection.authenticated = true;
        connection.sessionToken = generateSecureToken(32);
        
        // Send authentication success
        const successMessage = this.cryptoEngine.createSecureMessage(
          Buffer.from(JSON.stringify({ 
            authenticated: true,
            sessionToken: connection.sessionToken,
            securityLevel: connection.securityLevel 
          })),
          'auth_success',
          connection.encryptionKeyId,
          SecurityLevel.CONFIDENTIAL
        );

        await this.sendSecureMessage(connection, 'auth_success', successMessage);
        
        this.emit('connection_authenticated', { 
          connectionId: connection.id,
          securityLevel: connection.securityLevel 
        });

      } else {
        throw new Error('Authentication verification failed');
      }

    } catch (error) {
      this.handleAuthenticationFailure(connection, error.message);
    }
  }

  // Verify authentication response (placeholder - implement proper auth)
  private verifyAuthenticationResponse(response: any): boolean {
    // This would implement proper authentication verification
    // For demo purposes, accept any valid response structure
    return response && typeof response === 'object';
  }

  // Send secure message to connection
  private async sendSecureMessage(
    connection: SecureConnection,
    messageType: string,
    secureMessage: SecureMessage
  ): Promise<void> {
    const message = {
      type: messageType,
      encrypted: true,
      payload: secureMessage,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr);

    connection.socket.send(messageBuffer);
    connection.bytesSent += messageBuffer.length;

    this.emit('secure_message_sent', { 
      connectionId: connection.id,
      messageType,
      size: messageBuffer.length 
    });
  }

  // Send unencrypted message (for non-sensitive data)
  private async sendPlaintextMessage(
    connection: SecureConnection,
    messageType: string,
    payload: any
  ): Promise<void> {
    const message = {
      type: messageType,
      encrypted: false,
      payload,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr);

    connection.socket.send(messageBuffer);
    connection.bytesSent += messageBuffer.length;

    this.emit('message_sent', { 
      connectionId: connection.id,
      messageType,
      size: messageBuffer.length 
    });
  }

  // Dispatch message to registered handlers
  private async dispatchMessage(
    connection: SecureConnection,
    messageType: string,
    payload: any
  ): Promise<void> {
    const handlers = this.messageHandlers.get(messageType) || [];
    
    for (const handler of handlers) {
      try {
        await handler(payload, connection);
      } catch (error) {
        this.emit('handler_error', { 
          connectionId: connection.id,
          messageType,
          error: error.message 
        });
      }
    }
  }

  // Start heartbeat monitoring for connection
  private startHeartbeatMonitoring(connection: SecureConnection): void {
    const interval = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        // Send ping
        connection.socket.ping();
        
        // Check if connection timed out
        const timeSinceHeartbeat = Date.now() - connection.lastHeartbeat;
        if (timeSinceHeartbeat > this.CONNECTION_TIMEOUT) {
          this.handleConnectionTimeout(connection);
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // Handle connection timeout
  private handleConnectionTimeout(connection: SecureConnection): void {
    connection.socket.terminate();
    this.connections.delete(connection.id);
    
    this.emit('connection_timeout', { 
      connectionId: connection.id,
      remoteAddress: connection.remoteAddress 
    });
  }

  // Handle connection close
  private handleConnectionClose(
    connection: SecureConnection,
    code: number,
    reason: Buffer
  ): void {
    this.connections.delete(connection.id);
    
    this.emit('connection_closed', { 
      connectionId: connection.id,
      code,
      reason: reason.toString() 
    });
  }

  // Handle connection error
  private handleConnectionError(connection: SecureConnection, error: Error): void {
    this.emit('connection_error', { 
      connectionId: connection.id,
      error: error.message 
    });
  }

  // Handle message processing error
  private handleMessageError(connection: SecureConnection, error: any): void {
    this.emit('message_error', { 
      connectionId: connection.id,
      error: error.message 
    });

    // Send error response to client
    this.sendPlaintextMessage(connection, 'error', {
      message: 'Message processing failed',
      code: 'MESSAGE_ERROR',
    });
  }

  // Authentication failure handling
  private handleAuthenticationFailure(connection: SecureConnection, reason: string): void {
    this.emit('authentication_failed', { 
      connectionId: connection.id,
      reason 
    });

    // Send authentication failure and close connection
    this.sendPlaintextMessage(connection, 'auth_failed', {
      reason,
      code: 'AUTH_FAILED',
    }).then(() => {
      setTimeout(() => connection.socket.close(1008, 'Authentication failed'), 1000);
    });
  }

  // Authentication timeout handling
  private handleAuthenticationTimeout(connection: SecureConnection): void {
    this.emit('authentication_timeout', { 
      connectionId: connection.id 
    });

    connection.socket.close(1008, 'Authentication timeout');
  }

  // Security monitoring
  private startSecurityMonitoring(): void {
    setInterval(() => {
      this.performSecurityAudit();
      this.cleanupExpiredConnections();
      this.rotateCertificatesIfNeeded();
    }, 60000); // Every minute
  }

  // Perform security audit
  private performSecurityAudit(): void {
    const auditData = {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values())
        .filter(c => c.authenticated).length,
      totalMessagesSent: Array.from(this.connections.values())
        .reduce((sum, c) => sum + c.messageCount, 0),
      totalBytesTransferred: Array.from(this.connections.values())
        .reduce((sum, c) => sum + c.bytesSent + c.bytesReceived, 0),
      certificateStatus: this.serverCertificate?.status,
      certificateExpiry: this.serverCertificate?.validTo,
      timestamp: Date.now(),
    };

    this.emit('security_audit', auditData);
  }

  // Clean up expired connections
  private cleanupExpiredConnections(): void {
    const now = Date.now();
    
    for (const [connectionId, connection] of this.connections) {
      const timeSinceHeartbeat = now - connection.lastHeartbeat;
      
      if (timeSinceHeartbeat > this.CONNECTION_TIMEOUT) {
        connection.socket.terminate();
        this.connections.delete(connectionId);
        
        this.emit('connection_expired', { connectionId });
      }
    }
  }

  // Rotate certificates if needed
  private rotateCertificatesIfNeeded(): void {
    if (!this.serverCertificate) return;

    const daysUntilExpiry = (this.serverCertificate.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry <= 30) { // Rotate 30 days before expiry
      this.generateServerCertificate();
      this.emit('certificate_rotated', { 
        newCertId: this.serverCertificate.id,
        daysUntilExpiry 
      });
    }
  }

  // Public API methods
  public subscribe(messageType: string, callback: SecureMessageCallback): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(callback);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  public onSecurityStatusChange(callback: SecurityStatusCallback): () => void {
    this.statusHandlers.push(callback);
    
    return () => {
      const index = this.statusHandlers.indexOf(callback);
      if (index > -1) {
        this.statusHandlers.splice(index, 1);
      }
    };
  }

  // Broadcast secure message to all authenticated connections
  public async broadcastSecureMessage(messageType: string, payload: any, securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL): Promise<void> {
    const authenticatedConnections = Array.from(this.connections.values())
      .filter(c => c.authenticated && c.securityLevel >= securityLevel);

    for (const connection of authenticatedConnections) {
      try {
        const secureMessage = this.cryptoEngine.createSecureMessage(
          Buffer.from(JSON.stringify(payload)),
          messageType,
          connection.encryptionKeyId,
          securityLevel
        );

        await this.sendSecureMessage(connection, messageType, secureMessage);
      } catch (error) {
        this.emit('broadcast_error', { 
          connectionId: connection.id,
          error: error.message 
        });
      }
    }
  }

  // Get connection statistics
  public getConnectionStats(): any {
    const connections = Array.from(this.connections.values());
    
    return {
      totalConnections: connections.length,
      authenticatedConnections: connections.filter(c => c.authenticated).length,
      totalMessagesSent: connections.reduce((sum, c) => sum + c.messageCount, 0),
      totalBytesTransferred: connections.reduce((sum, c) => sum + c.bytesSent + c.bytesReceived, 0),
      averageLatency: this.calculateAverageLatency(),
      certificateStatus: this.serverCertificate?.status,
      certificateExpiry: this.serverCertificate?.validTo,
    };
  }

  // Calculate average latency (placeholder)
  private calculateAverageLatency(): number {
    // This would implement actual latency calculation
    return 0;
  }

  // Add trusted certificate
  public addTrustedCertificate(certificate: TLSCertificate): void {
    this.trustedCertificates.set(certificate.id, certificate);
    
    this.emit('trusted_certificate_added', { 
      certId: certificate.id,
      commonName: certificate.commonName 
    });
  }

  // Remove trusted certificate
  public removeTrustedCertificate(certificateId: string): void {
    this.trustedCertificates.delete(certificateId);
    
    this.emit('trusted_certificate_removed', { certId: certificateId });
  }

  // Get server certificate info
  public getServerCertificateInfo(): any {
    if (!this.serverCertificate) return null;

    return {
      id: this.serverCertificate.id,
      commonName: this.serverCertificate.commonName,
      organization: this.serverCertificate.organization,
      validFrom: this.serverCertificate.validFrom,
      validTo: this.serverCertificate.validTo,
      fingerprint: this.serverCertificate.fingerprint,
      status: this.serverCertificate.status,
    };
  }

  // Graceful shutdown
  public shutdown(): void {
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close(1001, 'Server shutdown');
    }
    
    this.connections.clear();
    this.messageHandlers.clear();
    this.statusHandlers.length = 0;
    this.connectionRateLimits.clear();
    
    this.emit('server_shutdown');
  }
}

// Export singleton instance
export const secureWebSocketService = new SecureWebSocketService();