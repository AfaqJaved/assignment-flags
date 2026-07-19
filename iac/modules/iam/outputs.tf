output "runtime_sa_email" {
  value = google_service_account.runtime.email
}

output "runtime_sa_member" {
  description = "Convenience 'serviceAccount:...' form for use in IAM member fields elsewhere."
  value       = "serviceAccount:${google_service_account.runtime.email}"
}

output "deploy_sa_email" {
  value = google_service_account.deploy.email
}

output "deploy_sa_member" {
  value = "serviceAccount:${google_service_account.deploy.email}"
}

output "workload_identity_provider" {
  description = "Full provider resource name for the `workload_identity_provider` input of google-github-actions/auth in the deploy workflow."
  value       = google_iam_workload_identity_pool_provider.github.name
}
