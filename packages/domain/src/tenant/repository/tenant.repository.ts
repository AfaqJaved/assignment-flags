import type { ConflictError, InfrastructureError, Result } from '../../shared';
import type { Tenant } from '../tenant.entity';

export interface TenantRepository {
  findById(id: string): Promise<Result<Tenant | null, InfrastructureError>>;
  findBySlug(slug: string): Promise<Result<Tenant | null, InfrastructureError>>;
  findByApiKeyHash(apiKeyHash: string): Promise<Result<Tenant | null, InfrastructureError>>;
  save(tenant: Tenant): Promise<Result<Tenant, InfrastructureError | ConflictError>>;
}

export const ITenantRepository = Symbol('ITenantRepository');
