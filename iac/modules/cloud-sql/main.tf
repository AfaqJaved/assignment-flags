resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = "flags-${var.env}-pg"
  region              = var.region
  database_version    = var.database_version
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_size         = var.disk_size_gb
    disk_autoresize   = true
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = var.backup_enabled
      point_in_time_recovery_enabled = var.point_in_time_recovery
      transaction_log_retention_days = var.point_in_time_recovery ? 7 : null

      backup_retention_settings {
        retained_backups = 7
      }
    }

    # Feeds flag-evaluation query latency into Cloud SQL's own insights UI,
    # complementing the app-level p50/p95/p99 metrics from the API itself.
    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }
  }

  depends_on = [var.private_vpc_connection]
}

resource "google_sql_database" "flags" {
  project  = var.project_id
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "random_password" "db_user" {
  length  = 32
  special = false # avoid characters that need escaping inside a postgresql:// URI
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_user.result
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "flags-${var.env}-database-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = format(
    "postgresql://%s:%s@%s/%s",
    google_sql_user.app.name,
    random_password.db_user.result,
    google_sql_database_instance.main.private_ip_address,
    google_sql_database.flags.name,
  )
}

resource "google_secret_manager_secret_iam_member" "database_url_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.secret_accessor_member
}
