output "repository_id" {
  value = google_artifact_registry_repository.flags_api.repository_id
}

output "repository_url" {
  description = "Push/pull URL prefix, e.g. LOCATION-docker.pkg.dev/PROJECT/REPO."
  value       = "${google_artifact_registry_repository.flags_api.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.flags_api.repository_id}"
}
