/**
 * Per-environment override of a flag's rollout behavior.
 *
 * `rolloutPercentage` drives gradual on/off rollout via deterministic bucketing.
 */
export interface FlagEnvironmentConfig {
  readonly enabled: boolean;
  readonly rolloutPercentage: number;
}
