terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Bucket intentionally omitted here — this project has no real GCP
  # project yet, so there's nothing to point at. Once one exists, run
  # `terraform -chdir=iac/bootstrap apply` and then:
  #   terraform init -backend-config="bucket=<output: state_bucket_name>"
  # (or write a gitignored backend.hcl with `bucket = "..."` and pass
  # -backend-config=backend.hcl). See iac/README.md.
  #
  # Staging and production share this backend but not state: each is a
  # separate Terraform workspace, and the GCS backend keys state per
  # workspace under this prefix (state/<prefix>/<workspace>.tfstate).
  backend "gcs" {
    prefix = "flags-api"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
