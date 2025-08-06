// Drone Data Access Object
// Specialized operations for drone fleet management

const BaseDAO = require('./base-dao');
const { executeQuery, executeTransaction } = require('../database');
const { auditLog, AuditAction } = require('../audit');

class DroneDAO extends BaseDAO {
  constructor() {
    super('drones', 'core');
    this.defaultCacheTTL = 180; // 3 minutes for more dynamic drone data
  }

  // Find drones by status with caching
  async findByStatus(status, options = {}) {
    try {
      const cacheKey = this.getCacheKey('status', status);
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT d.*, 
               m.name as current_mission_name,
               u.username as operator_username
        FROM ${this.fullTableName} d
        LEFT JOIN core.missions m ON d.current_mission_id = m.id AND m.deleted_at IS NULL
        LEFT JOIN auth.users u ON d.operator_id = u.id AND u.deleted_at IS NULL
        WHERE d.status = $1 AND d.deleted_at IS NULL
        ORDER BY d.name ASC
      `;

      const result = await executeQuery(query, [status], { readOnly: true });
      
      // Cache the results
      if (!options.skipCache) {
        await this.cacheSet(cacheKey, result.rows, this.defaultCacheTTL);
      }

      return result.rows;
    } catch (error) {
      console.error(`Error finding drones by status ${status}:`, error);
      throw error;
    }
  }

  // Find drones by type
  async findByType(type, options = {}) {
    try {
      return await this.findAll({
        conditions: { type },
        orderBy: 'name ASC',
        ...options
      });
    } catch (error) {
      console.error(`Error finding drones by type ${type}:`, error);
      throw error;
    }
  }

  // Find drones needing maintenance
  async findNeedingMaintenance(options = {}) {
    try {
      const cacheKey = this.getCacheKey('maintenance_needed');
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT d.*, 
               EXTRACT(EPOCH FROM (d.next_maintenance_at - NOW())) / 3600 as hours_until_maintenance
        FROM ${this.fullTableName} d
        WHERE d.deleted_at IS NULL
        AND (
          d.next_maintenance_at <= NOW() + INTERVAL '7 days'
          OR d.status = 'maintenance'
          OR d.total_flight_hours >= d.maintenance_hours_threshold
        )
        ORDER BY d.next_maintenance_at ASC
      `;

      const result = await executeQuery(query, [], { readOnly: true });
      
      // Cache the results
      if (!options.skipCache) {
        await this.cacheSet(cacheKey, result.rows, 600); // 10 minutes
      }

      return result.rows;
    } catch (error) {
      console.error('Error finding drones needing maintenance:', error);
      throw error;
    }
  }

  // Update drone status with validation and audit logging
  async updateStatus(id, newStatus, userId, options = {}) {
    try {
      return await executeTransaction(async (client) => {
        // Get current drone state
        const drone = await this.findById(id, { skipCache: true });
        if (!drone) {
          throw new Error(`Drone with ID ${id} not found`);
        }

        const oldStatus = drone.status;

        // Validate status transition
        this.validateStatusTransition(oldStatus, newStatus);

        // Additional checks for specific status changes
        if (newStatus === 'active' && drone.battery_percentage < 20) {
          throw new Error(`Cannot activate drone ${drone.name} - battery too low (${drone.battery_percentage}%)`);
        }

        if (newStatus === 'active' && drone.next_maintenance_at && drone.next_maintenance_at <= new Date()) {
          throw new Error(`Cannot activate drone ${drone.name} - maintenance overdue`);
        }

        // Update the status
        const query = `
          UPDATE ${this.fullTableName}
          SET status = $2, updated_at = NOW(), updated_by = $3
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `;

        const result = await client.query(query, [id, newStatus, userId]);
        
        if (result.rows.length === 0) {
          throw new Error(`Drone with ID ${id} not found or already deleted`);
        }

        const updatedDrone = result.rows[0];

        // Log the status change
        await auditLog({
          action: AuditAction.DRONE_STATUS_CHANGED,
          userId: userId,
          resource: `/api/drones/${id}/status`,
          resourceId: id,
          details: {
            droneId: id,
            droneName: drone.name,
            oldStatus,
            newStatus,
            reason: options.reason || 'Manual status change'
          }
        });

        // Invalidate cache
        await this.invalidateCache(id);
        await this.cacheDelete(this.getCacheKey('status', oldStatus));
        await this.cacheDelete(this.getCacheKey('status', newStatus));

        return updatedDrone;
      });
    } catch (error) {
      console.error(`Error updating drone status for ${id}:`, error);
      throw error;
    }
  }

  // Assign drone to mission
  async assignToMission(droneId, missionId, userId) {
    try {
      return await executeTransaction(async (client) => {
        // Validate drone availability
        const drone = await this.findById(droneId, { skipCache: true });
        if (!drone) {
          throw new Error(`Drone with ID ${droneId} not found`);
        }

        if (drone.status === 'maintenance') {
          throw new Error(`Cannot assign drone ${drone.name} - currently in maintenance`);
        }

        if (drone.battery_percentage < 20) {
          throw new Error(`Cannot assign drone ${drone.name} - battery too low (${drone.battery_percentage}%)`);
        }

        // Update drone assignment
        const query = `
          UPDATE ${this.fullTableName}
          SET current_mission_id = $2, updated_at = NOW(), updated_by = $3
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `;

        const result = await client.query(query, [droneId, missionId, userId]);
        const updatedDrone = result.rows[0];

        // Log the assignment
        await auditLog({
          action: AuditAction.DRONE_ASSIGNED,
          userId: userId,
          resource: `/api/drones/${droneId}/assign`,
          resourceId: droneId,
          details: {
            droneId,
            droneName: drone.name,
            missionId,
            previousMission: drone.current_mission_id
          }
        });

        // Invalidate cache
        await this.invalidateCache(droneId);

        return updatedDrone;
      });
    } catch (error) {
      console.error(`Error assigning drone ${droneId} to mission ${missionId}:`, error);
      throw error;
    }
  }

  // Update drone telemetry (battery, location, etc.)
  async updateTelemetry(id, telemetryData, apiKeyId = null) {
    try {
      const updateFields = {};
      const allowedFields = [
        'battery_percentage', 'signal_strength', 'current_latitude', 
        'current_longitude', 'current_altitude_m', 'current_heading', 
        'current_speed_ms', 'firmware_version'
      ];

      // Filter and validate telemetry data
      allowedFields.forEach(field => {
        if (telemetryData[field] !== undefined) {
          updateFields[field] = telemetryData[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid telemetry fields provided');
      }

      updateFields.updated_at = new Date();

      // Build UPDATE query
      const columns = Object.keys(updateFields);
      const values = Object.values(updateFields);
      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

      const query = `
        UPDATE ${this.fullTableName}
        SET ${setClause}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await executeQuery(query, [id, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error(`Drone with ID ${id} not found`);
      }

      const updatedDrone = result.rows[0];

      // Invalidate cache
      await this.invalidateCache(id);
      
      // Invalidate status-based caches if status might have changed
      if (updateFields.battery_percentage !== undefined) {
        await this.cacheDelete(this.getCacheKey('status', updatedDrone.status));
      }

      return updatedDrone;
    } catch (error) {
      console.error(`Error updating drone telemetry for ${id}:`, error);
      throw error;
    }
  }

  // Get drone fleet statistics
  async getFleetStatistics() {
    try {
      const cacheKey = this.getCacheKey('fleet_stats');
      
      const cached = await this.cacheGet(cacheKey, { json: true });
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COUNT(*) as total_drones,
          COUNT(*) FILTER (WHERE status = 'active') as active_drones,
          COUNT(*) FILTER (WHERE status = 'idle') as idle_drones,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_drones,
          COUNT(*) FILTER (WHERE status = 'offline') as offline_drones,
          AVG(battery_percentage) as avg_battery,
          AVG(signal_strength) as avg_signal,
          SUM(total_flight_hours) as total_flight_hours,
          COUNT(*) FILTER (WHERE next_maintenance_at <= NOW() + INTERVAL '7 days') as maintenance_due_soon,
          COUNT(*) FILTER (WHERE battery_percentage < 30) as low_battery_count,
          json_agg(
            json_build_object(
              'type', type,
              'count', count
            )
          ) FILTER (WHERE type IS NOT NULL) as by_type
        FROM (
          SELECT *, COUNT(*) OVER (PARTITION BY type) as count
          FROM ${this.fullTableName}
          WHERE deleted_at IS NULL
        ) d
        GROUP BY ()
      `;

      const result = await executeQuery(query, [], { readOnly: true });
      const stats = result.rows[0];

      // Process by_type data to remove duplicates
      if (stats.by_type) {
        const typeStats = {};
        stats.by_type.forEach(item => {
          if (item.type) {
            typeStats[item.type] = item.count;
          }
        });
        stats.by_type = Object.entries(typeStats).map(([type, count]) => ({ type, count }));
      }

      // Cache for 5 minutes
      await this.cacheSet(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      console.error('Error getting fleet statistics:', error);
      throw error;
    }
  }

  // Find drones within a geographic area
  async findInArea(centerLat, centerLng, radiusKm, options = {}) {
    try {
      const query = `
        SELECT d.*, 
               ST_Distance(
                 ST_Point(d.current_longitude, d.current_latitude)::geography,
                 ST_Point($2, $1)::geography
               ) / 1000 as distance_km
        FROM ${this.fullTableName} d
        WHERE d.deleted_at IS NULL
        AND d.current_latitude IS NOT NULL 
        AND d.current_longitude IS NOT NULL
        AND ST_DWithin(
          ST_Point(d.current_longitude, d.current_latitude)::geography,
          ST_Point($2, $1)::geography,
          $3 * 1000
        )
        ORDER BY distance_km ASC
      `;

      const result = await executeQuery(query, [centerLat, centerLng, radiusKm], { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error(`Error finding drones in area (${centerLat}, ${centerLng}, ${radiusKm}km):`, error);
      // If PostGIS is not available, fall back to a simpler calculation
      return await this.findInAreaFallback(centerLat, centerLng, radiusKm, options);
    }
  }

  // Fallback geographic search without PostGIS
  async findInAreaFallback(centerLat, centerLng, radiusKm, options = {}) {
    try {
      const query = `
        SELECT d.*,
               (
                 6371 * acos(
                   cos(radians($1)) * cos(radians(d.current_latitude)) *
                   cos(radians(d.current_longitude) - radians($2)) +
                   sin(radians($1)) * sin(radians(d.current_latitude))
                 )
               ) as distance_km
        FROM ${this.fullTableName} d
        WHERE d.deleted_at IS NULL
        AND d.current_latitude IS NOT NULL 
        AND d.current_longitude IS NOT NULL
        HAVING distance_km <= $3
        ORDER BY distance_km ASC
      `;

      const result = await executeQuery(query, [centerLat, centerLng, radiusKm], { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error(`Error finding drones in area (fallback):`, error);
      throw error;
    }
  }

  // Validate status transitions
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'offline': ['idle', 'maintenance'],
      'idle': ['active', 'maintenance', 'offline'],
      'active': ['idle', 'offline'], // Can't go directly to maintenance while active
      'maintenance': ['idle', 'offline']
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  // Search drones with additional filters
  async searchDrones(searchTerm, options = {}) {
    try {
      const {
        status,
        type,
        batteryMin,
        batteryMax,
        signalMin,
        maintenanceDue,
        ...baseOptions
      } = options;

      // Build additional conditions
      const additionalConditions = {};
      
      if (status) additionalConditions.status = status;
      if (type) additionalConditions.type = type;
      if (batteryMin !== undefined) additionalConditions.battery_percentage = { operator: '>=', value: batteryMin };
      if (batteryMax !== undefined) additionalConditions.battery_percentage = { operator: '<=', value: batteryMax };
      if (signalMin !== undefined) additionalConditions.signal_strength = { operator: '>=', value: signalMin };

      const searchOptions = {
        ...baseOptions,
        conditions: { ...additionalConditions, ...baseOptions.conditions },
        columns: ['name', 'serial_number', 'model']
      };

      return await this.search(searchTerm, searchOptions);
    } catch (error) {
      console.error(`Error searching drones:`, error);
      throw error;
    }
  }
}

module.exports = DroneDAO;