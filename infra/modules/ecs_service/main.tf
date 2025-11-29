variable "project" {
  type = string
}

variable "cluster_arn" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "service_security_group_id" {
  description = "Optional pre-created security group for the service."
  type        = string
  default     = null
}

variable "container_image" {
  type = string
}

variable "container_port" {
  type = number
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "assign_public_ip" {
  type    = bool
  default = false
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "target_group_arn" {
  type = string
}

variable "secret_env_vars" {
  description = "Map of environment variable names to secret descriptors (arn + optional json key)."
  type = map(object({
    arn      = string
    json_key = optional(string, null)
  }))
  default = {}
}

variable "enable_cloudwatch_agent" {
  description = "Deploy CloudWatch Agent sidecar for additional metrics."
  type        = bool
  default     = false
}

variable "cloudwatch_agent_config" {
  description = "JSON configuration for the CloudWatch agent (StatsD/EMF)."
  type        = string
  default     = ""
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.project}"
  retention_in_days = 30
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.project}-exec-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

locals {
  secret_statements = [
    for cfg in values(var.secret_env_vars) : {
      actions   = ["secretsmanager:GetSecretValue"]
      resources = [cfg.arn]
    }
  ]
}

data "aws_iam_policy_document" "secrets" {
  count = length(var.secret_env_vars) > 0 ? 1 : 0

  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      for cfg in values(var.secret_env_vars) : cfg.arn
    ]
  }
}

resource "aws_iam_role_policy" "secrets" {
  count  = length(var.secret_env_vars) > 0 ? 1 : 0
  name   = "${var.project}-secrets"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.secrets[0].json
}

data "aws_iam_policy_document" "cw_agent" {
  count = var.enable_cloudwatch_agent ? 1 : 0

  statement {
    actions = [
      "cloudwatch:PutMetricData",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:CreateLogGroup"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cw_agent" {
  count  = var.enable_cloudwatch_agent ? 1 : 0
  name   = "${var.project}-cwagent"
  role   = aws_iam_role.task_execution.id
  policy = data.aws_iam_policy_document.cw_agent[0].json
}

resource "aws_security_group" "service" {
  count       = var.service_security_group_id == null ? 1 : 0
  name        = "${var.project}-svc-sg"
  description = "Allow access to service"
  vpc_id      = data.aws_subnet.selected.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = var.security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

locals {
  created_service_sg_id     = try(aws_security_group.service[0].id, null)
  service_security_group_id = coalesce(var.service_security_group_id, local.created_service_sg_id)
  agent_config_json = var.cloudwatch_agent_config != "" ? var.cloudwatch_agent_config : jsonencode({
    metrics = {
      metrics_collected = {
        statsd = {
          aggregation_dimensions       = [["InstanceId"]]
          metrics_aggregation_interval = 60
        }
      }
      append_dimensions = {
        ECSClusterName = "{aws:ClusterName}"
        ServiceName    = "{aws:ServiceName}"
      }
    }
  })
  application_container = {
      name      = var.project
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
        }
      ]
      environment = [
        for key, value in var.env_vars :
        {
          name  = key
          value = value
        }
      ]
      secrets = [
        for name, cfg in var.secret_env_vars :
        {
          name      = name
          valueFrom = cfg.json_key == null ? cfg.arn : "${cfg.arn}:${cfg.json_key}::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  cloudwatch_agent_container = {
      name      = "cloudwatch-agent"
      image     = "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest"
      essential = false
      environment = [
        {
          name  = "CW_CONFIG_CONTENT"
          value = local.agent_config_json
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "cwagent"
        }
      }
    }
  container_definitions = concat(
    [local.application_container],
    var.enable_cloudwatch_agent ? [local.cloudwatch_agent_container] : []
  )
}

data "aws_subnet" "selected" {
  id = var.subnet_ids[0]
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.project
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode(local.container_definitions)
}

data "aws_region" "current" {}

resource "aws_ecs_service" "this" {
  name            = var.project
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [local.service_security_group_id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.project
    container_port   = var.container_port
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

output "service_name" {
  value = aws_ecs_service.this.name
}

output "security_group_id" {
  value = local.service_security_group_id
}
