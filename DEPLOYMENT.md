# SentientEdge Deployment Guide

## Military-Grade Containerization and Orchestration System

This document provides comprehensive instructions for deploying the SentientEdge drone control platform using a complete containerization and orchestration solution designed for military-grade security and reliability.

## 🏗️ Architecture Overview

The deployment architecture consists of:

- **Frontend**: Next.js 15 application with App Router
- **Backend**: Express.js API server with WebSocket support
- **Database**: PostgreSQL 16 with encryption at rest
- **Cache**: Redis 7 for session management and caching
- **Orchestration**: Kubernetes with Helm charts
- **Service Mesh**: Istio for security and traffic management
- **Monitoring**: Prometheus, Grafana, and Jaeger
- **Security**: mTLS, RBAC, Network Policies, Pod Security Standards

## 📋 Prerequisites

### Required Tools

```bash
# Container tools
docker >= 24.0.0
docker-compose >= 2.20.0

# Kubernetes tools
kubectl >= 1.28.0
helm >= 3.12.0
kustomize >= 5.0.0

# Infrastructure tools
terraform >= 1.5.0
istioctl >= 1.19.0

# CI/CD tools
git >= 2.40.0
```

### Required Access

- AWS GovCloud account with appropriate permissions
- Container registry access (registry.sentientedge.military)
- Kubernetes cluster admin access
- SSL certificates for HTTPS/TLS

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/sentient-edge/drone-control-platform.git
cd drone-control-platform

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production

# Configure environment variables
vim .env.production
```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan infrastructure
terraform plan -var-file="environments/production/terraform.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/production/terraform.tfvars"
```

### 4. Deploy Application

```bash
# Deploy to development
./scripts/deploy.sh -e development

# Deploy to staging
./scripts/deploy.sh -e staging

# Deploy to production (requires confirmation)
./scripts/deploy.sh -e production
```

## 🐳 Docker Containerization

### Frontend Container (Next.js)

- **Base Image**: node:20-alpine3.18
- **Build**: Multi-stage build with standalone output
- **Security**: Non-root user, read-only filesystem
- **Size**: ~150MB optimized

```bash
# Build frontend
docker build -f Dockerfile.frontend -t sentient-edge/frontend:latest .

# Run locally
docker run -p 3000:3000 sentient-edge/frontend:latest
```

### Backend Container (Express)

- **Base Image**: node:20-alpine3.18
- **Security**: Military-grade hardening, capability dropping
- **Features**: Health checks, signal handling, logging
- **Size**: ~200MB optimized

```bash
# Build backend
docker build -f Dockerfile.backend -t sentient-edge/backend:latest .

# Run locally
docker run -p 4000:4000 sentient-edge/backend:latest
```

### Development with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☸️ Kubernetes Deployment

### Namespace and RBAC

```bash
# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# View resources
kubectl get all -n sentient-edge
```

### Using Kustomize

```bash
# Deploy base configuration
kubectl apply -k k8s/base/

# Deploy production overlay
kubectl apply -k k8s/overlays/production/
```

### Using Helm Charts

```bash
# Add dependencies
helm dependency update helm/sentient-edge/

# Install/upgrade release
helm upgrade --install sentient-edge-prod ./helm/sentient-edge \
  --namespace sentient-edge-prod \
  --create-namespace \
  --values helm/sentient-edge/values-production.yaml

# Check deployment
helm status sentient-edge-prod -n sentient-edge-prod
```

## 🔒 Security Configuration

### Istio Service Mesh

```bash
# Install Istio
istioctl install --set values.pilot.env.PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION=true

# Apply Istio configuration
kubectl apply -f istio/istio-system.yaml
kubectl apply -f istio/sentient-edge-mesh.yaml

# Verify mesh status
istioctl proxy-status
```

### Security Features

- **mTLS**: Automatic mutual TLS between all services
- **RBAC**: Role-based access control with fine-grained permissions
- **Network Policies**: Zero-trust network segmentation
- **Pod Security**: Security contexts and admission controllers
- **Secrets Management**: Encrypted secrets with rotation
- **Certificate Management**: Automated certificate lifecycle

### Security Validation

```bash
# Check mTLS status
istioctl authn tls-check

# Verify network policies
kubectl get networkpolicies -A

# Check security contexts
kubectl get pods -o jsonpath='{.items[*].spec.securityContext}' | jq
```

## 📊 Monitoring and Observability

### Prometheus Metrics

```bash
# Deploy monitoring stack
kubectl apply -f monitoring/prometheus.yaml

# Access Prometheus UI
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

### Grafana Dashboards

```bash
# Access Grafana
kubectl port-forward svc/grafana 3001:3000 -n monitoring

# Default credentials: admin / (check secret)
kubectl get secret grafana-admin-password -n monitoring -o jsonpath='{.data.password}' | base64 -d
```

### Distributed Tracing

```bash
# Access Jaeger UI
kubectl port-forward svc/jaeger-query 16686:16686 -n istio-system
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Security Scanning**: Trivy, Snyk, OWASP dependency check
2. **Code Quality**: ESLint, TypeScript, Prettier
3. **Testing**: Unit tests, integration tests, coverage
4. **Building**: Multi-platform Docker images with signing
5. **Deployment**: Environment-specific deployments with approvals

### Pipeline Configuration

```yaml
# .github/workflows/ci-cd-pipeline.yml
name: SentientEdge CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### Secrets Configuration

Required GitHub secrets:

```bash
REGISTRY_USERNAME         # Container registry username
REGISTRY_PASSWORD         # Container registry password
KUBECONFIG_DEV           # Development cluster kubeconfig
KUBECONFIG_STAGING       # Staging cluster kubeconfig
KUBECONFIG_PROD          # Production cluster kubeconfig
COSIGN_PRIVATE_KEY       # Container signing key
COSIGN_PASSWORD          # Container signing password
SLACK_WEBHOOK            # Slack notifications
```

## 🏗️ Infrastructure as Code

### Terraform Modules

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan changes
terraform plan -var-file="environments/production/terraform.tfvars"

# Apply infrastructure
terraform apply
```

### Infrastructure Components

- **VPC**: Multi-AZ network with public/private subnets
- **EKS**: Managed Kubernetes cluster with multiple node groups
- **RDS**: PostgreSQL with encryption and automated backups
- **ElastiCache**: Redis cluster with encryption in transit/rest
- **ALB**: Application Load Balancer with WAF integration
- **Route53**: DNS management with health checks
- **CloudWatch**: Comprehensive monitoring and alerting

## 🔧 Operations and Maintenance

### Deployment Script Usage

```bash
# Deploy to development
./scripts/deploy.sh -e development

# Dry run production deployment
./scripts/deploy.sh -e production --dry-run

# Force deployment (skip confirmations)
./scripts/deploy.sh -e production --force

# Deploy with custom timeout
./scripts/deploy.sh -e staging --timeout 900s
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment frontend --replicas=10 -n sentient-edge

# Horizontal Pod Autoscaler
kubectl get hpa -n sentient-edge

# Cluster autoscaling
kubectl get nodes -l node.kubernetes.io/instance-type
```

### Database Operations

```bash
# Database migrations
kubectl exec -it deployment/backend -n sentient-edge -- npm run db:migrate

# Database backup
kubectl exec -it statefulset/postgres -n sentient-edge -- pg_dump sentient_edge > backup.sql

# Database health check
kubectl exec -it statefulset/postgres -n sentient-edge -- pg_isready
```

### Troubleshooting

```bash
# Check pod logs
kubectl logs -f deployment/backend -n sentient-edge

# Debug networking
kubectl exec -it deployment/backend -n sentient-edge -- nslookup postgres-service

# Check resource usage
kubectl top nodes
kubectl top pods -n sentient-edge

# Istio debugging
istioctl analyze -n sentient-edge
istioctl proxy-config cluster deployment/backend -n sentient-edge
```

## 🔧 Configuration Management

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/staging/production) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ENCRYPTION_KEY` | AES encryption key | Yes |

### Secrets Management

```bash
# Create secret
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=your-secret \
  --from-literal=database-password=your-password \
  -n sentient-edge

# Update secret
kubectl patch secret app-secrets -n sentient-edge \
  -p '{"data":{"jwt-secret":"bmV3LXNlY3JldA=="}}'
```

## 📚 Additional Resources

### Documentation

- [Architecture Decision Records](./docs/adr/)
- [API Documentation](./docs/api/)
- [Security Policies](./docs/security/)
- [Runbooks](./docs/runbooks/)

### Support

- **Emergency Contact**: ops@sentientedge.military
- **Incident Response**: [Incident Response Playbook](./docs/incident-response.md)
- **Change Management**: [Change Management Process](./docs/change-management.md)

### Compliance

- **NIST 800-53**: Security controls implementation
- **DISA STIGs**: Security technical implementation guides
- **FedRAMP**: Federal risk and authorization management
- **SOC 2 Type II**: Security, availability, and confidentiality

## ⚠️ Security Notice

This system handles military-grade drone control operations. Unauthorized access, use, or modification is strictly prohibited and may result in severe legal consequences under federal law.

All access is monitored and logged. Report any security incidents immediately to the security team.

---

**Classification**: UNCLASSIFIED//FOR OFFICIAL USE ONLY  
**Last Updated**: $(date)  
**Version**: 1.0.0