# Bigger/HA instances, deletion protection on, docs endpoint off.
enable_api_docs                  = false
cloud_sql_tier                   = "db-custom-2-7680"
cloud_sql_availability_type      = "REGIONAL"
cloud_sql_deletion_protection    = true
cloud_sql_point_in_time_recovery = true
redis_tier                       = "STANDARD_HA"
redis_memory_size_gb             = 2
cloud_run_cpu                    = "2"
cloud_run_memory                 = "1Gi"
min_instance_count               = 1
max_instance_count               = 20
latency_p99_threshold_ms         = 800
