# SentientEdge Infrastructure Variables

# Environment Configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-gov-west-1"  # AWS GovCloud for military compliance
}

variable "aws_assume_role_arn" {
  description = "ARN of the role to assume for AWS operations"
  type        = string
  sensitive   = true
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "sentientedge.military"
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
    update_config = object({
      max_unavailable_percentage = number
    })
    labels = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["m5.xlarge", "m5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 3
      }
      update_config = {
        max_unavailable_percentage = 25
      }
      labels = {
        role = "general"
      }
      taints = []
    }
    compute = {
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        max_size     = 20
        min_size     = 2
      }
      update_config = {
        max_unavailable_percentage = 25
      }
      labels = {
        role = "compute"
      }
      taints = [{
        key    = "compute"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
    memory = {
      instance_types = ["r5.xlarge", "r5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 1
        max_size     = 10
        min_size     = 1
      }
      update_config = {
        max_unavailable_percentage = 25
      }
      labels = {
        role = "memory"
      }
      taints = [{
        key    = "memory"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16.1"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r5.xlarge"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "sentient_edge"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "sentient_admin"
  sensitive   = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.xlarge"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 3
}

variable "redis_parameter_group" {
  description = "Redis parameter group"
  type        = string
  default     = "default.redis7"
}

# S3 Configuration
variable "s3_lifecycle_rules" {
  description = "S3 bucket lifecycle rules"
  type = list(object({
    id     = string
    status = string
    expiration = object({
      days = number
    })
    noncurrent_version_expiration = object({
      days = number
    })
  }))
  default = [
    {
      id     = "delete_old_versions"
      status = "Enabled"
      expiration = {
        days = 2555  # 7 years for military compliance
      }
      noncurrent_version_expiration = {
        days = 90
      }
    }
  ]
}

# Alerting Configuration
variable "alert_email_endpoints" {
  description = "Email endpoints for alerts"
  type        = list(string)
  default     = ["ops@sentientedge.military"]
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# Environment-specific scaling
variable "environment_scaling" {
  description = "Environment-specific scaling configuration"
  type = map(object({
    min_capacity = number
    max_capacity = number
    target_cpu   = number
    target_memory = number
  }))
  default = {
    development = {
      min_capacity  = 2
      max_capacity  = 5
      target_cpu    = 80
      target_memory = 80
    }
    staging = {
      min_capacity  = 3
      max_capacity  = 10
      target_cpu    = 70
      target_memory = 75
    }
    production = {
      min_capacity  = 5
      max_capacity  = 50
      target_cpu    = 60
      target_memory = 70
    }
  }
}

# Security Configuration
variable "enable_pod_security_policy" {
  description = "Enable Kubernetes Pod Security Policy"
  type        = bool
  default     = true
}

variable "enable_network_policy" {
  description = "Enable Kubernetes Network Policy"
  type        = bool
  default     = true
}

variable "enable_service_mesh" {
  description = "Enable service mesh (Istio)"
  type        = bool
  default     = false
}

# Compliance and Backup
variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 2555  # 7 years for military compliance
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for databases"
  type        = bool
  default     = true
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = false
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for optional components"
  type = object({
    enable_monitoring    = bool
    enable_logging      = bool
    enable_tracing      = bool
    enable_secrets_manager = bool
    enable_external_dns = bool
    enable_cert_manager = bool
    enable_ingress_nginx = bool
    enable_metrics_server = bool
    enable_cluster_autoscaler = bool
    enable_aws_load_balancer_controller = bool
  })
  default = {
    enable_monitoring    = true
    enable_logging      = true
    enable_tracing      = true
    enable_secrets_manager = true
    enable_external_dns = true
    enable_cert_manager = true
    enable_ingress_nginx = true
    enable_metrics_server = true
    enable_cluster_autoscaler = true
    enable_aws_load_balancer_controller = true
  }
}

# Resource Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "spot_instance_percentage" {
  description = "Percentage of spot instances to use"
  type        = number
  default     = 50
  validation {
    condition     = var.spot_instance_percentage >= 0 && var.spot_instance_percentage <= 100
    error_message = "Spot instance percentage must be between 0 and 100."
  }
}