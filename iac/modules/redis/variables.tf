variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  type = string
}

variable "vpc_id" {
  description = "Self link of the VPC (network module's vpc_id output)."
  type        = string
}

variable "private_vpc_connection" {
  description = "The network module's private_vpc_connection output, used to sequence creation after VPC peering exists."
  type        = any
}

variable "tier" {
  description = "BASIC (single node, no SLA) or STANDARD_HA (replica + automatic failover)."
  type        = string
  default     = "BASIC"
}

variable "memory_size_gb" {
  type    = number
  default = 1
}

variable "redis_version" {
  type    = string
  default = "REDIS_7_2"
}

variable "secret_accessor_member" {
  description = "IAM member granted secretAccessor on the generated redis-auth secret. Typically the Cloud Run runtime service account."
  type        = string
}
