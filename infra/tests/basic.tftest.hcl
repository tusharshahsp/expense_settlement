run "plan_root_module" {
  command = plan

  variables {
    domain_name = "dev.expense.local"
    hosted_zone_id = "Z000000000000"
    container_images = {
      frontend = "public.ecr.aws/nginx/nginx:latest"
      backend  = "public.ecr.aws/docker/library/python:3.11"
    }
    media_bucket_name = "expense-app-test-media"
    db_username = "test_user"
    db_name     = "expense_settlement"
  }
}
