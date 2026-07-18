# Project Assignment

This project is an assignment and all the details of the assignment is given in the folder
assignment-doc/ in markdown format

# Project Overview

Design and implement a Multi-Tenant Configuration & Feature Flag Service that allows
multiple applications/tenants to manage feature flags and runtime configuration. The service
should support percentage-based rollouts, environment-scoped configs, audit trails, and
real-time config distribution. Then deploy the entire system on GCP with infrastructure-as-code,
a blue-green (or canary) deployment strategy, and production-grade observability.
This task tests your ability to design multi-tenant data models, implement deterministic rollout
algorithms, build secure APIs, manage infrastructure-as-code, deploy with zero-downtime
strategies, and operate cloud-native systems on GCP — with a true 50/50 split between
backend engineering and platform/DevOps.

# Business Context

You're building an internal platform service that multiple applications within the organization will
use to manage feature flags and runtime configuration. Think of it as a simplified LaunchDarkly
or Unleash — a centralized service that lets teams:

1. Create and manage feature flags per application
2. Roll out features gradually using percentage-based targeting
3. Scope configurations to specific environments (dev, staging, production)
4. Audit every change for compliance and debugging
5. Distribute config changes to clients in real-time
   The service needs to be multi-tenant (each application is a tenant), highly available, and
   deployed on GCP with proper infrastructure and operational tooling.

# Functional Requirements

## Backend (50%)

### Tenant & Environment Management

## POST /api/v1/tenants — Register a new tenant (application)

### Each tenant has environments: development, staging, production

### API key authentication per tenant (each tenant gets a unique API key)

### Feature Flag CRUD

- POST /api/v1/tenants/{id}/flags — Create a feature flag with name,
  description, type (boolean, string, number), and default value
- GET /api/v1/tenants/{id}/flags — List flags with filtering by environment and
  status (active/archived)
- PUT /api/v1/tenants/{id}/flags/{flag_key} — Update flag: toggle on/off,
  change rollout percentage, update targeting rules, modify default value
- DELETE /api/v1/tenants/{id}/flags/{flag_key} — Soft-delete (archive) a
  flag
  Flag Evaluation Engine
- POST /api/v1/evaluate — Evaluate flags for a given user/context
- Request body: { tenant_id, environment, user_id, context: {
  ... } }
- Returns evaluated flag values for that user
- POST /api/v1/evaluate/bulk — Bulk evaluate all active flags for a user context in
  a single request
- Percentage rollouts must be deterministic: the same user
  \_
  id must always receive the
  same flag value for a given flag (use consistent hashing — e.g., hash of flag_key +
  user_id mapped to a 0-100 range)
- Support flag types: boolean (on/off), string (variant selection), and percentage-based
  gradual rollout

## Audit & History

- Every flag change is automatically audit-logged: who changed it, what changed, when,
  and the previous value
- GET /api/v1/tenants/{id}/flags/{flag_key}/history — View chronological
  change history for a flag
- Audit records are immutable (append-only)
  Real-Time Distribution (Bonus)
- SSE (Server-Sent Events) or WebSocket endpoint for clients to subscribe to flag
  changes for their tenant + environment
- When a flag is toggled or updated, subscribed clients receive the change in real-time
