resource "google_redis_instance" "cache" {
  project        = var.project_id
  name           = "flags-${var.env}-cache"
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version

  authorized_network = var.vpc_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  auth_enabled       = true

  depends_on = [var.private_vpc_connection]
}

resource "google_secret_manager_secret" "redis_auth" {
  project   = var.project_id
  secret_id = "flags-${var.env}-redis-auth"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = google_redis_instance.cache.auth_string
}

resource "google_secret_manager_secret_iam_member" "redis_auth_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.redis_auth.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.secret_accessor_member
}
