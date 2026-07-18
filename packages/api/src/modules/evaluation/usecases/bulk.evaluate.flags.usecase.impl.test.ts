import { Test, TestingModule } from '@nestjs/testing';
import {
  FeatureFlag,
  IFeatureFlagRepository,
  ITenantRepository,
} from '@flags/domain';
import { FeatureFlagRepositoryTestImpl } from '../../flag/repository/feature.flag.repository.fake.impl';
import { FEATURE_FLAG_TEST_DATA } from '../../flag/repository/feature.flag.test.data';
import { TenantRepositoryTestImpl } from '../../tenant/repository/tenant.repository.fake.impl';
import { BulkEvaluateFlagsUseCaseImpl } from './bulk.evaluate.flags.usecase.impl';

describe('BulkEvaluateFlagsUseCaseImpl', () => {
  const createUseCase = async (): Promise<BulkEvaluateFlagsUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BulkEvaluateFlagsUseCaseImpl,
        {
          provide: IFeatureFlagRepository,
          useClass: FeatureFlagRepositoryTestImpl,
        },
        { provide: ITenantRepository, useClass: TenantRepositoryTestImpl },
      ],
    }).compile();

    return moduleRef.get(BulkEvaluateFlagsUseCaseImpl);
  };

  it('evaluates every active flag for the tenant in one call', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.value.some((entry) => entry.flagKey === 'new-checkout'),
      ).toBe(true);
    }
  });

  it('excludes archived flags', async () => {
    const key = `bulk-archived-${Date.now()}`;
    FEATURE_FLAG_TEST_DATA.push(
      FeatureFlag.create({
        id: crypto.randomUUID(),
        tenantId: 'tenant-acme-1',
        key,
        name: 'Archived for bulk test',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      }).archive('user-1'),
    );

    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.some((entry) => entry.flagKey === key)).toBe(false);
    }
  });

  it('returns environment_not_supported for an unknown environment', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'preprod' as never,
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('environment_not_supported');
    }
  });

  it('returns tenant_not_found for an unknown tenant', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-does-not-exist',
      environment: 'production',
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('tenant_not_found');
    }
  });
});
