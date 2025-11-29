# Production Deployment Guide (AWS)

This document describes how to deploy the application into AWS using Terraform, ECS Fargate, ALB, and RDS. For local/dev instructions see `docs/DEV.md`.

## Prerequisites

- AWS account with permissions to create VPC, ECS, ALB, RDS, ACM, IAM, S3, Secrets Manager, CloudWatch.
- Terraform >= 1.6 installed locally or on a CI runner.
- S3 bucket + DynamoDB table for Terraform state (see `infra/state-bootstrap`).
- Docker images for the frontend/backend pushed to ECR (or another registry).

## Infrastructure overview

- **Network**: VPC with public subnets for ALB, private subnets for ECS/RDS, NAT gateway for outbound traffic.
- **Compute**: ECS cluster on Fargate running two services:
  - Frontend SPA served via container + ALB static path.
  - FastAPI backend behind `/api/*`.
- **Persistence**:
  - RDS MySQL (Multi-AZ, encrypted with dedicated CMK).
  - S3 media bucket for avatars with lifecycle rules and CloudFront-ready URLs.
- **Secrets**: AWS Secrets Manager stores DB credentials and optional S3 access keys; ECS injects them as env vars.
- **Observability**: CloudWatch log groups, Container Insights, and optional CloudWatch Agent sidecars for metrics.

## Terraform deployment steps

1. **Bootstrap remote state (one time)**:

   ```bash
   cd infra/state-bootstrap
   terraform init
   terraform apply \
     -var="state_bucket_name=expense-app-tfstate" \
     -var="lock_table_name=expense-app-locks" \
     -var="aws_region=eu-north-1"
   ```

2. **Configure Terraform backend**: Ensure `infra/versions.tf` points to the bucket/region/table created above.

3. **Prepare variables** (example: `prod.tfvars`):

   ```hcl
   aws_region        = "eu-north-1"
   domain_name       = "app.example.com"
   hosted_zone_id    = "ZABCDEFGHIJKLMN"
   container_images  = {
     frontend = "123456789012.dkr.ecr.eu-north-1.amazonaws.com/frontend:main"
     backend  = "123456789012.dkr.ecr.eu-north-1.amazonaws.com/backend:main"
   }
   media_bucket_name = "expense-app-media-prod"
   db_username       = "expense_app_prod"
   db_name           = "expense_settlement"
   availability_zones = ["eu-north-1a", "eu-north-1b"]
   ```

4. **Deploy**:

   ```bash
   cd infra
   terraform init
   terraform plan  -var-file=prod.tfvars
   terraform apply -var-file=prod.tfvars
   ```

   Terraform provisions ACM certs (with DNS validation), Route53 alias, ECS services, RDS, Secrets, S3, CloudWatch resources, etc.

## Application configuration in prod

- Backend containers read DB and S3 settings from Secrets Manager; the task execution role has `GetSecretValue`.
- `AWS_REGION`, `MEDIA_S3_BUCKET`, and other env vars are injected via Terraform (see `infra/main.tf`).
- `MEDIA_S3_BASE_URL` can be set to a CloudFront distribution if you add one.
- Frontend uses `VITE_API_BASE_URL` compiled to the ALB domain; adjust your Docker build or runtime env.

## Write permissions & data paths

- ECS tasks do not write to container filesystems except temporary directories; all persistent content goes to RDS or S3.
- The backend build still supports filesystem storage, but disable it in prod by setting `APP_ENV=prod` (default).

## Observability & rollback

- Container logs land in `/ecs/<service>` CloudWatch log groups.
- Container Insights + CloudWatch Agent sidecars emit CPU/memory/StatsD metrics - wire alarms to SNS/PagerDuty.
- To rollback, redeploy previous images or use `terraform apply` with older variables (for infra).

## Post-deployment checklist

- Confirm Route53 record resolves to the ALB and HTTPS works.
- Run smoke tests (signup/login/profile) against the live domain.
- Verify ALB target health, RDS connectivity, and CloudWatch metrics.
- Set up CI/CD to push Docker images and run `terraform plan/apply` via pull requests and approvals.
