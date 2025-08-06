# SentientEdge Scalable WebSocket Infrastructure Guide

## Overview

This guide covers the deployment and scaling of the SentientEdge WebSocket infrastructure, designed for military-grade drone operations with thousands of concurrent connections and high-frequency telemetry data.

## Architecture Components

### Core Infrastructure
- **WebSocket Cluster Manager**: Redis pub/sub clustering for multi-server distribution
- **Connection Pool Manager**: Advanced connection pooling with intelligent resource management
- **Sticky Session Manager**: Session affinity with consistent hashing load balancing
- **Service Discovery Manager**: Dynamic server registration and auto-scaling
- **Failover Manager**: Automatic failover and connection recovery
- **Message Queue Manager**: High-throughput queuing with delivery guarantees

### Load Balancing
- **HAProxy**: Primary load balancer with WebSocket support and health checks
- **NGINX**: Alternative load balancer with SSL termination
- **Sticky Sessions**: Consistent client routing across server instances

### Data Layer
- **Redis Cluster**: Pub/sub messaging and session storage
- **PostgreSQL**: Primary database with connection pooling
- **PgBouncer**: Database connection pooling for optimal performance

### Monitoring & Observability
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Real-time dashboards and visualization
- **ELK Stack**: Log aggregation and analysis

## Deployment Options

### 1. Docker Compose (Development/Testing)

```bash
# Start the complete infrastructure
docker-compose -f docker-compose.scalable.yml up -d

# Scale WebSocket instances
docker-compose -f docker-compose.scalable.yml up -d --scale websocket-1=2 --scale websocket-2=2

# Monitor logs
docker-compose -f docker-compose.scalable.yml logs -f websocket-1

# Health check
curl http://localhost/health
```

### 2. Production Deployment

#### Prerequisites
- Redis cluster (3+ nodes recommended)
- PostgreSQL with read replicas
- SSL certificates for HTTPS/WSS
- Monitoring infrastructure

#### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=4000
SERVER_ID=ws-cluster-node-1
MAX_WS_CONNECTIONS=10000
ENABLE_CLUSTERING=true
USE_HTTPS=true

# Redis Configuration
REDIS_URL=redis://redis-cluster:6379
REDIS_HOST=redis-cluster
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Database Configuration
DATABASE_URL=postgresql://user:pass@postgres:5432/sentientedge
DB_POOL_SIZE=25

# Scaling Configuration
MIN_INSTANCES=2
MAX_INSTANCES=20
SCALE_UP_THRESHOLD=0.8
SCALE_DOWN_THRESHOLD=0.3

# Security Configuration
JWT_SECRET=your-jwt-secret-key
API_KEY_SECRET=your-api-key-secret
ENCRYPTION_KEY=your-32-byte-encryption-key
```

## Scaling Configuration

### Connection Limits
```javascript
// Per-server connection limits
MAX_WS_CONNECTIONS=10000        // Total connections per server
MAX_CONNECTIONS_PER_DRONE=5     // Connections per drone
MAX_CONNECTIONS_PER_USER=10     // Connections per user
MESSAGE_QUEUE_SIZE=1000         // Messages queued per connection
RATE_LIMIT_MAX=100             // Messages per minute per connection
```

### Auto-scaling Thresholds
```javascript
// Scaling triggers
SCALE_UP_THRESHOLD=0.8         // Scale up at 80% utilization
SCALE_DOWN_THRESHOLD=0.3       // Scale down at 30% utilization
SCALE_UP_COOLDOWN=300000       // 5 minutes between scale-ups
SCALE_DOWN_COOLDOWN=600000     // 10 minutes between scale-downs
```

### Performance Targets
- **Concurrent Connections**: 10,000+ per server instance
- **Message Throughput**: 10,000+ messages/second cluster-wide
- **Telemetry Frequency**: 50Hz+ per drone
- **Failover Time**: <30 seconds
- **Recovery Time**: <5 minutes

## Load Balancer Configuration

### HAProxy Setup
```bash
# Install HAProxy
sudo apt-get install haproxy

# Copy configuration
sudo cp config/haproxy-websocket-lb.cfg /etc/haproxy/haproxy.cfg

# Start HAProxy
sudo systemctl start haproxy
sudo systemctl enable haproxy

# Monitor stats
curl http://localhost:8404/stats
```

### NGINX Setup
```bash
# Install NGINX
sudo apt-get install nginx

# Copy configuration
sudo cp config/nginx-websocket-lb.conf /etc/nginx/sites-available/sentientedge
sudo ln -s /etc/nginx/sites-available/sentientedge /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Monitor status
curl http://localhost/nginx_status
```

## High Availability Setup

### Redis Cluster
```bash
# 3-node Redis cluster setup
redis-server --port 7000 --cluster-enabled yes --cluster-config-file nodes-7000.conf
redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes-7001.conf
redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes-7002.conf

# Create cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 --cluster-replicas 0
```

### PostgreSQL with Read Replicas
```sql
-- Primary database configuration
# postgresql.conf
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on

-- Create replication user
CREATE USER replicator REPLICATION LOGIN PASSWORD 'secure-password';
```

### SSL/TLS Configuration
```bash
# Generate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout ssl/sentientedge.key \
  -out ssl/sentientedge.crt \
  -subj "/C=US/ST=CA/L=SF/O=SentientEdge/CN=sentientedge.local"

# Set proper permissions
chmod 600 ssl/sentientedge.key
chmod 644 ssl/sentientedge.crt
```

## Monitoring and Alerting

### Prometheus Metrics
```yaml
# Key metrics to monitor
- websocket_connections_total
- websocket_messages_per_second
- websocket_response_time_seconds
- redis_cluster_health
- database_connection_pool_usage
- server_cpu_usage_percent
- server_memory_usage_percent
- failover_events_total
- scaling_events_total
```

### Grafana Dashboards
- WebSocket Connection Overview
- Message Throughput and Latency
- Server Resource Utilization
- Failover and Recovery Events
- Redis Cluster Health
- Database Performance

### Alerting Rules
```yaml
# Critical alerts
- alert: WebSocketConnectionsHigh
  expr: websocket_connections_total > 8000
  for: 5m
  
- alert: MessageLatencyHigh
  expr: websocket_response_time_seconds > 0.5
  for: 2m
  
- alert: RedisClusterDown
  expr: redis_cluster_health < 1
  for: 1m
  
- alert: FailoverEvent
  expr: increase(failover_events_total[5m]) > 0
  for: 0m
```

## Performance Tuning

### OS-Level Tuning
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# TCP tuning for high connections
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
echo "net.core.netdev_max_backlog = 5000" >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

### Node.js Tuning
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection optimization
export NODE_OPTIONS="--optimize-for-size --gc-interval=100"

# CPU optimization
export UV_THREADPOOL_SIZE=16
```

### Redis Tuning
```conf
# redis.conf optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
tcp-backlog 65536
```

## Operational Procedures

### Scaling Operations
```bash
# Manual scale up
curl -X POST http://localhost/admin/scale-up \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"instances": 2}'

# Manual scale down
curl -X POST http://localhost/admin/scale-down \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"instances": 1}'

# Check cluster status
curl http://localhost/admin/cluster-status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Health Checks
```bash
# Individual server health
curl http://server1:4000/health

# Load balancer health
curl http://loadbalancer/health

# Metrics endpoint
curl http://server1:4000/metrics
```

### Failover Testing
```bash
# Simulate server failure
docker stop sentient-ws-1

# Monitor failover process
docker logs -f sentient-ws-2

# Check connection migration
curl http://loadbalancer/admin/cluster-status
```

## Security Considerations

### Network Security
- Use VPC/VLAN isolation
- Implement firewall rules
- Enable DDoS protection
- Use WAF for HTTP traffic

### Authentication & Authorization
- JWT tokens with short expiration
- Role-based access control (RBAC)
- API key authentication for drones
- MFA for administrative access

### Data Protection
- TLS 1.3 for all connections
- End-to-end message encryption
- Database encryption at rest
- Secure key management

## Troubleshooting

### Common Issues

#### High Connection Latency
```bash
# Check server resources
htop
iotop

# Monitor network
netstat -i
ss -tuln

# Check Redis performance
redis-cli --latency-history
```

#### Connection Drops
```bash
# Check WebSocket logs
tail -f logs/websocket.log

# Monitor failover events
grep "failover" logs/*.log

# Check load balancer health
curl http://loadbalancer:8404/stats
```

#### Memory Issues
```bash
# Node.js heap analysis
node --inspect server-scalable.js

# Redis memory usage
redis-cli info memory

# System memory
free -h
vmstat 1
```

### Debug Commands
```bash
# WebSocket connection testing
wscat -c ws://localhost/ws?token=your-jwt-token

# Redis cluster status
redis-cli cluster nodes
redis-cli cluster info

# Database connections
pg_stat_activity

# Load balancer status
echo "show stat" | socat stdio /var/run/haproxy/admin.sock
```

## Best Practices

### Development
- Use TypeScript for type safety
- Implement comprehensive error handling
- Write unit and integration tests
- Use proper logging levels
- Document API endpoints

### Operations
- Implement blue-green deployments
- Use infrastructure as code
- Monitor all critical metrics
- Have runbooks for common scenarios
- Practice disaster recovery

### Security
- Regular security audits
- Keep dependencies updated
- Use least privilege principles
- Implement audit logging
- Monitor for suspicious activity

## Support and Maintenance

### Regular Maintenance
- Update dependencies monthly
- Review and rotate secrets quarterly
- Performance testing before major releases
- Capacity planning based on growth projections
- Security patches within 24 hours

### Emergency Procedures
- Incident response plan
- Escalation procedures
- Communication protocols
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)

## Conclusion

This scalable WebSocket infrastructure provides military-grade reliability and performance for drone operations. With proper deployment, monitoring, and maintenance, it can handle thousands of concurrent connections with high-frequency telemetry data while maintaining zero-downtime availability.

For additional support or advanced configuration requirements, refer to the component-specific documentation or contact the SentientEdge technical team.