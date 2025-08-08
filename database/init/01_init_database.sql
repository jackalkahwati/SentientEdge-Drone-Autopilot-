-- SentientEdge Database Initialization Script
-- Production-ready PostgreSQL schema for mission-critical drone operations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS telemetry;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set default search path
SET search_path TO core, auth, telemetry, analytics, audit, public;

-- =============================================
-- AUTHENTICATION & USER MANAGEMENT SCHEMA
-- =============================================

-- Users table with encrypted data
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hash
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'analyst', 'viewer')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Security fields
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT, -- Encrypted TOTP secret
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- User sessions for JWT refresh token management
CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    device_info JSONB, -- Device fingerprint, user agent, etc.
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

-- API Keys for system integrations
CREATE TABLE IF NOT EXISTS auth.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id VARCHAR(32) UNIQUE NOT NULL, -- Short identifier
    key_hash TEXT NOT NULL, -- Hashed full key
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('DRONE_TELEMETRY', 'DRONE_CONTROL', 'SYSTEM_INTEGRATION', 'READONLY')),
    
    -- Permissions and restrictions
    permissions TEXT[] DEFAULT '{}',
    drone_id UUID, -- If scoped to specific drone
    ip_whitelist INET[],
    rate_limit_rpm INTEGER DEFAULT 1000,
    
    -- Lifecycle
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoked_reason TEXT
);

-- =============================================
-- CORE OPERATIONAL DATA SCHEMA
-- =============================================

-- Drone fleet management
CREATE TABLE IF NOT EXISTS core.drones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('surveillance', 'attack', 'recon', 'transport', 'multi')),
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('active', 'idle', 'maintenance', 'offline')),
    
    -- Technical specifications
    max_flight_time_minutes INTEGER,
    max_range_km DECIMAL(10,2),
    max_altitude_m INTEGER,
    payload_capacity_kg DECIMAL(8,2),
    
    -- Current state
    battery_percentage DECIMAL(5,2) CHECK (battery_percentage >= 0 AND battery_percentage <= 100),
    signal_strength DECIMAL(5,2) CHECK (signal_strength >= 0 AND signal_strength <= 100),
    firmware_version VARCHAR(50),
    
    -- Location data
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    current_altitude_m DECIMAL(10,2),
    current_heading DECIMAL(5,2) CHECK (current_heading >= 0 AND current_heading < 360),
    current_speed_ms DECIMAL(8,2) CHECK (current_speed_ms >= 0),
    
    -- Operational data
    total_flight_hours DECIMAL(10,2) DEFAULT 0,
    mission_count INTEGER DEFAULT 0,
    last_maintenance_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    maintenance_hours_threshold DECIMAL(8,2) DEFAULT 100,
    
    -- Assignment
    current_mission_id UUID,
    operator_id UUID REFERENCES auth.users(id),
    home_base_latitude DECIMAL(10,8),
    home_base_longitude DECIMAL(11,8),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Mission management
CREATE TABLE IF NOT EXISTS core.missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled', 'aborted')),
    
    -- Mission parameters
    threat_level INTEGER NOT NULL DEFAULT 0 CHECK (threat_level >= 0 AND threat_level <= 4),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    classification VARCHAR(20) DEFAULT 'unclassified' CHECK (classification IN ('unclassified', 'confidential', 'secret', 'top_secret')),
    
    -- Location and timing
    location_name VARCHAR(200),
    center_latitude DECIMAL(10,8),
    center_longitude DECIMAL(11,8),
    operation_radius_km DECIMAL(8,2),
    scheduled_start_at TIMESTAMPTZ,
    scheduled_end_at TIMESTAMPTZ,
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    
    -- Team assignment
    assigned_drones UUID[],
    team_lead_id UUID REFERENCES auth.users(id),
    team_members UUID[],
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    objectives JSONB, -- Structured mission objectives
    completion_report TEXT,
    
    -- Weather constraints
    max_wind_speed_ms DECIMAL(6,2),
    min_visibility_km DECIMAL(6,2),
    weather_restrictions JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Swarm configurations for coordinated operations
CREATE TABLE IF NOT EXISTS core.swarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    mission_id UUID REFERENCES core.missions(id) ON DELETE CASCADE,
    formation VARCHAR(20) NOT NULL DEFAULT 'grid' CHECK (formation IN ('grid', 'circle', 'line', 'vee', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'standby' CHECK (status IN ('forming', 'active', 'standby', 'disbanded')),
    
    -- Configuration
    drone_ids UUID[] NOT NULL,
    lead_drone_id UUID,
    formation_parameters JSONB, -- Formation-specific parameters
    coordination_rules JSONB, -- Behavioral rules for swarm
    
    -- Safety parameters
    min_separation_m DECIMAL(8,2) DEFAULT 50,
    max_separation_m DECIMAL(8,2) DEFAULT 1000,
    collision_avoidance_enabled BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Communication channels for operations
CREATE TABLE IF NOT EXISTS core.communication_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'operational' CHECK (type IN ('operational', 'emergency', 'command', 'tactical')),
    
    -- Access control
    is_secure BOOLEAN DEFAULT TRUE,
    encryption_level VARCHAR(20) DEFAULT 'aes256' CHECK (encryption_level IN ('none', 'basic', 'aes256', 'military')),
    clearance_required VARCHAR(20) DEFAULT 'unclassified',
    
    -- Membership
    member_user_ids UUID[],
    admin_user_ids UUID[],
    mission_id UUID REFERENCES core.missions(id),
    
    -- Settings
    message_retention_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Messages within communication channels
CREATE TABLE IF NOT EXISTS core.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES core.communication_channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type VARCHAR(20) DEFAULT 'user' CHECK (sender_type IN ('user', 'system', 'drone', 'ai')),
    
    -- Message content
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'location', 'telemetry')),
    encrypted_content TEXT, -- For sensitive messages
    
    -- Metadata
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
    classification VARCHAR(20) DEFAULT 'unclassified',
    attachments JSONB, -- File references and metadata
    
    -- Delivery tracking
    delivered_to UUID[], -- User IDs who received the message
    read_by UUID[], -- User IDs who read the message
    acknowledged_by UUID[], -- User IDs who acknowledged critical messages
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- AI Models for autonomous operations
CREATE TABLE IF NOT EXISTS core.ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('detection', 'classification', 'prediction', 'navigation', 'swarm_coordination')),
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'testing', 'deployed', 'deprecated', 'failed')),
    
    -- Performance metrics
    accuracy_percentage DECIMAL(5,2),
    precision_percentage DECIMAL(5,2),
    recall_percentage DECIMAL(5,2),
    f1_score DECIMAL(5,4),
    training_progress DECIMAL(5,2) DEFAULT 0,
    
    -- Model metadata
    algorithm VARCHAR(100),
    training_dataset_size BIGINT,
    model_file_path TEXT,
    model_checksum TEXT,
    inference_time_ms DECIMAL(8,2),
    
    -- Deployment info
    deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES auth.users(id),
    last_trained_at TIMESTAMPTZ,
    training_duration_minutes INTEGER,
    
    -- Configuration
    hyperparameters JSONB,
    feature_requirements JSONB,
    compute_requirements JSONB,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Environmental conditions affecting operations
CREATE TABLE IF NOT EXISTS core.environmental_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_name VARCHAR(200),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Weather data
    temperature_celsius DECIMAL(5,2),
    humidity_percentage DECIMAL(5,2),
    pressure_hpa DECIMAL(7,2),
    wind_speed_ms DECIMAL(6,2),
    wind_direction_degrees DECIMAL(5,2),
    wind_gust_speed_ms DECIMAL(6,2),
    
    -- Visibility and precipitation
    visibility_km DECIMAL(6,2),
    precipitation_probability DECIMAL(5,2),
    precipitation_intensity DECIMAL(6,2),
    cloud_cover_percentage DECIMAL(5,2),
    
    -- Operational impact
    flight_conditions VARCHAR(20) CHECK (flight_conditions IN ('excellent', 'good', 'fair', 'poor', 'dangerous')),
    restrictions JSONB, -- Operational restrictions due to weather
    
    -- Data source
    data_source VARCHAR(100), -- Weather service or sensor network
    confidence_level DECIMAL(5,2),
    
    -- Indexing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON auth.users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON auth.users(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON auth.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON auth.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON auth.user_sessions(refresh_token_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON auth.api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON auth.api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON auth.api_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_drones_status ON core.drones(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drones_type ON core.drones(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drones_serial ON core.drones(serial_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drones_location ON core.drones(current_latitude, current_longitude) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drones_mission ON core.drones(current_mission_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_missions_status ON core.missions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_threat_level ON core.missions(threat_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON core.missions(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_scheduled_start ON core.missions(scheduled_start_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_location ON core.missions(center_latitude, center_longitude) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_swarms_mission ON core.swarms(mission_id);
CREATE INDEX IF NOT EXISTS idx_swarms_status ON core.swarms(status);

CREATE INDEX IF NOT EXISTS idx_channels_mission ON core.communication_channels(mission_id);
CREATE INDEX IF NOT EXISTS idx_channels_active ON core.communication_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON core.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON core.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON core.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON core.messages(priority);

CREATE INDEX IF NOT EXISTS idx_ai_models_type ON core.ai_models(type);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON core.ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_version ON core.ai_models(version);

CREATE INDEX IF NOT EXISTS idx_environmental_location ON core.environmental_conditions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_environmental_recorded ON core.environmental_conditions(recorded_at);
CREATE INDEX IF NOT EXISTS idx_environmental_conditions ON core.environmental_conditions(flight_conditions);

-- Full-text search indexes for enhanced search capabilities
CREATE INDEX IF NOT EXISTS idx_missions_name_fts ON core.missions USING gin(to_tsvector('english', name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_description_fts ON core.missions USING gin(to_tsvector('english', description)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drones_name_fts ON core.drones USING gin(to_tsvector('english', name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON core.messages USING gin(to_tsvector('english', content));

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_drones_status_type ON core.drones(status, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missions_status_threat ON core.missions(status, threat_level) WHERE deleted_at IS NULL;