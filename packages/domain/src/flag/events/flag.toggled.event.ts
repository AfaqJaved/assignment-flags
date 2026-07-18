import type { Environment } from '../../tenant/types';

export interface FlagToggledEvent {
  tenantId: string;
  flagId: string;
  flagKey: string;
  environment: Environment;
  enabled: boolean;
}
