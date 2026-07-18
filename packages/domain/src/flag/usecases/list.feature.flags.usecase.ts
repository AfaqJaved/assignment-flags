import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { Environment } from '../../tenant/types';
import type { FeatureFlag } from '../feature.flag.entity';
import type { FlagStatus } from '../types';

export const IListFeatureFlagsUseCase = Symbol('IListFeatureFlagsUseCase');

export interface ListFeatureFlagsInput {
  tenantId: string;
  environment?: Environment;
  status?: FlagStatus;
}

export interface ListFeatureFlagsUseCase {
  execute(
    input: ListFeatureFlagsInput,
  ): Promise<Result<FeatureFlag[], UnauthorizedError | InfrastructureError>>;
}
