resource "google_artifact_registry_repository" "flags_api" {
  project       = var.project_id
  location      = var.region
  repository_id = "flags-api-${var.env}"
  format        = "DOCKER"
  description   = "flags-api container images (${var.env})"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.keep_count
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }
}

resource "google_artifact_registry_repository_iam_member" "deploy_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.flags_api.location
  repository = google_artifact_registry_repository.flags_api.name
  role       = "roles/artifactregistry.writer"
  member     = var.deploy_sa_member
}
