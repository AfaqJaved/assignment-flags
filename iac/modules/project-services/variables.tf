variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "additional_services" {
  description = "Extra API service names to enable on top of the fixed baseline this module always turns on."
  type        = list(string)
  default     = []
}
