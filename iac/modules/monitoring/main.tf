resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "flags-${var.env} alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_uptime_check_config" "health" {
  project      = var.project_id
  display_name = "flags-${var.env}-health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = var.health_check_path
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.service_host
    }
  }
}

resource "google_monitoring_alert_policy" "uptime_failure" {
  project      = var.project_id
  display_name = "flags-${var.env}: health check failing"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failed"
    condition_threshold {
      filter          = "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.\"check_id\"=\"${google_monitoring_uptime_check_config.health.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "0s"

      aggregations {
        alignment_period     = "300s"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        group_by_fields      = ["resource.label.host"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    mime_type = "text/markdown"
    content   = "The flags-${var.env}-api health endpoint (${var.health_check_path}) is failing uptime checks. Check Cloud Run revision status and recent deploys; roll back the traffic split to the previous revision if a recent deploy is the cause."
  }
}

resource "google_monitoring_alert_policy" "error_rate" {
  project      = var.project_id
  display_name = "flags-${var.env}: error rate > ${var.error_rate_threshold * 100}%"
  combiner     = "OR"

  conditions {
    display_name = "5xx ratio over 5m"
    condition_monitoring_query_language {
      duration = "300s"
      trigger {
        count = 1
      }
      query = <<-EOT
        {
          fetch cloud_run_revision
          | metric 'run.googleapis.com/request_count'
          | filter resource.service_name == '${var.service_name}' && metric.response_code_class == '5xx'
          | align rate(5m)
          | group_by [], [val: sum(value.request_count)]
          ;
          fetch cloud_run_revision
          | metric 'run.googleapis.com/request_count'
          | filter resource.service_name == '${var.service_name}'
          | align rate(5m)
          | group_by [], [val: sum(value.request_count)]
        }
        | ratio
        | every 5m
        | condition val() > ${var.error_rate_threshold} '1'
      EOT
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    mime_type = "text/markdown"
    content   = "5xx responses exceeded ${var.error_rate_threshold * 100}% of total requests over a 5-minute window on flags-${var.env}-api. Check recent deploys and downstream dependency health (Cloud SQL, Redis)."
  }
}

resource "google_monitoring_alert_policy" "latency" {
  project      = var.project_id
  display_name = "flags-${var.env}: p99 latency > ${var.latency_p99_threshold_ms}ms"
  combiner     = "OR"

  conditions {
    display_name = "p99 request latency"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_p99_threshold_ms
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    mime_type = "text/markdown"
    content   = "p99 request latency on flags-${var.env}-api exceeded ${var.latency_p99_threshold_ms}ms over 5 minutes. Check flag-evaluation cache hit ratio and Cloud SQL query insights for slow queries."
  }
}
