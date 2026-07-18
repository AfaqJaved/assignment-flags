import type { InfrastructureError, Result } from '../../shared';
import type { TenantAlreadyExistsError } from '../errors';
import type { Tenant } from '../tenant.entity';

export const IRegisterTenantUseCase = Symbol('IRegisterTenantUseCase');

export interface RegisterTenantInput {
  name: string;
  slug: string;
}

/** `apiKey` is the plaintext key, returned only once at registration time. */
export interface RegisterTenantOutput {
  tenant: Tenant;
  apiKey: string;
}

export interface RegisterTenantUseCase {
  execute(
    input: RegisterTenantInput,
  ): Promise<Result<RegisterTenantOutput, TenantAlreadyExistsError | InfrastructureError>>;
}
