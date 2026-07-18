import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { FlagNotFoundError } from '../errors';
import type { FeatureFlag } from '../feature.flag.entity';

export const IArchiveFeatureFlagUseCase = Symbol('IArchiveFeatureFlagUseCase');

export interface ArchiveFeatureFlagInput {
  flagKey: string;
  archivedBy: string;
}

export interface ArchiveFeatureFlagUseCase {
  execute(
    input: ArchiveFeatureFlagInput,
  ): Promise<Result<FeatureFlag, UnauthorizedError | FlagNotFoundError | InfrastructureError>>;
}
