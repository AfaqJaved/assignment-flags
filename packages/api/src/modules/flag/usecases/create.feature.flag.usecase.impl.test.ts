import { Test, TestingModule } from '@nestjs/testing';
import { IAuditLogRepository, IFeatureFlagRepository } from '@flags/domain';

// Mock uuid to avoid ESM parsing issues
jest.mock('uuid', () => ({
  v7: jest.fn(() => crypto.randomUUID()),
}));

import { SecurityContext } from '../../../shared/security/context/security.context';
import { AuditLogRepositoryTestImpl } from '../../audit/repository/audit.log.repository.fake.impl';
import { AUDIT_LOG_TEST_DATA } from '../../audit/repository/audit.log.test.data';
import { FeatureFlagRepositoryTestImpl } from '../repository/feature.flag.repository.fake.impl';
import { CreateFeatureFlagUseCaseImpl } from './create.feature.flag.usecase.impl';

describe('CreateFeatureFlagUseCaseImpl', () => {
  const createUseCase = async (): Promise<CreateFeatureFlagUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFeatureFlagUseCaseImpl,
        {
          provide: IFeatureFlagRepository,
          useClass: FeatureFlagRepositoryTestImpl,
        },
        {
          provide: IAuditLogRepository,
          useClass: AuditLogRepositoryTestImpl,
        },
        {
          provide: SecurityContext,
          useValue: { tenantId: 'tenant-acme-1' },
        },
      ],
    }).compile();

    return moduleRef.get(CreateFeatureFlagUseCaseImpl);
  };

  it('creates a new flag, disabled with 0% rollout in every environment', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      id: crypto.randomUUID(),
      tenantId: 'tenant-acme-1',
      key: `beta-search-${Date.now()}`,
      name: 'Beta search',
      type: 'boolean',
      defaultValue: false,
      createdBy: 'user-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('active');
      expect(result.value.getEnvironmentConfig('production').enabled).toBe(
        false,
      );
      expect(
        result.value.getEnvironmentConfig('production').rolloutPercentage,
      ).toBe(0);
    }
  });

  it('records a flag_created audit entry', async () => {
    const useCase = await createUseCase();
    const key = `audit-created-${Date.now()}`;

    const result = await useCase.execute({
      id: crypto.randomUUID(),
      tenantId: 'tenant-acme-1',
      key,
      name: 'Audit created',
      type: 'boolean',
      defaultValue: false,
      createdBy: 'user-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const entries = AUDIT_LOG_TEST_DATA.filter(
      (entry) => entry.tenantId === 'tenant-acme-1' && entry.flagKey === key,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('flag_created');
    expect(entries[0].flagId).toBe(result.value.id);
    expect(entries[0].environment).toBeNull();
    expect(entries[0].changes).toEqual([]);
    expect(entries[0].actorId).toBe('user-1');
  });

  it('rejects a key that is already registered for the tenant', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      id: crypto.randomUUID(),
      tenantId: 'tenant-acme-1',
      key: 'new-checkout',
      name: 'New checkout again',
      type: 'boolean',
      defaultValue: false,
      createdBy: 'user-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('flag_already_exists');
    }
  });

  it('rejects a default value whose runtime type does not match the declared type', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      id: crypto.randomUUID(),
      tenantId: 'tenant-acme-1',
      key: `bad-value-${Date.now()}`,
      name: 'Bad value',
      type: 'boolean',
      defaultValue: 'not-a-boolean',
      createdBy: 'user-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid_flag_value');
    }
  });
});
