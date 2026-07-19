resource "google_project_service" "storage" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_storage_bucket" "tf_state" {
  project  = var.project_id
  name     = coalesce(var.state_bucket_name, "${var.project_id}-tf-state")
  location = var.region

  # Remote state is the source of truth for every other Terraform run in
  # this project — accidental deletion would strand staging and production
  # infra with no known-good state to reconcile against.
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Old state versions are only needed for disaster recovery, not forever.
  lifecycle_rule {
    condition {
      num_newer_versions = 20
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.storage]
}
