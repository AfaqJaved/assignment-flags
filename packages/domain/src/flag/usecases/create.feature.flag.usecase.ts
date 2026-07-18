import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { FlagAlreadyExistsError, InvalidFlagValueError } from '../errors';
import type { CreateFeatureFlagInput, FeatureFlag } from '../feature.flag.entity';

export const ICreateFeatureFlagUseCase = Symbol('ICreateFeatureFlagUseCase');

export interface CreateFeatureFlagUseCase {
  execute(
    input: CreateFeatureFlagInput,
  ): Promise<
    Result<
      FeatureFlag,
      UnauthorizedError | FlagAlreadyExistsError | InvalidFlagValueError | InfrastructureError
    >
  >;
}
