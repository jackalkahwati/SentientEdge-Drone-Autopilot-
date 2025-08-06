# SentientEdge Military-Grade Monitoring & Observability System

## Overview

This comprehensive monitoring and observability system provides military-grade monitoring capabilities for the SentientEdge drone control platform. The system is designed for mission-critical operations where system visibility, security monitoring, and compliance reporting are essential for operational success.

## 🛡️ Security Classifications

This monitoring system handles data at various security classifications:
- **UNCLASSIFIED**: General system metrics and performance data
- **CONFIDENTIAL**: Security events, anomaly detection, system health
- **SECRET**: Drone operations, mission data, threat intelligence
- **TOP SECRET**: Critical security threats, emergency situations

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SentientEdge Application                     │
├─────────────────────────────────────────────────────────────────┤
│  Express Server (Port 4000)  │  Next.js Frontend (Port 3000)   │
├─────────────────────────────────────────────────────────────────┤
│                    Monitoring Middleware                        │
├─────────────────────────────────────────────────────────────────┤
│    Logging    │   Metrics   │  Security   │   Anomaly Det.     │
│   (Winston)   │(Prometheus) │  Monitor    │    (Custom)        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Collection Layer                        │
├──────────────────┬──────────────────┬─────────────────────────────┤
│   ELK Stack      │  Prometheus      │       Jaeger               │
│                  │  + Grafana       │    (Tracing)               │
│ • Elasticsearch  │                  │                            │
│ • Logstash       │ • Metrics DB     │ • Request Tracing          │
│ • Kibana         │ • Dashboards     │ • Performance Analysis     │
│ • Filebeat       │ • AlertManager   │                            │
└──────────────────┴──────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Alerting & Response                           │
├─────────────────────────────────────────────────────────────────┤
│  • Email Alerts      • Slack Integration                       │
│  • SMS Notifications • PagerDuty                               │
│  • Emergency Response • Automated Remediation                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
npm run monitoring:start

# Check health of all services
npm run monitoring:health

# View logs from all services
npm run monitoring:logs
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3001 (admin/SentientEdge2024!)
- **Kibana**: http://localhost:5601 (elastic/SentientEdge2024!)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### 3. API Endpoints

- **Health Check**: http://localhost:4000/api/health
- **Metrics**: http://localhost:4000/metrics
- **Security Status**: http://localhost:4000/api/security/status

## 📈 Components

### 1. Structured Logging System

**Location**: `lib/monitoring/logger.ts`

Military-grade structured logging with:
- **Security Classifications**: UNCLASSIFIED → TOP SECRET
- **Log Categories**: 16 specialized categories (SYSTEM, SECURITY, DRONE_TELEMETRY, etc.)
- **Severity Levels**: EMERGENCY → DEBUG
- **Automatic Rotation**: Daily rotation with compression
- **Correlation IDs**: Request tracking across services
- **Metadata Enrichment**: Contextual information for all logs

**Usage Example**:
```typescript
import { logger, LogCategory, SecurityClassification } from './lib/monitoring';

logger.critical({
  message: 'Drone communication lost',
  category: LogCategory.DRONE_TELEMETRY,
  classification: SecurityClassification.SECRET,
  droneId: 'DRONE-001',
  missionId: 'MISSION-ALPHA',
  metadata: {
    lastKnownPosition: { lat: 35.123, lon: -118.456 },
    batteryLevel: 15,
    signalStrength: -95
  }
});
```

### 2. Application Performance Monitoring (APM)

**Location**: `lib/monitoring/metrics.ts`

Prometheus-based metrics collection:
- **System Metrics**: CPU, memory, disk usage
- **HTTP Metrics**: Request rates, response times, error rates
- **Database Metrics**: Query performance, connection pools
- **Drone Metrics**: Telemetry rates, battery levels, signal strength
- **Security Metrics**: Authentication attempts, threats blocked
- **Custom Military Metrics**: Mission success rates, threat levels

**Key Metrics**:
- `sentient_drone_battery_level_percent`
- `sentient_mission_success_rate`
- `sentient_security_events_total`
- `sentient_http_request_duration_seconds`

### 3. Security Event Correlation

**Location**: `lib/monitoring/security-monitor.ts`

Advanced threat detection and correlation:
- **16 Security Event Types**: From authentication failures to drone hijacking
- **Automated Correlation**: Pattern detection across multiple events
- **Threat Intelligence**: Integration with military threat feeds
- **Automated Response**: IP blocking, account lockdown, emergency alerts
- **Multi-layered Alerting**: Email, Slack, SMS, PagerDuty

**Correlation Rules**:
- Brute force attack detection (5 failures in 5 minutes)
- Privilege escalation attempts
- Drone compromise patterns
- Multi-vector attacks

### 4. Anomaly Detection System

**Location**: `lib/monitoring/anomaly-detection.ts`

Machine learning-based anomaly detection:
- **Drone Behavior Analysis**: Flight patterns, battery usage, communication
- **System Performance**: Resource usage, error rates, response times
- **Security Anomalies**: Unusual access patterns, suspicious activities
- **Real-time Processing**: Sub-second detection for critical anomalies
- **Confidence Scoring**: ML-based confidence levels (0.0 - 1.0)

**Detection Types**:
- Battery level anomalies
- Signal strength degradation
- Erratic flight behavior
- Location deviations
- Performance degradation

### 5. Monitoring Middleware

**Location**: `lib/monitoring/middleware.ts`

Comprehensive request/response monitoring:
- **Express Integration**: Automatic HTTP request monitoring
- **Next.js Support**: API route monitoring
- **Database Monitoring**: Query performance tracking
- **WebSocket Monitoring**: Real-time connection tracking
- **Authentication Monitoring**: Login/logout event tracking

## 📊 Dashboards

### System Overview Dashboard
**File**: `monitoring/grafana/dashboards/system/system-overview.json`

Key metrics displayed:
- System status and uptime
- CPU and memory usage
- HTTP request rates and response times
- Active drone count
- Error rates and status codes

### Drone Telemetry Dashboard
**File**: `monitoring/grafana/dashboards/drone/drone-telemetry.json`

Drone-specific monitoring:
- Battery levels for all drones
- Signal strength indicators
- Telemetry message rates
- Flight behavior patterns
- Anomaly detection alerts

### Security Dashboard
Real-time security monitoring:
- Authentication attempts and failures
- Threat detection events
- IP blocking status
- Security correlation alerts
- Compliance violations

## 🚨 Alerting Rules

### Critical Alerts (Immediate Response)
- **Drone Offline**: 30-second detection
- **Critical Battery**: <10% battery level
- **Security Threats**: Real-time threat detection
- **System Down**: Service availability monitoring

### Warning Alerts (Investigation Required)
- **Low Battery**: <20% battery level
- **High Error Rate**: >5% error rate for 2 minutes
- **Slow Response**: >2 second response times
- **Weak Signal**: Communication quality degradation

### Configuration Files
- **Prometheus Rules**: `monitoring/prometheus/rules/sentient-edge-alerts.yml`
- **AlertManager Config**: `monitoring/alertmanager/alertmanager.yml`

## 🔧 Configuration

### Environment Variables

```bash
# Monitoring Configuration
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_SECURITY=true
ENABLE_ANOMALY_DETECTION=true

# ELK Stack
ELASTIC_PASSWORD=SentientEdge2024!
KIBANA_PASSWORD=SentientEdge2024!
KIBANA_ENCRYPTION_KEY=a7s8d9f0g1h2j3k4l5m6n7o8p9q0r1s2

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=SentientEdge2024!

# Alert Notifications
SMTP_PASSWORD=your_smtp_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/your/webhook/url
PAGERDUTY_SERVICE_KEY=your_pagerduty_key
```

### Monitoring Middleware Setup

```typescript
import { expressMonitoring, initializeMonitoring } from './lib/monitoring';

// Initialize monitoring system
await initializeMonitoring();

// Add monitoring middleware
app.use(expressMonitoring());
```

## 📋 Compliance & Audit

The monitoring system provides comprehensive audit trails for military compliance:

### Audit Log Categories
- **Authentication Events**: All login/logout activities
- **Data Access**: Sensitive data access tracking
- **System Changes**: Configuration modifications
- **Security Events**: All security-related activities
- **Mission Operations**: Drone and mission activities

### Retention Policies
- **Security Logs**: 365 days retention
- **Audit Logs**: 365 days retention
- **System Logs**: 90 days retention
- **Metrics Data**: 90 days retention
- **Telemetry Data**: 30 days retention

### Compliance Features
- **Data Classification**: Automatic classification labeling
- **Access Controls**: Role-based access to monitoring data
- **Encryption**: At-rest and in-transit encryption
- **Integrity Verification**: Log tampering detection
- **Export Capabilities**: Compliance report generation

## 🛠️ Maintenance

### Daily Operations
```bash
# Check system health
npm run monitoring:health

# View recent logs
docker-compose logs --tail=100 -f grafana prometheus alertmanager

# Check disk usage
df -h
docker system df
```

### Weekly Maintenance
```bash
# Clean up old logs
find logs/ -name "*.log.*" -mtime +30 -delete

# Backup monitoring configuration
tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz monitoring/

# Update threat intelligence feeds
node scripts/update-threat-intelligence.js
```

### Emergency Procedures

#### Service Recovery
```bash
# Restart all monitoring services
npm run monitoring:stop
npm run monitoring:start

# Check service status
docker-compose ps
```

#### Log Analysis for Incidents
```bash
# Search security logs for specific IP
grep "192.168.1.100" logs/security/*.log

# Find anomaly detection alerts
grep "ANOMALY" logs/sentient-edge*.log | tail -50

# Check authentication failures
grep "authentication_failure" logs/audit/*.log
```

## 🔐 Security Considerations

### Data Protection
- All sensitive data is encrypted in transit and at rest
- Security classifications are enforced at the logging level
- Access controls prevent unauthorized data access
- Audit trails track all monitoring system access

### Network Security
- Monitoring services run on isolated network segments
- TLS encryption for all inter-service communication
- API authentication for all monitoring endpoints
- Rate limiting to prevent monitoring system abuse

### Operational Security
- Regular security scans of monitoring infrastructure
- Automated patching of monitoring components
- Secure key management for encryption
- Regular backup and disaster recovery testing

## 📚 Additional Resources

### Documentation
- [ELK Stack Configuration Guide](elk-stack/README.md)
- [Prometheus Setup Guide](prometheus/README.md)
- [Grafana Dashboard Development](grafana/README.md)
- [Security Monitoring Playbook](security/PLAYBOOK.md)

### Support Contacts
- **System Administrators**: sysadmin@sentientedge.mil
- **Security Team**: security@sentientedge.mil
- **Development Team**: dev-team@sentientedge.mil
- **Emergency Response**: emergency@sentientedge.mil

---

**Classification**: CONFIDENTIAL  
**Last Updated**: 2024-08-04  
**Version**: 2.0.0  
**Maintainer**: SentientEdge Development Team