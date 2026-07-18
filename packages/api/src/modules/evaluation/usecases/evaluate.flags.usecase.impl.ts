import { Inject, Injectable } from '@nestjs/common';
import {
  ENVIRONMENTS,
  err,
  EvaluateFlagsInput,
  EvaluateFlagsUseCase,
  EvaluatedFlag,
  FeatureFlag,
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
  FlagsNotFoundError,
  TenantNotFoundError,
  TenantRepository,
} from '@flags/domain';

@Injectable()
export class EvaluateFlagsUseCaseImpl implements EvaluateFlagsUseCase {
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    @Inject(ITenantRepository)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async execute(
    input: EvaluateFlagsInput,
  ): Promise<
    Result<
      EvaluatedFlag[],
      | TenantNotFoundError
      | EnvironmentNotSupportedError
      | FlagsNotFoundError
      | InfrastructureError
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

    const flags = await this.resolveFlags(input.tenantId, input.flagKeys);

    if (!flags.ok) return err(flags.error);

    return ok(
      flags.value.map((flag) =>
        FlagEvaluationService.evaluate(flag, input.environment, input.context),
      ),
    );
  }

  /** No explicit keys → every active flag for the tenant. Explicit keys → all must exist. */
  private async resolveFlags(
    tenantId: string,
    flagKeys: string[] | undefined,
  ): Promise<Result<FeatureFlag[], FlagsNotFoundError | InfrastructureError>> {
    if (!flagKeys || flagKeys.length === 0)
      return this.flagRepository.findAllByTenant(tenantId, {
        status: 'active',
      });

    const found = await Promise.all(
      flagKeys.map((key) => this.flagRepository.findByKey(tenantId, key)),
    );

    const flags: FeatureFlag[] = [];
    const missingKeys: string[] = [];

    for (let i = 0; i < found.length; i++) {
      const result = found[i];
      if (!result.ok) return err(result.error);
      if (result.value === null) {
        missingKeys.push(flagKeys[i]);
        continue;
      }
      flags.push(result.value);
    }

    if (missingKeys.length > 0)
      return err<FlagsNotFoundError>({
        kind: 'flags_not_found',
        message: 'One or more requested flag keys do not exist',
        timestamp: new Date(),
        keys: missingKeys,
      });

    return ok(flags);
  }
}
