import { AuditLogEntry } from '@flags/domain';
import { AuditLogEntryResponseDto } from '../dto/audit.log.response.dto';

export function toAuditLogEntryResponseDto(
  entry: AuditLogEntry,
): AuditLogEntryResponseDto {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    flagId: entry.flagId,
    flagKey: entry.flagKey,
    environment: entry.environment,
    action: entry.action,
    changes: entry.changes,
    actorId: entry.actorId,
    createdAt: entry.createdAt,
  };
}
