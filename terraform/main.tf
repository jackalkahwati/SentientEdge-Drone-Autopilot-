# SentientEdge Infrastructure as Code
# Military-grade drone control platform infrastructure

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket  = "sentient-edge-terraform-state"
    key     = "infrastructure/terraform.tfstate"
    region  = "us-gov-west-1"
    encrypt = true
    
    dynamodb_table = "sentient-edge-terraform-locks"
    
    # Military compliance
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          kms_master_key_id = "alias/sentient-edge-terraform"
          sse_algorithm     = "aws:kms"
        }
      }
    }
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  # Military cloud requirements
  assume_role {
    role_arn = var.aws_assume_role_arn
  }

  default_tags {
    tags = {
      Project             = "SentientEdge"
      Environment         = var.environment
      Classification      = "UNCLASSIFIED//FOR OFFICIAL USE ONLY"
      ManagedBy          = "Terraform"
      SecurityLevel      = "MilitaryGrade"
      DataClassification = "Sensitive"
      Owner              = "SentientEdge-Ops"
      CostCenter         = "Defense-Systems"
      Compliance         = "NIST-800-53"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks_cluster.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks_cluster.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks_cluster.cluster_name, "--region", var.aws_region]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks_cluster.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks_cluster.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks_cluster.cluster_name, "--region", var.aws_region]
    }
  }
}

# Local values
locals {
  name_prefix = "sentient-edge-${var.environment}"
  
  common_tags = {
    Project             = "SentientEdge"
    Environment         = var.environment
    Classification      = "UNCLASSIFIED//FOR OFFICIAL USE ONLY"
    ManagedBy          = "Terraform"
    SecurityLevel      = "MilitaryGrade"
    DataClassification = "Sensitive"
    Owner              = "SentientEdge-Ops"
    CostCenter         = "Defense-Systems"
    Compliance         = "NIST-800-53"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
  
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  name_prefix         = local.name_prefix
  environment         = var.environment
  cidr_block          = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  
  # Military-grade network segmentation
  enable_dns_hostnames = true
  enable_dns_support   = true
  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "development" ? true : false
  
  # Security requirements
  enable_flow_logs = true
  flow_logs_retention_days = var.environment == "production" ? 2555 : 90  # 7 years for production
  
  tags = local.common_tags
}

# Security Groups
module "security_groups" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr
  
  tags = local.common_tags
}

# EKS Cluster
module "eks_cluster" {
  source = "./modules/eks-cluster"
  
  name_prefix    = local.name_prefix
  environment    = var.environment
  cluster_version = var.eks_cluster_version
  
  # Networking
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  control_plane_subnet_ids = module.vpc.private_subnet_ids
  
  # Security
  cluster_security_group_id = module.security_groups.eks_cluster_security_group_id
  node_security_group_id    = module.security_groups.eks_node_security_group_id
  
  # Node groups configuration
  node_groups = var.eks_node_groups
  
  # Military compliance
  cluster_encryption_config = [
    {
      provider_key_arn = module.kms.cluster_kms_key_arn
      resources        = ["secrets"]
    }
  ]
  
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cluster_log_retention_days = var.environment == "production" ? 2555 : 90
  
  tags = local.common_tags
}

# KMS for encryption
module "kms" {
  source = "./modules/kms"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  tags = local.common_tags
}

# RDS PostgreSQL for production database
module "rds" {
  source = "./modules/rds"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Database configuration
  engine_version    = var.postgres_version
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  storage_encrypted = true
  kms_key_id       = module.kms.database_kms_key_arn
  
  # Networking
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
  security_group_ids   = [module.security_groups.rds_security_group_id]
  
  # High availability for production
  multi_az = var.environment == "production" ? true : false
  
  # Backup and maintenance
  backup_retention_period = var.environment == "production" ? 35 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  # Security
  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment == "production" ? false : true
  
  # Database credentials
  database_name = var.database_name
  username      = var.database_username
  
  tags = local.common_tags
}

# ElastiCache Redis for caching and sessions
module "elasticache" {
  source = "./modules/elasticache"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Redis configuration
  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_nodes
  parameter_group    = var.redis_parameter_group
  port              = 6379
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  kms_key_id               = module.kms.cache_kms_key_arn
  
  # Networking
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.elasticache_subnet_ids
  security_group_ids = [module.security_groups.elasticache_security_group_id]
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Networking
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
  
  # Security
  security_group_ids = [module.security_groups.alb_security_group_id]
  
  # SSL/TLS
  certificate_arn = module.acm.certificate_arn
  
  # WAF
  enable_waf = true
  
  tags = local.common_tags
}

# ACM Certificate for SSL/TLS
module "acm" {
  source = "./modules/acm"
  
  domain_name = var.domain_name
  
  subject_alternative_names = [
    "*.${var.domain_name}",
    "api.${var.domain_name}",
    "staging.${var.domain_name}",
    "dev.${var.domain_name}"
  ]
  
  tags = local.common_tags
}

# S3 buckets for storage
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # KMS encryption
  kms_key_id = module.kms.s3_kms_key_arn
  
  # Versioning and lifecycle
  enable_versioning = true
  lifecycle_rules   = var.s3_lifecycle_rules
  
  tags = local.common_tags
}

# CloudWatch for monitoring and logging
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # EKS cluster monitoring
  cluster_name = module.eks_cluster.cluster_name
  
  # Database monitoring
  rds_instance_id = module.rds.instance_id
  
  # Cache monitoring
  elasticache_cluster_id = module.elasticache.cluster_id
  
  # Alerting
  sns_topic_arn = module.alerting.sns_topic_arn
  
  tags = local.common_tags
}

# SNS for alerting
module "alerting" {
  source = "./modules/alerting"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  # Alert endpoints
  email_endpoints = var.alert_email_endpoints
  slack_webhook   = var.slack_webhook_url
  
  tags = local.common_tags
}

# IAM roles and policies
module "iam" {
  source = "./modules/iam"
  
  name_prefix    = local.name_prefix
  environment    = var.environment
  cluster_name   = module.eks_cluster.cluster_name
  
  # Service accounts
  create_ebs_csi_driver_role      = true
  create_aws_load_balancer_controller_role = true
  create_external_dns_role        = true
  create_cluster_autoscaler_role  = true
  
  tags = local.common_tags
}

# Route53 for DNS
module "route53" {
  source = "./modules/route53"
  
  domain_name = var.domain_name
  environment = var.environment
  
  # ALB integration
  alb_dns_name = module.alb.dns_name
  alb_zone_id  = module.alb.zone_id
  
  tags = local.common_tags
}