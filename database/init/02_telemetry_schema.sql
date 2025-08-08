-- =============================================
-- TELEMETRY & REAL-TIME DATA SCHEMA
-- =============================================
-- High-performance schema for drone telemetry and sensor data

-- Drone telemetry data (optimized for high-frequency inserts)
CREATE TABLE IF NOT EXISTS telemetry.drone_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL, -- No FK constraint for performance
    mission_id UUID, -- No FK constraint for performance
    api_key_id UUID, -- Track which API key sent the data
    
    -- Timestamp (critical for time-series analysis)
    timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Position data
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    altitude_m DECIMAL(10,2),
    altitude_above_home_m DECIMAL(10,2),
    
    -- Attitude data
    roll_degrees DECIMAL(6,3),
    pitch_degrees DECIMAL(6,3),
    yaw_degrees DECIMAL(6,3),
    
    -- Velocity data
    velocity_x_ms DECIMAL(8,3),
    velocity_y_ms DECIMAL(8,3),
    velocity_z_ms DECIMAL(8,3),
    ground_speed_ms DECIMAL(8,3),
    airspeed_ms DECIMAL(8,3),
    
    -- System status
    battery_voltage DECIMAL(6,3),
    battery_current DECIMAL(8,3),
    battery_remaining_mah INTEGER,
    battery_percentage DECIMAL(5,2),
    
    -- Flight mode and status
    flight_mode VARCHAR(50),
    armed BOOLEAN,
    guided BOOLEAN,
    system_status VARCHAR(50),
    
    -- RC and telemetry
    rc_rssi INTEGER, -- RC signal strength
    telemetry_rssi INTEGER, -- Telemetry signal strength
    satellite_count INTEGER,
    gps_fix_type INTEGER, -- GPS fix quality
    hdop DECIMAL(4,2), -- Horizontal dilution of precision
    vdop DECIMAL(4,2), -- Vertical dilution of precision
    
    -- Environmental sensors
    temperature_celsius DECIMAL(5,2),
    pressure_pascal DECIMAL(10,2),
    humidity_percentage DECIMAL(5,2),
    
    -- Navigation data
    heading_degrees DECIMAL(6,3),
    target_bearing_degrees DECIMAL(6,3),
    distance_to_target_m DECIMAL(10,2),
    
    -- Vibration and health
    vibration_x DECIMAL(8,4),
    vibration_y DECIMAL(8,4),
    vibration_z DECIMAL(8,4),
    
    -- Additional sensor data (flexible JSONB for extensibility)
    sensor_data JSONB,
    
    -- MAVLink specific
    mavlink_system_id INTEGER,
    mavlink_component_id INTEGER,
    mavlink_message_id INTEGER,
    
    -- Performance optimization
    partition_date DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for telemetry data (automated partitioning)
-- This dramatically improves query performance and allows for data lifecycle management

-- Drone system events and alerts
CREATE TABLE IF NOT EXISTS telemetry.drone_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL,
    mission_id UUID,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'critical'
    event_code VARCHAR(100), -- Specific error/event code
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5), -- 1=info, 5=critical
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Location when event occurred
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    altitude_m DECIMAL(10,2),
    
    -- System state during event
    flight_mode VARCHAR(50),
    system_status VARCHAR(50),
    battery_percentage DECIMAL(5,2),
    
    -- Event lifecycle
    occurred_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Additional context
    system_context JSONB, -- System state snapshot
    user_context JSONB, -- User actions leading to event
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission telemetry aggregates (for dashboard performance)
CREATE TABLE IF NOT EXISTS telemetry.mission_telemetry_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL,
    drone_id UUID NOT NULL,
    summary_period INTERVAL NOT NULL, -- '1 minute', '5 minutes', '1 hour'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Aggregated position data
    avg_latitude DECIMAL(10,8),
    avg_longitude DECIMAL(11,8),
    avg_altitude_m DECIMAL(10,2),
    max_altitude_m DECIMAL(10,2),
    min_altitude_m DECIMAL(10,2),
    
    -- Aggregated flight data
    avg_ground_speed_ms DECIMAL(8,3),
    max_ground_speed_ms DECIMAL(8,3),
    total_distance_m DECIMAL(12,2),
    flight_time_seconds INTEGER,
    
    -- Battery consumption
    avg_battery_percentage DECIMAL(5,2),
    min_battery_percentage DECIMAL(5,2),
    battery_consumed_mah INTEGER,
    
    -- Signal quality
    avg_rc_rssi INTEGER,
    min_rc_rssi INTEGER,
    avg_telemetry_rssi INTEGER,
    min_telemetry_rssi INTEGER,
    
    -- GPS quality
    avg_satellite_count INTEGER,
    min_satellite_count INTEGER,
    avg_hdop DECIMAL(4,2),
    max_hdop DECIMAL(4,2),
    
    -- Event counts
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    critical_event_count INTEGER DEFAULT 0,
    
    -- System changes
    flight_mode_changes INTEGER DEFAULT 0,
    arm_disarm_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    telemetry_message_count INTEGER,
    data_gaps_count INTEGER, -- Number of periods with missing data
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(mission_id, drone_id, summary_period, period_start)
);

-- Sensor calibration data
CREATE TABLE IF NOT EXISTS telemetry.sensor_calibrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL,
    sensor_type VARCHAR(50) NOT NULL, -- 'accelerometer', 'gyroscope', 'magnetometer', 'barometer'
    
    -- Calibration parameters
    calibration_matrix DECIMAL(10,6)[][], -- Calibration transformation matrix
    offset_x DECIMAL(10,6),
    offset_y DECIMAL(10,6),
    offset_z DECIMAL(10,6),
    scale_x DECIMAL(10,6),
    scale_y DECIMAL(10,6),
    scale_z DECIMAL(10,6),
    
    -- Quality metrics
    calibration_quality DECIMAL(5,2), -- 0-100 quality score
    residual_error DECIMAL(10,6),
    sample_count INTEGER,
    
    -- Calibration metadata
    calibrated_at TIMESTAMPTZ NOT NULL,
    calibrated_by UUID REFERENCES auth.users(id),
    calibration_method VARCHAR(100),
    environmental_conditions JSONB,
    
    -- Validity
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flight path recording for analysis and replay
CREATE TABLE IF NOT EXISTS telemetry.flight_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL,
    mission_id UUID NOT NULL,
    
    -- Path metadata
    path_name VARCHAR(200),
    flight_start_at TIMESTAMPTZ NOT NULL,
    flight_end_at TIMESTAMPTZ,
    total_duration_seconds INTEGER,
    total_distance_m DECIMAL(12,2),
    
    -- Compressed path data for efficient storage
    -- Using PostGIS LINESTRING would be ideal, but JSONB works for now
    waypoints JSONB NOT NULL, -- Array of {lat, lng, alt, timestamp, speed, heading}
    
    -- Flight performance metrics
    avg_speed_ms DECIMAL(8,3),
    max_speed_ms DECIMAL(8,3),
    max_altitude_m DECIMAL(10,2),
    min_altitude_m DECIMAL(10,2),
    
    -- Battery usage during flight
    battery_start_percentage DECIMAL(5,2),
    battery_end_percentage DECIMAL(5,2),
    battery_consumed_mah INTEGER,
    
    -- Path analysis results
    smoothness_score DECIMAL(5,2), -- Path efficiency metric
    deviations_from_plan INTEGER, -- Number of significant deviations
    emergency_maneuvers INTEGER, -- Count of emergency actions
    
    -- Data quality
    telemetry_coverage_percentage DECIMAL(5,2), -- % of expected telemetry received
    gps_accuracy_m DECIMAL(8,2), -- Average GPS accuracy
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time alerts and notifications
CREATE TABLE IF NOT EXISTS telemetry.real_time_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL,
    mission_id UUID,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'battery_low', 'signal_lost', 'geofence_breach', etc.
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Trigger conditions
    trigger_value DECIMAL(10,4),
    threshold_value DECIMAL(10,4),
    comparison_operator VARCHAR(10), -- '>', '<', '>=', '<=', '=', '!='
    
    -- Location and context
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    altitude_m DECIMAL(10,2),
    system_context JSONB,
    
    -- Alert lifecycle
    triggered_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    auto_resolved BOOLEAN DEFAULT FALSE,
    
    -- Notification tracking
    notifications_sent JSONB, -- Track which channels were notified
    escalation_level INTEGER DEFAULT 1,
    escalated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for telemetry tables
CREATE INDEX IF NOT EXISTS idx_telemetry_drone_timestamp ON telemetry.drone_telemetry(drone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_mission_timestamp ON telemetry.drone_telemetry(mission_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_received_at ON telemetry.drone_telemetry(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_partition_date ON telemetry.drone_telemetry(partition_date);
CREATE INDEX IF NOT EXISTS idx_telemetry_battery ON telemetry.drone_telemetry(battery_percentage) WHERE battery_percentage < 30;
CREATE INDEX IF NOT EXISTS idx_telemetry_location ON telemetry.drone_telemetry(latitude, longitude) WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_drone_occurred ON telemetry.drone_events(drone_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_mission_occurred ON telemetry.drone_events(mission_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON telemetry.drone_events(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_unresolved ON telemetry.drone_events(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_summary_mission_period ON telemetry.mission_telemetry_summary(mission_id, summary_period, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_summary_drone_period ON telemetry.mission_telemetry_summary(drone_id, summary_period, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_calibrations_drone_active ON telemetry.sensor_calibrations(drone_id, is_active, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_calibrations_sensor_type ON telemetry.sensor_calibrations(sensor_type, calibrated_at DESC);

CREATE INDEX IF NOT EXISTS idx_flight_paths_drone ON telemetry.flight_paths(drone_id, flight_start_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_paths_mission ON telemetry.flight_paths(mission_id, flight_start_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_drone_triggered ON telemetry.real_time_alerts(drone_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON telemetry.real_time_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON telemetry.real_time_alerts(severity, triggered_at DESC);

-- Automated partitioning function for telemetry data
CREATE OR REPLACE FUNCTION telemetry.create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS telemetry.%I PARTITION OF telemetry.%I
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Create indexes on partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON telemetry.%I (drone_id, timestamp DESC)',
                   'idx_' || partition_name || '_drone_timestamp', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON telemetry.%I (timestamp DESC)',
                   'idx_' || partition_name || '_timestamp', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions (current month and next month)
SELECT telemetry.create_monthly_partition('drone_telemetry', DATE_TRUNC('month', CURRENT_DATE));
SELECT telemetry.create_monthly_partition('drone_telemetry', DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));

-- Trigger to automatically create future partitions
CREATE OR REPLACE FUNCTION telemetry.ensure_partition_exists()
RETURNS TRIGGER AS $$
DECLARE
    partition_date DATE;
BEGIN
    partition_date := DATE_TRUNC('month', NEW.timestamp);
    
    -- Check if partition exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'telemetry'
        AND c.relname = 'drone_telemetry_' || to_char(partition_date, 'YYYY_MM')
    ) THEN
        PERFORM telemetry.create_monthly_partition('drone_telemetry', partition_date);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_telemetry_partition
    BEFORE INSERT ON telemetry.drone_telemetry
    FOR EACH ROW
    EXECUTE FUNCTION telemetry.ensure_partition_exists();