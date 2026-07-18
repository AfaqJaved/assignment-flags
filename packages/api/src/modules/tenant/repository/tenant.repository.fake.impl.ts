import {
  ConflictError,
  err,
  InfrastructureError,
  ok,
  Result,
  Tenant,
  TenantRepository,
} from '@flags/domain';
import { TENANT_TEST_DATA } from './tenant.test.data';

export class TenantRepositoryTestImpl implements TenantRepository {
  async findById(
    id: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    await Promise.resolve();
    return ok(TENANT_TEST_DATA.find((tenant) => tenant.id === id) ?? null);
  }

  async findBySlug(
    slug: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    await Promise.resolve();
    return ok(TENANT_TEST_DATA.find((tenant) => tenant.slug === slug) ?? null);
  }

  async findByApiKeyHash(
    apiKeyHash: string,
  ): Promise<Result<Tenant | null, InfrastructureError>> {
    await Promise.resolve();
    return ok(
      TENANT_TEST_DATA.find((tenant) => tenant.apiKeyHash === apiKeyHash) ??
        null,
    );
  }

  async save(
    tenant: Tenant,
  ): Promise<Result<Tenant, InfrastructureError | ConflictError>> {
    await Promise.resolve();

    const index = TENANT_TEST_DATA.findIndex((item) => item.id === tenant.id);
    if (index !== -1) {
      TENANT_TEST_DATA[index] = tenant;
      return ok(tenant);
    }

    const slugTaken = TENANT_TEST_DATA.some(
      (item) => item.slug === tenant.slug,
    );
    if (slugTaken) {
      return err<ConflictError>({
        kind: 'conflict',
        message: 'A tenant with this slug or API key already exists',
        timestamp: new Date(),
        resource: 'Tenant',
        field: 'slug',
      });
    }

    TENANT_TEST_DATA.push(tenant);
    return ok(tenant);
  }
}
