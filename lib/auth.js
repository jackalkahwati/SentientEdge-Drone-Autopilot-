const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

// Environment configuration with defaults for development
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-development-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// User permission system
const PERMISSIONS = {
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
};

// Role-based permission matrix
const ROLE_PERMISSIONS = {
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
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens
 */
function generateTokens(user) {
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  
  const tokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    permissions,
  };

  const refreshPayload = {
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
function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-api',
    });
    
    return payload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify and decode refresh token
 */
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-refresh',
    });
    
    return payload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
function refreshAccessToken(refreshToken, user) {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);
  if (!payload || payload.userId !== user.id) {
    return null;
  }

  // Generate new access token with updated permissions
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  
  const tokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    permissions,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sentientedge-auth',
    audience: 'sentientedge-api',
  });

  // Calculate expiration time in seconds
  const expiresIn = JWT_EXPIRES_IN.includes('m') 
    ? parseInt(JWT_EXPIRES_IN) * 60 
    : JWT_EXPIRES_IN.includes('h') 
    ? parseInt(JWT_EXPIRES_IN) * 3600 
    : 900; // Default 15 minutes

  return {
    accessToken,
    expiresIn,
  };
}

/**
 * Check if user has specific permission
 */
function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
function hasAnyPermission(userRole, permissions) {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Generate secure random string for tokens/secrets
 */
function generateSecureRandom(length = 32) {
  return crypto.lib.WordArray.random(length).toString();
}

/**
 * Create password reset token
 */
function createPasswordResetToken(userId) {
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
function verifyPasswordResetToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'sentientedge-auth',
      audience: 'sentientedge-reset',
    });
    
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
function generateMFASecret() {
  return generateSecureRandom(16);
}

/**
 * Sanitize user data for token payload (remove sensitive information)
 */
function sanitizeUserForToken(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  hasPermission,
  hasAnyPermission,
  generateSecureRandom,
  createPasswordResetToken,
  verifyPasswordResetToken,
  generateMFASecret,
  sanitizeUserForToken,
};