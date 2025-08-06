-- =============================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- =============================================
-- Automated data management, integrity checks, and business logic

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables that have this column
CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_drones_updated_at
    BEFORE UPDATE ON core.drones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_missions_updated_at
    BEFORE UPDATE ON core.missions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_swarms_updated_at
    BEFORE UPDATE ON core.swarms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_channels_updated_at
    BEFORE UPDATE ON core.communication_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_ai_models_updated_at
    BEFORE UPDATE ON core.ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to encrypt sensitive data before storage
CREATE OR REPLACE FUNCTION encrypt_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt MFA secret if present
    IF NEW.mfa_secret IS NOT NULL THEN
        NEW.mfa_secret = pgp_sym_encrypt(NEW.mfa_secret, current_setting('app.encryption_key', true));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user data encryption
CREATE TRIGGER tr_users_encrypt_data
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_sensitive_data();

-- Function to log user authentication attempts
CREATE OR REPLACE FUNCTION log_auth_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called from application code, but we can prepare the structure
    -- INSERT INTO audit.audit_logs for authentication events happens in application layer
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically archive old telemetry data
CREATE OR REPLACE FUNCTION archive_old_telemetry()
RETURNS VOID AS $$
DECLARE
    archive_date DATE;
    partition_name TEXT;
BEGIN
    -- Archive telemetry older than 1 year
    archive_date := CURRENT_DATE - INTERVAL '1 year';
    
    -- Find partitions older than archive date
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'telemetry' 
        AND tablename LIKE 'drone_telemetry_%'
        AND tablename < 'drone_telemetry_' || to_char(archive_date, 'YYYY_MM')
    LOOP
        -- Move to archive schema or external storage
        EXECUTE format('ALTER TABLE %s SET SCHEMA archive', partition_name);
        RAISE NOTICE 'Archived partition: %', partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate drone health score
CREATE OR REPLACE FUNCTION calculate_drone_health_score(drone_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    health_score DECIMAL(5,2);
    battery_score DECIMAL(5,2);
    signal_score DECIMAL(5,2);
    maintenance_score DECIMAL(5,2);
    flight_performance_score DECIMAL(5,2);
    error_rate_score DECIMAL(5,2);
    drone_record RECORD;
    recent_errors INTEGER;
    avg_battery DECIMAL(5,2);
    avg_signal DECIMAL(5,2);
BEGIN
    -- Get drone data
    SELECT * INTO drone_record FROM core.drones WHERE id = drone_uuid;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Battery health (0-30 points)
    battery_score := GREATEST(0, LEAST(30, drone_record.battery_percentage * 0.3));
    
    -- Signal strength (0-25 points)
    signal_score := GREATEST(0, LEAST(25, drone_record.signal_strength * 0.25));
    
    -- Maintenance status (0-25 points)
    IF drone_record.next_maintenance_at > NOW() THEN
        maintenance_score := 25;
    ELSIF drone_record.next_maintenance_at > NOW() - INTERVAL '7 days' THEN
        maintenance_score := 15;
    ELSIF drone_record.next_maintenance_at > NOW() - INTERVAL '30 days' THEN
        maintenance_score := 10;
    ELSE
        maintenance_score := 0;
    END IF;
    
    -- Recent error rate (0-20 points)
    SELECT COUNT(*) INTO recent_errors
    FROM telemetry.drone_events
    WHERE drone_id = drone_uuid
    AND occurred_at > NOW() - INTERVAL '24 hours'
    AND severity >= 3;
    
    error_rate_score := GREATEST(0, 20 - (recent_errors * 5));
    
    -- Calculate total health score
    health_score := battery_score + signal_score + maintenance_score + error_rate_score;
    
    RETURN LEAST(100, health_score);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create mission summary when mission completes
CREATE OR REPLACE FUNCTION create_mission_summary()
RETURNS TRIGGER AS $$
DECLARE
    mission_record RECORD;
    drone_count INTEGER;
    team_count INTEGER;
    total_flight_time INTEGER;
    total_messages INTEGER;
    incident_count INTEGER;
BEGIN
    -- Only process when mission status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get mission details
        SELECT * INTO mission_record FROM core.missions WHERE id = NEW.id;
        
        -- Calculate metrics
        SELECT COALESCE(array_length(assigned_drones, 1), 0) INTO drone_count FROM core.missions WHERE id = NEW.id;
        SELECT COALESCE(array_length(team_members, 1), 0) INTO team_count FROM core.missions WHERE id = NEW.id;
        
        -- Get total flight time for this mission
        SELECT COALESCE(SUM(total_duration_seconds), 0) / 60 INTO total_flight_time
        FROM telemetry.flight_paths
        WHERE mission_id = NEW.id;
        
        -- Get message count
        SELECT COUNT(*) INTO total_messages
        FROM core.messages m
        JOIN core.communication_channels c ON m.channel_id = c.id
        WHERE c.mission_id = NEW.id;
        
        -- Get incident count
        SELECT COUNT(*) INTO incident_count
        FROM telemetry.drone_events
        WHERE mission_id = NEW.id AND severity >= 3;
        
        -- Insert mission analytics record
        INSERT INTO analytics.mission_analytics (
            mission_id,
            mission_name,
            mission_status,
            threat_level,
            classification,
            planned_duration_minutes,
            actual_duration_minutes,
            drones_assigned,
            team_members_assigned,
            total_flight_time_minutes,
            messages_sent,
            incidents_reported,
            analyzed_at
        ) VALUES (
            NEW.id,
            NEW.name,
            NEW.status,
            NEW.threat_level,
            NEW.classification,
            EXTRACT(EPOCH FROM (NEW.scheduled_end_at - NEW.scheduled_start_at)) / 60,
            EXTRACT(EPOCH FROM (NEW.actual_end_at - NEW.actual_start_at)) / 60,
            drone_count,
            team_count,
            total_flight_time,
            total_messages,
            incident_count,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create mission summary
CREATE TRIGGER tr_mission_completion_summary
    AFTER UPDATE ON core.missions
    FOR EACH ROW
    EXECUTE FUNCTION create_mission_summary();

-- Function to automatically detect and alert on anomalies
CREATE OR REPLACE FUNCTION detect_telemetry_anomalies()
RETURNS TRIGGER AS $$
DECLARE
    avg_battery DECIMAL(5,2);
    avg_signal DECIMAL(5,2);
    drone_record RECORD;
BEGIN
    -- Get drone info
    SELECT * INTO drone_record FROM core.drones WHERE id = NEW.drone_id;
    
    -- Battery critically low alert
    IF NEW.battery_percentage IS NOT NULL AND NEW.battery_percentage < 15 THEN
        INSERT INTO telemetry.real_time_alerts (
            drone_id,
            mission_id,
            alert_type,
            severity,
            title,
            message,
            trigger_value,
            threshold_value,
            comparison_operator,
            latitude,
            longitude,
            altitude_m,
            triggered_at
        ) VALUES (
            NEW.drone_id,
            NEW.mission_id,
            'battery_critical',
            4,
            'Critical Battery Level',
            format('Drone %s battery at %s%% - immediate landing required', drone_record.name, NEW.battery_percentage),
            NEW.battery_percentage,
            15,
            '<',
            NEW.latitude,
            NEW.longitude,
            NEW.altitude_m,
            NEW.timestamp
        );
    END IF;
    
    -- Signal strength very low alert
    IF NEW.telemetry_rssi IS NOT NULL AND NEW.telemetry_rssi < -90 THEN
        INSERT INTO telemetry.real_time_alerts (
            drone_id,
            mission_id,
            alert_type,
            severity,
            title,
            message,
            trigger_value,
            threshold_value,
            comparison_operator,
            latitude,
            longitude,
            altitude_m,
            triggered_at
        ) VALUES (
            NEW.drone_id,
            NEW.mission_id,
            'signal_weak',
            3,
            'Weak Signal Strength',
            format('Drone %s signal strength at %s dBm - potential communication loss', drone_record.name, NEW.telemetry_rssi),
            NEW.telemetry_rssi,
            -90,
            '<',
            NEW.latitude,
            NEW.longitude,
            NEW.altitude_m,
            NEW.timestamp
        );
    END IF;
    
    -- GPS fix quality alert
    IF NEW.gps_fix_type IS NOT NULL AND NEW.gps_fix_type < 3 THEN
        INSERT INTO telemetry.real_time_alerts (
            drone_id,
            mission_id,
            alert_type,
            severity,
            title,
            message,
            trigger_value,
            threshold_value,
            comparison_operator,
            latitude,
            longitude,
            altitude_m,
            triggered_at
        ) VALUES (
            NEW.drone_id,
            NEW.mission_id,
            'gps_poor',
            3,
            'Poor GPS Fix Quality',
            format('Drone %s GPS fix type %s - navigation accuracy compromised', drone_record.name, NEW.gps_fix_type),
            NEW.gps_fix_type,
            3,
            '<',
            NEW.latitude,
            NEW.longitude,
            NEW.altitude_m,
            NEW.timestamp
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for telemetry anomaly detection
CREATE TRIGGER tr_telemetry_anomaly_detection
    AFTER INSERT ON telemetry.drone_telemetry
    FOR EACH ROW
    EXECUTE FUNCTION detect_telemetry_anomalies();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth.user_sessions 
    WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate API key statistics
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last used timestamp and usage count
    UPDATE auth.api_keys 
    SET 
        last_used_at = NOW(),
        usage_count = usage_count + 1
    WHERE key_id = NEW.api_key_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce data retention policies
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS VOID AS $$
DECLARE
    retention_date_telemetry DATE;
    retention_date_audit DATE;
    retention_date_messages DATE;
BEGIN
    -- Set retention periods
    retention_date_telemetry := CURRENT_DATE - INTERVAL '2 years';
    retention_date_audit := CURRENT_DATE - INTERVAL '7 years'; -- Compliance requirement
    retention_date_messages := CURRENT_DATE - INTERVAL '1 year';
    
    -- Archive old telemetry data (move to cold storage)
    -- In production, this would move data to S3 or similar
    DELETE FROM telemetry.drone_telemetry 
    WHERE timestamp < retention_date_telemetry;
    
    -- Clean up old non-critical audit logs
    DELETE FROM audit.audit_logs 
    WHERE occurred_at < retention_date_audit 
    AND action NOT IN ('LOGIN', 'LOGOUT', 'SECURITY_VIOLATION', 'PRIVILEGE_ESCALATION');
    
    -- Clean up old messages (keep emergency communications)
    DELETE FROM core.messages 
    WHERE created_at < retention_date_messages 
    AND priority NOT IN ('urgent', 'critical');
    
    -- Clean up resolved alerts older than 6 months
    DELETE FROM telemetry.real_time_alerts
    WHERE resolved_at < CURRENT_DATE - INTERVAL '6 months';
    
    RAISE NOTICE 'Data retention cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Function to generate system health report
CREATE OR REPLACE FUNCTION generate_system_health_report()
RETURNS TABLE (
    component VARCHAR(100),
    status VARCHAR(20),
    score DECIMAL(5,2),
    details JSONB
) AS $$
BEGIN
    -- Database health
    RETURN QUERY
    SELECT 
        'Database'::VARCHAR(100),
        CASE 
            WHEN COUNT(*) > 0 THEN 'healthy'
            ELSE 'unhealthy'
        END::VARCHAR(20),
        95.0::DECIMAL(5,2),
        jsonb_build_object(
            'connections', (SELECT count(*) FROM pg_stat_activity),
            'slow_queries', (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000),
            'cache_hit_ratio', (SELECT ROUND(sum(blks_hit)*100/sum(blks_hit+blks_read), 2) FROM pg_stat_database)
        )
    FROM pg_stat_database
    WHERE datname = current_database();
    
    -- Drone fleet health
    RETURN QUERY
    SELECT 
        'Drone Fleet'::VARCHAR(100),
        CASE 
            WHEN AVG(CASE WHEN status = 'active' THEN 100 ELSE 0 END) > 70 THEN 'healthy'
            WHEN AVG(CASE WHEN status = 'active' THEN 100 ELSE 0 END) > 40 THEN 'warning'
            ELSE 'critical'
        END::VARCHAR(20),
        AVG(CASE WHEN status = 'active' THEN battery_percentage ELSE 50 END)::DECIMAL(5,2),
        jsonb_build_object(
            'total_drones', COUNT(*),
            'active_drones', COUNT(*) FILTER (WHERE status = 'active'),
            'maintenance_due', COUNT(*) FILTER (WHERE next_maintenance_at < NOW() + INTERVAL '7 days')
        )
    FROM core.drones
    WHERE deleted_at IS NULL;
    
    -- Mission operations health
    RETURN QUERY
    SELECT 
        'Mission Operations'::VARCHAR(100),
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'active') > 0 THEN 'active'
            ELSE 'idle'
        END::VARCHAR(20),
        COALESCE(AVG(progress_percentage), 0)::DECIMAL(5,2),
        jsonb_build_object(
            'total_missions', COUNT(*),
            'active_missions', COUNT(*) FILTER (WHERE status = 'active'),
            'completed_today', COUNT(*) FILTER (WHERE status = 'completed' AND actual_end_at::date = CURRENT_DATE)
        )
    FROM core.missions
    WHERE deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate mission assignments
CREATE OR REPLACE FUNCTION validate_mission_assignment()
RETURNS TRIGGER AS $$
DECLARE
    drone_status VARCHAR(20);
    drone_battery DECIMAL(5,2);
BEGIN
    -- Check if drones assigned to mission are available
    IF NEW.assigned_drones IS NOT NULL THEN
        FOR i IN 1..array_length(NEW.assigned_drones, 1) LOOP
            SELECT status, battery_percentage INTO drone_status, drone_battery
            FROM core.drones 
            WHERE id = NEW.assigned_drones[i] AND deleted_at IS NULL;
            
            IF drone_status IS NULL THEN
                RAISE EXCEPTION 'Drone % not found or deleted', NEW.assigned_drones[i];
            END IF;
            
            IF drone_status = 'maintenance' THEN
                RAISE EXCEPTION 'Cannot assign drone % - currently in maintenance', NEW.assigned_drones[i];
            END IF;
            
            IF drone_battery < 20 THEN
                RAISE EXCEPTION 'Cannot assign drone % - battery too low (%s%%)', NEW.assigned_drones[i], drone_battery;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mission assignment validation
CREATE TRIGGER tr_validate_mission_assignment
    BEFORE INSERT OR UPDATE ON core.missions
    FOR EACH ROW
    EXECUTE FUNCTION validate_mission_assignment();

-- Create maintenance schedule for automated tasks
CREATE OR REPLACE FUNCTION schedule_maintenance_tasks()
RETURNS VOID AS $$
BEGIN
    -- This would be called by a cron job or scheduler
    
    -- Clean up expired sessions daily
    PERFORM cleanup_expired_sessions();
    
    -- Enforce data retention policies weekly
    IF EXTRACT(dow FROM NOW()) = 0 THEN -- Sunday
        PERFORM enforce_data_retention();
    END IF;
    
    -- Archive old telemetry monthly
    IF EXTRACT(day FROM NOW()) = 1 THEN -- First day of month
        PERFORM archive_old_telemetry();
    END IF;
    
    -- Update system health summary
    INSERT INTO analytics.system_health_summary (
        summary_date,
        summary_period,
        system_health_score,
        total_users_active,
        total_missions_active,
        total_drones_active,
        computed_at
    )
    SELECT 
        CURRENT_DATE,
        'daily',
        85.0, -- This would be calculated from various metrics
        (SELECT COUNT(*) FROM auth.users WHERE is_active = true AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM core.missions WHERE status = 'active' AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM core.drones WHERE status = 'active' AND deleted_at IS NULL),
        NOW()
    ON CONFLICT (summary_date, summary_period) DO UPDATE SET
        system_health_score = EXCLUDED.system_health_score,
        total_users_active = EXCLUDED.total_users_active,
        total_missions_active = EXCLUDED.total_missions_active,
        total_drones_active = EXCLUDED.total_drones_active,
        computed_at = EXCLUDED.computed_at;
END;
$$ LANGUAGE plpgsql;