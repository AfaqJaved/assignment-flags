import { describe, it, expect } from 'vitest';
import { DeterministicRolloutService } from './deterministic.rollout.service';

describe('DeterministicRolloutService.bucketFor', () => {
  it('is deterministic for the same flag key and user id', () => {
    const first = DeterministicRolloutService.bucketFor('new-checkout', 'user-42');
    const second = DeterministicRolloutService.bucketFor('new-checkout', 'user-42');
    expect(first).toBe(second);
  });

  it('always falls within [0, 100)', () => {
    for (let i = 0; i < 200; i++) {
      const bucket = DeterministicRolloutService.bucketFor('some-flag', `user-${i}`);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it('differs across flag keys for the same user (no cross-flag correlation)', () => {
    const bucketA = DeterministicRolloutService.bucketFor('flag-a', 'user-1');
    const bucketB = DeterministicRolloutService.bucketFor('flag-b', 'user-1');
    expect(bucketA).not.toBe(bucketB);
  });

  it('spreads users roughly uniformly across the range', () => {
    const buckets = Array.from({ length: 1000 }, (_, i) =>
      DeterministicRolloutService.bucketFor('uniformity-flag', `user-${i}`),
    );
    const inFirstHalf = buckets.filter((bucket) => bucket < 50).length;
    expect(inFirstHalf).toBeGreaterThan(400);
    expect(inFirstHalf).toBeLessThan(600);
  });
});

describe('DeterministicRolloutService.isInRollout', () => {
  it('excludes everyone at 0%', () => {
    expect(DeterministicRolloutService.isInRollout('flag', 'user-1', 0)).toBe(false);
  });

  it('includes everyone at 100%', () => {
    expect(DeterministicRolloutService.isInRollout('flag', 'user-1', 100)).toBe(true);
  });

  it('gives the same user the same result on repeated calls', () => {
    const first = DeterministicRolloutService.isInRollout('flag', 'user-7', 50);
    const second = DeterministicRolloutService.isInRollout('flag', 'user-7', 50);
    expect(first).toBe(second);
  });
});
