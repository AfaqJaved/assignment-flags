variable "project_id" {
  type = string
}

variable "env" {
  description = "Environment name (staging|production)."
  type        = string
}

variable "github_repository" {
  description = "GitHub repo allowed to federate into this project, as 'owner/repo'."
  type        = string
}

variable "github_environment" {
  description = "GitHub Actions environment name (e.g. 'staging', 'production') whose deploy jobs may impersonate this env's deploy service account. Must match the `environment:` key used in the workflow job so the OIDC token carries a matching claim."
  type        = string
}
