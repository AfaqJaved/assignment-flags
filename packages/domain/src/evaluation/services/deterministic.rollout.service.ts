const BUCKET_SPACE = 10_000;

/** FNV-1a 32-bit hash — fast, dependency-free, and stable across runs/platforms. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministically buckets a `flagKey` + `userId` pair into a `[0, 100)`
 * range so the same user always lands in the same bucket for a given flag,
 * satisfying the "sticky" percentage-rollout requirement without any
 * persisted assignment state.
 */
export class DeterministicRolloutService {
  /** Two-decimal-precision bucket in `[0, 100)`. */
  static bucketFor(flagKey: string, userId: string): number {
    const hash = fnv1a(`${flagKey}:${userId}`);
    return (hash % BUCKET_SPACE) / (BUCKET_SPACE / 100);
  }

  static isInRollout(flagKey: string, userId: string, rolloutPercentage: number): boolean {
    if (rolloutPercentage <= 0) return false;
    if (rolloutPercentage >= 100) return true;
    return DeterministicRolloutService.bucketFor(flagKey, userId) < rolloutPercentage;
  }
}
