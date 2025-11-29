### Terraform state bootstrap

This directory provisions the shared S3 bucket and DynamoDB table used for Terraform remote state. Run it once per account/region:

```bash
cd infra/state-bootstrap
terraform init
terraform apply -var="state_bucket_name=expense-app-tfstate" -var="lock_table_name=expense-app-locks"
```

After the bucket/table exist, update `infra/versions.tf` with the same names so the main stack stores its state remotely.
