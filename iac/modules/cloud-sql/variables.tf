variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  description = "Environment name (staging|production), used to namespace resources."
  type        = string
}

variable "vpc_id" {
  description = "Self link of the VPC to attach the instance's private IP to (network module's vpc_id output)."
  type        = string
}

variable "private_vpc_connection" {
  description = "The network module's private_vpc_connection output. Forces Terraform to wait for VPC peering before creating the instance, which requires it."
  type        = any
}

variable "database_version" {
  description = "Cloud SQL Postgres major version. Kept a version behind the docker-compose image (postgres:18) since Cloud SQL's supported-version rollout for a new major lags the upstream release."
  type        = string
  default     = "POSTGRES_17"
}

variable "tier" {
  description = "Machine tier, e.g. db-f1-micro (staging) or db-custom-2-7680 (production)."
  type        = string
  default     = "db-f1-micro"
}

variable "database_name" {
  type    = string
  default = "flags"
}

variable "database_user" {
  type    = string
  default = "flags_api"
}

variable "availability_type" {
  description = "ZONAL or REGIONAL. REGIONAL adds a synchronous standby for HA, at roughly 2x cost."
  type        = string
  default     = "ZONAL"
}

variable "disk_size_gb" {
  type    = number
  default = 20
}

variable "deletion_protection" {
  description = "Blocks `terraform destroy`/instance deletion at the GCP API level. Should be true for production."
  type        = bool
  default     = true
}

variable "backup_enabled" {
  type    = bool
  default = true
}

variable "point_in_time_recovery" {
  description = "Requires backup_enabled = true. Only meaningful (and billed) beyond the base backup, so off by default for staging."
  type        = bool
  default     = false
}

variable "secret_accessor_member" {
  description = "IAM member (e.g. 'serviceAccount:...') granted secretAccessor on the generated database-url secret. Typically the Cloud Run runtime service account."
  type        = string
}
