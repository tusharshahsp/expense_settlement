# Infrastructure (Terraform + AWS)

The `infra/` directory provisions the production stack:

- VPC with public/private subnets, NAT, and security groups
- ECS Fargate cluster running the frontend & backend services
- ALB + Route53 + ACM certificate with path-based routing
- RDS MySQL (multi-AZ, randomly generated master password, KMS-encrypted storage)
- S3 bucket for media uploads
- Secrets Manager entries for DB and S3 credentials
- CloudWatch log groups, Container Insights, and optional CloudWatch Agent sidecars for richer metrics

## Remote state

Bootstrap the remote backend once per AWS account/region:

```bash
cd infra/state-bootstrap
terraform init
terraform apply -var="state_bucket_name=expense-app-tfstate" -var="lock_table_name=expense-app-locks"
```

Update `infra/versions.tf` with the actual bucket/region/table that were created.

## Prerequisites

- Terraform >= 1.6
- AWS credentials with enough permissions to create the listed resources (export `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optionally `AWS_SESSION_TOKEN`)

## Deploying

```bash
cd infra
terraform init          # uses the remote S3 backend
terraform plan \
  -var="domain_name=app.example.com" \
  -var="hosted_zone_id=ZABCDEFGHIJKL" \
  -var='container_images={frontend="111111111111.dkr.ecr.us-east-1.amazonaws.com/frontend:main",backend="111111111111.dkr.ecr.us-east-1.amazonaws.com/backend:main"}'
terraform apply \
  -var="domain_name=..." \
  -var="hosted_zone_id=..." \
  -var='container_images={...}'
```

Additional knobs (see `variables.tf`):

- `media_bucket_name`, `db_username`, `db_name`
- `availability_zones` if you need explicit AZs instead of the automatic `<region>a`/`<region>b`
- `s3_access_key`/`s3_secret_key` if you must bootstrap legacy integrations (otherwise leave blank and rely on IAM roles)

## Tests / validation

- **Format/lint**: `terraform fmt -recursive` and `terraform validate -no-color`
- **Unit-style checks**: `TF_CLI_ARGS_init=-backend=false terraform test`
  - The test harness plans the root module with safe fixture variables and uses a _local_ backend so it won’t touch S3 state.
  - AWS credentials are still required because the AWS provider validates access during planning.

## Observability

- ECS cluster enables Container Insights.
- Each ECS service ships logs to its own `/ecs/<service>` CloudWatch log group.
- Set `enable_cloudwatch_agent = true` (default) to inject the CloudWatch Agent sidecar that can emit StatsD/custom metrics.
- RDS, ALB, and S3 are all in CloudWatch out of the box—add dashboards/alarms as needed.
