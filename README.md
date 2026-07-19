# Feature Flag Service

A multi-tenant configuration & feature flag service — feature flag CRUD, deterministic
percentage rollouts, environment scoping (`development` / `staging` / `production`),
an append-only audit trail, and a Redis-backed evaluation cache — built with NestJS,
PostgreSQL, and Redis, and deployed to Google Cloud Run via Terraform.

This repository is a take-home submission for the assignment described in
[`assignment-doc/assignment.markdown`](./assignment-doc/assignment.markdown) (Option C:
Multi-Tenant Config & Feature Flag Service).

**Deployed URL:** [`https://flags-api-92921455943.us-central1.run.app/`](https://flags-api-92921455943.us-central1.run.app/)
Visit
[`/docs`](https://flags-api-92921455943.us-central1.run.app/docs) for the interactive
Swagger UI (full API reference, request/response schemas, and a "Try it out" console);
the health check is at `/api/v1/health`.

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack & reasoning](#tech-stack--reasoning)
- [Data model](#data-model)
- [API documentation](#api-documentation)
- [Flag evaluation algorithm](#flag-evaluation-algorithm)
- [Caching strategy](#caching-strategy)
- [Security](#security)
- [Local development](#local-development)
- [Testing strategy](#testing-strategy)
- [Load testing](#load-testing)
- [Infrastructure & deployment](#infrastructure--deployment)
- [CI/CD pipeline](#cicd-pipeline)
- [Observability](#observability)
- [Assumptions & trade-offs](#assumptions--trade-offs)
- [Known gaps & future improvements](#known-gaps--future-improvements)
- [Repository layout](#repository-layout)

---

## Architecture

The backend itself is a Bun/Nx monorepo split into two workspace packages, following a
light hexagonal (ports & adapters) style:

```
packages/
  domain/    pure business logic — entities, value objects, use cases, the
             deterministic rollout algorithm. Zero framework or infra
             dependencies (no NestJS, no Kysely, no HTTP). Built with tsup,
             tested with vitest.
  api/       the NestJS adapter — HTTP controllers, DTOs/validation, Kysely
             repositories (Postgres), Redis cache, API-key auth middleware,
             rate limiting. Depends on @flags/domain as a workspace package;
             domain never depends back on api.
```

A third workspace package, `load-testing/`, sits alongside these two but isn't part of
this ports-and-adapters split — it's a k6 load test for `/evaluate`, written in
TypeScript for the same reason `domain` is (fast, framework-free tooling), and is
covered separately in [Load testing](#load-testing).

Each domain concept (`tenant`, `flag`, `evaluation`, `audit`) is a vertical slice
present in _both_ packages: `packages/domain/src/flag` holds the `FeatureFlag` entity,
its use cases, and its repository _port_ (interface); `packages/api/src/modules/flag`
holds the NestJS controller, DTOs, and the Kysely repository _adapter_ that implements
that port. Use cases return a `Result<T, E>` (no thrown exceptions for expected
business errors — see `packages/domain/src/shared/result.ts`); the API layer maps each
`Result` error `kind` to an HTTP status in a per-module `errors.map.ts`.

```
Client
  │  X-API-Key header
  ▼
ApiKeyAuthenticationMiddleware ──► SecurityContext (request-scoped: tenantId, tenantSlug)
  │
  ▼
NestJS Controller (api package)
  │  DTO validation (class-validator)
  ▼
Use Case (domain package, framework-agnostic)
  │
  ├──► Repository port ──► Kysely adapter ──► PostgreSQL   (tenants, flags, audit_logs)
  └──► FlagEvaluationCacheService ──► Redis (cacheable + @keyv/redis)
```

Why this split, given the assignment's time budget: the deterministic rollout algorithm
and the multi-tenant invariants (flag keys unique _per tenant_, environment-scoped
config, append-only audit) are the parts most worth unit-testing in isolation, without
spinning up Nest's DI container or a database. Keeping them in a framework-free package
made that cheap and made the domain layer's test suite fast enough to run on every save.

## Tech stack & reasoning

| Concern          | Choice                                            | Why                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language/runtime | TypeScript on **Bun**                             | Assignment's preferred stack. Bun's workspace linking + single lockfile made the monorepo (`domain` + `api`, plus `load-testing` for tooling) simple; also used as the container runtime (`oven/bun` images).                                                |
| Framework        | **NestJS**                                        | Assignment's recommendation for this scope — DI, guards, and middleware map cleanly onto per-tenant auth and rate limiting; module boundaries mirror the domain's vertical slices.                                                                           |
| Database         | **PostgreSQL** via **Kysely**                     | Relational integrity for tenant → flag → audit-log foreign keys; `jsonb` columns for `default_value` and per-environment `environments` config avoid a wide, sparse column set. Kysely over an ORM for typed SQL without hidden N+1s in a schema this small. |
| Cache            | **Redis** via `cacheable` + `@keyv/redis`         | Evaluation results are cheap to compute (a hash + a few comparisons) but still worth caching under load; `cacheable`'s built-in tag support gives per-flag cache invalidation without tracking individual per-user keys by hand.                             |
| Monorepo tooling | **Nx**                                            | Caches `build`/`lint`/`test` across all three packages and orders `domain` before `api` in CI (api imports domain's build output; `load-testing` builds independently — it talks to the API over HTTP, not as a workspace dependency).                       |
| IaC              | **Terraform**                                     | Assignment's preferred IaC tool; one root module, two Terraform _workspaces_ (`staging`/`production`) rather than duplicated per-env directories — see [iac/README.md](./iac/README.md).                                                                     |
| Compute          | **Cloud Run**                                     | Built-in revision-based traffic splitting (canary/blue-green) with zero cluster/node-pool management — the right fit for a single stateless HTTP service at this scale. See [reasoning in iac/README.md](./iac/README.md#why-cloud-run-not-gke).             |
| Managed DB/cache | **Cloud SQL (Postgres)**, **Memorystore (Redis)** | Managed backups, private-IP-only connectivity via a VPC connector, and Secret-Manager-issued credentials, without operating either service by hand.                                                                                                          |

## Data model

![Database ERD — tenants, feature_flags, audit_logs](./docs/images/database-erd.png)

Generated from [`docs/database.dbml`](./docs/database.dbml) via [dbdiagram.io](https://dbdiagram.io);
the DBML is hand-derived from the actual Kysely migrations under
[`packages/api/src/shared/database/migrations`](./packages/api/src/shared/database/migrations),
not the other way around, so it stays a faithful mirror of the real schema rather than an
aspirational one.

- **`tenants`** — one row per registered application. `api_key_hash` is a SHA-256 digest;
  the plaintext key is returned exactly once, at registration, and never stored.
- **`feature_flags`** — `key` is unique **per tenant**, not globally (`UNIQUE(tenant_id, key)`),
  which is what lets two unrelated tenants both register a flag called `dark-mode`
  without colliding. `environments` is a single `jsonb` column holding a
  `{ development: { enabled, rolloutPercentage }, staging: {...}, production: {...} }`
  map rather than a separate `flag_environments` table — chosen because the config is
  small, fixed-shape (exactly 3 keys), and always read/written as a whole per flag; a
  join table would have added query complexity without a real benefit at this scale.
  Archiving is a soft-delete (`status = 'archived'`), not a row deletion, so the audit
  trail and evaluation history stay intact.
- **`audit_logs`** — append-only: no `updated_at`, no update/delete code path exists for
  it anywhere in the domain or repository layer. `flag_key` is denormalized onto the row
  (in addition to `flag_id`) so history reads never need a join back to `feature_flags`.
  `environment` is nullable because not every change is environment-scoped (e.g. editing
  a flag's `defaultValue` applies across all three environments at once). `status`,
  `type`, `environment`, and `action` are Postgres `varchar` columns with a `CHECK`
  constraint, not native enum types — the ERD models them as enums purely for a clearer
  diagram (see the note at the top of the DBML source).

Migrations are plain Kysely migration files under
[`packages/api/src/shared/database/migrations`](./packages/api/src/shared/database/migrations)
and run automatically at application startup (`FlagsDatabaseModule` calls
`runMigrations` before the app starts serving requests) — there's no separate
"run migrations" deploy step to remember. `bun run migration:create <name>` scaffolds a
new one; `migration:up` / `migration:down` / `migration:latest` are available for manual
use.

## API documentation

All routes are mounted under `/api/v1`. Full interactive docs (Swagger UI, built from
the same DTOs/decorators shown below) are served at **`/docs`** when `ENABLE_API_DOCS=true`
(the default locally; disabled in the production Terraform profile).

**Auth:** every route except `POST /api/v1/tenants`, `GET /api/v1/health`, and the docs
routes requires an `X-API-Key: sk_...` header. The middleware resolves that key to a
tenant and populates a request-scoped `SecurityContext` — **the tenant is never taken
from a URL path parameter or request body**, only from the authenticated key (see
[Assumptions & trade-offs](#assumptions--trade-offs) for why this differs from the
`/tenants/{id}/flags` shape sketched in the assignment).

Every response is wrapped in a consistent envelope:

```jsonc
// success
{ "data": { /* ... */ }, "statusCode": 200, "timestamp": "2026-07-19T10:00:00.000Z" }
// error
{ "message": "Flag 'new-checkout' not found", "statusCode": 404, "timestamp": "..." }
```

### Register a tenant

```
POST /api/v1/tenants
```

```json
// request
{ "name": "Acme Inc", "slug": "acme-inc" }
```

```json
// 201 response — apiKey is shown once and only once
{
  "data": {
    "tenant": {
      "id": "e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c",
      "name": "Acme Inc",
      "slug": "acme-inc",
      "status": "active",
      "createdAt": "2026-07-19T10:00:00.000Z",
      "updatedAt": "2026-07-19T10:00:00.000Z"
    },
    "apiKey": "sk_1f9c2e1a7b6d4c3f8e2a9b7c6d5e4f3a"
  },
  "statusCode": 201,
  "timestamp": "2026-07-19T10:00:00.000Z"
}
```

`slug` must already be unique — a repeat registration with the same slug returns `409`.

### Create a feature flag

```
POST /api/v1/flags
X-API-Key: sk_...
```

```json
// request — created disabled, at 0% rollout, in every environment
{
  "key": "new-checkout",
  "name": "New checkout",
  "description": "Rolls out the redesigned checkout funnel.",
  "type": "boolean",
  "defaultValue": false,
  "createdBy": "user_42"
}
```

`key` must be unique for the calling tenant (lowercase, hyphen-separated,
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, ≤100 chars) — a duplicate returns `409`. `defaultValue`'s
runtime type must match `type` (`boolean` | `string` | `number`) or the request is
rejected with `400`.

### List flags

```
GET /api/v1/flags?environment=production&status=active
X-API-Key: sk_...
```

Both query params are optional; `environment` filters to flags enabled in that
environment, `status` filters `active` vs `archived`. Response is an array of the same
shape shown below for a single flag.

### Toggle / update rollout for one environment

```
PATCH /api/v1/flags/new-checkout/environments/production
X-API-Key: sk_...
```

```json
// request — every field optional; only what's sent gets patched
{ "enabled": true, "rolloutPercentage": 25, "updatedBy": "user_42" }
```

```json
// 200 response
{
  "data": {
    "id": "e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c",
    "tenantId": "e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c",
    "key": "new-checkout",
    "name": "New checkout",
    "description": "Rolls out the redesigned checkout funnel.",
    "type": "boolean",
    "defaultValue": false,
    "status": "active",
    "environments": {
      "development": { "enabled": false, "rolloutPercentage": 0 },
      "staging": { "enabled": false, "rolloutPercentage": 0 },
      "production": { "enabled": true, "rolloutPercentage": 25 }
    },
    "createdAt": "2026-07-19T10:00:00.000Z",
    "createdBy": "user_42",
    "updatedAt": "2026-07-19T10:05:00.000Z",
    "updatedBy": "user_42"
  },
  "statusCode": 200,
  "timestamp": "2026-07-19T10:05:00.000Z"
}
```

`defaultValue` may also be updated here — it applies across all three environments at
once, since it's stored once per flag, not per environment. This request also writes an
audit-log entry and invalidates every cached evaluation for this flag (see
[Caching strategy](#caching-strategy)).

### Archive (soft-delete) a flag

```
DELETE /api/v1/flags/new-checkout
X-API-Key: sk_...
```

```json
{ "archivedBy": "user_42" }
```

An archived flag always evaluates to its `defaultValue` (see below) and is excluded
from `status=active` listings, but the row and its audit history are retained.

### Evaluate flags for a user

```
POST /api/v1/evaluate
X-API-Key: sk_...
```

```json
// request — omit flagKeys to evaluate every active flag for the tenant/environment
{
  "environment": "production",
  "userId": "user_42",
  "context": { "plan": "enterprise", "betaTester": true },
  "flagKeys": ["new-checkout"]
}
```

```json
// 200 response
{
  "data": [{ "flagKey": "new-checkout", "value": true, "reason": "rollout", "cacheHit": false }],
  "statusCode": 200,
  "timestamp": "2026-07-19T10:06:00.000Z"
}
```

`reason` is one of `flag_not_found`, `flag_archived`, `flag_disabled`, `rollout`,
`default` — see [Flag evaluation algorithm](#flag-evaluation-algorithm) for the
precedence order these come from. `context` is accepted by the API today for
forward-compatible targeting-attribute support, but the evaluation engine's rollout
decision currently only uses `userId` (see
[Known gaps](#known-gaps--future-improvements)).

### Bulk-evaluate every active flag

```
POST /api/v1/evaluate/bulk
X-API-Key: sk_...
```

```json
{ "environment": "production", "userId": "user_42", "context": {} }
```

Same response shape as `/evaluate`, for every active flag in the environment in one
round trip — this is the endpoint an SDK's startup fetch would call.

### Flag change history

```
GET /api/v1/audit/flags/new-checkout/history
X-API-Key: sk_...
```

```json
{
  "data": [
    {
      "id": "b1e2c3d4-...",
      "tenantId": "e8c9c8a0-...",
      "flagId": "e8c9c8a0-...",
      "flagKey": "new-checkout",
      "environment": "production",
      "action": "flag_toggled",
      "changes": [
        { "field": "enabled", "previousValue": false, "newValue": true },
        { "field": "rolloutPercentage", "previousValue": 0, "newValue": 25 }
      ],
      "actorId": "user_42",
      "createdAt": "2026-07-19T10:05:00.000Z"
    }
  ],
  "statusCode": 200,
  "timestamp": "2026-07-19T10:07:00.000Z"
}
```

Returned newest-first. Every create/toggle/update/archive on a flag writes exactly one
of these rows, generated automatically inside the use case that made the change — there
is no separate "log this manually" call for API consumers to forget.

### Health check

```
GET /api/v1/health
```

No auth, no rate limiting, no dependency checks (deliberately a _liveness_ probe, not
readiness — see the comment in `health.controller.ts`). Backs the Cloud Run
startup/liveness probes and the Terraform uptime check.

## Flag evaluation algorithm

Resolving a flag for a `(flag, environment, userId)` triple follows a fixed precedence,
implemented in `FlagEvaluationService.evaluate` (`packages/domain/src/evaluation/services/flag.evaluation.service.ts`):

1. **Archived** → `defaultValue`, reason `flag_archived`.
2. **Disabled in this environment** → `defaultValue`, reason `flag_disabled`.
3. **Enabled** → deterministically bucket the user; `true` if they land inside the
   rollout percentage (reason `rollout`), else `defaultValue` (reason `default`).

### Deterministic bucketing

The same `(flagKey, userId)` pair must always land in the same bucket — no persisted
per-user assignment table, no coin flip on every request. `DeterministicRolloutService`
(`packages/domain/src/evaluation/services/deterministic.rollout.service.ts`) does this
with a 32-bit FNV-1a hash:

```ts
const BUCKET_SPACE = 10_000; // two-decimal precision over [0, 100)

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

bucketFor(flagKey, userId) = (fnv1a(`${flagKey}:${userId}`) % 10_000) / 100; // → [0, 100)

isInRollout(flagKey, userId, pct) =
  pct <= 0 ? false : pct >= 100 ? true : bucketFor(flagKey, userId) < pct;
```

FNV-1a was chosen over something like SHA-256 for this because the bucket only needs to
be _uniformly distributed and stable_, not cryptographically unpredictable — it's not
guarding a secret, just spreading users evenly across a 0–100 range. It's dependency-free,
fast enough to run on every evaluation with no caching required, and stable across
platforms/Node versions (`>>> 0` keeps everything in unsigned 32-bit space).

**Why hash `flagKey + userId` together, not `userId` alone:** hashing the pair means the
_same user_ lands in a _different, independent_ bucket for each flag. Without the flag
key mixed in, a user who happens to bucket into the bottom 10% for one flag would
bucket into the bottom 10% for every flag — rollouts across different flags would be
correlated instead of independent.

### Worked example

Flag `new-checkout` has `rolloutPercentage: 30` in `production`, type `boolean`,
`defaultValue: false`.

- `bucketFor('new-checkout', 'user-42')` → `17.4` → `17.4 < 30` → **true**: `user-42`
  sees the flag as `true`.
- `bucketFor('new-checkout', 'user-99')` → `82.1` → `82.1 < 30` is false → `user-99`
  falls through to `flag.defaultValue` (`false`).

If the rollout is later bumped to `50%`, `user-99`'s bucket (`82.1`) is unaffected, but
anyone whose bucket falls between `30` and `50` newly flips to `true` — users already in
the `0–30` range stay `true`. This is what makes the rollout **monotonic**: growing the
percentage only ever adds users, it never reshuffles who's already in.

Edge cases are short-circuited before hashing: `rolloutPercentage <= 0` is always
`false`, `>= 100` is always `true` — no wasted hash computation at either extreme.

## Caching strategy

Evaluation results are cached in Redis via `FlagEvaluationCacheService`
(`packages/api/src/shared/cache/flag-evaluation`), on top of the `cacheable` library
(with `@keyv/redis` as its backing store).

- **Cache key** is `flag-eval:{tenantId}:{environment}:{flagKey}:{userId}` — _not_ just
  the flag key. The resolved value for a partially-rolled-out flag is a function of all
  four of those, since the deterministic bucket depends on `(flagKey, userId)`; keying
  by flag alone would pin whichever user's request happened to populate the cache first
  as the answer for every other user.
- **TTL: 60 seconds** on evaluation entries — short enough that a toggle or rollout
  change is never stale for long even in the (unlikely, single-instance-today) case
  where invalidation is somehow missed, long enough to absorb bursty read traffic from
  the same user/flag pair.
- **Tag-based invalidation**: every cached entry for a flag is tagged
  `flag-eval-tag:{tenantId}:{flagKey}`. Any update/toggle/archive on that flag calls
  `invalidate(tenantId, flagKey)`, which drops every cached user's result for that flag
  in one call — no need to enumerate or track individual per-user cache keys.
- `/evaluate` checks the cache per requested flag key before calling the evaluation use
  case for whatever's missing, and reports `cacheHit` per flag in the response so a
  caller (or a load test) can see the split directly. `/evaluate/bulk` always computes
  fresh (the full active-flag set for a tenant isn't known ahead of time to check against
  the cache) but writes every result back to cache for subsequent single-flag reads.

## Security

- **API keys, not passwords.** Each tenant gets one high-entropy key (`sk_...`),
  returned once at registration. The server stores only a SHA-256 hash of it
  (`ApiKeyHashingService`) — deliberately _not_ bcrypt: bcrypt's per-call random salt
  would produce a different digest every time, which is unusable as a `WHERE
api_key_hash = ?` lookup key. That trade-off is safe here specifically because API
  keys are random high-entropy tokens, not human-guessable passwords — the threat model
  a slow, salted hash defends against (offline brute-forcing of a weak password) doesn't
  apply.
- **Every non-public route requires `X-API-Key`.** `ApiKeyAuthenticationMiddleware`
  resolves it to a tenant and populates a request-scoped `SecurityContext`; every
  downstream controller/use case reads the tenant from that context, never from a
  client-supplied ID — see [Assumptions & trade-offs](#assumptions--trade-offs).
- **Tenant isolation** is enforced at the repository layer: every flag/audit query is
  scoped by `tenant_id` sourced from `SecurityContext`, and the `UNIQUE(tenant_id, key)`
  constraint means one tenant's flag keys can never collide with — or be addressable
  through — another tenant's.
- **Per-tenant rate limiting**, not per-IP: `TenantThrottlerGuard` tracks usage under
  `tenantId` (100 requests/60s per tenant today), so one tenant's traffic can't degrade
  another's — the classic multi-tenant noisy-neighbor problem. Unauthenticated requests
  (only `POST /tenants`, since that's how a tenant gets its first key) fall back to
  IP-based tracking, the only identity available at that point.
- **Secrets never in source or plain env files in production.** Locally, `DATABASE_URL`
  /`REDIS_PASSWORD` come from a `.env` file; in GCP, both are stored in Secret Manager
  and injected into Cloud Run as secret-backed env vars (`modules/cloud-sql`,
  `modules/redis` in Terraform), with per-secret (not project-wide) `secretAccessor`
  IAM bindings scoped to just the runtime service account.
- **No service account keys.** The GitHub Actions deploy identity authenticates via
  Workload Identity Federation — GitHub's OIDC token is exchanged for short-lived GCP
  credentials at workflow run time, gated on both the repo and the GitHub Actions
  `environment:` name (see `iac/modules/iam`).
- **Response bodies never leak secrets in logs.** `LoggingInterceptor` logs every
  request/response body, but `redactDeep` masks every string value first — long strings
  (API keys, hashes) are fully redacted, short ones partially masked.

## Local development

Requires [Bun](https://bun.sh) ≥1.3 and Docker.

```bash
# 1. install workspace dependencies
bun install

# 2. build the domain package — the api package imports it as a workspace
#    package resolved via its dist/ output, so this has to happen first
cd packages/domain && bun run build && cd ../..

# 3. start Postgres + Redis (and optionally the API itself) via the compose
#    stack in docker/ — see docker/.env.example for overridable defaults
docker compose -f docker/docker-compose.yml up -d postgres redis

# 4. create packages/api/.env (see "Environment variables" below), then:
cd packages/api
bun run dev
```

The app runs migrations automatically at startup — there's no separate "run migrations"
step for local dev. Swagger UI is at `http://localhost:3000/docs` once
`ENABLE_API_DOCS=true`.

To run everything (API included) inside Docker instead:

```bash
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml logs -f api
```

### Environment variables

`ConfigModule` loads `.env` from `packages/api/.env`, falling back to a repo-root `.env`
if that's missing (`envFilePath: ['.env', '../../.env']`). The variables actually read
and validated at startup (`packages/api/src/shared/config/env.ts`) are:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flags
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password
ENABLE_API_DOCS=true
```

These match the defaults in `docker/docker-compose.yml` / `docker/.env.example` if you
started Postgres/Redis via that stack. (The repo-root `.env.example` predates this
project's extraction from an earlier template and documents an unrelated set of
variables — JWT, S3, mailer — that this service doesn't read; use the block above
instead of that file.)

### Useful scripts

```bash
bunx nx run-many -t build          # build all three packages, in dependency order
bunx nx run-many -t lint           # eslint (api only has an eslint config today)
bunx nx run-many -t format-check   # prettier --check, all three packages
bunx nx run-many -t test           # unit tests: vitest (domain), jest (api)

cd packages/api && bun run test:e2e            # end-to-end tests against a real DB/Redis
cd packages/load-testing && bun run load-test  # k6 load test against /evaluate — see Load testing
```

## Testing strategy

| Layer             | Tool             | What's covered                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain unit tests | Vitest           | `DeterministicRolloutService` (bucket distribution, edge cases at 0%/100%, stability across calls), `FeatureFlag` entity invariants.                                                                                                                                                                                                                                                                                   |
| API unit tests    | Jest             | Every use case (`create/update/archive/list` flag, `evaluate`/`bulk-evaluate`, `authenticate/register` tenant, `get flag history`), the evaluation cache service, the logging interceptor's redaction. Repositories are exercised against in-memory fake implementations (`*.repository.fake.impl.ts`), not mocks, so use-case tests cover real control flow (not-found, already-exists, archived) without a database. |
| E2E tests         | Jest + Supertest | `tenant`, `flag`, `evaluation`, `audit`, `health` — full HTTP round trips through the real Nest app, including tenant registration → API key issuance → authenticated flag CRUD → evaluation, and validation-error responses (400/404/409).                                                                                                                                                                            |

**What I prioritized and why:** the deterministic rollout algorithm is the one piece of
this system where a subtle bug (non-uniform distribution, non-monotonic growth, or
non-determinism across calls) would silently corrupt every rollout built on top of it,
so it got the most dedicated test attention. Use-case-level tests with fake repositories
gave fast, deterministic coverage of business rules (tenant-scoped uniqueness, archived
flags always resolving to default, etc.) without paying for a database in every test
run; e2e tests then validate the thing fakes can't — that the real Postgres schema,
Kysely queries, and HTTP layer agree with what the use cases assume.

**What's not yet covered, and what I'd add with more time:**

- **Explicit tenant-isolation and cross-tenant-access e2e tests** — i.e., registering
  two tenants and asserting tenant B's API key can never read/modify/list tenant A's
  flags. Isolation is enforced by construction (every query is scoped by the
  `SecurityContext`-derived `tenant_id`, and archiving/updating a flag key that doesn't
  exist under the caller's tenant returns `404` the same way a truly nonexistent key
  would), but there's no test that pins this behavior explicitly today — it's implied
  by the CRUD tests rather than asserted directly.
- **`FlagsDatabaseModule`/`FlagsCacheModule` needed explicit `onModuleDestroy` hooks.**
  Running the e2e suite against a real Postgres/Redis surfaced that neither the Kysely
  `Pool` nor the Redis client was ever closed — each e2e file's `afterAll(() =>
app.close())` left the process with open sockets, so Jest reported all tests passing
  but then hung instead of exiting. Harmless for the long-running server (which never
  calls `.close()` on itself), but fatal for wiring e2e into CI, since a hung job either
  times out or has to be forced with `--forceExit`, masking any _real_ future leak.
  Fixed by having both modules implement `OnModuleDestroy` and call `db.destroy()` /
  `cache.disconnect()` — Nest runs those hooks automatically on `app.close()`, no
  `enableShutdownHooks()` needed for that (only OS-signal handling needs that).

## Load testing

`packages/load-testing` is a k6 load test for `POST /api/v1/evaluate`, written in
TypeScript and bundled with `tsup` (the same tool `@flags/domain` uses) into a single
JS file k6 can run directly — see [that package's README](./packages/load-testing/README.md#why-typescript--tsup-for-a-k6-script)
for how TypeScript works at all here, given k6 has no native TS or Node.js module
support.

The evaluation endpoint sits behind a **per-tenant** rate limit (100 req/60s), not a
per-IP one, so a naive single-tenant load test would mostly measure how fast the
throttle rejects requests rather than real evaluation performance. The script instead
runs two scenarios:

1. **`sustained_multi_tenant`** — provisions 20 tenants, one VU per tenant, each staying
   comfortably under its own rate limit — this is the number that reflects real
   concurrent, legitimate, multi-tenant traffic.
2. **`single_tenant_burst`** — 20 VUs hammering one dedicated tenant with no pacing,
   deliberately exceeding its cap, to prove the per-tenant throttle (not per-IP) actually
   engages under load from one noisy tenant.

**Results** (run locally against the Docker Compose stack — Postgres + Redis + API on
one machine; see [that package's README](./packages/load-testing/README.md#results) for
the full breakdown):

| Scenario               | Result                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sustained multi-tenant | ~2,620 requests over ~110s (~24 req/s aggregate); latency p50 ≈ 14ms, p95 ≈ 28ms, p99 well under the 500ms threshold; 100% check success; ~38% cache hit rate                                  |
| Single-tenant burst    | ~99.9% of requests rejected with `429` — `TenantThrottlerGuard`'s cap held under concurrent pressure from one tenant, without affecting the other 20 tenants' traffic running at the same time |

Run it yourself with `cd packages/load-testing && bun run load-test` (requires
[k6](https://k6.io) and a running API instance); it writes a full HTML report — with the
percentile breakdowns and per-scenario timelines this section only summarizes — to
[`packages/load-testing/report.html`](./packages/load-testing/report.html) on every run,
committed here as the report from the run documented above.

## Infrastructure & deployment

Terraform provisions Cloud Run, Cloud SQL (Postgres), Memorystore (Redis), the
project's default VPC with private connectivity, least-privilege IAM (Workload Identity
Federation for GitHub Actions — no downloaded service-account keys), Secret Manager, and
Cloud Monitoring. Full module-by-module reasoning lives in **[`iac/README.md`](./iac/README.md)**;
this section covers the deployment strategy specifically.

**Note on how this was actually deployed:** the Terraform in `iac/` is real, complete,
and `terraform validate`/`plan`-clean, but the live service behind the deployed URL above
was provisioned by hand through the GCP Console/`gcloud`, not via `terraform apply`. I
wanted to keep the actual deploy path simple for this submission and use it as a chance
to get hands-on with the underlying GCP services (Cloud Run, Cloud SQL, Memorystore,
Secret Manager) directly, rather than only ever seeing them through a Terraform
abstraction. The Terraform still fully describes what that infrastructure should look
like — same Cloud Run config, same private-IP Cloud SQL/Memorystore setup, same IAM — it
just isn't the thing that's currently applied against the live project.

![CI/CD pipeline and GCP infrastructure](./docs/images/ci-cd-gcp-architecture.png)

A commit to `main` runs the CI pipeline (format → lint → unit tests → e2e tests → build
& push the Docker image to Artifact Registry — see [CI/CD pipeline](#cicd-pipeline)),
which Cloud Run then deploys as a new revision, blue/green via traffic splitting between
revisions. From inside the VPC, Cloud Run reaches Cloud SQL and Memorystore Redis over
private IP only, and exports its logs and metrics to Cloud Logging/Monitoring
throughout. The one leg of this diagram not yet automated is Artifact Registry → Cloud
Run — CI publishes the image today, but the `gcloud run deploy`/`update-traffic` calls
that pick it up are still a manual step (see [Known gaps](#known-gaps--future-improvements)).

```
iac/
  bootstrap/          one-time: creates the GCS bucket used for remote Terraform state
  main.tf              root module wiring every module together
  environments/
    staging.tfvars       small/cheap instance sizes, docs endpoint on
    production.tfvars    HA Cloud SQL + Redis, deletion protection on, docs endpoint off
  modules/
    project-services/    enables every GCP API the other modules need
    network/              default VPC + private service access + VPC connector
    iam/                  runtime SA (Cloud Run) + deploy SA (GitHub Actions via WIF)
    artifact-registry/    Docker image repo
    cloud-sql/             Postgres, private IP, DB credentials in Secret Manager
    redis/                 Memorystore, private IP, auth string in Secret Manager
    cloud-run/              the service; Terraform deliberately hands off image/traffic to CI/CD
    monitoring/             notification channel, uptime check, 3 alert policies, dashboard
```

Staging and production are two Terraform **workspaces** against the same root module —
same code, same module graph, separate state and separate `-var-file` — rather than two
duplicated directories that could drift apart.

### Deployment strategy: Cloud Run traffic splitting (canary)

Cloud Run was chosen specifically because revision-based traffic splitting is built in —
no load balancer or extra resources to provision for canary/blue-green. Terraform
creates the _service_ (env vars, secrets, scaling, VPC access) once, then deliberately
steps back: `lifecycle.ignore_changes` on the container image, the `traffic` block, and
the `client`/`client_version` annotations means Terraform never fights CI/CD for control
of "which revision is live" (see the `cloud-run` module's comments in
[`iac/README.md`](./iac/README.md#design-decisions-worth-knowing-before-you-read-the-code)
for the full reasoning). From that point on, a deploy is:

```bash
# 1. push a new revision, but keep 100% of traffic on the current one
gcloud run deploy flags-production-api \
  --image=<region>-docker.pkg.dev/<project>/flags-api-production/flags-api:<sha> \
  --no-traffic \
  --tag=canary

# 2. shift a small slice of traffic to it and watch error rate / p99 latency
#    (the Cloud Monitoring alert policies from `modules/monitoring` cover both)
gcloud run services update-traffic flags-production-api --to-tags=canary=10

# 3. once confident, promote it to 100%
gcloud run services update-traffic flags-production-api --to-latest
```

**Rollback** is the same primitive run in reverse — Cloud Run keeps every prior
revision addressable, so `gcloud run services update-traffic flags-production-api
--to-revisions=<previous-revision>=100` moves all traffic back instantly, with no
rebuild and no redeploy. This is the main practical advantage of revision-based traffic
splitting over a rolling update: rollback is a traffic-routing change, not a new
deployment.

**Current state of this pipeline:** the CI workflow (below) builds and pushes the image
to Artifact Registry on every push to `main`, but does **not** yet run the
`gcloud run deploy` / `update-traffic` steps above automatically — the live Cloud Run
service was deployed by hand (see the note above), and the canary/rollback sequence has
only been exercised manually against it so far. Wiring it into a GitHub Actions deploy
job (with the canary-then-promote sequence and an automated rollback on a failed health
check) is the immediate next step; see [Known gaps](#known-gaps--future-improvements).

### Why the default VPC, not a custom one

This service only talks to two things over private IP — Cloud SQL and Memorystore — via
a Serverless VPC Access connector. The project's `default` network already exists;
`modules/network` adds only what's needed on top of it (a private-service-access peering
range, the VPC connector, and one scoped firewall rule) rather than standing up a
purpose-built VPC with no other current use. Full reasoning in
[`iac/README.md`](./iac/README.md#why-the-default-vpc-not-a-custom-one).

## CI/CD pipeline

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push to `main`:

```
format ──┐
lint ────┼──► build ──┬──► test ─────┬──► docker-publish (build + push image to Artifact Registry)
         ┘            └──► test-e2e ─┘
```

- **format** — `prettier --check` (the repo's own `format` scripts run `--write`; CI
  needs the read-only variant).
- **lint** — `eslint` (only `api` has an eslint config today; `domain` and
  `load-testing` are skipped by Nx since they don't define a `lint` target).
- **build** — `nx run-many -t build`; Nx's dependency graph builds `domain` before `api`
  automatically, since `api` imports `domain`'s build output.
- **test** — `nx run-many -t test`: vitest for `domain`, jest for `api`'s unit suite
  (`src/**/*.test.ts`). Both run against in-memory fakes, so the job needs no database or
  Redis service container.
- **test-e2e** — `packages/api/test/*.e2e-test.ts` (`bun run test:e2e`) against real
  service containers: Postgres runs as a `services:` container (its image takes auth via
  env vars, so GitHub Actions can health-check it before any step runs); Redis is
  started as a plain `docker run ... redis-server --requirepass password` step instead,
  since the stock Redis image needs its password on the command line and `services:` has
  no hook for that — both match `docker/docker-compose.yml`'s image versions and
  passwords exactly. `domain` is built first (same reason as the `build`/`test` jobs);
  the app's own automatic-migrations-on-boot handles schema setup, so there's no separate
  migration step here either.
- **docker-publish** — runs only once `format`, `lint`, `build`, `test`, and `test-e2e`
  all pass; builds the multi-stage image (below) via `docker/build-push-action` and
  pushes `:latest` and `:<git-sha>` to Artifact Registry, authenticating with a JSON key
  from `secrets.GCP_SA_KEY`.

As noted in [Known gaps](#known-gaps--future-improvements), this pipeline still doesn't
deploy the built image anywhere — that's the next most valuable addition.

### Docker image

`docker/Dockerfile` is a three-stage build (`deps` → `build` → `runtime`):

- **deps** installs `domain`'s and `api`'s dependencies once (`bun install
--frozen-lockfile`, `--ignore-scripts` so the root `prepare` husky hook — meaningless
  with no `.git` in the image — never runs). `load-testing`'s `package.json` is
  deliberately never copied in — it's dev-only load-test tooling with no place in the
  deployed service image.
- **build** builds `domain` before `api`, since `api`'s build imports `domain`'s output.
- **runtime** is `oven/bun:1-slim`, does a _fresh_ `bun install --production` (rather
  than copying `node_modules` from the build stage) so devDependencies (`@nestjs/cli`,
  `jest`, `tsup`, `nx`, `eslint`, ...) never end up in the final image, and copies over
  only `domain`'s and `api`'s `dist/` output. Final `CMD` runs the compiled `dist/main.js`
  directly with `bun`, no NestJS CLI in the runtime image at all.

The Cloud Run health check probes `/api/v1/health`; the container's own Docker
healthcheck (in `docker/docker-compose.yml`) probes the same endpoint via `bun`'s
built-in `fetch()`, since the slim runtime image has neither `curl` nor `wget`.

## Observability

**What's implemented today:**

- Every request/response is logged (`LoggingInterceptor`) with method, URL, status
  code, duration, and a redacted body — sensitive/long string values (API keys,
  hashes) are masked before anything reaches the log stream (`redactDeep`).
- Cloud Run's _built-in_ metrics (`run.googleapis.com/request_count`,
  `request_latencies`, `container/instance_count`) require no app-level instrumentation
  and already back three Terraform-managed alert policies — health-check failures, 5xx
  error rate over a 5-minute rolling window (via a Monitoring Query Language ratio
  query), and p99 latency over a configurable threshold (`iac/modules/monitoring`) — plus
  a Cloud Monitoring dashboard with request-rate, latency-percentile, and instance-count
  widgets.
- Cloud SQL Query Insights is enabled (`insights_config` in `modules/cloud-sql`), giving
  query-level latency visibility that complements the app's own metrics.

**What the assignment asks for that isn't implemented yet:**

- **Structured JSON logs with a correlation/request ID.** Today's logging uses NestJS's
  default text `Logger` — human-readable, but not machine-parseable JSON, and there's no
  request/correlation ID generated or propagated across a request's log lines. This is
  the single biggest observability gap and the next thing I'd build: a middleware that
  generates (or forwards, if present) an `X-Request-Id`, stores it in
  `AsyncLocalStorage` or `SecurityContext`, and a logger that emits one JSON object per
  line (Cloud Logging auto-parses JSON stdout on Cloud Run, so this wouldn't need a
  separate log-shipping agent).
- **App-level custom metrics** — evaluation latency percentiles, evaluations/sec broken
  down _by tenant_, error rate broken down by tenant and endpoint, and cache hit/miss
  ratio. The Cloud Monitoring dashboard already has widgets provisioned for these under a
  `custom.googleapis.com/flags/*` namespace (see `iac/modules/monitoring/dashboard.tf`)
  and will show "no data" until the app actually exports them — most naturally via
  OpenTelemetry's GCP exporter, instrumented at the point `EvaluationController` and
  `FlagEvaluationCacheService` already have the numbers on hand (latency around the use
  case call, `cacheHit` per evaluation).

## Assumptions & trade-offs

The assignment explicitly leaves some shape decisions to the implementer. Choices made
here, and why:

- **Tenant identity comes from the API key, not a `{id}` path parameter.** The
  assignment sketches routes like `POST /api/v1/tenants/{id}/flags`; this implementation
  uses `POST /api/v1/flags` with the tenant resolved from the authenticated
  `X-API-Key` header instead. Accepting a client-supplied tenant ID in the URL and
  trusting it (or worse, checking it against the authenticated key and rejecting a
  mismatch) is both an extra failure mode and an unnecessary IDOR-shaped surface — if
  the key already proves which tenant you are, there's nothing a second, spoofable
  identifier in the URL adds except a way to get it wrong.
- **Flag updates are scoped to one environment per request**
  (`PATCH /flags/{key}/environments/{environment}`), not a single generic
  `PUT /flags/{flag_key}` covering all three environments at once. A flag's
  `enabled`/`rolloutPercentage` are meaningfully different per environment (you toggle
  `production` and `staging` independently); folding all three into one request body
  either meant sending all three every time or inventing partial-update semantics for a
  nested structure. `defaultValue` _is_ still a single cross-environment field on that
  same endpoint, since it's stored once per flag, not once per environment.
- **Percentage rollout is a single on/off gate today, not full multi-variant selection.**
  The assignment asks for `string` (variant selection) flag types; this implementation
  supports declaring and validating `string`/`number` flags with a typed
  `defaultValue`, but `FlagEvaluationService` resolves an in-rollout user to `true`
  regardless of declared type — there's no weighted multi-variant bucketing (e.g. "30%
  variant A, 20% variant B, rest control") yet. The deterministic bucketing primitive
  the assignment cares most about (`DeterministicRolloutService`) is fully general and
  would extend to multi-variant selection by mapping the same `[0, 100)` bucket to N
  weighted ranges instead of one threshold — that extension just didn't make it into
  this submission's time budget. See [Known gaps](#known-gaps--future-improvements).
- **`context`/targeting attributes are accepted but not yet evaluated.** `/evaluate` and
  `/evaluate/bulk` both accept an arbitrary `context` object (for future
  attribute-based targeting rules, e.g. "50% rollout, but only for `plan: enterprise`"),
  and it's validated and threaded through today, but the evaluation engine's rollout
  decision currently depends only on `userId`. Accepting the shape now means adding
  targeting-rule evaluation later won't be a breaking API change.
- **Real-time distribution (SSE/WebSocket) — not implemented.** Explicitly called out in
  the assignment as a bonus, to build only if time remained after the core requirements
  were solid; it wasn't reached. The caching design (tag-based invalidation per flag)
  would extend naturally to it — an SSE endpoint could subscribe to the same
  invalidation event a flag update already fires, rather than needing a second
  notification mechanism.
- **CORS is fully open (`origin: '*'`).** This is an internal platform API authenticated
  by a per-tenant API key, not cookie/session-based auth, so an open CORS policy doesn't
  expose a CSRF-style risk the way it would for a cookie-authenticated app — but it is
  looser than a production platform service would typically want, and tightening it to
  an explicit allowlist (already partially wired: `cors_origins` is a Terraform variable
  passed through to Cloud Run) is a small, low-risk follow-up.
- **Rate-limit counters are in-memory, not Redis-backed**, which is correct for the
  current single-instance deployment (`min_instance_count` can be 0 in staging; Cloud
  Run production defaults to a small instance count) but would under-count once the
  service scales to multiple concurrent instances, since each instance would enforce the
  100 req/60s limit independently rather than sharing one counter. Documented directly
  in `flags.throttler.module.ts`; the fix is a Redis-backed `ThrottlerStorage`, and the
  Redis instance to back it already exists in this stack.

## Known gaps & future improvements

Roughly in the order I'd tackle them:

1. **Automate the deploy step** — a GitHub Actions job (gated on a manual approval for
   the `production` GitHub environment, per the WIF setup already in
   `iac/modules/iam`) that runs the canary sequence from
   [Deployment strategy](#deployment-strategy-cloud-run-traffic-splitting-canary):
   deploy with `--no-traffic`, shift a small percentage, watch the existing Monitoring
   alert policies for a window, then promote — with automatic rollback
   (`update-traffic --to-revisions=<previous>=100`) if the error-rate/latency alerts
   fire during the canary window.
2. **Structured JSON logging with a request/correlation ID** propagated through every
   log line for a request — see [Observability](#observability).
3. **App-level custom metrics** (evaluation latency, evaluations/sec by tenant, cache
   hit ratio, error rate by tenant+endpoint) exported to Cloud Monitoring — the
   dashboard widgets are already provisioned and waiting for this data.
4. **Multi-variant flag evaluation** for `string`/`number` types — weighted bucketing
   over the same deterministic `[0, 100)` bucket space, rather than today's boolean
   on/off gate.
5. **Attribute-based targeting rules** evaluated against the `context` object that
   `/evaluate` already accepts and threads through unused.
6. **Real-time distribution** (SSE/WebSocket) — the assignment's explicit bonus item.
7. **Redis-backed rate-limit storage**, once the service runs as more than one Cloud Run
   instance.
8. **Explicit tenant-isolation and cross-tenant-access e2e tests**, asserting directly
   (not just implicitly) that one tenant's API key can never read or mutate another
   tenant's flags/audit history.

_(A k6 load test script against `/evaluate`, with documented throughput/latency results,
is done — see [Load testing](#load-testing).)_

## Repository layout

```
.
├── assignment-doc/            the take-home assignment spec this README responds to
├── docker/                    Dockerfile + docker-compose stack for local dev
├── iac/                       Terraform — see iac/README.md for the full module breakdown
├── .github/workflows/ci.yml   format → lint → build → {test, test-e2e} → docker-publish
└── packages/
    ├── domain/                framework-free business logic (entities, use cases,
    │                          the deterministic rollout algorithm), built with tsup,
    │                          tested with vitest
    ├── api/                   NestJS HTTP layer, Kysely/Postgres repositories, Redis
    │                          cache, API-key auth, rate limiting; tested with jest
    │                          (unit + e2e)
    └── load-testing/          k6 load test for POST /evaluate, written in TypeScript
                               and bundled with tsup; report.html is the committed
                               output of the run documented in Load testing
```
