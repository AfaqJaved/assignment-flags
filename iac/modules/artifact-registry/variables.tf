variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "env" {
  type = string
}

variable "deploy_sa_member" {
  description = "IAM member (e.g. 'serviceAccount:...') granted artifactregistry.writer on this repo. The GitHub Actions deploy service account."
  type        = string
}

variable "keep_count" {
  description = "How many most-recent image versions to retain per tag stream before the cleanup policy deletes older ones."
  type        = number
  default     = 10
}
