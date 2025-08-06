// Base Data Access Object (DAO) class
// Provides common database operations with error handling, caching, and audit logging

const { executeQuery, executeTransaction, cacheGet, cacheSet, cacheDelete } = require('../database');
const { auditLog, AuditAction } = require('../audit');

class BaseDAO {
  constructor(tableName, schema = 'core') {
    this.tableName = tableName;
    this.schema = schema;
    this.fullTableName = `${schema}.${tableName}`;
    this.cachePrefix = `${schema}_${tableName}`;
    this.defaultCacheTTL = 300; // 5 minutes
  }

  // Helper to generate cache keys
  getCacheKey(id, suffix = '') {
    return `${this.cachePrefix}:${id}${suffix ? ':' + suffix : ''}`;
  }

  // Helper to build WHERE clauses safely
  buildWhereClause(conditions, startIndex = 1) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return { whereClause: '', params: [] };
    }

    const clauses = [];
    const params = [];
    let paramIndex = startIndex;

    Object.entries(conditions).forEach(([key, value]) => {
      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else if (value === undefined) {
        // Skip undefined values
        return;
      } else if (Array.isArray(value)) {
        // Handle IN clauses
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        clauses.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // Handle custom operators like { operator: '>', value: 100 }
        clauses.push(`${key} ${value.operator} $${paramIndex++}`);
        params.push(value.value);
      } else {
        clauses.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    return {
      whereClause: clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '',
      params
    };
  }

  // Generic find by ID with caching
  async findById(id, options = {}) {
    try {
      // Check cache first unless bypassed
      if (!options.skipCache) {
        const cached = await cacheGet(this.getCacheKey(id), { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT * FROM ${this.fullTableName} 
        WHERE id = $1 
        ${this.schema === 'core' ? 'AND deleted_at IS NULL' : ''}
      `;
      
      const result = await executeQuery(query, [id], { readOnly: true });
      
      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];
      
      // Cache the result
      if (!options.skipCache) {
        await cacheSet(this.getCacheKey(id), record, this.defaultCacheTTL);
      }

      return record;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID ${id}:`, error);
      throw error;
    }
  }

  // Generic find all with filtering, pagination, and caching
  async findAll(options = {}) {
    try {
      const {
        conditions = {},
        orderBy = 'created_at DESC',
        limit,
        offset = 0,
        skipCache = false
      } = options;

      // Build cache key for this query
      const cacheKey = this.getCacheKey('all', JSON.stringify({ conditions, orderBy, limit, offset }));
      
      if (!skipCache) {
        const cached = await cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      // Build WHERE clause
      const { whereClause, params } = this.buildWhereClause(conditions);
      
      // Add soft delete filter for core schema
      let finalWhereClause = whereClause;
      if (this.schema === 'core') {
        const deletedFilter = 'deleted_at IS NULL';
        if (whereClause) {
          finalWhereClause = whereClause + ' AND ' + deletedFilter;
        } else {
          finalWhereClause = 'WHERE ' + deletedFilter;
        }
      }

      // Build query
      let query = `SELECT * FROM ${this.fullTableName} ${finalWhereClause}`;
      
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      if (offset > 0) {
        query += ` OFFSET ${offset}`;
      }

      const result = await executeQuery(query, params, { readOnly: true });
      
      // Cache the results
      if (!skipCache) {
        await cacheSet(cacheKey, result.rows, this.defaultCacheTTL);
      }

      return result.rows;
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  // Generic count with conditions
  async count(conditions = {}) {
    try {
      const { whereClause, params } = this.buildWhereClause(conditions);
      
      // Add soft delete filter for core schema
      let finalWhereClause = whereClause;
      if (this.schema === 'core') {
        const deletedFilter = 'deleted_at IS NULL';
        if (whereClause) {
          finalWhereClause = whereClause + ' AND ' + deletedFilter;
        } else {
          finalWhereClause = 'WHERE ' + deletedFilter;
        }
      }

      const query = `SELECT COUNT(*) FROM ${this.fullTableName} ${finalWhereClause}`;
      const result = await executeQuery(query, params, { readOnly: true });
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  // Generic create with audit logging
  async create(data, userId = null) {
    try {
      return await executeTransaction(async (client) => {
        // Add audit fields for core schema
        if (this.schema === 'core') {
          data.created_at = new Date();
          data.updated_at = new Date();
          if (userId) {
            data.created_by = userId;
            data.updated_by = userId;
          }
        }

        // Build INSERT query
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const query = `
          INSERT INTO ${this.fullTableName} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const result = await client.query(query, values);
        const newRecord = result.rows[0];

        // Log the creation
        if (userId) {
          await auditLog({
            action: AuditAction.DATA_CREATE,
            userId: userId,
            resource: this.fullTableName,
            resourceId: newRecord.id,
            details: { 
              tableName: this.tableName,
              recordId: newRecord.id,
              data: data
            }
          });
        }

        // Invalidate cache
        await this.invalidateCache(newRecord.id);

        return newRecord;
      });
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  // Generic update with audit logging
  async update(id, data, userId = null) {
    try {
      return await executeTransaction(async (client) => {
        // Get old record for audit logging
        const oldRecord = await this.findById(id, { skipCache: true });
        if (!oldRecord) {
          throw new Error(`${this.tableName} with ID ${id} not found`);
        }

        // Add audit fields for core schema
        if (this.schema === 'core') {
          data.updated_at = new Date();
          if (userId) {
            data.updated_by = userId;
          }
        }

        // Build UPDATE query
        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

        const query = `
          UPDATE ${this.fullTableName}
          SET ${setClause}
          WHERE id = $1
          ${this.schema === 'core' ? 'AND deleted_at IS NULL' : ''}
          RETURNING *
        `;

        const result = await client.query(query, [id, ...values]);
        
        if (result.rows.length === 0) {
          throw new Error(`${this.tableName} with ID ${id} not found or already deleted`);
        }

        const updatedRecord = result.rows[0];

        // Log the update
        if (userId) {
          const changedFields = [];
          const oldValues = {};
          const newValues = {};

          columns.forEach(column => {
            if (oldRecord[column] !== data[column]) {
              changedFields.push(column);
              oldValues[column] = oldRecord[column];
              newValues[column] = data[column];
            }
          });

          await auditLog({
            action: AuditAction.DATA_UPDATE,
            userId: userId,
            resource: this.fullTableName,
            resourceId: id,
            details: {
              tableName: this.tableName,
              recordId: id,
              changedFields,
              oldValues,
              newValues
            }
          });
        }

        // Invalidate cache
        await this.invalidateCache(id);

        return updatedRecord;
      });
    } catch (error) {
      console.error(`Error updating ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  // Generic soft delete (for core schema) or hard delete
  async delete(id, userId = null) {
    try {
      return await executeTransaction(async (client) => {
        // Get record for audit logging
        const record = await this.findById(id, { skipCache: true });
        if (!record) {
          throw new Error(`${this.tableName} with ID ${id} not found`);
        }

        let query;
        let params;

        if (this.schema === 'core') {
          // Soft delete for core schema
          query = `
            UPDATE ${this.fullTableName}
            SET deleted_at = NOW(), deleted_by = $2
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
          `;
          params = [id, userId];
        } else {
          // Hard delete for other schemas
          query = `DELETE FROM ${this.fullTableName} WHERE id = $1 RETURNING *`;
          params = [id];
        }

        const result = await client.query(query, params);
        
        if (result.rows.length === 0) {
          throw new Error(`${this.tableName} with ID ${id} not found or already deleted`);
        }

        // Log the deletion
        if (userId) {
          await auditLog({
            action: AuditAction.DATA_DELETE,
            userId: userId,
            resource: this.fullTableName,
            resourceId: id,
            details: {
              tableName: this.tableName,
              recordId: id,
              softDelete: this.schema === 'core',
              deletedRecord: record
            }
          });
        }

        // Invalidate cache
        await this.invalidateCache(id);

        return result.rows[0];
      });
    } catch (error) {
      console.error(`Error deleting ${this.tableName} ${id}:`, error);
      throw error;
    }
  }

  // Generic search with full-text search capabilities
  async search(searchTerm, options = {}) {
    try {
      const {
        columns = ['name'], // Default searchable columns
        conditions = {},
        orderBy = 'created_at DESC',
        limit = 50,
        offset = 0
      } = options;

      // Build WHERE clause for additional conditions
      const { whereClause: conditionWhere, params: conditionParams } = this.buildWhereClause(conditions);
      
      // Build full-text search clause
      const searchColumns = columns.map(col => `to_tsvector('english', ${col})`).join(' || ');
      const searchQuery = `(${searchColumns}) @@ plainto_tsquery('english', $${conditionParams.length + 1})`;
      
      // Combine conditions
      let finalWhereClause = searchQuery;
      if (conditionWhere) {
        finalWhereClause = conditionWhere + ' AND ' + searchQuery;
      } else {
        finalWhereClause = 'WHERE ' + searchQuery;
      }
      
      // Add soft delete filter for core schema
      if (this.schema === 'core') {
        finalWhereClause += ' AND deleted_at IS NULL';
      }

      const query = `
        SELECT *, ts_rank(${searchColumns}, plainto_tsquery('english', $${conditionParams.length + 1})) as rank
        FROM ${this.fullTableName}
        ${finalWhereClause}
        ORDER BY rank DESC, ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const params = [...conditionParams, searchTerm];
      const result = await executeQuery(query, params, { readOnly: true });

      return result.rows;
    } catch (error) {
      console.error(`Error searching ${this.tableName}:`, error);
      throw error;
    }
  }

  // Invalidate cache entries for this record
  async invalidateCache(id) {
    try {
      // Invalidate specific record cache
      await cacheDelete(this.getCacheKey(id));
      
      // Invalidate "all" queries cache (simple approach - in production you might want more granular cache invalidation)
      const pattern = `${this.cachePrefix}:all:*`;
      // Note: Redis pattern deletion would need to be implemented based on your Redis setup
      
      console.log(`🗑️ Cache invalidated for ${this.tableName}:${id}`);
    } catch (error) {
      console.error(`Error invalidating cache for ${this.tableName}:${id}:`, error);
      // Don't throw - cache invalidation failures shouldn't break the main operation
    }
  }

  // Bulk operations for performance
  async bulkCreate(records, userId = null) {
    try {
      return await executeTransaction(async (client) => {
        const results = [];
        
        for (const data of records) {
          // Add audit fields for core schema
          if (this.schema === 'core') {
            data.created_at = new Date();
            data.updated_at = new Date();
            if (userId) {
              data.created_by = userId;
              data.updated_by = userId;
            }
          }

          // Build INSERT query
          const columns = Object.keys(data);
          const values = Object.values(data);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

          const query = `
            INSERT INTO ${this.fullTableName} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
          `;

          const result = await client.query(query, values);
          results.push(result.rows[0]);
        }

        // Log bulk creation
        if (userId) {
          await auditLog({
            action: AuditAction.DATA_CREATE,
            userId: userId,
            resource: this.fullTableName,
            details: {
              tableName: this.tableName,
              operation: 'bulk_create',
              recordCount: records.length
            }
          });
        }

        return results;
      });
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName}:`, error);
      throw error;
    }
  }

  // Execute custom query with caching
  async executeCustomQuery(query, params = [], options = {}) {
    try {
      const {
        readOnly = true,
        cacheKey = null,
        cacheTTL = this.defaultCacheTTL
      } = options;

      // Check cache if key provided
      if (cacheKey && !options.skipCache) {
        const cached = await cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const result = await executeQuery(query, params, { readOnly });
      
      // Cache result if key provided
      if (cacheKey && !options.skipCache) {
        await cacheSet(cacheKey, result.rows, cacheTTL);
      }

      return result.rows;
    } catch (error) {
      console.error(`Error executing custom query for ${this.tableName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseDAO;