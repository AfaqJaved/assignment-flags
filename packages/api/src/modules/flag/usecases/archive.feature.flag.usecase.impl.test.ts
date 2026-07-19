import { Test, TestingModule } from '@nestjs/testing';
import {
  FeatureFlag,
  IAuditLogRepository,
  IFeatureFlagRepository,
  ok,
} from '@flags/domain';

// Mock uuid to avoid ESM parsing issues
jest.mock('uuid', () => ({
  v7: jest.fn(() => crypto.randomUUID()),
}));

import { SecurityContext } from '../../../shared/security/context/security.context';
import { FlagEvaluationCacheService } from '../../../shared/cache/flag-evaluation/flag.evaluation.cache.service';
import { FlagEvaluationCacheServiceTestImpl } from '../../../shared/cache/flag-evaluation/flag.evaluation.cache.service.fake.impl';
import { AuditLogRepositoryTestImpl } from '../../audit/repository/audit.log.repository.fake.impl';
import { AUDIT_LOG_TEST_DATA } from '../../audit/repository/audit.log.test.data';
import { FeatureFlagRepositoryTestImpl } from '../repository/feature.flag.repository.fake.impl';
import { FEATURE_FLAG_TEST_DATA } from '../repository/feature.flag.test.data';
import { ArchiveFeatureFlagUseCaseImpl } from './archive.feature.flag.usecase.impl';

/**
 * `findByKey` normally scopes its query by tenant, so a flag belonging to
 * another tenant can never actually be returned here — this stub ignores
 * that scope on purpose, to exercise the use case's own tenantId-vs-record
 * guard, which only matters if the repository itself ever stops scoping
 * correctly.
 */
class CrossTenantLeakFeatureFlagRepositoryStub extends FeatureFlagRepositoryTestImpl {
  async findByKey(_tenantId: string, key: string) {
    await Promise.resolve();
    return ok(FEATURE_FLAG_TEST_DATA.find((flag) => flag.key === key) ?? null);
  }
}

describe('ArchiveFeatureFlagUseCaseImpl', () => {
  const createModule = async (): Promise<TestingModule> =>
    Test.createTestingModule({
      providers: [
        ArchiveFeatureFlagUseCaseImpl,
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
        {
          provide: FlagEvaluationCacheService,
          useClass: FlagEvaluationCacheServiceTestImpl,
        },
      ],
    }).compile();

  const createUseCase = async (): Promise<ArchiveFeatureFlagUseCaseImpl> => {
    const moduleRef = await createModule();
    return moduleRef.get(ArchiveFeatureFlagUseCaseImpl);
  };

  it('archives an active flag', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      flagKey: 'new-checkout',
      archivedBy: 'user-3',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('archived');
      expect(result.value.isArchived()).toBe(true);
      expect(result.value.updatedBy).toBe('user-3');
    }
  });

  it('records a flag_archived audit entry', async () => {
    const moduleRef = await createModule();
    const useCase = moduleRef.get(ArchiveFeatureFlagUseCaseImpl);
    const repository = moduleRef.get<FeatureFlagRepositoryTestImpl>(
      IFeatureFlagRepository,
    );

    const key = `audit-archive-${Date.now()}`;
    await repository.save(
      FeatureFlag.create({
        id: crypto.randomUUID(),
        tenantId: 'tenant-acme-1',
        key,
        name: 'Audit archive',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      }),
    );

    const result = await useCase.execute({
      flagKey: key,
      archivedBy: 'user-3',
    });

    expect(result.ok).toBe(true);

    const entries = AUDIT_LOG_TEST_DATA.filter(
      (entry) => entry.tenantId === 'tenant-acme-1' && entry.flagKey === key,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('flag_archived');
    expect(entries[0].environment).toBeNull();
    expect(entries[0].changes).toEqual([
      { field: 'status', previousValue: 'active', newValue: 'archived' },
    ]);
    expect(entries[0].actorId).toBe('user-3');
  });

  it('invalidates the evaluation cache for the flag after a successful archive', async () => {
    const moduleRef = await createModule();
    const useCase = moduleRef.get(ArchiveFeatureFlagUseCaseImpl);
    const cache = moduleRef.get<FlagEvaluationCacheServiceTestImpl>(
      FlagEvaluationCacheService,
    );

    const result = await useCase.execute({
      flagKey: 'new-checkout',
      archivedBy: 'user-3',
    });

    expect(result.ok).toBe(true);
    expect(cache.invalidatedTenantsAndFlagKeys).toEqual([
      { tenantId: 'tenant-acme-1', flagKey: 'new-checkout' },
    ]);
  });

  it('returns not_found for an unknown flag key', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      flagKey: 'does-not-exist',
      archivedBy: 'user-3',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('flag_not_found');
    }
  });

  it("returns unauthorized when the found flag's tenantId does not match the security context", async () => {
    // 'new-checkout' belongs to tenant-acme-1 in FEATURE_FLAG_TEST_DATA, but this
    // security context claims to be a different tenant — the repository stub
    // ignores the tenant scope so the use case's own guard is what has to catch it
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArchiveFeatureFlagUseCaseImpl,
        {
          provide: IFeatureFlagRepository,
          useClass: CrossTenantLeakFeatureFlagRepositoryStub,
        },
        {
          provide: IAuditLogRepository,
          useClass: AuditLogRepositoryTestImpl,
        },
        {
          provide: SecurityContext,
          useValue: { tenantId: 'tenant-other' },
        },
        {
          provide: FlagEvaluationCacheService,
          useClass: FlagEvaluationCacheServiceTestImpl,
        },
      ],
    }).compile();
    const useCase = moduleRef.get(ArchiveFeatureFlagUseCaseImpl);

    const result = await useCase.execute({
      flagKey: 'new-checkout',
      archivedBy: 'user-3',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('unauthorized');
    }
  });
});
