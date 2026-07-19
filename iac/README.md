# Infrastructure as Code

Terraform for the flags-api platform on GCP: Cloud Run, Cloud SQL (Postgres),
Memorystore (Redis), the project's **default VPC** with private
connectivity, least-privilege IAM (including Workload Identity Federation
for GitHub Actions — no service account keys), Secret Manager, and Cloud
Monitoring alerting/dashboards.

## Layout

```
iac/
  bootstrap/            one-time: creates the GCS bucket used for remote state
  main.tf                 single root module: wires every module together
  variables.tf             every input, with staging-safe defaults
  outputs.tf
  versions.tf              provider + GCS backend (state keyed per workspace)
  environments/
    staging.tfvars          overrides for the staging profile (documents the defaults)
    production.tfvars       overrides for the production profile (HA, bigger tiers, deletion protection)
  modules/                 reusable building blocks, each independently validated
    project-services/       enables every GCP API the other modules need
    network/                 default VPC + private service access + VPC connector + firewall rule
    iam/                     runtime SA (Cloud Run) + deploy SA (GitHub Actions via WIF)
    artifact-registry/       Docker repo for flags-api images
    cloud-sql/                Postgres, private IP, secret with the connection string
    redis/                    Memorystore, private IP, secret with the auth string
    cloud-run/                the service itself; deliberately hands off image/traffic to CI/CD
    monitoring/               notification channel, uptime check, 3 alert policies, dashboard
```

There is one root module, not one per environment. Staging and production
are two Terraform **workspaces** against that same root: same code, same
module graph, separate state (the GCS backend keys state per workspace) and
separate `-var-file`. A `terraform apply` in one workspace can never touch
the other's state, and there's no risk of the two environments' wiring
drifting apart, because there's only one copy of the wiring.

## Why the default VPC, not a custom one

This service only ever talks to two things over private IP — Cloud SQL and
Memorystore — via a Serverless VPC Access connector. None of that needs a
purpose-built VPC, custom subnets, or a project-wide firewall policy: the
project's `default` network (with its auto-created per-region subnets)
already exists, and `modules/network` just adds what Cloud Run/Cloud
SQL/Redis specifically need on top of it:

- a reserved range peered for Google-managed private services (Cloud SQL
  and Memorystore private IPs),
- a Serverless VPC Access connector in its own `/28` (`10.10.16.0/28` by
  default), and
- one ingress firewall rule scoped to that connector's `/28`, since the
  default network's built-in rules only cover its own auto-created subnet
  ranges (`10.128.0.0/9`), not this connector's dedicated range.

If a future workload needs its own subnet or a stricter firewall policy,
`modules/network` is the one place to add it — nothing else in the module
graph assumes a custom VPC exists.

## Why Cloud Run, not GKE

Cloud Run gives revision-based traffic splitting (canary/blue-green) built
in, with no cluster or node pool to provision — the right tradeoff for this
service's scope. The cost is a coarser deployment model than a GKE rolling
update with pod-level readiness gates; see the root README's deployment
strategy section for how canary works here in practice.

## Design decisions worth knowing before you read the code

- **Environment identity comes from the Terraform workspace**, not a
  variable you have to remember to set. `local.env = terraform.workspace`
  in `main.tf` drives every resource name and the deploy SA's WIF binding,
  so "which environment am I applying" and "which state file did I just
  select" can never disagree.
- **Terraform doesn't own image tags or traffic splits after the first
  apply.** `modules/cloud-run` has `lifecycle.ignore_changes` on the
  container image, the `traffic` block, and the `client`/`client_version`
  annotations gcloud stamps. CI/CD deploys new revisions and shifts traffic
  with `gcloud run deploy` / `gcloud run services update-traffic`; if
  Terraform also tried to manage those, every deploy would show up as drift
  on the next `plan` and the two would fight. Terraform's job is the
  service's shape (env vars, secrets, scaling, VPC access) — not which
  revision is live.
- **Secrets are scoped per-secret, not per-project.** Each secret
  (`database-url`, `redis-auth`) grants `secretAccessor` only to the runtime
  service account, via a binding created in the same module that creates the
  secret (`modules/cloud-sql`, `modules/redis`) — never a project-wide
  `roles/secretmanager.secretAccessor`.
- **No service account keys anywhere.** The GitHub Actions deploy identity
  (`modules/iam`) authenticates via Workload Identity Federation: GitHub's
  OIDC token is exchanged for short-lived GCP credentials at workflow run
  time. Each workspace gets its own WIF pool, gated on both the repo and
  the GitHub Actions `environment:` name — a staging workflow run physically
  cannot mint credentials for the production deploy SA, even if someone
  fat-fingers the workflow file.
- **The deploy SA can't touch IAM.** It gets `roles/run.developer` (deploy
  revisions, shift traffic) and `roles/artifactregistry.writer`, both scoped
  to the one service/repo — not `roles/run.admin`, which additionally allows
  changing who can invoke the service.
- **`modules/project-services` runs first.** Every other module assumes its
  APIs are already enabled rather than managing its own
  `google_project_service` resources; every other module block in
  `main.tf` depends on it (`depends_on = [module.apis]`).

## One-time setup: state bucket

Terraform needs somewhere to store state before this root module can be
initialized, and that somewhere is itself a GCP resource — so it's
bootstrapped once with local state, outside the normal flow:

```sh
cd iac/bootstrap
terraform init
terraform apply -var="project_id=<your-project-id>"
# note the state_bucket_name output
```

Then point the root module at that bucket:

```sh
cd iac
terraform init -backend-config="bucket=<state_bucket_name>"
```

(or write a gitignored `backend.hcl` containing `bucket = "..."` and pass
`-backend-config=backend.hcl` — either works, since the `backend "gcs"`
block in `versions.tf` intentionally omits the bucket name so no
placeholder ever gets committed and mistaken for a real value.)

## Day-to-day: plan / apply an environment

```sh
cd iac
terraform init -backend-config="bucket=<state_bucket_name>"

# one-time per environment
terraform workspace new staging      # or: production

terraform workspace select staging   # or: production
terraform plan \
  -var-file="environments/staging.tfvars" \
  -var="project_id=<your-project-id>" \
  -var="alert_email=<you>@example.com" \
  -var="github_repository=<owner>/<repo>"
terraform apply <same flags>
```

`project_id`, `alert_email`, and `github_repository` have no defaults on
purpose — there's no real GCP project wired up yet, and a required variable
with no default is the safest way to guarantee nobody applies against a
project by accident. Everything else (machine sizes, instance counts,
deletion protection, HA) has a staging-safe default in `variables.tf`;
`environments/production.tfvars` overrides them for production.

First apply will use the placeholder image
`us-docker.pkg.dev/cloudrun/container/hello` for Cloud Run (see
`modules/cloud-run`'s `image` variable) — there's no real `flags-api` image
in Artifact Registry until CI pushes one, and the Cloud Run service has to
be creatable before that first push can happen.

## Validating changes without a live project

Every module and the root were checked with `terraform fmt -recursive` and
`terraform init -backend=false && terraform validate` (no GCP project or
credentials required for either).
