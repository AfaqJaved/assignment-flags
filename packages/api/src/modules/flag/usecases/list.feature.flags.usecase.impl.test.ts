import { Test, TestingModule } from '@nestjs/testing';
import { IFeatureFlagRepository } from '@flags/domain';
import { SecurityContext } from '../../../shared/security/context/security.context';
import { FeatureFlagRepositoryTestImpl } from '../repository/feature.flag.repository.fake.impl';
import { ListFeatureFlagsUseCaseImpl } from './list.feature.flags.usecase.impl';

describe('ListFeatureFlagsUseCaseImpl', () => {
  const createUseCase = async (
    tenantId = 'tenant-acme-1',
  ): Promise<ListFeatureFlagsUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ListFeatureFlagsUseCaseImpl,
        {
          provide: IFeatureFlagRepository,
          useClass: FeatureFlagRepositoryTestImpl,
        },
        {
          provide: SecurityContext,
          useValue: { tenantId },
        },
      ],
    }).compile();

    return moduleRef.get(ListFeatureFlagsUseCaseImpl);
  };

  it('lists every flag for the tenant', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({ tenantId: 'tenant-acme-1' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.some((flag) => flag.key === 'new-checkout')).toBe(
        true,
      );
    }
  });

  it('returns an empty list for a tenant with no flags', async () => {
    const useCase = await createUseCase('tenant-with-no-flags');

    const result = await useCase.execute({ tenantId: 'tenant-with-no-flags' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });
});
