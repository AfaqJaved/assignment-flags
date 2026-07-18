import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  err,
  InfrastructureError,
  ok,
  Result,
  Tenant,
  TenantRepository,
} from '@flags/domain';
import { Kysely } from 'kysely';
import { FLAGS_DB } from '../../../shared/database/flags.database.module';
import { isUniqueViolation } from '../../../shared/database/helpers';
import { FlagsDatabase } from '../../../shared/database/schema';
import { TenantPersistenceMapper } from '../mappers/tenant.database.mapper';

@Injectable()
export class TenantRepositoryImpl implements TenantRepository {
  private readonly mapper = new TenantPersistenceMapper();

  constructor(@Inject(FLAGS_DB) private readonly db: Kysely<FlagsDatabase>) {}

  async findById(
    id: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find tenant by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findBySlug(
    slug: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('slug', '=', slug)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find tenant by slug',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findByApiKeyHash(
    apiKeyHash: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('tenants')
        .selectAll()
        .where('api_key_hash', '=', apiKeyHash)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find tenant by api key',
        timestamp: new Date(),
        cause,
      });
    }
  }

  /**
   * Upserts by `id` — the domain layer exposes a single `save` for the whole
   * tenant lifecycle (register, suspend, rotate key), so this must handle
   * both the initial insert and later updates of the same row.
   */
  async save(
    tenant: Tenant,
  ): Promise<Result<Tenant, InfrastructureError | ConflictError>> {
    try {
      const row = await this.db
        .insertInto('tenants')
        .values(this.mapper.domainToPersistence(tenant))
        .onConflict((oc) =>
          oc.column('id').doUpdateSet((eb) => ({
            name: eb.ref('excluded.name'),
            slug: eb.ref('excluded.slug'),
            api_key_hash: eb.ref('excluded.api_key_hash'),
            status: eb.ref('excluded.status'),
            updated_at: eb.ref('excluded.updated_at'),
          })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        return err<ConflictError>({
          kind: 'conflict',
          message: 'A tenant with this slug or API key already exists',
          timestamp: new Date(),
          resource: 'Tenant',
          field: 'slug',
        });
      }

      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save tenant',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
