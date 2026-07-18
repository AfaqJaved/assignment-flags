import type { EvaluatedFlag } from '@flags/domain';
import type { EvaluationCacheKey } from './flag.evaluation.cache.service';

/** In-memory test double — mirrors the real service's tag-based invalidation without Redis. */
export class FlagEvaluationCacheServiceTestImpl {
  private readonly store = new Map<string, EvaluatedFlag>();
  readonly invalidatedTenantsAndFlagKeys: Array<{
    tenantId: string;
    flagKey: string;
  }> = [];

  async get(key: EvaluationCacheKey): Promise<EvaluatedFlag | undefined> {
    await Promise.resolve();
    return this.store.get(this.cacheKey(key));
  }

  async set(key: EvaluationCacheKey, evaluated: EvaluatedFlag): Promise<void> {
    await Promise.resolve();
    this.store.set(this.cacheKey(key), evaluated);
  }

  async invalidate(tenantId: string, flagKey: string): Promise<void> {
    await Promise.resolve();
    this.invalidatedTenantsAndFlagKeys.push({ tenantId, flagKey });
    for (const storeKey of this.store.keys()) {
      if (storeKey.startsWith(`${tenantId}:`) && storeKey.includes(`:${flagKey}:`)) {
        this.store.delete(storeKey);
      }
    }
  }

  private cacheKey({
    tenantId,
    environment,
    flagKey,
    userId,
  }: EvaluationCacheKey): string {
    return `${tenantId}:${environment}:${flagKey}:${userId}`;
  }
}
