output "state_bucket_name" {
  description = "Name of the GCS bucket. Use this as the 'bucket' value in envs/*/backend.tf."
  value       = google_storage_bucket.tf_state.name
}
