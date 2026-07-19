output "service_url" {
  value = module.cloud_run.service_url
}

output "artifact_registry_repository_url" {
  value = module.artifact_registry.repository_url
}

output "deploy_service_account_email" {
  value = module.iam.deploy_sa_email
}

output "workload_identity_provider" {
  description = "For the GitHub Actions deploy workflow's `workload_identity_provider` input."
  value       = module.iam.workload_identity_provider
}

output "cloud_sql_instance_connection_name" {
  value = module.cloud_sql.connection_name
}
