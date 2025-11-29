resource "aws_secretsmanager_secret" "db" {
  name        = "${var.project}/database"
  description = "Database credentials for ${var.project}"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_master.result
    dbname   = var.db_name
    host     = module.database.endpoint
    port     = module.database.port
  })
}

resource "aws_secretsmanager_secret" "s3" {
  name        = "${var.project}/s3"
  description = "Optional S3 access keys for ${var.project}"
}

resource "aws_secretsmanager_secret_version" "s3" {
  secret_id = aws_secretsmanager_secret.s3.id
  secret_string = jsonencode({
    access_key_id     = var.s3_access_key
    secret_access_key = var.s3_secret_key
  })
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "s3_secret_arn" {
  value = aws_secretsmanager_secret.s3.arn
}
