import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  err,
  FeatureFlag,
  FeatureFlagRepository,
  InfrastructureError,
  ListFeatureFlagsFilter,
  ok,
  Result,
} from '@flags/domain';
import { Kysely, sql } from 'kysely';
import { FLAGS_DB } from '../../../shared/database/flags.database.module';
import { isUniqueViolation } from '../../../shared/database/helpers';
import { FlagsDatabase } from '../../../shared/database/schema';
import { FeatureFlagPersistenceMapper } from '../mappers/feature.flag.database.mapper';

@Injectable()
export class FeatureFlagRepositoryImpl implements FeatureFlagRepository {
  private readonly mapper = new FeatureFlagPersistenceMapper();

  constructor(@Inject(FLAGS_DB) private readonly db: Kysely<FlagsDatabase>) {}

  async findById(
    tenantId: string,
    id: string,
  ): Promise<Result<FeatureFlag | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('feature_flags')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find flag by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findByKey(
    tenantId: string,
    key: string,
  ): Promise<Result<FeatureFlag | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('feature_flags')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('key', '=', key)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find flag by key',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByTenant(
    tenantId: string,
    filter?: ListFeatureFlagsFilter,
  ): Promise<Result<FeatureFlag[], InfrastructureError>> {
    try {
      let query = this.db
        .selectFrom('feature_flags')
        .selectAll()
        .where('tenant_id', '=', tenantId);

      if (filter?.status) {
        query = query.where('status', '=', filter.status);
      }

      if (filter?.environment) {
        query = query.where(
          sql<boolean>`(environments -> ${sql.lit(filter.environment)} ->> 'enabled')::boolean = true`,
        );
      }

      const rows = await query.orderBy('created_at', 'desc').execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to list flags',
        timestamp: new Date(),
        cause,
      });
    }
  }

  /**
   * Upserts by `id` — the domain layer exposes a single `save` for the whole
   * flag lifecycle (create, toggle, update, archive), so this must handle
   * both the initial insert and later updates of the same row.
   */
  async save(
    flag: FeatureFlag,
  ): Promise<Result<FeatureFlag, InfrastructureError | ConflictError>> {
    try {
      const row = await this.db
        .insertInto('feature_flags')
        .values(this.mapper.domainToPersistence(flag))
        .onConflict((oc) =>
          oc.column('id').doUpdateSet((eb) => ({
            key: eb.ref('excluded.key'),
            name: eb.ref('excluded.name'),
            description: eb.ref('excluded.description'),
            type: eb.ref('excluded.type'),
            default_value: eb.ref('excluded.default_value'),
            status: eb.ref('excluded.status'),
            environments: eb.ref('excluded.environments'),
            updated_at: eb.ref('excluded.updated_at'),
            updated_by: eb.ref('excluded.updated_by'),
          })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        return err<ConflictError>({
          kind: 'conflict',
          message: 'A flag with this key already exists for this tenant',
          timestamp: new Date(),
          resource: 'FeatureFlag',
          field: 'key',
        });
      }

      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save flag',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
