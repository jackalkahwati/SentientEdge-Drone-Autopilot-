import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { User } from './types';

// Environment configuration with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-development-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export interface TokenPayload {
  userId: string;
  username: string;
  role: User['role'];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// User permission system
export const PERMISSIONS = {
  // Drone operations
  DRONE_VIEW: 'drone:view',
  DRONE_CONTROL: 'drone:control',
  DRONE_ASSIGN: 'drone:assign',
  DRONE_MAINTENANCE: 'drone:maintenance',
  
  // Mission operations
  MISSION_VIEW: 'mission:view',
  MISSION_CREATE: 'mission:create',
  MISSION_EDIT: 'mission:edit',
  MISSION_DELETE: 'mission:delete',
  MISSION_EXECUTE: 'mission:execute',
  
  // Analytics and intelligence
  ANALYTICS_VIEW: 'analytics:view',
  INTELLIGENCE_VIEW: 'intelligence:view',
  INTELLIGENCE_CLASSIFIED: 'intelligence:classified',
  
  // System administration
  USER_MANAGE: 'user:manage',
  SYSTEM_CONFIG: 'system:config',
  AUDIT_VIEW: 'audit:view',
  
  // Communications
  COMMS_VIEW: 'comms:view',
  COMMS_SECURE: 'comms:secure',
  COMMS_BROADCAST: 'comms:broadcast',
} as const;

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<User['role'], string[]> = {
  admin: Object.values(PERMISSIONS),
  operator: [
    PERMISSIONS.DRONE_VIEW,
    PERMISSIONS.DRONE_CONTROL,
    PERMISSIONS.DRONE_ASSIGN,
    PERMISSIONS.MISSION_VIEW,
    PERMISSIONS.MISSION_CREATE,
    PERMISSIONS.MISSION_EDIT,
    PERMISSIONS.MISSION_EXECUTE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.INTELLIGENCE_VIEW,
    PERMISSIONS.COMMS_VIEW,
    PERMISSIONS.COMMS_SECURE,
  ],
  analyst: [
    PERMISSIONS.DRONE_VIEW,
    PERMISSIONS.MISSION_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.INTELLIGENCE_VIEW,
    PERMISSIONS.INTELLIGENCE_CLASSIFIED,
    PERMISSIONS.COMMS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  viewer: [
    PERMISSIONS.DRONE_VIEW,
    PERMISSIONS.MISSION_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.INTELLIGENCE_VIEW,
    PERMISSIONS.COMMS_VIEW,
  ],
};

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens
 */
export function generateTokens(user: User): AuthTokens {
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  
  const tokenPayload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    permissions,
  };

  const refreshPayload: RefreshTokenPayload = {
    userId: user.id,
    tokenId: uuidv4(),
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sentientedge-auth',
    audience: 'sentientedge-api',
  });

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'sentientedge-auth',
    audience: 'sentientedge-refresh',
  });

  // Calculate expiration time in seconds
  const expiresIn = JWT_EXPIRES_IN.includes('m') 
    ? parseInt(JWT_EXPIRES_IN) * 60 
    : JWT_EXPIRES_IN.includes('h') 
    ? parseInt(JWT_EXPIRES_IN) * 3600 
    : 900; // Default 15 minutes

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-api',
    }) as TokenPayload;
    
    return payload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-refresh',
    }) as RefreshTokenPayload;
    
    return payload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: User['role'], permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userRole: User['role'], permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Generate secure random string for tokens/secrets
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.lib.WordArray.random(length).toString();
}

/**
 * Create password reset token
 */
export function createPasswordResetToken(userId: string): string {
  const payload = {
    userId,
    type: 'password-reset',
    timestamp: Date.now(),
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'sentientedge-auth',
    audience: 'sentientedge-reset',
  });
}

/**
 * Verify password reset token
 */
export function verifyPasswordResetToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-reset',
    }) as any;
    
    if (payload.type !== 'password-reset') {
      return null;
    }
    
    return { userId: payload.userId };
  } catch (error) {
    console.error('Password reset token verification failed:', error);
    return null;
  }
}

/**
 * Generate MFA secret for TOTP
 */
export function generateMFASecret(): string {
  return generateSecureRandom(16);
}

/**
 * Sanitize user data for token payload (remove sensitive information)
 */
export function sanitizeUserForToken(user: User): Pick<User, 'id' | 'username' | 'role' | 'email'> {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
  };
}