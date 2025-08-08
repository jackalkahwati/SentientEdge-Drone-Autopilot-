-- =============================================
-- AUDIT & ANALYTICS SCHEMA
-- =============================================
-- Comprehensive audit logging and analytics for security and performance monitoring

-- Audit log for all system operations
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and session context
    user_id UUID REFERENCES auth.users(id),
    username VARCHAR(100),
    session_id UUID,
    
    -- Action details
    action VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, CREATE_MISSION, etc.
    resource VARCHAR(500), -- Resource being acted upon (URL, entity ID, etc.)
    resource_type VARCHAR(100), -- 'user', 'drone', 'mission', 'system'
    resource_id UUID, -- ID of the affected resource
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id UUID, -- Correlation ID for request tracing
    api_key_id UUID, -- If action was performed via API key
    
    -- Operation details
    operation_type VARCHAR(50), -- CREATE, READ, UPDATE, DELETE, EXECUTE
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Data changes (for UPDATE operations)
    old_values JSONB, -- Previous state
    new_values JSONB, -- New state
    changed_fields TEXT[], -- List of changed field names
    
    -- Security context
    security_level VARCHAR(20) DEFAULT 'standard', -- standard, elevated, administrative
    classification VARCHAR(20) DEFAULT 'unclassified',
    risk_score INTEGER, -- 0-100 calculated risk score
    
    -- Performance metrics
    execution_time_ms INTEGER, -- How long the operation took
    query_count INTEGER, -- Number of database queries
    memory_usage_mb DECIMAL(10,2),
    
    -- Additional context
    metadata JSONB, -- Additional operation-specific data
    geolocation JSONB, -- {country, region, city} if available
    
    -- Audit trail integrity
    checksum TEXT, -- Hash of the log entry for tamper detection
    previous_checksum TEXT, -- Chain of integrity
    
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Partitioning helper
    partition_date DATE GENERATED ALWAYS AS (DATE(occurred_at)) STORED
) PARTITION BY RANGE (occurred_at);

-- Security events requiring special attention
CREATE TABLE IF NOT EXISTS audit.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event classification
    event_type VARCHAR(100) NOT NULL, -- FAILED_LOGIN, PRIVILEGE_ESCALATION, etc.
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5), -- 1=info, 5=critical
    threat_category VARCHAR(100), -- 'authentication', 'authorization', 'data_access', etc.
    
    -- Source information
    source_ip INET,
    source_country VARCHAR(100),
    source_user_id UUID REFERENCES auth.users(id),
    source_user_agent TEXT,
    source_api_key_id UUID,
    
    -- Target information
    target_resource VARCHAR(500),
    target_user_id UUID REFERENCES auth.users(id),
    affected_systems TEXT[], -- List of systems potentially compromised
    
    -- Event details
    description TEXT NOT NULL,
    indicators JSONB, -- Indicators of compromise
    attack_vector VARCHAR(100),
    payload_size_bytes INTEGER,
    
    -- Detection information
    detected_by VARCHAR(100), -- 'system', 'user', 'ai_monitor'
    detection_confidence DECIMAL(5,2), -- 0-100 confidence in detection
    false_positive_probability DECIMAL(5,2),
    
    -- Response tracking
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_recipients TEXT[],
    investigated_at TIMESTAMPTZ,
    investigated_by UUID REFERENCES auth.users(id),
    investigation_notes TEXT,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolution_action VARCHAR(100), -- 'blocked', 'allowed', 'monitored'
    mitigation_steps TEXT[],
    
    -- Related events
    related_event_ids UUID[],
    correlation_id UUID, -- Group related security events
    
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Partitioning
    partition_date DATE GENERATED ALWAYS AS (DATE(occurred_at)) STORED
) PARTITION BY RANGE (occurred_at);

-- System performance metrics
CREATE TABLE IF NOT EXISTS analytics.system_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time and server identification
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    server_instance VARCHAR(100), -- Instance identifier in cluster
    
    -- CPU metrics
    cpu_usage_percentage DECIMAL(5,2),
    cpu_load_1min DECIMAL(6,2),
    cpu_load_5min DECIMAL(6,2),
    cpu_load_15min DECIMAL(6,2),
    
    -- Memory metrics
    memory_total_mb BIGINT,
    memory_used_mb BIGINT,
    memory_available_mb BIGINT,
    memory_usage_percentage DECIMAL(5,2),
    swap_used_mb BIGINT,
    
    -- Disk metrics
    disk_total_gb BIGINT,
    disk_used_gb BIGINT,
    disk_available_gb BIGINT,
    disk_usage_percentage DECIMAL(5,2),
    disk_io_read_mbps DECIMAL(10,2),
    disk_io_write_mbps DECIMAL(10,2),
    
    -- Network metrics
    network_rx_mbps DECIMAL(10,2),
    network_tx_mbps DECIMAL(10,2),
    network_connections_active INTEGER,
    network_connections_waiting INTEGER,
    
    -- Database metrics
    db_connections_active INTEGER,
    db_connections_idle INTEGER,
    db_queries_per_second DECIMAL(10,2),
    db_slow_queries_count INTEGER,
    db_cache_hit_ratio DECIMAL(5,2),
    
    -- Application metrics
    websocket_connections INTEGER,
    active_missions INTEGER,
    active_drones INTEGER,
    telemetry_messages_per_second DECIMAL(10,2),
    
    -- Error rates
    http_error_rate_percentage DECIMAL(5,2),
    api_error_rate_percentage DECIMAL(5,2),
    websocket_error_rate_percentage DECIMAL(5,2)
);

-- Mission analytics and KPIs
CREATE TABLE IF NOT EXISTS analytics.mission_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES core.missions(id),
    
    -- Mission overview
    mission_name VARCHAR(200),
    mission_status VARCHAR(20),
    threat_level INTEGER,
    classification VARCHAR(20),
    
    -- Timeline analytics
    planned_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    planning_to_execution_hours INTEGER, -- Time from creation to start
    
    -- Resource utilization
    drones_assigned INTEGER,
    drones_actually_used INTEGER,
    team_members_assigned INTEGER,
    team_members_active INTEGER,
    
    -- Performance metrics
    objectives_completed INTEGER,
    objectives_total INTEGER,
    success_rate_percentage DECIMAL(5,2),
    efficiency_score DECIMAL(5,2), -- 0-100 efficiency rating
    
    -- Flight performance
    total_flight_time_minutes INTEGER,
    total_distance_km DECIMAL(10,2),
    average_drone_battery_consumption DECIMAL(5,2),
    fuel_efficiency_score DECIMAL(5,2),
    
    -- Communication metrics
    messages_sent INTEGER,
    messages_received INTEGER,
    average_response_time_seconds DECIMAL(8,2),
    communication_quality_score DECIMAL(5,2),
    
    -- Safety metrics
    incidents_reported INTEGER,
    near_misses INTEGER,
    emergency_landings INTEGER,
    geofence_violations INTEGER,
    safety_score DECIMAL(5,2), -- 0-100 safety rating
    
    -- Weather impact
    weather_delays_minutes INTEGER,
    weather_cancellations INTEGER,
    weather_impact_score DECIMAL(5,2), -- 0-100 weather impact
    
    -- Data quality
    telemetry_coverage_percentage DECIMAL(5,2),
    data_gaps_count INTEGER,
    sensor_failures INTEGER,
    
    -- Cost analysis (if applicable)
    estimated_cost_usd DECIMAL(12,2),
    actual_cost_usd DECIMAL(12,2),
    cost_efficiency_score DECIMAL(5,2),
    
    -- Computed at mission completion
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    analysis_version VARCHAR(20) -- Version of analysis algorithm
);

-- Drone performance analytics
CREATE TABLE IF NOT EXISTS analytics.drone_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drone_id UUID NOT NULL REFERENCES core.drones(id),
    analysis_period_start TIMESTAMPTZ NOT NULL,
    analysis_period_end TIMESTAMPTZ NOT NULL,
    
    -- Basic stats
    drone_name VARCHAR(100),
    drone_type VARCHAR(20),
    drone_model VARCHAR(100),
    
    -- Flight metrics
    total_flight_time_minutes INTEGER,
    total_flights INTEGER,
    total_distance_km DECIMAL(10,2),
    average_flight_duration_minutes DECIMAL(8,2),
    
    -- Performance scores
    overall_performance_score DECIMAL(5,2), -- 0-100 overall rating
    reliability_score DECIMAL(5,2), -- Based on failure rates
    efficiency_score DECIMAL(5,2), -- Based on battery usage, speed, etc.
    mission_success_rate DECIMAL(5,2),
    
    -- Battery analytics
    average_battery_consumption_per_hour DECIMAL(8,2),
    battery_efficiency_score DECIMAL(5,2),
    charging_cycles_count INTEGER,
    battery_health_percentage DECIMAL(5,2),
    
    -- Maintenance metrics
    maintenance_hours INTEGER,
    unplanned_maintenance_events INTEGER,
    component_failures INTEGER,
    mean_time_between_failures_hours DECIMAL(10,2),
    
    -- Operational metrics
    missions_completed INTEGER,
    missions_aborted INTEGER,
    emergency_returns INTEGER,
    autonomous_flight_percentage DECIMAL(5,2),
    
    -- Communication quality
    average_signal_strength DECIMAL(5,2),
    communication_dropouts INTEGER,
    telemetry_loss_percentage DECIMAL(5,2),
    
    -- Environmental adaptability
    weather_cancellations INTEGER,
    successful_flights_in_poor_weather INTEGER,
    altitude_performance_score DECIMAL(5,2),
    wind_resistance_score DECIMAL(5,2),
    
    -- Utilization metrics
    availability_percentage DECIMAL(5,2), -- Time available vs total time
    utilization_percentage DECIMAL(5,2), -- Time flying vs available time
    downtime_hours INTEGER,
    
    -- Predictive maintenance indicators
    vibration_trend_score DECIMAL(5,2), -- Increasing vibration = maintenance needed
    temperature_trend_score DECIMAL(5,2),
    predicted_maintenance_date DATE,
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity analytics
CREATE TABLE IF NOT EXISTS analytics.user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    analysis_period_start TIMESTAMPTZ NOT NULL,
    analysis_period_end TIMESTAMPTZ NOT NULL,
    
    -- User identification
    username VARCHAR(100),
    user_role VARCHAR(20),
    
    -- Activity metrics
    total_sessions INTEGER,
    total_session_time_minutes INTEGER,
    average_session_duration_minutes DECIMAL(8,2),
    total_api_calls INTEGER,
    
    -- Mission involvement
    missions_created INTEGER,
    missions_led INTEGER,
    missions_participated INTEGER,
    mission_success_rate DECIMAL(5,2),
    
    -- Drone interactions
    drones_operated INTEGER,
    drone_control_sessions INTEGER,
    total_drone_flight_time_minutes INTEGER,
    drone_incidents_caused INTEGER,
    
    -- Communication activity
    messages_sent INTEGER,
    messages_received INTEGER,
    broadcasts_initiated INTEGER,
    emergency_communications INTEGER,
    
    -- System interactions
    commands_executed INTEGER,
    configurations_changed INTEGER,
    reports_generated INTEGER,
    data_exports INTEGER,
    
    -- Performance indicators
    task_completion_rate DECIMAL(5,2),
    error_rate_percentage DECIMAL(5,2),
    productivity_score DECIMAL(5,2), -- Based on tasks completed per time
    collaboration_score DECIMAL(5,2), -- Based on team interactions
    
    -- Security metrics
    security_violations INTEGER,
    failed_authentication_attempts INTEGER,
    privilege_escalation_attempts INTEGER,
    data_access_violations INTEGER,
    
    -- Training and competency
    certifications_earned INTEGER,
    training_hours_completed INTEGER,
    competency_score DECIMAL(5,2),
    last_training_date DATE,
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- System health aggregates
CREATE TABLE IF NOT EXISTS analytics.system_health_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary_date DATE NOT NULL,
    summary_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    
    -- Overall system health
    system_health_score DECIMAL(5,2), -- 0-100 composite health score
    availability_percentage DECIMAL(5,2),
    performance_score DECIMAL(5,2),
    security_score DECIMAL(5,2),
    
    -- Component health
    database_health_score DECIMAL(5,2),
    api_health_score DECIMAL(5,2),
    websocket_health_score DECIMAL(5,2),
    drone_fleet_health_score DECIMAL(5,2),
    
    -- Operational metrics
    total_users_active INTEGER,
    total_missions_active INTEGER,
    total_drones_active INTEGER,
    total_telemetry_messages BIGINT,
    
    -- Error and incident tracking
    total_errors INTEGER,
    critical_errors INTEGER,
    security_incidents INTEGER,
    system_alerts INTEGER,
    
    -- Performance indicators
    average_response_time_ms DECIMAL(8,2),
    peak_concurrent_users INTEGER,
    peak_telemetry_rate INTEGER,
    database_query_performance_ms DECIMAL(8,2),
    
    -- Capacity utilization
    cpu_peak_usage_percentage DECIMAL(5,2),
    memory_peak_usage_percentage DECIMAL(5,2),
    storage_usage_percentage DECIMAL(5,2),
    network_peak_usage_percentage DECIMAL(5,2),
    
    -- Trends (compared to previous period)
    health_trend VARCHAR(20), -- 'improving', 'stable', 'degrading'
    performance_trend VARCHAR(20),
    security_trend VARCHAR(20),
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(summary_date, summary_period)
);

-- Indexes for audit and analytics tables
CREATE INDEX IF NOT EXISTS idx_audit_user_occurred ON audit.audit_logs(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_occurred ON audit.audit_logs(action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource_occurred ON audit.audit_logs(resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_success ON audit.audit_logs(success, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit.audit_logs(ip_address, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit.audit_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_security_severity_occurred ON audit.security_events(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_type_occurred ON audit.security_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_source_ip ON audit.security_events(source_ip, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_unresolved ON audit.security_events(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_correlation ON audit.security_events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_performance_recorded ON analytics.system_performance(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_server ON analytics.system_performance(server_instance, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_analytics_mission ON analytics.mission_analytics(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_analytics_analyzed ON analytics.mission_analytics(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_drone_analytics_drone ON analytics.drone_analytics(drone_id, analysis_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_drone_analytics_period ON analytics.drone_analytics(analysis_period_start, analysis_period_end);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON analytics.user_analytics(user_id, analysis_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_role ON analytics.user_analytics(user_role, analysis_period_start DESC);

CREATE INDEX IF NOT EXISTS idx_health_summary_date ON analytics.system_health_summary(summary_date DESC, summary_period);

-- Create monthly partitions for audit logs
CREATE OR REPLACE FUNCTION audit.create_monthly_audit_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.%I
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Create indexes on partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON audit.%I (user_id, occurred_at DESC)',
                   'idx_' || partition_name || '_user_occurred', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON audit.%I (action, occurred_at DESC)',
                   'idx_' || partition_name || '_action_occurred', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Create initial audit partitions
SELECT audit.create_monthly_audit_partition('audit_logs', DATE_TRUNC('month', CURRENT_DATE));
SELECT audit.create_monthly_audit_partition('audit_logs', DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));
SELECT audit.create_monthly_audit_partition('security_events', DATE_TRUNC('month', CURRENT_DATE));
SELECT audit.create_monthly_audit_partition('security_events', DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));