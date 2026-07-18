import type { ConflictError, InfrastructureError, Result } from '../../shared';
import type { Environment } from '../../tenant/types';
import type { FeatureFlag } from '../feature.flag.entity';
import type { FlagStatus } from '../types';

export interface ListFeatureFlagsFilter {
  environment?: Environment;
  status?: FlagStatus;
}

export interface FeatureFlagRepository {
  findById(tenantId: string, id: string): Promise<Result<FeatureFlag | null, InfrastructureError>>;
  findByKey(
    tenantId: string,
    key: string,
  ): Promise<Result<FeatureFlag | null, InfrastructureError>>;
  findAllByTenant(
    tenantId: string,
    filter?: ListFeatureFlagsFilter,
  ): Promise<Result<FeatureFlag[], InfrastructureError>>;
  save(flag: FeatureFlag): Promise<Result<FeatureFlag, InfrastructureError | ConflictError>>;
}

export const IFeatureFlagRepository = Symbol('IFeatureFlagRepository');
