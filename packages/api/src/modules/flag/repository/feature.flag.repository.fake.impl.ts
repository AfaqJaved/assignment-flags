import {
  ConflictError,
  err,
  FeatureFlag,
  FeatureFlagRepository,
  InfrastructureError,
  ListFeatureFlagsFilter,
  ok,
  Result,
} from '@flags/domain';
import { FEATURE_FLAG_TEST_DATA } from './feature.flag.test.data';

export class FeatureFlagRepositoryTestImpl implements FeatureFlagRepository {
  async findById(
    tenantId: string,
    id: string,
  ): Promise<Result<FeatureFlag | null, InfrastructureError>> {
    await Promise.resolve();
    return ok(
      FEATURE_FLAG_TEST_DATA.find(
        (flag) => flag.tenantId === tenantId && flag.id === id,
      ) ?? null,
    );
  }

  async findByKey(
    tenantId: string,
    key: string,
  ): Promise<Result<FeatureFlag | null, InfrastructureError>> {
    await Promise.resolve();
    return ok(
      FEATURE_FLAG_TEST_DATA.find(
        (flag) => flag.tenantId === tenantId && flag.key === key,
      ) ?? null,
    );
  }

  async findAllByTenant(
    tenantId: string,
    filter?: ListFeatureFlagsFilter,
  ): Promise<Result<FeatureFlag[], InfrastructureError>> {
    await Promise.resolve();

    let flags = FEATURE_FLAG_TEST_DATA.filter(
      (flag) => flag.tenantId === tenantId,
    );

    if (filter?.status) {
      flags = flags.filter((flag) => flag.status === filter.status);
    }

    if (filter?.environment) {
      flags = flags.filter(
        (flag) => flag.getEnvironmentConfig(filter.environment!).enabled,
      );
    }

    return ok(flags);
  }

  async save(
    flag: FeatureFlag,
  ): Promise<Result<FeatureFlag, InfrastructureError | ConflictError>> {
    await Promise.resolve();

    const index = FEATURE_FLAG_TEST_DATA.findIndex(
      (item) => item.id === flag.id,
    );
    if (index !== -1) {
      FEATURE_FLAG_TEST_DATA[index] = flag;
      return ok(flag);
    }

    const keyTaken = FEATURE_FLAG_TEST_DATA.some(
      (item) => item.tenantId === flag.tenantId && item.key === flag.key,
    );
    if (keyTaken) {
      return err<ConflictError>({
        kind: 'conflict',
        message: 'A flag with this key already exists for this tenant',
        timestamp: new Date(),
        resource: 'FeatureFlag',
        field: 'key',
      });
    }

    FEATURE_FLAG_TEST_DATA.push(flag);
    return ok(flag);
  }
}
