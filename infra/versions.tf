terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "expense-app-tfstate"
    key            = "infra/terraform.tfstate"
    region         = "eu-north-1"
    dynamodb_table = "expense-app-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
