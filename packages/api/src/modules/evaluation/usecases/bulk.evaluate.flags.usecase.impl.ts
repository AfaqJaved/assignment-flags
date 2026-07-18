import { Inject, Injectable } from '@nestjs/common';
import {
  ENVIRONMENTS,
  err,
  BulkEvaluateFlagsInput,
  BulkEvaluateFlagsUseCase,
  EvaluatedFlag,
  FlagEvaluationService,
  IFeatureFlagRepository,
  ITenantRepository,
  InfrastructureError,
  ok,
  Result,
} from '@flags/domain';
import type {
  EnvironmentNotSupportedError,
  FeatureFlagRepository,
  TenantNotFoundError,
  TenantRepository,
} from '@flags/domain';

@Injectable()
export class BulkEvaluateFlagsUseCaseImpl implements BulkEvaluateFlagsUseCase {
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    @Inject(ITenantRepository)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async execute(
    input: BulkEvaluateFlagsInput,
  ): Promise<
    Result<
      EvaluatedFlag[],
      TenantNotFoundError | EnvironmentNotSupportedError | InfrastructureError
    >
  > {
    if (!ENVIRONMENTS.includes(input.environment))
      return err<EnvironmentNotSupportedError>({
        kind: 'environment_not_supported',
        message: `Unknown environment: ${input.environment}`,
        timestamp: new Date(),
        environment: input.environment,
      });

    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant.ok) return err(tenant.error);

    if (!tenant.value) {
      return err<TenantNotFoundError>({
        kind: 'tenant_not_found',
        message: 'Tenant not found',
        timestamp: new Date(),
        by: 'id',
        value: input.tenantId,
      });
    }

    // deliberately unfiltered by environment — disabled flags still need to
    // resolve to their default value in the response, not be omitted
    const flags = await this.flagRepository.findAllByTenant(input.tenantId, {
      status: 'active',
    });
    if (!flags.ok) return err(flags.error);

    return ok(
      flags.value.map((flag) =>
        FlagEvaluationService.evaluate(flag, input.environment, input.context),
      ),
    );
  }
}
