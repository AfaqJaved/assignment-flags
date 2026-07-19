/**
 * Load test for POST /api/v1/evaluate.
 *
 * Build + run against a local stack:
 *   bun run load-test
 *
 * Run against the deployed Cloud Run service:
 *   bun run build && k6 run -e BASE_URL=https://flags-api-92921455943.us-central1.run.app/api/v1 dist/evaluate.load.test.js
 *
 * See ../README.md for scenario design, tunable env vars, and results. An
 * HTML report is written to report.html after every run.
 */
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import type { Options } from 'k6/options';
// @ts-expect-error — remote k6 jslib imports, resolved by k6 itself at
// runtime (no HTTP request/network access at the TS/tsup build step).
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
// @ts-expect-error — see above
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TENANT_COUNT = parseInt(__ENV.TENANT_COUNT || '20', 10);
const SUSTAINED_VUS = TENANT_COUNT; // one VU per tenant, so each tenant's own rate limit is the only cap that matters
const SUSTAINED_HOLD = __ENV.SUSTAINED_HOLD || '90s';
const RUN_BURST_SCENARIO = (__ENV.RUN_BURST_SCENARIO || 'true') === 'true';
const BURST_VUS = parseInt(__ENV.BURST_VUS || '20', 10);
const BURST_DURATION = __ENV.BURST_DURATION || '20s';

// per-tenant limit is 100 req/60s (TenantThrottlerGuard); sleeping ~0.75s
// between each VU's requests keeps every sustained-scenario tenant at ~80
// req/min, comfortably under the cap so the sustained numbers reflect real
// evaluation latency rather than 429 backpressure.
const SUSTAINED_SLEEP_SECONDS = 0.75;
const USERS_PER_TENANT = 50;
const FLAG_KEY = 'checkout-rollout';

const evaluationLatency = new Trend('evaluation_latency', true);
const cacheHitRate = new Rate('evaluation_cache_hit_rate');
const rateLimited429 = new Counter('rate_limited_responses');

function toSeconds(durationString: string): number {
  const match = /^(\d+)s$/.exec(durationString);
  if (!match) fail(`unsupported duration format: ${durationString}`);

  // @ts-ignore
  return parseInt(match[1], 10);
}

const rampUp = 10;
const rampDown = 10;
const burstStart = rampUp + toSeconds(SUSTAINED_HOLD) + rampDown + 5;

export const options: Options = {
  scenarios: {
    sustained_multi_tenant: {
      executor: 'ramping-vus',
      exec: 'sustainedEvaluate',
      startVUs: 0,
      stages: [
        { duration: `${rampUp}s`, target: SUSTAINED_VUS },
        { duration: SUSTAINED_HOLD, target: SUSTAINED_VUS },
        { duration: `${rampDown}s`, target: 0 },
      ],
      gracefulRampDown: '5s',
    },
    ...(RUN_BURST_SCENARIO
      ? {
          single_tenant_burst: {
            executor: 'constant-vus',
            exec: 'burstEvaluate',
            vus: BURST_VUS,
            duration: BURST_DURATION,
            startTime: `${burstStart}s`,
          },
        }
      : {}),
  },
  thresholds: {
    'evaluation_latency{scenario:sustained_multi_tenant}': ['p(95)<300', 'p(99)<500'],
    'checks{scenario:sustained_multi_tenant}': ['rate>0.99'],
  },
};

interface SetupData {
  sustainedTenants: string[];
  burstApiKey: string | null;
}

function registerTenant(slug: string): string {
  const res = http.post(
    `${BASE_URL}/tenants`,
    JSON.stringify({ name: `k6 load test ${slug}`, slug }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 201) {
    fail(`tenant registration failed for ${slug}: ${res.status} ${res.body}`);
  }
  return res.json('data.apiKey') as string;
}

function createAndRolloutFlag(apiKey: string): void {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  const createRes = http.post(
    `${BASE_URL}/flags`,
    JSON.stringify({
      key: FLAG_KEY,
      name: 'Checkout rollout',
      type: 'boolean',
      defaultValue: false,
      createdBy: 'k6-load-test',
    }),
    { headers },
  );
  if (createRes.status !== 201) {
    fail(`flag creation failed: ${createRes.status} ${createRes.body}`);
  }

  const updateRes = http.patch(
    `${BASE_URL}/flags/${FLAG_KEY}/environments/production`,
    JSON.stringify({
      enabled: true,
      rolloutPercentage: 50,
      updatedBy: 'k6-load-test',
    }),
    { headers },
  );
  if (updateRes.status !== 200) {
    fail(`flag rollout update failed: ${updateRes.status} ${updateRes.body}`);
  }
}

// setup() runs once, single-threaded, before any VU starts — this is where
// tenants/flags get provisioned so the timed scenarios below only ever
// exercise /evaluate itself, not registration overhead.
export function setup(): SetupData {
  const sustainedTenants: string[] = [];
  for (let i = 0; i < TENANT_COUNT; i++) {
    const slug = `k6-lt-${Date.now()}-${i}`;
    const apiKey = registerTenant(slug);
    createAndRolloutFlag(apiKey);
    sustainedTenants.push(apiKey);
  }

  let burstApiKey: string | null = null;
  if (RUN_BURST_SCENARIO) {
    const slug = `k6-lt-burst-${Date.now()}`;
    burstApiKey = registerTenant(slug);
    createAndRolloutFlag(burstApiKey);
  }

  return { sustainedTenants, burstApiKey };
}

export function sustainedEvaluate(data: SetupData): void {
  const apiKey = data.sustainedTenants[__VU % data.sustainedTenants.length];
  const userId = `user-${__VU}-${__ITER % USERS_PER_TENANT}`;

  const res = http.post(
    `${BASE_URL}/evaluate`,
    JSON.stringify({
      environment: 'production',
      userId,
      flagKeys: [FLAG_KEY],
    }),
    {
      // @ts-ignore
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      tags: { scenario: 'sustained_multi_tenant' },
    },
  );

  evaluationLatency.add(res.timings.duration, {
    scenario: 'sustained_multi_tenant',
  });

  const ok = check(
    res,
    { 'sustained: status is 200': (r) => r.status === 200 },
    { scenario: 'sustained_multi_tenant' },
  );

  if (ok) {
    const body = res.json('data.0') as { cacheHit?: boolean } | null;
    cacheHitRate.add(body ? body.cacheHit === true : false);
  }

  sleep(SUSTAINED_SLEEP_SECONDS);
}

// deliberately hammers a single dedicated tenant past its 100 req/60s cap
// with no sleep between iterations, to demonstrate the per-tenant throttle
// (not per-IP) actually engages under concurrent load from one noisy tenant.
export function burstEvaluate(data: SetupData): void {
  const userId = `burst-user-${__VU}`;

  const res = http.post(
    `${BASE_URL}/evaluate`,
    JSON.stringify({
      environment: 'production',
      userId,
      flagKeys: [FLAG_KEY],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': data.burstApiKey!,
      },
      tags: { scenario: 'single_tenant_burst' },
    },
  );

  check(
    res,
    {
      'burst: status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    },
    { scenario: 'single_tenant_burst' },
  );

  if (res.status === 429) rateLimited429.add(1);
}

// k6 calls this once at the end of the run instead of its default text
// summary — returning multiple keys writes multiple files/streams in one go.
export function handleSummary(data: object): Record<string, string> {
  return {
    'report.html': htmlReport(data) as string,
    stdout: textSummary(data, { indent: ' ', enableColors: true }) as string,
  };
}
