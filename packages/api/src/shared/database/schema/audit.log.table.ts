import { Selectable, Insertable, JSONColumnType } from 'kysely';
import type { AuditAction, AuditFieldChange, Environment } from '@flags/domain';

/**
 * Audit records are append-only — there is intentionally no `Updateable` export
 * and no `updated_at`/`deleted_at` columns. Once written, a row never changes.
 */
export interface AuditLogTable {
  id: string; // uuid primary key
  tenant_id: string; // references tenants.id
  flag_id: string; // references feature_flags.id
  flag_key: string; // denormalized so history reads don't need a join
  environment: Environment | null; // null for tenant/default-value changes that aren't environment-scoped
  action: AuditAction; // 'flag_created' | 'flag_updated' | 'flag_toggled' | 'flag_archived'
  changes: JSONColumnType<AuditFieldChange[]>;
  actor_id: string; // caller-supplied identifier of who made the change
  created_at: Date;
}

export type AuditLogTableSelect = Selectable<AuditLogTable>;
export type AuditLogTableInsert = Insertable<AuditLogTable>;
