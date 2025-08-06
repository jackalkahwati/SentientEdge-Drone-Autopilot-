-- =============================================
-- SEED DATA FOR DEVELOPMENT AND TESTING
-- =============================================
-- Initial data to migrate from in-memory storage and support development

-- Set the encryption key for testing (in production, this would be set via environment)
-- This is a dummy key for development - NEVER use in production
SELECT set_config('app.encryption_key', 'dev-encryption-key-change-in-prod', false);

-- Create default admin user (matches current system)
INSERT INTO auth.users (
    id,
    username,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    is_active,
    email_verified,
    created_at
) VALUES (
    uuid_generate_v4(),
    'admin',
    'admin@sentientedge.ai',
    '$2b$12$LQv3c1yqBwEHXVhGzxTWOe.4EIlXwZxo8TlZ4YyOAJYl9ZnNqYhO6', -- bcrypt hash of 'TempAdmin123!@#'
    'admin',
    'System',
    'Administrator',
    true,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create additional test users
INSERT INTO auth.users (
    id,
    username,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    is_active,
    email_verified,
    created_at
) VALUES 
(
    uuid_generate_v4(),
    'operator1',
    'operator1@sentientedge.ai',
    '$2b$12$LQv3c1yqBwEHXVhGzxTWOe.4EIlXwZxo8TlZ4YyOAJYl9ZnNqYhO6',
    'operator',
    'John',
    'Operator',
    true,
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'analyst1',
    'analyst1@sentientedge.ai',
    '$2b$12$LQv3c1yqBwEHXVhGzxTWOe.4EIlXwZxo8TlZ4YyOAJYl9ZnNqYhO6',
    'analyst',
    'Jane',
    'Analyst',
    true,
    true,
    NOW()
),
(
    uuid_generate_v4(),
    'viewer1',
    'viewer1@sentientedge.ai',
    '$2b$12$LQv3c1yqBwEHXVhGzxTWOe.4EIlXwZxo8TlZ4YyOAJYl9ZnNqYhO6',
    'viewer',
    'Bob',
    'Viewer',
    true,
    true,
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Migrate drone data from current in-memory storage
INSERT INTO core.drones (
    id,
    name,
    serial_number,
    model,
    type,
    status,
    battery_percentage,
    signal_strength,
    mission_count,
    next_maintenance_at,
    total_flight_hours,
    max_flight_time_minutes,
    max_range_km,
    max_altitude_m,
    payload_capacity_kg,
    home_base_latitude,
    home_base_longitude,
    created_at,
    created_by
) VALUES 
(
    uuid_generate_v4(),
    'Hawk-1',
    'HX900-001',
    'HX-900',
    'surveillance',
    'idle',
    100.0,
    100.0,
    12,
    NOW() + INTERVAL '1 day',
    156.5,
    180,
    25.0,
    5000,
    2.5,
    34.0522,
    -118.2437,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Hawk-2',
    'HX900-002',
    'HX-900',
    'attack',
    'active',
    85.0,
    92.0,
    4,
    NOW() + INTERVAL '2 days',
    67.2,
    150,
    20.0,
    4500,
    3.0,
    34.0522,
    -118.2437,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
)
ON CONFLICT (serial_number) DO NOTHING;

-- Add more diverse drone fleet for testing
INSERT INTO core.drones (
    id,
    name,
    serial_number,
    model,
    type,
    status,
    battery_percentage,
    signal_strength,
    mission_count,
    next_maintenance_at,
    total_flight_hours,
    max_flight_time_minutes,
    max_range_km,
    max_altitude_m,
    payload_capacity_kg,
    home_base_latitude,
    home_base_longitude,
    created_at,
    created_by
) VALUES 
(
    uuid_generate_v4(),
    'Eagle-1',
    'EG500-001',
    'Eagle-500',
    'recon',
    'idle',
    78.0,
    88.0,
    23,
    NOW() + INTERVAL '5 days',
    234.8,
    240,
    35.0,
    6000,
    1.8,
    34.0522,
    -118.2437,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Falcon-1',
    'FC300-001',
    'Falcon-300',
    'transport',
    'maintenance',
    0.0,
    0.0,
    8,
    NOW() + INTERVAL '7 days',
    89.3,
    120,
    15.0,
    3000,
    8.5,
    34.0522,
    -118.2437,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Sparrow-1',
    'SP200-001',
    'Sparrow-200',
    'multi',
    'idle',
    95.0,
    94.0,
    15,
    NOW() + INTERVAL '10 days',
    178.9,
    90,
    12.0,
    2500,
    1.2,
    34.0522,
    -118.2437,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
)
ON CONFLICT (serial_number) DO NOTHING;

-- Migrate mission data from current in-memory storage
INSERT INTO core.missions (
    id,
    name,
    description,
    status,
    threat_level,
    priority,
    location_name,
    center_latitude,
    center_longitude,
    operation_radius_km,
    scheduled_start_at,
    scheduled_end_at,
    actual_start_at,
    progress_percentage,
    assigned_drones,
    team_members,
    objectives,
    created_at,
    created_by,
    team_lead_id
) VALUES (
    uuid_generate_v4(),
    'Operation Silent Watch',
    'Border surveillance mission to monitor sector 7 for unauthorized crossings and potential security threats.',
    'active',
    1,
    'high',
    'Sector 7',
    34.0522,
    -118.2437,
    5.0,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '1 hour',
    NOW() - INTERVAL '2 hours',
    42.0,
    (SELECT ARRAY[id] FROM core.drones WHERE name = 'Hawk-1' LIMIT 1),
    (SELECT ARRAY[id] FROM auth.users WHERE role = 'operator' LIMIT 1),
    jsonb_build_object(
        'primary', 'Monitor border crossing points',
        'secondary', 'Document any suspicious activity',
        'tertiary', 'Maintain communication with ground units'
    ),
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    (SELECT id FROM auth.users WHERE role = 'operator' LIMIT 1)
);

-- Add additional missions for testing
INSERT INTO core.missions (
    id,
    name,
    description,
    status,
    threat_level,
    priority,
    location_name,
    center_latitude,
    center_longitude,
    operation_radius_km,
    scheduled_start_at,
    scheduled_end_at,
    progress_percentage,
    assigned_drones,
    team_members,
    objectives,
    created_at,
    created_by,
    team_lead_id
) VALUES 
(
    uuid_generate_v4(),
    'Operation Night Hawk',
    'Nighttime reconnaissance mission to assess enemy positions and gather intelligence.',
    'scheduled',
    3,
    'critical',
    'Zone Alpha',
    34.1000,
    -118.3000,
    8.0,
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '8 hours',
    0.0,
    (SELECT ARRAY[id] FROM core.drones WHERE name = 'Eagle-1' LIMIT 1),
    (SELECT ARRAY[id, id] FROM auth.users WHERE role IN ('operator', 'analyst') LIMIT 2),
    jsonb_build_object(
        'primary', 'Conduct stealth reconnaissance',
        'secondary', 'Map enemy defensive positions',
        'tertiary', 'Assess threat capabilities'
    ),
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    (SELECT id FROM auth.users WHERE role = 'operator' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Operation Storm Shield',
    'Defensive patrol mission to protect critical infrastructure from potential threats.',
    'completed',
    2,
    'normal',
    'Industrial Complex',
    34.0800,
    -118.2000,
    3.0,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '20 hours',
    100.0,
    (SELECT ARRAY[id] FROM core.drones WHERE name = 'Sparrow-1' LIMIT 1),
    (SELECT ARRAY[id] FROM auth.users WHERE role = 'operator' LIMIT 1),
    jsonb_build_object(
        'primary', 'Patrol perimeter of facility',
        'secondary', 'Monitor for unauthorized personnel',
        'tertiary', 'Coordinate with ground security'
    ),
    NOW() - INTERVAL '1 day',
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    (SELECT id FROM auth.users WHERE role = 'operator' LIMIT 1)
);

-- Create communication channels
INSERT INTO core.communication_channels (
    id,
    name,
    description,
    type,
    is_secure,
    encryption_level,
    clearance_required,
    member_user_ids,
    admin_user_ids,
    mission_id,
    created_at,
    created_by
) VALUES 
(
    uuid_generate_v4(),
    'Command Central',
    'Main command and control communications channel',
    'command',
    true,
    'military',
    'secret',
    (SELECT ARRAY(SELECT id FROM auth.users WHERE role IN ('admin', 'operator') LIMIT 5)),
    (SELECT ARRAY(SELECT id FROM auth.users WHERE role = 'admin' LIMIT 2)),
    NULL,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Tactical Operations',
    'Tactical coordination for field operations',
    'tactical',
    true,
    'aes256',
    'confidential',
    (SELECT ARRAY(SELECT id FROM auth.users WHERE role IN ('operator', 'analyst') LIMIT 10)),
    (SELECT ARRAY(SELECT id FROM auth.users WHERE role IN ('admin', 'operator') LIMIT 3)),
    NULL,
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'Operation Silent Watch Comms',
    'Mission-specific communications for Operation Silent Watch',
    'operational',
    true,
    'aes256',
    'confidential',
    (SELECT ARRAY(SELECT id FROM auth.users LIMIT 5)),
    (SELECT ARRAY(SELECT id FROM auth.users WHERE role = 'admin' LIMIT 1)),
    (SELECT id FROM core.missions WHERE name = 'Operation Silent Watch' LIMIT 1),
    NOW(),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
);

-- Create sample messages
INSERT INTO core.messages (
    id,
    channel_id,
    sender_id,
    sender_type,
    content,
    content_type,
    priority,
    classification,
    created_at
) VALUES 
(
    uuid_generate_v4(),
    (SELECT id FROM core.communication_channels WHERE name = 'Command Central' LIMIT 1),
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    'user',
    'System operational status: All primary systems green. Drone fleet ready for deployment.',
    'text',
    'normal',
    'unclassified',
    NOW() - INTERVAL '2 hours'
),
(
    uuid_generate_v4(),
    (SELECT id FROM core.communication_channels WHERE name = 'Operation Silent Watch Comms' LIMIT 1),
    (SELECT id FROM auth.users WHERE role = 'operator' LIMIT 1),
    'user',
    'Hawk-1 in position. Beginning perimeter sweep. Weather conditions optimal.',
    'text',
    'normal',
    'confidential',
    NOW() - INTERVAL '30 minutes'
),
(
    uuid_generate_v4(),
    (SELECT id FROM core.communication_channels WHERE name = 'Tactical Operations' LIMIT 1),
    NULL,
    'system',
    'Automated alert: Drone maintenance window scheduled for Falcon-1 in 24 hours.',
    'text',
    'low',
    'unclassified',
    NOW() - INTERVAL '15 minutes'
);

-- Create AI models for autonomous operations
INSERT INTO core.ai_models (
    id,
    name,
    description,
    type,
    version,
    status,
    accuracy_percentage,
    precision_percentage,
    recall_percentage,
    f1_score,
    algorithm,
    training_dataset_size,
    deployed_at,
    created_at,
    created_by
) VALUES 
(
    uuid_generate_v4(),
    'ThreatDetector v2.1',
    'Advanced threat detection model for identifying potential security risks',
    'detection',
    '2.1.0',
    'deployed',
    94.2,
    91.8,
    96.5,
    0.9414,
    'Ensemble CNN + Transformer',
    1250000,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '45 days',
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'PathOptimizer v1.5',
    'Flight path optimization model for efficient drone navigation',
    'navigation',
    '1.5.0',
    'deployed',
    88.7,
    90.2,
    87.1,
    0.8860,
    'Reinforcement Learning (PPO)',
    850000,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '20 days',
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
),
(
    uuid_generate_v4(),
    'SwarmCoordinator v3.0',
    'Multi-drone coordination and swarm behavior management',
    'swarm_coordination',
    '3.0.0',
    'testing',
    NULL,
    NULL,
    NULL,
    NULL,
    'Multi-Agent Deep Q-Learning',
    2100000,
    NULL,
    NOW() - INTERVAL '10 days',
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1)
);

-- Create sample environmental conditions
INSERT INTO core.environmental_conditions (
    id,
    location_name,
    latitude,
    longitude,
    recorded_at,
    temperature_celsius,
    humidity_percentage,
    pressure_hpa,
    wind_speed_ms,
    wind_direction_degrees,
    visibility_km,
    precipitation_probability,
    cloud_cover_percentage,
    flight_conditions,
    data_source,
    confidence_level
) VALUES 
(
    uuid_generate_v4(),
    'Sector 7 Operations Area',
    34.0522,
    -118.2437,
    NOW(),
    22.5,
    65.0,
    1013.25,
    3.2,
    180.0,
    15.0,
    10.0,
    25.0,
    'good',
    'Weather Station Alpha',
    95.0
),
(
    uuid_generate_v4(),
    'Zone Alpha',
    34.1000,
    -118.3000,
    NOW(),
    18.8,
    78.0,
    1008.50,
    5.8,
    225.0,
    8.5,
    30.0,
    45.0,
    'fair',
    'Mobile Weather Unit',
    88.0
);

-- Create sample telemetry data for active drones
DO $$
DECLARE
    drone_rec RECORD;
    i INTEGER;
    base_time TIMESTAMPTZ;
BEGIN
    -- Generate telemetry for active drones over the last 2 hours
    FOR drone_rec IN SELECT id, name FROM core.drones WHERE status = 'active' LOOP
        base_time := NOW() - INTERVAL '2 hours';
        
        -- Generate 120 telemetry points (1 per minute for 2 hours)
        FOR i IN 1..120 LOOP
            INSERT INTO telemetry.drone_telemetry (
                drone_id,
                mission_id,
                timestamp,
                latitude,
                longitude,
                altitude_m,
                roll_degrees,
                pitch_degrees,
                yaw_degrees,
                ground_speed_ms,
                battery_percentage,
                flight_mode,
                armed,
                system_status,
                telemetry_rssi,
                satellite_count,
                gps_fix_type,
                temperature_celsius,
                heading_degrees
            ) VALUES (
                drone_rec.id,
                (SELECT id FROM core.missions WHERE status = 'active' LIMIT 1),
                base_time + (i * INTERVAL '1 minute'),
                34.0522 + (random() - 0.5) * 0.01, -- Small random variations
                -118.2437 + (random() - 0.5) * 0.01,
                100 + random() * 400, -- 100-500m altitude
                (random() - 0.5) * 10, -- ±5 degrees roll
                (random() - 0.5) * 10, -- ±5 degrees pitch
                random() * 360, -- 0-360 degrees yaw
                8 + random() * 12, -- 8-20 m/s ground speed
                100 - (i * 0.5), -- Battery decreasing over time
                'AUTO',
                true,
                'ACTIVE',
                -60 - random() * 20, -- -60 to -80 dBm
                8 + floor(random() * 5), -- 8-12 satellites
                3, -- Good GPS fix
                20 + random() * 10, -- 20-30°C
                random() * 360 -- 0-360 degrees heading
            );
        END LOOP;
    END LOOP;
END $$;

-- Create sample drone events
INSERT INTO telemetry.drone_events (
    id,
    drone_id,
    mission_id,
    event_type,
    event_code,
    severity,
    title,
    description,
    latitude,
    longitude,
    flight_mode,
    system_status,
    battery_percentage,
    occurred_at
) VALUES 
(
    uuid_generate_v4(),
    (SELECT id FROM core.drones WHERE name = 'Hawk-2' LIMIT 1),
    (SELECT id FROM core.missions WHERE status = 'active' LIMIT 1),
    'warning',
    'BATT_LOW',
    2,
    'Battery Level Warning',
    'Battery level dropped below 30%. Consider returning to base for recharging.',
    34.0522,
    -118.2437,
    'AUTO',
    'ACTIVE',
    28.5,
    NOW() - INTERVAL '45 minutes'
),
(
    uuid_generate_v4(),
    (SELECT id FROM core.drones WHERE name = 'Falcon-1' LIMIT 1),
    NULL,
    'error',
    'MAINT_REQ',
    3,
    'Maintenance Required',
    'Scheduled maintenance window has been exceeded. Ground the aircraft immediately.',
    34.0522,
    -118.2437,
    'LAND',
    'MAINTENANCE',
    0.0,
    NOW() - INTERVAL '1 day'
);

-- Create API keys for testing
INSERT INTO auth.api_keys (
    id,
    key_id,
    key_hash,
    name,
    description,
    type,
    permissions,
    created_by,
    expires_at
) VALUES 
(
    uuid_generate_v4(),
    'sk_test_telemetry_001',
    '$2b$12$dummy_hash_for_testing_purposes_only',
    'Test Telemetry Integration',
    'API key for testing telemetry data ingestion',
    'DRONE_TELEMETRY',
    ARRAY['telemetry:send', 'telemetry:read'],
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    NOW() + INTERVAL '1 year'
),
(
    uuid_generate_v4(),
    'sk_test_readonly_001',
    '$2b$12$dummy_hash_for_readonly_testing_only',
    'Test Read-Only Access',
    'API key for testing read-only operations',
    'READONLY',
    ARRAY['drone:read', 'mission:read', 'telemetry:read'],
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    NOW() + INTERVAL '6 months'
);

-- Create system health summary entries
INSERT INTO analytics.system_health_summary (
    summary_date,
    summary_period,
    system_health_score,
    availability_percentage,
    performance_score,
    security_score,
    total_users_active,
    total_missions_active,
    total_drones_active,
    database_health_score,
    api_health_score,
    websocket_health_score,
    drone_fleet_health_score,
    computed_at
) VALUES 
(
    CURRENT_DATE - INTERVAL '1 day',
    'daily',
    92.5,
    99.8,
    88.2,
    95.0,
    4,
    1,
    3,
    94.0,
    91.0,
    89.0,
    87.5,
    NOW()
),
(
    CURRENT_DATE,
    'daily',
    89.2,
    99.5,
    85.8,
    96.2,
    4,
    1,
    2,
    92.0,
    88.5,
    87.0,
    84.2,
    NOW()
);

-- Insert audit log entries for system initialization
INSERT INTO audit.audit_logs (
    user_id,
    username,
    action,
    resource,
    resource_type,
    operation_type,
    success,
    ip_address,
    user_agent,
    metadata,
    occurred_at
) VALUES 
(
    (SELECT id FROM auth.users WHERE username = 'admin' LIMIT 1),
    'admin',
    'SYSTEM_INIT',
    '/database/init',
    'system',
    'CREATE',
    true,
    '127.0.0.1'::INET,
    'Database Init Script',
    jsonb_build_object('action', 'seed_data_creation', 'version', '1.0.0'),
    NOW()
);

COMMIT;