import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import { FlagsBaseErrorResponse } from '../types/base.error.response';
import type { RequestWithTenant } from '../security/types/request-with-tenant';

/**
 * Rate-limits per tenant instead of per IP — a tenant's usage is tracked
 * under `req.tenantId` (stamped by `ApiKeyAuthenticationMiddleware`), so
 * their limit is shared across every request they make regardless of source
 * IP, and one tenant's traffic never eats into another's quota.
 *
 * Requests with no resolved tenant yet (currently only `POST /tenants`,
 * since that's how a tenant gets its first API key) fall back to the
 * caller's IP, which is the only identity available at that point.
 *
 * Deliberately does NOT inject `SecurityContext` (request-scoped) to get the
 * tenant — doing so would make this guard request-scoped too, which breaks
 * `ThrottlerGuard`'s own `onModuleInit` (it populates `this.throttlers` from
 * the injected options, but that hook only runs for the app's original
 * singleton instance, never for the fresh per-request instances a
 * request-scoped guard would get — every request would then crash with
 * "this.throttlers is not iterable"). Reading `req.tenantId` directly here
 * keeps the guard singleton-scoped, exactly as `ThrottlerGuard` expects.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: RequestWithTenant): Promise<string> {
    return req.tenantId || req.ip || 'unknown';
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      new FlagsBaseErrorResponse(
        'Too many requests. Please slow down and try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
