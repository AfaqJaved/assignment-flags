import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  err,
  InfrastructureError,
  ITenantRepository,
  ok,
  RegisterTenantInput,
  RegisterTenantOutput,
  RegisterTenantUseCase,
  Result,
  Tenant,
  TenantAlreadyExistsError,
} from '@flags/domain';
import type { TenantRepository } from '@flags/domain';
import { v7 as uuidv7 } from 'uuid';
import { ApiKeyHashingService } from '../../../shared/security/hashing/api.key.hashing.service';

@Injectable()
export class RegisterTenantUseCaseImpl implements RegisterTenantUseCase {
  constructor(
    @Inject(ITenantRepository)
    private readonly tenantRepository: TenantRepository,
    private readonly apiKeyHashingService: ApiKeyHashingService,
  ) {}

  async execute(
    input: RegisterTenantInput,
  ): Promise<
    Result<RegisterTenantOutput, TenantAlreadyExistsError | InfrastructureError>
  > {
    const existing = await this.tenantRepository.findBySlug(input.slug);

    if (!existing.ok) return err(existing.error);

    if (existing.value) {
      return err<TenantAlreadyExistsError>({
        kind: 'tenant_already_exists',
        message: 'A tenant with this slug already exists',
        field: 'slug',
        timestamp: new Date(),
      });
    }

    const apiKey = this.generateApiKey();

    const apiKeyHash = this.apiKeyHashingService.hash(apiKey);

    const tenant = Tenant.create({
      id: uuidv7(),
      name: input.name,
      slug: input.slug,
      apiKeyHash,
    });

    const saved = await this.tenantRepository.save(tenant);
    if (!saved.ok) {
      if (saved.error.kind === 'conflict') {
        return err<TenantAlreadyExistsError>({
          kind: 'tenant_already_exists',
          message: 'A tenant with this slug already exists',
          field: 'slug',
          timestamp: new Date(),
        });
      }
      return err(saved.error);
    }

    return ok({ tenant: saved.value, apiKey });
  }

  /** `sk_` prefix makes leaked keys greppable/identifiable in logs, same idea as Stripe's `sk_live_...`. */
  private generateApiKey(): string {
    return `sk_${randomBytes(32).toString('hex')}`;
  }
}
