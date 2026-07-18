import type { Environment } from '../../tenant/types';

/** Fired whenever a flag's rollout config, targeting rules, or default value change. Real-time subscribers key off this to push updates to clients. */
export interface FlagUpdatedEvent {
  tenantId: string;
  flagId: string;
  flagKey: string;
  environment: Environment | null;
}
