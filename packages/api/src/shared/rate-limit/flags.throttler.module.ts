import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantThrottlerGuard } from './tenant.throttler.guard';

// single instance today (see docker/docker-compose.yml — one `api` service,
// no replicas), so in-memory counters are fine; would need Redis-backed
// ThrottlerStorage if this ever runs as more than one instance
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: RATE_LIMIT_WINDOW_MS,
        limit: RATE_LIMIT_MAX_REQUESTS,
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: TenantThrottlerGuard }],
})
export class FlagsThrottlerModule {}
