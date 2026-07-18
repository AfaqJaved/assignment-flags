import { Inject, Injectable } from '@nestjs/common';
import type { Cacheable } from 'cacheable';
import type { EvaluatedFlag, Environment } from '@flags/domain';
import { CACHE } from '../cache.tokens';

const EVALUATION_TTL = '60s';

export interface EvaluationCacheKey {
  tenantId: string;
  environment: Environment;
  flagKey: string;
  userId: string;
}

/**
 * Caches per-user flag evaluation results.
 *
 * Keyed by tenant + environment + flag + user — not just flag key — because the
 * resolved value depends on all four: a flag's deterministic rollout bucket is a
 * function of (flagKey, userId), so caching by flagKey alone would pin whichever
 * user asks first as the cached value for every other user on a partial rollout.
 *
 * Invalidation is tag-based (via `cacheable`'s built-in tag support): every entry
 * written for a flag is tagged with that flag's tag, so a single `invalidate` call
 * marks every cached user's result for that flag stale in one shot, without having
 * to enumerate or track individual per-user keys.
 */
@Injectable()
export class FlagEvaluationCacheService {
  constructor(@Inject(CACHE) private readonly cache: Cacheable) {}

  async get(key: EvaluationCacheKey): Promise<EvaluatedFlag | undefined> {
    return this.cache.get<EvaluatedFlag>(this.cacheKey(key));
  }

  async set(key: EvaluationCacheKey, evaluated: EvaluatedFlag): Promise<void> {
    await this.cache.set(this.cacheKey(key), evaluated, {
      ttl: EVALUATION_TTL,
      tags: [this.flagTag(key.tenantId, key.flagKey)],
    });
  }

  /** Invalidates every cached evaluation for this flag, across every environment and user. */
  async invalidate(tenantId: string, flagKey: string): Promise<void> {
    await this.cache.tags.invalidateTag(this.flagTag(tenantId, flagKey));
  }

  private cacheKey({
    tenantId,
    environment,
    flagKey,
    userId,
  }: EvaluationCacheKey): string {
    return `flag-eval:${tenantId}:${environment}:${flagKey}:${userId}`;
  }

  private flagTag(tenantId: string, flagKey: string): string {
    return `flag-eval-tag:${tenantId}:${flagKey}`;
  }
}
