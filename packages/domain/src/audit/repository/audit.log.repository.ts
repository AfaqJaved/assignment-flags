import type { InfrastructureError, Result } from '../../shared';
import type { AuditLogEntry } from '../audit.log.entry.entity';

export interface AuditLogRepository {
  /** Appends a new entry. Audit logs are append-only — there is no update/delete. */
  append(entry: AuditLogEntry): Promise<Result<AuditLogEntry, InfrastructureError>>;
  findByFlag(
    tenantId: string,
    flagKey: string,
  ): Promise<Result<AuditLogEntry[], InfrastructureError>>;
}

export const IAuditLogRepository = Symbol('IAuditLogRepository');
