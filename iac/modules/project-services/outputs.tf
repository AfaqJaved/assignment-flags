output "enabled_services" {
  description = "Set of enabled API service names. Other modules can depend_on this output to ensure APIs are active before creating resources."
  value       = local.services
}
