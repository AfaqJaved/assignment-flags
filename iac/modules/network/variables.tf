variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for the VPC connector."
  type        = string
}

variable "env" {
  description = "Environment name (staging|production), used to namespace resources."
  type        = string
}

variable "connector_cidr" {
  description = "/28 IP range dedicated to the Serverless VPC Access connector. Must not overlap the default network's auto-created subnets or private_service_range."
  type        = string
  default     = "10.10.16.0/28"
}

variable "private_service_range" {
  description = "IP range reserved for Google-managed private services (Cloud SQL, Memorystore) via VPC peering into the default network."
  type        = string
  default     = "10.10.32.0/20"
}
