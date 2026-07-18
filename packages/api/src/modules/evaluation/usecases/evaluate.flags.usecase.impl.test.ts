import { Test, TestingModule } from '@nestjs/testing';
import {
  FeatureFlag,
  IFeatureFlagRepository,
  ITenantRepository,
} from '@flags/domain';
import { FeatureFlagRepositoryTestImpl } from '../../flag/repository/feature.flag.repository.fake.impl';
import { FEATURE_FLAG_TEST_DATA } from '../../flag/repository/feature.flag.test.data';
import { TenantRepositoryTestImpl } from '../../tenant/repository/tenant.repository.fake.impl';
import { EvaluateFlagsUseCaseImpl } from './evaluate.flags.usecase.impl';

describe('EvaluateFlagsUseCaseImpl', () => {
  const createUseCase = async (): Promise<EvaluateFlagsUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateFlagsUseCaseImpl,
        {
          provide: IFeatureFlagRepository,
          useClass: FeatureFlagRepositoryTestImpl,
        },
        { provide: ITenantRepository, useClass: TenantRepositoryTestImpl },
      ],
    }).compile();

    return moduleRef.get(EvaluateFlagsUseCaseImpl);
  };

  it('evaluates every active flag when flagKeys is omitted', async () => {
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
      const newCheckout = result.value.find(
        (entry) => entry.flagKey === 'new-checkout',
      )!;
      // disabled in every environment by default (see FEATURE_FLAG_TEST_DATA) → falls back to default
      expect(newCheckout).toMatchObject({
        value: false,
        reason: 'flag_disabled',
      });
    }
  });

  it('evaluates only the requested flagKeys', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      flagKeys: ['new-checkout'],
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].flagKey).toBe('new-checkout');
    }
  });

  it('returns flags_not_found when a requested key does not exist', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      flagKeys: ['new-checkout', 'does-not-exist'],
      context: { userId: 'user-1', attributes: {} },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('flags_not_found');
      if (result.error.kind === 'flags_not_found') {
        expect(result.error.keys).toEqual(['does-not-exist']);
      }
    }
  });

  it('returns environment_not_supported for an unknown environment', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      tenantId: 'tenant-acme-1',
      // deliberately invalid — bypasses DTO validation to exercise the use-case guard directly
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

  it('deterministically resolves the same rollout bucket for the same userId', async () => {
    const key = `deterministic-${Date.now()}`;
    FEATURE_FLAG_TEST_DATA.push(
      FeatureFlag.create({
        id: crypto.randomUUID(),
        tenantId: 'tenant-acme-1',
        key,
        name: 'Deterministic rollout',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
        .toggle('production', true, 'user-1')
        .updateRolloutPercentage('production', 50, 'user-1'),
    );

    const useCase = await createUseCase();

    const first = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      flagKeys: [key],
      context: { userId: 'sticky-user', attributes: {} },
    });
    const second = await useCase.execute({
      tenantId: 'tenant-acme-1',
      environment: 'production',
      flagKeys: [key],
      context: { userId: 'sticky-user', attributes: {} },
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value[0]).toEqual(second.value[0]);
    }
  });
});
