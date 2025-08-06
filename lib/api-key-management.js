const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto-js');
const { auditLog, AuditAction } = require('./audit.js');

// In-memory API key store (replace with database in production)
const apiKeys = new Map();
const keysByHash = new Map(); // hash -> keyId mapping

// API key types and their permissions
const API_KEY_TYPES = {
  DRONE_TELEMETRY: {
    name: 'drone_telemetry',
    permissions: ['telemetry:send', 'status:update'],
    description: 'Allows drones to send telemetry data and status updates'
  },
  DRONE_CONTROL: {
    name: 'drone_control',
    permissions: ['telemetry:send', 'status:update', 'command:receive'],
    description: 'Full drone communication access including receiving commands'
  },
  SYSTEM_INTEGRATION: {
    name: 'system_integration',
    permissions: ['*'],
    description: 'Full system API access for external integrations'
  },
  READONLY: {
    name: 'readonly',
    permissions: ['data:read'],
    description: 'Read-only access to system data'
  }
};

/**
 * Generate secure API key
 */
function generateAPIKey() {
  // Generate 32-byte random key
  const keyBytes = crypto.lib.WordArray.random(32);
  
  // Format as: sk_live_[32 random characters]
  const keyString = `sk_live_${keyBytes.toString()}`;
  
  return keyString;
}

/**
 * Hash API key for secure storage
 */
function hashAPIKey(apiKey) {
  return crypto.SHA256(apiKey).toString();
}

/**
 * Create new API key
 */
function createAPIKey(options) {
  const {
    name,
    type,
    description,
    expiresIn,
    createdBy,
    droneId,
    ipWhitelist = []
  } = options;

  // Validate key type
  if (!API_KEY_TYPES[type]) {
    return { success: false, error: 'Invalid API key type' };
  }

  const keyId = uuidv4();
  const apiKey = generateAPIKey();
  const hashedKey = hashAPIKey(apiKey);

  // Calculate expiration date
  let expiresAt = null;
  if (expiresIn) {
    const now = new Date();
    if (expiresIn.endsWith('d')) {
      const days = parseInt(expiresIn.slice(0, -1));
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (expiresIn.endsWith('h')) {
      const hours = parseInt(expiresIn.slice(0, -1));
      expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
  }

  const keyData = {
    id: keyId,
    name,
    type,
    description,
    hashedKey,
    permissions: API_KEY_TYPES[type].permissions,
    droneId,
    ipWhitelist,
    isActive: true,
    usageCount: 0,
    lastUsed: null,
    createdAt: new Date().toISOString(),
    createdBy,
    expiresAt: expiresAt?.toISOString(),
  };

  // Store API key
  apiKeys.set(keyId, keyData);
  keysByHash.set(hashedKey, keyId);

  // Audit log
  auditLog({
    action: AuditAction.API_KEY_CREATED,
    userId: createdBy,
    resource: `/api/keys/${keyId}`,
    details: {
      keyId,
      name,
      type,
      droneId,
      expiresAt: keyData.expiresAt,
    },
  });

  // Return the actual key only once during creation
  return {
    success: true,
    apiKey: {
      id: keyId,
      key: apiKey, // Only returned during creation
      name,
      type,
      description,
      permissions: keyData.permissions,
      droneId,
      expiresAt: keyData.expiresAt,
      createdAt: keyData.createdAt,
    }
  };
}

/**
 * Verify API key and return associated metadata
 */
function verifyAPIKey(apiKey, clientIP = null) {
  if (!apiKey || !apiKey.startsWith('sk_live_')) {
    return null;
  }

  const hashedKey = hashAPIKey(apiKey);
  const keyId = keysByHash.get(hashedKey);
  
  if (!keyId) {
    return null;
  }

  const keyData = apiKeys.get(keyId);
  if (!keyData || !keyData.isActive) {
    return null;
  }

  // Check expiration
  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    auditLog({
      action: AuditAction.SECURITY_ERROR,
      userId: 'system',
      resource: '/api/auth/key',
      details: {
        reason: 'Expired API key used',
        keyId,
        name: keyData.name,
        expiresAt: keyData.expiresAt,
      },
      ipAddress: clientIP,
      success: false,
    });
    return null;
  }

  // Check IP whitelist
  if (keyData.ipWhitelist.length > 0 && clientIP) {
    const isWhitelisted = keyData.ipWhitelist.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation check (simplified)
        return clientIP.startsWith(ip.split('/')[0]);
      }
      return ip === clientIP;
    });

    if (!isWhitelisted) {
      auditLog({
        action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
        userId: 'system',
        resource: '/api/auth/key',
        details: {
          reason: 'IP not whitelisted for API key',
          keyId,
          name: keyData.name,
          clientIP,
          whitelist: keyData.ipWhitelist,
        },
        ipAddress: clientIP,
        success: false,
      });
      return null;
    }
  }

  // Update usage statistics
  keyData.usageCount++;
  keyData.lastUsed = new Date().toISOString();

  return {
    keyId,
    name: keyData.name,
    type: keyData.type,
    permissions: keyData.permissions,
    droneId: keyData.droneId,
  };
}

/**
 * List API keys (without revealing actual keys)
 */
function listAPIKeys(filters = {}) {
  let filteredKeys = Array.from(apiKeys.values());

  // Apply filters
  if (filters.type) {
    filteredKeys = filteredKeys.filter(key => key.type === filters.type);
  }

  if (filters.isActive !== undefined) {
    filteredKeys = filteredKeys.filter(key => key.isActive === filters.isActive);
  }

  if (filters.droneId) {
    filteredKeys = filteredKeys.filter(key => key.droneId === filters.droneId);
  }

  const total = filteredKeys.length;

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginatedKeys = filteredKeys.slice(offset, offset + limit);

  // Remove sensitive data
  const publicKeys = paginatedKeys.map(key => {
    const { hashedKey, ...publicKey } = key;
    return {
      ...publicKey,
      keyPreview: `sk_live_****${key.hashedKey.slice(-8)}`, // Show last 8 chars of hash
    };
  });

  return { keys: publicKeys, total };
}

/**
 * Revoke API key
 */
function revokeAPIKey(keyId, revokedBy, reason = 'Manual revocation') {
  const keyData = apiKeys.get(keyId);
  if (!keyData) {
    return { success: false, error: 'API key not found' };
  }

  // Mark as inactive
  keyData.isActive = false;
  keyData.revokedAt = new Date().toISOString();
  keyData.revokedBy = revokedBy;
  keyData.revocationReason = reason;

  // Remove from hash mapping
  keysByHash.delete(keyData.hashedKey);

  // Audit log
  auditLog({
    action: AuditAction.API_KEY_REVOKED,
    userId: revokedBy,
    resource: `/api/keys/${keyId}`,
    details: {
      keyId,
      name: keyData.name,
      type: keyData.type,
      reason,
      droneId: keyData.droneId,
    },
  });

  return { success: true };
}

/**
 * Get API key usage statistics
 */
function getAPIKeyStats() {
  const stats = {
    total: apiKeys.size,
    active: 0,
    byType: {},
    recentUsage: 0,
  };

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  Array.from(apiKeys.values()).forEach(key => {
    if (key.isActive) {
      stats.active++;
    }

    // Count by type
    stats.byType[key.type] = (stats.byType[key.type] || 0) + 1;

    // Count recent usage
    if (key.lastUsed && new Date(key.lastUsed) >= last24Hours) {
      stats.recentUsage++;
    }
  });

  return stats;
}

/**
 * Initialize API key management system
 */
function initAPIKeyManagement() {
  // Create default drone telemetry key for development
  if (process.env.NODE_ENV === 'development' && apiKeys.size === 0) {
    const defaultKey = createAPIKey({
      name: 'Development Drone Key',
      type: 'DRONE_TELEMETRY',
      description: 'Default API key for drone communication in development',
      createdBy: 'system',
      droneId: 'd1',
    });

    if (defaultKey.success) {
      console.log('⚠️  Development API Key Created:');
      console.log(`   Key: ${defaultKey.apiKey.key}`);
      console.log('   Use this key for drone authentication in development mode');
      console.log('   Production deployments should create keys through the admin interface');
    }
  }

  console.log('API Key management initialized');
}

// Use audit actions that are already defined in audit.js
// The API key specific actions should be added there to avoid circular dependencies

module.exports = {
  API_KEY_TYPES,
  createAPIKey,
  verifyAPIKey,
  listAPIKeys,
  revokeAPIKey,
  getAPIKeyStats,
  initAPIKeyManagement,
};