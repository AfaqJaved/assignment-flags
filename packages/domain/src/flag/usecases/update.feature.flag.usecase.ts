import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { Environment } from '../../tenant/types';
import type {
  FlagArchivedError,
  FlagNotFoundError,
  InvalidFlagValueError,
  InvalidRolloutPercentageError,
} from '../errors';
import type { FeatureFlag } from '../feature.flag.entity';
import type { FlagValue } from '../types';

export const IUpdateFeatureFlagUseCase = Symbol('IUpdateFeatureFlagUseCase');

/**
 * Applies a partial update to a flag. `environment` scopes `enabled`,
 * `rolloutPercentage`, `targetingRules`, and `variants`; `defaultValue`
 * applies across all environments.
 */
export interface UpdateFeatureFlagInput {
  flagKey: string;
  environment: Environment;
  enabled?: boolean;
  rolloutPercentage?: number;
  defaultValue?: FlagValue;
  updatedBy: string;
}

export interface UpdateFeatureFlagUseCase {
  execute(
    input: UpdateFeatureFlagInput,
  ): Promise<
    Result<
      FeatureFlag,
      | FlagNotFoundError
      | UnauthorizedError
      | FlagArchivedError
      | InvalidRolloutPercentageError
      | InvalidFlagValueError
      | InfrastructureError
    >
  >;
}
