# Single root module for both environments. Environment identity comes from
# the Terraform workspace (`terraform workspace select staging|production`),
# not a separate directory — every resource name and the deploy identity's
# WIF binding derive from `local.env`, so state, resource names, and the
# environment-scoped values in environments/<env>.tfvars can never drift out
# of sync with each other.
locals {
  env = terraform.workspace
}

module "apis" {
  source = "./modules/project-services"

  project_id = var.project_id
}

module "network" {
  source = "./modules/network"

  project_id = var.project_id
  region     = var.region
  env        = local.env

  depends_on = [module.apis]
}

module "iam" {
  source = "./modules/iam"

  project_id         = var.project_id
  env                = local.env
  github_repository  = var.github_repository
  github_environment = coalesce(var.github_environment, local.env)

  depends_on = [module.apis]
}

module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id       = var.project_id
  region           = var.region
  env              = local.env
  deploy_sa_member = module.iam.deploy_sa_member

  depends_on = [module.apis]
}

module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id             = var.project_id
  region                 = var.region
  env                    = local.env
  vpc_id                 = module.network.vpc_id
  private_vpc_connection = module.network.private_vpc_connection
  tier                   = var.cloud_sql_tier
  availability_type      = var.cloud_sql_availability_type
  deletion_protection    = var.cloud_sql_deletion_protection
  point_in_time_recovery = var.cloud_sql_point_in_time_recovery
  secret_accessor_member = module.iam.runtime_sa_member
}

module "redis" {
  source = "./modules/redis"

  project_id             = var.project_id
  region                 = var.region
  env                    = local.env
  vpc_id                 = module.network.vpc_id
  private_vpc_connection = module.network.private_vpc_connection
  tier                   = var.redis_tier
  memory_size_gb         = var.redis_memory_size_gb
  secret_accessor_member = module.iam.runtime_sa_member
}

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id             = var.project_id
  region                 = var.region
  env                    = local.env
  vpc_connector_id       = module.network.vpc_connector_id
  runtime_sa_email       = module.iam.runtime_sa_email
  deploy_sa_member       = module.iam.deploy_sa_member
  database_url_secret_id = module.cloud_sql.database_url_secret_id
  redis_auth_secret_id   = module.redis.redis_auth_secret_id
  redis_host             = module.redis.host
  redis_port             = tostring(module.redis.port)
  cors_origins           = var.cors_origins
  enable_api_docs        = var.enable_api_docs
  min_instance_count     = var.min_instance_count
  max_instance_count     = var.max_instance_count
  cpu                    = var.cloud_run_cpu
  memory                 = var.cloud_run_memory
}

module "monitoring" {
  source = "./modules/monitoring"

  project_id               = var.project_id
  env                      = local.env
  alert_email              = var.alert_email
  service_name             = module.cloud_run.service_name
  service_host             = replace(module.cloud_run.service_url, "https://", "")
  latency_p99_threshold_ms = var.latency_p99_threshold_ms
}
