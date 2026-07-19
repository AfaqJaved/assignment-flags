resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = "flags-${var.env}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = var.runtime_sa_email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    vpc_access {
      connector = var.vpc_connector_id
      # Only route RFC1918-bound traffic (Cloud SQL, Redis) through the
      # connector; outbound internet calls go direct, which is cheaper and
      # avoids needlessly funneling all egress through the connector's
      # narrower throughput ceiling.
      egress = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.image

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        # Scale-to-zero (min_instance_count = 0 in staging) only works if
        # CPU is allowed to throttle between requests.
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "CORS_ORIGINS"
        value = var.cors_origins
      }

      env {
        name  = "ENABLE_API_DOCS"
        value = tostring(var.enable_api_docs)
      }

      env {
        name  = "BACKEND_PUBLIC_URL"
        value = var.backend_public_url
      }

      env {
        name  = "REDIS_HOST"
        value = var.redis_host
      }

      env {
        name  = "REDIS_PORT"
        value = var.redis_port
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.database_url_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REDIS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.redis_auth_secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = var.health_check_path
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 6
        timeout_seconds       = 3
      }

      liveness_probe {
        http_get {
          path = var.health_check_path
        }
        period_seconds    = 15
        failure_threshold = 3
        timeout_seconds   = 3
      }
    }
  }

  lifecycle {
    ignore_changes = [
      # CI/CD owns image tags (`gcloud run deploy --image=...`) after the
      # first apply — Terraform would otherwise fight it back to var.image
      # on every plan.
      template[0].containers[0].image,
      # CI/CD owns canary/blue-green traffic splits between revisions
      # (`gcloud run services update-traffic`); Terraform only needs to
      # create the service once and then stay out of the way.
      traffic,
      # gcloud CLI deploys stamp these annotations; without ignoring them,
      # every CI deploy shows as configuration drift on the next `plan`.
      client,
      client_version,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "deploy_developer" {
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.developer"
  member   = var.deploy_sa_member
}
