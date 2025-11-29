locals {
  availability_zones = length(var.availability_zones) > 0 ? var.availability_zones : [
    "${var.aws_region}a",
    "${var.aws_region}b",
  ]
}

resource "random_password" "db_master" {
  length  = 24
  special = true
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for ${var.project} database encryption"
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

module "network" {
  source               = "./modules/network"
  project              = var.project
  vpc_cidr             = "10.20.0.0/16"
  public_subnet_cidrs  = ["10.20.0.0/20", "10.20.16.0/20"]
  private_subnet_cidrs = ["10.20.32.0/20", "10.20.48.0/20"]
  availability_zones   = local.availability_zones
}

module "ecs_cluster" {
  source  = "./modules/ecs_cluster"
  project = var.project
}

module "alb" {
  source          = "./modules/alb"
  project         = var.project
  vpc_id          = module.network.vpc_id
  public_subnets  = module.network.public_subnet_ids
  certificate_arn = module.certificate.arn
  domain_name     = var.domain_name
  hosted_zone_id  = var.hosted_zone_id
}

resource "aws_security_group" "frontend_service" {
  name        = "${var.project}-frontend-sg"
  description = "Frontend service access"
  vpc_id      = module.network.vpc_id

  ingress {
    from_port       = 4173
    to_port         = 4173
    protocol        = "tcp"
    security_groups = [module.alb.security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backend_service" {
  name        = "${var.project}-backend-sg"
  description = "Backend service access"
  vpc_id      = module.network.vpc_id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [module.alb.security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

module "frontend_service" {
  source              = "./modules/ecs_service"
  project             = "${var.project}-frontend"
  cluster_arn         = module.ecs_cluster.arn
  subnet_ids          = module.network.private_subnet_ids
  security_group_ids  = []
  container_image     = var.container_images.frontend
  container_port      = 4173
  desired_count       = 2
  service_security_group_id = aws_security_group.frontend_service.id
  enable_cloudwatch_agent   = true
  env_vars = {
    VITE_API_BASE_URL = "https://${var.domain_name}/api"
  }
  target_group_arn    = module.alb.frontend_target_group_arn
  assign_public_ip    = false
}

module "backend_service" {
  source              = "./modules/ecs_service"
  project             = "${var.project}-backend"
  cluster_arn         = module.ecs_cluster.arn
  subnet_ids          = module.network.private_subnet_ids
  security_group_ids  = []
  container_image     = var.container_images.backend
  container_port      = 8000
  desired_count       = 2
  service_security_group_id = aws_security_group.backend_service.id
  enable_cloudwatch_agent   = true
  env_vars = {
    APP_ENV        = "prod"
    MEDIA_S3_BUCKET = var.media_bucket_name
    AWS_REGION     = var.aws_region
  }
  secret_env_vars = {
    DB_HOST = {
      arn      = aws_secretsmanager_secret.db.arn
      json_key = "host"
    }
    DB_PORT = {
      arn      = aws_secretsmanager_secret.db.arn
      json_key = "port"
    }
    DB_NAME = {
      arn      = aws_secretsmanager_secret.db.arn
      json_key = "dbname"
    }
    DB_USER = {
      arn      = aws_secretsmanager_secret.db.arn
      json_key = "username"
    }
    DB_PASSWORD = {
      arn      = aws_secretsmanager_secret.db.arn
      json_key = "password"
    }
    S3_ACCESS_KEYS = {
      arn      = aws_secretsmanager_secret.s3.arn
      json_key = "access_key_id"
    }
    S3_SECRET_KEYS = {
      arn      = aws_secretsmanager_secret.s3.arn
      json_key = "secret_access_key"
    }
  }
  target_group_arn    = module.alb.backend_target_group_arn
  assign_public_ip    = false
}

module "database" {
  source                     = "./modules/rds"
  project                    = var.project
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.private_subnet_ids
  db_username                = var.db_username
  db_password                = random_password.db_master.result
  db_name                    = var.db_name
  allowed_security_group_ids = [aws_security_group.backend_service.id]
  kms_key_id                 = aws_kms_key.rds.arn
}

module "certificate" {
  source         = "./modules/acm"
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
}

resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
  lifecycle_rule {
    id      = "glacier-archive"
    enabled = true

    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
  tags = {
    Project = var.project
  }
}

output "alb_dns_name" {
  value = module.alb.dns_name
}
