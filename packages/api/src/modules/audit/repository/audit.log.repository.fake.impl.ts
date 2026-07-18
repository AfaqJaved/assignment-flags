import {
  AuditLogEntry,
  AuditLogRepository,
  InfrastructureError,
  ok,
  Result,
} from '@flags/domain';
import { AUDIT_LOG_TEST_DATA } from './audit.log.test.data';

export class AuditLogRepositoryTestImpl implements AuditLogRepository {
  async append(
    entry: AuditLogEntry,
  ): Promise<Result<AuditLogEntry, InfrastructureError>> {
    await Promise.resolve();
    AUDIT_LOG_TEST_DATA.push(entry);
    return ok(entry);
  }

  async findByFlag(
    tenantId: string,
    flagKey: string,
  ): Promise<Result<AuditLogEntry[], InfrastructureError>> {
    await Promise.resolve();
    return ok(
      AUDIT_LOG_TEST_DATA.filter(
        (entry) => entry.tenantId === tenantId && entry.flagKey === flagKey,
      ),
    );
  }
}
