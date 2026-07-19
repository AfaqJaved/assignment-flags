output "vpc_id" {
  description = "Self link of the default VPC network."
  value       = data.google_compute_network.default.id
}

output "vpc_name" {
  value = data.google_compute_network.default.name
}

output "vpc_connector_id" {
  description = "ID of the Serverless VPC Access connector, used by the Cloud Run module."
  value       = google_vpc_access_connector.connector.id
}

output "private_vpc_connection" {
  description = "The private service networking connection resource, used as a dependency by Cloud SQL/Redis so they wait for peering to be established."
  value       = google_service_networking_connection.private_service_connection
}
