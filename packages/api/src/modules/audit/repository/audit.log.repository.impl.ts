import { Inject, Injectable } from '@nestjs/common';
import {
  AuditLogEntry,
  AuditLogRepository,
  err,
  InfrastructureError,
  ok,
  Result,
} from '@flags/domain';
import { Kysely } from 'kysely';
import { FLAGS_DB } from '../../../shared/database/flags.database.module';
import { FlagsDatabase } from '../../../shared/database/schema';
import { AuditLogPersistenceMapper } from '../mappers/audit.log.database.mapper';

@Injectable()
export class AuditLogRepositoryImpl implements AuditLogRepository {
  private readonly mapper = new AuditLogPersistenceMapper();

  constructor(@Inject(FLAGS_DB) private readonly db: Kysely<FlagsDatabase>) {}

  /** Audit records are append-only — there is intentionally no update/delete path. */
  async append(
    entry: AuditLogEntry,
  ): Promise<Result<AuditLogEntry, InfrastructureError>> {
    try {
      const row = await this.db
        .insertInto('audit_logs')
        .values(this.mapper.domainToPersistence(entry))
        .returningAll()
        .executeTakeFirstOrThrow();

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to append audit log entry',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findByFlag(
    tenantId: string,
    flagKey: string,
  ): Promise<Result<AuditLogEntry[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('audit_logs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('flag_key', '=', flagKey)
        .orderBy('created_at', 'desc')
        .execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to load flag history',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
