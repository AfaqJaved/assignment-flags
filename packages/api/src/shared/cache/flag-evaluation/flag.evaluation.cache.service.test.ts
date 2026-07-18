import { Cacheable } from 'cacheable';
import { FlagEvaluationCacheService } from './flag.evaluation.cache.service';

describe('FlagEvaluationCacheService', () => {
  // in-memory only (no secondary/Redis) — exercises the same tag-based
  // invalidation path the real Redis-backed instance uses
  const createService = () =>
    new FlagEvaluationCacheService(new Cacheable({ tags: true, ttl: '1m' }));

  it('returns undefined on a cache miss', async () => {
    const service = createService();

    const result = await service.get({
      tenantId: 'tenant-1',
      environment: 'production',
      flagKey: 'new-checkout',
      userId: 'user-1',
    });

    expect(result).toBeUndefined();
  });

  it('returns a stored evaluation for the exact same key', async () => {
    const service = createService();
    const key = {
      tenantId: 'tenant-1',
      environment: 'production' as const,
      flagKey: 'new-checkout',
      userId: 'user-1',
    };
    const evaluated = { flagKey: 'new-checkout', value: true, reason: 'rollout' as const };

    await service.set(key, evaluated);

    expect(await service.get(key)).toEqual(evaluated);
  });

  it('keeps entries for different users on the same flag separate', async () => {
    const service = createService();
    const base = {
      tenantId: 'tenant-1',
      environment: 'production' as const,
      flagKey: 'new-checkout',
    };

    await service.set(
      { ...base, userId: 'user-1' },
      { flagKey: 'new-checkout', value: true, reason: 'rollout' },
    );
    await service.set(
      { ...base, userId: 'user-2' },
      { flagKey: 'new-checkout', value: false, reason: 'default' },
    );

    expect(await service.get({ ...base, userId: 'user-1' })).toMatchObject({
      value: true,
    });
    expect(await service.get({ ...base, userId: 'user-2' })).toMatchObject({
      value: false,
    });
  });

  it('invalidate clears every cached user for that flag', async () => {
    const service = createService();
    const base = {
      tenantId: 'tenant-1',
      environment: 'production' as const,
      flagKey: 'new-checkout',
    };

    await service.set(
      { ...base, userId: 'user-1' },
      { flagKey: 'new-checkout', value: true, reason: 'rollout' },
    );
    await service.set(
      { ...base, userId: 'user-2' },
      { flagKey: 'new-checkout', value: false, reason: 'default' },
    );

    await service.invalidate('tenant-1', 'new-checkout');

    expect(await service.get({ ...base, userId: 'user-1' })).toBeUndefined();
    expect(await service.get({ ...base, userId: 'user-2' })).toBeUndefined();
  });

  it('invalidate does not affect a different flag', async () => {
    const service = createService();
    const key = {
      tenantId: 'tenant-1',
      environment: 'production' as const,
      flagKey: 'other-flag',
      userId: 'user-1',
    };
    const evaluated = { flagKey: 'other-flag', value: true, reason: 'rollout' as const };

    await service.set(key, evaluated);
    await service.invalidate('tenant-1', 'new-checkout');

    expect(await service.get(key)).toEqual(evaluated);
  });

  it('invalidate does not affect the same flag key under a different tenant', async () => {
    const service = createService();
    const key = {
      tenantId: 'tenant-2',
      environment: 'production' as const,
      flagKey: 'new-checkout',
      userId: 'user-1',
    };
    const evaluated = { flagKey: 'new-checkout', value: true, reason: 'rollout' as const };

    await service.set(key, evaluated);
    await service.invalidate('tenant-1', 'new-checkout');

    expect(await service.get(key)).toEqual(evaluated);
  });
});
