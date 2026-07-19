# Every API this project's modules need, enabled once up front so
# individual modules (network, cloud-sql, redis, cloud-run, ...) can assume
# their APIs are already on and just declare `depends_on = [module.apis]`
# instead of each managing its own google_project_service resources.
locals {
  baseline_services = [
    "compute.googleapis.com",           # VPC, subnets, firewall rules
    "servicenetworking.googleapis.com", # private service access (Cloud SQL, Redis)
    "vpcaccess.googleapis.com",         # Serverless VPC Access connector
    "sqladmin.googleapis.com",          # Cloud SQL
    "redis.googleapis.com",             # Memorystore
    "run.googleapis.com",               # Cloud Run
    "artifactregistry.googleapis.com",  # Docker image storage
    "secretmanager.googleapis.com",     # DB credentials, API keys
    "iam.googleapis.com",               # service accounts, custom roles
    "iamcredentials.googleapis.com",    # Workload Identity Federation token exchange
    "monitoring.googleapis.com",        # alert policies, dashboards, uptime checks
    "logging.googleapis.com",           # structured logs, log-based metrics
    "cloudresourcemanager.googleapis.com",
  ]

  services = toset(concat(local.baseline_services, var.additional_services))
}

resource "google_project_service" "this" {
  for_each = local.services

  project = var.project_id
  service = each.value

  # Other teams/services in the same project may depend on these APIs too —
  # tearing down this module shouldn't disable them project-wide.
  disable_on_destroy = false
}
