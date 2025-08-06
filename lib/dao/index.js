// Data Access Object Index
// Centralized access to all DAO classes with factory pattern

const BaseDAO = require('./base-dao');
const DroneDAO = require('./drone-dao');
const MissionDAO = require('./mission-dao');
const TelemetryDAO = require('./telemetry-dao');

// Create DAO instances (singletons)
const daoInstances = {
  base: new BaseDAO('base', 'core'),
  drones: new DroneDAO(),
  missions: new MissionDAO(),
  telemetry: new TelemetryDAO(),
};

// Additional specialized DAOs for other tables
class UserDAO extends BaseDAO {
  constructor() {
    super('users', 'auth');
    this.defaultCacheTTL = 600; // 10 minutes for user data
  }

  // Find user by username
  async findByUsername(username, options = {}) {
    try {
      const cacheKey = this.getCacheKey('username', username);
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT * FROM ${this.fullTableName} 
        WHERE username = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.executeCustomQuery(query, [username], { readOnly: true });
      const user = result[0] || null;
      
      if (user && !options.skipCache) {
        await this.cacheSet(cacheKey, user, this.defaultCacheTTL);
      }

      return user;
    } catch (error) {
      console.error(`Error finding user by username ${username}:`, error);
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email, options = {}) {
    try {
      const cacheKey = this.getCacheKey('email', email);
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT * FROM ${this.fullTableName} 
        WHERE email = $1 AND deleted_at IS NULL
      `;
      
      const result = await this.executeCustomQuery(query, [email], { readOnly: true });
      const user = result[0] || null;
      
      if (user && !options.skipCache) {
        await this.cacheSet(cacheKey, user, this.defaultCacheTTL);
      }

      return user;
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  // Update user password with security checks
  async updatePassword(userId, passwordHash, updatedBy) {
    try {
      const updateData = {
        password_hash: passwordHash,
        password_changed_at: new Date(),
        updated_by: updatedBy
      };

      const result = await this.update(userId, updateData, updatedBy);
      
      // Invalidate all user sessions when password changes
      await this.executeCustomQuery(
        'UPDATE auth.user_sessions SET revoked_at = NOW(), revoked_reason = $2 WHERE user_id = $1 AND revoked_at IS NULL',
        [userId, 'Password changed'],
        { readOnly: false }
      );

      return result;
    } catch (error) {
      console.error(`Error updating password for user ${userId}:`, error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics() {
    try {
      const cacheKey = this.getCacheKey('user_stats');
      
      const cached = await this.cacheGet(cacheKey, { json: true });
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
          COUNT(*) FILTER (WHERE role = 'operator') as operator_users,
          COUNT(*) FILTER (WHERE role = 'analyst') as analyst_users,
          COUNT(*) FILTER (WHERE role = 'viewer') as viewer_users,
          COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as users_active_24h,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
        FROM ${this.fullTableName}
        WHERE deleted_at IS NULL
      `;

      const result = await this.executeCustomQuery(query, [], { readOnly: true });
      const stats = result[0];
      
      // Cache for 10 minutes
      await this.cacheSet(cacheKey, stats, 600);

      return stats;
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }
}

class ApiKeyDAO extends BaseDAO {
  constructor() {
    super('api_keys', 'auth');
    this.defaultCacheTTL = 300; // 5 minutes
  }

  // Find API key by key_id
  async findByKeyId(keyId, options = {}) {
    try {
      const cacheKey = this.getCacheKey('key_id', keyId);
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT * FROM ${this.fullTableName} 
        WHERE key_id = $1 AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      `;
      
      const result = await this.executeCustomQuery(query, [keyId], { readOnly: true });
      const apiKey = result[0] || null;
      
      if (apiKey && !options.skipCache) {
        await this.cacheSet(cacheKey, apiKey, this.defaultCacheTTL);
      }

      return apiKey;
    } catch (error) {
      console.error(`Error finding API key by key_id ${keyId}:`, error);
      throw error;
    }
  }

  // Update API key usage
  async updateUsage(keyId) {
    try {
      const query = `
        UPDATE ${this.fullTableName}
        SET last_used_at = NOW(), usage_count = usage_count + 1
        WHERE key_id = $1
        RETURNING *
      `;
      
      const result = await this.executeCustomQuery(query, [keyId], { readOnly: false });
      
      // Invalidate cache
      await this.cacheDelete(this.getCacheKey('key_id', keyId));
      
      return result[0];
    } catch (error) {
      console.error(`Error updating API key usage for ${keyId}:`, error);
      throw error;
    }
  }
}

class AuditDAO extends BaseDAO {
  constructor() {
    super('audit_logs', 'audit');
    this.defaultCacheTTL = 0; // No caching for audit logs
  }

  // Insert audit log entry
  async logEntry(logData) {
    try {
      // Ensure required fields
      if (!logData.action || !logData.occurred_at) {
        logData.occurred_at = new Date();
      }

      // Generate checksum for integrity
      if (logData.previous_checksum) {
        const crypto = require('crypto');
        const dataString = JSON.stringify({
          action: logData.action,
          user_id: logData.user_id,
          resource: logData.resource,
          occurred_at: logData.occurred_at
        });
        logData.checksum = crypto.createHash('sha256').update(dataString + logData.previous_checksum).digest('hex');
      }

      return await this.create(logData);
    } catch (error) {
      console.error('Error inserting audit log entry:', error);
      throw error;
    }
  }

  // Query audit logs with advanced filtering
  async queryLogs(filters = {}, options = {}) {
    try {
      const {
        userId,
        action,
        resource,
        resourceType,
        startDate,
        endDate,
        success,
        ipAddress
      } = filters;

      const conditions = {};
      
      if (userId) conditions.user_id = userId;
      if (action) conditions.action = action;
      if (resource) conditions.resource = resource;
      if (resourceType) conditions.resource_type = resourceType;
      if (success !== undefined) conditions.success = success;
      if (ipAddress) conditions.ip_address = ipAddress;
      
      // Date range handling
      if (startDate && endDate) {
        conditions.occurred_at = { operator: 'BETWEEN', value: [startDate, endDate] };
      } else if (startDate) {
        conditions.occurred_at = { operator: '>=', value: startDate };
      } else if (endDate) {
        conditions.occurred_at = { operator: '<=', value: endDate };
      }

      return await this.findAll({
        conditions,
        orderBy: 'occurred_at DESC',
        ...options
      });
    } catch (error) {
      console.error('Error querying audit logs:', error);
      throw error;
    }
  }
}

// Add DAO instances to the registry
daoInstances.users = new UserDAO();
daoInstances.apiKeys = new ApiKeyDAO();
daoInstances.audit = new AuditDAO();

// DAO Factory class for creating custom DAOs
class DAOFactory {
  static create(tableName, schema = 'core') {
    return new BaseDAO(tableName, schema);
  }

  static getDAO(name) {
    if (!daoInstances[name]) {
      throw new Error(`DAO '${name}' not found. Available DAOs: ${Object.keys(daoInstances).join(', ')}`);
    }
    return daoInstances[name];
  }

  static registerDAO(name, daoInstance) {
    if (!(daoInstance instanceof BaseDAO)) {
      throw new Error('DAO instance must extend BaseDAO');
    }
    daoInstances[name] = daoInstance;
  }

  static listDAOs() {
    return Object.keys(daoInstances);
  }

  // Health check for all DAOs
  static async healthCheck() {
    const results = {};
    
    for (const [name, dao] of Object.entries(daoInstances)) {
      try {
        // Simple connectivity test
        await dao.count();
        results[name] = { status: 'healthy', error: null };
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }
    
    return results;
  }
}

// Export main interfaces
module.exports = {
  // DAO Classes
  BaseDAO,
  DroneDAO,
  MissionDAO,
  TelemetryDAO,
  UserDAO,
  ApiKeyDAO,
  AuditDAO,

  // Factory and registry
  DAOFactory,

  // Direct access to instances
  drones: daoInstances.drones,
  missions: daoInstances.missions,
  telemetry: daoInstances.telemetry,
  users: daoInstances.users,
  apiKeys: daoInstances.apiKeys,
  audit: daoInstances.audit,

  // Utility functions
  getDAO: DAOFactory.getDAO,
  createDAO: DAOFactory.create,
  registerDAO: DAOFactory.registerDAO,
  listDAOs: DAOFactory.listDAOs,
  healthCheck: DAOFactory.healthCheck
};