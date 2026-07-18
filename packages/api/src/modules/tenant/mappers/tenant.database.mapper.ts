import { Tenant } from '@flags/domain';
import {
  TenantTableInsert,
  TenantTableSelect,
} from '../../../shared/database/schema/tenant.table';

export class TenantPersistenceMapper {
  public persistenceToDomain(row: TenantTableSelect): Tenant {
    return Tenant.reconstitute({
      id: row.id,
      name: row.name,
      slug: row.slug,
      apiKeyHash: row.api_key_hash,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  public domainToPersistence(tenant: Tenant): TenantTableInsert {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      api_key_hash: tenant.apiKeyHash,
      status: tenant.status,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
    };
  }
}
