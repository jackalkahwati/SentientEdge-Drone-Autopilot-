// Military-grade cryptographic library for secure drone communications
// Implements AES-256, RSA, ECDH, and key management suitable for defense applications

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// Cryptographic constants
export const CRYPTO_CONSTANTS = {
  AES_KEY_SIZE: 32,           // 256 bits
  AES_IV_SIZE: 16,            // 128 bits
  RSA_KEY_SIZE: 4096,         // 4096 bits for military grade
  ECDH_CURVE: 'secp384r1',    // NIST P-384 curve
  HMAC_KEY_SIZE: 32,          // 256 bits
  SALT_SIZE: 32,              // 256 bits
  TAG_SIZE: 16,               // 128 bits for GCM
  KEY_DERIVATION_ITERATIONS: 100000, // PBKDF2 iterations
  NONCE_SIZE: 12,             // 96 bits for GCM
} as const;

// Security levels for different communication types
export enum SecurityLevel {
  UNCLASSIFIED = 0,
  CONFIDENTIAL = 1,
  SECRET = 2,
  TOP_SECRET = 3,
}

// Key types for different purposes
export enum KeyType {
  SESSION = 'session',
  TRANSPORT = 'transport',
  IDENTITY = 'identity',
  SIGNING = 'signing',
  BACKUP = 'backup',
}

// Encryption algorithms
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  CHACHA20_POLY1305 = 'chacha20-poly1305',
}

// Key exchange methods
export enum KeyExchangeMethod {
  RSA_OAEP = 'rsa-oaep',
  ECDH_P384 = 'ecdh-p384',
  HYBRID = 'hybrid',
}

// Certificate status
export enum CertificateStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
}

// Interfaces
export interface CryptoKey {
  id: string;
  type: KeyType;
  algorithm: string;
  keyData: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedData {
  algorithm: EncryptionAlgorithm;
  keyId: string;
  iv: Buffer;
  tag: Buffer;
  data: Buffer;
  timestamp: number;
  securityLevel: SecurityLevel;
}

export interface Certificate {
  id: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  publicKey: Buffer;
  signature: Buffer;
  status: CertificateStatus;
  keyUsage: string[];
  extensions: Record<string, any>;
}

export interface SecureMessage {
  header: {
    version: number;
    messageType: string;
    securityLevel: SecurityLevel;
    keyId: string;
    timestamp: number;
    sequenceNumber: number;
  };
  encryptedPayload: EncryptedData;
  signature: Buffer;
  integrity: Buffer;
}

// Military-grade cryptographic engine
export class MilitaryCryptoEngine extends EventEmitter {
  private keys: Map<string, CryptoKey> = new Map();
  private keyPairs: Map<string, CryptoKeyPair> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private sessionKeys: Map<string, CryptoKey> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();
  private keyRotationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeEngine();
  }

  private initializeEngine(): void {
    // Generate master key pair on initialization
    this.generateKeyPair('master', KeyType.IDENTITY);
    
    // Start key rotation scheduler
    this.startKeyRotationScheduler();
    
    // Initialize security monitoring
    this.startSecurityMonitoring();
  }

  // Generate cryptographically secure random bytes
  public generateSecureRandom(size: number): Buffer {
    return crypto.randomBytes(size);
  }

  // Generate AES-256 key
  public generateAESKey(keyId: string, type: KeyType = KeyType.SESSION): CryptoKey {
    const keyData = this.generateSecureRandom(CRYPTO_CONSTANTS.AES_KEY_SIZE);
    
    const key: CryptoKey = {
      id: keyId,
      type,
      algorithm: 'AES-256',
      keyData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        purpose: 'symmetric_encryption',
        strength: 256,
      },
    };

    this.keys.set(keyId, key);
    this.scheduleKeyRotation(keyId);
    
    this.emit('key_generated', { keyId, type, algorithm: 'AES-256' });
    return key;
  }

  // Generate RSA key pair
  public generateKeyPair(keyId: string, type: KeyType = KeyType.IDENTITY): CryptoKeyPair {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: CRYPTO_CONSTANTS.RSA_KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'der',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der',
      },
    });

    const publicKey: CryptoKey = {
      id: `${keyId}_public`,
      type,
      algorithm: 'RSA-4096',
      keyData: keyPair.publicKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      metadata: {
        purpose: 'public_key_operations',
        strength: 4096,
      },
    };

    const privateKey: CryptoKey = {
      id: `${keyId}_private`,
      type,
      algorithm: 'RSA-4096',
      keyData: keyPair.privateKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      metadata: {
        purpose: 'private_key_operations',
        strength: 4096,
      },
    };

    const cryptoKeyPair: CryptoKeyPair = { publicKey, privateKey };
    this.keyPairs.set(keyId, cryptoKeyPair);
    
    this.emit('keypair_generated', { keyId, type, algorithm: 'RSA-4096' });
    return cryptoKeyPair;
  }

  // Generate ECDH key pair
  public generateECDHKeyPair(keyId: string): CryptoKeyPair {
    const ecdh = crypto.createECDH(CRYPTO_CONSTANTS.ECDH_CURVE);
    ecdh.generateKeys();

    const publicKey: CryptoKey = {
      id: `${keyId}_public`,
      type: KeyType.TRANSPORT,
      algorithm: 'ECDH-P384',
      keyData: ecdh.getPublicKey(),
      createdAt: new Date(),
      metadata: {
        purpose: 'key_exchange',
        curve: CRYPTO_CONSTANTS.ECDH_CURVE,
      },
    };

    const privateKey: CryptoKey = {
      id: `${keyId}_private`,
      type: KeyType.TRANSPORT,
      algorithm: 'ECDH-P384',
      keyData: ecdh.getPrivateKey(),
      createdAt: new Date(),
      metadata: {
        purpose: 'key_exchange',
        curve: CRYPTO_CONSTANTS.ECDH_CURVE,
      },
    };

    const cryptoKeyPair: CryptoKeyPair = { publicKey, privateKey };
    this.keyPairs.set(keyId, cryptoKeyPair);
    
    this.emit('ecdh_keypair_generated', { keyId, curve: CRYPTO_CONSTANTS.ECDH_CURVE });
    return cryptoKeyPair;
  }

  // Perform ECDH key exchange
  public performECDHKeyExchange(
    privateKeyId: string, 
    peerPublicKey: Buffer
  ): Buffer {
    const keyPair = this.keyPairs.get(privateKeyId);
    if (!keyPair) {
      throw new Error(`Key pair not found: ${privateKeyId}`);
    }

    const ecdh = crypto.createECDH(CRYPTO_CONSTANTS.ECDH_CURVE);
    ecdh.setPrivateKey(keyPair.privateKey.keyData);
    
    const sharedSecret = ecdh.computeSecret(peerPublicKey);
    
    this.emit('key_exchange_completed', { keyId: privateKeyId });
    return sharedSecret;
  }

  // Derive key using PBKDF2
  public deriveKey(
    password: Buffer, 
    salt: Buffer, 
    keyLength: number = CRYPTO_CONSTANTS.AES_KEY_SIZE
  ): Buffer {
    return crypto.pbkdf2Sync(
      password, 
      salt, 
      CRYPTO_CONSTANTS.KEY_DERIVATION_ITERATIONS, 
      keyLength, 
      'sha256'
    );
  }

  // Encrypt data with AES-256-GCM
  public encryptAES(data: Buffer, keyId: string, securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL): EncryptedData {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const iv = this.generateSecureRandom(CRYPTO_CONSTANTS.AES_IV_SIZE);
    const cipher = crypto.createCipher('aes-256-gcm', key.keyData);
    cipher.setAAD(Buffer.from(`security_level_${securityLevel}`));

    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    const encryptedData: EncryptedData = {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      keyId,
      iv,
      tag,
      data: encrypted,
      timestamp: Date.now(),
      securityLevel,
    };

    this.emit('data_encrypted', { keyId, dataSize: data.length, securityLevel });
    return encryptedData;
  }

  // Decrypt data with AES-256-GCM
  public decryptAES(encryptedData: EncryptedData): Buffer {
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptedData.keyId}`);
    }

    const decipher = crypto.createDecipher('aes-256-gcm', key.keyData);
    decipher.setAuthTag(encryptedData.tag);
    decipher.setAAD(Buffer.from(`security_level_${encryptedData.securityLevel}`));

    let decrypted = decipher.update(encryptedData.data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    this.emit('data_decrypted', { 
      keyId: encryptedData.keyId, 
      dataSize: decrypted.length, 
      securityLevel: encryptedData.securityLevel 
    });
    
    return decrypted;
  }

  // RSA encryption for key exchange
  public encryptRSA(data: Buffer, publicKeyId: string): Buffer {
    const keyPair = this.keyPairs.get(publicKeyId.replace('_public', ''));
    if (!keyPair) {
      throw new Error(`RSA key pair not found: ${publicKeyId}`);
    }

    const publicKey = crypto.createPublicKey({
      key: keyPair.publicKey.keyData,
      format: 'der',
      type: 'spki',
    });

    return crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    }, data);
  }

  // RSA decryption
  public decryptRSA(encryptedData: Buffer, privateKeyId: string): Buffer {
    const keyPair = this.keyPairs.get(privateKeyId.replace('_private', ''));
    if (!keyPair) {
      throw new Error(`RSA key pair not found: ${privateKeyId}`);
    }

    const privateKey = crypto.createPrivateKey({
      key: keyPair.privateKey.keyData,
      format: 'der',
      type: 'pkcs8',
    });

    return crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    }, encryptedData);
  }

  // Digital signature generation
  public signData(data: Buffer, privateKeyId: string): Buffer {
    const keyPair = this.keyPairs.get(privateKeyId.replace('_private', ''));
    if (!keyPair) {
      throw new Error(`Signing key pair not found: ${privateKeyId}`);
    }

    const privateKey = crypto.createPrivateKey({
      key: keyPair.privateKey.keyData,
      format: 'der',
      type: 'pkcs8',
    });

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    
    return sign.sign(privateKey);
  }

  // Digital signature verification
  public verifySignature(data: Buffer, signature: Buffer, publicKeyId: string): boolean {
    const keyPair = this.keyPairs.get(publicKeyId.replace('_public', ''));
    if (!keyPair) {
      throw new Error(`Verification key pair not found: ${publicKeyId}`);
    }

    const publicKey = crypto.createPublicKey({
      key: keyPair.publicKey.keyData,
      format: 'der',
      type: 'spki',
    });

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    
    return verify.verify(publicKey, signature);
  }

  // Generate HMAC for integrity verification
  public generateHMAC(data: Buffer, keyId: string): Buffer {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`HMAC key not found: ${keyId}`);
    }

    return crypto.createHmac('sha256', key.keyData).update(data).digest();
  }

  // Verify HMAC
  public verifyHMAC(data: Buffer, hmac: Buffer, keyId: string): boolean {
    const expectedHmac = this.generateHMAC(data, keyId);
    return crypto.timingSafeEqual(hmac, expectedHmac);
  }

  // Create secure message with encryption and integrity
  public createSecureMessage(
    payload: Buffer,
    messageType: string,
    keyId: string,
    securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL
  ): SecureMessage {
    // Get or create sequence number
    const currentSeq = this.sequenceNumbers.get(keyId) || 0;
    this.sequenceNumbers.set(keyId, currentSeq + 1);

    // Encrypt payload
    const encryptedPayload = this.encryptAES(payload, keyId, securityLevel);

    // Create header
    const header = {
      version: 1,
      messageType,
      securityLevel,
      keyId,
      timestamp: Date.now(),
      sequenceNumber: currentSeq + 1,
    };

    // Serialize header for signing
    const headerBuffer = Buffer.from(JSON.stringify(header));
    const messageData = Buffer.concat([headerBuffer, encryptedPayload.data]);

    // Generate signature
    const signature = this.signData(messageData, keyId);

    // Generate integrity check
    const integrity = this.generateHMAC(messageData, keyId);

    const secureMessage: SecureMessage = {
      header,
      encryptedPayload,
      signature,
      integrity,
    };

    this.emit('secure_message_created', { 
      messageType, 
      keyId, 
      securityLevel, 
      size: payload.length 
    });

    return secureMessage;
  }

  // Verify and decrypt secure message
  public verifyAndDecryptMessage(secureMessage: SecureMessage): Buffer {
    const { header, encryptedPayload, signature, integrity } = secureMessage;

    // Reconstruct message data for verification
    const headerBuffer = Buffer.from(JSON.stringify(header));
    const messageData = Buffer.concat([headerBuffer, encryptedPayload.data]);

    // Verify integrity
    if (!this.verifyHMAC(messageData, integrity, header.keyId)) {
      throw new Error('Message integrity verification failed');
    }

    // Verify signature
    if (!this.verifySignature(messageData, signature, header.keyId)) {
      throw new Error('Message signature verification failed');
    }

    // Check sequence number (replay attack protection)
    const lastSeq = this.sequenceNumbers.get(header.keyId) || 0;
    if (header.sequenceNumber <= lastSeq) {
      throw new Error('Message replay detected');
    }
    this.sequenceNumbers.set(header.keyId, header.sequenceNumber);

    // Decrypt payload
    const decryptedPayload = this.decryptAES(encryptedPayload);

    this.emit('secure_message_verified', { 
      messageType: header.messageType, 
      keyId: header.keyId, 
      securityLevel: header.securityLevel 
    });

    return decryptedPayload;
  }

  // Key rotation management
  private scheduleKeyRotation(keyId: string): void {
    const key = this.keys.get(keyId);
    if (!key || !key.expiresAt) return;

    const rotationTime = key.expiresAt.getTime() - Date.now() - (60 * 1000); // 1 minute before expiry
    
    if (rotationTime > 0) {
      const timer = setTimeout(() => {
        this.rotateKey(keyId);
      }, rotationTime);
      
      this.keyRotationTimers.set(keyId, timer);
    }
  }

  // Rotate encryption key
  private rotateKey(keyId: string): void {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) return;

    // Generate new key
    const newKey = this.generateAESKey(keyId, oldKey.type);
    
    this.emit('key_rotated', { 
      keyId, 
      oldKeyId: oldKey.id, 
      newKeyId: newKey.id 
    });
  }

  // Start key rotation scheduler
  private startKeyRotationScheduler(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [keyId, key] of this.keys) {
        if (key.expiresAt && key.expiresAt.getTime() <= now) {
          this.rotateKey(keyId);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  // Security monitoring
  private startSecurityMonitoring(): void {
    setInterval(() => {
      this.emit('security_health_check', {
        keyCount: this.keys.size,
        keyPairCount: this.keyPairs.size,
        certificateCount: this.certificates.size,
        sessionKeyCount: this.sessionKeys.size,
        timestamp: new Date(),
      });
    }, 30 * 1000); // Every 30 seconds
  }

  // Clean up expired keys
  public cleanupExpiredKeys(): void {
    const now = Date.now();
    
    for (const [keyId, key] of this.keys) {
      if (key.expiresAt && key.expiresAt.getTime() <= now) {
        this.keys.delete(keyId);
        const timer = this.keyRotationTimers.get(keyId);
        if (timer) {
          clearTimeout(timer);
          this.keyRotationTimers.delete(keyId);
        }
        this.emit('key_expired', { keyId });
      }
    }
  }

  // Get key information (without exposing key data)
  public getKeyInfo(keyId: string): Omit<CryptoKey, 'keyData'> | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    const { keyData, ...keyInfo } = key;
    return keyInfo;
  }

  // Export public key for sharing
  public exportPublicKey(keyPairId: string): Buffer | null {
    const keyPair = this.keyPairs.get(keyPairId);
    return keyPair ? keyPair.publicKey.keyData : null;
  }

  // Secure shutdown
  public shutdown(): void {
    // Clear all timers
    for (const timer of this.keyRotationTimers.values()) {
      clearTimeout(timer);
    }
    this.keyRotationTimers.clear();

    // Securely clear key material
    this.keys.clear();
    this.keyPairs.clear();
    this.sessionKeys.clear();
    this.sequenceNumbers.clear();

    this.emit('crypto_engine_shutdown');
  }
}

// Singleton instance for global use
export const militaryCrypto = new MilitaryCryptoEngine();

// Key derivation function for passwords
export function deriveKeyFromPassword(
  password: string, 
  salt: Buffer, 
  keyLength: number = CRYPTO_CONSTANTS.AES_KEY_SIZE
): Buffer {
  return crypto.pbkdf2Sync(
    Buffer.from(password, 'utf8'),
    salt,
    CRYPTO_CONSTANTS.KEY_DERIVATION_ITERATIONS,
    keyLength,
    'sha256'
  );
}

// Secure random string generation
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Secure password hashing
export function hashPassword(password: string, salt?: Buffer): { hash: Buffer; salt: Buffer } {
  const passwordSalt = salt || crypto.randomBytes(CRYPTO_CONSTANTS.SALT_SIZE);
  const hash = deriveKeyFromPassword(password, passwordSalt, 64);
  
  return { hash, salt: passwordSalt };
}

// Timing-safe string comparison
export function timingSafeStringCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}