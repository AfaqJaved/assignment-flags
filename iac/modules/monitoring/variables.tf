variable "project_id" {
  type = string
}

variable "env" {
  type = string
}

variable "alert_email" {
  description = "Email address that receives all alert notifications for this environment."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name (cloud-run module's service_name output), used to scope metric filters and the uptime check."
  type        = string
}

variable "service_host" {
  description = "Hostname (no scheme) of the Cloud Run service, for the uptime check target."
  type        = string
}

variable "health_check_path" {
  type    = string
  default = "/api/v1/health"
}

variable "error_rate_threshold" {
  description = "Fraction (0-1) of 5xx responses over the alignment window that triggers the error-rate alert."
  type        = number
  default     = 0.05
}

variable "latency_p99_threshold_ms" {
  description = "p99 request latency (ms) over 5 minutes that triggers the latency alert."
  type        = number
  default     = 1000
}
