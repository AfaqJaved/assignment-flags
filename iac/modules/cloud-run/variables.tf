variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  type = string
}

variable "vpc_connector_id" {
  description = "Serverless VPC Access connector ID (network module output), for private egress to Cloud SQL/Redis."
  type        = string
}

variable "runtime_sa_email" {
  type = string
}

variable "deploy_sa_member" {
  description = "IAM member granted run.developer on this specific service (not project-wide), so GitHub Actions can deploy revisions and shift traffic."
  type        = string
}

variable "image" {
  description = "Initial container image. Deliberately a public placeholder — the real flags-api image doesn't exist in Artifact Registry until CI's first push, and this resource has to be creatable before that. lifecycle.ignore_changes means Terraform never overwrites whatever image CI deploys afterward."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "database_url_secret_id" {
  type = string
}

variable "redis_auth_secret_id" {
  type = string
}

variable "redis_host" {
  type = string
}

variable "redis_port" {
  type = string
}

variable "cors_origins" {
  type    = string
  default = ""
}

variable "enable_api_docs" {
  type    = bool
  default = false
}

variable "backend_public_url" {
  description = "Public URL of this service. Leave empty on first apply (the URL doesn't exist yet); re-apply with the module's own service_url output, or the custom domain, once known."
  type        = string
  default     = ""
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instance_count" {
  type    = number
  default = 0
}

variable "max_instance_count" {
  type    = number
  default = 5
}

variable "allow_unauthenticated" {
  description = "Grant roles/run.invoker to allUsers. Tenants authenticate at the application layer (API keys), not via GCP IAM, so this is expected to be true for a publicly reachable flag-evaluation API."
  type        = bool
  default     = true
}

variable "health_check_path" {
  type    = string
  default = "/api/v1/health"
}
