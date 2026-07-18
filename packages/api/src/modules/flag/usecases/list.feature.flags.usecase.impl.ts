import { Inject, Injectable } from '@nestjs/common';
import {
  FeatureFlag,
  InfrastructureError,
  IFeatureFlagRepository,
  ListFeatureFlagsInput,
  ListFeatureFlagsUseCase,
  Result,
} from '@flags/domain';
import type { FeatureFlagRepository, UnauthorizedError } from '@flags/domain';

@Injectable()
export class ListFeatureFlagsUseCaseImpl implements ListFeatureFlagsUseCase {
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
  ) {}

  async execute(
    input: ListFeatureFlagsInput,
  ): Promise<Result<FeatureFlag[], UnauthorizedError | InfrastructureError>> {
    // no business logic beyond scoping to the tenant — filtering (status, and
    // environment = "enabled there") is delegated straight to the repository
    return this.flagRepository.findAllByTenant(input.tenantId, {
      environment: input.environment,
      status: input.status,
    });
  }
}
