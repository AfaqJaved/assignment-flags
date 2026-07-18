import { Selectable, Insertable, Updateable } from 'kysely';
import type {
  Environment,
  FlagEnvironmentConfig,
  FlagStatus,
  FlagType,
  FlagValue,
} from '@flags/domain';

export interface FeatureFlagTable {
  id: string; // uuid primary key
  tenant_id: string; // references tenants.id; flag keys are only unique within a tenant
  key: string; // machine-readable identifier, e.g. "new-checkout"
  name: string; // human-readable display name
  description: string | null;
  type: FlagType; // 'boolean' | 'string' | 'number'
  default_value: FlagValue; // fallback value when a flag is disabled/archived
  status: FlagStatus; // 'active' | 'archived' (archiving is a soft-delete)
  environments: Record<Environment, FlagEnvironmentConfig>; // per-environment rollout/targeting config
  // audit
  created_at: Date;
  created_by: string; // caller-supplied actor identifier; there is no separate users table
  updated_at: Date;
  updated_by: string;
}

export type FeatureFlagTableSelect = Selectable<FeatureFlagTable>;
export type FeatureFlagTableInsert = Insertable<FeatureFlagTable>;
export type FeatureFlagTableUpdate = Updateable<FeatureFlagTable>;
