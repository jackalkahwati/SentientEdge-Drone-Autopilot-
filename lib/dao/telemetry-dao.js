// Telemetry Data Access Object
// High-performance operations for drone telemetry and sensor data

const BaseDAO = require('./base-dao');
const { executeQuery, executeTransaction } = require('../database');

class TelemetryDAO extends BaseDAO {
  constructor() {
    super('drone_telemetry', 'telemetry');
    this.defaultCacheTTL = 60; // 1 minute for real-time telemetry data
  }

  // Insert telemetry data with high performance batch processing
  async insertTelemetry(telemetryData) {
    try {
      // Ensure required fields
      if (!telemetryData.drone_id || !telemetryData.timestamp) {
        throw new Error('drone_id and timestamp are required for telemetry data');
      }

      // Add received timestamp if not provided
      if (!telemetryData.received_at) {
        telemetryData.received_at = new Date();
      }

      // Insert telemetry record
      const columns = Object.keys(telemetryData);
      const values = Object.values(telemetryData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.fullTableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING id, timestamp, received_at
      `;

      const result = await executeQuery(query, values);
      
      // Update drone's current state if this is the latest telemetry
      if (telemetryData.latitude && telemetryData.longitude) {
        await this.updateDroneCurrentState(telemetryData);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error inserting telemetry data:', error);
      throw error;
    }
  }

  // Batch insert for high-volume telemetry
  async batchInsertTelemetry(telemetryBatch) {
    try {
      if (!Array.isArray(telemetryBatch) || telemetryBatch.length === 0) {
        throw new Error('telemetryBatch must be a non-empty array');
      }

      return await executeTransaction(async (client) => {
        const results = [];
        const now = new Date();

        for (const telemetryData of telemetryBatch) {
          // Validate required fields
          if (!telemetryData.drone_id || !telemetryData.timestamp) {
            console.warn('Skipping telemetry record without drone_id or timestamp');
            continue;
          }

          // Add received timestamp
          if (!telemetryData.received_at) {
            telemetryData.received_at = now;
          }

          // Insert record
          const columns = Object.keys(telemetryData);
          const values = Object.values(telemetryData);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

          const query = `
            INSERT INTO ${this.fullTableName} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING id, drone_id, timestamp
          `;

          const result = await client.query(query, values);
          results.push(result.rows[0]);
        }

        return results;
      });
    } catch (error) {
      console.error('Error batch inserting telemetry data:', error);
      throw error;
    }
  }

  // Get latest telemetry for a drone
  async getLatestTelemetry(droneId, options = {}) {
    try {
      const { limit = 1 } = options;
      
      const cacheKey = this.getCacheKey(`latest_${droneId}`, limit.toString());
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT *
        FROM ${this.fullTableName}
        WHERE drone_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await executeQuery(query, [droneId, limit], { readOnly: true });
      
      // Cache for short duration due to real-time nature
      if (!options.skipCache) {
        await this.cacheSet(cacheKey, result.rows, 30); // 30 seconds
      }

      return limit === 1 ? result.rows[0] || null : result.rows;
    } catch (error) {
      console.error(`Error getting latest telemetry for drone ${droneId}:`, error);
      throw error;
    }
  }

  // Get telemetry in time range with optional downsampling
  async getTelemetryRange(droneId, startTime, endTime, options = {}) {
    try {
      const {
        interval = null, // For downsampling: '1 minute', '5 minutes', etc.
        fields = ['*'],
        maxPoints = 1000
      } = options;

      let query;
      let params = [droneId, startTime, endTime];

      if (interval) {
        // Downsampled query with time bucketing
        const fieldSelectors = fields.includes('*') 
          ? `
            time_bucket,
            AVG(latitude) as avg_latitude,
            AVG(longitude) as avg_longitude,
            AVG(altitude_m) as avg_altitude_m,
            AVG(battery_percentage) as avg_battery_percentage,
            AVG(ground_speed_ms) as avg_ground_speed_ms,
            MIN(battery_percentage) as min_battery_percentage,
            MAX(altitude_m) as max_altitude_m,
            COUNT(*) as point_count
          `
          : fields.map(f => `AVG(${f}) as avg_${f}`).join(', ') + ', COUNT(*) as point_count';

        query = `
          SELECT 
            date_trunc('${interval}', timestamp) as time_bucket,
            ${fieldSelectors}
          FROM ${this.fullTableName}
          WHERE drone_id = $1 
          AND timestamp BETWEEN $2 AND $3
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
        `;
      } else {
        // Regular query with potential limit
        const fieldSelectors = fields.includes('*') ? '*' : fields.join(', ');
        
        query = `
          SELECT ${fieldSelectors}
          FROM ${this.fullTableName}
          WHERE drone_id = $1 
          AND timestamp BETWEEN $2 AND $3
          ORDER BY timestamp ASC
          LIMIT $4
        `;
        
        params.push(maxPoints);
      }

      const result = await executeQuery(query, params, { readOnly: true });
      return result.rows;
    } catch (error) {
      console.error(`Error getting telemetry range for drone ${droneId}:`, error);
      throw error;
    }
  }

  // Get mission telemetry summary
  async getMissionTelemetrySummary(missionId, options = {}) {
    try {
      const cacheKey = this.getCacheKey(`mission_summary_${missionId}`);
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT 
          mission_id,
          COUNT(*) as total_messages,
          COUNT(DISTINCT drone_id) as unique_drones,
          MIN(timestamp) as first_message,
          MAX(timestamp) as last_message,
          AVG(battery_percentage) FILTER (WHERE battery_percentage IS NOT NULL) as avg_battery,
          MIN(battery_percentage) FILTER (WHERE battery_percentage IS NOT NULL) as min_battery,
          AVG(altitude_m) FILTER (WHERE altitude_m IS NOT NULL) as avg_altitude,
          MAX(altitude_m) FILTER (WHERE altitude_m IS NOT NULL) as max_altitude,
          AVG(ground_speed_ms) FILTER (WHERE ground_speed_ms IS NOT NULL) as avg_speed,
          MAX(ground_speed_ms) FILTER (WHERE ground_speed_ms IS NOT NULL) as max_speed,
          AVG(telemetry_rssi) FILTER (WHERE telemetry_rssi IS NOT NULL) as avg_signal_strength,
          MIN(telemetry_rssi) FILTER (WHERE telemetry_rssi IS NOT NULL) as min_signal_strength,
          -- Calculate total distance (simplified)
          SUM(
            CASE 
              WHEN LAG(latitude) OVER (PARTITION BY drone_id ORDER BY timestamp) IS NOT NULL 
              THEN (
                6371000 * acos(
                  cos(radians(LAG(latitude) OVER (PARTITION BY drone_id ORDER BY timestamp))) * 
                  cos(radians(latitude)) *
                  cos(radians(longitude) - radians(LAG(longitude) OVER (PARTITION BY drone_id ORDER BY timestamp))) +
                  sin(radians(LAG(latitude) OVER (PARTITION BY drone_id ORDER BY timestamp))) * 
                  sin(radians(latitude))
                )
              )
              ELSE 0
            END
          ) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as total_distance_m
        FROM ${this.fullTableName}
        WHERE mission_id = $1
        GROUP BY mission_id
      `;

      const result = await executeQuery(query, [missionId], { readOnly: true });
      const summary = result.rows[0] || null;
      
      // Cache for 5 minutes
      if (!options.skipCache && summary) {
        await this.cacheSet(cacheKey, summary, 300);
      }

      return summary;
    } catch (error) {
      console.error(`Error getting mission telemetry summary for ${missionId}:`, error);
      throw error;
    }
  }

  // Get drone health metrics based on recent telemetry
  async getDroneHealthMetrics(droneId, options = {}) {
    try {
      const { 
        lookbackHours = 24,
        includeDetails = false 
      } = options;

      const cacheKey = this.getCacheKey(`health_${droneId}`, lookbackHours.toString());
      
      if (!options.skipCache) {
        const cached = await this.cacheGet(cacheKey, { json: true });
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT 
          drone_id,
          COUNT(*) as message_count,
          MAX(timestamp) as last_telemetry,
          AVG(battery_percentage) FILTER (WHERE battery_percentage IS NOT NULL) as avg_battery,
          MIN(battery_percentage) FILTER (WHERE battery_percentage IS NOT NULL) as min_battery,
          STDDEV(battery_percentage) FILTER (WHERE battery_percentage IS NOT NULL) as battery_variance,
          AVG(telemetry_rssi) FILTER (WHERE telemetry_rssi IS NOT NULL) as avg_signal,
          MIN(telemetry_rssi) FILTER (WHERE telemetry_rssi IS NOT NULL) as min_signal,
          AVG(satellite_count) FILTER (WHERE satellite_count IS NOT NULL) as avg_satellites,
          MIN(satellite_count) FILTER (WHERE satellite_count IS NOT NULL) as min_satellites,
          AVG(hdop) FILTER (WHERE hdop IS NOT NULL) as avg_hdop,
          MAX(hdop) FILTER (WHERE hdop IS NOT NULL) as max_hdop,
          -- Vibration analysis
          AVG(vibration_x) FILTER (WHERE vibration_x IS NOT NULL) as avg_vibration_x,
          AVG(vibration_y) FILTER (WHERE vibration_y IS NOT NULL) as avg_vibration_y,
          AVG(vibration_z) FILTER (WHERE vibration_z IS NOT NULL) as avg_vibration_z,
          -- Temperature monitoring
          AVG(temperature_celsius) FILTER (WHERE temperature_celsius IS NOT NULL) as avg_temperature,
          MAX(temperature_celsius) FILTER (WHERE temperature_celsius IS NOT NULL) as max_temperature,
          -- Flight time calculation
          EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as flight_time_minutes
        FROM ${this.fullTableName}
        WHERE drone_id = $1 
        AND timestamp > NOW() - INTERVAL '${lookbackHours} hours'
        GROUP BY drone_id
      `;

      const result = await executeQuery(query, [droneId], { readOnly: true });
      let healthMetrics = result.rows[0] || null;

      if (healthMetrics && includeDetails) {
        // Get additional health indicators
        const detailQuery = `
          SELECT 
            COUNT(*) FILTER (WHERE battery_percentage < 20) as low_battery_events,
            COUNT(*) FILTER (WHERE telemetry_rssi < -90) as weak_signal_events,
            COUNT(*) FILTER (WHERE satellite_count < 8) as poor_gps_events,
            COUNT(*) FILTER (WHERE temperature_celsius > 80) as overheating_events
          FROM ${this.fullTableName}
          WHERE drone_id = $1 
          AND timestamp > NOW() - INTERVAL '${lookbackHours} hours'
        `;

        const detailResult = await executeQuery(detailQuery, [droneId], { readOnly: true });
        healthMetrics = { ...healthMetrics, ...detailResult.rows[0] };
      }

      // Cache for 5 minutes
      if (!options.skipCache && healthMetrics) {
        await this.cacheSet(cacheKey, healthMetrics, 300);
      }

      return healthMetrics;
    } catch (error) {
      console.error(`Error getting drone health metrics for ${droneId}:`, error);
      throw error;
    }
  }

  // Update drone's current state based on latest telemetry
  async updateDroneCurrentState(telemetryData) {
    try {
      const updateFields = {};
      
      if (telemetryData.latitude) updateFields.current_latitude = telemetryData.latitude;
      if (telemetryData.longitude) updateFields.current_longitude = telemetryData.longitude;
      if (telemetryData.altitude_m) updateFields.current_altitude_m = telemetryData.altitude_m;
      if (telemetryData.heading_degrees) updateFields.current_heading = telemetryData.heading_degrees;
      if (telemetryData.ground_speed_ms) updateFields.current_speed_ms = telemetryData.ground_speed_ms;
      if (telemetryData.battery_percentage) updateFields.battery_percentage = telemetryData.battery_percentage;
      
      // Calculate signal strength from telemetry RSSI
      if (telemetryData.telemetry_rssi) {
        // Convert RSSI to percentage (rough approximation)
        // -30 dBm = 100%, -90 dBm = 0%
        const rssi = telemetryData.telemetry_rssi;
        const signalPercent = Math.max(0, Math.min(100, ((rssi + 90) / 60) * 100));
        updateFields.signal_strength = Math.round(signalPercent);
      }

      if (Object.keys(updateFields).length === 0) {
        return; // No fields to update
      }

      updateFields.updated_at = new Date();

      // Build UPDATE query
      const columns = Object.keys(updateFields);
      const values = Object.values(updateFields);
      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

      const query = `
        UPDATE core.drones
        SET ${setClause}
        WHERE id = $1 AND deleted_at IS NULL
      `;

      await executeQuery(query, [telemetryData.drone_id, ...values]);
    } catch (error) {
      console.error('Error updating drone current state:', error);
      // Don't throw - this is a background update that shouldn't break telemetry insertion
    }
  }

  // Get telemetry statistics for performance monitoring
  async getTelemetryStatistics(options = {}) {
    try {
      const {
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endTime = new Date()
      } = options;

      const cacheKey = this.getCacheKey('stats', `${startTime.toISOString()}_${endTime.toISOString()}`);
      
      const cached = await this.cacheGet(cacheKey, { json: true });
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT drone_id) as active_drones,
          COUNT(DISTINCT mission_id) FILTER (WHERE mission_id IS NOT NULL) as active_missions,
          MIN(timestamp) as earliest_message,
          MAX(timestamp) as latest_message,
          AVG(EXTRACT(EPOCH FROM (received_at - timestamp))) as avg_latency_seconds,
          COUNT(*) FILTER (WHERE battery_percentage < 20) as low_battery_alerts,
          COUNT(*) FILTER (WHERE telemetry_rssi < -90) as weak_signal_alerts,
          COUNT(*) FILTER (WHERE satellite_count < 8) as poor_gps_alerts,
          -- Message rate by hour
          json_agg(
            json_build_object(
              'hour', DATE_TRUNC('hour', timestamp),
              'count', COUNT(*) OVER (PARTITION BY DATE_TRUNC('hour', timestamp))
            )
          ) as hourly_distribution
        FROM ${this.fullTableName}
        WHERE timestamp BETWEEN $1 AND $2
      `;

      const result = await executeQuery(query, [startTime, endTime], { readOnly: true });
      const stats = result.rows[0];

      // Process hourly distribution to remove duplicates
      if (stats.hourly_distribution) {
        const hourlyStats = {};
        stats.hourly_distribution.forEach(item => {
          if (item.hour) {
            hourlyStats[item.hour] = item.count;
          }
        });
        stats.hourly_distribution = Object.entries(hourlyStats).map(([hour, count]) => ({ hour, count }));
      }

      // Cache for 10 minutes
      await this.cacheSet(cacheKey, stats, 600);

      return stats;
    } catch (error) {
      console.error('Error getting telemetry statistics:', error);
      throw error;
    }
  }

  // Clean up old telemetry data (for maintenance)
  async cleanupOldTelemetry(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const query = `
        DELETE FROM ${this.fullTableName}
        WHERE timestamp < $1
      `;

      const result = await executeQuery(query, [cutoffDate]);
      
      console.log(`🧹 Cleaned up ${result.rowCount} old telemetry records older than ${daysToKeep} days`);
      
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up old telemetry:', error);
      throw error;
    }
  }

  // Find anomalous telemetry data
  async findAnomalies(droneId, options = {}) {
    try {
      const {
        lookbackHours = 24,
        batteryThreshold = 15,
        signalThreshold = -90,
        altitudeChangeThreshold = 100, // meters per minute
        speedThreshold = 30 // m/s
      } = options;

      const query = `
        WITH telemetry_with_changes AS (
          SELECT *,
            LAG(altitude_m) OVER (PARTITION BY drone_id ORDER BY timestamp) as prev_altitude,
            LAG(timestamp) OVER (PARTITION BY drone_id ORDER BY timestamp) as prev_timestamp,
            EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY drone_id ORDER BY timestamp))) as time_diff_seconds
          FROM ${this.fullTableName}
          WHERE drone_id = $1 
          AND timestamp > NOW() - INTERVAL '${lookbackHours} hours'
        )
        SELECT *,
          CASE 
            WHEN battery_percentage < $2 THEN 'LOW_BATTERY'
            WHEN telemetry_rssi < $3 THEN 'WEAK_SIGNAL'
            WHEN ground_speed_ms > $4 THEN 'EXCESSIVE_SPEED'
            WHEN prev_altitude IS NOT NULL AND time_diff_seconds > 0 
                 AND ABS(altitude_m - prev_altitude) / (time_diff_seconds / 60) > $5 THEN 'RAPID_ALTITUDE_CHANGE'
            ELSE NULL
          END as anomaly_type
        FROM telemetry_with_changes
        WHERE battery_percentage < $2 
           OR telemetry_rssi < $3 
           OR ground_speed_ms > $4
           OR (prev_altitude IS NOT NULL AND time_diff_seconds > 0 
               AND ABS(altitude_m - prev_altitude) / (time_diff_seconds / 60) > $5)
        ORDER BY timestamp DESC
      `;

      const result = await executeQuery(
        query, 
        [droneId, batteryThreshold, signalThreshold, speedThreshold, altitudeChangeThreshold], 
        { readOnly: true }
      );

      return result.rows;
    } catch (error) {
      console.error(`Error finding telemetry anomalies for drone ${droneId}:`, error);
      throw error;
    }
  }
}

module.exports = TelemetryDAO;