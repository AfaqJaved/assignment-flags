import type { InfrastructureError, Result } from '../../shared';
import type { InvalidApiKeyError, TenantSuspendedError } from '../errors';
import type { Tenant } from '../tenant.entity';

export const IAuthenticateTenantUseCase = Symbol('IAuthenticateTenantUseCase');

export interface AuthenticateTenantUseCase {
  execute(
    apiKey: string,
  ): Promise<Result<Tenant, InvalidApiKeyError | TenantSuspendedError | InfrastructureError>>;
}
