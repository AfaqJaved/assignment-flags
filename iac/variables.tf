variable "project_id" {
  description = "GCP project ID to deploy into. No default on purpose — must be supplied explicitly (-var or a gitignored terraform.tfvars) so a real project can never be hit by accident."
  type        = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "alert_email" {
  description = "Destination for Cloud Monitoring alert notifications."
  type        = string
}

variable "github_repository" {
  description = "GitHub repo allowed to deploy here, as 'owner/repo'."
  type        = string
}

variable "github_environment" {
  description = "GitHub Actions environment name whose deploy jobs may assume this workspace's deploy service account. Defaults to the Terraform workspace name (staging|production). Pair with required reviewers on the GitHub 'production' environment for a manual approval gate."
  type        = string
  default     = null
}

variable "cors_origins" {
  type    = string
  default = ""
}

variable "enable_api_docs" {
  description = "Swagger/OpenAPI docs endpoint. Disable in production to avoid exposing the full API surface publicly."
  type        = bool
  default     = true
}

variable "cloud_sql_tier" {
  type    = string
  default = "db-f1-micro"
}

variable "cloud_sql_availability_type" {
  description = "ZONAL or REGIONAL. REGIONAL adds a synchronous standby with automatic failover, at roughly 2x cost."
  type        = string
  default     = "ZONAL"
}

variable "cloud_sql_deletion_protection" {
  type    = bool
  default = false
}

variable "cloud_sql_point_in_time_recovery" {
  type    = bool
  default = false
}

variable "redis_tier" {
  description = "BASIC (single node, no SLA) or STANDARD_HA (replica + automatic failover)."
  type        = string
  default     = "BASIC"
}

variable "redis_memory_size_gb" {
  type    = number
  default = 1
}

variable "cloud_run_cpu" {
  type    = string
  default = "1"
}

variable "cloud_run_memory" {
  type    = string
  default = "512Mi"
}

variable "min_instance_count" {
  description = "Keep >= 1 in production to avoid cold starts on the request path; 0 is fine (and cheaper) in staging."
  type        = number
  default     = 0
}

variable "max_instance_count" {
  type    = number
  default = 3
}

variable "latency_p99_threshold_ms" {
  type    = number
  default = 1500
}
