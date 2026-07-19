# Matches iac/variables.tf defaults — written out explicitly so the
# staging profile stays documented even if the defaults ever change.
enable_api_docs                  = true
cloud_sql_tier                   = "db-f1-micro"
cloud_sql_availability_type      = "ZONAL"
cloud_sql_deletion_protection    = false
cloud_sql_point_in_time_recovery = false
redis_tier                       = "BASIC"
redis_memory_size_gb             = 1
cloud_run_cpu                    = "1"
cloud_run_memory                 = "512Mi"
min_instance_count               = 0
max_instance_count               = 3
latency_p99_threshold_ms         = 1500
