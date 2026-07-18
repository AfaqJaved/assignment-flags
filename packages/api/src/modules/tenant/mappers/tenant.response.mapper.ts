import { Tenant } from '@flags/domain';
import { TenantResponseDto } from '../dto/tenant.response.dto';

export function toTenantResponseDto(tenant: Tenant): TenantResponseDto {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}
