data "google_compute_network" "default" {
  project = var.project_id
  name    = "default"
}

# Reserved range Google peers into the default VPC to place Cloud SQL and
# Memorystore private IPs — required before either service can use private
# connectivity instead of public IPs.
resource "google_compute_global_address" "private_service_range" {
  project       = var.project_id
  name          = "flags-${var.env}-private-service-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  address       = split("/", var.private_service_range)[0]
  network       = data.google_compute_network.default.id
}

resource "google_service_networking_connection" "private_service_connection" {
  network                 = data.google_compute_network.default.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# Serverless VPC Access connector: lets Cloud Run reach the private IPs of
# Cloud SQL and Memorystore inside the default network.
resource "google_vpc_access_connector" "connector" {
  project       = var.project_id
  name          = "flags-${var.env}-connector"
  region        = var.region
  network       = data.google_compute_network.default.name
  ip_cidr_range = var.connector_cidr

  # f1-micro keeps the connector cheap; flag evaluation traffic to Cloud
  # SQL/Redis is small relative to the connector's own throughput ceiling.
  machine_type  = "f1-micro"
  min_instances = 2
  max_instances = 3
}

# The default network's built-in firewall rules only cover its
# auto-created subnet ranges (10.128.0.0/9); the connector's dedicated /28
# falls outside that, so it needs its own internal-only allow rule to reach
# Cloud SQL/Redis over their private IPs.
resource "google_compute_firewall" "allow_connector_internal" {
  project = var.project_id
  name    = "flags-${var.env}-allow-connector-internal"
  network = data.google_compute_network.default.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [var.connector_cidr]
}
