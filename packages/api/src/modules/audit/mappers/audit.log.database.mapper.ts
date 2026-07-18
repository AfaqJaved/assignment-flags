import { AuditLogEntry } from '@flags/domain';
import {
  AuditLogTableInsert,
  AuditLogTableSelect,
} from '../../../shared/database/schema/audit.log.table';

export class AuditLogPersistenceMapper {
  public persistenceToDomain(row: AuditLogTableSelect): AuditLogEntry {
    return AuditLogEntry.reconstitute({
      id: row.id,
      tenantId: row.tenant_id,
      flagId: row.flag_id,
      flagKey: row.flag_key,
      environment: row.environment,
      action: row.action,
      changes: row.changes,
      actorId: row.actor_id,
      createdAt: row.created_at,
    });
  }

  public domainToPersistence(entry: AuditLogEntry): AuditLogTableInsert {
    return {
      id: entry.id,
      tenant_id: entry.tenantId,
      flag_id: entry.flagId,
      flag_key: entry.flagKey,
      environment: entry.environment,
      action: entry.action,
      changes: JSON.stringify(entry.changes),
      actor_id: entry.actorId,
      created_at: entry.createdAt,
    };
  }
}
