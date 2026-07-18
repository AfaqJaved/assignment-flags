import { TenantTable } from './tenant.table';
import { FeatureFlagTable } from './feature.flag.table';
import { AuditLogTable } from './audit.log.table';

export interface FlagsDatabase {
  tenants: TenantTable;
  feature_flags: FeatureFlagTable;
  audit_logs: AuditLogTable;
}
