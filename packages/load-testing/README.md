# @flags/load-testing

A [k6](https://k6.io) load test for `POST /api/v1/evaluate`, written in TypeScript and
bundled with `tsup` — the same build tool `@flags/domain` uses — into a single JS file
k6 can execute directly. See [Why TypeScript + tsup for a k6 script](#why-typescript--tsup-for-a-k6-script)
for how that bundling actually works, since k6 has no native TypeScript or Node.js
module support.

## Running it

Requires k6 (`brew install k6` / see [k6's install docs](https://grafana.com/docs/k6/latest/set-up/install-k6/))
and a running instance of the API (`docker compose -f docker/docker-compose.yml up -d`
from the repo root, or `bun run dev` in `packages/api`).

```bash
# from packages/load-testing
bun run load-test
```

This builds the TypeScript source with tsup, then runs the compiled bundle with k6.
It always writes an HTML report to `report.html` (open it directly, or run
`bun run load-test:report:open` to open it in your default browser on macOS) alongside
the usual k6 terminal summary.

To point it at the deployed Cloud Run service instead of a local stack:

```bash
bun run build
k6 run -e BASE_URL=https://flags-api-92921455943.us-central1.run.app/api/v1 dist/evaluate.load.test.js
```

### Tunable env vars

| Var                  | Default                        | What it controls                                                                          |
| -------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `BASE_URL`           | `http://localhost:3000/api/v1` | Target API base URL.                                                                      |
| `TENANT_COUNT`       | `20`                           | Tenants provisioned for the sustained scenario (1 VU per tenant).                         |
| `SUSTAINED_HOLD`     | `90s`                          | How long the sustained scenario holds at full VUs (plus a 10s ramp up/down on each side). |
| `RUN_BURST_SCENARIO` | `true`                         | Whether to run the single-tenant throttle-burst scenario after the sustained one.         |
| `BURST_VUS`          | `20`                           | Concurrent VUs hammering one dedicated tenant in the burst scenario.                      |
| `BURST_DURATION`     | `20s`                          | How long the burst scenario runs.                                                         |

## Scenario design

The evaluation endpoint sits behind a **per-tenant** rate limit (100 requests/60s,
`TenantThrottlerGuard` — see the root [README's Security section](../../README.md#security)),
not a per-IP one. A naive single-tenant load test would just measure how fast the
throttle rejects requests, not how the evaluation engine actually performs — so this
script runs two scenarios back to back:

1. **`sustained_multi_tenant`** — provisions `TENANT_COUNT` tenants in `setup()` (each
   with one boolean flag at 50% rollout in `production`), then runs one VU per tenant
   for `SUSTAINED_HOLD` (default 90s, plus ramps), each sleeping ~0.75s between requests
   to stay comfortably under its own tenant's 100 req/60s cap. This is the number that
   matters: real `/evaluate` latency and throughput under concurrent, legitimate,
   multi-tenant traffic, with no 429 noise.
2. **`single_tenant_burst`** — runs after the sustained scenario, hammering one
   dedicated tenant with `BURST_VUS` concurrent VUs and no sleep, deliberately exceeding
   its 100 req/60s cap. This isn't meant to be a "good" throughput number — it exists to
   demonstrate that the noisy-neighbor protection actually engages: one tenant's traffic
   spike gets throttled without the sustained tenants (or anyone else) ever seeing a 429.

Each sustained-scenario VU cycles through `USERS_PER_TENANT` (50) fixed user IDs rather
than random ones, so the same `(flagKey, userId)` cache key repeats within the
evaluation cache's 60s TTL — the cache hit rate reported by the run reflects realistic
repeat-user traffic, not a cold cache on every request.

Thresholds are scoped to the sustained scenario only (`p(95)<300ms`, `p(99)<500ms`,
`check` success rate `>99%`) — the burst scenario is expected to produce a high 429
rate, so it isn't held to the same latency/success bar.

## Results

_Run against the local Docker Compose stack (Postgres + Redis + API, all on one
machine) — see [Infrastructure & deployment](../../README.md#infrastructure--deployment)
for what changes once this runs against the actual Cloud Run + Cloud SQL +
Memorystore deployment (network hops the local run doesn't have)._

**Sustained multi-tenant scenario** (20 tenants, 1 VU each, 110s: 10s ramp up, 90s hold,
10s ramp down):

| Metric               | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| Requests             | 2,619                                                                      |
| Throughput           | ~23.8 req/s aggregate (~1.2 req/s/tenant, under the 1.66 req/s/tenant cap) |
| Latency avg / median | 15.4 ms / 14.4 ms                                                          |
| Latency p90 / p95    | 23.7 ms / 27.7 ms                                                          |
| Latency max          | 42.9 ms                                                                    |
| Check success rate   | 100%                                                                       |
| Cache hit rate       | 38.2% (1,000 / 2,619)                                                      |

Both threshold checks passed (`p(95)<300ms`, `p(99)<500ms`, given a 42.9ms max the p99 is
well inside that bound). At this scale the evaluation path (deterministic hash + Redis
cache lookup) is nowhere near the bottleneck; latency here is mostly HTTP round-trip
overhead on localhost.

**Single-tenant burst scenario** (20 VUs, no sleep, one dedicated tenant, 20s):

**99.9% of requests (119,120 / 119,220) were rejected with `429`** — confirming
`TenantThrottlerGuard` enforces its 100 req/60s cap per tenant under real concurrent
pressure, and does so without affecting the sustained scenario's 20 other tenants
running at the same time.

_Full metrics (percentile breakdowns, per-scenario timelines) are in the generated
`report.html`, not reproduced in full here since they change on every run._

## Why TypeScript + tsup for a k6 script

k6 executes JavaScript directly — no Node.js runtime, no `require()` of npm packages,
no TypeScript support. `k6/http`, `k6/metrics`, etc. are core modules k6's own runtime
resolves natively via `import`; they don't exist as installable packages. So this
package's `tsup.config.ts` bundles `src/evaluate.load.test.ts` into a single
`dist/evaluate.load.test.js` file, but marks `k6`, `k6/http`, `k6/metrics`, `k6/options`,
and the two `https://...` jslib imports (`k6-reporter` for the HTML report, `k6-summary`
for the terminal output) as `external` — tsup/esbuild leave those `import` statements
untouched in the output rather than trying to resolve them, and k6 resolves them itself
at run time (the core ones in-process, the `https://` ones over the network, exactly
like every other k6 script that imports a jslib URL directly). `@types/k6` provides the
TypeScript types for the core modules during development; it never ships in the bundle.

`dts` generation is off in `tsup.config.ts` (unlike `@flags/domain`, which does emit
`.d.ts` — nothing here is imported by another package, so there's no public API to
type-check against downstream), and the build target is `es2019` rather than domain's
`esnext`, since k6 runs on [goja](https://github.com/dop251/goja), a JS engine with less
complete modern-syntax support than a browser or Node.
