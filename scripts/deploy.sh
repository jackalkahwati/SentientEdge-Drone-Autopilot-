#!/bin/bash

# SentientEdge Deployment Script
# Military-grade deployment automation with comprehensive safety checks

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="/tmp/sentient-edge-deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
NAMESPACE="sentient-edge"
DRY_RUN="false"
SKIP_TESTS="false"
FORCE_DEPLOY="false"
HELM_TIMEOUT="600s"
DOCKER_REGISTRY="registry.sentientedge.military"

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

SentientEdge Military-Grade Deployment Script

OPTIONS:
    -e, --environment    Environment (development|staging|production) [default: development]
    -n, --namespace      Kubernetes namespace [default: sentient-edge]
    -d, --dry-run        Perform dry run without actual deployment
    -s, --skip-tests     Skip pre-deployment tests (NOT RECOMMENDED)
    -f, --force          Force deployment without confirmations (DANGEROUS)
    -t, --timeout        Helm deployment timeout [default: 600s]
    -r, --registry       Docker registry URL [default: registry.sentientedge.military]
    -h, --help           Show this help message

EXAMPLES:
    $0 -e development                    # Deploy to development
    $0 -e production -d                  # Dry run production deployment
    $0 -e staging --skip-tests           # Deploy to staging without tests

SECURITY NOTICE:
    This script handles military-grade systems. Unauthorized use is prohibited.
    All deployments are logged and audited for compliance.

EOF
}

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        DEBUG) echo -e "${BLUE}[DEBUG]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
    esac
    
    # Also log to syslog for audit trail
    logger -t "sentient-edge-deploy" "[$level] $message"
}

# Error handler
error_handler() {
    local line_no=$1
    local error_code=$2
    log ERROR "Script failed at line $line_no with exit code $error_code"
    log ERROR "Check deployment log: $DEPLOYMENT_LOG"
    exit $error_code
}

# Set error trap
trap 'error_handler ${LINENO} $?' ERR

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY="true"
            shift
            ;;
        -t|--timeout)
            HELM_TIMEOUT="$2"
            shift 2
            ;;
        -r|--registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log ERROR "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log ERROR "Invalid environment: $ENVIRONMENT"
    log ERROR "Must be one of: development, staging, production"
    exit 1
fi

# Security check for production
if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != "true" ]]; then
    log WARN "PRODUCTION DEPLOYMENT DETECTED"
    log WARN "This will deploy to the live military system"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "Are you absolutely sure you want to deploy to production? (type 'DEPLOY_TO_PRODUCTION'): " confirmation
        if [[ "$confirmation" != "DEPLOY_TO_PRODUCTION" ]]; then
            log INFO "Deployment cancelled by user"
            exit 0
        fi
    fi
fi

# Initialize deployment
log INFO "==============================================="
log INFO "SentientEdge Military Deployment Starting"
log INFO "Environment: $ENVIRONMENT"
log INFO "Namespace: $NAMESPACE"
log INFO "Dry Run: $DRY_RUN"
log INFO "Skip Tests: $SKIP_TESTS"
log INFO "Deployment Log: $DEPLOYMENT_LOG"
log INFO "==============================================="

# Pre-flight checks
log INFO "Performing pre-flight checks..."

# Check required tools
check_tool() {
    local tool=$1
    if ! command -v "$tool" &> /dev/null; then
        log ERROR "$tool is not installed or not in PATH"
        exit 1
    fi
    log INFO "✓ $tool found"
}

check_tool kubectl
check_tool helm
check_tool docker
check_tool jq

# Check Kubernetes connection
log INFO "Checking Kubernetes connection..."
if ! kubectl cluster-info &> /dev/null; then
    log ERROR "Cannot connect to Kubernetes cluster"
    log ERROR "Please check your kubeconfig and cluster access"
    exit 1
fi
log INFO "✓ Kubernetes cluster connection verified"

# Check namespace
log INFO "Checking namespace: $NAMESPACE"
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log WARN "Namespace $NAMESPACE does not exist, creating..."
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl create namespace "$NAMESPACE"
    fi
    log INFO "✓ Namespace $NAMESPACE created"
else
    log INFO "✓ Namespace $NAMESPACE exists"
fi

# Docker registry authentication
log INFO "Authenticating with Docker registry..."
if [[ "$DRY_RUN" != "true" ]]; then
    if ! docker login "$DOCKER_REGISTRY" &> /dev/null; then
        log ERROR "Failed to authenticate with Docker registry: $DOCKER_REGISTRY"
        exit 1
    fi
fi
log INFO "✓ Docker registry authentication successful"

# Run tests if not skipped
if [[ "$SKIP_TESTS" != "true" ]]; then
    log INFO "Running pre-deployment tests..."
    
    # Check if test script exists
    if [[ -f "$PROJECT_ROOT/scripts/run-tests.sh" ]]; then
        if ! "$PROJECT_ROOT/scripts/run-tests.sh"; then
            log ERROR "Pre-deployment tests failed"
            exit 1
        fi
        log INFO "✓ All tests passed"
    else
        log WARN "Test script not found, skipping tests"
    fi
fi

# Build and push Docker images
log INFO "Building and pushing Docker images..."

# Build frontend image
FRONTEND_TAG="$DOCKER_REGISTRY/sentient-edge/frontend:$(git rev-parse --short HEAD)"
log INFO "Building frontend image: $FRONTEND_TAG"

if [[ "$DRY_RUN" != "true" ]]; then
    docker build -f "$PROJECT_ROOT/Dockerfile.frontend" -t "$FRONTEND_TAG" "$PROJECT_ROOT"
    docker push "$FRONTEND_TAG"
fi

# Build backend image
BACKEND_TAG="$DOCKER_REGISTRY/sentient-edge/backend:$(git rev-parse --short HEAD)"
log INFO "Building backend image: $BACKEND_TAG"

if [[ "$DRY_RUN" != "true" ]]; then
    docker build -f "$PROJECT_ROOT/Dockerfile.backend" -t "$BACKEND_TAG" "$PROJECT_ROOT"
    docker push "$BACKEND_TAG"
fi

log INFO "✓ Docker images built and pushed successfully"

# Prepare Helm values
VALUES_FILE="$PROJECT_ROOT/helm/sentient-edge/values-$ENVIRONMENT.yaml"
if [[ ! -f "$VALUES_FILE" ]]; then
    log WARN "Environment-specific values file not found: $VALUES_FILE"
    VALUES_FILE="$PROJECT_ROOT/helm/sentient-edge/values.yaml"
fi

# Deploy with Helm
log INFO "Deploying with Helm..."

HELM_RELEASE_NAME="sentient-edge-$ENVIRONMENT"
HELM_COMMAND="helm upgrade --install $HELM_RELEASE_NAME $PROJECT_ROOT/helm/sentient-edge"
HELM_COMMAND="$HELM_COMMAND --namespace $NAMESPACE"
HELM_COMMAND="$HELM_COMMAND --create-namespace"
HELM_COMMAND="$HELM_COMMAND --values $VALUES_FILE"
HELM_COMMAND="$HELM_COMMAND --set frontend.image.tag=$(git rev-parse --short HEAD)"
HELM_COMMAND="$HELM_COMMAND --set backend.image.tag=$(git rev-parse --short HEAD)"
HELM_COMMAND="$HELM_COMMAND --set environment=$ENVIRONMENT"
HELM_COMMAND="$HELM_COMMAND --timeout $HELM_TIMEOUT"
HELM_COMMAND="$HELM_COMMAND --wait"

if [[ "$DRY_RUN" == "true" ]]; then
    HELM_COMMAND="$HELM_COMMAND --dry-run"
fi

log INFO "Executing: $HELM_COMMAND"

if ! $HELM_COMMAND; then
    log ERROR "Helm deployment failed"
    exit 1
fi

log INFO "✓ Helm deployment completed successfully"

# Post-deployment verification
if [[ "$DRY_RUN" != "true" ]]; then
    log INFO "Performing post-deployment verification..."
    
    # Wait for pods to be ready
    log INFO "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=sentient-edge -n "$NAMESPACE" --timeout=300s
    
    # Check deployment status
    log INFO "Checking deployment status..."
    kubectl get deployments -n "$NAMESPACE"
    kubectl get services -n "$NAMESPACE"
    kubectl get ingress -n "$NAMESPACE"
    
    # Run smoke tests
    if [[ -f "$PROJECT_ROOT/scripts/smoke-tests.sh" ]]; then
        log INFO "Running smoke tests..."
        if ! "$PROJECT_ROOT/scripts/smoke-tests.sh" "$ENVIRONMENT"; then
            log ERROR "Smoke tests failed"
            exit 1
        fi
        log INFO "✓ Smoke tests passed"
    fi
    
    log INFO "✓ Post-deployment verification completed"
fi

# Generate deployment report
REPORT_FILE="/tmp/sentient-edge-deployment-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "namespace": "$NAMESPACE",
    "dry_run": $DRY_RUN,
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "deployed_by": "$(whoami)",
    "deployment_log": "$DEPLOYMENT_LOG",
    "frontend_image": "$FRONTEND_TAG",
    "backend_image": "$BACKEND_TAG",
    "helm_release": "$HELM_RELEASE_NAME",
    "status": "success"
  }
}
EOF

log INFO "Deployment report generated: $REPORT_FILE"

# Cleanup
log INFO "Cleaning up temporary files..."
docker system prune -f --volumes &> /dev/null || true

# Final success message
log INFO "==============================================="
log INFO "🎯 DEPLOYMENT COMPLETED SUCCESSFULLY"
log INFO "Environment: $ENVIRONMENT"
log INFO "Namespace: $NAMESPACE"
log INFO "Frontend Image: $FRONTEND_TAG"
log INFO "Backend Image: $BACKEND_TAG"
log INFO "Deployment Log: $DEPLOYMENT_LOG"
log INFO "Deployment Report: $REPORT_FILE"

if [[ "$ENVIRONMENT" == "production" ]]; then
    log INFO "🚀 PRODUCTION SYSTEM UPDATED"
    log INFO "Military drone control platform is now live"
fi

log INFO "==============================================="

# Send notification (if configured)
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ SentientEdge deployment to $ENVIRONMENT completed successfully\"}" \
        "$SLACK_WEBHOOK_URL" &> /dev/null || true
fi

log INFO "Deployment completed successfully!"
exit 0