import { Inject, Injectable } from '@nestjs/common';
import {
  AuthenticateTenantUseCase,
  err,
  InfrastructureError,
  InvalidApiKeyError,
  ITenantRepository,
  ok,
  Result,
  Tenant,
  TenantSuspendedError,
} from '@flags/domain';
import type { TenantRepository } from '@flags/domain';
import { ApiKeyHashingService } from '../../../shared/security/hashing/api.key.hashing.service';

@Injectable()
export class AuthenticateTenantUseCaseImpl implements AuthenticateTenantUseCase {
  constructor(
    @Inject(ITenantRepository)
    private readonly tenantRepository: TenantRepository,
    private readonly apiKeyHashingService: ApiKeyHashingService,
  ) {}

  async execute(
    apiKey: string,
  ): Promise<
    Result<
      Tenant,
      InvalidApiKeyError | TenantSuspendedError | InfrastructureError
    >
  > {
    const apiKeyHash = this.apiKeyHashingService.hash(apiKey);

    const found = await this.tenantRepository.findByApiKeyHash(apiKeyHash);
    if (!found.ok) return err(found.error);

    if (!found.value) {
      return err<InvalidApiKeyError>({
        kind: 'invalid_api_key',
        message: 'No tenant matches this API key',
        timestamp: new Date(),
      });
    }

    if (!found.value.isActive()) {
      return err<TenantSuspendedError>({
        kind: 'tenant_suspended',
        message: 'This tenant has been suspended',
        timestamp: new Date(),
      });
    }

    return ok(found.value);
  }
}
