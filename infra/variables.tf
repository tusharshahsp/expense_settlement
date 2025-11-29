variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Short name for tagging and naming resources."
  type        = string
  default     = "expense-app"
}

variable "domain_name" {
  description = "Fully qualified domain used for Route53 and ACM (e.g. app.example.com)."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID that contains the domain."
  type        = string
}

variable "container_images" {
  description = "Map of container images for frontend and backend services."
  type = object({
    frontend = string
    backend  = string
  })
}

variable "media_bucket_name" {
  description = "Name of the S3 bucket storing uploaded avatars/media."
  type        = string
  default     = "expense-app-media"
}

variable "db_username" {
  description = "Master username for the RDS instance."
  type        = string
  default     = "expense_app"
}

variable "db_name" {
  description = "Primary database/schema name."
  type        = string
  default     = "expense_settlement"
}

variable "s3_access_key" {
  description = "Optional static S3 access key ID (prefer IAM roles in production)."
  type        = string
  default     = ""
}

variable "s3_secret_key" {
  description = "Optional static S3 secret access key."
  type        = string
  sensitive   = true
  default     = ""
}

variable "availability_zones" {
  description = "Explicit list of availability zones to use (defaults to region a/b)."
  type        = list(string)
  default     = []
}
