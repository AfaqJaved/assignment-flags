terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Intentionally local state: this config creates the GCS bucket that
  # envs/staging and envs/production use as their remote backend, so it
  # can't depend on that bucket existing yet. Run this once per project,
  # then commit the resulting bucket name into envs/*/backend.tf.
}

provider "google" {
  project = var.project_id
  region  = var.region
}
