variable "project" {
  type = string
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

output "arn" {
  value = aws_ecs_cluster.this.arn
}

output "name" {
  value = aws_ecs_cluster.this.name
}
