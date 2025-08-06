# SentientEdge Production Database System

This document provides comprehensive instructions for setting up and managing the production-ready PostgreSQL database system for SentientEdge drone operations.

## Overview

The database system has been completely redesigned to replace the vulnerable in-memory storage with a robust, scalable, and secure PostgreSQL infrastructure suitable for mission-critical drone operations.

### Key Features Implemented

✅ **PostgreSQL 16** with advanced indexing and partitioning  
✅ **Connection Pooling** with PgBouncer for high performance  
✅ **Read Replicas** for horizontal scaling  
✅ **Redis Caching** for improved response times  
✅ **Automated Backups** with encryption and compression  
✅ **Database Migrations** with version control and rollback  
✅ **Data Encryption** at rest and in transit  
✅ **Comprehensive Audit Logging** for security compliance  
✅ **Real-time Monitoring** and performance analysis  
✅ **Disaster Recovery** procedures  

## Quick Start

### 1. Prerequisites

Ensure you have the following installed:
- Docker and Docker Compose
- Node.js 18+ and npm
- OpenSSL (for certificate generation)
- PostgreSQL client tools (psql, pg_dump, pg_restore)

### 2. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Update the `.env` file with your secure passwords and keys:
```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-password-here
DATABASE_ENCRYPTION_KEY=your-32-character-encryption-key
AES_ENCRYPTION_KEY=another-32-character-encryption-key

# Backup Configuration
BACKUP_ENCRYPTION_PASSPHRASE=your-backup-passphrase
```

### 3. Generate SSL Certificates

Create SSL certificates for secure database connections:
```bash
cd database/ssl
./generate-certs.sh
```

### 4. Start the Database Infrastructure

Launch all database services:
```bash
docker-compose up -d
```

This starts:
- PostgreSQL Primary Database (port 5432)
- PostgreSQL Read Replica (port 5433)
- PgBouncer Connection Pooler (port 6432)
- Redis Cache (port 6379)
- Monitoring Services

### 5. Start the Application

The application will automatically initialize the database on first run:
```bash
npm run dev:backend
```

The system will:
- Connect to the database
- Run initial schema setup
- Apply any pending migrations
- Initialize backup system
- Start the server

## Database Architecture

### Schema Organization

The database is organized into logical schemas:

- **`auth`** - User authentication, sessions, API keys
- **`core`** - Core operational data (drones, missions, communications)
- **`telemetry`** - High-volume drone telemetry and sensor data
- **`analytics`** - Pre-computed analytics and reports
- **`audit`** - Comprehensive audit logs and security events

### Key Tables

#### Core Operations
- `core.drones` - Drone fleet management
- `core.missions` - Mission planning and execution
- `core.swarms` - Multi-drone coordination
- `core.communication_channels` - Secure communications
- `core.messages` - Mission communications
- `core.ai_models` - AI model management

#### Authentication & Security
- `auth.users` - User accounts with role-based access
- `auth.user_sessions` - JWT session management
- `auth.api_keys` - API key authentication

#### Telemetry & Monitoring
- `telemetry.drone_telemetry` - Real-time drone data (partitioned)
- `telemetry.drone_events` - System events and alerts
- `telemetry.flight_paths` - Flight path recording
- `telemetry.real_time_alerts` - Automated alerting

#### Analytics & Reporting
- `analytics.system_performance` - System metrics
- `analytics.mission_analytics` - Mission KPIs
- `analytics.drone_analytics` - Fleet performance
- `analytics.user_analytics` - User activity tracking

### Performance Optimizations

#### Indexing Strategy
- **Composite indexes** for common query patterns
- **Partial indexes** for filtered queries
- **Full-text search indexes** for content search
- **Time-series indexes** for telemetry data

#### Partitioning
- **Monthly partitioning** for telemetry data
- **Automatic partition creation** for new months
- **Partition pruning** for old data cleanup

#### Caching
- **Redis caching** for frequently accessed data
- **Query result caching** with TTL management
- **Session caching** for authentication

## Database Management

### Migrations

View migration status:
```bash
node -e "require('./lib/migrations').getStatus().then(console.log)"
```

Run pending migrations:
```bash
node -e "require('./lib/migrations').migrate().then(console.log)"
```

Create new migration:
```bash
node -e "require('./lib/migrations').generateMigration('Add new feature').then(console.log)"
```

Rollback to specific version:
```bash
node -e "require('./lib/migrations').rollback('version').then(console.log)"
```

### Backup & Recovery

#### Manual Backup
```bash
node -e "require('./lib/backup-manager').createFullBackup().then(console.log)"
```

#### Restore from Backup
```bash
node -e "require('./lib/backup-manager').restoreFromBackup('backup-name').then(console.log)"
```

#### List Available Backups
```bash
node -e "require('./lib/backup-manager').listBackups().then(console.log)"
```

### Monitoring

#### Database Connection Status
```bash
node -e "require('./lib/database').getConnectionStats().then(console.log)"
```

#### Health Check
```bash
curl http://localhost:4000/api/health
```

## Security Features

### Encryption

- **Data at Rest**: AES-256 encryption for sensitive fields
- **Data in Transit**: TLS 1.3 with certificate validation
- **Backup Encryption**: AES-256-CBC for backup files
- **Key Management**: Environment-based key storage

### Access Control

- **Role-Based Access Control (RBAC)**: admin, operator, analyst, viewer
- **API Key Authentication**: Scoped permissions for integrations
- **Session Management**: JWT with refresh token rotation
- **IP Whitelisting**: Restrict API key access by IP

### Auditing

All database operations are automatically logged with:
- User identification and IP address
- Resource access and modifications
- Security events and violations
- Performance metrics and errors

## API Migration Guide

The API endpoints remain compatible, but now use persistent database storage:

### Before (In-Memory)
```javascript
// Data lost on server restart
const drones = [...];
const missions = [...];
```

### After (Database)
```javascript
// Persistent storage with caching
const drones = await dronesDAO.findAll();
const missions = await missionsDAO.findAll();
```

### New Features Available

#### Enhanced Drone Operations
```javascript
// Advanced filtering
GET /api/drones?status=active&type=surveillance&limit=10

// Status management with validation
PATCH /api/drones/:id/status
{
  "status": "active",
  "reason": "Mission deployment"
}

// Geographic search
const nearbyDrones = await dronesDAO.findInArea(lat, lng, radiusKm);
```

#### Mission Management
```javascript
// Real-time mission tracking
GET /api/missions?status=active&threatLevel=3

// Mission analytics
const stats = await missionsDAO.getMissionStatistics();

// Drone assignment with validation
const result = await missionsDAO.assignDrones(missionId, droneIds, userId);
```

#### Telemetry Processing
```javascript
// High-volume telemetry ingestion
POST /api/drone/telemetry
{
  "droneId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "altitude_m": 150.5,
  "battery_percentage": 85.2,
  "ground_speed_ms": 12.5
}

// Real-time health monitoring
const health = await telemetryDAO.getDroneHealthMetrics(droneId);
```

## Production Deployment

### Docker Configuration

For production deployment, update `docker-compose.yml`:

1. **Change default passwords**
2. **Enable SSL/TLS** with real certificates
3. **Configure backup storage** (S3, Azure Blob, etc.)
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure log aggregation** (ELK stack)

### Environment Variables

Production-specific environment variables:

```bash
# Production Database
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:6432/sentient_edge?sslmode=require

# SSL Configuration
SSL_CERT_PATH=/path/to/production/cert.pem
SSL_KEY_PATH=/path/to/production/key.pem
SSL_CA_PATH=/path/to/ca-bundle.pem

# Backup Configuration
BACKUP_DIR=/secure/backup/location
BACKUP_ENCRYPTION_PASSPHRASE=production-backup-key
BACKUP_RETENTION_DAYS=90

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD=500
```

### Scaling Considerations

#### Read Replicas
- Configure multiple read replicas for high-read workloads
- Use read replica for analytics and reporting queries
- Implement read/write splitting in application code

#### Connection Pooling
- Tune PgBouncer pool sizes based on workload
- Monitor connection usage and adjust limits
- Use transaction-level pooling for better throughput

#### Caching Strategy
- Implement multi-level caching (Redis + application-level)
- Use cache warming for critical data
- Set appropriate TTL values for different data types

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
docker-compose ps
docker-compose logs postgres-primary

# Test connection
psql -h localhost -p 6432 -U sentient_admin -d sentient_edge
```

#### Migration Failures
```bash
# Check migration status
node -e "require('./lib/migrations').validateIntegrity().then(console.log)"

# Manual migration rollback
node -e "require('./lib/migrations').rollback('target-version').then(console.log)"
```

#### Performance Issues
```bash
# Check slow queries
docker-compose exec postgres-primary psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Monitor connection pool
curl http://localhost:4000/api/health
```

### Monitoring Queries

#### Active Connections
```sql
SELECT count(*) as total_connections, state 
FROM pg_stat_activity 
GROUP BY state;
```

#### Table Sizes
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname IN ('core', 'telemetry', 'auth', 'analytics', 'audit')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Slow Queries
```sql
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Support & Maintenance

### Regular Maintenance Tasks

#### Daily
- ✅ Automated backups (scheduled)
- ✅ Monitor system health
- ✅ Check alert logs

#### Weekly
- 🔄 Review slow query logs
- 🔄 Analyze storage usage
- 🔄 Update statistics

#### Monthly
- 📊 Capacity planning review
- 🔧 Performance optimization
- 🔄 Security audit review

### Emergency Procedures

#### Data Recovery
1. Stop application servers
2. Identify backup to restore from
3. Restore using backup manager
4. Validate data integrity
5. Restart application services

#### Security Incident Response
1. Immediately revoke compromised credentials
2. Review audit logs for unauthorized access
3. Implement temporary access restrictions
4. Investigate and document incident
5. Update security measures

---

## Summary

The SentientEdge database system has been transformed from a vulnerable in-memory solution to a production-ready, military-grade database infrastructure. The system provides:

- **Zero Data Loss**: All mission-critical data is persisted
- **High Availability**: Connection pooling, read replicas, automated backups
- **Security**: Encryption, audit trails, access controls
- **Performance**: Optimized queries, caching, partitioning
- **Monitoring**: Real-time metrics, health checks, alerting
- **Scalability**: Horizontal scaling with read replicas and connection pooling

The system is now ready for mission-critical drone operations with enterprise-grade reliability and security.

**Files Created/Modified:**
- `/lib/database.js` - Database connection management
- `/lib/dao/` - Data access layer with DAOs for all entities
- `/lib/migrations.js` - Database migration system
- `/lib/backup-manager.js` - Automated backup and recovery
- `/database/init/` - Database schema initialization
- `/docker-compose.yml` - Complete database infrastructure
- `/server.js` - Updated to use database instead of in-memory storage

All critical vulnerabilities have been addressed, and the system now provides enterprise-level data persistence and security for drone operations.