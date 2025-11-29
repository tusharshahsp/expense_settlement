# Security Considerations

This project is a demo but the production deployment follows several best practices. Review and extend them before going live.

## Network & Compute

- **Private subnets**: ECS tasks and RDS instances live in private subnets; only the ALB has public exposure.
- **Security groups**: Backend ECS service security group is the only SG allowed to connect to RDS (port 3306). Frontend/Backend SGs only accept ingress from the ALB SG.
- **Least privilege IAM**:
  - ECS task execution role can read only the specific Secrets Manager entries needed.
  - Backend task IAM role gets S3 access limited to the media bucket.
  - CloudWatch agent policy is scoped to log + metric actions.

## Secrets

- **Secrets Manager** stores DB credentials, media bucket credentials (legacy fallback), etc. Environment variables inside the containers are populated via ECS `secrets` injection. No secrets live in source control.
- **Terraform state**: Stored in an S3 bucket with versioning, SSE, and DynamoDB locking. Access requires AWS credentials.

## Data Protection

- **RDS encryption**: Each database is encrypted with a dedicated AWS KMS CMK (`aws_kms_key.rds`). Automated backups inherit the same encryption.
- **S3**: Avatars go to S3; bucket policies should enforce TLS and restrict public write. Optionally front with CloudFront for signed URLs.
- **HTTPS everywhere**: ACM certificate is attached to the ALB (listeners redirect HTTP → HTTPS).

## Application

- **Input validation**: FastAPI + Pydantic handle payload validation; password hashing uses salted SHA-256 (for production, replace with bcrypt/argon2).
- **File uploads**: FastAPI rejects unsupported MIME types. S3 upload uses server-side content-type and random object keys.
- **Rate limiting / auth**: Not implemented out-of-the-box. Add OAuth/JWT + WAF rate limits before going to production.

## Observability / Incident Response

- ECS Container Insights + CloudWatch Agent sidecars ship metrics/logs, so you can wire alarms to SNS, PagerDuty, etc.
- Enable CloudTrail + Config if you need audit trails for infra changes.

## Local development

- `.env` files remain local; never commit secrets.
- Use `USE_FILE_STORAGE=true` to keep dev data in JSON and avoid touching production resources.
