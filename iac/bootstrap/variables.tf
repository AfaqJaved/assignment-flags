variable "project_id" {
  description = "GCP project ID that will host the Terraform state bucket."
  type        = string
}

variable "region" {
  description = "Region for the state bucket (single-region keeps state-read latency and cost low; state doesn't need multi-region durability)."
  type        = string
  default     = "us-central1"
}

variable "state_bucket_name" {
  description = "Globally unique name for the GCS state bucket. GCS bucket names are global across all of GCP, not just your project, so the default (derived from project_id) may need overriding if it's taken."
  type        = string
  default     = null
}
