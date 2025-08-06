// Mission Data Access Object
// Specialized operations for mission management and planning

const BaseDAO = require('./base-dao');
const { executeQuery, executeTransaction } = require('../database');
const { auditLog, AuditAction } = require('../audit');

class MissionDAO extends BaseDAO {
  constructor() {
    super('missions', 'core');
    this.defaultCacheTTL = 300; // 5 minutes
  }

  // Find missions by status with enhanced data
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
        SELECT m.*,
               u1.username as created_by_username,
               u2.username as team_lead_username,
               COALESCE(array_length(m.assigned_drones, 1), 0) as drone_count,
               COALESCE(array_length(m.team_members, 1), 0) as team_size,
               CASE 
                 WHEN m.actual_start_at IS NOT NULL AND m.actual_end_at IS NULL THEN
                   EXTRACT(EPOCH FROM (NOW() - m.actual_start_at)) / 60
                 WHEN m.actual_start_at IS NOT NULL AND m.actual_end_at IS NOT NULL THEN
                   EXTRACT(EPOCH FROM (m.actual_end_at - m.actual_start_at)) / 60
                 ELSE NULL
               END as actual_duration_minutes
        FROM ${this.fullTableName} m
        LEFT JOIN auth.users u1 ON m.created_by = u1.id
        LEFT JOIN auth.users u2 ON m.team_lead_id = u2.id
        WHERE m.status = $1 AND m.deleted_at IS NULL
        ORDER BY 
          CASE 
            WHEN m.status = 'active' THEN m.actual_start_at
            WHEN m.status = 'scheduled' THEN m.scheduled_start_at
            ELSE m.created_at
          END DESC
      `;

      const result = await executeQuery(query, [status], { readOnly: true });
      
      // Cache the results
      if (!options.skipCache) {
        await this.cacheSet(cacheKey, result.rows, this.defaultCacheTTL);
      }

      return result.rows;
    } catch (error) {
      console.error(`Error finding missions by status ${status}:`, error);
      throw error;
    }
  }

  // Find missions by threat level
  async findByThreatLevel(threatLevel, options = {}) {
    try {
      const additionalConditions = { threat_level: threatLevel };
      
      return await this.findAll({
        conditions: additionalConditions,
        orderBy: 'scheduled_start_at DESC',
        ...options
      });
    } catch (error) {
      console.error(`Error finding missions by threat level ${threatLevel}:`, error);
      throw error;
    }
  }

  // Find active missions with real-time progress
  async findActiveMissions(options = {}) {
    try {
      const cacheKey = this.getCacheKey('active_detailed');
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT m.*,
               u1.username as created_by_username,
               u2.username as team_lead_username,
               EXTRACT(EPOCH FROM (NOW() - m.actual_start_at)) / 60 as elapsed_minutes,
               CASE 
                 WHEN m.scheduled_end_at IS NOT NULL THEN
                   EXTRACT(EPOCH FROM (m.scheduled_end_at - NOW())) / 60
                 ELSE NULL
               END as remaining_minutes,
               -- Get assigned drone details
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', d.id,
                     'name', d.name,
                     'status', d.status,
                     'battery_percentage', d.battery_percentage,
                     'signal_strength', d.signal_strength
                   )
                 )
                 FROM core.drones d
                 WHERE d.id = ANY(m.assigned_drones) AND d.deleted_at IS NULL
               ) as drone_details,
               -- Get recent telemetry summary
               (
                 SELECT json_build_object(
                   'total_messages', COUNT(*),
                   'last_update', MAX(timestamp),
                   'avg_battery', AVG(battery_percentage),
                   'min_battery', MIN(battery_percentage)
                 )
                 FROM telemetry.drone_telemetry dt
                 WHERE dt.mission_id = m.id
                 AND dt.timestamp > NOW() - INTERVAL '1 hour'
               ) as telemetry_summary
        FROM ${this.fullTableName} m
        LEFT JOIN auth.users u1 ON m.created_by = u1.id
        LEFT JOIN auth.users u2 ON m.team_lead_id = u2.id
        WHERE m.status = 'active' AND m.deleted_at IS NULL
        ORDER BY m.actual_start_at DESC
      `;

      const result = await executeQuery(query, [], { readOnly: true });
      
      // Cache for shorter duration due to real-time nature
      if (!options.skipCache) {
        await this.cacheSet(cacheKey, result.rows, 60); // 1 minute
      }

      return result.rows;
    } catch (error) {
      console.error('Error finding active missions:', error);
      throw error;
    }
  }

  // Find missions in a date range
  async findInDateRange(startDate, endDate, options = {}) {
    try {
      const query = `
        SELECT m.*,
               u1.username as created_by_username,
               u2.username as team_lead_username
        FROM ${this.fullTableName} m
        LEFT JOIN auth.users u1 ON m.created_by = u1.id
        LEFT JOIN auth.users u2 ON m.team_lead_id = u2.id
        WHERE m.deleted_at IS NULL
        AND (
          (m.scheduled_start_at BETWEEN $1 AND $2)
          OR (m.scheduled_end_at BETWEEN $1 AND $2)
          OR (m.actual_start_at BETWEEN $1 AND $2)
          OR (m.actual_end_at BETWEEN $1 AND $2)
          OR (m.scheduled_start_at <= $1 AND m.scheduled_end_at >= $2)
        )
        ORDER BY m.scheduled_start_at ASC
      `;

      const result = await executeQuery(query, [startDate, endDate], { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error(`Error finding missions in date range:`, error);
      throw error;
    }
  }

  // Update mission status with validation and state management
  async updateStatus(id, newStatus, userId, options = {}) {
    try {
      return await executeTransaction(async (client) => {
        // Get current mission state
        const mission = await this.findById(id, { skipCache: true });
        if (!mission) {
          throw new Error(`Mission with ID ${id} not found`);
        }

        const oldStatus = mission.status;

        // Validate status transition
        this.validateStatusTransition(oldStatus, newStatus);

        // Handle status-specific logic
        const updateFields = { status: newStatus, updated_by: userId, updated_at: new Date() };

        if (newStatus === 'active' && !mission.actual_start_at) {
          updateFields.actual_start_at = new Date();
        } else if (newStatus === 'completed' && !mission.actual_end_at) {
          updateFields.actual_end_at = new Date();
          updateFields.progress_percentage = 100;
        } else if (newStatus === 'cancelled' || newStatus === 'aborted') {
          if (!mission.actual_end_at) {
            updateFields.actual_end_at = new Date();
          }
        }

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

        const result = await client.query(query, [id, ...values]);
        
        if (result.rows.length === 0) {
          throw new Error(`Mission with ID ${id} not found or already deleted`);
        }

        const updatedMission = result.rows[0];

        // Log the status change
        await auditLog({
          action: AuditAction.MISSION_UPDATED,
          userId: userId,
          resource: `/api/missions/${id}`,
          resourceId: id,
          details: {
            missionId: id,
            missionName: mission.name,
            statusChange: { from: oldStatus, to: newStatus },
            reason: options.reason || 'Status update',
            additionalFields: updateFields
          }
        });

        // Invalidate cache
        await this.invalidateCache(id);
        await this.cacheDelete(this.getCacheKey('status', oldStatus));
        await this.cacheDelete(this.getCacheKey('status', newStatus));
        await this.cacheDelete(this.getCacheKey('active_detailed'));

        return updatedMission;
      });
    } catch (error) {
      console.error(`Error updating mission status for ${id}:`, error);
      throw error;
    }
  }

  // Assign drones to mission with validation
  async assignDrones(missionId, droneIds, userId) {
    try {
      return await executeTransaction(async (client) => {
        // Get mission details
        const mission = await this.findById(missionId, { skipCache: true });
        if (!mission) {
          throw new Error(`Mission with ID ${missionId} not found`);
        }

        // Validate mission status
        if (!['scheduled', 'active'].includes(mission.status)) {
          throw new Error(`Cannot assign drones to ${mission.status} mission`);
        }

        // Validate each drone
        for (const droneId of droneIds) {
          const droneQuery = `
            SELECT id, name, status, battery_percentage, next_maintenance_at
            FROM core.drones 
            WHERE id = $1 AND deleted_at IS NULL
          `;
          const droneResult = await client.query(droneQuery, [droneId]);
          
          if (droneResult.rows.length === 0) {
            throw new Error(`Drone with ID ${droneId} not found`);
          }

          const drone = droneResult.rows[0];
          
          if (drone.status === 'maintenance') {
            throw new Error(`Cannot assign drone ${drone.name} - currently in maintenance`);
          }
          
          if (drone.battery_percentage < 20) {
            throw new Error(`Cannot assign drone ${drone.name} - battery too low (${drone.battery_percentage}%)`);
          }
          
          if (drone.next_maintenance_at && new Date(drone.next_maintenance_at) <= new Date()) {
            throw new Error(`Cannot assign drone ${drone.name} - maintenance overdue`);
          }
        }

        // Update mission with assigned drones
        const updateQuery = `
          UPDATE ${this.fullTableName}
          SET assigned_drones = $2, updated_at = NOW(), updated_by = $3
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `;

        const result = await client.query(updateQuery, [missionId, droneIds, userId]);
        const updatedMission = result.rows[0];

        // Update drones with mission assignment
        const droneUpdateQuery = `
          UPDATE core.drones
          SET current_mission_id = $1, updated_at = NOW(), updated_by = $2
          WHERE id = ANY($3) AND deleted_at IS NULL
        `;

        await client.query(droneUpdateQuery, [missionId, userId, droneIds]);

        // Log the assignment
        await auditLog({
          action: AuditAction.MISSION_UPDATED,
          userId: userId,
          resource: `/api/missions/${missionId}/assign-drones`,
          resourceId: missionId,
          details: {
            missionId,
            missionName: mission.name,
            assignedDrones: droneIds,
            previousDrones: mission.assigned_drones || [],
            action: 'drone_assignment'
          }
        });

        // Invalidate cache
        await this.invalidateCache(missionId);
        await this.cacheDelete(this.getCacheKey('active_detailed'));

        return updatedMission;
      });
    } catch (error) {
      console.error(`Error assigning drones to mission ${missionId}:`, error);
      throw error;
    }
  }

  // Update mission progress
  async updateProgress(id, progress, userId, notes = null) {
    try {
      if (progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }

      const updateData = {
        progress_percentage: progress,
        updated_at: new Date(),
        updated_by: userId
      };

      // Auto-complete mission if progress reaches 100%
      if (progress === 100) {
        const mission = await this.findById(id, { skipCache: true });
        if (mission && mission.status === 'active') {
          updateData.status = 'completed';
          updateData.actual_end_at = new Date();
        }
      }

      const result = await this.update(id, updateData, userId);

      // Log progress update
      await auditLog({
        action: AuditAction.MISSION_UPDATED,
        userId: userId,
        resource: `/api/missions/${id}/progress`,
        resourceId: id,
        details: {
          missionId: id,
          progressUpdate: progress,
          notes: notes,
          autoCompleted: updateData.status === 'completed'
        }
      });

      return result;
    } catch (error) {
      console.error(`Error updating mission progress for ${id}:`, error);
      throw error;
    }
  }

  // Get mission statistics
  async getMissionStatistics(options = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date()
      } = options;

      const cacheKey = this.getCacheKey('stats', `${startDate.toISOString()}_${endDate.toISOString()}`);
      
      const cached = await this.cacheGet(cacheKey, { json: true });
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COUNT(*) as total_missions,
          COUNT(*) FILTER (WHERE status = 'active') as active_missions,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_missions,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_missions,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_missions,
          COUNT(*) FILTER (WHERE status = 'aborted') as aborted_missions,
          AVG(progress_percentage) as avg_progress,
          AVG(threat_level) as avg_threat_level,
          COUNT(*) FILTER (WHERE threat_level >= 3) as high_threat_missions,
          AVG(EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) / 60) FILTER (WHERE actual_end_at IS NOT NULL AND actual_start_at IS NOT NULL) as avg_duration_minutes,
          -- Mission completion rate
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled', 'aborted')), 0)) * 100, 
            2
          ) as completion_rate_percentage,
          -- Missions by month
          json_agg(
            json_build_object(
              'month', TO_CHAR(created_at, 'YYYY-MM'),
              'count', COUNT(*) OVER (PARTITION BY TO_CHAR(created_at, 'YYYY-MM'))
            )
          ) as by_month
        FROM ${this.fullTableName}
        WHERE deleted_at IS NULL
        AND created_at BETWEEN $1 AND $2
      `;

      const result = await executeQuery(query, [startDate, endDate], { readOnly: true });
      const stats = result.rows[0];

      // Process by_month data to remove duplicates
      if (stats.by_month) {
        const monthlyStats = {};
        stats.by_month.forEach(item => {
          if (item.month) {
            monthlyStats[item.month] = item.count;
          }
        });
        stats.by_month = Object.entries(monthlyStats).map(([month, count]) => ({ month, count }));
      }

      // Cache for 10 minutes
      await this.cacheSet(cacheKey, stats, 600);

      return stats;
    } catch (error) {
      console.error('Error getting mission statistics:', error);
      throw error;
    }
  }

  // Find missions by assigned drone
  async findByDrone(droneId, options = {}) {
    try {
      const query = `
        SELECT m.*,
               u1.username as created_by_username,
               u2.username as team_lead_username
        FROM ${this.fullTableName} m
        LEFT JOIN auth.users u1 ON m.created_by = u1.id
        LEFT JOIN auth.users u2 ON m.team_lead_id = u2.id
        WHERE m.deleted_at IS NULL
        AND $1 = ANY(m.assigned_drones)
        ORDER BY m.created_at DESC
        ${options.limit ? `LIMIT ${options.limit}` : ''}
      `;

      const result = await executeQuery(query, [droneId], { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error(`Error finding missions by drone ${droneId}:`, error);
      throw error;
    }
  }

  // Validate status transitions
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'scheduled': ['active', 'cancelled'],
      'active': ['completed', 'aborted', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [], // Final state
      'aborted': ['scheduled'] // Can be rescheduled
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  // Search missions with advanced filters
  async searchMissions(searchTerm, options = {}) {
    try {
      const {
        status,
        threatLevel,
        priority,
        classification,
        dateFrom,
        dateTo,
        createdBy,
        ...baseOptions
      } = options;

      // Build additional conditions
      const additionalConditions = {};
      
      if (status) additionalConditions.status = status;
      if (threatLevel !== undefined) additionalConditions.threat_level = threatLevel;
      if (priority) additionalConditions.priority = priority;
      if (classification) additionalConditions.classification = classification;
      if (createdBy) additionalConditions.created_by = createdBy;
      
      // Date range conditions
      if (dateFrom) {
        additionalConditions.created_at = { operator: '>=', value: dateFrom };
      }
      if (dateTo) {
        const existingDateCondition = additionalConditions.created_at;
        if (existingDateCondition) {
          // Need to handle multiple date conditions differently
          // For now, we'll use the more restrictive condition
          additionalConditions.created_at = { operator: 'BETWEEN', value: [dateFrom, dateTo] };
        } else {
          additionalConditions.created_at = { operator: '<=', value: dateTo };
        }
      }

      const searchOptions = {
        ...baseOptions,
        conditions: { ...additionalConditions, ...baseOptions.conditions },
        columns: ['name', 'description', 'location_name']
      };

      return await this.search(searchTerm, searchOptions);
    } catch (error) {
      console.error(`Error searching missions:`, error);
      throw error;
    }
  }
}

module.exports = MissionDAO;