# --- Runtime identity: what the Cloud Run service itself runs as ------------

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "flags-${var.env}-run-sa"
  display_name = "flags-api ${var.env} runtime (Cloud Run)"
}

# Per-secret secretAccessor bindings live next to each secret (cloud-sql,
# redis modules) rather than here, so this SA only ever gets the exact
# secrets it needs — never a project-wide secretmanager.secretAccessor role.

resource "google_project_iam_member" "runtime_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# --- Deploy identity: what GitHub Actions runs as, via Workload Identity ----
# Federation. No downloaded JSON key ever exists — GitHub's OIDC token is
# exchanged for short-lived GCP credentials at workflow run time.

resource "google_service_account" "deploy" {
  project      = var.project_id
  account_id   = "flags-${var.env}-deploy-sa"
  display_name = "flags-api ${var.env} deploy (GitHub Actions)"
}

# One deploy SA may push new revisions/traffic for this env's Cloud Run
# service as itself; it also needs to hand the *runtime* SA to Cloud Run on
# `gcloud run deploy --service-account=...`, which requires actAs on that
# specific SA — not a project-wide iam.serviceAccountUser grant.
resource "google_service_account_iam_member" "deploy_can_act_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "flags-${var.env}-github-pool"
  display_name              = "GitHub Actions (${var.env})"
  description               = "Federates GitHub Actions OIDC tokens for ${var.github_repository}, scoped to the ${var.env} deploy environment."
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.environment" = "assertion.environment"
  }

  # Belt-and-suspenders: the provider itself only accepts tokens from this
  # repo and this GitHub Actions environment, in addition to the
  # environment-scoped principalSet binding below.
  attribute_condition = "assertion.repository == \"${var.github_repository}\" && assertion.environment == \"${var.github_environment}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "deploy_workload_identity_binding" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.environment/${var.github_environment}"
}
